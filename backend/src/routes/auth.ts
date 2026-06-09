import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshSecret,
  authenticateToken,
  AuthRequest,
} from "../middleware/auth.js";
import { logAudit, getClientIp, getClientUA } from "../utils/auditLogger.js";
import {
  assertStrongPassword,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from "../utils/security.js";
import { findTenantHostContext } from "../utils/tenantHost.js";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return process.env.JWT_SECRET;
};

const planWithFeatures = {
  include: {
    planFeatures: true,
  },
};

const serializePlan = (plan: any) => {
  const fallback = { name: "Free", maxLeads: 100, leadsLimit: 100 };
  if (!plan) return fallback;
  return {
    ...plan,
    maxLeads: plan.maxLeads ?? plan.leadsLimit ?? fallback.maxLeads,
    leadsLimit: plan.maxLeads ?? plan.leadsLimit ?? fallback.leadsLimit,
  };
};

export function authRoutes(prisma: PrismaClient) {
  const router = Router();

  async function ensureUserMatchesTenantDomain(
    req: AuthRequest,
    res: any,
    userOrgId: string | null | undefined,
    userRole: string | null | undefined
  ) {
    const tenantDomain = await findTenantHostContext(
      prisma,
      req.headers["x-forwarded-host"] || req.headers.host
    );

    if (!tenantDomain) return true;
    if (userRole === "SUPER_ADMIN") return true;
    if (userOrgId === tenantDomain.organization.id) return true;

    res.status(403).json({
      success: false,
      error: "Este dominio pertence a outra organizacao.",
      code: "DOMAIN_ORG_MISMATCH",
    });
    return false;
  }

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Limite de 10 tentativas por IP
    message: {
      success: false,
      error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ==================== LOGIN ====================
  router.post("/login", loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    try {

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: "E-mail e senha são obrigatórios",
        });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          organization: {
            include: {
              planObj: planWithFeatures,
              _count: {
                select: { leads: true },
              },
            },
          },
          accessProfile: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Usuário ou senha inválidos",
        });
      }

      // Verificar se conta está ativa
      if (user.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          error: "Conta suspensa ou desativada. Contate o administrador.",
        });
      }

      if (!user.password) {
        return res.status(500).json({
          success: false,
          error: "Usuário sem senha cadastrada",
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: "Usuário ou senha inválidos",
        });
      }

      if (!(await ensureUserMatchesTenantDomain(req, res, user.organizationId, user.role))) {
        return;
      }

      let orgId = user.organizationId;
      let orgName = user.organization?.name || "Sem Organização";
      let orgSlug = user.organization?.slug || "";

      if (user.role === "SUPER_ADMIN" && !orgId) {
        const firstOrg = await prisma.organization.findFirst();
        if (firstOrg) {
          orgId = firstOrg.id;
          orgName = firstOrg.name;
          orgSlug = firstOrg.slug || "";
        }
      }

      // Gerar par access + refresh token
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: orgId,
        agencyId: user.agencyId,
        permissions: user.accessProfile
          ? user.accessProfile.permissions
          : user.permissions,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken({ id: user.id, orgId });
      setRefreshTokenCookie(res, refreshToken);

      // Salvar refresh token no banco
      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      prisma.refreshToken
        .create({
          data: {
            token: refreshTokenHash,
            userId: user.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
            ip: getClientIp(req),
            userAgent: getClientUA(req),
          },
        })
        .catch((error) => {
          console.error("[REFRESH_TOKEN_CREATE_ERROR]", {
            userId: user.id,
            errorMessage: error.message,
            prismaCode: error.code,
          });
        });

      // Limpar tokens expirados do usuário (limpeza assíncrona)
      prisma.refreshToken
        .deleteMany({
          where: {
            userId: user.id,
            expiresAt: { lt: new Date() },
          },
        })
        .catch(() => {});

      // Audit log
      logAudit({
        organizationId: orgId,
        userId: user.id,
        action: "LOGIN",
        resource: "User",
        resourceId: user.id,
        ip: getClientIp(req),
        userAgent: getClientUA(req),
      });

      const orgType = user.organization?.type || "CLIENT";

      return res.json({
        success: true,
        token: accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          permissions: user.accessProfile
            ? user.accessProfile.permissions
            : user.permissions,
          accessProfileId: user.accessProfileId,
          orgId,
          orgName,
          orgSlug,
          orgType,
          agencyId: user.agencyId,
          subscriptionStatus:
            user.organization?.subscriptionStatus || "TRIAL",
          betaAccess: user.organization?.betaAccess || false,
          isTestAccount: user.organization?.isTestAccount || false,
          plan: serializePlan(user.organization?.planObj || { name: user.organization?.plan || "Free" }),
          usage: {
            leads: user.organization?._count?.leads || 0,
          },
        },
      });
    } catch (error: any) {
      console.error("[LOGIN_ERROR] Full Context:", {
        email: req.body?.email,
        errorMessage: error.message,
        prismaCode: error.code
      });
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor"
      });
    }
  });

  // ==================== REFRESH TOKEN ====================
  router.post("/refresh", async (req, res) => {
    try {
      const refreshToken = getRefreshTokenFromRequest(req);

      if (!refreshToken) {
        clearRefreshTokenCookie(res);
        return res.status(400).json({ error: "Refresh token obrigatório." });
      }

      // Verificar JWT do refresh token
      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, getRefreshSecret());
      } catch (err: any) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({
          error: "REFRESH_TOKEN_INVALID",
          message: "Refresh token inválido ou expirado. Faça login novamente.",
        });
      }

      // Verificar no banco
      const tokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: tokenHash },
        include: {
          user: {
            include: {
              organization: {
                include: {
                  planObj: planWithFeatures,
                  _count: { select: { leads: true } },
                },
              },
              accessProfile: true,
            },
          },
        },
      });

      if (!storedToken || storedToken.revokedAt) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({
          error: "REFRESH_TOKEN_REVOKED",
          message: "Token já foi revogado. Faça login novamente.",
        });
      }

      if (storedToken.user.organizationId && storedToken.user.organizationId !== decoded.orgId) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({
          error: "REFRESH_TOKEN_ORG_MISMATCH",
          message: "Token não pertence a esta organização. Faça login novamente.",
        });
      }

      if (storedToken.expiresAt < new Date()) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({
          error: "REFRESH_TOKEN_EXPIRED",
          message: "Refresh token expirado. Faça login novamente.",
        });
      }

      const user = storedToken.user;
      if (!(await ensureUserMatchesTenantDomain(req, res, user.organizationId, user.role))) {
        clearRefreshTokenCookie(res);
        return;
      }

      let orgId = user.organizationId;
      let orgName = user.organization?.name || "Sem Organização";

      if (user.role === "SUPER_ADMIN" && !orgId) {
        const firstOrg = await prisma.organization.findFirst();
        if (firstOrg) {
          orgId = firstOrg.id;
          orgName = firstOrg.name;
        }
      }

      // Gerar novo access token
      const newAccessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
        orgId,
        agencyId: user.agencyId,
        permissions: user.accessProfile
          ? user.accessProfile.permissions
          : user.permissions,
      });

      const newRefreshToken = generateRefreshToken({ id: user.id, orgId });
      const newRefreshTokenHash = crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");

      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { id: storedToken.id },
          data: { revokedAt: new Date() },
        }),
        prisma.refreshToken.create({
          data: {
            token: newRefreshTokenHash,
            userId: user.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            ip: getClientIp(req),
            userAgent: getClientUA(req),
          },
        }),
      ]);
      setRefreshTokenCookie(res, newRefreshToken);

      return res.json({
        success: true,
        token: newAccessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          orgId,
          orgName,
          orgType: user.organization?.type || "CLIENT",
          whiteLabelConfig: user.organization?.whiteLabelConfig || null,
          plan: serializePlan(user.organization?.planObj || { name: user.organization?.plan || "Free" }),
          usage: {
            leads: user.organization?._count?.leads || 0,
          },
        },
      });
    } catch (error) {
      console.error("[REFRESH_ERROR]", error);
      return res.status(500).json({ error: "Erro ao renovar token." });
    }
  });

  // ==================== LOGOUT ====================
  router.post("/logout", async (req, res) => {
    try {
      const refreshToken = getRefreshTokenFromRequest(req);

      if (refreshToken) {
        const tokenHash = crypto
          .createHash("sha256")
          .update(refreshToken)
          .digest("hex");

        await prisma.refreshToken.updateMany({
          where: { token: tokenHash },
          data: { revokedAt: new Date() },
        });
      }

      clearRefreshTokenCookie(res);
      return res.json({ success: true, message: "Logout realizado." });
    } catch (error) {
      console.error("[LOGOUT_ERROR]", error);
      return res.json({ success: true, message: "Logout realizado." });
    }
  });

  // ==================== REGISTER WHITELABEL ====================
  router.post("/register/whitelabel", async (req, res) => {
    const { name, email, password, organizationName, brandName, logoUrl, primaryColor, secondaryColor } = req.body;

    if (!name || !email || !password || !organizationName) {
      return res.status(400).json({
        error: "Todos os campos (nome, email, senha, nome da agência) são obrigatórios.",
      });
    }

    const passwordError = assertStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    try {
      const tenantDomain = await findTenantHostContext(
        prisma,
        req.headers["x-forwarded-host"] || req.headers.host
      );
      if (tenantDomain) {
        return res.status(403).json({
          error: "Cadastro indisponivel neste dominio.",
          code: "CUSTOM_DOMAIN_REGISTRATION_DISABLED",
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser)
        return res.status(400).json({ error: "Este email já está em uso." });

      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await prisma.$transaction(async (tx) => {
        const wlConfig: Record<string, any> = {
          name: brandName || organizationName,
        };
        if (logoUrl) wlConfig.logoUrl = logoUrl;
        if (primaryColor) wlConfig.primaryColor = primaryColor;
        if (secondaryColor) wlConfig.secondaryColor = secondaryColor;

        const org = await tx.organization.create({
          data: {
            name: organizationName,
            type: "WHITELABEL",
            slug: organizationName
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "-"),
            domain: email.split("@")[1],
            plan: "Free",
            whiteLabelConfig: wlConfig,
            settings: { whitelabelOnboardingStep: 1, whitelabelOnboardingComplete: false },
          },
        });
        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: "ORG_ADMIN",
            organizationId: org.id,
          },
        });
        return { user, org };
      });

      const accessToken = generateAccessToken({
        id: result.user.id,
        orgId: result.org.id,
        role: result.user.role,
      });

      const refreshToken = generateRefreshToken({
        id: result.user.id,
        orgId: result.org.id,
      });
      setRefreshTokenCookie(res, refreshToken);

      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      await prisma.refreshToken.create({
        data: {
          token: refreshTokenHash,
          userId: result.user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ip: getClientIp(req),
          userAgent: getClientUA(req),
        },
      });

      logAudit({
        organizationId: result.org.id,
        userId: result.user.id,
        action: "CREATE",
        resource: "Organization",
        resourceId: result.org.id,
        ip: getClientIp(req),
        userAgent: getClientUA(req),
      });

      res.status(201).json({
        token: accessToken,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          orgId: result.org.id,
          orgName: result.org.name,
          orgSlug: result.org.slug,
          orgType: "WHITELABEL",
        },
      });
    } catch (error) {
      console.error("[REGISTER_WHITELABEL_ERROR]", error);
      res.status(500).json({ error: "Falha ao registrar parceiro whitelabel." });
    }
  });

  // ==================== REGISTER ====================
  router.post("/register", async (req, res) => {
    const { name, email, password, organizationName } = req.body;

    if (!name || !email || !password || !organizationName) {
      return res.status(400).json({
        error:
          "Todos os campos (nome, email, senha, nome da agência) são obrigatórios.",
      });
    }

    const passwordError = assertStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    try {
      const tenantDomain = await findTenantHostContext(
        prisma,
        req.headers["x-forwarded-host"] || req.headers.host
      );
      if (tenantDomain) {
        return res.status(403).json({
          error: "Cadastro indisponivel neste dominio.",
          code: "CUSTOM_DOMAIN_REGISTRATION_DISABLED",
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser)
        return res.status(400).json({ error: "Este email já está em uso." });

      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug: organizationName
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "-"),
            domain: email.split("@")[1],
            plan: "Free",
          },
        });
        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: "ORG_ADMIN",
            organizationId: org.id,
          },
        });
        return { user, org };
      });

      const accessToken = generateAccessToken({
        id: result.user.id,
        orgId: result.org.id,
        role: result.user.role,
      });

      const refreshToken = generateRefreshToken({
        id: result.user.id,
        orgId: result.org.id,
      });
      setRefreshTokenCookie(res, refreshToken);

      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      await prisma.refreshToken.create({
        data: {
          token: refreshTokenHash,
          userId: result.user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ip: getClientIp(req),
          userAgent: getClientUA(req),
        },
      });

      // Audit log
      logAudit({
        organizationId: result.org.id,
        userId: result.user.id,
        action: "CREATE",
        resource: "Organization",
        resourceId: result.org.id,
        ip: getClientIp(req),
        userAgent: getClientUA(req),
      });

      res.status(201).json({
        token: accessToken,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          orgId: result.org.id,
          orgName: result.org.name,
          orgSlug: result.org.slug,
        },
      });
    } catch (error) {
      console.error("[REGISTER_ERROR]", error);
      res.status(500).json({ error: "Falha ao registrar agência." });
    }
  });

  // ==================== ME ====================
  router.get("/me", async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    try {
      const decoded: any = jwt.verify(token, getJwtSecret());
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          organization: {
            include: {
              planObj: planWithFeatures,
              _count: {
                select: { leads: true },
              },
            },
          },
          accessProfile: true,
        },
      });

      if (!user)
        return res.status(404).json({ error: "User not found" });

      if (!(await ensureUserMatchesTenantDomain(req, res, user.organizationId, user.role))) {
        return;
      }

      let orgId = user.organizationId;
      let orgName = user.organization?.name || "No Org";
      let orgSlug = user.organization?.slug || "";

      if (user.role === "SUPER_ADMIN" && !orgId) {
        const firstOrg = await prisma.organization.findFirst();
        if (firstOrg) {
          orgId = firstOrg.id;
          orgName = firstOrg.name;
          orgSlug = firstOrg.slug || "";
        }
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.accessProfile
          ? user.accessProfile.permissions
          : user.permissions,
        accessProfileId: user.accessProfileId,
        orgId,
        orgName,
        orgSlug,
        orgType: user.organization?.type || "CLIENT",
        whiteLabelConfig: user.organization?.whiteLabelConfig || null,
        agencyId: user.agencyId,
        subscriptionStatus:
          user.organization?.subscriptionStatus || "TRIAL",
        betaAccess: user.organization?.betaAccess || false,
        isTestAccount: user.organization?.isTestAccount || false,
        plan: serializePlan(user.organization?.planObj || { name: user.organization?.plan || "Free" }),
        usage: {
          leads: user.organization?._count?.leads || 0,
        },
      });
    } catch (error: any) {
      console.error("[AUTH_ME_ERROR]", {
        error: error.name,
        message: error.message,
        authHeader: req.headers["authorization"] ? "Present" : "Missing"
      });

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          error: "TOKEN_EXPIRED",
          message: "Token expirado. Use o refresh token para obter um novo.",
        });
      }

      res.status(401).json({ error: "Invalid token" });
    }
  });

  return router;
}

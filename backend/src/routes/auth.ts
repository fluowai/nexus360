import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return process.env.JWT_SECRET;
};

export function authRoutes(prisma: PrismaClient) {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Limite de 10 tentativas por IP
    message: { success: false, error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post("/login", loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'E-mail e senha são obrigatórios'
        });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { 
          organization: {
            include: {
              planObj: true,
              _count: {
                select: { leads: true }
              }
            }
          }, 
          accessProfile: true 
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário ou senha inválidos'
        });
      }

      if (!user.password) {
        return res.status(500).json({
          success: false,
          error: 'Usuário sem senha cadastrada'
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Usuário ou senha inválidos'
        });
      }

      if (!process.env.JWT_SECRET) {
        return res.status(500).json({
          success: false,
          error: 'JWT_SECRET não configurado'
        });
      }

      let orgId = user.organizationId;
      let orgName = user.organization?.name || "Sem Organização";
      let orgSlug = user.organization?.slug || "";

      if (user.role === 'SUPER_ADMIN' && !orgId) {
        const firstOrg = await prisma.organization.findFirst();
        if (firstOrg) {
          orgId = firstOrg.id;
          orgName = firstOrg.name;
          orgSlug = firstOrg.slug || "";
        }
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          orgId: orgId,
          permissions: user.accessProfile ? user.accessProfile.permissions : user.permissions
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '7d'
        }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          permissions: user.accessProfile ? user.accessProfile.permissions : user.permissions,
          accessProfileId: user.accessProfileId,
          orgId,
          orgName,
          orgSlug,
          betaAccess: user.organization?.betaAccess || false,
          isTestAccount: user.organization?.isTestAccount || false,
          plan: user.organization?.planObj || { name: user.organization?.plan || 'Free', leadsLimit: 100 },
          usage: {
            leads: user.organization?._count?.leads || 0
          }
        }
      });
    } catch (error) {
      console.error('[LOGIN_ERROR]', error);

      return res.status(500).json({
        success: false,
        error: 'Erro interno no servidor'
      });
    }
  });

  router.post("/register", async (req, res) => {
    const { name, email, password, organizationName } = req.body;
    
    if (!name || !email || !password || !organizationName) {
      return res.status(400).json({ error: "Todos os campos (nome, email, senha, nome da agência) são obrigatórios." });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: "Este email já está em uso." });

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug: organizationName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-'),
            domain: email.split('@')[1],
            plan: "Free"
          }
        });
        const user = await tx.user.create({
          data: { name, email, password: hashedPassword, role: "ORG_ADMIN", organizationId: org.id }
        });
        return { user, org };
      });

      const token = jwt.sign(
        { id: result.user.id, orgId: result.org.id, role: result.user.role },
        getJwtSecret(),
        { expiresIn: '8h' }
      );

      res.status(201).json({
        token,
        user: { 
          id: result.user.id, 
          name: result.user.name, 
          email: result.user.email, 
          role: result.user.role, 
          orgId: result.org.id, 
          orgName: result.org.name,
          orgSlug: result.org.slug
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Falha ao registrar agência." });
    }
  });

  router.get("/me", async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });

    try {
      const decoded: any = jwt.verify(token, getJwtSecret());
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { 
          organization: {
            include: {
              planObj: true,
              _count: {
                select: { leads: true }
              }
            }
          }, 
          accessProfile: true 
        }
      });

      if (!user) return res.status(404).json({ error: "User not found" });
      
      let orgId = user.organizationId;
      let orgName = user.organization?.name || "No Org";
      let orgSlug = user.organization?.slug || "";

      if (user.role === 'SUPER_ADMIN' && !orgId) {
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
        permissions: user.accessProfile ? user.accessProfile.permissions : user.permissions,
        accessProfileId: user.accessProfileId,
        orgId, 
        orgName,
        orgSlug,
        betaAccess: user.organization?.betaAccess || false,
        isTestAccount: user.organization?.isTestAccount || false,
        plan: user.organization?.planObj || { name: user.organization?.plan || 'Free', leadsLimit: 100 },
        usage: {
          leads: user.organization?._count?.leads || 0
        }
      });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  return router;
}

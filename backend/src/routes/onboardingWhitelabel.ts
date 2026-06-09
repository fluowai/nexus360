import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { normalizeDomain, DOMAIN_REGEX, verifyDomainDns, getDnsInstructions } from "../utils/domainConfig.js";
import { syncTraefikDomainConfig, removeTraefikDomainConfig } from "../services/traefikDomainConfig.js";

export function onboardingWhitelabelRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/status", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          type: true,
          whiteLabelConfig: true,
          settings: true,
          domain: true,
          slug: true,
        },
      });

      if (!org || org.type !== "WHITELABEL") {
        return res.json({ whitelabel: false });
      }

      const settings = (org.settings as any) || {};
      const step = settings.whitelabelOnboardingStep || 1;
      const complete = settings.whitelabelOnboardingComplete || false;

      res.json({
        whitelabel: true,
        step,
        complete,
        brand: org.whiteLabelConfig || {},
        domain: org.domain,
        slug: org.slug,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/brand", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { name, logoUrl, faviconUrl, primaryColor, secondaryColor } = req.body;

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { whiteLabelConfig: true, settings: true },
      });

      if (!org) return res.status(404).json({ error: "Organização não encontrada" });

      const currentConfig = (org.whiteLabelConfig as Record<string, any>) || {};
      const currentSettings = (org.settings as Record<string, any>) || {};

      const updated = await prisma.organization.update({
        where: { id: orgId },
        data: {
          whiteLabelConfig: {
            ...currentConfig,
            ...(name !== undefined && { name }),
            ...(logoUrl !== undefined && { logoUrl }),
            ...(faviconUrl !== undefined && { faviconUrl }),
            ...(primaryColor !== undefined && { primaryColor }),
            ...(secondaryColor !== undefined && { secondaryColor }),
          },
          settings: {
            ...currentSettings,
            whitelabelOnboardingStep: Math.max(currentSettings.whitelabelOnboardingStep || 1, 2),
          },
        },
        select: { whiteLabelConfig: true },
      });

      res.json({ success: true, whiteLabelConfig: updated.whiteLabelConfig });
    } catch (error) {
      next(error);
    }
  });

  router.post("/domain", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { domain } = req.body;

      const normalizedDomain = normalizeDomain(domain);
      if (!normalizedDomain || !DOMAIN_REGEX.test(normalizedDomain)) {
        return res.status(400).json({ error: "Informe um domínio válido, ex: crm.seudominio.com.br" });
      }

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { slug: true, domain: true, settings: true },
      });

      if (!org) return res.status(404).json({ error: "Organização não encontrada" });

      const existing = await prisma.domain.findUnique({ where: { name: normalizedDomain } });
      if (existing && existing.organizationId !== orgId) {
        return res.status(409).json({ error: "Este domínio já está vinculado a outra organização." });
      }

      const previousDomain = org.domain !== normalizedDomain ? org.domain : null;
      const verification = await verifyDomainDns(normalizedDomain, org.slug);
      const currentSettings = (org.settings as Record<string, any>) || {};

      await prisma.$transaction(async (tx) => {
        if (previousDomain) {
          await tx.domain.deleteMany({ where: { name: previousDomain, organizationId: orgId } });
        }

        await tx.domain.upsert({
          where: { name: normalizedDomain },
          update: { organizationId: orgId, provider: "docker", status: verification.verified ? "verified" : "pending" },
          create: { name: normalizedDomain, provider: "docker", status: verification.verified ? "verified" : "pending", organizationId: orgId },
        });

        await tx.organization.update({
          where: { id: orgId },
          data: {
            domain: normalizedDomain,
            settings: { ...currentSettings, whitelabelOnboardingStep: Math.max(currentSettings.whitelabelOnboardingStep || 1, 3) },
          },
        });
      });

      const traefik = verification.verified
        ? await syncTraefikDomainConfig(normalizedDomain, verification.verified)
        : undefined;

      if (previousDomain) {
        await removeTraefikDomainConfig(previousDomain).catch(() => {});
      }

      res.json({
        success: true,
        message: verification.verified
          ? "Domínio cadastrado e DNS verificado com sucesso!"
          : "Domínio cadastrado. Configure o DNS para apontar ao servidor Nexus360.",
        domain: { name: normalizedDomain, status: verification.verified ? "verified" : "pending", dns: getDnsInstructions(normalizedDomain, org.slug) },
        verified: verification.verified,
        traefik,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/agency", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { teamMembers } = req.body;

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });

      const currentSettings = (org?.settings as Record<string, any>) || {};

      if (Array.isArray(teamMembers) && teamMembers.length > 0) {
        const adminUser = await prisma.user.findFirst({
          where: { organizationId: orgId, role: "ORG_ADMIN" },
        });

        if (adminUser) {
          for (const member of teamMembers) {
            const hashedPassword = await (await import("bcryptjs")).hash("senha123", 10);
            await prisma.user.upsert({
              where: { email: member.email },
              update: { name: member.name, organizationId: orgId, role: "USER", department: member.role || "GERAL" },
              create: {
                name: member.name,
                email: member.email,
                password: hashedPassword,
                role: "USER",
                organizationId: orgId,
                department: member.role || "GERAL",
                status: "ACTIVE",
              },
            });
          }
        }
      }

      await prisma.organization.update({
        where: { id: orgId },
        data: {
          settings: { ...currentSettings, whitelabelOnboardingStep: Math.max(currentSettings.whitelabelOnboardingStep || 1, 4) },
        },
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/ai-keys", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { groqKey, geminiKey } = req.body;

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });

      const currentSettings = (org?.settings as Record<string, any>) || {};

      const data: Record<string, any> = {};
      if (groqKey !== undefined) data.groqKey = groqKey;
      if (geminiKey !== undefined) data.geminiKey = geminiKey;
      if (groqKey) data.aiProvider = "groq";
      else if (geminiKey) data.aiProvider = "gemini";
      data.settings = { ...currentSettings, whitelabelOnboardingStep: 5 };

      await prisma.organization.update({
        where: { id: orgId },
        data,
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/complete", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });

      const currentSettings = (org?.settings as Record<string, any>) || {};

      await prisma.organization.update({
        where: { id: orgId },
        data: {
          settings: { ...currentSettings, whitelabelOnboardingComplete: true, whitelabelOnboardingStep: 5 },
        },
      });

      res.json({ success: true, message: "Onboarding whitelabel concluído!" });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { DOMAIN_REGEX, getDnsInstructions, normalizeDomain, verifyDomainDns } from "../utils/domainConfig.js";

export function domainRoutes(prisma: PrismaClient) {
  const router = Router();

  // List organization domains
  router.get("/", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const domains = await prisma.domain.findMany({
        where: { organizationId: orgId },
        include: { organization: { select: { slug: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json(domains.map(domain => ({
        ...domain,
        dns: getDnsInstructions(domain.name, domain.organization.slug),
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch domains" });
    }
  });

  // Add new domain
  router.post("/", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const name = normalizeDomain(req.body?.name);
    const provider = "docker";

    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    if (!DOMAIN_REGEX.test(name)) {
      return res.status(400).json({ error: "Informe um dominio valido, ex: crm.seudominio.com.br" });
    }

    try {
      const existing = await prisma.domain.findUnique({ where: { name } });
      if (existing && existing.organizationId !== orgId) {
        return res.status(409).json({ error: "Este dominio ja esta vinculado a outra organizacao." });
      }

      const verification = await verifyDomainDns(name);
      const domain = await prisma.domain.upsert({
        where: { name },
        update: { provider, status: verification.verified ? "verified" : existing?.status || "pending" },
        create: {
          name,
          provider,
          status: verification.verified ? "verified" : "pending",
          organizationId: orgId,
        },
      });

      const org = await prisma.organization.update({
        where: { id: orgId },
        data: { domain: name },
        select: { slug: true },
      });

      res.json({
        ...domain,
        dns: getDnsInstructions(name, org.slug),
        verification,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to add domain" });
    }
  });

  router.post("/:id/verify", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const domain = await prisma.domain.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { organization: { select: { slug: true } } },
      });
      if (!domain) return res.status(404).json({ error: "Dominio nao encontrado" });

      const verification = await verifyDomainDns(domain.name);
      const updated = await prisma.domain.update({
        where: { id: domain.id },
        data: { status: verification.verified ? "verified" : "pending" },
      });

      res.json({
        ...updated,
        dns: getDnsInstructions(domain.name, domain.organization?.slug),
        verification,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Falha ao validar DNS" });
    }
  });

  router.delete("/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const domain = await prisma.domain.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!domain) return res.status(404).json({ error: "Dominio nao encontrado" });

      await prisma.domain.delete({ where: { id: domain.id } });
      await prisma.organization.updateMany({
        where: { id: orgId, domain: domain.name },
        data: { domain: null },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Falha ao remover dominio" });
    }
  });

  return router;
}

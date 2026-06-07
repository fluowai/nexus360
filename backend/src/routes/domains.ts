import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import dns from "node:dns/promises";
import { AuthRequest } from "../middleware/auth.js";

const DOMAIN_REGEX = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;

function normalizeDomain(value: unknown) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return raw
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .split(":")[0]
      .replace(/^www\./, "")
      .replace(/\.$/, "");
  }
}

function getDnsInstructions(domain: string) {
  const panelUrl = process.env.FRONTEND_URL || process.env.APP_URL || "https://nexus360.consultio.com.br";
  const panelHost = (() => {
    try {
      return new URL(panelUrl).hostname;
    } catch {
      return "nexus360.consultio.com.br";
    }
  })();

  return {
    domain,
    type: "CNAME",
    host: domain,
    value: process.env.WHITELABEL_CNAME_TARGET || panelHost,
    www: {
      type: "CNAME",
      host: "www",
      value: process.env.WHITELABEL_CNAME_TARGET || panelHost,
    },
  };
}

async function verifyDomainDns(domain: string) {
  const expectedIp = process.env.WHITELABEL_DOCKER_IP;
  const expectedCname = (process.env.WHITELABEL_CNAME_TARGET || "").replace(/\.$/, "").toLowerCase();
  const result: {
    verified: boolean;
    records: { a: string[]; cname: string[] };
    message: string;
  } = {
    verified: false,
    records: { a: [], cname: [] },
    message: "DNS ainda nao aponta para o servidor Nexus360.",
  };

  try {
    const addresses = await dns.resolve4(domain);
    result.records.a = addresses;
    if (expectedIp && addresses.includes(expectedIp)) {
      result.verified = true;
      result.message = "Dominio apontando corretamente para o IP do Docker.";
      return result;
    }
  } catch {
    // DNS A record not found or resolution failed; fall through to CNAME check
  }

  try {
    const cnames = await dns.resolveCname(domain);
    result.records.cname = cnames.map(item => item.replace(/\.$/, "").toLowerCase());
    if (expectedCname && result.records.cname.includes(expectedCname)) {
      result.verified = true;
      result.message = "Dominio apontando corretamente via CNAME.";
      return result;
    }
  } catch {
    // DNS CNAME record not found or resolution failed
  }

  if (!expectedIp && !expectedCname) {
    result.message = "Configure WHITELABEL_DOCKER_IP para validar automaticamente o apontamento DNS.";
  }

  return result;
}

export function domainRoutes(prisma: PrismaClient) {
  const router = Router();

  // List organization domains
  router.get("/", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const domains = await prisma.domain.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
      });
      res.json(domains.map(domain => ({
        ...domain,
        dns: getDnsInstructions(domain.name),
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

      // 1. Register in Database
      const domain = await prisma.domain.upsert({
        where: { name },
        update: { provider, status: existing?.status || "pending" },
        create: {
          name,
          provider,
          status: "pending",
          organizationId: orgId,
        },
      });

      await prisma.organization.update({
        where: { id: orgId },
        data: { domain: name },
      });

      res.json({
        ...domain,
        dns: getDnsInstructions(name),
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
      });
      if (!domain) return res.status(404).json({ error: "Dominio nao encontrado" });

      const verification = await verifyDomainDns(domain.name);
      const updated = await prisma.domain.update({
        where: { id: domain.id },
        data: { status: verification.verified ? "verified" : "pending" },
      });

      res.json({
        ...updated,
        dns: getDnsInstructions(domain.name),
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

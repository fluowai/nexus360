import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

type TraefikSyncResult = {
  enabled: boolean;
  action: "written" | "removed" | "skipped";
  file?: string;
  error?: string;
  message?: string;
};

function getDynamicDir() {
  const value = String(process.env.TRAEFIK_DYNAMIC_DIR || "").trim();
  return value || null;
}

function getServiceRef(serviceName: string, fallbackName: string) {
  const raw = String(process.env[serviceName] || "").trim();
  if (raw) return raw;

  const provider = String(process.env.TRAEFIK_SERVICE_PROVIDER || "swarm").trim() || "swarm";
  return `${fallbackName}@${provider}`;
}

function getSafeDomainFile(domain: string) {
  const safeName = domain
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/\.+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `nexus360-domain-${safeName}.yml`;
}

function getRouterName(domain: string, suffix = "") {
  const safeName = domain
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `nexus360-${safeName}${suffix}`;
}

function buildDynamicConfig(domain: string) {
  const frontendService = getServiceRef("TRAEFIK_FRONTEND_SERVICE", "nexus360_frontend");
  const apiService = getServiceRef("TRAEFIK_API_SERVICE", "nexus360_api");
  const certResolver = String(process.env.TRAEFIK_CERT_RESOLVER || "letsencryptresolver").trim();
  const frontendRouter = getRouterName(domain);
  const apiRouter = getRouterName(domain, "-api");

  return [
    "http:",
    "  routers:",
    `    ${apiRouter}:`,
    `      rule: "Host(\`${domain}\`) && (PathPrefix(\`/api\`) || PathPrefix(\`/lp\`))"`,
    "      entryPoints:",
    "        - websecure",
    `      service: ${apiService}`,
    "      tls:",
    `        certResolver: ${certResolver}`,
    "      priority: 100",
    `    ${frontendRouter}:`,
    `      rule: "Host(\`${domain}\`)"`,
    "      entryPoints:",
    "        - websecure",
    `      service: ${frontendService}`,
    "      tls:",
    `        certResolver: ${certResolver}`,
    "      priority: 90",
    "",
  ].join("\n");
}

export async function writeTraefikDomainConfig(domain: string): Promise<TraefikSyncResult> {
  const dynamicDir = getDynamicDir();
  if (!dynamicDir) {
    return {
      enabled: false,
      action: "skipped",
      message: "TRAEFIK_DYNAMIC_DIR nao configurado; usando rota global HostRegexp da stack.",
    };
  }

  const file = path.join(dynamicDir, getSafeDomainFile(domain));
  const tempFile = `${file}.${Date.now()}.tmp`;

  try {
    await fs.mkdir(dynamicDir, { recursive: true });
    await fs.writeFile(tempFile, buildDynamicConfig(domain), "utf8");
    await fs.rename(tempFile, file);
    return { enabled: true, action: "written", file };
  } catch (error: any) {
    try {
      await fs.rm(tempFile, { force: true });
    } catch {
      // Best effort cleanup only.
    }
    return { enabled: true, action: "skipped", file, error: error?.message || "Falha ao escrever arquivo do Traefik" };
  }
}

export async function removeTraefikDomainConfig(domain: string): Promise<TraefikSyncResult> {
  const dynamicDir = getDynamicDir();
  if (!dynamicDir) {
    return {
      enabled: false,
      action: "skipped",
      message: "TRAEFIK_DYNAMIC_DIR nao configurado; usando rota global HostRegexp da stack.",
    };
  }

  const file = path.join(dynamicDir, getSafeDomainFile(domain));

  try {
    await fs.rm(file, { force: true });
    return { enabled: true, action: "removed", file };
  } catch (error: any) {
    return { enabled: true, action: "skipped", file, error: error?.message || "Falha ao remover arquivo do Traefik" };
  }
}

export async function syncTraefikDomainConfig(domain: string, verified: boolean): Promise<TraefikSyncResult> {
  return verified ? writeTraefikDomainConfig(domain) : removeTraefikDomainConfig(domain);
}

export async function syncVerifiedTraefikDomains(prisma: PrismaClient) {
  if (!getDynamicDir()) return { enabled: false, total: 0, written: 0, failed: 0 };

  const domains = await prisma.domain.findMany({
    where: { status: "verified" },
    select: { name: true },
  });

  const results = await Promise.allSettled(
    domains.map(domain => writeTraefikDomainConfig(domain.name))
  );

  const written = results.filter(result => result.status === "fulfilled" && result.value.action === "written").length;
  const failed = results.length - written;

  return { enabled: true, total: domains.length, written, failed };
}

import { PrismaClient } from "@prisma/client";
import { getInternalWorkspaceUrls } from "./domainConfig.js";

const RESERVED_WORKSPACE_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "onboarding",
  "site",
  "vendas",
  "meet",
  "p",
  "lp",
  "client-portal",
  "dashboard",
  "crm",
  "prospecting",
  "finance",
  "settings",
  "team",
  "projects",
  "reports",
  "clients",
  "sold-services",
  "ad-accounts",
  "assets",
  "landing-pages",
  "quiz",
  "content",
  "marketing",
  "sales-machine",
  "proposals",
  "agents-hub",
  "ai-settings",
  "prompt-architect",
  "billing",
  "automations",
  "notifications",
  "delivery",
  "service-catalog",
  "time-tracking",
  "knowledge-base",
  "client-health",
  "whatsapp",
  "acp",
]);

export function normalizeRequestHost(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0];
}

export async function findVerifiedTenantDomain(prisma: PrismaClient, hostValue: string | string[] | undefined) {
  const host = normalizeRequestHost(hostValue);
  if (!host) return null;

  const domain = await prisma.domain.findFirst({
    where: { name: host, status: "verified" },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, type: true, settings: true, whiteLabelConfig: true },
      },
    },
  });

  if (!domain) return null;

  return {
    host,
    domain: domain.name,
    status: domain.status,
    organization: domain.organization,
  };
}

export async function findTenantHostContext(prisma: PrismaClient, hostValue: string | string[] | undefined) {
  const tenantDomain = await findVerifiedTenantDomain(prisma, hostValue);
  if (tenantDomain) {
    return {
      ...tenantDomain,
      kind: "custom-domain" as const,
      internalUrl: getInternalWorkspaceUrls(tenantDomain.organization.slug),
    };
  }

  return null;
}

export function normalizeWorkspaceSlug(value: unknown) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");

  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) return "";
  if (RESERVED_WORKSPACE_SLUGS.has(slug)) return "";
  return slug;
}

export async function findTenantSlugContext(prisma: PrismaClient, slugValue: unknown) {
  const slug = normalizeWorkspaceSlug(slugValue);
  if (!slug) return null;

  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, type: true, settings: true, whiteLabelConfig: true },
  });

  if (!organization) return null;

  return {
    kind: "workspace-slug" as const,
    domain: null,
    status: "verified",
    internalUrl: getInternalWorkspaceUrls(organization.slug),
    organization,
  };
}

export async function findTenantDomainStatus(prisma: PrismaClient, hostValue: string | string[] | undefined) {
  const host = normalizeRequestHost(hostValue);
  if (!host) return null;

  return prisma.domain.findUnique({
    where: { name: host },
    select: { name: true, status: true, organizationId: true },
  });
}

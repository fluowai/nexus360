import { PrismaClient } from "@prisma/client";
import { getPanelHost, getInternalWorkspaceUrls } from "./domainConfig.js";

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
        select: { id: true, name: true, slug: true, whiteLabelConfig: true },
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

export function getSystemSubdomainSlug(hostValue: string | string[] | undefined) {
  const host = normalizeRequestHost(hostValue);
  const panelHost = getPanelHost().toLowerCase();
  if (!host || host === panelHost || host === `www.${panelHost}`) return null;
  if (!host.endsWith(`.${panelHost}`)) return null;

  const slug = host.slice(0, -(panelHost.length + 1));
  if (!slug || slug.includes(".")) return null;
  return slug;
}

export async function findSystemTenantHost(prisma: PrismaClient, hostValue: string | string[] | undefined) {
  const host = normalizeRequestHost(hostValue);
  const slug = getSystemSubdomainSlug(host);
  if (!slug) return null;

  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, whiteLabelConfig: true },
  });

  if (!organization) return null;

  return {
    host,
    domain: host,
    status: "verified",
    kind: "system-subdomain" as const,
    internalUrl: getInternalWorkspaceUrls(organization.slug),
    organization,
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

  return findSystemTenantHost(prisma, hostValue);
}

export async function findTenantDomainStatus(prisma: PrismaClient, hostValue: string | string[] | undefined) {
  const host = normalizeRequestHost(hostValue);
  if (!host) return null;

  return prisma.domain.findUnique({
    where: { name: host },
    select: { name: true, status: true, organizationId: true },
  });
}

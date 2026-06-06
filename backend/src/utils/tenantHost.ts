import { PrismaClient } from "@prisma/client";

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

export async function findTenantDomainStatus(prisma: PrismaClient, hostValue: string | string[] | undefined) {
  const host = normalizeRequestHost(hostValue);
  if (!host) return null;

  return prisma.domain.findUnique({
    where: { name: host },
    select: { name: true, status: true, organizationId: true },
  });
}

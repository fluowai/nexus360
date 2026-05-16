import { prisma } from "./prisma.js";

export interface AccessConfig {
  module?: string;
  feature?: string;
  permission?: string;
  requireActiveSubscription?: boolean;
  checkUsageLimit?: "maxUsers" | "maxClients" | "maxLeads" | "maxAutomations" | "maxReports" | "maxIntegrations" | "maxMessages";
}

export async function getTenantAccess(organizationId: string, userId: string) {
  // 1. Buscar Organização e Plano Atual
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      planObj: {
        include: {
          planFeatures: true
        }
      },
      saasSubscriptions: {
        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  if (!org) return null;

  // 2. Buscar Usuário e sua Role/Permissões
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accessProfile: true, // Legacy
      // Role model (Nova estrutura)
      // role: { include: { permissions: true } } 
    }
  });

  // Note: Como ainda estamos migrando do campo 'role' (string) para o modelo 'Role',
  // vamos suportar ambos temporariamente.

  const subscription = org.saasSubscriptions[0];
  const plan = org.planObj;

  return {
    org,
    subscription,
    plan,
    user,
    // Helper para verificar feature
    hasFeature: (featureKey: string) => {
      if (!plan) return false;
      return plan.planFeatures.some(f => f.featureKey === featureKey && f.isEnabled);
    },
    // Helper para verificar limite
    isUnderLimit: async (limitKey: string) => {
      if (!plan) return true;
      const limit = (plan as any)[limitKey] || 0;
      
      let currentCount = 0;
      switch (limitKey) {
        case 'maxUsers': currentCount = await prisma.user.count({ where: { organizationId } }); break;
        case 'maxClients': currentCount = await prisma.client.count({ where: { organizationId } }); break;
        case 'maxLeads': currentCount = await prisma.lead.count({ where: { organizationId } }); break;
        case 'maxAutomations': currentCount = await prisma.automation.count({ where: { organizationId } }); break;
        // ... outros limites
      }
      
      return currentCount < limit;
    }
  };
}

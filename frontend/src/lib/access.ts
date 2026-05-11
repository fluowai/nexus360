import { useMemo } from 'react';

export function useAccess(user: any) {
  return useMemo(() => {
    const plan = user?.plan;
    const planFeatures = plan?.planFeatures || [];
    const userPermissions = user?.permissions || {};
    const role = user?.role;
    const subscriptionStatus = user?.subscriptionStatus || 'TRIAL';

    return {
      // Verifica se o módulo está habilitado no plano
      hasModule: (moduleKey: string) => {
        // Por simplificação agora, assumimos que se tiver qualquer feature do módulo, o módulo está ativo
        return planFeatures.some((f: any) => f.featureKey.startsWith(moduleKey) && f.isEnabled);
      },

      // Verifica feature específica no plano
      hasFeature: (featureKey: string) => {
        return planFeatures.some((f: any) => f.featureKey === featureKey && f.isEnabled);
      },

      // Verifica permissão do usuário (RBAC)
      can: (permissionKey: string) => {
        if (role === 'SUPER_ADMIN' || role === 'ORG_ADMIN') return true;
        
        // Verifica permissão granular
        // Formato esperado: { "crm": ["view", "edit"], "finance": [] }
        const [module, action] = permissionKey.split('.');
        return userPermissions[module]?.includes(action);
      },

      // Verifica se a assinatura permite escrita
      canWrite: () => {
        return ['ACTIVE', 'TRIAL'].includes(subscriptionStatus);
      },

      // Status da Assinatura
      subscriptionStatus,
      isReadOnly: subscriptionStatus === 'PAST_DUE',
      isBlocked: ['SUSPENDED', 'EXPIRED'].includes(subscriptionStatus),
      
      // Limites
      usage: user?.usage || {},
      planLimits: {
        maxLeads: plan?.maxLeads || 100,
        maxClients: plan?.maxClients || 10,
        maxUsers: plan?.maxUsers || 5,
        // ...
      }
    };
  }, [user]);
}

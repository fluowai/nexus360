import { useMemo } from 'react';

export function useAccess(user: any) {
  return useMemo(() => {
    const plan = user?.plan;
    const planFeatures = plan?.planFeatures || [];
    const userPermissions = user?.permissions || {};
    const role = user?.role;
    const subscriptionStatus = user?.subscriptionStatus || 'TRIAL';

    return {
      hasModule: (moduleKey: string) => {
        if (role === 'SUPER_ADMIN' || role === 'ORG_ADMIN' || role === 'AGENCY_ADMIN') return true;

        const modulePermissions = userPermissions[moduleKey];
        if (modulePermissions === '*' || (Array.isArray(modulePermissions) && modulePermissions.length > 0)) {
          return true;
        }

        return planFeatures.some((f: any) => f.featureKey.startsWith(moduleKey) && f.isEnabled);
      },

      hasFeature: (featureKey: string) => {
        if (role === 'SUPER_ADMIN' || role === 'ORG_ADMIN' || role === 'AGENCY_ADMIN') return true;

        const [module, action] = featureKey.split('.');
        const modulePermissions = userPermissions[module];
        if (modulePermissions === '*' || (Array.isArray(modulePermissions) && modulePermissions.includes(action))) {
          return true;
        }

        return planFeatures.some((f: any) => f.featureKey === featureKey && f.isEnabled);
      },

      can: (permissionKey: string) => {
        if (role === 'SUPER_ADMIN' || role === 'ORG_ADMIN') return true;

        const [module, action] = permissionKey.split('.');
        const modulePermissions = userPermissions[module];
        return modulePermissions === '*' || modulePermissions?.includes(action);
      },

      canWrite: () => {
        return ['ACTIVE', 'TRIAL'].includes(subscriptionStatus);
      },

      subscriptionStatus,
      isReadOnly: subscriptionStatus === 'PAST_DUE',
      isBlocked: ['SUSPENDED', 'EXPIRED'].includes(subscriptionStatus),

      usage: user?.usage || {},
      planLimits: {
        maxLeads: plan?.maxLeads || 100,
        maxClients: plan?.maxClients || 10,
        maxUsers: plan?.maxUsers || 5,
      },
    };
  }, [user]);
}

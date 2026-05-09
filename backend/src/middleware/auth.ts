import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    orgId: string;
    role: string;
    permissions?: any;
  };
}

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return process.env.JWT_SECRET;
};

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  jwt.verify(token, getJwtSecret(), (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido ou expirado." });
    }
    
    // Se for Super Admin, permitir trocar o contexto da organização via header
    const impersonatedOrgId = req.headers['x-org-id'];
    if (user.role === 'SUPER_ADMIN' && impersonatedOrgId) {
      user.orgId = impersonatedOrgId as string;
    }

    req.user = user;
    next();
  });
}

/**
 * Middleware para checar permissões granulares
 * Ex: requirePermission('leads', 'delete')
 */
export const requirePermission = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    // Admin da organização tem acesso total
    if (user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN') {
      return next();
    }

    const permissions = user?.permissions;

    // Se não tiver permissões definidas ou o recurso não existir para o usuário
    if (!permissions || !permissions[resource]) {
      return res.status(403).json({ error: "Você não tem permissão para acessar este recurso." });
    }

    // Se a permissão for uma string '*' (acesso total ao recurso) ou se a ação estiver na lista
    const resourcePermissions = permissions[resource];
    if (resourcePermissions === '*' || (Array.isArray(resourcePermissions) && resourcePermissions.includes(action))) {
      return next();
    }

    return res.status(403).json({ error: `Você não tem permissão para realizar a ação '${action}' em '${resource}'.` });
  };
};

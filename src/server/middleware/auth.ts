import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: JWT_SECRET must be defined in production environment.");
  }
  console.warn("WARNING: JWT_SECRET is not defined. Using development fallback.");
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    orgId: string;
    role: string;
  };
}

const getJwtSecret = () => process.env.JWT_SECRET || "dev-secret-only";

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
    req.user = user;
    next();
  });
}

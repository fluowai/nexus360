import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const getJwtSecret = () => process.env.JWT_SECRET || "dev-secret-only";

export function authRoutes(prisma: PrismaClient) {
  const router = Router();

  router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true }
      });

      if (!user || user.status !== "ACTIVE") {
        return res.status(401).json({ error: "Credenciais inválidas ou conta inativa." });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return res.status(401).json({ error: "Credenciais inválidas." });

      let orgId = user.organizationId;
      let orgName = user.organization?.name || "Sem Organização";

      if (user.role === 'SUPER_ADMIN' && !orgId) {
        const firstOrg = await prisma.organization.findFirst();
        if (firstOrg) {
          orgId = firstOrg.id;
          orgName = firstOrg.name;
        }
      }

      const token = jwt.sign(
        { id: user.id, orgId: orgId, role: user.role },
        getJwtSecret(),
        { expiresIn: '8h' }
      );
 
      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId, orgName }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro interno no servidor." });
    }
  });

  router.post("/register", async (req, res) => {
    const { name, email, password, organizationName } = req.body;
    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: "Este email já está em uso." });

      const userCount = await prisma.user.count();
      const isFirstUser = userCount === 0;
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: isFirstUser ? "Nexus360 Master" : organizationName,
            domain: email.split('@')[1],
            plan: isFirstUser ? "Enterprise" : "Free"
          }
        });
        const user = await tx.user.create({
          data: { name, email, password: hashedPassword, role: isFirstUser ? "SUPER_ADMIN" : "ORG_ADMIN", organizationId: org.id }
        });
        return { user, org };
      });

      const token = jwt.sign(
        { id: result.user.id, orgId: result.org.id, role: result.user.role },
        getJwtSecret(),
        { expiresIn: '8h' }
      );

      res.status(201).json({
        token,
        user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role, orgId: result.org.id, orgName: result.org.name }
      });
    } catch (error) {
      res.status(500).json({ error: "Falha ao registrar agência." });
    }
  });

  router.get("/me", async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });

    try {
      const decoded: any = jwt.verify(token, getJwtSecret());
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { organization: true }
      });

      if (!user) return res.status(404).json({ error: "User not found" });
      
      let orgId = user.organizationId;
      let orgName = user.organization?.name || "No Org";

      if (user.role === 'SUPER_ADMIN' && !orgId) {
        const firstOrg = await prisma.organization.findFirst();
        if (firstOrg) {
          orgId = firstOrg.id;
          orgName = firstOrg.name;
        }
      }

      res.json({ id: user.id, name: user.name, email: user.email, role: user.role, orgId, orgName });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  return router;
}

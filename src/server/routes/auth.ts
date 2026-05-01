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
      console.log(`[AUTH] Tentativa de login para: ${email}`);

      const user = await prisma.user.findUnique({
        where: { email },
        select: { 
          id: true, 
          email: true, 
          password: true, 
          role: true, 
          status: true, 
          name: true,
          organizationId: true,
          organization: true 
        }
      });


      if (!user) {
        console.log(`[AUTH] Usuário não encontrado: ${email}`);
        return res.status(401).json({ error: "Credenciais inválidas." });
      }

      if (user.status !== "ACTIVE") {
        console.log(`[AUTH] Usuário inativo (${user.status}): ${email}`);
        return res.status(401).json({ error: "Conta inativa." });
      }

      const isValid = await bcrypt.compare(password, user.password);
      console.log(`[AUTH] Senha válida: ${isValid}`);

      if (!isValid) {
        return res.status(401).json({ error: "Credenciais inválidas." });
      }


      let orgId = user.organizationId;
      let orgName = user.organization?.name || "Sem Organização";

      // Se for Super Admin e não tiver Org, vincula à Master ou à primeira que encontrar
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
         user: {
           id: user.id,
           name: user.name,
           email: user.email,
           role: user.role,
           orgId: orgId,
           orgName: orgName
         }
       });
    } catch (error) {
      console.error("[AUTH ERROR] Falha no Login:", error);
      res.status(500).json({ error: "Erro interno no servidor." });
    }
  });

  router.post("/register", async (req, res) => {
    const { name, email, password, organizationName } = req.body;

    try {
      const existingUser = await prisma.user.findUnique({ 
        where: { email },
        select: { id: true, email: true } // Ignora avatarUrl
      });

      if (existingUser) {
        return res.status(400).json({ error: "Este email já está em uso." });
      }

      // Verificar se é o primeiro usuário do sistema
      const userCount = await prisma.user.count();
      const isFirstUser = userCount === 0;

      const hashedPassword = await bcrypt.hash(password, 10);

      // Transação para criar Org e Usuário
      const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: isFirstUser ? "Nexus360 Master" : organizationName,
            domain: isFirstUser ? "nexus360.ai" : email.split('@')[1],
            plan: isFirstUser ? "Enterprise" : "Free"
          }
        });

        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: isFirstUser ? "SUPER_ADMIN" : "ORG_ADMIN",
            organizationId: org.id
          }
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
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          orgId: result.org.id,
          orgName: result.org.name
        }
      });
    } catch (error) {
      console.error("Registration Error Details:", error);
      res.status(500).json({ error: "Falha ao registrar agência." });
    }
  });

  router.get("/me", async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log("[AUTH] /me - Token não fornecido");
      return res.status(401).json({ error: "No token" });
    }

    try {
      const decoded: any = jwt.verify(token, getJwtSecret());
      console.log(`[AUTH] /me - Token verificado para User: ${decoded.id}`);
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

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: orgId,
        orgName: orgName
      });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  router.get("/debug", async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: { email: true, role: true, status: true }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}


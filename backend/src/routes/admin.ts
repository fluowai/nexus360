import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { addDomainToVercel, addDomainToDirectAdmin } from "../utils/domainManager.js";
import bcrypt from "bcryptjs";
import { assertStrongPassword } from "../utils/security.js";

export function adminRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/metrics", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Access denied. Super Admin role required." });
    }
    try {
      const orgsCount = await prisma.organization.count();
      const usersCount = await prisma.user.count();
      const totalLeads = await prisma.lead.count();
      const revenue = await prisma.organization.findMany({ select: { plan: true } });

      res.json({
        agencies: orgsCount,
        totalUsers: usersCount,
        totalLeads,
        revenue: revenue.length * 499
      });
    } catch (error) {
       res.status(500).json({ error: "Failed to fetch admin metrics" });
    }
  });

  router.get("/dashboard", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Access denied. Super Admin role required." });
    }
    const { orgId } = req.query;
    const whereClause = orgId ? { organizationId: String(orgId) } : {};
    
    try {
      const leadsCount = await prisma.lead.count({ where: whereClause });
      const clientsCount = await prisma.client.count({ where: whereClause });
      const proposalsCount = await prisma.proposal.count({ where: whereClause });
      
      let orgName = "Painel Global";
      if (orgId) {
        const org = await prisma.organization.findUnique({
          where: { id: String(orgId) },
          select: { name: true }
        });
        if (org) orgName = org.name;
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });

      res.json({
        orgName,
        userName: user?.name || "Admin",
        metrics: {
          leads: leadsCount,
          clients: clientsCount,
          proposals: proposalsCount,
          revenue: 45200.00,
          conversions: clientsCount > 0 ? ((clientsCount / leadsCount) * 100).toFixed(1) : 0,
          contentCount: 42
        },
        chartData: [
          { name: "Seg", leads: 40, conv: 24 },
          { name: "Ter", leads: 30, conv: 13 },
          { name: "Qua", leads: 20, conv: 98 },
          { name: "Qui", leads: 27, conv: 39 },
          { name: "Sex", leads: 18, conv: 48 },
          { name: "Sab", leads: 23, conv: 38 },
          { name: "Dom", leads: 34, conv: 43 },
        ]
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard" });
    }
  });

  router.get("/orgs", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    try {
      const orgs = await prisma.organization.findMany({
        include: { _count: { select: { users: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json(orgs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orgs" });
    }
  });

  router.post("/orgs", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { name, domain, plan, adminEmail, adminPassword, adminName, slug, isTestAccount, betaAccess } = req.body;
    const adminPasswordError = assertStrongPassword(adminPassword);
    if (adminPasswordError) return res.status(400).json({ error: adminPasswordError });
    
    if (!adminEmail || !adminPassword) {
      return res.status(400).json({ error: "E-mail e Senha do administrador são obrigatórios" });
    }

    // Gerar um slug padrão se não for enviado
    const finalSlug = slug || name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Criar Organização
        const org = await tx.organization.create({
          data: { 
            name, 
            domain, 
            plan: plan || "Free",
            slug: finalSlug,
            isTestAccount: isTestAccount || false,
            betaAccess: betaAccess || false
          }
        });

        // 2. Criar Usuário Admin para esta organização
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await tx.user.create({
          data: {
            email: adminEmail,
            password: hashedPassword,
            name: adminName || name,
            role: 'ORG_ADMIN',
            organizationId: org.id,
            status: 'ACTIVE'
          }
        });

        return org;
      });

      res.json(result);
    } catch (error: any) {
      console.error("[ADMIN_ORGS_POST]", error);
      res.status(500).json({ 
        error: "Falha ao criar cliente e usuário administrador",
        details: error.message 
      });
    }
  });

  // Atualizar Organização / Cliente (SUPER_ADMIN)
  router.patch("/orgs/:id", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { name, domain, plan, planId, slug, adminEmail, password, isTestAccount, betaAccess } = req.body;
    if (password && password.trim() !== "") {
      const passwordError = assertStrongPassword(password);
      if (passwordError) return res.status(400).json({ error: passwordError });
    }
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Verificar se a organização existe
        const existingOrg = await tx.organization.findUnique({ where: { id } });
        if (!existingOrg) throw new Error("Organização não encontrada.");

        // 2. Atualizar Organização
        const org = await tx.organization.update({
          where: { id },
          data: { 
            ...(name && { name }),
            ...(domain !== undefined && { domain }),
            ...(plan && { plan }),
            ...(planId && { planId }),
            ...(slug && { slug }),
            ...(isTestAccount !== undefined && { isTestAccount }),
            ...(betaAccess !== undefined && { betaAccess })
          }
        });

        // 3. Atualizar Usuário Admin se solicitado
        if (adminEmail || (password && password.trim() !== "")) {
          const admin = await tx.user.findFirst({
            where: { organizationId: id, role: 'ORG_ADMIN' }
          });

          if (admin) {
            const userUpdateData: any = {};
            if (adminEmail) {
              // Verificar se o email já existe em outro usuário
              const emailConflict = await tx.user.findFirst({
                where: { email: adminEmail, NOT: { id: admin.id } }
              });
              if (emailConflict) throw new Error("Este e-mail já está em uso por outro usuário.");
              userUpdateData.email = adminEmail;
            }
            if (password && password.trim() !== "") {
              userUpdateData.password = await bcrypt.hash(password, 10);
            }

            await tx.user.update({
              where: { id: admin.id },
              data: userUpdateData
            });
          }
        }

        return org;
      });

      res.json(result);
    } catch (error: any) {
      console.error("[ADMIN_ORGS_PATCH_ERROR]", error);
      res.status(error.message.includes("encontrada") ? 404 : 500).json({ 
        error: "Falha ao atualizar organização",
        details: error.message 
      });
    }
  });

  // Excluir Organização (Cascata)
  router.delete("/orgs/:id", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { id } = req.params;
    
    try {
      await prisma.$transaction(async (tx) => {
        // Remover dependências em cascata (Exemplos)
        await tx.domain.deleteMany({ where: { organizationId: id } });
        await tx.lead.deleteMany({ where: { organizationId: id } });
        await tx.client.deleteMany({ where: { organizationId: id } });
        await tx.project.deleteMany({ where: { organizationId: id } });
        await tx.user.deleteMany({ where: { organizationId: id } });
        
        // Finalmente deletar a organização
        await tx.organization.delete({ where: { id } });
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("[ADMIN_ORGS_DELETE]", error);
      res.status(500).json({ error: "Failed to delete organization (cascade error)" });
    }
  });

  router.get("/users", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          permissions: true,
          organizationId: true,
          createdAt: true,
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Editar Usuário (SUPER_ADMIN)
  router.patch("/users/:id", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { name, email, role, status, permissions } = req.body;
    const password = typeof req.body.password === "string" ? req.body.password.trim() : req.body.password;
    const organizationId = req.body.organizationId || null;
    if (password) {
      const passwordError = assertStrongPassword(password);
      if (passwordError) return res.status(400).json({ error: passwordError });
    }
    
    try {
      const data: any = { name, email, role, status, permissions, organizationId };
      if (password) {
        data.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data
      });
      const { password: _password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  router.post("/domains", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { domain, orgId } = req.body;

    if (!domain || !orgId) {
      return res.status(400).json({ error: "Domain and OrgId are required" });
    }

    try {
      // 1. Add to Vercel
      console.log(`[Domain] Adding ${domain} to Vercel...`);
      await addDomainToVercel(domain);

      // 2. Add to DirectAdmin
      console.log(`[Domain] Adding ${domain} to DirectAdmin...`);
      await addDomainToDirectAdmin(domain);

      // 3. Update Database
      await prisma.organization.update({
        where: { id: orgId },
        data: { domain }
      });

      res.json({ success: true, message: "Domain registered successfully in Vercel and DirectAdmin" });
    } catch (error: any) {
      console.error("[Domain Error]", error);
      res.status(500).json({ 
        error: "Failed to register domain", 
        details: error.message 
      });
    }
  });

  // Criar Usuário (SUPER_ADMIN)
  router.post("/users", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { name, email, role, status, permissions } = req.body;
    const password = typeof req.body.password === "string" ? req.body.password.trim() : req.body.password;
    const organizationId = req.body.organizationId || null;
    const passwordError = assertStrongPassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });
    
    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: "E-mail já está em uso." });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role || 'USER',
          status: status || 'ACTIVE',
          permissions: permissions || {},
          organizationId
        }
      });
      const { password: _password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("[ADMIN_USER_POST]", error);
      res.status(500).json({ error: "Failed to create system user" });
    }
  });

  // Excluir Usuário (SUPER_ADMIN)
  router.delete("/users/:id", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    try {
      // Impedir de excluir a si mesmo
      if (req.params.id === req.user.id) {
        return res.status(400).json({ error: "Você não pode excluir sua própria conta." });
      }
      await prisma.user.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  
  // --- Modular Routes Handle elsewhere ---
  
  return router;
}

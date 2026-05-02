import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { addDomainToVercel, addDomainToDirectAdmin } from "../utils/domainManager.js";
import bcrypt from "bcryptjs";

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
      
      res.json({
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
    const { name, domain, plan, adminEmail, adminPassword, adminName, slug } = req.body;
    
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
            slug: finalSlug
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

  router.delete("/orgs/:id", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    try {
      await prisma.organization.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete organization" });
    }
  });

  router.get("/users", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
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

  return router;
}

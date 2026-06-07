import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import { assertStrongPassword } from "../utils/security.js";
import { DOMAIN_REGEX, getDnsInstructions, normalizeDomain, verifyDomainDns } from "../utils/domainConfig.js";

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
      let plan: any = { name: "Global", maxLeads: 100, leadsLimit: 100 };
      if (orgId) {
        const org = await prisma.organization.findUnique({
          where: { id: String(orgId) },
          select: { name: true, plan: true, planObj: true }
        });
        if (org) {
          orgName = org.name;
          const legacyPlan = !org.planObj && org.plan
            ? await prisma.plan.findFirst({ where: { name: org.plan } })
            : null;
          const sourcePlan = org.planObj || legacyPlan || { name: org.plan || "Free", maxLeads: 100 };
          plan = {
            ...sourcePlan,
            maxLeads: (sourcePlan as any).maxLeads ?? (sourcePlan as any).leadsLimit ?? 100,
            leadsLimit: (sourcePlan as any).maxLeads ?? (sourcePlan as any).leadsLimit ?? 100,
          };
        }
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });

      res.json({
        orgName,
        userName: user?.name || "Admin",
        plan,
        usage: { leads: leadsCount },
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
    const typeFilter = req.query.type as string | undefined;
    const whereClause = typeFilter && ['CLIENT', 'WHITELABEL'].includes(typeFilter)
      ? { type: typeFilter }
      : {};
    try {
      const orgs = await prisma.organization.findMany({
        where: whereClause,
        include: {
          domains: { orderBy: { createdAt: 'desc' } },
          planObj: true,
          _count: { select: { users: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(orgs);
    } catch (error) {
      console.error("[ADMIN_ORGS_GET_ERROR]", error);
      const details = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to fetch orgs", details });
    }
  });

  router.post("/orgs", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { name, type, domain, plan, planId, adminEmail, adminPassword, adminName, slug, isTestAccount, betaAccess, whiteLabelConfig } = req.body;
    const adminPasswordError = assertStrongPassword(adminPassword);
    if (adminPasswordError) return res.status(400).json({ error: adminPasswordError });

    if (!adminEmail || !adminPassword) {
      return res.status(400).json({ error: "E-mail e Senha do administrador são obrigatórios" });
    }

    // Gerar um slug padrão se não for enviado
    const finalSlug = slug || name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
    const normalizedDomain = normalizeDomain(domain);
    if (normalizedDomain && !DOMAIN_REGEX.test(normalizedDomain)) {
      return res.status(400).json({ error: "Informe um dominio valido, ex: crm.seudominio.com.br" });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const selectedPlan = planId
          ? await tx.plan.findUnique({ where: { id: planId } })
          : plan
            ? await tx.plan.findFirst({ where: { name: plan } })
            : null;

        // 1. Criar Organização
        const validType = type && ['CLIENT', 'WHITELABEL'].includes(type) ? type : 'CLIENT';
        const org = await tx.organization.create({
          data: {
            name,
            type: validType,
            domain: normalizedDomain || null,
            plan: selectedPlan?.name || plan || "Free",
            planId: selectedPlan?.id || null,
            slug: finalSlug,
            isTestAccount: isTestAccount || false,
            betaAccess: betaAccess || false,
            ...(whiteLabelConfig !== undefined && { whiteLabelConfig })
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

        // If a custom domain was provided, register it in the Domain table too
        if (normalizedDomain) {
          const verification = await verifyDomainDns(normalizedDomain, org.slug);
          await tx.domain.upsert({
            where: { name: normalizedDomain },
            update: { organizationId: org.id, provider: 'docker', status: verification.verified ? "verified" : "pending" },
            create: {
              name: normalizedDomain,
              provider: 'docker',
              status: verification.verified ? "verified" : "pending",
              organizationId: org.id,
            },
          });
        }

        return tx.organization.findUnique({
          where: { id: org.id },
          include: { planObj: true, _count: { select: { users: true } } }
        });
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
    const { name, type, domain, plan, planId, slug, adminEmail, isTestAccount, betaAccess, whiteLabelConfig } = req.body;
    const password = typeof req.body.password === "string" ? req.body.password.trim() : req.body.password;
    const shouldUpdatePassword = typeof password === "string" && password !== "" && !/^\*+$/.test(password);
    const hasDomain = Object.prototype.hasOwnProperty.call(req.body, "domain");
    const normalizedDomain = hasDomain ? normalizeDomain(domain) : undefined;

    if (shouldUpdatePassword) {
      const passwordError = assertStrongPassword(password);
      if (passwordError) return res.status(400).json({ error: passwordError });
    }
    if (normalizedDomain && !DOMAIN_REGEX.test(normalizedDomain)) {
      return res.status(400).json({ error: "Informe um dominio valido, ex: crm.seudominio.com.br" });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Verificar se a organização existe
        const existingOrg = await tx.organization.findUnique({ where: { id } });
        const hasPlanId = Object.prototype.hasOwnProperty.call(req.body, "planId");
        const selectedPlan = hasPlanId && planId
          ? await tx.plan.findUnique({ where: { id: planId } })
          : !hasPlanId && plan
            ? await tx.plan.findFirst({ where: { name: plan } })
            : null;
        if (hasPlanId && planId && !selectedPlan) throw new Error("Plano nao encontrado.");
        if (!existingOrg) throw new Error("Organização não encontrada.");

        // 2. Atualizar Organização
          const org = await tx.organization.update({
            where: { id },
            data: {
              ...(name && { name }),
              ...(type && ['CLIENT', 'WHITELABEL'].includes(type) && { type }),
              ...(hasDomain && { domain: normalizedDomain || null }),
              ...(plan && !selectedPlan && { plan }),
              ...(selectedPlan && { plan: selectedPlan.name }),
              ...(hasPlanId && { planId: selectedPlan?.id || null }),
              ...(!hasPlanId && selectedPlan && { planId: selectedPlan.id }),
              ...(slug && { slug }),
              ...(isTestAccount !== undefined && { isTestAccount }),
              ...(betaAccess !== undefined && { betaAccess }),
              ...(whiteLabelConfig !== undefined && { whiteLabelConfig })
            }
          });

        // 3. Atualizar Usuário Admin se solicitado
        if (adminEmail || shouldUpdatePassword) {
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
            if (shouldUpdatePassword) {
              userUpdateData.password = await bcrypt.hash(password, 10);
            }

            await tx.user.update({
              where: { id: admin.id },
              data: userUpdateData
            });
          }
        }

        // If domain changed, upsert Domain record
        if (hasDomain) {
          // Remove old domain records for this org if domain changed
          if (existingOrg.domain && existingOrg.domain !== normalizedDomain) {
            await tx.domain.deleteMany({
              where: { name: existingOrg.domain, organizationId: id }
            });
          }
          // Create new domain record if domain is set
          if (normalizedDomain) {
            const verification = await verifyDomainDns(normalizedDomain, org.slug);
            await tx.domain.upsert({
              where: { name: normalizedDomain },
              update: { organizationId: id, provider: 'docker', status: verification.verified ? "verified" : "pending" },
              create: {
                name: normalizedDomain,
                provider: 'docker',
                status: verification.verified ? "verified" : "pending",
                organizationId: id,
              },
            });
          }
        }

        return tx.organization.findUnique({
          where: { id: org.id },
          include: { planObj: true, _count: { select: { users: true } } }
        });
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

  // Get white-label config for an org
  router.get("/orgs/:id/whitelabel", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    try {
      const org = await prisma.organization.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          name: true,
          type: true,
          whiteLabelConfig: true,
          domain: true,
          slug: true,
          plan: true,
          planId: true,
        }
      });
      if (!org) return res.status(404).json({ error: "Organização não encontrada" });
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch whitelabel config" });
    }
  });

  // Update white-label branding for an org
  router.patch("/orgs/:id/whitelabel", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { whiteLabelConfig, type } = req.body;
    try {
      const org = await prisma.organization.update({
        where: { id },
        data: {
          ...(whiteLabelConfig !== undefined && { whiteLabelConfig }),
          ...(type && ['CLIENT', 'WHITELABEL'].includes(type) && { type }),
        }
      });
      res.json({ success: true, org });
    } catch (error) {
      res.status(500).json({ error: "Failed to update whitelabel config" });
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
    const { orgId } = req.body;
    const domain = normalizeDomain(req.body?.domain);

    if (!domain || !orgId) {
      return res.status(400).json({ error: "Domain and OrgId are required" });
    }
    if (!DOMAIN_REGEX.test(domain)) {
      return res.status(400).json({ error: "Informe um dominio valido, ex: crm.seudominio.com.br" });
    }

    try {
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!org) return res.status(404).json({ error: "Organizacao nao encontrada" });

      const existing = await prisma.domain.findUnique({ where: { name: domain } });
      if (existing && existing.organizationId !== orgId) {
        return res.status(409).json({ error: "Este dominio ja esta vinculado a outra organizacao." });
      }

      const savedDomain = await prisma.$transaction(async (tx) => {
        const verification = await verifyDomainDns(domain, org.slug);

        if (org.domain && org.domain !== domain) {
          await tx.domain.deleteMany({ where: { name: org.domain, organizationId: orgId } });
        }

        const domainRecord = await tx.domain.upsert({
          where: { name: domain },
          update: { organizationId: orgId, provider: "docker", status: verification.verified ? "verified" : existing?.status || "pending" },
          create: {
            name: domain,
            provider: "docker",
            status: verification.verified ? "verified" : "pending",
            organizationId: orgId,
          },
        });

        await tx.organization.update({
          where: { id: orgId },
          data: { domain },
        });

        return { domainRecord, verification };
      });

      res.json({
        success: true,
        message: savedDomain.verification.verified
          ? "Dominio cadastrado e DNS validado para o servidor Nexus360."
          : "Dominio cadastrado. Configure o DNS para apontar ao servidor Nexus360 e validar a URL do cliente.",
        domain: {
          ...savedDomain.domainRecord,
          dns: getDnsInstructions(domain, org.slug),
        },
        verification: savedDomain.verification,
      });
    } catch (error: any) {
      console.error("[Domain Error]", error);
      res.status(500).json({
        error: "Failed to register domain",
        details: error.message
      });
    }
  });

  router.post("/domains/:id/verify", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });

    try {
      const domain = await prisma.domain.findUnique({
        where: { id: req.params.id },
        include: { organization: { select: { slug: true } } },
      });
      if (!domain) return res.status(404).json({ error: "Dominio nao encontrado" });

      const verification = await verifyDomainDns(domain.name, domain.organization.slug);
      const updated = await prisma.domain.update({
        where: { id: domain.id },
        data: { status: verification.verified ? "verified" : "pending" },
      });

      res.json({
        success: true,
        domain: {
          ...updated,
          dns: getDnsInstructions(domain.name, domain.organization.slug),
        },
        verification,
      });
    } catch (error: any) {
      console.error("[Admin Domain Verify Error]", error);
      res.status(500).json({
        error: "Falha ao validar DNS",
        details: error.message,
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

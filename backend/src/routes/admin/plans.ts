import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../../middleware/auth.js";

export function adminPlansRoutes(prisma: PrismaClient) {
  const router = Router();

  const toOptionalString = (value: unknown) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const toOptionalNumber = (value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const toNumberOrDefault = (value: unknown, fallback: number) => {
    const parsed = toOptionalNumber(value);
    return parsed === undefined ? fallback : parsed;
  };

  const buildPlanUpdateData = (body: any) => {
    const data: Record<string, any> = {};

    const stringFields = ["name", "slug", "description"];
    for (const field of stringFields) {
      const value = toOptionalString(body[field]);
      if (value !== undefined) data[field] = value;
    }

    const numberFields = [
      "priceMonthly",
      "priceYearly",
      "maxUsers",
      "maxClients",
      "maxLeads",
      "maxAutomations",
      "maxReports",
      "maxIntegrations",
      "maxMessages",
      "maxContacts",
      "maxDeals",
      "maxPipelines",
      "maxLandingPages",
      "maxInboxes",
      "maxAIRequests",
    ];

    for (const field of numberFields) {
      const value = toOptionalNumber(body[field]);
      if (value !== undefined) data[field] = value;
    }

    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body.isPublic === "boolean") data.isPublic = body.isPublic;

    return data;
  };

  const ensureFeatureCatalog = async () => {
    const modules = [
      { key: "dashboard", name: "Dashboard", category: "Geral" },
      { key: "crm", name: "CRM & Pipelines", category: "Vendas" },
      { key: "prospecting", name: "Captacao de Leads", category: "Vendas" },
      { key: "sales", name: "Maquina de Vendas", category: "Vendas" },
      { key: "proposals", name: "Propostas", category: "Vendas" },
      { key: "ai", name: "Inteligencia Artificial", category: "IA" },
      { key: "finance", name: "Financeiro", category: "Operacao" },
      { key: "projects", name: "Projetos", category: "Operacao" },
      { key: "marketing", name: "Marketing", category: "Growth" },
      { key: "automations", name: "Automacoes", category: "Automacao" },
    ];

    const features = [
      { moduleKey: "dashboard", key: "dashboard.view", name: "Visualizar Dashboard" },
      { moduleKey: "crm", key: "crm.view", name: "Visualizar CRM" },
      { moduleKey: "crm", key: "crm.create_lead", name: "Criar Leads" },
      { moduleKey: "crm", key: "crm.manage_boards", name: "Gerenciar Funis CRM" },
      { moduleKey: "prospecting", key: "prospecting.view", name: "Visualizar Captacao" },
      { moduleKey: "prospecting", key: "prospecting.capture", name: "Captar Leads" },
      { moduleKey: "prospecting", key: "prospecting.enrich", name: "Enriquecer Leads" },
      { moduleKey: "prospecting", key: "prospecting.schedule", name: "Agendar Captacao" },
      { moduleKey: "prospecting", key: "prospecting.funnels", name: "Funis IA WhatsApp" },
      { moduleKey: "ai", key: "ai.sdr", name: "Agente SDR Automatico" },
      { moduleKey: "ai", key: "ai.agents", name: "Central de Agentes" },
      { moduleKey: "automations", key: "automations.view", name: "Visualizar Automacoes" },
      { moduleKey: "automations", key: "automations.create", name: "Criar Automacoes" },
      { moduleKey: "finance", key: "finance.view", name: "Visualizar Financeiro" },
      { moduleKey: "projects", key: "projects.view", name: "Visualizar Projetos" },
      { moduleKey: "marketing", key: "marketing.view", name: "Visualizar Marketing" },
      { moduleKey: "sales", key: "sales.view", name: "Visualizar Vendas" },
      { moduleKey: "proposals", key: "proposals.view", name: "Visualizar Propostas" },
    ];

    for (const module of modules) {
      await prisma.module.upsert({
        where: { key: module.key },
        update: { name: module.name, category: module.category, isActive: true },
        create: module,
      });
    }

    for (const feature of features) {
      await prisma.feature.upsert({
        where: { key: feature.key },
        update: { name: feature.name, moduleKey: feature.moduleKey, isActive: true },
        create: feature,
      });
    }
  };

  // Middleware de proteção Super Admin
  const requireSuperAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso restrito ao Super Administrador." });
    }
    next();
  };

  router.use(authenticateToken, requireSuperAdmin);

  // Listar Planos
  router.get("/", async (req, res) => {
    const plans = await prisma.plan.findMany({
      include: { planFeatures: true }
    });
    res.json(plans);
  });

  // Criar Plano
  router.post("/", async (req, res) => {
    const { name, slug, description, priceMonthly, priceYearly, ...limits } = req.body;
    try {
      if (!toOptionalString(name)) {
        return res.status(400).json({ error: "Nome do plano e obrigatorio." });
      }

      const plan = await prisma.plan.create({
        data: {
          name,
          slug: toOptionalString(slug) || name.toLowerCase().replace(/ /g, '-'),
          description,
          priceMonthly: toNumberOrDefault(priceMonthly, 0),
          priceYearly: toNumberOrDefault(priceYearly, 0),
          maxUsers: toNumberOrDefault(limits.maxUsers, 5),
          maxClients: toNumberOrDefault(limits.maxClients, 10),
          maxLeads: toNumberOrDefault(limits.maxLeads, 100),
          maxAutomations: toNumberOrDefault(limits.maxAutomations, 5),
          maxReports: toNumberOrDefault(limits.maxReports, 10),
          maxIntegrations: toNumberOrDefault(limits.maxIntegrations, 3),
          maxMessages: toNumberOrDefault(limits.maxMessages, 1000),
        }
      });
      res.json(plan);
    } catch (error: any) {
      console.error("[ADMIN_PLAN_CREATE_ERROR]", error?.message || error);
      res.status(500).json({ error: "Erro ao criar plano.", details: error?.message });
    }
  });

  // Atualizar Plano
  router.patch("/:id", async (req, res) => {
    try {
      const data = buildPlanUpdateData(req.body);
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "Nenhum campo valido enviado para atualizar." });
      }

      const plan = await prisma.plan.update({
        where: { id: req.params.id },
        data
      });
      res.json(plan);
    } catch (error: any) {
      console.error("[ADMIN_PLAN_UPDATE_ERROR]", {
        planId: req.params.id,
        body: req.body,
        message: error?.message,
        code: error?.code,
      });
      res.status(500).json({ error: "Erro ao atualizar plano.", details: error?.message });
    }
  });

  // Gerenciar Features do Plano
  router.post("/:id/features", async (req, res) => {
    const { featureKey, isEnabled, limit } = req.body;
    try {
      const planFeature = await prisma.planFeature.upsert({
        where: {
          planId_featureKey: {
            planId: req.params.id,
            featureKey
          }
        },
        update: { isEnabled, limit },
        create: {
          planId: req.params.id,
          featureKey,
          isEnabled,
          limit
        }
      });
      res.json(planFeature);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar feature do plano." });
    }
  });

  // Listar todas as features disponíveis para a matriz
  router.get("/features-list", async (req, res) => {
    await ensureFeatureCatalog();
    const modules = await prisma.module.findMany({
      where: { isActive: true },
      include: { features: { where: { isActive: true }, orderBy: { name: "asc" } } },
      orderBy: [{ category: "asc" }, { name: "asc" }]
    });
    res.json(modules);
  });

  return router;
}

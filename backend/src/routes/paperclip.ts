import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { AuthRequest } from "../middleware/auth.js";
import {
  PaperclipApiError,
  createPaperclipClient,
  normalizePaperclipBaseUrl,
} from "../services/paperclipClient.js";

type PaperclipSettings = {
  enabled: boolean;
  deploymentMode: "self_hosted" | "desktop" | "hybrid";
  baseUrl: string | null;
  apiToken: string | null;
  notes: string | null;
  allowedAdapters: string[];
  enabledCapabilities: string[];
  grantedAt: string | null;
  grantedById: string | null;
  remoteCompanyId: string | null;
  remoteCompanyName: string | null;
  remoteCompanyStatus: string | null;
  lastConnectionAt: string | null;
  lastConnectionStatus: "connected" | "error" | "never";
  lastConnectionError: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  lastAgentSyncAt: string | null;
  lastAgentSyncCount: number;
};

const PAPERCLIP_ADAPTERS = [
  { key: "claude_local", label: "Claude Code", runtime: "Anthropic local adapter" },
  { key: "codex_local", label: "Codex", runtime: "OpenAI Codex local adapter" },
  { key: "cursor", label: "Cursor", runtime: "Cursor adapter" },
  { key: "opencode", label: "OpenCode", runtime: "OpenCode adapter" },
  { key: "openclaw", label: "OpenClaw", runtime: "OpenClaw gateway" },
  { key: "bash", label: "Bash", runtime: "Shell/runtime adapter" },
  { key: "http", label: "HTTP", runtime: "Webhook/runtime bridge" },
];

const PAPERCLIP_CAPABILITIES = [
  {
    key: "multi_company",
    title: "Multi-company control plane",
    summary: "Opera varias empresas no mesmo deploy com isolamento de dados e governanca central.",
    pillar: "Governanca",
  },
  {
    key: "bring_your_own_agents",
    title: "Bring your own agents",
    summary: "Conecta runtimes diferentes no mesmo organograma, incluindo Codex, Claude, Cursor, Bash e HTTP.",
    pillar: "Agents",
  },
  {
    key: "heartbeats",
    title: "Heartbeats e rotinas",
    summary: "Aciona agentes por agenda, mencoes, atribuicoes e execucao manual, sem processo residente continuo.",
    pillar: "Orquestracao",
  },
  {
    key: "goal_alignment",
    title: "Goal alignment",
    summary: "Cada task e estrategia fica vinculada ao objetivo da companhia, preservando contexto e prioridade.",
    pillar: "Planejamento",
  },
  {
    key: "budgets",
    title: "Cost control e budgets",
    summary: "Define orcamentos por agente e para a empresa, pausando automaticamente quando o teto e atingido.",
    pillar: "Financeiro",
  },
  {
    key: "approvals_governance",
    title: "Approvals e governance",
    summary: "Permite aprovar estrategia, hires, overrides e intervencoes antes dos agentes seguirem adiante.",
    pillar: "Governanca",
  },
  {
    key: "ticket_audit",
    title: "Ticket system e audit log",
    summary: "Mantem trilha imutavel de conversas, tool-calls e decisoes por execucao.",
    pillar: "Observabilidade",
  },
  {
    key: "org_chart",
    title: "Org chart e cadeia de escalacao",
    summary: "Modela hierarquia real entre CEO, gestores e especialistas, inclusive para bloqueios e delegacao.",
    pillar: "Estrutura",
  },
  {
    key: "skills_library",
    title: "Skills e company library",
    summary: "Anexa skills corporativas reutilizaveis aos agentes para padronizar execucao e conhecimento.",
    pillar: "Conhecimento",
  },
  {
    key: "execution_workspaces",
    title: "Execution workspaces",
    summary: "Conecta repositorios e workspaces reais para que os agentes trabalhem em contexto operacional concreto.",
    pillar: "Execucao",
  },
  {
    key: "api_surface",
    title: "API e extensibilidade",
    summary: "Expone API propria para automacoes, integracoes e controle externo da operacao Paperclip.",
    pillar: "Integracao",
  },
];

const PAPERCLIP_ROLLOUT = [
  "Definir uma empresa piloto, meta principal e guardrails de custo.",
  "Escolher adapters autorizados e padrao de deployment (desktop, self-hosted ou hibrido).",
  "Configurar CEO inicial, heartbeat, budget mensal e cadeia de aprovacao.",
  "Conectar workspace/repo real apenas depois da governanca basica estar validada.",
  "Liberar para novas contas gradualmente, monitorando trilhas, custos e throughput.",
];

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStringArray(value: unknown, allowedValues: string[]) {
  const allowed = new Set(allowedValues);
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item)).filter((item) => allowed.has(item))));
}

function parseIsoString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getPaperclipSettings(settings: unknown): PaperclipSettings {
  const root = isObject(settings) ? settings : {};
  const paperclip = isObject(root.paperclip) ? root.paperclip : {};

  return {
    enabled: Boolean(paperclip.enabled),
    deploymentMode: paperclip.deploymentMode === "desktop" || paperclip.deploymentMode === "hybrid"
      ? paperclip.deploymentMode
      : "self_hosted",
    baseUrl: typeof paperclip.baseUrl === "string" && paperclip.baseUrl.trim()
      ? normalizePaperclipBaseUrl(paperclip.baseUrl)
      : null,
    apiToken: typeof paperclip.apiToken === "string" && paperclip.apiToken.trim()
      ? paperclip.apiToken.trim()
      : null,
    notes: typeof paperclip.notes === "string" && paperclip.notes.trim()
      ? paperclip.notes.trim()
      : null,
    allowedAdapters: normalizeStringArray(
      paperclip.allowedAdapters,
      PAPERCLIP_ADAPTERS.map((adapter) => adapter.key),
    ),
    enabledCapabilities: normalizeStringArray(
      paperclip.enabledCapabilities,
      PAPERCLIP_CAPABILITIES.map((capability) => capability.key),
    ),
    grantedAt: parseIsoString(paperclip.grantedAt),
    grantedById: parseIsoString(paperclip.grantedById),
    remoteCompanyId: parseIsoString(paperclip.remoteCompanyId),
    remoteCompanyName: parseIsoString(paperclip.remoteCompanyName),
    remoteCompanyStatus: parseIsoString(paperclip.remoteCompanyStatus),
    lastConnectionAt: parseIsoString(paperclip.lastConnectionAt),
    lastConnectionStatus: paperclip.lastConnectionStatus === "connected" || paperclip.lastConnectionStatus === "error"
      ? paperclip.lastConnectionStatus
      : "never",
    lastConnectionError: parseIsoString(paperclip.lastConnectionError),
    lastSyncAt: parseIsoString(paperclip.lastSyncAt),
    lastSyncError: parseIsoString(paperclip.lastSyncError),
    lastAgentSyncAt: parseIsoString(paperclip.lastAgentSyncAt),
    lastAgentSyncCount: parseNumber(paperclip.lastAgentSyncCount),
  };
}

function serializePaperclipSettings(
  settings: PaperclipSettings,
  options: { includeSecret?: boolean } = {},
) {
  const links = buildPaperclipLinks(settings.baseUrl, settings.remoteCompanyId);
  return {
    enabled: settings.enabled,
    deploymentMode: settings.deploymentMode,
    baseUrl: settings.baseUrl,
    ...(options.includeSecret ? { apiToken: settings.apiToken } : {}),
    hasApiToken: Boolean(settings.apiToken),
    notes: settings.notes,
    allowedAdapters: settings.allowedAdapters,
    enabledCapabilities: settings.enabledCapabilities,
    grantedAt: settings.grantedAt,
    grantedById: settings.grantedById,
    remoteCompanyId: settings.remoteCompanyId,
    remoteCompanyName: settings.remoteCompanyName,
    remoteCompanyStatus: settings.remoteCompanyStatus,
    lastConnectionAt: settings.lastConnectionAt,
    lastConnectionStatus: settings.lastConnectionStatus,
    lastConnectionError: settings.lastConnectionError,
    lastSyncAt: settings.lastSyncAt,
    lastSyncError: settings.lastSyncError,
    lastAgentSyncAt: settings.lastAgentSyncAt,
    lastAgentSyncCount: settings.lastAgentSyncCount,
    links,
  };
}

function mergePaperclipSettings(currentSettings: unknown, nextPaperclipSettings: PaperclipSettings) {
  const root = isObject(currentSettings) ? currentSettings : {};
  return {
    ...root,
    paperclip: nextPaperclipSettings,
  };
}

function buildPaperclipLinks(baseUrl: string | null, companyId: string | null, agentId?: string | null) {
  if (!baseUrl) {
    return {
      boardHome: null,
      companyBoard: null,
      companyApi: null,
      agentsApi: null,
      agentBoard: null,
      agentApi: null,
    };
  }

  const normalizedBase = normalizePaperclipBaseUrl(baseUrl);
  return {
    boardHome: normalizedBase,
    companyBoard: companyId ? `${normalizedBase}/companies/${companyId}` : null,
    companyApi: companyId ? `${normalizedBase}/api/companies/${companyId}` : null,
    agentsApi: companyId ? `${normalizedBase}/api/companies/${companyId}/agents` : null,
    agentBoard: companyId && agentId ? `${normalizedBase}/companies/${companyId}/agents/${agentId}` : null,
    agentApi: agentId ? `${normalizedBase}/api/agents/${agentId}${companyId ? `?companyId=${companyId}` : ""}` : null,
  };
}

function mapRoleToPaperclip(role?: string | null) {
  const normalized = String(role || "").toUpperCase();
  if (normalized === "SUPER_ADMIN") return "ceo";
  if (normalized === "ORG_ADMIN" || normalized === "AGENCY_ADMIN") return "manager";
  return "general";
}

function mapAgentToPaperclipAdapter(agentKey: string, allowedAdapters: string[]) {
  if (allowedAdapters.includes("codex_local")) {
    return {
      adapterType: "codex_local",
      adapterConfig: {
        model: "gpt-5-codex",
        cwd: process.cwd(),
      },
    };
  }

  const selected = allowedAdapters[0] || "http";
  return {
    adapterType: selected,
    adapterConfig: selected === "http"
      ? { endpoint: "https://nexus360.local/paperclip/bridge" }
      : {},
  };
}

async function getOrganizationWithPaperclip(prisma: PrismaClient, organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      businessDescription: true,
      settings: true,
      _count: { select: { users: true, projects: true, automations: true } },
    },
  });

  if (!organization) {
    throw new Error("Organizacao nao encontrada.");
  }

  return {
    ...organization,
    paperclip: getPaperclipSettings(organization.settings),
  };
}

function ensurePaperclipConfigured(settings: PaperclipSettings) {
  if (!settings.baseUrl) {
    throw new Error("Base URL do Paperclip nao configurada.");
  }
  if (!settings.apiToken) {
    throw new Error("API token do Paperclip nao configurado.");
  }
}

function createClientFromSettings(settings: PaperclipSettings) {
  ensurePaperclipConfigured(settings);
  return createPaperclipClient({
    baseUrl: settings.baseUrl!,
    apiToken: settings.apiToken!,
  });
}

function normalizeRemoteAgent(agent: any, settings: PaperclipSettings) {
  const links = buildPaperclipLinks(settings.baseUrl, settings.remoteCompanyId, agent?.id || null);
  return {
    id: agent?.id || null,
    name: agent?.name || agent?.title || "Agente remoto",
    role: agent?.role || null,
    title: agent?.title || null,
    status: agent?.status || null,
    adapterType: agent?.adapterType || null,
    budgetMonthlyCents: parseNumber(agent?.budgetMonthlyCents, 0),
    reportsTo: agent?.reportsTo || null,
    runtimeConfig: isObject(agent?.runtimeConfig) ? agent.runtimeConfig : null,
    raw: agent,
    links,
  };
}

async function testConnection(baseUrl: string, apiToken: string) {
  const client = createPaperclipClient({ baseUrl, apiToken });
  return client.health();
}

async function provisionRemoteCompany(prisma: PrismaClient, organizationId: string, actorId: string) {
  const organization = await getOrganizationWithPaperclip(prisma, organizationId);
  ensurePaperclipConfigured(organization.paperclip);

  const client = createClientFromSettings(organization.paperclip);
  const description = organization.businessDescription || `Workspace sincronizado do Nexus360 para ${organization.name}.`;
  let remoteCompany: any = null;

  if (organization.paperclip.remoteCompanyId) {
    try {
      remoteCompany = await client.updateCompany(organization.paperclip.remoteCompanyId, {
        name: organization.name,
        description,
        status: "active",
      });
    } catch (error) {
      if (!(error instanceof PaperclipApiError) || error.status !== 404) {
        throw error;
      }
    }
  }

  if (!remoteCompany) {
    remoteCompany = await client.createCompany({
      name: organization.name,
      description,
      budgetMonthlyCents: 0,
    });
  }

  const current = getPaperclipSettings(organization.settings);
  const next: PaperclipSettings = {
    ...current,
    remoteCompanyId: remoteCompany?.id ? String(remoteCompany.id) : current.remoteCompanyId,
    remoteCompanyName: remoteCompany?.name ? String(remoteCompany.name) : organization.name,
    remoteCompanyStatus: remoteCompany?.status ? String(remoteCompany.status) : current.remoteCompanyStatus,
    lastConnectionAt: new Date().toISOString(),
    lastConnectionStatus: "connected",
    lastConnectionError: null,
    lastSyncAt: new Date().toISOString(),
    lastSyncError: null,
    grantedById: actorId,
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: mergePaperclipSettings(organization.settings, next) },
  });

  return {
    company: remoteCompany,
    settings: serializePaperclipSettings(next),
  };
}

async function syncAgentsToPaperclip(prisma: PrismaClient, organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      settings: true,
      users: {
        select: { id: true, name: true, email: true, role: true, status: true },
        orderBy: { createdAt: "asc" },
      },
      aiAgents: {
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          status: true,
          temperature: true,
          maxTokens: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!organization) {
    throw new Error("Organizacao nao encontrada.");
  }

  const settings = getPaperclipSettings(organization.settings);
  ensurePaperclipConfigured(settings);
  if (!settings.remoteCompanyId) {
    throw new Error("A empresa remota ainda nao foi provisionada.");
  }

  const client = createClientFromSettings(settings);
  const remoteAgents = await client.listAgents(settings.remoteCompanyId);
  const remoteAgentList = Array.isArray(remoteAgents)
    ? remoteAgents
    : Array.isArray((remoteAgents as any)?.agents)
      ? (remoteAgents as any).agents
      : [];
  const remoteByName = new Map(remoteAgentList.map((agent: any) => [String(agent?.name || "").toLowerCase(), agent]));
  const created: any[] = [];

  for (const localAgent of organization.aiAgents) {
    const localName = String(localAgent.name || "").trim();
    if (!localName || remoteByName.has(localName.toLowerCase())) continue;

    const adapter = mapAgentToPaperclipAdapter(localAgent.key, settings.allowedAdapters);
    const createdAgent = await client.createAgent(settings.remoteCompanyId, {
      name: localAgent.name,
      role: "general",
      title: localAgent.name,
      reportsTo: null,
      capabilities: localAgent.description || `Agente sincronizado do Nexus360 (${localAgent.key}).`,
      adapterType: adapter.adapterType,
      adapterConfig: adapter.adapterConfig,
      runtimeConfig: {
        heartbeat: {
          enabled: false,
        },
      },
      desiredSkills: ["nexus360", localAgent.key],
      metadata: {
        source: "nexus360",
        localAgentId: localAgent.id,
        localAgentKey: localAgent.key,
        organizationId: organization.id,
      },
    });
    created.push(createdAgent);
  }

  const userBackedRemoteAgents = organization.users
    .filter((user) => user.status !== "INACTIVE")
    .slice(0, 3);

  for (const user of userBackedRemoteAgents) {
    const name = String(user.name || user.email).trim();
    if (!name || remoteByName.has(name.toLowerCase())) continue;
    const adapter = mapAgentToPaperclipAdapter(user.email, settings.allowedAdapters);
    const createdAgent = await client.createAgent(settings.remoteCompanyId, {
      name,
      role: mapRoleToPaperclip(user.role),
      title: user.role === "SUPER_ADMIN" ? "Executive Sponsor" : "Nexus Operator",
      reportsTo: null,
      capabilities: `Usuario sincronizado do Nexus360 (${user.email}).`,
      adapterType: adapter.adapterType,
      adapterConfig: adapter.adapterConfig,
      runtimeConfig: {
        heartbeat: {
          enabled: false,
        },
      },
      desiredSkills: ["nexus360", "operations"],
      metadata: {
        source: "nexus360-user",
        localUserId: user.id,
        email: user.email,
        organizationId: organization.id,
      },
    });
    created.push(createdAgent);
  }

  const current = getPaperclipSettings(organization.settings);
  const next: PaperclipSettings = {
    ...current,
    lastConnectionAt: new Date().toISOString(),
    lastConnectionStatus: "connected",
    lastConnectionError: null,
    lastAgentSyncAt: new Date().toISOString(),
    lastAgentSyncCount: created.length,
    lastSyncError: null,
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: mergePaperclipSettings(organization.settings, next) },
  });

  const refreshedRemoteAgents = await client.listAgents(settings.remoteCompanyId);
  const remoteList = Array.isArray(refreshedRemoteAgents)
    ? refreshedRemoteAgents
    : Array.isArray((refreshedRemoteAgents as any)?.agents)
      ? (refreshedRemoteAgents as any).agents
      : [];

  return {
    createdCount: created.length,
    agents: remoteList.map((agent: any) => normalizeRemoteAgent(agent, next)),
    settings: serializePaperclipSettings(next),
  };
}

export function paperclipRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/catalog", async (_req: AuthRequest, res) => {
    res.json({
      capabilities: PAPERCLIP_CAPABILITIES,
      adapters: PAPERCLIP_ADAPTERS,
      rolloutChecklist: PAPERCLIP_ROLLOUT,
      sources: [
        { label: "GitHub README", url: "https://github.com/paperclipai/paperclip" },
        { label: "Quickstart", url: "https://docs.paperclip.ing/guides/getting-started/five-minute-path/" },
        { label: "Agents", url: "https://docs.paperclip.ing/reference/api/agents/" },
        { label: "Companies", url: "https://docs.paperclip.ing/reference/api/companies/" },
        { label: "API Overview", url: "https://docs.paperclip.ing/reference/api/overview/" },
      ],
    });
  });

  router.get("/access", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const role = req.user?.role;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    const config = getPaperclipSettings(organization?.settings);

    res.json({
      enabled: role === "SUPER_ADMIN" ? true : config.enabled,
      isSuperAdmin: role === "SUPER_ADMIN",
      config: serializePaperclipSettings(config),
    });
  });

  router.get("/overview", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const organization = await getOrganizationWithPaperclip(prisma, orgId);
    const config = organization.paperclip;
    const enabledCapabilitySet = new Set(config.enabledCapabilities);
    const enabledAdapterSet = new Set(config.allowedAdapters);

    res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        users: organization._count.users,
        projects: organization._count.projects,
        automations: organization._count.automations,
      },
      release: serializePaperclipSettings(config),
      readiness: {
        governanceReady: config.enabledCapabilities.includes("approvals_governance") && config.enabledCapabilities.includes("budgets"),
        workspaceReady: config.enabledCapabilities.includes("execution_workspaces"),
        adaptersConfigured: config.allowedAdapters.length,
        capabilitiesEnabled: config.enabledCapabilities.length,
        connected: config.lastConnectionStatus === "connected",
        remoteProvisioned: Boolean(config.remoteCompanyId),
      },
      enabledCapabilities: PAPERCLIP_CAPABILITIES.filter((capability) => enabledCapabilitySet.has(capability.key)),
      enabledAdapters: PAPERCLIP_ADAPTERS.filter((adapter) => enabledAdapterSet.has(adapter.key)),
      remote: {
        hasCredentials: Boolean(config.baseUrl && config.apiToken),
        companyId: config.remoteCompanyId,
        companyName: config.remoteCompanyName,
        companyStatus: config.remoteCompanyStatus,
        links: buildPaperclipLinks(config.baseUrl, config.remoteCompanyId),
      },
    });
  });

  router.get("/remote/company", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const organization = await getOrganizationWithPaperclip(prisma, orgId);
    const config = organization.paperclip;
    if (!config.enabled && req.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Paperclip nao liberado para esta conta." });
    }

    try {
      const client = createClientFromSettings(config);
      const health = await client.health();
      const company = config.remoteCompanyId ? await client.getCompany(config.remoteCompanyId) : null;

      res.json({
        health,
        company,
        links: buildPaperclipLinks(config.baseUrl, config.remoteCompanyId),
      });
    } catch (error: any) {
      res.status(502).json({
        error: "Falha ao consultar a instancia Paperclip.",
        details: error?.message || String(error),
      });
    }
  });

  router.get("/remote/agents", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const organization = await getOrganizationWithPaperclip(prisma, orgId);
    const config = organization.paperclip;
    if (!config.enabled && req.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Paperclip nao liberado para esta conta." });
    }
    if (!config.remoteCompanyId) {
      return res.json({ agents: [] });
    }

    try {
      const client = createClientFromSettings(config);
      const remoteAgents = await client.listAgents(config.remoteCompanyId);
      const items = Array.isArray(remoteAgents)
        ? remoteAgents
        : Array.isArray((remoteAgents as any)?.agents)
          ? (remoteAgents as any).agents
          : [];

      res.json({
        agents: items.map((agent: any) => normalizeRemoteAgent(agent, config)),
      });
    } catch (error: any) {
      res.status(502).json({
        error: "Falha ao carregar os agentes remotos do Paperclip.",
        details: error?.message || String(error),
      });
    }
  });

  router.get("/admin/access", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Apenas SUPER_ADMIN." });
    }

    const organizations = await prisma.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        subscriptionStatus: true,
        settings: true,
        users: {
          select: { id: true, name: true, email: true, role: true, status: true },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { aiAgents: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({
      organizations: organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        subscriptionStatus: organization.subscriptionStatus,
        users: organization.users,
        aiAgentsCount: organization._count.aiAgents,
        paperclip: serializePaperclipSettings(getPaperclipSettings(organization.settings)),
      })),
      catalog: {
        capabilities: PAPERCLIP_CAPABILITIES,
        adapters: PAPERCLIP_ADAPTERS,
        rolloutChecklist: PAPERCLIP_ROLLOUT,
      },
    });
  });

  router.post("/admin/access", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Apenas SUPER_ADMIN." });
    }

    const {
      organizationId,
      enabled,
      deploymentMode,
      baseUrl,
      apiToken,
      notes,
      allowedAdapters,
      enabledCapabilities,
    } = req.body || {};

    if (!organizationId) {
      return res.status(400).json({ error: "organizationId e obrigatorio." });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: String(organizationId) },
      select: { id: true, settings: true },
    });

    if (!organization) {
      return res.status(404).json({ error: "Organizacao nao encontrada." });
    }

    const current = getPaperclipSettings(organization.settings);
    const normalizedBaseUrl = typeof baseUrl === "string" && baseUrl.trim()
      ? normalizePaperclipBaseUrl(baseUrl)
      : null;
    const nextApiToken = typeof apiToken === "string"
      ? (apiToken.trim() ? apiToken.trim() : null)
      : current.apiToken;
    const next: PaperclipSettings = {
      ...current,
      enabled: Boolean(enabled),
      deploymentMode: deploymentMode === "desktop" || deploymentMode === "hybrid" ? deploymentMode : "self_hosted",
      baseUrl: normalizedBaseUrl,
      apiToken: nextApiToken,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      allowedAdapters: normalizeStringArray(
        allowedAdapters,
        PAPERCLIP_ADAPTERS.map((adapter) => adapter.key),
      ),
      enabledCapabilities: normalizeStringArray(
        enabledCapabilities,
        PAPERCLIP_CAPABILITIES.map((capability) => capability.key),
      ),
      grantedAt: enabled ? new Date().toISOString() : current.grantedAt,
      grantedById: req.user.id,
      ...(normalizedBaseUrl !== current.baseUrl || nextApiToken !== current.apiToken
        ? {
            lastConnectionStatus: "never" as const,
            lastConnectionAt: null,
            lastConnectionError: null,
          }
        : {}),
    };

    const updated = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        settings: mergePaperclipSettings(organization.settings, next),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
      },
    });

    res.json({
      success: true,
      organization: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        paperclip: serializePaperclipSettings(getPaperclipSettings(updated.settings)),
      },
    });
  });

  router.post("/admin/instance/test", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Apenas SUPER_ADMIN." });
    }

    const { organizationId, baseUrl, apiToken } = req.body || {};
    let effectiveBaseUrl = typeof baseUrl === "string" ? normalizePaperclipBaseUrl(baseUrl) : "";
    let effectiveApiToken = typeof apiToken === "string" ? apiToken.trim() : "";

    if (organizationId && (!effectiveBaseUrl || !effectiveApiToken)) {
      const organization = await prisma.organization.findUnique({
        where: { id: String(organizationId) },
        select: { settings: true },
      });
      const settings = getPaperclipSettings(organization?.settings);
      effectiveBaseUrl = effectiveBaseUrl || settings.baseUrl || "";
      effectiveApiToken = effectiveApiToken || settings.apiToken || "";
    }

    if (!effectiveBaseUrl || !effectiveApiToken) {
      return res.status(400).json({ error: "Base URL e apiToken sao obrigatorios para o teste." });
    }

    try {
      const health = await testConnection(effectiveBaseUrl, effectiveApiToken);

      if (organizationId) {
        const organization = await prisma.organization.findUnique({
          where: { id: String(organizationId) },
          select: { settings: true },
        });
        if (organization) {
          const current = getPaperclipSettings(organization.settings);
          const next: PaperclipSettings = {
            ...current,
            baseUrl: effectiveBaseUrl,
            apiToken: effectiveApiToken,
            lastConnectionAt: new Date().toISOString(),
            lastConnectionStatus: "connected",
            lastConnectionError: null,
          };
          await prisma.organization.update({
            where: { id: String(organizationId) },
            data: { settings: mergePaperclipSettings(organization.settings, next) },
          });
        }
      }

      res.json({
        success: true,
        health,
      });
    } catch (error: any) {
      if (organizationId) {
        const organization = await prisma.organization.findUnique({
          where: { id: String(organizationId) },
          select: { settings: true },
        });
        if (organization) {
          const current = getPaperclipSettings(organization.settings);
          const next: PaperclipSettings = {
            ...current,
            baseUrl: effectiveBaseUrl || current.baseUrl,
            apiToken: effectiveApiToken || current.apiToken,
            lastConnectionAt: new Date().toISOString(),
            lastConnectionStatus: "error",
            lastConnectionError: error?.message || String(error),
          };
          await prisma.organization.update({
            where: { id: String(organizationId) },
            data: { settings: mergePaperclipSettings(organization.settings, next) },
          });
        }
      }

      res.status(502).json({
        error: "Falha ao conectar com a instancia Paperclip.",
        details: error?.message || String(error),
      });
    }
  });

  router.post("/admin/company/sync", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Apenas SUPER_ADMIN." });
    }

    const organizationId = String(req.body?.organizationId || req.user.orgId || "");
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId e obrigatorio." });
    }

    try {
      const result = await provisionRemoteCompany(prisma, organizationId, req.user.id);
      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      });
      if (organization) {
        const current = getPaperclipSettings(organization.settings);
        const next: PaperclipSettings = {
          ...current,
          lastSyncAt: new Date().toISOString(),
          lastSyncError: error?.message || String(error),
          lastConnectionStatus: "error",
          lastConnectionAt: new Date().toISOString(),
          lastConnectionError: error?.message || String(error),
        };
        await prisma.organization.update({
          where: { id: organizationId },
          data: { settings: mergePaperclipSettings(organization.settings, next) },
        });
      }

      res.status(502).json({
        error: "Falha ao provisionar/sincronizar a empresa no Paperclip.",
        details: error?.message || String(error),
      });
    }
  });

  router.post("/admin/agents/sync", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Apenas SUPER_ADMIN." });
    }

    const organizationId = String(req.body?.organizationId || req.user.orgId || "");
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId e obrigatorio." });
    }

    try {
      const result = await syncAgentsToPaperclip(prisma, organizationId);
      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      });
      if (organization) {
        const current = getPaperclipSettings(organization.settings);
        const next: PaperclipSettings = {
          ...current,
          lastSyncError: error?.message || String(error),
          lastConnectionStatus: "error",
          lastConnectionAt: new Date().toISOString(),
          lastConnectionError: error?.message || String(error),
        };
        await prisma.organization.update({
          where: { id: organizationId },
          data: { settings: mergePaperclipSettings(organization.settings, next) },
        });
      }

      res.status(502).json({
        error: "Falha ao sincronizar agentes com o Paperclip.",
        details: error?.message || String(error),
      });
    }
  });

  router.post("/admin/agents/:agentId/wakeup", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Apenas SUPER_ADMIN." });
    }

    const organizationId = String(req.body?.organizationId || req.user.orgId || "");
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId e obrigatorio." });
    }

    const organization = await getOrganizationWithPaperclip(prisma, organizationId);
    try {
      const client = createClientFromSettings(organization.paperclip);
      const result = await client.wakeupAgent(req.params.agentId, {
        source: "on_demand",
        triggerDetail: "manual",
        reason: String(req.body?.reason || "Manual wakeup from Nexus360"),
        payload: isObject(req.body?.payload) ? req.body.payload : {},
        forceFreshSession: Boolean(req.body?.forceFreshSession),
        idempotencyKey: `nexus360-${organization.id}-${req.params.agentId}-${Date.now()}`,
      });
      res.status(202).json({ success: true, result });
    } catch (error: any) {
      res.status(502).json({
        error: "Falha ao disparar wakeup no agente remoto.",
        details: error?.message || String(error),
      });
    }
  });

  return router;
}

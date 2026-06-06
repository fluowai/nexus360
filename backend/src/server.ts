import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { prisma } from "./lib/prisma.js";
import { authenticateToken } from "./middleware/auth.js";
import { resolveTenant } from "./middleware/tenant.js";
import { sanitizeStoredHtml } from "./utils/security.js";
import { findTenantDomainStatus, findVerifiedTenantDomain, normalizeRequestHost } from "./utils/tenantHost.js";
import { MissionScheduler } from "./services/prospect/MissionScheduler.js";
import { emitAutomationEvent } from "./workers/automationWorker.js";

// Import Rotas
import { authRoutes } from "./routes/auth.js";
import { orgSettingsRoutes } from "./routes/orgSettings.js";
import { crmRoutes } from "./routes/crm.js";
import { marketingRoutes } from "./routes/marketing.js";
import { financeRoutes } from "./routes/finance.js";
import { opsRoutes } from "./routes/ops.js";
import { adminRoutes } from "./routes/admin.js";
import { adminPlansRoutes } from "./routes/admin/plans.js";
import { adsRoutes } from "./routes/ads.js";
import { clientRoutes } from "./routes/clients.js";
import { aiRoutes } from "./routes/ai.js";
import { calendarRoutes } from "./routes/calendar.js";
import { leadCaptureRoutes } from "./routes/leadCapture.js";
import { prospectingFunnelRoutes } from "./routes/prospectingFunnels.js";
import { taskRoutes } from "./routes/tasks.js";
import { creativeRoutes } from "./routes/creatives.js";
import { domainRoutes } from "./routes/domains.js";
import { projectRoutes } from "./routes/projects.js";
import { promptRoutes } from "./routes/prompts.js";
import { salesRoutes } from "./routes/sales.js";
import { systemRoutes } from "./routes/system.js";
import { livekitRoutes } from "./routes/livekit.js";
import { extraRoutes } from "./routes/extras.js";
import { teamRoutes } from "./routes/team.js";
import { accessProfileRoutes } from "./routes/accessProfiles.js";
import { clientPortalRoutes } from "./routes/clientPortal.js";
import { automationRoutes } from "./routes/automation.js";
import { notificationRoutes } from "./routes/notifications.js";
import { deliveryRoutes } from "./routes/delivery.js";
import { acpRoutes } from "./routes/acp.js";
import { agentQueueRoutes } from "./routes/agentQueue.js";
import { serviceCatalogRoutes } from "./routes/serviceCatalog.js";
import { timeTrackingRoutes } from "./routes/timeTracking.js";
import { healthScoreRoutes } from "./routes/healthScore.js";
import { knowledgeBaseRoutes } from "./routes/knowledgeBase.js";
import { billingRoutes } from "./routes/billing.js";
import { snapshotRoutes } from "./routes/snapshots.js";
import { usageRoutes } from "./routes/usage.js";
import { proposalRoutes } from "./routes/proposals.js";
import { privacyRoutes } from "./routes/privacy.js";
import { prospectRoutes } from "./routes/prospect.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { omnichannelRoutes } from "./routes/omnichannel.js";
import { whatsappRoutes, whatsappInternalRoutes } from "./routes/whatsapp.js";

const app = express();

// Necessário para Railway/Heroku/Vercel — eles ficam atrás de um reverse proxy
app.set('trust proxy', 1);

const configuredOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://nexus360.consultio.com.br'
]);

async function isRegisteredTenantHost(hostname: string) {
  return Boolean(await findVerifiedTenantDomain(prisma, hostname));
}

async function enforceTenantDomain(req: any, res: any, next: any) {
  try {
    const tenantDomain = await findVerifiedTenantDomain(
      prisma,
      req.headers["x-forwarded-host"] || req.headers.host
    );

    if (!tenantDomain) return next();
    if (req.user?.role === "SUPER_ADMIN") return next();
    if (req.user?.orgId === tenantDomain.organization.id) return next();

    return res.status(403).json({
      error: "DOMAIN_ORG_MISMATCH",
      message: "Este dominio pertence a outra organizacao.",
    });
  } catch (error) {
    next(error);
  }
}

const corsOptions: cors.CorsOptions = {
  origin: async (origin, callback) => {
    if (!origin) return callback(null, true);

    try {
      const { hostname } = new URL(origin);
      const normalizedHost = normalizeRequestHost(hostname);
      const isAllowed =
        allowedOrigins.has(origin) ||
        normalizedHost === 'localhost' ||
        await isRegisteredTenantHost(normalizedHost);

      return callback(null, isAllowed);
    } catch {
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Org-Id', 'X-Workspace-Id']
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições, tente novamente mais tarde.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login, tente novamente mais tarde.' }
});

// Middlewares Globais de Segurança e Utilidade
app.use(globalLimiter);
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      mediaSrc: ["'self'", "blob:", "data:"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ==================== ROTAS PÚBLICAS ====================

app.get("/api/health", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'Backend Nexus360 Online' });
  } catch (error) {
    next(error);
  }
});

app.get("/api/ping", (req, res) => res.json({ message: "pong", timestamp: new Date().toISOString() }));

app.get("/api/domain/context", async (req, res, next) => {
  try {
    const host = normalizeRequestHost(req.headers["x-forwarded-host"] as string || req.headers.host);
    if (!host) return res.json({ customDomain: false });

    const tenantDomain = await findVerifiedTenantDomain(prisma, host);

    if (tenantDomain) {
      return res.json({
        customDomain: true,
        domain: tenantDomain.domain,
        status: tenantDomain.status,
        organization: tenantDomain.organization,
      });
    }

    const domainStatus = await findTenantDomainStatus(prisma, host);

    res.json({
      customDomain: false,
      domain: domainStatus?.name || null,
      status: domainStatus?.status || null,
      organization: null,
    });
  } catch (error) {
    next(error);
  }
});

// Rota PÚBLICA para Landing Pages
app.get("/lp/:slug", async (req, res, next) => {
  try {
    const page = await prisma.landingPage.findUnique({ where: { slug: req.params.slug } });
    if (!page || !page.content) return res.status(404).send("<h1>Página não encontrada</h1>");
    await prisma.landingPage.update({ where: { id: page.id }, data: { views: { increment: 1 } } });
    res.setHeader('Content-Security-Policy', "default-src 'self' https: data:; script-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src https: data:; connect-src 'none'");
    res.setHeader('Content-Type', 'text/html; charset=utf-8').send(sanitizeStoredHtml(page.content));
  } catch (error) {
    next(error);
  }
});

// Propostas Públicas
app.get("/api/public/proposals/:slug", async (req, res, next) => {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { slug: req.params.slug },
      include: { 
        organization: { select: { name: true } },
        client: { select: { corporateName: true, tradeName: true } }
      }
    });
    if (!proposal) return res.status(404).json({ error: "Proposta não encontrada" });
    res.json(proposal);
  } catch (error) {
    next(error);
  }
});

app.post("/api/public/proposals/:slug/accept", async (req, res, next) => {
  const { cnpj, corporateName, phone, email } = req.body;
  try {
    const proposal = await prisma.proposal.findUnique({ where: { slug: req.params.slug } });
    if (!proposal) return res.status(404).json({ error: "Proposta não encontrada" });

    await prisma.proposal.update({ where: { id: proposal.id }, data: { status: 'accepted' } });
    emitAutomationEvent("proposal.accepted", { organizationId: proposal.organizationId, proposalId: proposal.id });

    if (proposal.leadId) {
      await prisma.$transaction(async (tx) => {
        await tx.lead.update({ where: { id: proposal.leadId! }, data: { status: 'fechado' } });
        await tx.client.create({
          data: {
            corporateName: corporateName || "Cliente via Proposta",
            cnpj, email: email || "", phone: phone || "",
            organizationId: proposal.organizationId, status: 'onboarding'
          }
        });
      });
    }
    res.json({ success: true, message: "Proposta aceita com sucesso!" });
  } catch (error) {
    next(error);
  }
});

// ==================== ROTAS DE AUTH (Público + Refresh) ====================
app.use("/api/auth", authLimiter, authRoutes(prisma));

// ==================== ROTAS PROTEGIDAS (Tenant Isolated) ====================
const protectedRoutes = [
  { path: "/api/admin", router: adminRoutes },
  { path: "/api/org", router: orgSettingsRoutes },
  { path: "/api/clients", router: clientRoutes },
  { path: "/api/ai", router: aiRoutes },
  { path: "/api/crm", router: crmRoutes },
  { path: "/api/marketing", router: marketingRoutes },
  { path: "/api/finance", router: financeRoutes },
  { path: "/api/ops", router: opsRoutes },
  { path: "/api/ads", router: adsRoutes },
  { path: "/api/calendar", router: calendarRoutes },
  { path: "/api/lead-capture", router: leadCaptureRoutes },
  { path: "/api/prospecting-funnels", router: prospectingFunnelRoutes },
  { path: "/api/tasks", router: taskRoutes },
  { path: "/api/creatives", router: creativeRoutes },
  { path: "/api/domains", router: domainRoutes },
  { path: "/api/projects", router: projectRoutes },
  { path: "/api/prompts", router: promptRoutes },
  { path: "/api/sales", router: salesRoutes },
  { path: "/api/system", router: systemRoutes },
  { path: "/api/extras", router: extraRoutes },
  { path: "/api/team", router: teamRoutes },
  { path: "/api/access-profiles", router: accessProfileRoutes },
  { path: "/api/automation", router: automationRoutes },
  { path: "/api/notifications", router: notificationRoutes },
  { path: "/api/delivery", router: deliveryRoutes },
  { path: "/api/service-catalog", router: serviceCatalogRoutes },
  { path: "/api/time-tracking", router: timeTrackingRoutes },
  { path: "/api/health-score", router: healthScoreRoutes },
  { path: "/api/knowledge-base", router: knowledgeBaseRoutes },
  { path: "/api/snapshots", router: snapshotRoutes },
  { path: "/api/usage", router: usageRoutes },
  { path: "/api/proposals", router: proposalRoutes },
  { path: "/api/privacy", router: privacyRoutes },
  { path: "/api/nexus-prospect", router: prospectRoutes },
  { path: "/api/onboarding", router: onboardingRoutes },
  { path: "/api/omnichannel", router: omnichannelRoutes },
  { path: "/api/whatsapp", router: whatsappRoutes },
  { path: "/api/acp", router: acpRoutes },
  { path: "/api/agent-queue", router: agentQueueRoutes },
];

// Rotas Administrativas de Planos
app.use("/api/admin/plans", authenticateToken, adminPlansRoutes(prisma));

protectedRoutes.forEach(route => {
  app.use(route.path, authenticateToken, enforceTenantDomain, resolveTenant, route.router(prisma));
});

// Rotas Externas / Portais
app.use("/api/billing", billingRoutes(prisma));
app.use("/api/livekit", livekitRoutes(prisma));
app.use("/api/client-portal", clientPortalRoutes(prisma));
app.use("/api/internal/whatsapp", whatsappInternalRoutes(prisma));

// ==================== DASHBOARD E FALLBACKS ====================

async function safeDashboardValue<T>(label: string, fallback: T, loader: () => Promise<T>): Promise<T> {
  try {
    return await loader();
  } catch (error: any) {
    console.error(`[DASHBOARD_METRIC_ERROR] ${label}:`, error?.message || error);
    return fallback;
  }
}

app.get("/api/dashboard", authenticateToken, enforceTenantDomain, resolveTenant, async (req: any, res, next) => {
  try {
    const orgId = req.user.orgId;
    const [leads, clients, proposals, invoices, contentCount, org, user, agency] = await Promise.all([
      safeDashboardValue("leads", 0, () => prisma.lead.count({ where: { organizationId: orgId } })),
      safeDashboardValue("clients", 0, () => prisma.client.count({ where: { organizationId: orgId } })),
      safeDashboardValue("proposals", 0, () => prisma.proposal.count({ where: { organizationId: orgId } })),
      safeDashboardValue("invoices", { _sum: { total: 0 } }, () => prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'paga' }, _sum: { total: true } })),
      safeDashboardValue("creatives", 0, () => prisma.creative.count({ where: { organizationId: orgId } })),
      safeDashboardValue("organization", null, () => orgId ? prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, plan: true, planObj: true } }) : Promise.resolve(null)),
      safeDashboardValue("user", null, () => prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } })),
      safeDashboardValue("agency", null, () => req.user.agencyId ? prisma.agency.findUnique({ where: { id: req.user.agencyId }, select: { name: true } }) : Promise.resolve(null)),
    ]);

    const conversions = leads > 0 ? Number(((clients / leads) * 100).toFixed(1)) : 0;
    const legacyPlan = !org?.planObj && org?.plan
      ? await safeDashboardValue("legacy plan", null, () => prisma.plan.findFirst({ where: { name: org.plan } }))
      : null;
    const sourcePlan = org?.planObj || legacyPlan || { name: 'Free', maxLeads: 100 };
    const plan = {
      ...sourcePlan,
      maxLeads: (sourcePlan as any).maxLeads ?? (sourcePlan as any).leadsLimit ?? 100,
      leadsLimit: (sourcePlan as any).maxLeads ?? (sourcePlan as any).leadsLimit ?? 100,
    };

    res.json({
      orgName: org?.name || agency?.name || "Minha Agência",
      userName: user?.name || "Usuário",
      plan,
      usage: { leads },
      metrics: { leads, clients, proposals, conversions, revenue: invoices._sum.total || 0, contentCount },
      chartData: [] 
    });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.originalUrl });
});

// Global Error Handler
import { errorHandler } from "./middleware/errorHandler.js";
app.use(errorHandler);

const PORT = process.env.PORT || 10000;

// Inicialização dos Serviços em Background (Agentes)
const missionScheduler = new MissionScheduler(prisma);
missionScheduler.start();

// Workers de Automação e Follow-up
import { AutomationWorker } from "./workers/automationWorker.js";
import { FollowUpWorker } from "./workers/followUpWorker.js";
const automationWorker = new AutomationWorker(prisma);
automationWorker.start();
const followUpWorker = new FollowUpWorker(prisma);
followUpWorker.start();

// Socket.io para eventos em tempo real
import { createServer } from "http";
import { initSocketManager } from "./services/socketManager.js";
const httpServer = createServer(app);
initSocketManager(httpServer);

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Nexus360 Core rodando na porta ${PORT}`);
  console.log(`👉 API: http://localhost:${PORT}/api`);
});

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
import { serviceCatalogRoutes } from "./routes/serviceCatalog.js";
import { timeTrackingRoutes } from "./routes/timeTracking.js";
import { healthScoreRoutes } from "./routes/healthScore.js";
import { knowledgeBaseRoutes } from "./routes/knowledgeBase.js";
import { billingRoutes } from "./routes/billing.js";
import { snapshotRoutes } from "./routes/snapshots.js";
import { usageRoutes } from "./routes/usage.js";
import { proposalRoutes } from "./routes/proposals.js";
import { privacyRoutes } from "./routes/privacy.js";

const app = express();

// Necessário para Railway/Heroku/Vercel — eles ficam atrás de um reverse proxy
app.set('trust proxy', 1);

const configuredOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,
  'https://nexus360-zeta.vercel.app',
  'https://nexus.woopanel.com.br',
  'http://localhost:5173',
  'http://localhost:3000'
]);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    try {
      const { hostname } = new URL(origin);
      const isAllowed =
        allowedOrigins.has(origin) ||
        hostname.endsWith('.woopanel.com.br') ||
        hostname.endsWith('.vercel.app') ||
        hostname === 'localhost';

      return callback(null, isAllowed);
    } catch {
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Org-Id']
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

// Middlewares Globais de Segurança e Utilidade
app.use(limiter);
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

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'Backend Nexus360 Online' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Database disconnected' });
  }
});

app.get("/api/ping", (req, res) => res.json({ message: "pong", timestamp: new Date().toISOString() }));

// Rota PÚBLICA para Landing Pages
app.get("/lp/:slug", async (req, res) => {
  try {
    const page = await prisma.landingPage.findUnique({ where: { slug: req.params.slug } });
    if (!page || !page.content) return res.status(404).send("<h1>Página não encontrada</h1>");
    await prisma.landingPage.update({ where: { id: page.id }, data: { views: { increment: 1 } } });
    res.setHeader('Content-Security-Policy', "default-src 'self' https: data:; script-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src https: data:; connect-src 'none'");
    res.setHeader('Content-Type', 'text/html; charset=utf-8').send(sanitizeStoredHtml(page.content));
  } catch (error) {
    res.status(500).send("<h1>Erro interno</h1>");
  }
});

// Propostas Públicas
app.get("/api/public/proposals/:slug", async (req, res) => {
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
    res.status(500).json({ error: "Erro ao buscar proposta" });
  }
});

app.post("/api/public/proposals/:slug/accept", async (req, res) => {
  const { cnpj, corporateName, phone, email } = req.body;
  try {
    const proposal = await prisma.proposal.findUnique({ where: { slug: req.params.slug } });
    if (!proposal) return res.status(404).json({ error: "Proposta não encontrada" });

    await prisma.proposal.update({ where: { id: proposal.id }, data: { status: 'accepted' } });

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
    res.status(500).json({ error: "Erro ao aceitar proposta" });
  }
});

// ==================== ROTAS DE AUTH (Público + Refresh) ====================
app.use("/api/auth", authRoutes(prisma));

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
];

protectedRoutes.forEach(route => {
  app.use(route.path, authenticateToken, resolveTenant, route.router(prisma));
});

// Rotas Administrativas de Planos
app.use("/api/admin/plans", authenticateToken, adminPlansRoutes(prisma));

// Rotas Externas / Portais
app.use("/api/billing", billingRoutes(prisma));
app.use("/api/livekit", livekitRoutes(prisma));
app.use("/api/client-portal", clientPortalRoutes(prisma));

// ==================== DASHBOARD E FALLBACKS ====================

app.get("/api/dashboard", authenticateToken, resolveTenant, async (req: any, res) => {
  try {
    const orgId = req.user.orgId;
    const [leads, clients, proposals, invoices, contentCount, org, user, agency] = await Promise.all([
      prisma.lead.count({ where: { organizationId: orgId } }),
      prisma.client.count({ where: { organizationId: orgId } }),
      prisma.proposal.count({ where: { organizationId: orgId } }),
      prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'paga' }, _sum: { total: true } }),
      prisma.creative.count({ where: { organizationId: orgId } }),
      orgId ? prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, planObj: true } }) : Promise.resolve(null),
      prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }),
      req.user.agencyId ? prisma.agency.findUnique({ where: { id: req.user.agencyId }, select: { name: true } }) : Promise.resolve(null),
    ]);

    res.json({
      orgName: org?.name || agency?.name || "Minha Agência",
      userName: user?.name || "Usuário",
      plan: org?.planObj || { name: 'Free' },
      metrics: { leads, clients, proposals, revenue: invoices._sum.total || 0, contentCount },
      chartData: [] 
    });
  } catch (error) {
    res.status(500).json({ error: "Dashboard failure" });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.originalUrl });
});

// Global Error Handler
import { errorHandler } from "./middleware/errorHandler.js";
app.use(errorHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`\n🚀 Nexus360 Core rodando na porta ${PORT}`);
  console.log(`👉 API: http://localhost:${PORT}/api`);
});

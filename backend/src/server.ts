import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { prisma } from "./lib/prisma.js";
import { authenticateToken } from "./middleware/auth.js";
import { resolveTenant } from "./middleware/tenant.js";

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

const app = express();

// Middlewares Globais de Segurança e Utilidade
app.use(limiter);
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://nexus360-zeta.vercel.app',
      'https://nexus.woopanel.com.br',
      'http://localhost:5173'
    ];
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.woopanel.com.br')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(helmet({ contentSecurityPolicy: false }));

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
    res.setHeader('Content-Type', 'text/html; charset=utf-8').send(page.content);
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

    await tx.proposal.update({ where: { id: proposal.id }, data: { status: 'accepted' } });

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
    const [leads, clients, proposals, invoices, contentCount, org] = await Promise.all([
      prisma.lead.count({ where: { organizationId: orgId } }),
      prisma.client.count({ where: { organizationId: orgId } }),
      prisma.proposal.count({ where: { organizationId: orgId } }),
      prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'paga' }, _sum: { total: true } }),
      prisma.creative.count({ where: { organizationId: orgId } }),
      prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, planObj: true } }),
    ]);

    res.json({
      orgName: org?.name || "Minha Agência",
      plan: org?.planObj || { name: 'Free' },
      metrics: { leads, clients, proposals, revenue: invoices._sum.total || 0, contentCount },
      chartData: [] // Mocked for brevity or implement real grouping here
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

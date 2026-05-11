import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { prisma } from "./lib/prisma.js";
import { authenticateToken } from "./middleware/auth.js";

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

const app = express();

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Aumentado para suportar uso intenso
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS
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

app.use(express.json({ limit: '2mb' })); // Limitado para 2mb (Ataques DoS / Billing Exhaustion)
app.use(helmet({ contentSecurityPolicy: false }));

// Health Check
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'Backend Nexus360 Online' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Database disconnected' });
  }
});

app.get("/api/ping", (req, res) => {
  res.json({ message: "pong", timestamp: new Date().toISOString() });
});

// Rota PÚBLICA para servir Landing Pages geradas
app.get("/lp/:slug", async (req, res) => {
  try {
    const page = await prisma.landingPage.findUnique({
      where: { slug: req.params.slug }
    });
    if (!page || !page.content) {
      return res.status(404).send("<h1>Página não encontrada</h1>");
    }
    // Incrementar views
    await prisma.landingPage.update({
      where: { id: page.id },
      data: { views: { increment: 1 } }
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(page.content);
  } catch (error) {
    console.error("[LP_VIEW_ERROR]", error);
    res.status(500).send("<h1>Erro interno</h1>");
  }
});

// Visualização de Proposta Pública
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
    const proposal = await prisma.proposal.findUnique({
      where: { slug: req.params.slug }
    });

    if (!proposal) return res.status(404).json({ error: "Proposta não encontrada" });

    // Atualiza status da proposta
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: 'accepted' }
    });

    // Se tiver um Lead vinculado, faz o fechamento e cria o cliente
    if (proposal.leadId) {
      await prisma.$transaction(async (tx) => {
        await tx.lead.update({ 
          where: { id: proposal.leadId! }, 
          data: { status: 'fechado' } 
        });

        await tx.client.create({
          data: {
            corporateName: corporateName || "Cliente via Proposta",
            cnpj: cnpj, // Corrigido
            email: email || "",
            phone: phone || "",
            organizationId: proposal.organizationId,
            status: 'onboarding'
          }
        });
      });
    }

    res.json({ success: true, message: "Proposta aceita com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao aceitar proposta" });
  }
});

// Endpoint de Diagnóstico de Rotas
app.get("/api/debug/routes", (req, res) => {
  const routes: any[] = [];
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const path = handler.route.path;
          const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
          routes.push(`${methods} ${middleware.regexp.toString()} ${path}`);
        }
      });
    }
  });
  res.json({ routes });
});

// Registro de Rotas (ORDEM IMPORTANTE)
app.use("/api/auth", authRoutes(prisma));
app.use("/api/billing", billingRoutes(prisma)); // Adicionado billing (webhook público e rotas protegidas internos)

// Rotas Protegidas
app.use("/api/admin/plans", adminPlansRoutes(prisma));
app.use("/api/admin", authenticateToken, adminRoutes(prisma));
app.use("/api/org", authenticateToken, orgSettingsRoutes(prisma));
app.use("/api/clients", authenticateToken, clientRoutes(prisma));
app.use("/api/ai", authenticateToken, aiRoutes(prisma));
app.use("/api/crm", authenticateToken, crmRoutes(prisma));
console.log("Registering /api/marketing...");
app.use("/api/marketing", authenticateToken, marketingRoutes(prisma));
app.use("/api/finance", authenticateToken, financeRoutes(prisma));
app.use("/api/ops", authenticateToken, opsRoutes(prisma));
app.use("/api/ads", authenticateToken, adsRoutes(prisma));
app.use("/api/calendar", authenticateToken, calendarRoutes(prisma));
app.use("/api/lead-capture", authenticateToken, leadCaptureRoutes(prisma));
app.use("/api/tasks", authenticateToken, taskRoutes(prisma));
app.use("/api/creatives", authenticateToken, creativeRoutes(prisma));
app.use("/api/domains", authenticateToken, domainRoutes(prisma));
app.use("/api/projects", authenticateToken, projectRoutes(prisma));
app.use("/api/prompts", authenticateToken, promptRoutes(prisma));
app.use("/api/sales", authenticateToken, salesRoutes(prisma));
app.use("/api/system", authenticateToken, systemRoutes(prisma));
app.use("/api/livekit", livekitRoutes(prisma));
app.use("/api/extras", authenticateToken, extraRoutes(prisma));
app.use("/api/team", authenticateToken, teamRoutes(prisma));
app.use("/api/access-profiles", authenticateToken, accessProfileRoutes(prisma));
app.use("/api/client-portal", clientPortalRoutes(prisma));

// Novas Rotas (Automação de Agência)
app.use("/api/automation", authenticateToken, automationRoutes(prisma));
app.use("/api/notifications", authenticateToken, notificationRoutes(prisma));
app.use("/api/delivery", authenticateToken, deliveryRoutes(prisma));
app.use("/api/service-catalog", authenticateToken, serviceCatalogRoutes(prisma));
app.use("/api/time-tracking", authenticateToken, timeTrackingRoutes(prisma));
app.use("/api/health-score", authenticateToken, healthScoreRoutes(prisma));
app.use("/api/knowledge-base", authenticateToken, knowledgeBaseRoutes(prisma));
app.use("/api/snapshots", authenticateToken, snapshotRoutes(prisma));
app.use("/api/usage", authenticateToken, usageRoutes(prisma));

// Dashboard Unificado (Dinâmico)
app.get("/api/dashboard", authenticateToken, async (req: any, res) => {
  try {
    const orgId = req.user.orgId;
    const where = orgId ? { organizationId: orgId } : {};
    
    const [leads, clients, proposals, invoices, contentCount, org, weeklyLeads, weeklyClients] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.client.count({ where }),
      prisma.proposal.count({ where }),
      prisma.invoice.aggregate({
        where: { ...where, status: 'paga' },
        _sum: { total: true }
      }),
      prisma.creative.count({ where }),
      prisma.organization.findUnique({
        where: { id: orgId as string },
        select: { 
          name: true,
          plan: true,
          planId: true,
          planObj: true
        }
      }),
      // Real weekly data: leads created in last 7 days, grouped by day
      prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT TO_CHAR("createdAt", 'Dy') as day, COUNT(*)::int as count
        FROM "Lead"
        WHERE ${where.organizationId ? `"organizationId" = ${where.organizationId} AND` : ''}
          "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY TO_CHAR("createdAt", 'Dy'), EXTRACT(DOW FROM "createdAt")
        ORDER BY EXTRACT(DOW FROM "createdAt")
      `,
      // Real weekly data: clients created in last 7 days
      prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT TO_CHAR("createdAt", 'Dy') as day, COUNT(*)::int as count
        FROM "Client"
        WHERE ${where.organizationId ? `"organizationId" = ${where.organizationId} AND` : ''}
          "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY TO_CHAR("createdAt", 'Dy'), EXTRACT(DOW FROM "createdAt")
        ORDER BY EXTRACT(DOW FROM "createdAt")
      `
    ]);

    const revenue = invoices._sum.total || 0;

    // Build chart data from real weekly aggregations
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    const chartData = dayNames.map(day => ({
      name: day,
      leads: weeklyLeads?.find((r: any) => r.day === day)?.count || 0,
      conv: weeklyClients?.find((r: any) => r.day === day)?.count || 0
    }));

    res.json({
      orgName: org?.name || "Minha Agência",
      plan: org?.planObj || { name: org?.plan || 'Free', leadsLimit: 100 },
      usage: { leads },
      metrics: { 
        leads, 
        clients, 
        proposals, 
        revenue, 
        contentCount,
        conversions: leads > 0 ? ((clients / leads) * 100).toFixed(1) : 0 
      },
      chartData
    });
  } catch (error) {
    console.error("[DASHBOARD_ERROR]", error);
    res.status(500).json({ error: "Dashboard failure" });
  }
});

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.originalUrl });
});

import { errorHandler } from "./middleware/errorHandler.js";

// ... (previous routes)

// Error Handler (Advanced)
app.use(errorHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`\n🚀 Nexus360 Core rodando na porta ${PORT}`);
  console.log(`👉 API: http://localhost:${PORT}/api`);
});

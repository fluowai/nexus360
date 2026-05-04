import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { prisma } from "./lib/prisma.js";

// Import Rotas
import { authRoutes } from "./routes/auth.js";
import { orgSettingsRoutes } from "./routes/orgSettings.js";
import { crmRoutes } from "./routes/crm.js";
import { marketingRoutes } from "./routes/marketing.js";
import { financeRoutes } from "./routes/finance.js";
import { opsRoutes } from "./routes/ops.js";
import { adminRoutes } from "./routes/admin.js";
import { adsRoutes } from "./routes/ads.js";
import { clientRoutes } from "./routes/clients.js";
import { aiRoutes } from "./routes/ai.js";
import { calendarRoutes } from "./routes/calendar.js";
import { taskRoutes } from "./routes/tasks.js";
import { creativeRoutes } from "./routes/creatives.js";
import livekitRoutes from "./routes/livekit.js";
import { promptRoutes } from "./routes/prompts.js";
import { authenticateToken } from "./middleware/auth.js";

// Validação de variáveis de ambiente críticas
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter(env => !process.env[env]);

if (missingEnv.length > 0) {
  console.error(`❌ ERRO CRÍTICO: Variáveis de ambiente faltando: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();

// Rate Limiting para evitar ataques de força bruta e DoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: {
    success: false,
    error: "Muitas requisições vindas deste IP, tente novamente em 15 minutos."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar limiter em todas as rotas
app.use(limiter);

// Configuração de CORS para Vercel
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

app.use(express.json({ limit: '10mb' }));
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Rota raiz (Boas-vindas da API)
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Nexus360 API está rodando! Acesse o frontend em vez desta URL.",
    docs: "/api/health"
  });
});

// Rota de Health Check para Railway
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.json({
      success: true,
      message: 'Backend Nexus360 online',
      database: 'connected',
      env: {
        DATABASE_URL: Boolean(process.env.DATABASE_URL),
        JWT_SECRET: Boolean(process.env.JWT_SECRET),
        FRONTEND_URL: process.env.FRONTEND_URL || null,
        NODE_ENV: process.env.NODE_ENV || null
      }
    });
  } catch (error) {
    console.error('[HEALTH_ERROR]', error);

    return res.status(500).json({
      success: false,
      error: 'Erro ao conectar no banco',
      details: String(error)
    });
  }
});

app.get('/api/debug/routes', (req, res) => {
  res.json({
    success: true,
    routes: [
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/clients',
      'GET /api/admin/dashboard'
    ]
  });
});

// Rotas com prefixo /api
app.use("/api/auth", authRoutes(prisma));
app.use("/api/org", authenticateToken, orgSettingsRoutes(prisma));
app.use("/api/clients", authenticateToken, clientRoutes(prisma));
app.use("/api/admin", authenticateToken, adminRoutes(prisma));
app.use("/api/ai", authenticateToken, aiRoutes(prisma));

// Dashboard acessível para TODOS os usuários autenticados (não apenas Super Admin)
app.get("/api/dashboard", authenticateToken, async (req: any, res) => {
  try {
    const orgId = req.user.orgId;
    const whereClause = orgId ? { organizationId: orgId } : {};

    const leadsCount = await prisma.lead.count({ where: whereClause });
    const clientsCount = await prisma.client.count({ where: whereClause });
    const proposalsCount = await prisma.proposal.count({ where: whereClause });

    res.json({
      metrics: {
        leads: leadsCount,
        clients: clientsCount,
        proposals: proposalsCount,
        revenue: 45200.00,
        conversions: leadsCount > 0 ? ((clientsCount / leadsCount) * 100).toFixed(1) : 0,
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

// CRM e Outros
app.use("/api/crm", authenticateToken, crmRoutes(prisma));
app.use("/api/marketing", authenticateToken, marketingRoutes(prisma));
app.use("/api/finance", authenticateToken, financeRoutes(prisma));
app.use("/api/ops", authenticateToken, opsRoutes(prisma));
app.use("/api/ads", authenticateToken, adsRoutes(prisma));
app.use("/api/calendar", authenticateToken, calendarRoutes(prisma));
app.use("/api/tasks", authenticateToken, taskRoutes(prisma));
app.use("/api/creatives", authenticateToken, creativeRoutes(prisma));
app.use("/api/prompts", authenticateToken, promptRoutes(prisma));
app.use("/api/livekit", livekitRoutes);

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend Nexus360 rodando na porta ${PORT}`);
});

// Fallback para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API_ERROR]', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno no servidor',
    details: process.env.NODE_ENV !== 'production' ? String(err) : undefined
  });
});

export default app;

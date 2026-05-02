import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
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
import { authenticateToken } from "./middleware/auth.js";

const app = express();

// Configuração de CORS para Vercel
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://nexus360-zeta.vercel.app',
    'http://localhost:5173'
  ].filter(Boolean) as string[],
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

// CRM e Outros
app.use("/api/crm", authenticateToken, crmRoutes(prisma));
app.use("/api/marketing", authenticateToken, marketingRoutes(prisma));
app.use("/api/finance", authenticateToken, financeRoutes(prisma));
app.use("/api/ops", authenticateToken, opsRoutes(prisma));
app.use("/api/ads", authenticateToken, adsRoutes(prisma));

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

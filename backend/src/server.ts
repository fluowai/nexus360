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
import { opsRoutes } from "./routes/ops";
import { adminRoutes } from "./routes/admin.js";
import { adsRoutes } from "./routes/ads.js";
import { clientRoutes } from "./routes/clients.js";
import { aiRoutes } from "./routes/ai.js";
import { authenticateToken } from "./middleware/auth.js";

const app = express();

// Configuração de CORS para Vercel
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Rota de Health Check para Railway
app.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "Backend Nexus360 online", 
    timestamp: new Date() 
  });
});

// Rotas (Sem o prefixo /api, pois o Railway cuidará da raiz ou usaremos rotas diretas)
app.use("/auth", authRoutes(prisma));
app.use("/org", authenticateToken, orgSettingsRoutes(prisma));
app.use("/clients", authenticateToken, clientRoutes(prisma));
app.use("/admin", authenticateToken, adminRoutes(prisma));
app.use("/ai", authenticateToken, aiRoutes(prisma));

// CRM e Outros
app.use("/crm", authenticateToken, crmRoutes(prisma));
app.use("/marketing", authenticateToken, marketingRoutes(prisma));
app.use("/finance", authenticateToken, financeRoutes(prisma));
app.use("/ops", authenticateToken, opsRoutes(prisma));
app.use("/ads", authenticateToken, adsRoutes(prisma));

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend Nexus360 rodando na porta ${PORT}`);
});

export default app;

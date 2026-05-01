import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import helmet from "helmet";

// Import Rotas
import { authRoutes } from "./src/server/routes/auth";
import { orgSettingsRoutes } from "./src/server/routes/orgSettings";
import { crmRoutes } from "./src/server/routes/crm";
import { marketingRoutes } from "./src/server/routes/marketing";
import { financeRoutes } from "./src/server/routes/finance";
import { opsRoutes } from "./src/server/routes/ops";
import { adminRoutes } from "./src/server/routes/admin";
import { adsRoutes } from "./src/server/routes/ads";
import { clientRoutes } from "./src/server/routes/clients";
import { authenticateToken } from "./src/server/middleware/auth";

const prisma = new PrismaClient();
const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Rota de Teste de Vida
app.get("/api/health", (req, res) => {
  res.json({ status: "alive", environment: process.env.NODE_ENV });
});

// Rotas de API
app.use("/api/auth", authRoutes(prisma));
app.use("/api/org", authenticateToken, orgSettingsRoutes(prisma));
app.use("/api/clients", authenticateToken, clientRoutes(prisma));
app.use("/api/admin", authenticateToken, adminRoutes(prisma));

// CRM e Outros
app.use("/api", authenticateToken, crmRoutes(prisma));
app.use("/api", authenticateToken, marketingRoutes(prisma));
app.use("/api", authenticateToken, financeRoutes(prisma));
app.use("/api", authenticateToken, opsRoutes(prisma));
app.use("/api", authenticateToken, adsRoutes(prisma));

// Middleware de Erro Global (Para pegar o erro real na Vercel)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("🚨 [VERCEL ERROR]:", err);
  res.status(500).json({ 
    error: "Erro interno no servidor", 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Exporta para Vercel
export default app;

// Listener apenas para local
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Nexus360 local na porta ${PORT}`));
}

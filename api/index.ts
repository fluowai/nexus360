import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "../src/lib/prisma";

// Import Rotas
import { authRoutes } from "../src/server/routes/auth";
import { orgSettingsRoutes } from "../src/server/routes/orgSettings";
import { crmRoutes } from "../src/server/routes/crm";
import { marketingRoutes } from "../src/server/routes/marketing";
import { financeRoutes } from "../src/server/routes/finance";
import { opsRoutes } from "../src/server/routes/ops";
import { adminRoutes } from "../src/server/routes/admin";
import { adsRoutes } from "../src/server/routes/ads";
import { clientRoutes } from "../src/server/routes/clients";
import { authenticateToken } from "../src/server/middleware/auth";

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
}));

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

// Handler de Erro Global em JSON
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("🚨 [VERCEL RUNTIME ERROR]:", err);
  res.status(500).json({ 
    success: false,
    error: "Erro interno no servidor", 
    message: err.message
  });
});

export default app;

import dotenv from "dotenv";
dotenv.config(); // DEVE ser o primeiro a rodar

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { generateInstagramPost } from "./src/lib/instagramGenerator.ts";

// Import Modulares
import { crmRoutes } from "./src/server/routes/crm";
import { marketingRoutes } from "./src/server/routes/marketing";
import { financeRoutes } from "./src/server/routes/finance";
import { opsRoutes } from "./src/server/routes/ops";
import { adminRoutes } from "./src/server/routes/admin";
import { adsRoutes } from "./src/server/routes/ads";
import { authRoutes } from "./src/server/routes/auth";
import { usersRoutes } from "./src/server/routes/users";
import { aiRoutes } from "./src/server/routes/ai";
import { orgSettingsRoutes } from "./src/server/routes/orgSettings";
import { clientRoutes } from "./src/server/routes/clients";

import helmet from "helmet";
import cors from "cors";
import { authenticateToken } from "./src/server/middleware/auth";

const prisma = new PrismaClient();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares Globais
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
}));
app.use(express.json());
app.use(cors());

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// Serve generated images
app.use('/outputs', express.static(path.join(process.cwd(), 'outputs')));

// Image Generation API
app.post("/api/content/generate-art", async (req, res) => {
  try {
    const paths = await generateInstagramPost(req.body);
    res.json({ paths });
  } catch (error) {
    res.status(500).json({ error: "Falha ao gerar arte" });
  }
});

// ============ ROTAS MODULARES ============

// Auth (Pública)
console.log("[Server] Iniciando registro de rotas modulares...");
app.use("/api/auth", authRoutes(prisma));

// Rotas Protegidas (JWT)
app.use("/api/org", authenticateToken, orgSettingsRoutes(prisma));
app.use("/api/users", authenticateToken, usersRoutes(prisma));
app.use("/api/ai", authenticateToken, aiRoutes(prisma));
app.use("/api/clients", authenticateToken, clientRoutes(prisma));
app.use("/api/admin", authenticateToken, adminRoutes(prisma));

// CRM e Operação (Montadas em /api)
app.use("/api", authenticateToken, crmRoutes(prisma));
app.use("/api", authenticateToken, marketingRoutes(prisma));
app.use("/api", authenticateToken, financeRoutes(prisma));
app.use("/api", authenticateToken, opsRoutes(prisma));
app.use("/api", authenticateToken, adsRoutes(prisma));

// ============ VITE / STATIC SETUP ============
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(__dirname, "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Nexus360 rodando em http://localhost:${PORT}`);
});

export default app;

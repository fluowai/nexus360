import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { generateInstagramPost } from "./src/lib/instagramGenerator.ts";

// Import Modulares
import { crmRoutes } from "./src/server/routes/crm.ts";
import { marketingRoutes } from "./src/server/routes/marketing.ts";
import { financeRoutes } from "./src/server/routes/finance.ts";
import { opsRoutes } from "./src/server/routes/ops.ts";
import { adminRoutes } from "./src/server/routes/admin.ts";
import { adsRoutes } from "./src/server/routes/ads.ts";
import { authRoutes } from "./src/server/routes/auth.ts";
import { usersRoutes } from "./src/server/routes/users.ts";

import helmet from "helmet";
import cors from "cors";
import { authenticateToken } from "./src/server/middleware/auth.ts";

dotenv.config();
const prisma = new PrismaClient();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sincronização de Cargos
async function syncRoles() {
  try {
    await prisma.user.updateMany({
      where: { role: "SUPERADMIN" },
      data: { role: "SUPER_ADMIN" }
    });
  } catch (e) {
    console.log("[DB] Tabela vazia ou erro na sync de cargos.");
  }
}
syncRoles();

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
app.use("/api/auth", authRoutes(prisma));
const adminRouter = adminRoutes(prisma);
app.use("/api/admin", authenticateToken, adminRouter);
app.use("/api/users", authenticateToken, usersRoutes(prisma));
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

// Inicialização (Apenas se não for Vercel)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nexus360 rodando em http://localhost:${PORT}`);
  });
}

// Export para Vercel
export default app;

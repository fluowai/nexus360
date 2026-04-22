import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { generateInstagramPost } from "./src/lib/instagramGenerator.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve generated images
  app.use('/outputs', express.static(path.join(process.cwd(), 'outputs')));

  // Image Generation API
  app.post("/api/content/generate-art", async (req, res) => {
    try {
      const paths = await generateInstagramPost(req.body);
      res.json({ paths });
    } catch (error) {
      console.error("Art Generation Error:", error);
      res.status(500).json({ error: "Falha ao gerar arte para Instagram" });
    }
  });

  // Mock Data Endpoints
  app.get("/api/dashboard", (req, res) => {
    res.json({
      metrics: {
        leads: 1245,
        conversions: 8.2,
        revenue: 45200.00,
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
  });

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nexus360 rodando em http://localhost:${PORT}`);
  });
}

startServer();

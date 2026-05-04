import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function marketingRoutes(prisma: PrismaClient) {
  const router = Router();
  
  router.get("/", (req, res) => res.json({ message: "Marketing routes ready" }));

  // Rota para Landing Pages
  router.get("/landing-pages", (req, res) => {
    console.log("[Marketing] Listando landing pages...");
    res.json([]);
  });

  // Rota para Formulários de LP
  router.get("/lp-forms", (req, res) => {
    res.json([]);
  });

  return router;
}

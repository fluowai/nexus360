import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function adsRoutes(prisma: PrismaClient) {
  const router = Router();
  
  router.get("/", (req, res) => res.json({ message: "Ads routes ready" }));

  // Rota para contas de anúncios
  router.get("/ad-accounts", (req, res) => {
    res.json([]); // Retorna array vazio para evitar erro de .reduce no frontend
  });

  // Rota para campanhas
  router.get("/campaigns-ads", (req, res) => {
    res.json([]);
  });

  return router;
}

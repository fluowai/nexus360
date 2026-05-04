import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function salesRoutes(prisma: PrismaClient) {
  const router = Router();

  // Fila de Vendas
  router.get("/queue", (req, res) => {
    res.json([]);
  });

  // Propostas
  router.get("/proposals", (req, res) => {
    res.json([]);
  });

  // Serviços Vendidos
  router.get("/sold-services", (req, res) => {
    res.json([]);
  });

  return router;
}

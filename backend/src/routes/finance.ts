import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function financeRoutes(prisma: PrismaClient) {
  const router = Router();

  // Faturas (Invoices)
  router.get("/invoices", (req, res) => {
    res.json([]);
  });

  // Despesas (Expenses)
  router.get("/expenses", (req, res) => {
    res.json([]);
  });

  // Visão Geral (Dashboard)
  router.get("/overview", (req, res) => {
    res.json({ balance: 0, revenue: 0, pending: 0 });
  });

  return router;
}

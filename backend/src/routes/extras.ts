import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function extraRoutes(prisma: PrismaClient) {
  const router = Router();

  // Quizzes
  router.get("/quizzes", (req, res) => {
    res.json([]);
  });

  // Assets e Pastas
  router.get("/asset-folders", (req, res) => {
    res.json([]);
  });

  router.get("/assets", (req, res) => {
    res.json([]);
  });

  return router;
}

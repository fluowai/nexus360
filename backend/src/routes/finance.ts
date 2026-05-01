import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function financeRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get("/", (req, res) => res.json({ message: "Finance routes ready" }));
  return router;
}

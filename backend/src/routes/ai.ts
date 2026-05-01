import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function aiRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get("/", (req, res) => res.json({ message: "AI routes ready" }));
  return router;
}

import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function marketingRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get("/", (req, res) => res.json({ message: "Marketing routes ready" }));
  return router;
}

import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function adsRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get("/", (req, res) => res.json({ message: "Ads routes ready" }));
  return router;
}

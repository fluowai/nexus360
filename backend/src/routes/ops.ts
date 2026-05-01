import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function opsRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get("/", (req, res) => res.json({ message: "Ops routes ready" }));
  return router;
}

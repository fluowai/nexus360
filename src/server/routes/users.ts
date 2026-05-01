import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../middleware/auth.ts";

export function usersRoutes(prisma: PrismaClient) {
  const router = Router();

  // List users of the organization
  router.get("/", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const users = await prisma.user.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true
        }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Create team member
  router.post("/", async (req: AuthRequest, res) => {
    const { name, email, password, role } = req.body;
    const orgId = req.user?.orgId;
    const userRole = req.user?.role;

    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    
    // Only ORG_ADMIN or SUPER_ADMIN can create users
    if (userRole !== 'ORG_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Permission denied. Only admins can create users." });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role || "USER",
          organizationId: orgId
        }
      });

      res.status(201).json({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update user status/role
  router.patch("/:id", async (req: AuthRequest, res) => {
    const { role, status } = req.body;
    const orgId = req.user?.orgId;
    const userRole = req.user?.role;

    if (userRole !== 'ORG_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Permission denied." });
    }

    try {
      const userToUpdate = await prisma.user.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });

      if (!userToUpdate) {
        return res.status(404).json({ error: "User not found in your organization." });
      }

      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: { role, status }
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  return router;
}

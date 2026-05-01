import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.ts";

export function financeRoutes(prisma: PrismaClient) {
  const router = Router();

  // Invoices
  router.get("/invoices", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { status } = req.query;
    try {
      const invoices = await prisma.invoice.findMany({
        where: { 
          organizationId: orgId,
          ...(status ? { status: String(status) } : {})
        },
        include: { client: true, contract: true },
        orderBy: { issueDate: 'desc' }
      });
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  router.post("/invoices", async (req: AuthRequest, res) => {
    const { clientId, contractId, description, dueDate, subtotal, tax, total } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const invoiceNumber = `INV-${Date.now()}`;
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          clientId,
          contractId,
          description,
          dueDate: dueDate ? new Date(dueDate) : new Date(),
          subtotal: parseFloat(subtotal) || 0,
          tax: parseFloat(tax) || 0,
          total: parseFloat(total) || 0,
          organizationId: orgId
        },
        include: { client: true }
      });
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // Expenses
  router.get("/expenses", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { status } = req.query;
    try {
      const expenses = await prisma.expense.findMany({
        where: { 
          organizationId: orgId,
          ...(status ? { status: String(status) } : {})
        },
        orderBy: { date: 'desc' }
      });
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  // Contracts
  router.get("/contracts", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { status } = req.query;
    try {
      const contracts = await prisma.contract.findMany({
        where: { 
          organizationId: orgId,
          ...(status ? { status: String(status) } : {})
        },
        include: { client: true, invoices: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contracts" });
    }
  });

  // Products
  router.get("/products", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const products = await prisma.product.findMany({
        where: { organizationId: orgId },
        orderBy: { name: 'asc' }
      });
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  return router;
}

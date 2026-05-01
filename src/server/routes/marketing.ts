import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.ts";

export function marketingRoutes(prisma: PrismaClient) {
  const router = Router();

  // Creatives
  router.get("/creatives", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const creatives = await prisma.creative.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(creatives);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch creatives" });
    }
  });

  router.post("/creatives", async (req: AuthRequest, res) => {
     const { title, type, contentUrl, copyText } = req.body;
     const orgId = req.user?.orgId;
     if (!orgId) return res.status(401).json({ error: "Unauthorized" });

     try {
       const creative = await prisma.creative.create({
         data: { title, type, contentUrl, copyText, organizationId: orgId }
       });
       res.json(creative);
     } catch (error) {
       res.status(500).json({ error: "Failed to create creative" });
     }
  });

  router.patch("/creatives/:id", async (req: AuthRequest, res) => {
    const { status, feedback } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const creative = await prisma.creative.updateMany({
        where: { id: req.params.id, organizationId: orgId },
        data: { status, feedback }
      });

      if (creative.count === 0) {
        return res.status(404).json({ error: "Creative not found or unauthorized" });
      }

      const updated = await prisma.creative.findUnique({ where: { id: req.params.id } });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update creative" });
    }
  });

  // Assets
  router.get("/assets", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { type, folderId } = req.query;
    try {
      const assets = await prisma.asset.findMany({
        where: { 
          organizationId: orgId,
          ...(type ? { type: String(type) } : {}),
          ...(folderId ? { folderId: String(folderId) } : {})
        },
        include: { folder: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  router.post("/assets", async (req: AuthRequest, res) => {
    const { name, type, mimeType, size, url, thumbnailUrl, width, height, tags, folderId } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const asset = await prisma.asset.create({
        data: {
          name,
          type,
          mimeType,
          size: parseInt(size) || 0,
          url,
          thumbnailUrl,
          width: parseInt(width),
          height: parseInt(height),
          tags,
          folderId,
          organizationId: orgId
        }
      });
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  // Landing Pages
  router.get("/landing-pages", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { status } = req.query;
    try {
      const pages = await prisma.landingPage.findMany({
        where: { 
          organizationId: orgId,
          ...(status ? { status: String(status) } : {})
        },
        include: { template: true, form: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(pages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch landing pages" });
    }
  });

  router.post("/landing-pages", async (req: AuthRequest, res) => {
    const { name, slug, templateId, headline, subheadline, heroImage, content, formId, formProvider, formConfig, metaTitle, metaDescription } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    
    try {
       const safeSlug = slug 
        ? slug.replace(/[^a-z0-9-]/g, '').toLowerCase() + '-' + Math.random().toString(36).substring(2, 7)
        : name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20) + '-' + Math.random().toString(36).substring(2, 7);
      
      const page = await prisma.landingPage.create({
        data: {
          name,
          slug: safeSlug,
          templateId: templateId || null,
          headline: headline || null,
          subheadline: subheadline || null,
          heroImage: heroImage || null,
          content: content || null,
          formId: formId || null,
          formProvider: formProvider || null,
          formConfig: formConfig || null,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          organizationId: orgId
        }
      });
      res.json(page);
    } catch (error) {
      res.status(500).json({ error: "Failed to create landing page" });
    }
  });

  // Quizzes
  router.get("/quizzes", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const quizzes = await prisma.quiz.findMany({
        where: { organizationId: orgId },
        include: { questions: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json(quizzes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quizzes" });
    }
  });

  return router;
}

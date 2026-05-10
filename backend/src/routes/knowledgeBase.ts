import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function knowledgeBaseRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req: AuthRequest, res) => {
    try {
      const { category, search } = req.query;
      const where: any = { organizationId: req.user!.orgId };
      if (category) where.category = category;
      if (search) where.title = { contains: search as string, mode: "insensitive" };
      const articles = await prisma.knowledgeBase.findMany({ where, orderBy: { updatedAt: "desc" } });
      res.json(articles);
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar artigos" });
    }
  });

  router.post("/", async (req: AuthRequest, res) => {
    try {
      const { title, content, category, tags, attachments } = req.body;
      if (!title || !content) return res.status(400).json({ error: "Título e conteúdo são obrigatórios" });
      const article = await prisma.knowledgeBase.create({
        data: { title, content, category, tags: tags ? JSON.stringify(tags) : undefined, attachments: attachments ? JSON.stringify(attachments) : undefined, createdById: req.user!.id, organizationId: req.user!.orgId },
      });
      res.json(article);
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_CREATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao criar artigo" });
    }
  });

  router.get("/:id", async (req: AuthRequest, res) => {
    try {
      const article = await prisma.knowledgeBase.findFirst({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!article) return res.status(404).json({ error: "Artigo não encontrado" });
      await prisma.knowledgeBase.update({ where: { id: article.id }, data: { views: { increment: 1 } } });
      res.json(article);
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_GET_ERROR]", error);
      res.status(500).json({ error: "Erro ao buscar artigo" });
    }
  });

  router.patch("/:id", async (req: AuthRequest, res) => {
    try {
      const { title, content, category, tags, isPublished, attachments } = req.body;
      const data: any = {};
      if (title) data.title = title;
      if (content) data.content = content;
      if (category) data.category = category;
      if (tags) data.tags = JSON.stringify(tags);
      if (isPublished !== undefined) data.isPublished = isPublished;
      if (attachments) data.attachments = JSON.stringify(attachments);
      const result = await prisma.knowledgeBase.updateMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        data,
      });
      if (!result.count) return res.status(404).json({ error: "Artigo não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_UPDATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao atualizar artigo" });
    }
  });

  router.delete("/:id", async (req: AuthRequest, res) => {
    try {
      const result = await prisma.knowledgeBase.deleteMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!result.count) return res.status(404).json({ error: "Artigo não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_DELETE_ERROR]", error);
      res.status(500).json({ error: "Erro ao deletar artigo" });
    }
  });

  router.get("/categories/list", async (req: AuthRequest, res) => {
    try {
      const categories = await prisma.knowledgeBase.groupBy({
        by: ["category"],
        where: { organizationId: req.user!.orgId, category: { not: null } },
        _count: { id: true },
      });
      res.json(categories);
    } catch (error) {
      console.error("[KNOWLEDGE_BASE_CATEGORIES_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar categorias" });
    }
  });

  return router;
}

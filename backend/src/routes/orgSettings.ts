import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import { assertStrongPassword } from "../utils/security.js";
import { getOrgAIKeys } from "../utils/aiKeys.js";

export function orgSettingsRoutes(prisma: PrismaClient) {
  const router = Router();

  // Get Agency Profile
  router.get("/profile", async (req: AuthRequest, res) => {
    let orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId }
      });
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organization profile" });
    }
  });

  // Update Agency Profile
  router.patch("/profile", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const org = await prisma.organization.update({
        where: { id: orgId },
        data: {
          name: req.body.corporateName || req.body.name || undefined,
          domain: req.body.domain,
          groqKey: req.body.groqKey,
          serpApiKey: req.body.serpApiKey,
          serperApiKey: req.body.serperApiKey,
          outscraperKey: req.body.outscraperKey
        }
      });
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to update organization profile" });
    }
  });

  // Get Organization Settings (AI Keys, etc)
  router.get("/settings", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          geminiKey: true,
          groqKey: true,
          serpApiKey: true,
          serperApiKey: true,
          outscraperKey: true,
          aiProvider: true
        }
      });
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update Organization Settings
  router.patch("/settings", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { geminiKey, groqKey, serpApiKey, serperApiKey, outscraperKey, aiProvider } = req.body;
      const org = await prisma.organization.update({
        where: { id: orgId },
        data: { geminiKey, groqKey, serpApiKey, serperApiKey, outscraperKey, aiProvider }
      });
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
  // Get Team Members
  router.get("/team", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const users = await prisma.user.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, email: true, role: true, department: true, createdAt: true, status: true }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Create Team Member
  router.post("/team", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { name, email, role, department, password } = req.body;
    const passwordError = assertStrongPassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    // Prevenção de Escalabilidade de Privilégios
    if (role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Apenas Super Admins podem criar outros Super Admins." });
    }

    try {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          role: role || 'USER',
          department: department || 'GERAL',
          organizationId: orgId,
          password: await bcrypt.hash(password, 10)
        }
      });
      const { password: _password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  // Update Team Member
  router.patch("/team/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { name, email, role, department, password, status } = req.body;
    if (password && password.trim() !== "") {
      const passwordError = assertStrongPassword(password);
      if (passwordError) return res.status(400).json({ error: passwordError });
    }

    // Prevenção de Escalabilidade de Privilégios
    if (role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Apenas Super Admins podem promover usuários a Super Admin." });
    }

    try {
      const updateData: any = { name, email, role, department, status };

      if (password && password.trim() !== "") {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id: req.params.id, organizationId: orgId },
        data: updateData
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  // Delete Team Member
  router.delete("/team/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    try {
      const user = await prisma.user.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });

      if (!user) return res.status(404).json({ error: "Membro não encontrado." });
      if (user.role === 'ORG_ADMIN') return res.status(400).json({ error: "Não é possível excluir o administrador da organização." });

      await prisma.user.delete({
        where: { id: req.params.id, organizationId: orgId }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  // Get Contract Templates
  router.get("/templates", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const templates = await prisma.contractTemplate.findMany({
        where: { organizationId: orgId },
        take: 4,
        orderBy: { createdAt: 'desc' }
      });
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  router.post("/templates", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { name, content, category, isActive } = req.body;
    if (!name || !content) return res.status(400).json({ error: "Nome e conteúdo são obrigatórios." });

    try {
      const template = await prisma.contractTemplate.create({
        data: {
          name,
          content,
          category,
          isActive: isActive ?? true,
          organizationId: orgId
        }
      });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  router.patch("/templates/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const existing = await prisma.contractTemplate.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!existing) return res.status(404).json({ error: "Template não encontrado" });

      const template = await prisma.contractTemplate.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name,
          content: req.body.content,
          category: req.body.category,
          isActive: req.body.isActive
        }
      });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  router.delete("/templates/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const existing = await prisma.contractTemplate.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!existing) return res.status(404).json({ error: "Template não encontrado" });

      await prisma.contractTemplate.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // ==================== ONBOARDING AUTÔNOMO ====================
  // O usuário descreve o que vende, a IA gera pipelines personalizados

  const generatePipelinesWithAI = async (
    businessType: string,
    businessDescription: string,
    orgId: string
  ): Promise<{ name: string; stages: string[] }[]> => {
    try {
      const { groqKey } = await getOrgAIKeys(prisma, orgId);
      if (!groqKey) return [];

      const prompt = `Você é um especialista em CRM e vendas. Com base na descrição do negócio abaixo, crie de 2 a 4 pipelines de vendas personalizados para este negócio.

DESCRIÇÃO DO NEGÓCIO:
Tipo: ${businessType}
O que vende: ${businessDescription}

REGRAS:
- Cada pipeline deve ter um nome curto e objetivo (ex: "Vendas Diretas", "Parcerias", "Qualificação")
- Cada pipeline deve ter de 3 a 6 estágios
- Os estágios devem refletir o processo real de venda deste tipo de negócio
- Use nomes claros em português do Brasil
- Retorne APENAS um array JSON válido, sem markdown, sem texto extra

EXEMPLO DE FORMATO (para uma clínica):
[
  { "name": "Consultoria Clínica", "stages": ["Agendamento", "Diagnóstico", "Proposta", "Fechamento"] }
]

RESPOSTA (apenas JSON válido):`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        console.error("[ONBOARDING_AI_ERROR]", await response.text());
        return [];
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "[]";
      const parsed = JSON.parse(text.trim());
      const pipelines = parsed.pipelines || parsed;
      if (Array.isArray(pipelines) && pipelines.length > 0) {
        return pipelines.filter((p: any) => p.name && Array.isArray(p.stages));
      }
      return [];
    } catch (error) {
      console.error("[ONBOARDING_AI_GEN_ERROR]", error);
      return [];
    }
  };

  const createDefaultPipelines = async (orgId: string) => {
    const fallbackPipelines = [
      { name: "Prospecção", stages: ["Novo Lead", "Primeiro Contato", "Em Conversa", "Interesse", "Qualificado"] },
      { name: "Vendas", stages: ["Demonstração", "Proposta", "Negociação", "Fechado", "Perdido"] },
    ];

    for (const p of fallbackPipelines) {
      const exists = await prisma.pipeline.findFirst({
        where: { organizationId: orgId, name: p.name },
      });
      if (!exists) {
        await prisma.pipeline.create({
          data: {
            name: p.name,
            organizationId: orgId,
            type: "SALES",
            stages: { create: p.stages.map((name, order) => ({ name, order })) },
          },
        });
      }
    }
  };

  router.post("/onboarding-setup", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { businessType, businessDescription, teamMembers } = req.body;

      if (!businessDescription) {
        return res.status(400).json({ error: "Descrição do negócio é obrigatória" });
      }

      // 1. Atualizar Organization com os dados de negócio
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          businessType: businessType || "Outro",
          businessDescription,
          settings: {
            upsert: { onboardingCompleted: true },
          },
        },
      });

      // 2. Gerar pipelines com IA
      let pipelines = await generatePipelinesWithAI(businessType || "Outro", businessDescription, orgId);

      // 3. Se IA falhou ou não retornou nada, criar pipelines padrão
      if (pipelines.length === 0) {
        await createDefaultPipelines(orgId);
      } else {
        for (const p of pipelines) {
          const exists = await prisma.pipeline.findFirst({
            where: { organizationId: orgId, name: p.name },
          });
          if (!exists) {
            await prisma.pipeline.create({
              data: {
                name: p.name,
                description: `Pipeline gerado por IA para: ${businessDescription}`,
                organizationId: orgId,
                type: "SALES",
                stages: {
                  create: p.stages.map((name, order) => ({
                    name,
                    order,
                    color: ["#6054F8", "#5AE7AC", "#D89A2B", "#D5665F", "#9B97FC", "#657098"][order % 6],
                  })),
                },
              },
            });
          }
        }
      }

      // 4. Criar primeiro lead de boas-vindas
      await prisma.lead.create({
        data: {
          name: "Primeiro Lead",
          email: "lead@exemplo.com",
          status: "novo",
          temperature: "WARM",
          notes: `Lead gerado automaticamente no onboarding. Negócio: ${businessDescription}`,
          organizationId: orgId,
        },
      });

      res.json({
        success: true,
        message: "Ambiente configurado com sucesso!",
        pipelines,
      });
    } catch (error) {
      console.error("[ONBOARDING_SETUP_ERROR]", error);
      res.status(500).json({ error: "Erro ao configurar ambiente" });
    }
  });

  return router;
}

import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function promptRoutes(prisma: PrismaClient) {
  const router = Router();

  // Rota para Gerar o Prompt Master usando IA
  router.post("/generate", async (req: AuthRequest, res) => {
    const { 
      projectName, 
      promptType, 
      niche, 
      targetAudience, 
      objective, 
      tone, 
      structure, 
      designStyle, 
      colors, 
      advancedFeatures 
    } = req.body;

    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      // 1. Buscar Chave de IA da Organização (preferencialmente Groq para velocidade)
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { groqKey: true, geminiKey: true }
      });

      const apiKey = org?.groqKey || process.env.GROQ_API_KEY;
      
      // 2. Montar o "Super Prompt Context"
      const systemPrompt = `Você é um arquiteto de software e estrategista de marketing digital. Sua missão é criar um PROMPT MASTER em Markdown para ferramentas de desenvolvimento com IA (Cursor, Lovable, Bolt).
      O prompt deve ser extremamente detalhado e técnico.`;

      const userPrompt = `
      Crie um PROMPT MASTER para o projeto: ${projectName}
      Tipo: ${promptType}
      Nicho: ${niche}
      Objetivo: ${objective}
      Público: ${targetAudience}
      Tom de Voz: ${tone}
      Estrutura Necessária: ${structure.join(', ')}
      Estilo Visual: ${designStyle} (Cores: ${colors})
      Recursos Técnicos: ${advancedFeatures.join(', ')}

      O resultado deve ser um documento Markdown estruturado com: Contexto, Objetivo, UX/UI, Stack Técnica, Funcionalidades Detalhadas, Banco de Dados, Segurança e Critérios de Aceite.
      `;

      // 3. Chamada para Groq (Llama-3-70b-versatile)
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      const generatedPrompt = data.choices[0].message.content;

      // 4. Salvar no Histórico
      const savedPrompt = await prisma.generatedPrompt.create({
        data: {
          organizationId: orgId,
          userId: req.user!.id,
          projectName,
          promptType,
          inputData: req.body,
          generatedContent: generatedPrompt,
          modelProvider: 'Groq',
          modelName: 'llama-3.3-70b-versatile'
        }
      });

      res.json({ success: true, prompt: generatedPrompt, id: savedPrompt.id });
    } catch (error) {
      console.error("[PROMPT_GEN_ERROR]", error);
      res.status(500).json({ error: "Falha ao gerar prompt mestre" });
    }
  });

  // Listar Histórico
  router.get("/history", async (req: AuthRequest, res) => {
    try {
      const history = await prisma.generatedPrompt.findMany({
        where: { organizationId: req.user?.orgId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Falha ao buscar histórico" });
    }
  });

  return router;
}

import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function promptRoutes(prisma: PrismaClient) {
  const router = Router();

  // Rota para Gerar o Prompt Master usando IA
  router.post("/generate", async (req: any, res: any) => {
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
      Estrutura Necessária: ${Array.isArray(structure) ? structure.join(', ') : structure}
      Estilo Visual: ${designStyle} (Cores: ${colors})
      Recursos Técnicos: ${Array.isArray(advancedFeatures) ? advancedFeatures.join(', ') : advancedFeatures}

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

      const data: any = await response.json();
      
      if (!data.choices || !data.choices[0]) {
        throw new Error("Resposta inválida da IA");
      }

      const generatedPrompt = data.choices[0].message.content;

      // 4. Salvar no Histórico
      const savedPrompt = await prisma.generatedPrompt.create({
        data: {
          organizationId: orgId,
          userId: req.user!.id,
          projectName: projectName || "Projeto Sem Nome",
          promptType: promptType || "Personalizado",
          inputData: req.body || {},
          generatedContent: generatedPrompt,
          modelProvider: 'Groq',
          modelName: 'llama-3.3-70b-versatile'
        }
      });

      res.json({ success: true, prompt: generatedPrompt, id: savedPrompt.id });
    } catch (error) {
      console.error("[PROMPT_GEN_ERROR]", error);
      res.status(500).json({ error: "Falha ao gerar prompt mestre", details: String(error) });
    }
  });

  // Listar Histórico
  router.get("/history", async (req: any, res: any) => {
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

  // Rota para Sugerir ICP e Serviços baseados no Nicho
  router.post("/suggest-context", async (req: any, res: any) => {
    const { niche } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { groqKey: true }
      });
      const apiKey = org?.groqKey || process.env.GROQ_API_KEY;

      const prompt = `Você é um estrategista de negócios experiente. O usuário informou o nicho: "${niche}".
      Com base nisso, devolva um JSON estritamente no seguinte formato:
      {
        "icp": "uma descrição detalhada do cliente ideal (ICP) e suas dores",
        "services": ["Serviço 1", "Serviço 2", "Serviço 3", "Serviço 4", "Serviço 5"]
      }
      Sugira pelo menos 6 serviços comuns e relevantes para este nicho específico.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7
        })
      });

      const data: any = await response.json();
      const suggestion = JSON.parse(data.choices[0].message.content);
      res.json(suggestion);
    } catch (error) {
      console.error("[SUGGEST_ERROR]", error);
      res.status(500).json({ error: "Falha ao sugerir contexto" });
    }
  });

  return router;
}

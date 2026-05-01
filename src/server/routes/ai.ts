import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.ts";

export function aiRoutes(prisma: PrismaClient) {
  const router = Router();

  router.post("/agent", async (req: AuthRequest, res) => {
    const { agentId, input, prompt, model: requestedModel, clientId } = req.body;
    const orgId = req.user?.orgId;
    
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { geminiKey: true, groqKey: true, aiProvider: true }
      });

      if (!org) return res.status(404).json({ error: "Organization not found" });

      // 1. Busca Contexto do Cliente se fornecido
      let contextString = "";
      if (clientId) {
        const clientContext = await prisma.clientAIContext.findUnique({
          where: { clientId }
        });
        
        if (clientContext) {
          const ctx = clientContext.context as any;
          contextString = `
--- CONTEXTO ESTRATÉGICO DO CLIENTE ---
CLIENTE: ${ctx.company_name || 'N/A'}
NICHO: ${ctx.niche || 'N/A'}
ICP: ${ctx.icp || 'N/A'}
PERSONAS: ${ctx.personas || 'N/A'}
TOM DE VOZ: ${ctx.brand_voice || 'N/A'}
DORES: ${ctx.pains || 'N/A'}
OBJEÇÕES: ${ctx.objections || 'N/A'}
DIFERENCIAIS: ${ctx.competitors || 'N/A'}
PRODUTOS/OFERTAS: ${ctx.offers || 'N/A'}
REGRAS/PROIBIÇÕES: ${ctx.forbidden_words || 'N/A'}
---------------------------------------
`;
        }
      }

      // 2. Lógica de Provedor
      let provider = 'gemini';
      if (requestedModel?.includes('llama') || requestedModel?.includes('groq')) {
        provider = 'groq';
      } else if (requestedModel?.includes('gemini')) {
        provider = 'gemini';
      } else {
        provider = org.aiProvider || 'gemini';
      }

      const modelId = requestedModel || (provider === 'gemini' ? 'gemini-1.5-flash' : 'llama-3.3-70b-versatile');
      
      console.log(`[AI] Agent: ${agentId} | Client: ${clientId || 'Global'} | Provider: ${provider}`);

      let result = "";

      // 3. Execução da IA
      if (provider === 'gemini') {
        const apiKey = org.geminiKey || process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${prompt}\n\n${contextString}\n\nENTRADA DO USUÁRIO:\n${input}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Erro Gemini");
        result = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";

      } else if (provider === 'groq') {
        const apiKey = org.groqKey;
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: "system", content: `${prompt}\n\n${contextString}` },
              { role: "user", content: input }
            ],
            temperature: 0.7
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Erro Groq");
        result = data.choices?.[0]?.message?.content || "Sem resposta.";
      }

      // 4. Salva Histórico de Geração (Memória Evolutiva)
      if (clientId) {
        await prisma.aIGeneration.create({
          data: {
            clientId,
            agentType: agentId || 'generic',
            prompt: input,
            response: result
          }
        });
      }

      res.json({ result });
    } catch (error: any) {
      console.error("AI Route Error:", error);
      res.status(500).json({ error: error.message || "Falha ao processar inteligência" });
    }
  });

  // Rota para salvar/atualizar contexto do cliente
  router.post("/context", async (req: AuthRequest, res) => {
    const { clientId, context } = req.body;
    if (!clientId) return res.status(400).json({ error: "Client ID required" });

    try {
      const updated = await prisma.clientAIContext.upsert({
        where: { clientId },
        update: { context },
        create: { clientId, context }
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to save context" });
    }
  });

  router.post("/analyze-contracts", async (req, res) => {
    const { modelA, modelB } = req.body;

    const systemPrompt = `Você é um advogado especialista em contratos de marketing e tecnologia. 
    Analise os dois modelos de contrato fornecidos e retorne um JSON com a seguinte estrutura:
    {
      "stiffnessSummary": "Resumo de qual é mais rígido e por que",
      "recommended": "A" ou "B",
      "recommendationReason": "Por que este modelo é melhor para a agência",
      "risksSummary": "Quais riscos jurídicos ou operacionais existem",
      "differences": [
        { "topic": "Nome do Tópico (ex: Rescisão)", "modelA": "Como é no A", "modelB": "Como é no B" }
      ]
    }
    Seja técnico, direto e foque no interesse da agência de marketing (contratada).`;

    const userPrompt = `MODELO A:\n${modelA}\n\nMODELO B:\n${modelB}`;

    try {
      // Usando a mesma lógica de chamada de agente que já temos
      const aiResponse = await fetch(`${process.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'contract-analyst',
          prompt: userPrompt,
          systemPrompt,
          model: 'gpt-4o' // Ou o modelo configurado no Groq/Gemini
        })
      });

      const data = await aiResponse.json();
      // Tentar extrair JSON se a resposta vier como texto
      let finalJson = data.result;
      if (typeof finalJson === 'string') {
        const jsonMatch = finalJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) finalJson = JSON.parse(jsonMatch[0]);
      }

      res.json(finalJson);
    } catch (error) {
      console.error("AI Contract Analysis Error:", error);
      res.status(500).json({ error: "Falha na análise da IA" });
    }
  });

  return router;
}

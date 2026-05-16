import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { getOrgAIKeys } from "../utils/aiKeys.js";
import { AuthRequest } from "../middleware/auth.js";

export function aiRoutes(prisma: PrismaClient) {
  const router = Router();

  // Função para transcrever áudio em tempo real usando Groq Whisper
  router.post("/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm" } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: "Áudio não fornecido" });
      }

      // Usamos a chave provida ou configurada no painel
      const orgId = (req as any).user?.orgId;
      const { groqKey } = await getOrgAIKeys(prisma, orgId);

      // Converter Base64 para Buffer e depois para Blob (Suportado no Node 18+)
      const buffer = Buffer.from(audioBase64, "base64");
      const blob = new Blob([buffer], { type: mimeType });

      const formData = new FormData();
      formData.append("file", blob, "audio.webm");
      formData.append("model", "whisper-large-v3");
      formData.append("language", "pt"); // Forçar português para mais precisão
      formData.append("response_format", "json");

      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Erro no Groq STT:", err);
        return res.status(response.status).json({ error: "Erro na transcrição" });
      }

      const data = await response.json();
      res.json({ text: data.text });
    } catch (error) {
      console.error("[TRANSCRIBE_ERROR]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Função para gerar o feedback do Supervisor ao fim da reunião
  router.post("/meeting-feedback", async (req, res) => {
    try {
      const { transcript } = req.body;

      if (!transcript) {
        return res.status(400).json({ error: "Transcrição não fornecida" });
      }

      const orgId = (req as any).user?.orgId;
      const { groqKey } = await getOrgAIKeys(prisma, orgId);

      const prompt = `Você é um Supervisor de Vendas e Atendimento Sênior avaliando uma reunião.
Abaixo está a transcrição da reunião.
Sua tarefa é analisar a conversa e fornecer um relatório estruturado em JSON com as seguintes chaves:
- "resumo": Um resumo executivo da reunião (max 3 linhas).
- "pontosFortes": Array de strings com os acertos da equipe.
- "pontosMelhoria": Array de strings com críticas construtivas e falhas no atendimento/venda.
- "proximosPassos": Array de strings com as tarefas combinadas.

Retorne APENAS o JSON válido, sem markdown (\`\`\`json), sem textos antes ou depois.

Transcrição:
"""
${transcript}
"""`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Erro no Groq Chat:", err);
        return res.status(response.status).json({ error: "Erro ao gerar feedback" });
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      const parsedFeedback = JSON.parse(content);
      res.json({ feedback: parsedFeedback });
    } catch (error) {
      console.error("[FEEDBACK_ERROR]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Gerador de Conteúdo para Creative Machine
  router.post("/generate-content", async (req, res) => {
    try {
      const { prompt, type } = req.body;
      const orgId = (req as any).user?.orgId;
      const { geminiKey } = await getOrgAIKeys(prisma, orgId);

      if (!geminiKey) {
        return res.status(500).json({ error: "Gemini API Key não configurada no servidor ou organização" });
      }

      const refinedPrompt = `Como um especialista em marketing 360, crie um conteúdo do tipo ${type} baseado no seguinte tema: ${prompt}. Retorne em formato markdown puro. Use um tom profissional e persuasivo em Português do Brasil.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: refinedPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        })
      });

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar conteúdo";
      
      res.json({ text: content });
    } catch (error) {
      console.error("[AI_GEN_ERROR]", error);
      res.status(500).json({ error: "Erro interno ao gerar conteúdo" });
    }
  });

  router.post("/agent", async (req: AuthRequest, res) => {
    try {
      const { prompt, input, model = "gemini-1.5-flash" } = req.body;
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { geminiKey } = await getOrgAIKeys(prisma, orgId);

      if (!prompt || !input) {
        return res.status(400).json({ error: "Prompt e entrada são obrigatórios." });
      }

      if (!geminiKey) {
        return res.status(500).json({ error: "Gemini API Key não configurada no servidor ou organização" });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${prompt}\n\nEntrada do usuário:\n${input}\n\nResponda em português do Brasil com estrutura clara e acionável.` }]
          }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 4096 }
        })
      });

      if (!response.ok) {
        const details = await response.text();
        return res.status(response.status).json({ error: "Falha ao executar agente", details });
      }

      const data = await response.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar uma resposta.";
      res.json({ result });
    } catch (error) {
      console.error("[AI_AGENT_ERROR]", error);
      res.status(500).json({ error: "Erro interno ao executar agente" });
    }
  });

  return router;
}

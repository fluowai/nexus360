import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { getOrgAIKeys } from "../utils/aiKeys.js";

type RewriteResult = {
  text: string;
  applied: boolean;
  provider: string | null;
  reason?: string;
};

export class MessageRewriteService {
  constructor(private prisma: PrismaClient) {}

  async rewriteWhatsAppMessage(organizationId: string, text: string): Promise<RewriteResult> {
    const original = String(text || "").trim();
    if (!original) {
      return { text: original, applied: false, provider: null, reason: "empty_message" };
    }

    const keys = await getOrgAIKeys(this.prisma, organizationId);
    const groqKey = keys.groqKey || process.env.GROQ_API_KEY;
    if (!groqKey) {
      return { text: original, applied: false, provider: null, reason: "missing_groq_key" };
    }

    const systemPrompt = [
      "Reescreva o texto abaixo melhorando clareza, fluidez e impacto, mantendo exatamente o mesmo sentido e intencao original.",
      "",
      "INSTRUCOES OBRIGATORIAS:",
      "- Preserve completamente o significado original.",
      "- Mantenha a formatacao do WhatsApp quando existir.",
      "- Negrito deve continuar com um asterisco antes e depois.",
      "- Italico deve continuar com underscore antes e depois.",
      "- Nao use HTML, Markdown extra ou comentarios.",
      "- Responda apenas com o texto final.",
      "",
      `Texto para reescrever:\n${original}`,
    ].join("\n");

    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: process.env.GROQ_REWRITE_MODEL || "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.35,
          max_tokens: 500,
        },
        { headers: { Authorization: `Bearer ${groqKey}` } }
      );

      const rewritten = String(response.data?.choices?.[0]?.message?.content || "").trim();
      if (!rewritten) {
        return { text: original, applied: false, provider: "groq", reason: "empty_ai_response" };
      }

      return { text: rewritten, applied: rewritten !== original, provider: "groq" };
    } catch (error: any) {
      return {
        text: original,
        applied: false,
        provider: "groq",
        reason: error?.response?.data?.error?.message || error?.message || "rewrite_failed",
      };
    }
  }
}

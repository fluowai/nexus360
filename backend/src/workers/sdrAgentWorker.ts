import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { mergeProspectingAgentMemory } from "../services/prospectingAutomation.js";

async function callBridge(path: string, body: any) {
  const res = await fetch(`${process.env.WHATSAPP_BRIDGE_URL || "http://localhost:8091"}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-whatsapp-bridge-secret": process.env.WHATSAPP_BRIDGE_SECRET || "dev-whatsapp-bridge-secret",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `WhatsApp bridge error ${res.status}`);
  return data;
}

export class SdrAgentWorker {
  private prisma: PrismaClient;
  private running = false;
  private interval: NodeJS.Timeout | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  start() {
    this.running = true;
    console.log("[SdrAgentWorker] Motor de Respostas Autônomas iniciado.");
    this.interval = setInterval(() => this.processActiveRuns(), 15000);
  }

  stop() {
    this.running = false;
    if (this.interval) clearInterval(this.interval);
    console.log("[SdrAgentWorker] Motor de Respostas Autônomas parado.");
  }

  private async processActiveRuns() {
    if (!this.running) return;

    try {
      // Pega todos os leads que responderam e estão aguardando ação da IA
      const runs = await this.prisma.prospectingRun.findMany({
        where: {
          status: "active",
          nextAction: "lead_replied_continue_agent",
        },
        include: { funnel: true, stage: true },
        take: 5, // Processa aos poucos
      });

      for (const run of runs) {
        await this.handleAgentResponse(run);
      }
    } catch (error) {
      console.error("[SdrAgentWorker] Erro ao processar fila:", error);
    }
  }

  private async handleAgentResponse(run: any) {
    try {
      // Marca como processando para não pegar 2x
      await this.prisma.prospectingRun.update({
        where: { id: run.id },
        data: { nextAction: "processing_ai" },
      });

      const memory = run.qualification as any;
      const conversationContext = memory.agentMemory?.nextAgentContext || memory.agentMemory?.handoffContext || "Sem dossiê prévio.";
      const history = (memory.agentMemory?.conversationHistory || []).slice(-6).map((h: any) => 
        (h.aiMessage ? `[SDR]: ${h.aiMessage}` : "") + (h.leadMessage ? `\n[Lead]: ${h.leadMessage}` : "")
      ).join("\n");
      const lastLeadMessage = memory.lastLeadMessage || "Olá";

      const systemPrompt = `Você é um SDR altamente persuasivo de Vendas B2B.
Sua missão principal é gerar interesse e agendar uma reunião comercial (Call) ou obter um "Sim" para continuar o assunto.
Se o lead fizer uma pergunta muito complexa técnica ou disser explicitamente que quer falar com um especialista, responda com algo breve e mude sua intenção para HUMAN_HANDOFF.

Contexto e Dossiê da Empresa que estamos abordando:
${conversationContext}

Histórico da Conversa:
${history}

Última mensagem do Lead:
${lastLeadMessage}

Regras:
1. Responda APENAS com a mensagem que vai ser enviada no WhatsApp. Nada mais.
2. Seja MUITO curto (no máximo 3 a 4 linhas). As pessoas não lêem textões no WhatsApp.
3. Se houver informações de que a empresa está com nota baixa no Google (abaixo de 4.0), sem site ou perdendo para concorrentes, USE ISSO como isca (Ex: "Notamos que a nota do Google de vocês pode estar perdendo clientes para o concorrente... Posso mandar o raio-x que nossa IA fez?").
4. Termine com UMA pergunta para engajar.
5. Se você perceber que ele quer uma call ou detalhes técnicos que só um humano pode dar, inicie a mensagem com a tag secreta: [HANDOFF] e depois escreva a mensagem avisando que um especialista vai chamar.
`;

      // Chamada para Groq (Llama 3)
      const groqResp = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.5,
          max_tokens: 300,
        },
        { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
      ).catch(() => null);

      let aiResponse = groqResp?.data?.choices?.[0]?.message?.content?.trim() || "Perdão, estou com uma instabilidade. Podemos falar em breve?";
      let nextAction = "wait_lead_reply";
      let status = "active";

      if (aiResponse.includes("[HANDOFF]")) {
        aiResponse = aiResponse.replace("[HANDOFF]", "").trim();
        nextAction = "human_handoff";
        status = "human_handoff";
      }

      // Delay cognitivo simulando digitação (de 5 a 15 segundos)
      const delayMs = Math.floor(Math.random() * 10000) + 5000;
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // Dispara a mensagem para a Bridge do WhatsApp
      const channel = await this.prisma.channel.findFirst({
        where: { provider: "WHATS_MEOW", isActive: true, inbox: { organizationId: run.organizationId } },
      });

      let bridgeMessageId = null;
      if (channel) {
        const phone = run.leadPhone.replace(/\\D/g, "") + "@s.whatsapp.net";
        const bridge = await callBridge(`/sessions/${channel.id}/send`, {
          channelId: channel.id,
          to: phone,
          message: aiResponse,
        }).catch(err => {
          console.error("[SdrAgentWorker] Erro ao enviar mensagem bridge:", err);
          return null;
        });
        bridgeMessageId = bridge?.messageId || null;
      }

      // Atualiza memória do Run
      const newMemory = mergeProspectingAgentMemory(run.qualification, {
        currentStage: run.stage,
        nextStage: run.stage,
        aiMessage: aiResponse,
        status: status,
        nextAction: nextAction,
        summary: `Respondeu com: ${aiResponse.slice(0, 50)}...`,
        messageId: bridgeMessageId,
      });

      await this.prisma.prospectingRun.update({
        where: { id: run.id },
        data: {
          status,
          nextAction,
          lastContactAt: new Date(),
          qualification: newMemory,
        },
      });

    } catch (err) {
      console.error("[SdrAgentWorker] Erro crítico no handler:", err);
      // Retorna para o estado anterior em caso de erro para tentar novamente depois
      await this.prisma.prospectingRun.update({
        where: { id: run.id },
        data: { nextAction: "lead_replied_continue_agent" },
      }).catch(() => {});
    }
  }
}

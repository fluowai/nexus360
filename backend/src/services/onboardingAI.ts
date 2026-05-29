import { PrismaClient } from "@prisma/client";

interface OnboardingAnswers {
  businessName: string;
  businessType: string;
  targetAudience: string;
  averageTicket: number | null;
  salesCycle: string | null;
  needsMeeting: boolean;
  needsProposal: boolean;
  needsContract: boolean;
  hasRecurrence: boolean;
  leadChannels: string[];
  hasSdr: boolean;
  hasCloser: boolean;
  hasPostSales: boolean;
  painPoints: string | null;
  biggestProblem: string | null;
  deliveryProcess: string | null;
  hasOnboarding: boolean;
  hasChecklist: boolean;
  hasRenewal: boolean;
  hasUpsell: boolean;
}

interface AiDiagnosis {
  recommendedTemplate: string;
  templateLabel: string;
  pipelineName: string;
  stages: { name: string; order: number; probability: number; isDefault: boolean; color?: string }[];
  customFields: { name: string; key: string; type: string; options?: string[]; model: string }[];
  tasks: { title: string; description?: string; daysAfterStage?: number; stageName?: string }[];
  scripts: { name: string; text: string; stage?: string }[];
  playbook: { title: string; content: string }[];
  summary: string;
}

export class OnboardingAIService {
  constructor(private prisma: PrismaClient) {}

  private buildPrompt(answers: OnboardingAnswers): string {
    return `Você é um Arquiteto Comercial Sênior especializado em configurar CRMs para diferentes modelos de negócio.

Baseado nas respostas abaixo sobre a empresa, gere uma configuração completa de ambiente comercial.

## Dados da Empresa
- Nome: ${answers.businessName}
- Tipo de negócio: ${answers.businessType}
- Público-alvo: ${answers.targetAudience}
- Ticket médio: ${answers.averageTicket ? `R$ ${answers.averageTicket}` : "Não informado"}
- Ciclo de venda: ${answers.salesCycle || "Não informado"}
- Precisa de reunião: ${answers.needsMeeting ? "Sim" : "Não"}
- Precisa de proposta: ${answers.needsProposal ? "Sim" : "Não"}
- Precisa de contrato: ${answers.needsContract ? "Sim" : "Não"}
- Tem recorrência: ${answers.hasRecurrence ? "Sim" : "Não"}
- Canais de captação: ${answers.leadChannels.join(", ")}
- Tem SDR: ${answers.hasSdr ? "Sim" : "Não"}
- Tem Closer: ${answers.hasCloser ? "Sim" : "Não"}
- Tem pós-venda: ${answers.hasPostSales ? "Sim" : "Não"}
- Dores/Pontos críticos: ${answers.painPoints || "Não informado"}
- Maior problema comercial: ${answers.biggestProblem || "Não informado"}
- Processo de entrega: ${answers.deliveryProcess || "Não informado"}
- Tem onboarding: ${answers.hasOnboarding ? "Sim" : "Não"}
- Tem checklist: ${answers.hasChecklist ? "Sim" : "Não"}
- Tem renovação: ${answers.hasRenewal ? "Sim" : "Não"}
- Tem upsell: ${answers.hasUpsell ? "Sim" : "Não"}

## Instruções

Com base nessas informações, determine qual template de operação comercial se encaixa melhor:

1. "venda-consultiva" — Para consultorias, assessorias, serviços premium, alto ticket. Funil: Lead Recebido > Qualificação > Diagnóstico > Proposta Enviada > Negociação > Fechado > Onboarding
2. "agencia-marketing" — Para agências de marketing, mídia, social media. Funil: Lead Recebido > Auditoria > Call Estratégica > Proposta > Fechamento > Onboarding > Retenção
3. "treinamento-educacao" — Para empresas de treinamento, cursos, escolas. Funil: Interessado > Qualificação > Inscrição > Pagamento > Turma > Pós-treinamento
4. "servicos-locais" — Para serviços locais, clínicas, escritórios. Funil: Solicitação > Orçamento > Agendamento > Execução > Pagamento > Avaliação
5. "b2b-comercial" — Para B2B, SaaS, tecnologia, fornecedores. Funil: Prospecção > Conexão > Qualificação > Reunião > Proposta > Follow-up > Contrato > Implantação

Retorne APENAS um JSON válido (sem markdown, sem comentários) com esta estrutura exata:
{
  "recommendedTemplate": "slug-do-template",
  "templateLabel": "Nome do Template",
  "pipelineName": "Nome do Funil",
  "summary": "Resumo de 2-3 linhas explicando a escolha",
  "stages": [
    { "name": "Nome da Etapa", "order": 0, "probability": 10, "isDefault": false, "color": "#3B82F6" }
  ],
  "customFields": [
    { "name": "Nome do Campo", "key": "nome_do_campo", "type": "TEXT", "model": "OPPORTUNITY" }
  ],
  "tasks": [
    { "title": "Título da Tarefa", "description": "Descrição", "daysAfterStage": 2, "stageName": "Nome da Etapa" }
  ],
  "scripts": [
    { "name": "Nome do Script", "text": "Texto do script com {placeholders}", "stage": "Nome da Etapa" }
  ],
  "playbook": [
    { "title": "Título do tópico", "content": "Conteúdo explicativo" }
  ]
}`;
  }

  async generateDiagnosis(answers: OnboardingAnswers, orgId: string, userId?: string): Promise<AiDiagnosis> {
    const prompt = this.buildPrompt(answers);
    const startTime = Date.now();

    try {
      const { groqKey } = await this.getOrgAIKeys(orgId);
      const model = "llama-3.3-70b-versatile";

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      const diagnosis = JSON.parse(content) as AiDiagnosis;
      const durationMs = Date.now() - startTime;

      await this.prisma.aiLog.create({
        data: {
          organizationId: orgId,
          userId: userId,
          agentType: "diagnosis",
          prompt,
          response: content,
          model,
          tokensIn: data.usage?.prompt_tokens || 0,
          tokensOut: data.usage?.completion_tokens || 0,
          durationMs,
          success: true,
        },
      });

      return diagnosis;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      await this.prisma.aiLog.create({
        data: {
          organizationId: orgId,
          userId: userId,
          agentType: "diagnosis",
          prompt,
          response: error.message,
          model: "llama-3.3-70b-versatile",
          durationMs,
          success: false,
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  async applyDiagnosis(orgId: string, diagnosis: AiDiagnosis, userId?: string): Promise<void> {
    const pipeline = await this.prisma.pipeline.create({
      data: {
        name: diagnosis.pipelineName,
        organizationId: orgId,
        type: "SALES",
        stages: {
          create: diagnosis.stages.map((s) => ({
            name: s.name,
            order: s.order,
            probability: s.probability,
            isDefault: s.isDefault,
            color: s.color || "#3B82F6",
          })),
        },
      },
    });

    const defaultStage = diagnosis.stages.find((s) => s.isDefault) || diagnosis.stages[0];

    const tasksToCreate = diagnosis.tasks.map((t) => ({
      title: t.title,
      description: t.description || null,
      status: "pendente",
      priority: "media",
      organizationId: orgId,
      assignedToId: userId || null,
    }));

    for (const task of tasksToCreate) {
      await this.prisma.task.create({ data: task });
    }

    for (const field of diagnosis.customFields) {
      const key = field.key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      await this.prisma.customField.create({
        data: {
          organizationId: orgId,
          name: field.name,
          key,
          type: field.type,
          options: field.options || undefined,
          model: field.model,
        },
      });
    }
  }

  private async getOrgAIKeys(orgId: string): Promise<{ groqKey: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { groqKey: true },
    });
    const groqKey = org?.groqKey || process.env.GROQ_API_KEY || "";
    if (!groqKey) {
      throw new Error("GROQ_API_KEY não configurada para esta organização");
    }
    return { groqKey };
  }
}

import { PrismaClient } from "@prisma/client";

type RoutingTarget = "SDR" | "BDR" | "CLOSER";

type RoutingRule = {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";
  value: any;
  target: RoutingTarget;
  scoreMin?: number;
  scoreMax?: number;
};

type IcpField = {
  key: string;
  label: string;
  type: "text" | "email" | "phone" | "number" | "select" | "multi_select" | "boolean" | "textarea";
  required: boolean;
  options?: string[];
  order: number;
  weight?: number;
  scoreMap?: Record<string, number>;
};

type FormAnswers = Record<string, any>;

function getScoreForField(field: IcpField, value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  if (field.weight === undefined || field.weight === 0) return 0;
  if (field.scoreMap) {
    const strVal = String(value).trim();
    return field.scoreMap[strVal] ?? 0;
  }
  if (field.type === "boolean") {
    return value === true ? field.weight : 0;
  }
  if (field.type === "number" && typeof value === "number") {
    return Math.min(value, field.weight);
  }
  return field.weight;
}

function calculateScore(fields: IcpField[], answers: FormAnswers): { score: number; maxScore: number; scorePercent: number } {
  let score = 0;
  let maxScore = 0;
  for (const field of fields) {
    if (field.weight) maxScore += field.weight;
    score += getScoreForField(field, answers[field.key]);
  }
  const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return { score, maxScore, scorePercent };
}

function findRoutingTarget(rules: RoutingRule[], answers: FormAnswers, score: number): { target: RoutingTarget; reason: string } | null {
  for (const rule of rules) {
    if (rule.scoreMin !== undefined && score < rule.scoreMin) continue;
    if (rule.scoreMax !== undefined && score > rule.scoreMax) continue;
    const value = answers[rule.field];
    let matched = false;
    switch (rule.operator) {
      case "eq": matched = value === rule.value; break;
      case "neq": matched = value !== rule.value; break;
      case "gt": matched = Number(value) > Number(rule.value); break;
      case "gte": matched = Number(value) >= Number(rule.value); break;
      case "lt": matched = Number(value) < Number(rule.value); break;
      case "lte": matched = Number(value) <= Number(rule.value); break;
      case "in": matched = Array.isArray(rule.value) && rule.value.includes(value); break;
      case "contains": matched = String(value).toLowerCase().includes(String(rule.value).toLowerCase()); break;
    }
    if (matched) {
      return { target: rule.target, reason: `Regra: ${rule.field} ${rule.operator} ${rule.value} → ${rule.target}` };
    }
  }
  return null;
}

function findAvailableUser(users: { id: string; department: string | null }[], target: RoutingTarget): { id: string } | null {
  const candidates = users.filter((u) => u.department === target);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export async function submitQualification(
  prisma: PrismaClient,
  formId: string,
  data: { name: string; email: string; phone?: string; notes?: string; answers: FormAnswers },
) {
  const form = await prisma.qualificationForm.findUnique({
    where: { id: formId },
    include: { organization: { include: { users: { select: { id: true, department: true } } } } },
  });
  if (!form || !form.isActive) throw new Error("Formulário não encontrado ou inativo");

  const fields = form.icpFields as IcpField[];
  const rules = form.routingRules ? (form.routingRules as RoutingRule[]) : [];
  const { score, maxScore, scorePercent } = calculateScore(fields, data.answers);
  const routing = findRoutingTarget(rules, data.answers, score);

  let leadId: string | null = null;
  if (form.createLead) {
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        notes: data.notes || null,
        organizationId: form.organizationId,
        status: routing ? "qualificado" : "pending",
        score,
        temperature: scorePercent >= 70 ? "HOT" : scorePercent >= 40 ? "WARM" : "COLD",
        pipelineId: form.leadPipelineId || null,
        stageId: form.leadStageId || null,
      },
    });
    leadId = lead.id;
  }

  const target = routing?.target || null;
  const routedUser = target ? findAvailableUser(form.organization.users, target) : null;

  const submission = await prisma.qualificationSubmission.create({
    data: {
      formId,
      organizationId: form.organizationId,
      leadId,
      leadName: data.name,
      leadEmail: data.email,
      leadPhone: data.phone || null,
      leadNotes: data.notes || null,
      answers: data.answers as any,
      score,
      maxScore,
      scorePercent,
      status: routing ? "approved" : "pending",
      routedTo: target,
      routedToUserId: routedUser?.id || null,
      routedAt: routing ? new Date() : null,
      routeReason: routing?.reason || null,
    },
  });

  return { submission, form: { allowScheduling: form.allowScheduling, schedulingMessage: form.schedulingMessage }, routed: !!routing, target };
}

export async function getQualificationFormPublic(prisma: PrismaClient, formId: string) {
  const form = await prisma.qualificationForm.findUnique({
    where: { id: formId, isActive: true },
    select: { id: true, name: true, description: true, icpFields: true, allowScheduling: true, schedulingMessage: true },
  });
  return form;
}

export async function listQualificationForms(prisma: PrismaClient, organizationId: string) {
  return prisma.qualificationForm.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
}

export async function listSubmissions(prisma: PrismaClient, organizationId: string, filters?: { status?: string; formId?: string; routedTo?: string }) {
  const where: any = { organizationId };
  if (filters?.status) where.status = filters.status;
  if (filters?.formId) where.formId = filters.formId;
  if (filters?.routedTo) where.routedTo = filters.routedTo;
  return prisma.qualificationSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { form: { select: { name: true } } },
  });
}

export async function scheduleQualification(
  prisma: PrismaClient,
  submissionId: string,
  data: { scheduledTo: string; notes?: string; userId?: string },
) {
  const submission = await prisma.qualificationSubmission.findUnique({
    where: { id: submissionId },
    include: { form: true },
  });
  if (!submission) throw new Error("Submissão não encontrada");
  if (submission.status !== "approved") throw new Error("Lead precisa estar aprovado para agendar");

  const scheduledDate = new Date(data.scheduledTo);
  const target = submission.routedTo || "GERAL";

  const agenda = await prisma.agenda.findFirst({
    where: { organizationId: submission.organizationId, type: target, OR: [{ type: target }, { type: "GERAL" }] },
  });

  const event = await prisma.calendarEvent.create({
    data: {
      title: `${target}: ${submission.leadName}`,
      description: data.notes || submission.leadNotes || `Qualificação via formulário - Score: ${submission.scorePercent}%`,
      startDate: scheduledDate,
      endDate: new Date(scheduledDate.getTime() + 60 * 60 * 1000),
      type: "QUALIFICATION",
      status: "scheduled",
      organizationId: submission.organizationId,
      userId: data.userId || submission.routedToUserId || null,
      agendaId: agenda?.id || null,
      leadId: submission.leadId || undefined,
    },
  });

  return prisma.qualificationSubmission.update({
    where: { id: submissionId },
    data: {
      status: "scheduled",
      scheduledTo: scheduledDate,
      calendarEventId: event.id,
      schedulingNotes: data.notes || null,
    },
  });
}

export async function getTeamAvailability(prisma: PrismaClient, organizationId: string) {
  const users = await prisma.user.findMany({
    where: { organizationId, department: { in: ["SDR", "BDR", "CLOSER"] }, status: "ACTIVE" },
    select: { id: true, name: true, department: true },
  });

  const agendas = await prisma.agenda.findMany({
    where: { organizationId, type: { in: ["SDR", "BDR", "CLOSER", "GERAL"] } },
    include: { events: { where: { startDate: { gte: new Date() } }, orderBy: { startDate: "asc" } } },
  });

  return { users, agendas };
}

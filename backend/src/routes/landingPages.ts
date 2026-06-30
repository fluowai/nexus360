import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { getPagination } from "../utils/pagination.js";
import { sanitizeBody } from "../utils/sanitizer.js";
import { auditFromRequest } from "../utils/auditLogger.js";
import { emitAutomationEvent } from "../workers/automationWorker.js";
import { runGovernedAiText } from "../services/aiExecution.js";
import { getOrgAIKeys } from "../utils/aiKeys.js";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function isValidFutureDate(date: Date): boolean {
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now() + 5 * 60 * 1000;
}

async function resolveLandingScheduleOwner(prisma: PrismaClient, organizationId: string) {
  const [agenda, user] = await Promise.all([
    prisma.agenda.findFirst({
      where: {
        organizationId,
        OR: [
          { name: { contains: "Closer", mode: "insensitive" } },
          { name: { contains: "V5", mode: "insensitive" } },
          { name: { contains: "TGA", mode: "insensitive" } },
          { name: { contains: "SDR", mode: "insensitive" } },
          { name: { contains: "Comercial", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findFirst({
      where: {
        organizationId,
        status: "ACTIVE",
        OR: [
          { name: { contains: "Closer", mode: "insensitive" } },
          { department: { contains: "Closer", mode: "insensitive" } },
          { department: { contains: "Comercial", mode: "insensitive" } },
          { name: { contains: "Ana Cristina", mode: "insensitive" } },
          { department: { contains: "SDR", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);

  const resolvedAgenda = agenda || await prisma.agenda.create({
    data: {
      name: "Agenda Closer - Landing Pages",
      color: "#7b2cff",
      organizationId,
    },
  });

  return {
    agendaId: resolvedAgenda.id,
    userId: user?.id || null,
  };
}

function ensureUniqueSlug(prisma: PrismaClient, baseSlug: string, orgId: string, excludeId?: string): Promise<string> {
  const trySlug = async (slug: string, attempt: number): Promise<string> => {
    const existing = await prisma.landingPage.findUnique({ where: { slug } });
    if (!existing || (excludeId && existing.id === excludeId)) return slug;
    const newSlug = `${baseSlug}-${attempt}`;
    return trySlug(newSlug, attempt + 1);
  };
  return trySlug(baseSlug, 1);
}

function buildLPPrompt(wizardData: any, themeInput: any): string {
  return `Você é um copywriter especialista em landing pages de alta conversão. Gere uma landing page completa em JSON.

DADOS DA OFERTA:
- Empresa: ${wizardData.companyName || "Não informado"}
- Segmento: ${wizardData.segment || "Não informado"}
- Produto/Serviço: ${wizardData.product || "Não informado"}
- Público-alvo: ${wizardData.targetAudience || "Não informado"}
- Cidade/Região: ${wizardData.city || "Não informado"}
- Principal dor: ${wizardData.painPoint || "Não informado"}
- Promessa principal: ${wizardData.promise || "Não informado"}
- Benefícios: ${wizardData.benefits || "Não informado"}
- Provas sociais: ${wizardData.socialProof || "Não informado"}
- Diferenciais: ${wizardData.differentials || "Não informado"}
- Objeções: ${wizardData.objections || "Não informado"}
- CTA principal: ${wizardData.cta || "Não informado"}
- Tom de voz: ${wizardData.tone || "persuasivo profissional"}
- Objetivo: ${wizardData.objective || "captar lead"}

CORES DA MARCA:
- Primária: ${themeInput?.primaryColor || "#3B82F6"}
- Secundária: ${themeInput?.secondaryColor || "#1E40AF"}

IMPORTANTE: gere imagens hero com placeholders realistas usando https://picsum.photos/seed/{palavra-chave}/1200/600. Escolha seeds relacionadas ao tema.

Retorne APENAS um JSON válido com esta estrutura exata (sem markdown, sem \`\`\`json):
{
  "metaTitle": "SEO title otimizada (máx 60 chars)",
  "metaDescription": "Meta description otimizada (máx 160 chars)",
  "sections": [
    {
      "type": "HeroBlock",
      "props": {
        "headline": "Headline forte e persuasiva",
        "subheadline": "Subheadline complementar",
        "ctaText": "Texto do botão CTA",
        "ctaUrl": "#form",
        "imageUrl": "https://picsum.photos/seed/{palavra-chave}/1200/600",
        "alignment": "center",
        "visible": true
      }
    },
    {
      "type": "ProblemBlock",
      "props": { "title": "Título do problema", "description": "Descrição da dor do cliente", "visible": true }
    },
    {
      "type": "SolutionBlock",
      "props": { "title": "Título da solução", "description": "Descrição da solução", "visible": true }
    },
    {
      "type": "BenefitsBlock",
      "props": {
        "title": "Benefícios",
        "items": [
          { "icon": "Check", "title": "Benefício 1", "description": "Descrição" },
          { "icon": "Check", "title": "Benefício 2", "description": "Descrição" },
          { "icon": "Check", "title": "Benefício 3", "description": "Descrição" }
        ],
        "visible": true
      }
    },
    {
      "type": "HowItWorksBlock",
      "props": {
        "title": "Como funciona",
        "steps": [
          { "step": "1", "title": "Passo 1", "description": "Descrição" },
          { "step": "2", "title": "Passo 2", "description": "Descrição" },
          { "step": "3", "title": "Passo 3", "description": "Descrição" }
        ],
        "visible": true
      }
    },
    {
      "type": "SocialProofBlock",
      "props": {
        "title": "Quem já confia",
        "testimonials": [
          { "name": "Nome", "role": "Cargo", "text": "Depoimento real", "photoUrl": "" }
        ],
        "visible": true
      }
    },
    {
      "type": "FAQBlock",
      "props": {
        "title": "Perguntas frequentes",
        "items": [
          { "question": "Pergunta?", "answer": "Resposta" },
          { "question": "Pergunta?", "answer": "Resposta" }
        ],
        "visible": true
      }
    },
    {
      "type": "CTABlock",
      "props": {
        "headline": "CTA final persuasivo",
        "subheadline": "Texto de apoio",
        "ctaText": "Quero contratar",
        "ctaUrl": "#form",
        "visible": true
      }
    },
    {
      "type": "FormBlock",
      "props": {
        "title": "Solicite um contato",
        "description": "Preencha o formulário",
        "buttonText": "Enviar",
        "fields": ["nome", "telefone", "email", "mensagem"],
        "visible": true
      }
    }
  ],
  "seoSlug": "${generateSlug(wizardData.companyName || wizardData.product || "landing-page")}"
}`;
}

function cleanJSONResponse(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function parseGeneratedContent(rawContent: string): any {
  const cleaned = cleanJSONResponse(rawContent);
  return JSON.parse(cleaned);
}

async function callGemini(prompt: string, geminiKey: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini: ${response.status} ${err.slice(0, 200)}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callAiCore(prisma: PrismaClient, prompt: string, orgId: string, userId?: string): Promise<string> {
  const result = await runGovernedAiText(prisma, {
    system: "lp-copywriter",
    organizationId: orgId,
    userId,
    agentKey: "lp-copywriter",
    message: prompt,
    temperature: 0.7,
    maxTokens: 8192,
  });
  return result.result.response || "";
}

async function callOpenAI(prompt: string, openaiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é um copywriter especialista em landing pages. Responda apenas com JSON válido." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: "json_object" }
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI: ${response.status} ${err.slice(0, 200)}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function generateWithFallback(prisma: PrismaClient, prompt: string, keys: any, orgId: string, userId?: string): Promise<string> {
  const provider = keys.aiProvider || "gemini";
  const errors: string[] = [];

  const ordered: { name: string; fn: () => Promise<string> }[] = [];

  ordered.push({ name: "AI Core", fn: () => callAiCore(prisma, prompt, orgId, userId) });
  if (keys.geminiKey) ordered.push({ name: "Gemini", fn: () => callGemini(prompt, keys.geminiKey) });
  if ((keys.openaiKey || keys.chatgptKey) && provider !== "openai") ordered.push({ name: "OpenAI", fn: () => callOpenAI(prompt, keys.openaiKey || keys.chatgptKey) });

  for (const { name, fn } of ordered) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err: any) {
      errors.push(`${name}: ${err.message}`);
      console.warn(`[LP_FALLBACK] ${name} falhou, tentando próximo...`, err.message);
    }
  }

  throw new Error(`Todos os providers falharam: ${errors.join(" | ")}`);
}

export function landingPageRoutes(prisma: PrismaClient) {
  const router = Router();

  router.post("/generate-content", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { wizardData, theme: themeInput } = req.body;
      if (!wizardData) return res.status(400).json({ error: "Dados do wizard são obrigatórios" });

      const keys = await getOrgAIKeys(prisma, orgId);
      const prompt = buildLPPrompt(wizardData, themeInput);

      const rawContent = await generateWithFallback(prisma, prompt, keys, orgId, req.user?.id);

      let parsed: any;
      try {
        parsed = parseGeneratedContent(rawContent);
      } catch {
        return res.status(500).json({ error: "Resposta da IA em formato inválido. Tente novamente.", raw: rawContent.slice(0, 500) });
      }

      const slug = await ensureUniqueSlug(prisma, parsed.seoSlug || generateSlug(wizardData.companyName || "lp"), orgId);
      const companyName = wizardData.companyName || wizardData.product || "Landing Page";
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const heroSection = (parsed.sections || []).find((s: any) => s.type === "HeroBlock");
      const heroImage = heroSection?.props?.imageUrl || "";

      const page = await prisma.landingPage.create({
        data: {
          name: companyName,
          slug,
          organizationId: orgId,
          status: "draft",
          metaTitle: parsed.metaTitle || companyName,
          metaDescription: parsed.metaDescription || "",
          headline: heroSection?.props?.headline || "",
          heroImage,
          sections: parsed.sections || [],
          wizardData,
          theme: themeInput || {},
        },
      });

      res.json({
        id: page.id,
        name: page.name,
        slug: page.slug,
        url: `${baseUrl}/lp/${page.slug}`,
        metaTitle: parsed.metaTitle || "",
        metaDescription: parsed.metaDescription || "",
        sections: parsed.sections || [],
        heroImage,
      });
    } catch (error: any) {
      console.error("[LP_GENERATE_ERROR]", error.message || error);
      res.status(500).json({ error: error.message || "Erro interno ao gerar landing page" });
    }
  });

  router.get("/", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { skip, take } = getPagination(req.query);
      const [pages, total] = await Promise.all([
        prisma.landingPage.findMany({
          where: { organizationId: orgId },
          orderBy: { updatedAt: "desc" },
          skip,
          take,
          select: {
            id: true, name: true, slug: true, status: true,
            views: true, submissions: true, conversionRate: true,
            metaTitle: true, metaDescription: true,
            theme: true, tracking: true,
            publishedAt: true, createdAt: true, updatedAt: true,
            headline: true, heroImage: true,
          },
        }),
        prisma.landingPage.count({ where: { organizationId: orgId } }),
      ]);

      res.json({ pages, total });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { name, wizardData, sections, theme, tracking, metaTitle, metaDescription, formFields } = req.body;

      if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

      const baseSlug = generateSlug(name);
      const slug = await ensureUniqueSlug(prisma, baseSlug, orgId);

      const page = await prisma.landingPage.create({
        data: {
          name,
          slug,
          organizationId: orgId,
          status: "draft",
          metaTitle: metaTitle || name,
          metaDescription: metaDescription || "",
          sections: sections || undefined,
          wizardData: wizardData || undefined,
          theme: theme || undefined,
          tracking: tracking || undefined,
          formFields: formFields || undefined,
        },
      });

      auditFromRequest(req, "CREATE", "LandingPage", page.id);
      res.status(201).json(page);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const page = await prisma.landingPage.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { form: true },
      });

      if (!page) return res.status(404).json({ error: "Landing page não encontrada" });
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const existing = await prisma.landingPage.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Landing page não encontrada" });

      const { name, sections, theme, tracking, metaTitle, metaDescription, formFields, status, headline, subheadline, heroImage } = req.body;

      const data: any = {};
      if (name !== undefined) data.name = name;
      if (sections !== undefined) data.sections = sections;
      if (theme !== undefined) data.theme = theme;
      if (tracking !== undefined) data.tracking = tracking;
      if (metaTitle !== undefined) data.metaTitle = metaTitle;
      if (metaDescription !== undefined) data.metaDescription = metaDescription;
      if (formFields !== undefined) data.formFields = formFields;
      if (headline !== undefined) data.headline = headline;
      if (subheadline !== undefined) data.subheadline = subheadline;
      if (heroImage !== undefined) data.heroImage = heroImage;
      if (status !== undefined) data.status = status;

      if (name !== undefined && name !== existing.name) {
        data.slug = await ensureUniqueSlug(prisma, generateSlug(name), orgId, existing.id);
      }

      const page = await prisma.landingPage.update({
        where: { id: req.params.id },
        data,
      });

      auditFromRequest(req, "UPDATE", "LandingPage", page.id);
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const existing = await prisma.landingPage.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Landing page não encontrada" });

      await prisma.landingPage.delete({ where: { id: req.params.id } });
      auditFromRequest(req, "DELETE", "LandingPage", req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/publish", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const existing = await prisma.landingPage.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Landing page não encontrada" });

      if (!existing.sections) {
        return res.status(400).json({ error: "A página precisa ter seções antes de publicar" });
      }

      const page = await prisma.landingPage.update({
        where: { id: req.params.id },
        data: {
          status: "published",
          publishedAt: new Date(),
        },
      });

      auditFromRequest(req, "PUBLISH", "LandingPage", page.id);
      emitAutomationEvent("landing_page.published", { organizationId: orgId, pageId: page.id, slug: page.slug });
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/unpublish", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const existing = await prisma.landingPage.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Landing page não encontrada" });

      const page = await prisma.landingPage.update({
        where: { id: req.params.id },
        data: { status: "draft", publishedAt: null },
      });

      auditFromRequest(req, "UNPUBLISH", "LandingPage", page.id);
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/duplicate", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const original = await prisma.landingPage.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!original) return res.status(404).json({ error: "Landing page não encontrada" });

      const baseSlug = generateSlug(`${original.name}-copia`);
      const slug = await ensureUniqueSlug(prisma, baseSlug, orgId);

      const page = await prisma.landingPage.create({
        data: {
          name: `${original.name} (cópia)`,
          slug,
          organizationId: orgId,
          status: "draft",
          headline: original.headline,
          subheadline: original.subheadline,
          heroImage: original.heroImage,
          metaTitle: original.metaTitle,
          metaDescription: original.metaDescription,
          sections: original.sections as any,
          wizardData: original.wizardData as any,
          theme: original.theme as any,
          tracking: original.tracking as any,
          formFields: original.formFields as any,
        },
      });

      auditFromRequest(req, "DUPLICATE", "LandingPage", page.id);
      res.status(201).json(page);
    } catch (error) {
      next(error);
    }
  });

  // Public lead capture endpoint (no auth required)
  router.post("/:slug/lead", async (req, res, next) => {
    try {
      const page = await prisma.landingPage.findUnique({ where: { slug: req.params.slug } });
      if (!page) return res.status(404).json({ error: "Página não encontrada" });

      const { name, email, phone, message, utmSource, utmMedium, utmCampaign, quiz, score, scheduledAt, qualified } = req.body;
      if (!name || !email) return res.status(400).json({ error: "Nome e e-mail são obrigatórios" });

      const numericScore = Math.max(0, Math.min(100, Number(score) || 0));
      const quizData = quiz && typeof quiz === "object" ? quiz : {};
      const isQualified = Boolean(qualified) || numericScore >= 70;
      const requestedStart = scheduledAt ? new Date(scheduledAt) : null;
      const canSchedule = requestedStart && isValidFutureDate(requestedStart);
      const quizNotes = Object.keys(quizData).length
        ? `\n\nPre-diagnostico da landing page:\n${Object.entries(quizData).map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join("\n")}\nScore: ${numericScore}/100`
        : numericScore > 0
          ? `\n\nScore de pre-diagnostico: ${numericScore}/100`
          : "";

      const lead = await prisma.lead.create({
        data: {
          name,
          email,
          phone: phone || "",
          source: `landing-page:${page.slug}`,
          channel: "Landing Page",
          notes: `${message || ""}${quizNotes}`,
          organizationId: page.organizationId,
          status: isQualified ? "qualificado" : "novo",
          tags: `landing-page,${page.name},score:${numericScore},${isQualified ? "qualificado" : "nutricao"}`,
          temperature: numericScore >= 80 ? "HOT" : numericScore >= 55 ? "WARM" : "COLD",
          score: numericScore,
        },
      });

      await prisma.landingPage.update({
        where: { id: page.id },
        data: {
          submissions: { increment: 1 },
          conversionRate: page.views > 0 ? ((page.submissions + 1) / (page.views + 1)) * 100 : 0,
        },
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          title: `Lead: ${name} - ${page.name}`,
          description: `${message || ""}${quizNotes}`,
          organizationId: page.organizationId,
          clientId: "",
          assignedToId: undefined,
          stage: "qualificacao",
          probability: isQualified ? 70 : 25,
          temperature: numericScore >= 80 ? "HOT" : numericScore >= 55 ? "WARM" : "COLD",
          score: numericScore,
          value: 0,
        },
      }).catch(() => {});

      let calendarEvent = null;
      if (canSchedule && requestedStart) {
        const { agendaId, userId } = await resolveLandingScheduleOwner(prisma, page.organizationId);
        calendarEvent = await prisma.calendarEvent.create({
          data: {
            title: `Call de diagnostico - ${name}`,
            description: [
              `Lead qualificado pela landing page: ${page.name}`,
              `Score: ${numericScore}/100`,
              phone ? `WhatsApp: ${phone}` : null,
              email ? `E-mail: ${email}` : null,
              message ? `Observacao: ${message}` : null,
              Object.keys(quizData).length ? `Quiz: ${JSON.stringify(quizData)}` : null,
            ].filter(Boolean).join("\n"),
            startDate: requestedStart,
            endDate: addMinutes(requestedStart, 30),
            allDay: false,
            type: "reunion",
            status: "scheduled",
            reminder: 30,
            leadId: lead.id,
            userId: userId || undefined,
            agendaId,
            organizationId: page.organizationId,
          },
        });
      }

      emitAutomationEvent("landing_page.lead", {
        organizationId: page.organizationId,
        pageId: page.id,
        slug: page.slug,
        leadId: lead.id,
        opportunityId: opportunity?.id,
        calendarEventId: calendarEvent?.id,
        score: numericScore,
        qualified: isQualified,
        utmSource,
        utmMedium,
        utmCampaign,
      });

      res.json({
        success: true,
        message: calendarEvent ? "Diagnostico agendado com sucesso!" : "Lead cadastrado com sucesso!",
        leadId: lead.id,
        score: numericScore,
        qualified: isQualified,
        calendarEvent,
      });
    } catch (error) {
      next(error);
    }
  });

  // Public page data endpoint (no auth required)
  router.get("/public/:slug", async (req, res, next) => {
    try {
      const page = await prisma.landingPage.findUnique({
        where: { slug: req.params.slug },
        select: {
          id: true, name: true, slug: true, headline: true, subheadline: true,
          heroImage: true, sections: true, theme: true, tracking: true,
          metaTitle: true, metaDescription: true, formFields: true,
          status: true, views: true, organizationId: true,
        },
      });

      if (!page || page.status !== "published") {
        return res.status(404).json({ error: "Página não encontrada" });
      }

      await prisma.landingPage.update({
        where: { id: page.id },
        data: { views: { increment: 1 } },
      });

      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

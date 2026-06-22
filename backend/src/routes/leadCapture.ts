import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { LeadCaptureService } from "../modules/lead-capture/lead-capture.service.js";
import { LeadAiService } from "../modules/lead-capture/lead-ai.service.js";
import { CompanyResolverService } from "../services/companyResolver.js";
import { emitAutomationEvent } from "../workers/automationWorker.js";
import { ensureDefaultSalesPipeline, getInitialSalesStage } from "../services/crmPipeline.js";
import { pickBestDecisionMaker, upsertDecisionMakersFromLead } from "../services/prospectingAutomation.js";

function normalizeDocument(value: unknown) {
  if (typeof value !== "string") return value;
  const digits = value.replace(/\D/g, "");
  return digits || null;
}

export function leadCaptureRoutes(prisma: PrismaClient) {
  const router = Router();
  const leadService = new LeadCaptureService(prisma);
  const aiService = new LeadAiService(prisma);

  const canViewCapturedLeads = (req: AuthRequest, res: any, next: any) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Nao autenticado." });

    if (["SUPER_ADMIN", "ORG_ADMIN", "AGENCY_ADMIN"].includes(user.role)) {
      return next();
    }

    const permissions = user.permissions || {};
    const hasLeadsView =
      permissions.leads === "*" ||
      (Array.isArray(permissions.leads) && permissions.leads.includes("view"));
    const hasProspectingAccess =
      permissions.prospecting === "*" ||
      (Array.isArray(permissions.prospecting) &&
        (permissions.prospecting.includes("view") || permissions.prospecting.includes("capture")));

    if (hasLeadsView || hasProspectingAccess) return next();

    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Sem permissao para visualizar leads capturados.",
    });
  };

  // Search Leads
  router.post("/search", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const result = await leadService.captureLeads({
        ...req.body,
        tenantId: orgId,
        userId: req.user?.id
      });
      res.json(result);
    } catch (error: any) {
      console.error("[LEAD_CAPTURE_ERROR] Falha na busca de leads:", error?.response?.data || error?.message || error);
      const errorMsg = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Erro desconhecido na captação';
      res.status(500).json({ 
        error: errorMsg,
        details: error?.response?.data || undefined
      });
    }
  });

  // Run AI Diagnosis
  router.post("/leads/:id/analyze", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const result = await aiService.runDiagnosis(req.params.id, orgId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Run AI Dossier
  router.post("/leads/:id/dossier", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const result = await aiService.generateDossier(req.params.id, orgId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Enrich Lead (CNPJ & Owners)
  router.post("/leads/:id/enrich", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const result = await aiService.enrichLead(req.params.id, orgId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/leads/:id/validate-company", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const result = await aiService.enrichLead(req.params.id, orgId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/leads/:id/decision-makers", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const lead = await prisma.capturedLead.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      const decisionMakers = await prisma.prospectingDecisionMaker.findMany({
        where: { organizationId: orgId, capturedLeadId: lead.id },
        orderBy: [{ isSelected: "desc" }, { priority: "asc" }, { confidenceScore: "desc" }],
      });
      res.json(decisionMakers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/leads/:id/decision-makers/refresh", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const lead = await prisma.capturedLead.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      const generated = await upsertDecisionMakersFromLead(prisma, lead);
      const selected = await pickBestDecisionMaker(prisma, lead);
      res.json({ generated, selected });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Scripts
  router.post("/leads/:id/scripts", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const result = await aiService.generateScripts(req.params.id, orgId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Resolve Company by name or CNPJ
  router.post("/resolve-company", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { serperApiKey: true, groqKey: true }
      });

      const resolver = new CompanyResolverService({
        serperApiKey: org?.serperApiKey || process.env.SERPER_API_KEY,
        groqApiKey: org?.groqKey || process.env.GROQ_API_KEY,
      });

      const result = await resolver.resolve({
        name: req.body.name,
        cnpj: req.body.cnpj,
      });

      res.json(result);
    } catch (error: any) {
      console.error("[RESOLVE_COMPANY_ERROR]", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Research Management (LinkedIn)
  router.post("/leads/:id/research-management", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const result = await aiService.researchManagement(req.params.id, orgId!);
      res.json(result);
    } catch (error: any) {
      console.error("[RESEARCH_MANAGEMENT_ROUTE_FALLBACK]", {
        leadId: req.params.id,
        orgId,
        error: error?.message
      });

      if (!orgId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const lead = await prisma.capturedLead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const fallbackNote = [
        lead.notes,
        `Pesquisa de decisores pendente: ${error?.message || "falha inesperada ao consultar dados externos."}`
      ].filter(Boolean).join("\n\n");

      const updated = await prisma.capturedLead.update({
        where: { id: lead.id },
        data: { notes: fallbackNote }
      });

      res.json(updated);
    }
  });

  // Send to CRM
  router.post("/leads/:id/send-to-crm", async (req: AuthRequest, res) => {
    try {
      // 1. Localizar o lead capturado (sem depender exclusivamente do orgId do token, caso seja admin)
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });

      const capturedLead = await prisma.capturedLead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });

      if (!capturedLead) return res.status(404).json({ error: "Lead não encontrado" });

      if (capturedLead.sentToCrm && capturedLead.crmLeadId) {
        return res.json(capturedLead);
      }

      if (capturedLead.cnpjStatus !== "validated") {
        return res.status(409).json({
          error: "CNPJ_NOT_VALIDATED",
          message: "Valide o CNPJ correto da empresa antes de enviar para o CRM.",
          cnpjStatus: capturedLead.cnpjStatus,
          cnpjMatchReason: capturedLead.cnpjMatchReason
        });
      }

      const targetOrgId = orgId;
      let { boardId, stageId } = req.body;

      const pipeline = await ensureDefaultSalesPipeline(prisma, targetOrgId, boardId || undefined);
      boardId = pipeline.id;
      if (!stageId || stageId === '') {
        stageId = getInitialSalesStage(pipeline)?.id;
      }
      if (!stageId) {
        return res.status(400).json({ error: "Pipeline sem etapa inicial configurada" });
      }

      // 3. Fallback para Estágio
      if (boardId) {
        const pipeline = await prisma.pipeline.findFirst({
          where: { id: boardId, organizationId: targetOrgId },
          select: { id: true }
        });
        if (!pipeline) return res.status(400).json({ error: "Pipeline invÃ¡lido para esta organizaÃ§Ã£o" });
      }

      if (stageId) {
        const stage = await prisma.pipelineStage.findFirst({
          where: { id: stageId, pipeline: { organizationId: targetOrgId, ...(boardId ? { id: boardId } : {}) } },
          select: { id: true }
        });
        if (!stage) return res.status(400).json({ error: "Etapa invÃ¡lida para esta organizaÃ§Ã£o" });
      }

      // 4. Criar o Lead no CRM
      const newLead = await prisma.lead.create({
        data: {
          name: capturedLead.businessName,
          email: capturedLead.email || "contato@empresa.com",
          phone: capturedLead.phoneNormalized || capturedLead.phone,
          status: "novo",
          organizationId: targetOrgId,
          pipelineId: boardId || undefined,
          stageId: stageId || undefined,
          cnpj: capturedLead.cnpj,
          owners: capturedLead.owners,
          managementTeam: capturedLead.managementTeam,
          aiDiagnosis: capturedLead.aiDiagnosis,
          score: Math.round(capturedLead.scoreOpportunity || 0),
          tags: capturedLead.category || undefined,
          source: capturedLead.provider || undefined,
          notes: `[Captação Elite - ${capturedLead.provider}]\n\nSITE: ${capturedLead.website || 'Não informado'}\n\nDIAGNÓSTICO IA:\n${capturedLead.aiDiagnosis || 'Não realizado'}\n\nEQUIPE DE GESTÃO (LINKEDIN):\n${capturedLead.managementTeam || 'Não pesquisado'}\n\nNOTAS ADICIONAIS:\n${capturedLead.notes || ''}`
        }
      });

      // 5. Criar cliente e oportunidade para aparecer no Kanban.
      const crmNotes = newLead.notes || "";
      const normalizedCnpj = normalizeDocument(capturedLead.cnpj) as string | null;
      let crmClient = normalizedCnpj
        ? await prisma.client.findFirst({ where: { organizationId: targetOrgId, cnpj: normalizedCnpj } })
        : null;

      if (!crmClient && capturedLead.email) {
        crmClient = await prisma.client.findFirst({
          where: { organizationId: targetOrgId, email: capturedLead.email, corporateName: capturedLead.businessName },
        });
      }

      if (!crmClient) {
        crmClient = await prisma.client.create({
          data: {
            corporateName: capturedLead.businessName,
            tradeName: capturedLead.businessName,
            cnpj: normalizedCnpj,
            email: capturedLead.email || "",
            phone: capturedLead.phoneNormalized || capturedLead.phone,
            website: capturedLead.website,
            address: capturedLead.address,
            city: capturedLead.city,
            state: capturedLead.state,
            segment: capturedLead.category,
            source: capturedLead.provider || "captacao",
            sourceDetail: capturedLead.sourceId || undefined,
            notes: crmNotes,
            tags: capturedLead.category || undefined,
            status: "prospect",
            organizationId: targetOrgId,
            assignedToId: req.user?.id,
          },
        });
      }

      await prisma.lead.update({
        where: { id: newLead.id },
        data: { clientId: crmClient.id, assignedToId: req.user?.id },
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          title: capturedLead.businessName,
          description: crmNotes,
          value: 0,
          estimatedValue: 0,
          organizationId: targetOrgId,
          clientId: crmClient.id,
          pipelineId: boardId,
          stageId,
          assignedToId: req.user?.id,
          stage: "qualificacao",
          score: Math.round(capturedLead.scoreOpportunity || 0),
          temperature: (capturedLead.scoreOpportunity || 0) >= 70 ? "HOT" : (capturedLead.scoreOpportunity || 0) >= 40 ? "WARM" : "COLD",
          customFields: {
            capturedLeadId: capturedLead.id,
            crmLeadId: newLead.id,
            provider: capturedLead.provider,
            category: capturedLead.category,
            googleMapsUrl: capturedLead.googleMapsUrl,
          },
        },
      });

      await prisma.activity.create({
        data: {
          organizationId: targetOrgId,
          type: "SYSTEM",
          description: `Lead captado "${capturedLead.businessName}" enviado para o Kanban`,
          userId: req.user?.id,
          contactId: newLead.id,
          companyId: crmClient.id,
          dealId: opportunity.id,
        },
      });

      // 6. Atualizar status da captacao.
      const updatedCapturedLead = await prisma.capturedLead.update({
        where: { id: req.params.id },
        data: { sentToCrm: true, crmLeadId: newLead.id }
      });

      emitAutomationEvent("lead.created", { organizationId: targetOrgId, leadId: newLead.id, lead: newLead });
      emitAutomationEvent("opportunity.created", { organizationId: targetOrgId, opportunityId: opportunity.id, opportunity });

      res.json(updatedCapturedLead); // Retornamos o captured lead atualizado para o frontend manter o estado consistente
    } catch (error: any) {
      console.error("[SEND_TO_CRM_ERROR]", {
        leadId: req.params.id,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        error: "Erro ao enviar para o CRM", 
        details: error.message 
      });
    }
  });

  // List Sources (Histórico de buscas)
  router.get("/sources", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const sources = await prisma.leadCaptureSource.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(sources);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  // List Captured Leads
  router.get("/leads", canViewCapturedLeads, async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const { sourceId } = req.query;
    
    try {
      const leads = await prisma.capturedLead.findMany({
        where: { 
          organizationId: orgId,
          ...(sourceId && sourceId !== 'all' ? { sourceId: String(sourceId) } : {})
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(Array.isArray(leads) ? leads : []);
    } catch (error: any) {
      console.error("[GET_LEADS_ERROR]", error.message);
      res.status(500).json({ error: "Erro ao buscar leads. Certifique-se de que as migrações do banco de dados foram aplicadas.", details: error.message });
    }
  });

  // Get Single Lead
  router.get("/leads/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const lead = await prisma.capturedLead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lead details" });
    }
  });

  // Update Lead Notes
  router.patch("/leads/:id/notes", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const { notes } = req.body;
    try {
      const updated = await prisma.capturedLead.update({
        where: { id: req.params.id, organizationId: orgId },
        data: { notes }
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Single Captured Lead (phone, email, businessName, whatsappMessage)
  router.patch("/leads/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const { phone, email, businessName, whatsappMessage } = req.body;
    try {
      const updated = await prisma.capturedLead.update({
        where: { id: req.params.id, organizationId: orgId },
        data: {
          phone: phone !== undefined ? phone : undefined,
          email: email !== undefined ? email : undefined,
          businessName: businessName !== undefined ? businessName : undefined,
          whatsappMessage: whatsappMessage !== undefined ? whatsappMessage : undefined
        }
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

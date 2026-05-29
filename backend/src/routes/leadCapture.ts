import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { LeadCaptureService } from "../modules/lead-capture/lead-capture.service.js";
import { LeadAiService } from "../modules/lead-capture/lead-ai.service.js";

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

  // Research Management (LinkedIn)
  router.post("/leads/:id/research-management", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const result = await aiService.researchManagement(req.params.id, orgId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send to CRM
  router.post("/leads/:id/send-to-crm", async (req: AuthRequest, res) => {
    try {
      // 1. Localizar o lead capturado (sem depender exclusivamente do orgId do token, caso seja admin)
      const capturedLead = await prisma.capturedLead.findUnique({
        where: { id: req.params.id }
      });

      if (!capturedLead) return res.status(404).json({ error: "Lead não encontrado" });

      const targetOrgId = capturedLead.organizationId;
      let { boardId, stageId } = req.body;

      // 2. Fallback para Pipeline (Board)
      if (!boardId || boardId === '') {
        const defaultPipeline = await prisma.pipeline.findFirst({
          where: { organizationId: targetOrgId },
          orderBy: { createdAt: 'asc' }
        });
        boardId = defaultPipeline?.id;
      }

      // 3. Fallback para Estágio
      if (boardId && (!stageId || stageId === '')) {
        const firstStage = await prisma.pipelineStage.findFirst({
          where: { pipelineId: boardId },
          orderBy: { order: 'asc' }
        });
        stageId = firstStage?.id;
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

      // 5. Atualizar status da captação
      const updatedCapturedLead = await prisma.capturedLead.update({
        where: { id: req.params.id },
        data: { sentToCrm: true, crmLeadId: newLead.id }
      });

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

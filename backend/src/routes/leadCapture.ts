import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, requirePermission } from "../middleware/auth.js";
import { LeadCaptureService } from "../modules/lead-capture/lead-capture.service.js";
import { LeadAiService } from "../modules/lead-capture/lead-ai.service.js";

export function leadCaptureRoutes(prisma: PrismaClient) {
  const router = Router();
  const leadService = new LeadCaptureService(prisma);
  const aiService = new LeadAiService(prisma);

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
    const orgId = req.user?.orgId;
    try {
      const capturedLead = await prisma.capturedLead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!capturedLead) return res.status(404).json({ error: "Lead not found" });

      const { boardId, stageId } = req.body;
      const newLead = await prisma.lead.create({
        data: {
          name: capturedLead.businessName,
          email: capturedLead.email || "contato@empresa.com",
          phone: capturedLead.phoneNormalized || capturedLead.phone,
          status: "novo",
          organizationId: orgId!,
          pipelineId: boardId,
          stageId,
          cnpj: capturedLead.cnpj,
          owners: capturedLead.owners,
          managementTeam: capturedLead.managementTeam,
          aiDiagnosis: capturedLead.aiDiagnosis,
          notes: `[Captação Elite - ${capturedLead.provider}]\n\nSITE: ${capturedLead.website || 'Não informado'}\n\nDIAGNÓSTICO IA:\n${capturedLead.aiDiagnosis || 'Não realizado'}\n\nEQUIPE DE GESTÃO (LINKEDIN):\n${capturedLead.managementTeam || 'Não pesquisado'}\n\nNOTAS ADICIONAIS:\n${capturedLead.notes || ''}`
        }
      });

      await prisma.capturedLead.update({
        where: { id: req.params.id },
        data: { sentToCrm: true, crmLeadId: newLead.id }
      });

      res.json(newLead);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
  router.get("/leads", requirePermission('leads', 'view'), async (req: AuthRequest, res) => {
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

  return router;
}

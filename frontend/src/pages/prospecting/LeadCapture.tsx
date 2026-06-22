import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Globe, 
  Phone, 
  Star, 
  MoreHorizontal, 
  ExternalLink, 
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Send,
  Wand2,
  Filter,
  History,
  Download,
  ListFilter,
  Zap,
  MessageCircle,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../../lib/api';
import LeadDetailModal from '../../components/crm/LeadDetailModal';

interface Lead {
  id: string;
  businessName: string;
  category: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  rating: number;
  reviewsCount: number;
  provider: string;
  scoreOpportunity: number;
  opportunityLevel: string;
  sentToCrm: boolean;
  cnpjStatus?: 'unverified' | 'validated' | 'rejected' | 'needs_review' | string;
  aiDiagnosis?: string;
  notes?: string;
  cnpj?: string;
  owners?: string;
  managementTeam?: string;
}

const toneTemplates: Record<string, string> = {
  consultive: "Oi, tudo bem? Aqui e o Paulo. Poderia me informar quem e a pessoa responsavel pelo comercial da empresa?",
  direct: "Oi, tudo bem? Aqui e o Paulo. Consegue me ajudar a falar com o socio, proprietario ou responsavel comercial da {businessName}?",
  friendly: "Oi, tudo bem? Aqui e o Paulo. Quem e a melhor pessoa para eu falar sobre a area comercial da {businessName}?"
};

type SendToCrmResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
};

export default function LeadCapture() {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);
  const [activeDossier, setActiveDossier] = useState<Lead | null>(null);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [showScriptsModal, setShowScriptsModal] = useState(false);
  const [activeScripts, setActiveScripts] = useState<{ coldCallScript: string, whatsappMessage: string } | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [boards, setBoards] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<Lead | null>(null);

  // Estados da Prospecção Ativa & Agenda Própria
  const [showProspectingModal, setShowProspectingModal] = useState(false);
  const [prospectingLeads, setProspectingLeads] = useState<Lead[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([
    "Amanhã às 14:00",
    "Sexta-feira às 10:00",
    "Segunda-feira às 15:30"
  ]);
  const [customSlot, setCustomSlot] = useState("");
  const [agentTone, setAgentTone] = useState("consultive");
  const [meetingDuration, setMeetingDuration] = useState("30");
  const [prospectingSuccess, setProspectingSuccess] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  const fetchCalendar = async () => {
    try {
      const res = await apiFetch('/api/calendar');
      if (res.ok) {
        const data = await res.json();
        setCalendarEvents(data);
      }
    } catch (err) {
      console.error("Error fetching calendar:", err);
    }
  };

  const handleOpenProspectingModal = () => {
    const chosen = leads.filter(l => selectedLeads.includes(l.id) && !l.sentToCrm && l.cnpjStatus === 'validated');
    const blockedCount = selectedLeads.length - chosen.length;
    if (blockedCount > 0) {
      setSearchError(`${blockedCount} lead(s) nao foram incluidos porque ja estao no CRM ou ainda precisam de CNPJ validado.`);
    }
    setProspectingLeads(chosen);
    setProspectingSuccess(false);
    fetchCalendar();
    setShowProspectingModal(true);
  };

  const handleProspectingSubmit = async () => {
    setLoading(true);
    try {
      const readyLeads = prospectingLeads.filter(lead => !lead.sentToCrm && lead.cnpjStatus === 'validated');

      if (readyLeads.length === 0) {
        setSearchError('Nenhum lead pronto para prospeccao. Valide o CNPJ antes de enviar para o CRM.');
        return;
      }

      for (const lead of readyLeads) {
        if (!lead.phone) continue;

        const slotsStr = selectedSlots.join(", ");
        const formattedMsg = toneTemplates[agentTone]
          .replace("{businessName}", lead.businessName)
          .replace("{city}", lead.city || lead.state || "sua cidade")
          .replace("{duration}", meetingDuration)
          .replace("{slots}", slotsStr);

        // 1. Salvar telefone e mensagem customizada de WhatsApp do lead capturado
        await apiFetch(`/api/lead-capture/leads/${lead.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            phone: lead.phone,
            whatsappMessage: formattedMsg
          })
        });

        // 2. Enviar para o CRM Kanban
        const sent = await handleSendToCrm(lead.id, { silent: true });
        if (!sent.ok && !sent.skipped) {
          setSearchError(sent.reason || `Nao foi possivel enviar ${lead.businessName} para o CRM.`);
          return;
        }
      }

      // 3. Enviar todos para o Funil de Prospecção Ativa (inicia WhatsApp SDR)
      await apiFetch('/api/prospecting-funnels/funnels/default/enroll', {
        method: 'POST',
        body: JSON.stringify({ leadIds: readyLeads.map(lead => lead.id) })
      });

      setProspectingSuccess(true);
      fetchLeads(activeSourceId || undefined);
    } catch (err) {
      console.error(err);
      alert("Erro ao disparar prospecção ativa");
    } finally {
      setLoading(false);
    }
  };

  const fetchBoards = async () => {
    try {
      const res = await apiFetch('/api/crm/boards');
      const data = await res.json();
      setBoards(data);
      if (data.length > 0) setSelectedBoardId(data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const setupDefaultBoards = async () => {
    try {
      await apiFetch('/api/crm/boards/setup', { method: 'POST' });
      fetchBoards();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuperIntelligence = async () => {
    if (selectedLeads.length === 0) return;
    setLoading(true);
    try {
      for (const id of selectedLeads) {
        await handleEnrich(id);
        await handleResearchManagement(id);
        await handleAnalyze(id);
      }
    } finally {
      setLoading(false);
      setSelectedLeads([]);
    }
  };

  const handleDossier = async (id: string) => {
    setAnalyzingIds(prev => [...prev, id]);
    try {
      const res = await apiFetch(`/api/lead-capture/leads/${id}/dossier`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === id ? data : l));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleGenerateScripts = async (id: string) => {
    setAnalyzingIds(prev => [...prev, id]);
    try {
      const res = await apiFetch(`/api/lead-capture/leads/${id}/scripts`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === id ? data : l));
        setActiveScripts({ coldCallScript: data.coldCallScript, whatsappMessage: data.whatsappMessage });
        setShowScriptsModal(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleResearchManagement = async (id: string) => {
    setAnalyzingIds(prev => [...prev, id]);
    try {
      const res = await apiFetch(`/api/lead-capture/leads/${id}/research-management`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === id ? data : l));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleEnrich = async (id: string) => {
    setAnalyzingIds(prev => [...prev, id]);
    try {
      const res = await apiFetch(`/api/lead-capture/leads/${id}/enrich`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === id ? data : l));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingIds(prev => prev.filter(i => i !== id));
    }
  };
  
  const [searchParams, setSearchParams] = useState({
    provider: 'serper',
    keyword: '',
    city: '',
    state: '',
    limit: 50,
    filters: {
      onlyWithPhone: true,
      onlyWithWebsite: false
    }
  });
  const [missionForm, setMissionForm] = useState({
    recurrence: 'semanal',
    executionDate: new Date().toISOString().slice(0, 10),
    executionTime: '09:00',
    leadQuantity: 25,
    minScore: 50
  });
  const [missionCreated, setMissionCreated] = useState<string | null>(null);
  const [autoFunnel, setAutoFunnel] = useState({
    enabled: false,
    autoDispatch: false,
    minScore: 0,
    requireValidatedCompany: false
  });
  const [lastProspectingResult, setLastProspectingResult] = useState<any | null>(null);

  const handleCreateScheduledMission = async () => {
    if (!searchParams.keyword || !searchParams.city || !searchParams.state) {
      setSearchError('Informe nicho, cidade e UF antes de agendar a captacao.');
      return;
    }

    setLoading(true);
    setSearchError(null);
    setMissionCreated(null);

    try {
      const res = await apiFetch('/api/nexus-prospect/missions', {
        method: 'POST',
        body: JSON.stringify({
          name: `Captacao ${searchParams.keyword} - ${searchParams.city}/${searchParams.state}`,
          niche: searchParams.keyword,
          city: searchParams.city,
          state: searchParams.state,
          country: 'Brasil',
          leadQuantity: missionForm.leadQuantity,
          executionDate: missionForm.executionDate,
          executionTime: missionForm.executionTime,
          recurrence: missionForm.recurrence,
          minScore: missionForm.minScore,
          initialApproach: 'Abordagem humana para localizar socio, proprietario ou responsavel comercial. Nao falar que somos agencia, marketing, presenca digital, solucao digital, tecnologia, clientes ou diagnostico antes de conversar com o decisor.'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || 'Nao foi possivel criar o agendamento.');
        return;
      }

      setMissionCreated(`Missao agendada para ${missionForm.executionDate} as ${missionForm.executionTime}.`);
    } catch (err: any) {
      setSearchError(err.message || 'Erro ao criar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
    fetchLeads();
    fetchBoards();
  }, []);

  const fetchSources = async () => {
    try {
      const res = await apiFetch('/api/lead-capture/sources');
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeads = async (sourceId?: string) => {
    try {
      const url = sourceId ? `/api/lead-capture/leads?sourceId=${sourceId}` : '/api/lead-capture/leads';
      const res = await apiFetch(url);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : (data.leads && Array.isArray(data.leads) ? data.leads : []));
      setActiveSourceId(sourceId || null);
    } catch (err) {
      console.error(err);
      setLeads([]);
    }
  };

  const toggleSelectAll = () => {
    const selectableIds = leads.filter(l => !l.sentToCrm).map(l => l.id);
    if (selectableIds.every(id => selectedLeads.includes(id))) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(selectableIds);
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzingIds(prev => [...prev, id]);
    try {
      const res = await apiFetch(`/api/lead-capture/leads/${id}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === id ? data : l));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkValidate = async () => {
    if (selectedLeads.length === 0) return;
    setLoading(true);
    try {
      for (const id of selectedLeads) {
        await handleAnalyze(id);
      }
    } finally {
      setLoading(false);
      setSelectedLeads([]);
    }
  };

  const handleBulkSendToCrm = async () => {
    if (selectedLeads.length === 0) return;
    setLoading(true);
    try {
      const selected = leads.filter(lead => selectedLeads.includes(lead.id));
      const ready = selected.filter(lead => !lead.sentToCrm && lead.cnpjStatus === 'validated');
      const blockedCount = selected.length - ready.length;

      if (ready.length === 0) {
        setSearchError('Nenhum lead selecionado esta pronto para envio. Valide o CNPJ antes de enviar para o CRM.');
        return;
      }

      let sentCount = 0;
      const errors: string[] = [];

      for (const lead of ready) {
        const result = await handleSendToCrm(lead.id, { silent: true });
        if (result.ok || result.skipped) {
          sentCount++;
        } else if (result.reason) {
          errors.push(`${lead.businessName}: ${result.reason}`);
        }
      }

      if (errors.length > 0) {
        setSearchError(errors[0]);
      } else if (blockedCount > 0) {
        setSearchError(`${sentCount} lead(s) enviados. ${blockedCount} ignorado(s) por ja estarem no CRM ou sem CNPJ validado.`);
      } else {
        setSearchError(null);
      }
    } finally {
      setLoading(false);
      setSelectedLeads([]);
    }
  };

  const handleBulkSendToFunnel = async () => {
    if (selectedLeads.length === 0) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/prospecting-funnels/funnels/default/enroll', {
        method: 'POST',
        body: JSON.stringify({ leadIds: selectedLeads })
      });

      if (res.ok) {
        await fetchLeads(activeSourceId || undefined);
        setSelectedLeads([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadNotes = async (id: string, notes: string) => {
    try {
      const res = await apiFetch(`/api/lead-capture/leads/${id}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ notes })
      });
      if (res.ok) {
        const updated = await res.json();
        setLeads(prev => prev.map(l => l.id === id ? updated : l));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearchError(null);
    setLastProspectingResult(null);
    try {
      const res = await apiFetch('/api/lead-capture/search', {
        method: 'POST',
        body: JSON.stringify({
          ...searchParams,
          autoEnrollFunnel: autoFunnel.enabled,
          autoDispatch: autoFunnel.autoDispatch,
          minScore: autoFunnel.minScore,
          requireValidatedCompany: autoFunnel.requireValidatedCompany,
          requirePhone: searchParams.filters.onlyWithPhone
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || `Erro ${res.status}: Falha na busca de leads`);
        return;
      }
      setLeads(data.leads || []);
      setLastProspectingResult(data.prospecting || null);
      fetchSources();
      setActiveTab('search');
    } catch (err: any) {
      console.error(err);
      setSearchError(err.message || 'Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToCrm = async (leadId: string, options: { silent?: boolean } = {}): Promise<SendToCrmResult> => {
    const lead = leads.find(item => item.id === leadId);
    if (lead?.sentToCrm) {
      if (!options.silent) setSearchError('Este lead ja foi enviado para o CRM.');
      return { ok: true, skipped: true, reason: 'Lead ja enviado para o CRM.' };
    }

    if (lead && lead.cnpjStatus !== 'validated') {
      const message = 'Valide o CNPJ correto da empresa antes de enviar para o CRM.';
      if (!options.silent) setSearchError(message);
      return { ok: false, skipped: true, reason: message };
    }

    try {
      if (!options.silent) setSearchError(null);
      const res = await apiFetch(`/api/lead-capture/leads/${leadId}/send-to-crm`, { 
        method: 'POST',
        body: JSON.stringify({ boardId: selectedBoardId })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data?.message || data?.error || `Erro ${res.status}: falha ao enviar lead para o CRM`;
        if (!options.silent) setSearchError(message);
        return { ok: false, reason: message };
      }
      setLeads(prev => prev.map(l => l.id === leadId ? data : l));
      return { ok: true };
    } catch (err) {
      console.error(err);
      const message = 'Erro de conexao ao enviar lead para o CRM.';
      if (!options.silent) setSearchError(message);
      return { ok: false, reason: message };
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2 md:p-4 max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Search className="text-primary" size={28} />
            </div>
            Captação de Leads Elite
          </h1>
          <p className="text-gray-500 font-medium text-sm">Prospecção ativa e inteligência de dados em escala.</p>
        </div>

        {selectedLeads.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-wrap items-center gap-3 p-2 bg-primary/5 border border-primary/20 rounded-2xl shadow-sm"
          >
            <span className="text-xs font-bold text-primary ml-2">{selectedLeads.length} selecionados</span>
            
            {boards.length > 0 ? (
              <select 
                value={selectedBoardId}
                onChange={(e) => setSelectedBoardId(e.target.value)}
                className="bg-white border border-gray-200 text-[11px] font-bold py-2 px-3 rounded-xl outline-none focus:ring-2 focus:ring-primary/10 transition-all"
              >
                {boards.map(b => (
                  <option key={b.id} value={b.id}>Enviar p/ {b.name}</option>
                ))}
              </select>
            ) : (
              <button 
                onClick={setupDefaultBoards}
                className="px-3 py-2 bg-orange-100 text-orange-600 text-[10px] font-black rounded-xl hover:bg-orange-200 transition-all uppercase tracking-widest"
              >
                Inicializar Operação
              </button>
            )}

            <button 
              onClick={handleBulkValidate}
              disabled={loading}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Validar em Massa
            </button>
            <button 
              onClick={handleBulkSendToCrm}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-600/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar para o CRM
            </button>

            {/* Ação Premium de Prospecção Ativa com Agenda Própria */}
            <button 
              onClick={handleOpenProspectingModal}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
              Prospecção + Agenda IA
            </button>

            <button 
              onClick={handleBulkSendToFunnel}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
              Enviar p/ Funil IA
            </button>
            <button 
              onClick={handleSuperIntelligence}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-600/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Super Inteligência
            </button>
          </motion.div>
        )}
      </header>

      {/* Busca Horizontal */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Motor de Busca</label>
            <select 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium"
              value={searchParams.provider}
              onChange={e => setSearchParams({...searchParams, provider: e.target.value as any})}
            >
              <option value="serper">Places (Serper.dev)</option>
              <option value="outscraper">Maps (Outscraper)</option>
            </select>
          </div>

          <div className="lg:col-span-1 space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nicho / Palavra-chave</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Ex: Clínica Odontológica"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium"
                value={searchParams.keyword}
                onChange={e => setSearchParams({...searchParams, keyword: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cidade / UF</label>
            <div className="flex gap-2">
              <input 
                type="text" placeholder="Cidade"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium"
                value={searchParams.city}
                onChange={e => setSearchParams({...searchParams, city: e.target.value})}
              />
              <input 
                type="text" placeholder="UF" maxLength={2}
                className="w-20 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium uppercase text-center"
                value={searchParams.state}
                onChange={e => setSearchParams({...searchParams, state: e.target.value.toUpperCase()})}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 h-[50px] px-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={searchParams.filters.onlyWithPhone}
                onChange={e => setSearchParams({...searchParams, filters: {...searchParams.filters, onlyWithPhone: e.target.checked}})}
              />
              <span className="text-[11px] font-bold text-gray-500 group-hover:text-primary transition-colors">Apenas Telefone</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={searchParams.filters.onlyWithWebsite}
                onChange={e => setSearchParams({...searchParams, filters: {...searchParams.filters, onlyWithWebsite: e.target.checked}})}
              />
              <span className="text-[11px] font-bold text-gray-500 group-hover:text-primary transition-colors">Apenas Site</span>
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="h-[50px] bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            <span>Buscar Leads</span>
          </button>
        </form>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-gray-900">Automacao apos a extracao</p>
                <p className="text-[11px] font-medium text-gray-500">
                  Matricula os leads elegiveis no funil WhatsApp SDR assim que a busca terminar.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={autoFunnel.enabled}
                    onChange={e => setAutoFunnel(current => ({ ...current, enabled: e.target.checked, autoDispatch: e.target.checked ? current.autoDispatch : false }))}
                  />
                  <span className="text-[11px] font-bold text-gray-600">Enviar ao funil</span>
                </label>
                <label className={`flex items-center gap-2 ${autoFunnel.enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={autoFunnel.autoDispatch}
                    disabled={!autoFunnel.enabled}
                    onChange={e => setAutoFunnel(current => ({ ...current, autoDispatch: e.target.checked }))}
                  />
                  <span className="text-[11px] font-bold text-gray-600">Disparo automatico</span>
                </label>
              </div>
            </div>

            {autoFunnel.enabled && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Score minimo</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={autoFunnel.minScore}
                    onChange={e => setAutoFunnel(current => ({ ...current, minScore: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <label className="flex items-end gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={autoFunnel.requireValidatedCompany}
                    onChange={e => setAutoFunnel(current => ({ ...current, requireValidatedCompany: e.target.checked }))}
                  />
                  <span className="text-[11px] font-bold text-gray-600">Exigir CNPJ validado</span>
                </label>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-xs font-black text-gray-900">Status da esteira</p>
            <p className="mt-1 text-[11px] font-medium text-gray-500">
              {autoFunnel.autoDispatch
                ? 'O worker enviara as primeiras mensagens dentro do horario comercial e limites do funil.'
                : autoFunnel.enabled
                  ? 'Os leads entram no funil, mas ficam aguardando liberacao de disparo.'
                  : 'Busca manual: nenhum lead sera enviado ao funil automaticamente.'}
            </p>
          </div>
        </div>

        {searchError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
            <AlertCircle size={16} />
            {searchError}
          </div>
        )}

        {lastProspectingResult && (
          <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded-xl text-xs text-primary font-bold flex items-center gap-2">
            <CheckCircle2 size={16} />
            {lastProspectingResult.enrolled || 0} lead(s) enviados ao funil SDR IA.
            {lastProspectingResult.autoDispatch ? ' Disparo automatico liberado para o worker.' : ' Aguardando disparo manual.'}
          </div>
        )}
      </div>

      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <Calendar size={18} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Agendamento automatico de captacao</h2>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              Usa o nicho, cidade e UF acima para captar a quantidade definida, enriquecer, filtrar contador/anti-bot e enviar os aprovados ao funil SDR IA.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full lg:w-auto">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Recorrencia</label>
              <select
                value={missionForm.recurrence}
                onChange={e => setMissionForm({ ...missionForm, recurrence: e.target.value })}
                className="w-full h-11 px-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="unica">Uma vez</option>
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data inicial</label>
              <input
                type="date"
                value={missionForm.executionDate}
                onChange={e => setMissionForm({ ...missionForm, executionDate: e.target.value })}
                className="w-full h-11 px-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Horario</label>
              <input
                type="time"
                value={missionForm.executionTime}
                onChange={e => setMissionForm({ ...missionForm, executionTime: e.target.value })}
                className="w-full h-11 px-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Leads</label>
              <input
                type="number"
                min={1}
                max={500}
                value={missionForm.leadQuantity}
                onChange={e => setMissionForm({ ...missionForm, leadQuantity: Number(e.target.value) })}
                className="w-full h-11 px-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateScheduledMission}
              disabled={loading}
              className="h-11 self-end bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-xs px-4"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Agendar
            </button>
          </div>
        </div>

        {missionCreated && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-bold flex items-center gap-2">
            <CheckCircle2 size={16} />
            {missionCreated}
          </div>
        )}
      </section>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Lista de Resultados */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                Resultados
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full">{leads.length} encontrados</span>
              </h2>
              {leads.length > 0 && (
                <button 
                  onClick={toggleSelectAll}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  {selectedLeads.length === leads.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
               <button className="p-2 text-gray-400 hover:text-primary transition-colors"><ListFilter size={18} /></button>
               <button className="p-2 text-gray-400 hover:text-primary transition-colors"><Download size={18} /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence mode="popLayout">
              {leads.map((lead) => (
                <motion.div
                  key={lead.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedLeadForModal(lead)}
                  className={`group relative bg-white p-4 rounded-2xl border-2 transition-all hover:shadow-xl hover:shadow-gray-200/40 cursor-pointer ${selectedLeads.includes(lead.id) ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-50'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center h-full pt-1">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-gray-900 truncate pr-4">{lead.businessName}</h3>
                          <div className="flex flex-col gap-1 mt-1.5">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
                              <MapPin size={12} /> {lead.address || `${lead.city}, ${lead.state}` || 'Endereço não informado'}
                            </span>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="w-fit px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black rounded-md uppercase tracking-wider">
                                {lead.category || 'N/A'}
                              </span>
                            </div>

                            {(lead.cnpj || lead.owners) && (
                              <div className="mt-3 p-3 bg-gray-50/50 border border-gray-100 rounded-xl space-y-3">
                                {lead.cnpj && (
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">CNPJ da Empresa</label>
                                    <div className="flex items-center gap-2">
                                      <Database size={12} className="text-orange-500" />
                                      <span className="text-[11px] font-bold text-gray-700 tracking-wider">
                                        {lead.cnpj}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                
                                {lead.owners && (
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sócios Identificados</label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {lead.owners.split(',').map((owner, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-blue-100/50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200/50 flex items-center gap-1">
                                          <Star size={8} className="fill-blue-500" />
                                          {owner.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {lead.managementTeam && (
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                      <Globe size={10} /> Decisores (LinkedIn)
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {lead.managementTeam.split(',').map((person, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-100 flex items-center gap-1">
                                          {person.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className={`flex flex-col items-end px-3 py-1 rounded-xl ${
                            (lead.scoreOpportunity || 0) > 70 ? 'bg-green-50 text-green-600' : 
                            (lead.scoreOpportunity || 0) > 40 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'
                          }`}>
                            <span className="text-[10px] font-black leading-none">{lead.scoreOpportunity || 0}%</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5">Score</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-50 pt-4">
                        <div className="flex items-center gap-2">
                          {lead.phone ? (
                            <div className="flex items-center gap-1">
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition-colors">
                                <Phone size={12} /> Ligar
                              </a>
                              <a 
                                href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 text-green-600 rounded-lg text-[11px] font-bold hover:bg-green-100 transition-colors"
                              >
                                <Phone size={12} className="rotate-90" /> WhatsApp
                              </a>
                            </div>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 text-gray-400 rounded-lg text-[11px] font-bold italic">
                              <Phone size={12} /> Sem número
                            </span>
                          )}

                          {lead.website && (
                            <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold hover:bg-indigo-100 transition-all shadow-sm">
                              <Globe size={12} /> Website
                            </a>
                          )}
                        </div>

                        {/* Notes Section */}
                        <div className="w-full mt-3">
                          <textarea 
                            placeholder="Anotações de ligações / Atividades..."
                            className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-medium focus:ring-2 focus:ring-primary/10 outline-none min-h-[60px] transition-all"
                            defaultValue={lead.notes || ''}
                            onBlur={(e) => updateLeadNotes(lead.id, e.target.value)}
                          />
                        </div>

                        {/* Dossiê Inline */}
                        {lead.aiDiagnosis && (
                          <div className="w-full mt-3 border border-indigo-200 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600">
                              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                                <Database size={11} /> Dossiê Estratégico IA
                              </p>
                              <span className="text-[9px] text-indigo-200 font-bold">Gerado automaticamente</span>
                            </div>
                            <div className="p-4 bg-indigo-50/40 text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap font-medium max-h-48 overflow-y-auto">
                              {lead.aiDiagnosis}
                            </div>
                          </div>
                        )}

                        <div className="flex-1" />

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEnrich(lead.id)}
                            disabled={analyzingIds.includes(lead.id)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-xl transition-all flex items-center gap-2 text-[11px] font-bold disabled:opacity-50"
                            title="Buscar CNPJ e Sócios"
                          >
                            {analyzingIds.includes(lead.id) ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                            Enriquecer
                          </button>
                          <button 
                            onClick={() => handleResearchManagement(lead.id)}
                            disabled={analyzingIds.includes(lead.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all flex items-center gap-2 text-[11px] font-bold disabled:opacity-50"
                            title="Pesquisar Decisores no LinkedIn"
                          >
                            {analyzingIds.includes(lead.id) ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                            Pesquisar Decisores
                          </button>
                          <button 
                            onClick={() => handleDossier(lead.id)}
                            disabled={analyzingIds.includes(lead.id)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2 text-[11px] font-bold disabled:opacity-50"
                            title="Gerar Dossiê de Inteligência"
                          >
                            {analyzingIds.includes(lead.id) ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                            Dossiê
                          </button>
                          <button 
                            onClick={() => handleGenerateScripts(lead.id)}
                            disabled={analyzingIds.includes(lead.id)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2 text-[11px] font-bold disabled:opacity-50"
                            title="Scripts de Abordagem"
                          >
                            {analyzingIds.includes(lead.id) ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                            Scripts
                          </button>
                          <button 
                            disabled={lead.sentToCrm || lead.cnpjStatus !== 'validated'}
                            onClick={() => handleSendToCrm(lead.id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all disabled:opacity-30"
                            title={lead.sentToCrm ? 'Lead ja enviado para o CRM' : lead.cnpjStatus === 'validated' ? 'Enviar para o CRM' : 'Valide o CNPJ antes de enviar para o CRM'}
                          >
                            <Send size={16} />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {leads.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                <Database size={40} className="text-gray-200 mb-2" />
                <p className="text-gray-500 font-bold text-sm">Nenhum lead encontrado.</p>
                <p className="text-xs text-gray-400">Inicie uma busca acima para começar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Histórico */}
        <div className="lg:w-80 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-gray-900 text-sm tracking-tight flex items-center gap-2">
              <History size={16} className="text-primary" />
              Buscas Recentes
            </h3>
            <button 
              onClick={() => fetchLeads()}
              className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
            >
              Ver Tudo
            </button>
          </div>
          
          <div className="space-y-3">
            {Array.isArray(sources) && sources.slice(0, 10).map((source) => (
              <div 
                key={source.id} 
                onClick={() => fetchLeads(source.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm group ${
                  activeSourceId === source.id 
                  ? 'bg-primary/5 border-primary shadow-primary/10' 
                  : 'bg-white border-gray-100 hover:border-primary/20'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-wider ${
                    activeSourceId === source.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {source.provider}
                  </span>
                  <span className="text-[9px] text-gray-400">{new Date(source.createdAt).toLocaleDateString()}</span>
                </div>
                <p className={`text-xs font-bold truncate ${activeSourceId === source.id ? 'text-primary' : 'text-gray-800'}`}>
                  {source.keyword}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{source.city}, {source.state}</p>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                   <span className={`text-[10px] font-black ${activeSourceId === source.id ? 'text-primary' : 'text-gray-500'}`}>
                     {source.totalImported} leads
                   </span>
                   <CheckCircle2 size={12} className={activeSourceId === source.id ? 'text-primary' : 'text-green-500'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal - Prospecção Ativa & Agendamento IA com Agenda Própria */}
      <AnimatePresence>
        {showProspectingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col my-8 border border-gray-100"
            >
              {!prospectingSuccess ? (
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Prospecção Ativa & Agendamento IA</h2>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">SDR WhatsApp + Agenda Própria Nexus360</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowProspectingModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900 font-bold"
                    >
                      Fechar X
                    </button>
                  </div>

                  {/* Body Grid */}
                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 max-h-[70vh]">
                    
                    {/* Left Column: Leads Validation & Tone */}
                    <div className="space-y-6">
                      
                      {/* Step 1: Validation */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-black">1</span>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Validar Leads Selecionados</h3>
                        </div>
                        
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {prospectingLeads.map((lead) => (
                            <div key={lead.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl hover:border-indigo-100 transition-all">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-gray-800 truncate">{lead.businessName}</p>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5">{lead.city || lead.state || 'Cidade não informada'}</p>
                              </div>
                              <div className="w-full sm:w-48 shrink-0">
                                <input 
                                  type="text"
                                  placeholder="Inserir WhatsApp..."
                                  value={lead.phone || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setProspectingLeads(prev => prev.map(l => l.id === lead.id ? { ...l, phone: val } : l));
                                  }}
                                  className={`w-full px-3 py-2 border text-xs font-bold rounded-xl outline-none transition-all ${
                                    lead.phone 
                                      ? 'border-green-200 bg-green-50/20 text-green-700 focus:ring-2 focus:ring-green-500/10' 
                                      : 'border-red-200 bg-red-50/20 text-red-700 focus:ring-2 focus:ring-red-500/10 placeholder-red-400'
                                  }`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Step 2: Pitch settings */}
                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-black">2</span>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Configurar Abordagem SDR</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tom de Voz</label>
                            <select 
                              value={agentTone}
                              onChange={(e) => setAgentTone(e.target.value)}
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-xs font-bold"
                            >
                              <option value="consultive">Consultivo & Estratégico</option>
                              <option value="direct">Comercial Objetivo</option>
                              <option value="friendly">Amigável & Descontraído</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Duração da Reunião</label>
                            <select 
                              value={meetingDuration}
                              onChange={(e) => setMeetingDuration(e.target.value)}
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-xs font-bold"
                            >
                              <option value="15">15 minutos</option>
                              <option value="30">30 minutos (Recomendado)</option>
                              <option value="45">45 minutos</option>
                              <option value="60">1 hora</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pré-visualização do Roteiro (WhatsApp)</label>
                          <div className="p-4 bg-indigo-50/20 border border-indigo-100 rounded-2xl text-xs text-gray-700 leading-relaxed font-medium whitespace-pre-wrap">
                            {toneTemplates[agentTone]
                              .replace("{businessName}", prospectingLeads[0]?.businessName || "Empresa Exemplo")
                              .replace("{city}", prospectingLeads[0]?.city || "sua cidade")
                              .replace("{duration}", meetingDuration)
                              .replace("{slots}", selectedSlots.length > 0 ? selectedSlots.join(", ") : "[Nenhum horário selecionado]")}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Right Column: Calendar Slots & CRM Destination */}
                    <div className="space-y-6 lg:border-l lg:border-gray-100 lg:pl-8">
                      
                      {/* Step 3: Calendar Slots */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-black">3</span>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Oferecer Horários Livres (Agenda Própria)</h3>
                        </div>

                        {/* List of offered slots */}
                        <div className="flex flex-wrap gap-2">
                          {selectedSlots.map((slot, index) => (
                            <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-xl">
                              {slot}
                              <button 
                                type="button" 
                                onClick={() => setSelectedSlots(prev => prev.filter((_, i) => i !== index))}
                                className="text-indigo-400 hover:text-indigo-900 font-bold ml-1"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Custom slot adder */}
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="Adicionar novo horário (Ex: Quinta às 15h)"
                            value={customSlot}
                            onChange={(e) => setCustomSlot(e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customSlot.trim()) {
                                e.preventDefault();
                                setSelectedSlots([...selectedSlots, customSlot.trim()]);
                                setCustomSlot("");
                              }
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              if (customSlot.trim()) {
                                setSelectedSlots([...selectedSlots, customSlot.trim()]);
                                setCustomSlot("");
                              }
                            }}
                            className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all"
                          >
                            Adicionar
                          </button>
                        </div>

                        {/* Sincronização com Agenda Própria */}
                        <div className="mt-4 p-4 bg-purple-50/30 border border-purple-100 rounded-2xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest flex items-center gap-1.5">
                              <Calendar size={12} className="text-purple-600" />
                              Compromissos na Agenda Própria
                            </span>
                            <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-black">Ao Vivo</span>
                          </div>
                          
                          <div className="space-y-2 max-h-36 overflow-y-auto">
                            {calendarEvents.length === 0 ? (
                              <p className="text-[10px] text-gray-500 font-bold italic">Sem conflitos! Nenhum evento agendado esta semana.</p>
                            ) : (
                              calendarEvents.slice(0, 5).map((evt: any) => (
                                <div key={evt.id} className="flex justify-between items-center text-[10px] text-gray-700 font-bold border-b border-purple-50/50 pb-1.5 last:border-0 last:pb-0">
                                  <span className="truncate max-w-[180px]">📅 {evt.title}</span>
                                  <span className="text-purple-600 shrink-0 font-bold">
                                    {new Date(evt.startDate).toLocaleDateString()} {new Date(evt.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Step 4: CRM settings */}
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-black">4</span>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Destino no CRM Kanban</h3>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Selecione o Funil de Vendas</label>
                          <select 
                            value={selectedBoardId}
                            onChange={(e) => setSelectedBoardId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-xs font-bold"
                          >
                            {boards.map(b => (
                              <option key={b.id} value={b.id}>Enviar para {b.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button 
                      onClick={() => setShowProspectingModal(false)}
                      className="px-6 py-3 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-2xl text-xs font-bold transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleProspectingSubmit}
                      disabled={loading || selectedSlots.length === 0 || prospectingLeads.some(l => !l.phone)}
                      className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-[1.02] text-white text-xs font-black rounded-2xl shadow-xl shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Disparar Automação & CRM 🚀
                    </button>
                  </div>
                </>
              ) : (
                /* Success Screen */
                <div className="p-8 text-center space-y-6 max-h-[85vh] overflow-y-auto">
                  <div className="w-20 h-20 bg-green-50 border-4 border-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-xl shadow-green-100">
                    <CheckCircle2 size={44} />
                  </div>
                  
                  <div className="max-w-xl mx-auto">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Operação Disparada! 🎉</h3>
                    <p className="text-sm text-gray-500 mt-2 font-medium">
                      Os leads selecionados foram validados com sucesso no banco de dados, enviados para a coluna inicial do seu Kanban no CRM e matriculados na automação do **SDR WhatsApp**.
                    </p>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100/50 rounded-3xl max-w-2xl mx-auto text-left space-y-4">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Leads Qualificados & Horários Reservados</p>
                    
                    <div className="space-y-3">
                      {prospectingLeads.map((l) => (
                        <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-indigo-100/30 rounded-2xl shadow-sm">
                          <div>
                            <p className="text-xs font-black text-gray-800">{l.businessName}</p>
                            <p className="text-[9px] font-bold text-gray-400 mt-0.5">📞 WhatsApp: {l.phone}</p>
                          </div>
                          
                          <a 
                            href={`https://wa.me/${l.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(
                              toneTemplates[agentTone]
                                .replace("{businessName}", l.businessName)
                                .replace("{city}", l.city || l.state || "sua cidade")
                                .replace("{duration}", meetingDuration)
                                .replace("{slots}", selectedSlots.join(", "))
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-[11px] font-black rounded-xl transition-all shadow-md shadow-green-100 flex items-center gap-1.5 justify-center"
                          >
                            <MessageCircle size={14} /> Abrir Conversa
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 max-w-sm mx-auto">
                    <button 
                      onClick={() => { setShowProspectingModal(false); setSelectedLeads([]); }}
                      className="w-full py-3.5 bg-gray-900 hover:bg-black text-white text-xs font-black rounded-2xl transition-all uppercase tracking-widest shadow-xl shadow-gray-200"
                    >
                      Voltar para Captação
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scripts Modal */}
      <AnimatePresence>
        {showScriptsModal && activeScripts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <Wand2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Scripts de Abordagem</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estratégia de Contato IA</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowScriptsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900"
                >
                  <Search className="rotate-45" size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Phone size={14} className="text-blue-500" />
                    Cold Call (Roteiro de Ligação)
                  </h3>
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                    {activeScripts.coldCallScript}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Phone size={14} className="text-green-500 rotate-90" />
                    Mensagem de WhatsApp
                  </h3>
                  <div className="p-4 bg-green-50/50 border border-green-100 rounded-2xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                    {activeScripts.whatsappMessage}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
                <button 
                  onClick={() => setShowScriptsModal(false)}
                  className="px-6 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:scale-105 transition-all"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLeadForModal}
        isOpen={!!selectedLeadForModal}
        onClose={() => setSelectedLeadForModal(null)}
        onEnrich={handleEnrich}
        onResearchManagement={handleResearchManagement}
        onDossier={handleDossier}
        onGenerateScripts={handleGenerateScripts}
        onSendToCrm={handleSendToCrm}
        onDelete={() => {
          // Implementar lógica de deletar se necessário
          setSelectedLeadForModal(null);
        }}
        analyzingIds={analyzingIds}
        onNotesUpdate={updateLeadNotes}
      />
    </div>
  );
}

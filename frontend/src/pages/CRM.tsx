import { useState, useEffect } from "react";
import { 
  MoreVertical, 
  Search, 
  Plus, 
  Filter, 
  ChevronRight, 
  Mail, 
  Phone, 
  Tag as TagIcon,
  DollarSign,
  X,
  Loader2,
  Calendar,
  Clock,
  MessageSquare,
  History,
  Send,
  CheckCircle2,
  Video,
  Trash2,
  User,
  Sparkles,
  Target,
  ArrowUpRight,
  TrendingUp,
  LayoutGrid,
  List,
  BarChart3,
  Trophy,
  Database,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Lead, LeadStatus } from "../types";
import { apiFetch } from "../lib/api";
import { WinLeadModal } from "../components/crm/WinLeadModal";
import { NexusMeetScheduler } from "../components/crm/NexusMeetScheduler";
import Pagination from "../components/Pagination";

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [winLead, setWinLead] = useState<any | null>(null);
  const [showMeetScheduler, setShowMeetScheduler] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('FUNIL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [growthIntel, setGrowthIntel] = useState<any>(null);

  const fetchLeads = async (p = page) => {
    try {
      const res = await apiFetch(`/api/crm/leads?page=${p}&pageSize=50`);
      const data = await res.json();
      const leadsArray = data.leads || data;
      setLeads(Array.isArray(leadsArray) ? leadsArray : []);
      if (data.total) {
        setTotal(data.total);
        setTotalPages(Math.ceil(data.total / 50));
      }
      try {
        const intelRes = await apiFetch('/api/crm/growth-intelligence');
        setGrowthIntel(await intelRes.json());
      } catch (intelErr) {
        console.error(intelErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchLeads(newPage);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead || lead.status === newStatus) return;

    if (newStatus === 'fechado') {
      setWinLead(lead);
      return;
    }

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

    try {
      await apiFetch(`/api/crm/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      fetchLeads();
    }
  };

  const COLUMNS = [
    { id: 'novo', title: 'Novos Leads', color: 'var(--nexus-primary)', icon: <Plus size={14} /> },
    { id: 'contato', title: 'Em Contato', color: 'var(--nexus-warning)', icon: <MessageSquare size={14} /> },
    { id: 'qualificado', title: 'Qualificados', color: '#8B5CF6', icon: <Target size={14} /> },
    { id: 'proposta', title: 'Proposta', color: '#EC4899', icon: <Send size={14} /> },
    { id: 'fechado', title: 'Ganhos', color: 'var(--nexus-success)', icon: <CheckCircle2 size={14} /> },
  ];

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateColumnTotal = (status: string) => {
    return filteredLeads
      .filter(l => l.status === status)
      .reduce((acc, curr) => acc + (curr.value || 0), 0);
  };

  const totalPipelineValue = filteredLeads.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const wonLeads = filteredLeads.filter(l => l.status === 'fechado');
  const openLeads = filteredLeads.filter(l => l.status !== 'fechado');
  const wonValue = wonLeads.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const openValue = openLeads.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const averageTicket = filteredLeads.length ? totalPipelineValue / filteredLeads.length : 0;
  const conversionRate = filteredLeads.length ? Math.round((wonLeads.length / filteredLeads.length) * 100) : 0;
  const monthlyGoal = 100000;
  const goalProgress = Math.min(100, Math.round((wonValue / monthlyGoal) * 100));
  const statusLabels: Record<string, string> = {
    novo: 'Novo',
    contato: 'Em contato',
    qualificado: 'Qualificado',
    proposta: 'Proposta',
    fechado: 'Ganho'
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--nexus-background)] -m-4 md:-m-8">
      {/* 
        PREMIUM DARK TOPBAR
        Inspirada na estética Agendor, com tons Navy/Roxo profundos
      */}
      <div className="bg-[var(--nexus-nav-dark)] text-white p-6 md:px-10 shadow-lg">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--nexus-primary)] rounded-lg shadow-lg shadow-indigo-500/20">
                  <Target size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Negócios</h1>
                  <p className="text-[10px] font-medium text-[var(--nexus-text-muted)] uppercase tracking-widest mt-0.5">
                    Pipeline Comercial • {total} Negócios Ativos
                  </p>
                </div>
              </div>
              
              <nav className="flex items-center gap-1">
                {[
                  { id: 'FUNIL', label: 'Funil de Vendas', icon: LayoutGrid },
                  { id: 'LISTAGEM', label: 'Listagem', icon: List },
                  { id: 'RELATÓRIOS', label: 'Relatórios', icon: BarChart3 },
                  { id: 'METAS', label: 'Metas', icon: Trophy },
                  { id: 'INTELIGENCIA', label: 'Inteligencia', icon: Sparkles },
                ].map((tab) => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeTab === tab.id 
                        ? 'bg-white/10 text-white shadow-inner' 
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative group hidden lg:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[var(--nexus-primary-light)] transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar negócios..." 
                  className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl w-[300px] focus:ring-2 focus:ring-[var(--nexus-primary)]/50 focus:bg-white/10 focus:border-white/20 outline-none transition-all text-sm placeholder:text-white/30"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-[var(--nexus-primary)] text-white px-5 py-2.5 rounded-xl hover:bg-[var(--nexus-primary-hover)] transition-all text-sm font-bold shadow-xl shadow-indigo-500/20 active:scale-95"
              >
                <Plus size={18} />
                Novo Negócio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 
        KANBAN CONTENT AREA
        Fundo cinza azulado suave, colunas bem espaçadas
      */}
      <div className="flex-1 p-6 md:p-10 overflow-x-auto">
        <div className="max-w-[1600px] mx-auto">
          {activeTab === 'LISTAGEM' && (
            <div className="bg-white border border-[var(--nexus-card-border)] rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--nexus-background-soft)] text-[10px] uppercase tracking-widest text-[var(--nexus-text-muted)]">
                  <tr>
                    <th className="text-left px-6 py-4">Negócio</th>
                    <th className="text-left px-6 py-4">Contato</th>
                    <th className="text-left px-6 py-4">Etapa</th>
                    <th className="text-right px-6 py-4">Valor</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--nexus-card-border)]">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[var(--nexus-background-light)] transition-colors">
                      <td className="px-6 py-4 font-bold text-[var(--nexus-text-primary)]">{lead.name}</td>
                      <td className="px-6 py-4 text-[var(--nexus-text-secondary)]">
                        {lead.email}
                        <div className="text-xs text-[var(--nexus-text-muted)]">{lead.phone || 'Sem telefone'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-lg bg-[var(--nexus-background-soft)] text-[10px] font-black uppercase">
                          {statusLabels[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">{lead.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedLeadId(lead.id)} className="text-[var(--nexus-primary)] text-xs font-bold hover:underline">Abrir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'RELATÓRIOS' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              {[
                ['Pipeline aberto', openValue],
                ['Receita ganha', wonValue],
                ['Ticket médio', averageTicket],
                ['Taxa de ganho', conversionRate]
              ].map(([label, value]) => (
                <div key={label as string} className="bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                  <p className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">{label}</p>
                  <p className="text-2xl font-black text-[var(--nexus-text-primary)] mt-3">
                    {label === 'Taxa de ganho' ? `${value}%` : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              ))}
              <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                <h3 className="font-black text-[var(--nexus-text-primary)] mb-5">Conversão por etapa</h3>
                <div className="space-y-4">
                  {COLUMNS.map((col) => {
                    const count = filteredLeads.filter(l => l.status === col.id).length;
                    const percent = filteredLeads.length ? Math.round((count / filteredLeads.length) * 100) : 0;
                    return (
                      <div key={col.id}>
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span>{col.title}</span>
                          <span>{count} negócios • {percent}%</span>
                        </div>
                        <div className="h-3 bg-[var(--nexus-background-soft)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: col.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'METAS' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                <p className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Meta mensal de vendas</p>
                <div className="flex items-end justify-between gap-4 mt-4">
                  <div>
                    <p className="text-4xl font-black text-[var(--nexus-text-primary)]">{wonValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <p className="text-sm text-[var(--nexus-text-muted)] mt-2">de {monthlyGoal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <span className="text-2xl font-black text-[var(--nexus-primary)]">{goalProgress}%</span>
                </div>
                <div className="h-4 bg-[var(--nexus-background-soft)] rounded-full overflow-hidden mt-8">
                  <div className="h-full bg-[var(--nexus-primary)] rounded-full" style={{ width: `${goalProgress}%` }} />
                </div>
              </div>
              <div className="bg-white p-8 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                <p className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Gap para meta</p>
                <p className="text-3xl font-black text-[var(--nexus-text-primary)] mt-4">{Math.max(0, monthlyGoal - wonValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <p className="text-sm text-[var(--nexus-text-muted)] mt-3">Pipeline aberto disponível: {openValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>
          )}

          {activeTab === 'INTELIGENCIA' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  ['Forecast ponderado', growthIntel?.forecast?.weightedForecast, 'money'],
                  ['Pipeline aberto', growthIntel?.forecast?.openValue, 'money'],
                  ['Receita ganha', growthIntel?.forecast?.wonValue, 'money'],
                  ['MRR atual', growthIntel?.forecast?.monthlyRecurring, 'money'],
                  ['Conversao', growthIntel?.forecast?.conversionRate, 'percent'],
                  ['Clientes em risco', growthIntel?.benchmark?.criticalClients, 'number']
                ].map(([label, value, type]) => (
                  <div key={label as string} className="bg-white p-5 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                    <p className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">{label}</p>
                    <p className="text-xl font-black text-[var(--nexus-text-primary)] mt-3">
                      {type === 'money' ? Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : type === 'percent' ? `${value || 0}%` : value || 0}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <Sparkles size={18} className="text-[var(--nexus-primary)]" />
                    <h3 className="font-black text-[var(--nexus-text-primary)]">Assistente do vendedor</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(growthIntel?.sellerAssistant?.topOpportunities || []).map((item: any) => (
                      <button key={item.id} onClick={() => setSelectedLeadId(item.id)} className="text-left p-4 rounded-xl border border-[var(--nexus-card-border)] hover:border-[var(--nexus-primary)] transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-[var(--nexus-text-primary)]">{item.name}</p>
                            <p className="text-xs text-[var(--nexus-text-muted)] mt-1">{item.recommendedAction}</p>
                          </div>
                          <span className="text-xs font-black text-[var(--nexus-primary)]">{Number(item.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                      </button>
                    ))}
                    {(growthIntel?.sellerAssistant?.topOpportunities || []).length === 0 && (
                      <div className="md:col-span-2 text-sm text-[var(--nexus-text-muted)]">Sem oportunidades abertas para priorizar agora.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                  <h3 className="font-black text-[var(--nexus-text-primary)] mb-4">Leads sem toque</h3>
                  <div className="space-y-3">
                    {(growthIntel?.sellerAssistant?.staleLeads || []).map((lead: any) => (
                      <button key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className="w-full text-left p-3 rounded-xl bg-[var(--nexus-background-soft)]">
                        <p className="font-bold text-sm text-[var(--nexus-text-primary)]">{lead.name}</p>
                        <p className="text-xs text-[var(--nexus-text-muted)]">{lead.action}</p>
                      </button>
                    ))}
                    {(growthIntel?.sellerAssistant?.staleLeads || []).length === 0 && <p className="text-sm text-[var(--nexus-text-muted)]">Nenhum lead parado ha mais de 3 dias.</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                  <h3 className="font-black text-[var(--nexus-text-primary)] mb-4">Playbooks por nicho</h3>
                  <div className="space-y-4">
                    {(growthIntel?.playbooks || []).map((playbook: any) => (
                      <div key={playbook.niche} className="p-4 rounded-xl border border-[var(--nexus-card-border)]">
                        <p className="font-black text-[var(--nexus-text-primary)]">{playbook.niche}</p>
                        <p className="text-xs text-[var(--nexus-text-muted)] mt-2">{playbook.pipeline}</p>
                        <p className="text-sm font-semibold text-[var(--nexus-text-secondary)] mt-3">{playbook.offer}</p>
                        <p className="text-xs text-[var(--nexus-primary)] mt-3">{playbook.proposalAngle}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                    <h3 className="font-black text-[var(--nexus-text-primary)] mb-4">Templates de WhatsApp</h3>
                    <div className="space-y-3">
                      {(growthIntel?.whatsappTemplates || []).map((template: any) => (
                        <div key={template.name} className="p-4 rounded-xl bg-[var(--nexus-background-soft)]">
                          <p className="font-black text-sm text-[var(--nexus-text-primary)]">{template.name}</p>
                          <p className="text-xs text-[var(--nexus-text-secondary)] mt-2">{template.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                    <h3 className="font-black text-[var(--nexus-text-primary)] mb-4">Automacoes e campos recomendados</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(growthIntel?.customFields || []).map((field: string) => (
                        <span key={field} className="px-3 py-1 rounded-full bg-[var(--nexus-background-soft)] text-xs font-bold text-[var(--nexus-text-secondary)]">{field}</span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {(growthIntel?.automationRecipes || []).map((recipe: string) => (
                        <div key={recipe} className="flex gap-2 text-sm text-[var(--nexus-text-secondary)]">
                          <CheckCircle2 size={15} className="text-[var(--nexus-success)] mt-0.5 flex-shrink-0" />
                          <span>{recipe}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={`${activeTab === 'FUNIL' ? 'flex' : 'hidden'} gap-6 min-h-[calc(100vh-250px)]`}>
            {COLUMNS.map((col) => {
              const colLeads = filteredLeads.filter(l => l.status === col.id);
              const colValue = calculateColumnTotal(col.id);

              return (
                <div 
                  key={col.id} 
                  className="flex-shrink-0 w-[320px] flex flex-col gap-4"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id as LeadStatus)}
                >
                  {/* Column Header */}
                  <div className="flex flex-col gap-3 pb-2 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-6 rounded-full" 
                          style={{ backgroundColor: col.color }}
                        />
                        <h3 className="font-bold text-sm text-[var(--nexus-text-primary)] tracking-tight">
                          {col.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-black bg-white border border-[var(--nexus-card-border)] text-[var(--nexus-text-secondary)] px-2 py-1 rounded-md shadow-sm">
                        {colLeads.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1 text-[var(--nexus-text-muted)]">
                        <DollarSign size={12} />
                        <span className="text-xs font-bold">
                          {colValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[var(--nexus-success)]">
                        <TrendingUp size={12} />
                        <span className="text-[10px] font-bold">2.4%</span>
                      </div>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="flex flex-col gap-4 py-2">
                    <AnimatePresence mode="popLayout">
                      {colLeads.map((lead) => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={lead.id} 
                          draggable
                          onDragStart={(e: any) => handleDragStart(e, lead.id)}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="bg-white p-5 rounded-[var(--nexus-radius-card)] border border-[var(--nexus-card-border)] shadow-[var(--nexus-shadow-card)] hover:shadow-[var(--nexus-shadow-floating)] hover:border-[var(--nexus-primary)]/30 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
                        >
                          {/* Accent line */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ backgroundColor: col.color }}
                          />

                          <div className="flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-[var(--nexus-text-primary)] leading-snug group-hover:text-[var(--nexus-primary)] transition-colors line-clamp-2">
                                  {lead.name}
                                </h4>
                                {lead.tags && (
                                  <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-black rounded uppercase tracking-wider mt-1.5">
                                    {typeof lead.tags === 'string' ? lead.tags : lead.tags[0]}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {lead.score !== undefined && lead.score > 0 && (
                                  <div className={`flex flex-col items-end px-2 py-0.5 rounded-lg border ${
                                    lead.score > 70 ? 'bg-green-50 text-green-600 border-green-100' : 
                                    lead.score > 40 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                                  }`}>
                                    <span className="text-[10px] font-black leading-none">{lead.score}%</span>
                                    <span className="text-[6px] font-black uppercase tracking-wider mt-0.5">Score</span>
                                  </div>
                                )}
                                <div className="p-1 text-[var(--nexus-text-muted)] hover:text-[var(--nexus-primary)] rounded-lg hover:bg-[var(--nexus-background-soft)] transition-all flex-shrink-0">
                                  <MoreVertical size={14} />
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 text-[var(--nexus-text-secondary)]">
                                <Mail size={12} className="opacity-60 text-indigo-500 flex-shrink-0" />
                                <span className="text-[11px] font-medium truncate">{lead.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[var(--nexus-text-secondary)]">
                                <Phone size={12} className="opacity-60 text-green-500 flex-shrink-0" />
                                <span className="text-[11px] font-medium">{lead.phone || '(00) 00000-0000'}</span>
                              </div>

                              {/* CNPJ da Empresa */}
                              {lead.cnpj && (
                                <div className="flex items-center gap-1.5 mt-1 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg w-fit">
                                  <Database size={10} className="text-orange-500 flex-shrink-0" />
                                  <span className="text-[10px] font-bold text-gray-700 tracking-wider">
                                    {lead.cnpj}
                                  </span>
                                </div>
                              )}

                              {/* Sócios Identificados */}
                              {lead.owners && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {lead.owners.split(',').slice(0, 2).map((owner: string, idx: number) => (
                                    <span key={idx} className="px-1.5 py-0.5 bg-blue-50/50 text-blue-700 text-[9px] font-bold rounded border border-blue-200/40 flex items-center gap-1">
                                      <Star size={7} className="fill-blue-500 text-blue-500 flex-shrink-0" />
                                      <span className="truncate max-w-[80px]">{owner.trim()}</span>
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Dossiê Estratégico IA Badge */}
                              {lead.aiDiagnosis && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 border border-purple-100/50 text-purple-600 rounded text-[9px] font-black uppercase tracking-wider w-fit mt-1">
                                  <Sparkles size={8} className="fill-purple-500 text-purple-500 flex-shrink-0" />
                                  <span>Dossiê IA</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-[var(--nexus-card-border)] flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-[var(--nexus-text-muted)] uppercase tracking-wider">Valor do Negócio</span>
                                <span className="text-sm font-bold text-[var(--nexus-text-primary)]">
                                  {lead.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </div>
                              <div className="flex items-center -space-x-2">
                                <div className="w-6 h-6 rounded-full bg-[var(--nexus-primary-light)] border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm">
                                  {lead.name.substring(0, 1)}
                                </div>
                                <div className="w-6 h-6 rounded-full bg-[var(--nexus-background-soft)] border-2 border-white flex items-center justify-center text-[8px] font-bold text-[var(--nexus-text-muted)] shadow-sm">
                                  <Plus size={8} />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-[var(--nexus-background-soft)] rounded text-[9px] font-black text-[var(--nexus-text-secondary)] uppercase tracking-tight">
                                <Clock size={10} />
                                2d atrás
                              </div>
                              {lead.value && lead.value > 10000 && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-[var(--nexus-success-soft)] rounded text-[9px] font-black text-[var(--nexus-success-dark)] uppercase tracking-tight">
                                  <Sparkles size={10} />
                                  VIP
                                </div>
                              )}
                            </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {colLeads.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-gray-200 rounded-2xl opacity-40">
                        <div className="p-3 bg-gray-50 rounded-full mb-3">
                          <Plus size={20} className="text-gray-400" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Arraste para cá</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`${activeTab === 'FUNIL' || activeTab === 'LISTAGEM' ? 'block' : 'hidden'} p-6 md:px-10 border-t border-[var(--nexus-card-border)] bg-white`}>
        <div className="max-w-[1600px] mx-auto">
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={50} onPageChange={handlePageChange} />
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <NewLeadModal onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); fetchLeads(); }} />
        )}
        {selectedLeadId && (
          <LeadDetailModal 
            leadId={selectedLeadId} 
            onClose={() => setSelectedLeadId(null)} 
            onWin={(lead) => { setSelectedLeadId(null); setWinLead(lead); }}
            onScheduleMeet={(lead) => { setSelectedLeadId(null); setShowMeetScheduler(lead); }}
            onDelete={() => { setSelectedLeadId(null); fetchLeads(); }}
            onUpdate={fetchLeads}
          />
        )}
        {winLead && (
          <WinLeadModal lead={winLead} onClose={() => setWinLead(null)} onSuccess={() => { setWinLead(null); fetchLeads(); }} />
        )}
        {showMeetScheduler && (
          <NexusMeetScheduler lead={showMeetScheduler} onClose={() => setShowMeetScheduler(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function NewLeadModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', status: 'novo', value: '', source: '', notes: '', tags: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/crm/leads', { method: 'POST', body: JSON.stringify(formData) });
      onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[var(--nexus-nav-dark)]/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-[24px] shadow-[var(--nexus-shadow-floating)] w-full max-w-xl overflow-hidden relative z-10">
        <div className="p-8 border-b border-[var(--nexus-background-soft)] flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[var(--nexus-primary-light)]/10 text-[var(--nexus-primary)] rounded-lg">
                <Target size={20} />
             </div>
             <h2 className="text-lg font-bold text-[var(--nexus-text-primary)]">Novo Negócio</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--nexus-background-soft)] rounded-full text-[var(--nexus-text-muted)] transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Nome do Negócio</label>
              <input required className="modal-input" placeholder="Ex: Contrato Alpha" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Valor Estimado (R$)</label>
              <input type="number" className="modal-input" placeholder="R$ 0,00" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">E-mail de Contato</label>
            <input required type="email" className="modal-input" placeholder="contato@empresa.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Telefone</label>
            <input type="text" className="modal-input" placeholder="(00) 00000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 text-xs font-bold text-[var(--nexus-text-secondary)] hover:bg-[var(--nexus-background-soft)] rounded-xl transition-all">Cancelar</button>
            <button disabled={submitting} type="submit" className="flex-1 py-3.5 bg-[var(--nexus-primary)] text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
              {submitting ? 'Criando...' : 'Adicionar Negócio'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function LeadDetailModal({ leadId, onClose, onWin, onScheduleMeet, onDelete, onUpdate }: { leadId: string, onClose: () => void, onWin: (lead: any) => void, onScheduleMeet: (lead: any) => void, onDelete: () => void, onUpdate?: () => void }) {
  const [lead, setLead] = useState<any>(null);
  const [newFollowUp, setNewFollowUp] = useState({ type: 'note', content: '', scheduledAt: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('note');

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/crm/leads/${leadId}`);
      const data = await res.json();
      setLead(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [leadId]);

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`/api/crm/leads/${leadId}/followups`, {
        method: 'POST',
        body: JSON.stringify({ ...newFollowUp, type: activeTab })
      });
      setNewFollowUp({ type: 'note', content: '', scheduledAt: '' });
      fetchDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!confirm("Tem certeza que deseja excluir este negócio?")) return;
    try {
      await apiFetch(`/api/crm/leads/${leadId}`, { method: 'DELETE' });
      onDelete();
    } catch (err) {
      console.error(err);
    }
  };

  const TABS = [
    { id: 'note', label: 'ANOTAÇÃO', icon: <MessageSquare size={14} /> },
    { id: 'call', label: 'LIGAÇÃO', icon: <Phone size={14} /> },
    { id: 'meeting', label: 'REUNIÃO', icon: <Video size={14} /> },
    { id: 'proposal', label: 'PROPOSTA', icon: <Send size={14} /> },
    { id: 'email', label: 'E-MAIL', icon: <Mail size={14} /> },
  ];

  if (loading && !lead) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[var(--nexus-nav-dark)]/40 backdrop-blur-sm" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="bg-[var(--nexus-background-light)] w-full max-w-2xl h-screen relative z-10 flex flex-col shadow-[var(--nexus-shadow-floating)]">
        
        {/* Header Agendor Style */}
        <div className="p-8 border-b border-[var(--nexus-card-border)] flex justify-between items-center bg-white">
          <div className="flex items-center gap-5">
             <div className="w-14 h-14 bg-[var(--nexus-background-soft)] rounded-2xl flex items-center justify-center text-[var(--nexus-primary)] border border-[var(--nexus-card-border)] shadow-sm">
                <User size={28} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-[var(--nexus-text-primary)] tracking-tight">{lead.name}</h2>
               <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-black text-[var(--nexus-success-dark)] bg-[var(--nexus-success-soft)] px-2 py-1 rounded-md border border-[var(--nexus-success)]/10">
                    {lead.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-[10px] font-black text-[var(--nexus-text-muted)] bg-[var(--nexus-background-soft)] px-2 py-1 rounded-md border border-[var(--nexus-card-border)] uppercase tracking-wider">
                    {lead.status}
                  </span>
               </div>
               
               {/* Inline editable email */}
               <div className="flex items-center gap-2 mt-2 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg w-fit group/email">
                 <Mail size={11} className="text-gray-400 group-hover/email:text-[var(--nexus-primary)] transition-colors flex-shrink-0" />
                 <input 
                   type="email" 
                   value={lead.email || ''}
                   onChange={(e) => {
                     setLead({ ...lead, email: e.target.value });
                   }}
                   onBlur={async () => {
                     try {
                       await apiFetch(`/api/crm/leads/${lead.id}`, {
                         method: 'PATCH',
                         body: JSON.stringify({ email: lead.email })
                       });
                       onUpdate?.();
                     } catch (err) {
                       console.error(err);
                     }
                   }}
                   className="text-xs text-[var(--nexus-text-secondary)] font-bold bg-transparent outline-none py-0 px-1 border-b border-transparent hover:border-gray-300 focus:border-[var(--nexus-primary)] transition-all w-[180px]"
                   placeholder="E-mail da empresa"
                 />
               </div>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
              onClick={() => onWin(lead)} 
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--nexus-success)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[var(--nexus-success)]/20 hover:scale-105 active:scale-95 transition-all"
             >
                <Trophy size={14} />
                Ganhar Negócio
             </button>
             <button onClick={handleDeleteLead} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Excluir negócio"><Trash2 size={20} /></button>
             <button onClick={onClose} className="p-2.5 text-[var(--nexus-text-muted)] hover:bg-[var(--nexus-background-soft)] rounded-xl transition-all"><X size={24} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar">
          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-4">
            <button onClick={() => window.location.href = `mailto:${lead.email}`} className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-[var(--nexus-card-border)] shadow-sm hover:border-[var(--nexus-primary)]/40 hover:shadow-md transition-all group">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
                <Mail size={18} />
              </div>
              <span className="text-[9px] font-black text-[var(--nexus-text-secondary)] uppercase">E-mail</span>
            </button>
            <button onClick={() => lead.phone && window.open(`https://wa.me/${String(lead.phone).replace(/\D/g, '')}`, '_blank')} className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-[var(--nexus-card-border)] shadow-sm hover:border-[var(--nexus-primary)]/40 hover:shadow-md transition-all group">
              <div className="p-2 bg-green-50 rounded-lg text-green-500 group-hover:scale-110 transition-transform">
                <Phone size={18} />
              </div>
              <span className="text-[9px] font-black text-[var(--nexus-text-secondary)] uppercase">WhatsApp</span>
            </button>
            <button 
              onClick={() => onScheduleMeet(lead)}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-[var(--nexus-card-border)] shadow-sm hover:border-[var(--nexus-primary)]/40 hover:shadow-md transition-all group"
            >
              <div className="p-2 bg-purple-50 rounded-lg text-purple-500 group-hover:scale-110 transition-transform">
                <Video size={18} />
              </div>
              <span className="text-[9px] font-black text-[var(--nexus-text-secondary)] uppercase">Nexus Meet</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-[var(--nexus-card-border)] shadow-sm hover:border-[var(--nexus-primary)]/40 hover:shadow-md transition-all group">
              <div className="p-2 bg-orange-50 rounded-lg text-orange-500 group-hover:scale-110 transition-transform">
                <Calendar size={18} />
              </div>
              <span className="text-[9px] font-black text-[var(--nexus-text-secondary)] uppercase">Tarefa</span>
            </button>
          </div>

          {/* Enriched Information Section (Treated Info from Prospecting Screen) */}
          {(lead.cnpj || lead.owners || lead.aiDiagnosis || lead.tags) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-[var(--nexus-card-border)] p-6 rounded-[24px] shadow-sm">
              <div className="md:col-span-2 pb-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-black text-[var(--nexus-text-primary)] uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} className="text-indigo-500 flex-shrink-0" />
                  Informações de Inteligência da Empresa
                </h3>
                {lead.score !== undefined && lead.score > 0 && (
                  <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${
                    lead.score > 70 ? 'bg-green-50 text-green-600 border border-green-100' : 
                    lead.score > 40 ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-gray-50 text-gray-400 border border-gray-100'
                  }`}>
                    {lead.score}% Score Comercial
                  </span>
                )}
              </div>

              {/* Left Column: CNPJ, Sócios, Decisores */}
              <div className="space-y-4">
                {lead.cnpj && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">CNPJ da Empresa</label>
                    <div className="flex items-center gap-2 text-sm text-[var(--nexus-text-primary)] font-bold">
                      <Database size={14} className="text-orange-500 flex-shrink-0" />
                      <span>{lead.cnpj}</span>
                    </div>
                  </div>
                )}

                {lead.tags && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Nicho / Categoria</label>
                    <span className="w-fit px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded uppercase tracking-wider">
                      {typeof lead.tags === 'string' ? lead.tags : lead.tags[0]}
                    </span>
                  </div>
                )}

                {lead.owners && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sócios Identificados</label>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.owners.split(',').map((owner: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-100 flex items-center gap-1">
                          <User size={10} className="text-blue-500 flex-shrink-0" />
                          {owner.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {lead.managementTeam && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Decisores (LinkedIn)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.managementTeam.split(',').map((person: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-100 flex items-center gap-1">
                          {person.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: AI Diagnosis / Dossier */}
              <div className="md:col-span-2">
                {lead.aiDiagnosis && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles size={11} className="fill-indigo-500 text-indigo-500 flex-shrink-0" /> Dossiê Estratégico IA
                    </label>
                    <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap font-medium max-h-60 overflow-y-auto custom-scrollbar">
                      {lead.aiDiagnosis}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Entry Box (ESTILO AGENDOR) */}
          <div className="bg-white rounded-[24px] border border-[var(--nexus-card-border)] shadow-sm overflow-hidden">
             <div className="flex items-center bg-[var(--nexus-background-light)] border-b border-[var(--nexus-card-border)] px-2">
                {TABS.map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black tracking-widest transition-all border-b-2 ${
                      activeTab === tab.id 
                        ? 'bg-white border-[var(--nexus-primary)] text-[var(--nexus-primary)]' 
                        : 'border-transparent text-[var(--nexus-text-muted)] hover:text-[var(--nexus-text-secondary)] hover:bg-white/50'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
             </div>
             <div className="p-8">
                <form onSubmit={handleAddFollowUp} className="space-y-6">
                  <textarea 
                    required 
                    className="w-full p-5 bg-[var(--nexus-background-soft)] border border-[var(--nexus-card-border)] rounded-2xl text-sm font-medium focus:ring-4 focus:ring-[var(--nexus-primary)]/5 focus:bg-white focus:border-[var(--nexus-primary)]/20 outline-none min-h-[140px] resize-none transition-all placeholder:text-[var(--nexus-text-muted)]"
                    placeholder={`O que aconteceu nesta ${activeTab === 'call' ? 'ligação' : activeTab === 'meeting' ? 'reunião' : 'atividade'}?`}
                    value={newFollowUp.content}
                    onChange={e => setNewFollowUp({...newFollowUp, content: e.target.value})}
                  />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                     <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Próxima Etapa:</label>
                        <input 
                          type="date" 
                          className="px-4 py-2 bg-white border border-[var(--nexus-card-border)] rounded-xl text-xs font-bold text-[var(--nexus-text-primary)] outline-none focus:ring-2 focus:ring-[var(--nexus-primary)]/10" 
                          value={newFollowUp.scheduledAt} 
                          onChange={e => setNewFollowUp({...newFollowUp, scheduledAt: e.target.value})} 
                        />
                     </div>
                     <div className="flex items-center gap-3">
                        <button type="button" className="text-[10px] font-black text-[var(--nexus-text-muted)] hover:text-[var(--nexus-text-secondary)] uppercase px-4 py-2 transition-all">Cancelar</button>
                        <button disabled={submitting} className="bg-[var(--nexus-primary)] text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                          {submitting ? 'Salvando...' : 'Salvar Atividade'}
                        </button>
                     </div>
                  </div>
                </form>
             </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-2">
                  <History size={16} className="text-[var(--nexus-primary)]" />
                  <h3 className="text-[10px] font-black text-[var(--nexus-text-primary)] uppercase tracking-widest">Histórico de Atividades</h3>
               </div>
               <button className="text-[9px] font-black text-[var(--nexus-primary)] hover:underline uppercase tracking-widest">Ver tudo</button>
            </div>
            
            <div className="flex flex-col gap-5">
              {lead.followUps?.map((fu: any) => (
                <div key={fu.id} className="bg-white border border-[var(--nexus-card-border)] p-6 rounded-[24px] shadow-sm relative group hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--nexus-background-soft)] flex items-center justify-center text-[var(--nexus-text-secondary)] border border-[var(--nexus-card-border)]">
                           {fu.type === 'call' ? <Phone size={16} /> : fu.type === 'meeting' ? <Video size={16} /> : <MessageSquare size={16} />}
                        </div>
                        <div>
                           <span className="text-[10px] font-black text-[var(--nexus-primary)] uppercase block tracking-widest">{fu.type}</span>
                           <span className="text-[10px] font-bold text-[var(--nexus-text-muted)] uppercase">{new Date(fu.createdAt).toLocaleString('pt-BR')}</span>
                        </div>
                     </div>
                     <div className="text-[10px] font-bold text-[var(--nexus-text-secondary)] flex items-center gap-1.5 bg-[var(--nexus-background-soft)] px-3 py-1 rounded-full border border-[var(--nexus-card-border)]">
                        <div className="w-2 h-2 rounded-full bg-[var(--nexus-success)]" />
                        {fu.user?.name || 'Sistema'}
                     </div>
                  </div>
                  <p className="text-sm text-[var(--nexus-text-primary)] font-medium leading-relaxed">{fu.content}</p>
                  {fu.scheduledAt && (
                    <div className="mt-5 pt-5 border-t border-[var(--nexus-background-soft)] flex items-center gap-3 text-[10px] font-black text-[var(--nexus-warning-dark)] bg-[var(--nexus-warning-soft)]/20 -mx-6 -mb-6 p-4 rounded-b-[24px]">
                       <div className="p-1.5 bg-white rounded-lg shadow-sm">
                          <Clock size={14} className="text-[var(--nexus-warning)]" />
                       </div>
                       <div>
                          <span className="block opacity-60">PRÓXIMA TAREFA AGENDADA</span>
                          <span>{new Date(fu.scheduledAt).toLocaleDateString('pt-BR')}</span>
                       </div>
                       <button className="ml-auto text-[var(--nexus-primary)] hover:underline uppercase">Concluir</button>
                    </div>
                  )}
                </div>
              ))}
              
              {lead.followUps?.length === 0 && (
                <div className="p-16 text-center border-2 border-dashed border-[var(--nexus-card-border)] rounded-[32px] bg-white/50">
                   <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-[var(--nexus-card-border)]">
                      <MessageSquare size={24} className="text-[var(--nexus-text-muted)]" />
                   </div>
                   <p className="text-sm text-[var(--nexus-text-muted)] font-medium italic">Nenhuma atividade registrada ainda.</p>
                   <button className="mt-4 text-[10px] font-black text-[var(--nexus-primary)] uppercase tracking-widest">Iniciar primeiro contato</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

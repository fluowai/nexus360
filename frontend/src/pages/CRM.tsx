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
  Target
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

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
    { id: 'novo', title: 'Novos Leads', color: 'bg-blue-500', icon: <Plus size={14} /> },
    { id: 'contato', title: 'Em Contato', color: 'bg-yellow-500', icon: <MessageSquare size={14} /> },
    { id: 'qualificado', title: 'Qualificados', color: 'bg-indigo-500', icon: <Target size={14} /> },
    { id: 'proposta', title: 'Proposta', color: 'bg-purple-500', icon: <Send size={14} /> },
    { id: 'fechado', title: 'Ganhos', color: 'bg-emerald-500', icon: <CheckCircle2 size={14} /> },
  ];

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#f8f9fb] -m-4 p-4 md:-m-8 md:p-8">
      {/* Top Bar Estilo Agendor */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
              <Target className="text-primary" size={24} />
              Negócios
            </h1>
            <nav className="hidden lg:flex items-center gap-6">
              {['FUNIL DE VENDAS', 'LISTAGEM', 'RELATÓRIOS', 'METAS'].map((tab) => (
                <button 
                  key={tab}
                  className={`text-[11px] font-black tracking-widest pb-2 border-b-2 transition-all ${
                    tab === 'FUNIL DE VENDAS' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar empresas, pessoas e negócios..." 
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg w-[320px] focus:ring-2 focus:ring-primary/20 outline-none transition-all text-xs"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all text-xs font-bold shadow-lg shadow-primary/20"
            >
              <Plus size={16} />
              Adicionar negócio
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Pipeline */}
      <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar select-none">
        {COLUMNS.map((col) => (
          <div 
            key={col.id} 
            className="flex-shrink-0 w-[280px] flex flex-col gap-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id as LeadStatus)}
          >
            <div className="flex flex-col gap-1 border-b-4 border-gray-200 pb-2">
              <h3 className="font-bold text-[11px] uppercase tracking-wider text-gray-500">
                {col.title}
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400">
                  {filteredLeads.filter(l => l.status === col.id).length} negócios
                </span>
                <span className="text-[10px] font-black text-gray-600">
                  R$ {filteredLeads.filter(l => l.status === col.id).reduce((acc, curr) => acc + (curr.value || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 min-h-[calc(100vh-300px)] py-2">
              {filteredLeads
                .filter(l => l.status === col.id)
                .map((lead) => (
                  <motion.div 
                    layoutId={lead.id}
                    key={lead.id} 
                    draggable
                    onDragStart={(e: any) => handleDragStart(e, lead.id)}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing group relative"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <div className="flex flex-col gap-1 mb-3">
                      <h4 className="font-bold text-sm text-gray-800 leading-tight group-hover:text-primary transition-colors">{lead.name}</h4>
                      <p className="text-[10px] text-gray-400 font-medium truncate">{lead.email}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700">
                        <span>R$ {lead.value?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {lead.phone && <Phone size={12} className="text-gray-300 group-hover:text-green-500 transition-colors" />}
                        <div className="w-5 h-5 rounded bg-gray-50 flex items-center justify-center text-gray-300 group-hover:text-primary">
                          <ChevronRight size={12} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} pageSize={50} onPageChange={handlePageChange} />

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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden relative z-10">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Novo Negócio</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome do Negócio</label>
              <input required className="modal-input text-sm" placeholder="Ex: Contrato Alpha" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Estimado</label>
              <input type="number" className="modal-input text-sm" placeholder="R$ 0,00" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail de Contato</label>
            <input required type="email" className="modal-input text-sm" placeholder="contato@empresa.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all">Cancelar</button>
            <button disabled={submitting} type="submit" className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20">
              {submitting ? 'Criando...' : 'Adicionar Negócio'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function LeadDetailModal({ leadId, onClose, onWin, onScheduleMeet, onDelete }: { leadId: string, onClose: () => void, onWin: (lead: any) => void, onScheduleMeet: (lead: any) => void, onDelete: () => void }) {
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="bg-white w-full max-w-2xl h-screen relative z-10 flex flex-col shadow-2xl">
        
        {/* Header Agendor Style */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-gray-50 rounded-xl text-primary border border-gray-100">
                <User size={24} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-gray-800 tracking-tight">{lead.name}</h2>
               <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">R$ {lead.value?.toLocaleString()}</span>
                  <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 uppercase">{lead.status}</span>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => onWin(lead)} className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-100">Ganhar Negócio</button>
             <button onClick={onClose} className="p-2 text-gray-300 hover:bg-gray-100 rounded-lg"><X size={24} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 bg-[#f8f9fb] custom-scrollbar">
          {/* Activity Entry Box (ESTILO AGENDOR) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="flex items-center bg-gray-50 border-b border-gray-100">
                {TABS.map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black tracking-widest transition-all border-b-2 ${
                      activeTab === tab.id ? 'bg-white border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
             </div>
             <div className="p-6">
                <form onSubmit={handleAddFollowUp} className="space-y-4">
                  <textarea 
                    required 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/10 outline-none min-h-[120px] resize-none transition-all"
                    placeholder={`O que aconteceu nesta ${activeTab === 'call' ? 'ligação' : activeTab === 'meeting' ? 'reunião' : 'atividade'}?`}
                    value={newFollowUp.content}
                    onChange={e => setNewFollowUp({...newFollowUp, content: e.target.value})}
                  />
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Próxima Etapa:</label>
                        <input type="date" className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none" value={newFollowUp.scheduledAt} onChange={e => setNewFollowUp({...newFollowUp, scheduledAt: e.target.value})} />
                     </div>
                     <div className="flex items-center gap-2">
                        <button type="button" className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase px-4 py-2 transition-all">Cancelar</button>
                        <button disabled={submitting} className="bg-emerald-500 text-white px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                          {submitting ? 'Salvando...' : 'Salvar Atividade'}
                        </button>
                     </div>
                  </div>
                </form>
             </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
               <History size={16} className="text-gray-400" />
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Histórico de Atividades</h3>
            </div>
            <div className="flex flex-col gap-4">
              {lead.followUps?.map((fu: any) => (
                <div key={fu.id} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm relative group">
                  <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                           {fu.type === 'call' ? <Phone size={14} /> : fu.type === 'meeting' ? <Video size={14} /> : <MessageSquare size={14} />}
                        </div>
                        <div>
                           <span className="text-[10px] font-black text-primary uppercase block tracking-widest">{fu.type}</span>
                           <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(fu.createdAt).toLocaleString('pt-BR')}</span>
                        </div>
                     </div>
                     <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                        <User size={10} /> {fu.user?.name || 'Sistema'}
                     </div>
                  </div>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">{fu.content}</p>
                  {fu.scheduledAt && (
                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-[10px] font-black text-orange-600">
                       <Clock size={12} /> PRÓXIMA TAREFA: {new Date(fu.scheduledAt).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              ))}
              {lead.followUps?.length === 0 && (
                <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-[32px]">
                   <p className="text-sm text-gray-400 font-medium italic">Nenhuma atividade registrada ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

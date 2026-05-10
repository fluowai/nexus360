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
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2 flex items-center gap-4">
            Pipeline de Vendas
            {localStorage.getItem('nexus_beta_access') === 'true' && (
              <span className="px-3 py-1 bg-orange-100 text-orange-600 text-[10px] font-black uppercase rounded-full border border-orange-200 animate-pulse">Beta</span>
            )}
          </h1>
          <p className="text-gray-500 font-medium">Gestão de leads com rastreabilidade 360°.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar lead..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl w-[250px] focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-xl shadow-slate-200"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Capturar Lead</span>
          </button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-10 custom-scrollbar select-none">
        {COLUMNS.map((col) => (
          <div 
            key={col.id} 
            className="flex-shrink-0 w-[320px] flex flex-col gap-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id as LeadStatus)}
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${col.color} shadow-sm shadow-current/20`} />
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                  {col.icon} {col.title}
                </h3>
                <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-black">
                  {filteredLeads.filter(l => l.status === col.id).length}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 min-h-[600px] p-2 rounded-[32px] bg-gray-50/30">
              {filteredLeads
                .filter(l => l.status === col.id)
                .map((lead) => (
                  <motion.div 
                    layoutId={lead.id}
                    key={lead.id} 
                    draggable
                    onDragStart={(e: any) => handleDragStart(e, lead.id)}
                    className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-grab active:cursor-grabbing group relative"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{lead.name}</h4>
                      <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 group-hover:text-primary transition-colors">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <Mail size={12} className="text-gray-300" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                          <DollarSign size={12} />
                          <span>{lead.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        {lead.source && (
                          <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{lead.source}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-50">
                      {(Array.isArray(lead.tags) ? lead.tags : (lead.tags as string)?.split(',') || []).slice(0, 2).map((tag, i) => (
                        <span key={i} className="text-[9px] font-black uppercase tracking-widest text-blue-500">#{tag}</span>
                      ))}
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden relative z-10">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Nova Oportunidade</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sincronização de Lead Nexus360</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full"><X size={24} className="text-gray-300" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nome Completo</label>
              <input required className="modal-input font-bold" placeholder="Ex: João Silva" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Potencial (R$)</label>
              <input type="number" className="modal-input font-bold" placeholder="0.00" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">E-mail</label>
            <input required type="email" className="modal-input" placeholder="exemplo@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">WhatsApp</label>
              <input className="modal-input" placeholder="(00) 00000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Canal de Origem</label>
              <select className="modal-input font-bold" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                <option value="">Selecione...</option>
                <option value="Instagram">Instagram</option>
                <option value="Google">Google Search</option>
                <option value="Indicacao">Indicação</option>
                <option value="Organico">Orgânico</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Notas de Qualificação</label>
            <textarea className="modal-input min-h-[100px] resize-none" placeholder="Descreva o primeiro contato..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>
          <div className="pt-6 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400">Cancelar</button>
            <button disabled={submitting} type="submit" className="flex-[2] py-4 bg-primary text-white font-black uppercase rounded-2xl shadow-xl shadow-blue-100">
              {submitting ? 'Cadastrando...' : 'Ativar Lead'}
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
        body: JSON.stringify(newFollowUp)
      });
      setNewFollowUp({ type: 'note', content: '', scheduledAt: '' });
      fetchDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este lead? Esta ação é irreversível.")) return;
    try {
      await apiFetch(`/api/crm/leads/${leadId}`, { method: 'DELETE' });
      onDelete();
    } catch (err) {
      alert("Erro ao excluir lead.");
    }
  };

  if (loading && !lead) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="bg-white w-full max-w-2xl h-screen relative z-10 flex flex-col shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)]">
        
        {/* Header Profissional */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-slate-50/50">
          <div className="space-y-3">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-primary bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">{lead.status}</span>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">R$ {lead.value?.toLocaleString()}</span>
             </div>
             <h2 className="text-3xl font-black text-gray-900 tracking-tight">{lead.name}</h2>
             <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
               <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"><Mail size={14} className="text-gray-400" /> {lead.email}</a>
               {lead.phone && <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-100 rounded-lg hover:bg-green-100 transition-colors"><Phone size={14} className="rotate-90" /> WhatsApp</a>}
             </div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all" title="Excluir Lead">
                <Trash2 size={22} />
             </button>
             <button onClick={onClose} className="p-2 text-gray-300 hover:bg-gray-100 rounded-xl"><X size={28} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar">
          {/* Ações Rápidas */}
          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => onWin(lead)} className="py-4 bg-emerald-500 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                <CheckCircle2 size={18} /> Fechar Negócio
             </button>
             <button onClick={() => onScheduleMeet(lead)} className="py-4 bg-primary text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-blue-100 hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                <Video size={18} /> Agendar Nexus Meet
             </button>
          </div>

          {/* Dossiê (Raio-X) */}
          <div className="space-y-6">
             <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Target size={16} className="text-primary" /> Dossiê 360° do Lead
             </h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100">
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Origem do Contato</p>
                   <p className="font-bold text-gray-700">{lead.source || 'Indireto'}</p>
                </div>
                <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100">
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Data de Entrada</p>
                   <p className="font-bold text-gray-700">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
             </div>
             {lead.notes && (
               <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-2">Notas de Qualificação</p>
                  <p className="text-sm text-blue-900 font-medium leading-relaxed">{lead.notes}</p>
               </div>
             )}
          </div>

          {/* Timeline de Atividades */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
               <History size={16} className="text-primary" /> Rastreamento de Atividades
            </h3>
            <div className="flex flex-col gap-6 pl-4 border-l-2 border-gray-100 relative">
              {lead.followUps?.map((fu: any) => (
                <div key={fu.id} className="relative">
                  <div className="absolute -left-[25px] top-0 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-sm" />
                  <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-3">
                       <span className="text-[10px] font-black text-primary uppercase bg-blue-50 px-2 py-1 rounded">{fu.type}</span>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                          <User size={12} /> {fu.user?.name || 'Sistema'} • {new Date(fu.createdAt).toLocaleDateString('pt-BR')}
                       </div>
                    </div>
                    <p className="text-sm text-gray-700 font-medium leading-relaxed">{fu.content}</p>
                    {fu.scheduledAt && (
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-2 rounded-xl w-fit border border-orange-100">
                         <Calendar size={12} /> PRÓXIMA ETAPA: {new Date(fu.scheduledAt).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {lead.followUps?.length === 0 && <p className="text-sm text-gray-300 italic font-medium">Nenhuma atividade registrada ainda.</p>}
            </div>
          </div>
        </div>

        {/* Input de Atividade */}
        <div className="p-8 border-t border-gray-100 bg-slate-50/80">
          <form onSubmit={handleAddFollowUp} className="space-y-4">
             <div className="grid grid-cols-2 gap-3">
               <select className="modal-input font-bold" value={newFollowUp.type} onChange={e => setNewFollowUp({...newFollowUp, type: e.target.value})}>
                 <option value="note">Anotação Interna</option>
                 <option value="meeting">Reunião Realizada</option>
                 <option value="call">Ligação Efetuada</option>
                 <option value="message">WhatsApp Enviado</option>
               </select>
               <input type="date" className="modal-input font-bold" value={newFollowUp.scheduledAt} onChange={e => setNewFollowUp({...newFollowUp, scheduledAt: e.target.value})} title="Agendar Próxima Etapa" />
             </div>
             <div className="flex gap-3">
               <textarea required className="modal-input flex-1 resize-none font-medium text-sm" placeholder="O que aconteceu nesta atividade? Quem participou?" rows={2} value={newFollowUp.content} onChange={e => setNewFollowUp({...newFollowUp, content: e.target.value})} />
               <button disabled={submitting} className="bg-primary text-white p-4 rounded-2xl hover:bg-blue-600 shadow-xl shadow-blue-100 transition-all self-end"><Send size={24} /></button>
             </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

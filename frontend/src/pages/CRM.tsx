import { useState } from "react";
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
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Lead, LeadStatus } from "../types";
import { useEffect } from "react";
import { apiFetch } from "../lib/api";
import { WinLeadModal } from "../components/crm/WinLeadModal";

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [winLead, setWinLead] = useState<any | null>(null);

  const fetchLeads = async () => {
    try {
      const res = await apiFetch(`/api/leads`);
      const data = await res.json();
      setLeads(data.leads || data);
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
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
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead || lead.status === newStatus) return;

    // Se for mover para 'fechado', abre o modal de Win
    if (newStatus === 'fechado') {
      setWinLead(lead);
      return;
    }

    // Otimismo visual: atualiza o estado antes da API
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

    try {
      console.log(`[CRM] Atualizando lead ${leadId} para status ${newStatus}`);
      await apiFetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      fetchLeads(); // Reverte em caso de erro
    }
  };

  const COLUMNS = [
    { id: 'novo', title: 'Novos Leads', color: 'bg-blue-500' },
    { id: 'contato', title: 'Em Contato', color: 'bg-yellow-500' },
    { id: 'qualificado', title: 'Qualificados', color: 'bg-indigo-500' },
    { id: 'proposta', title: 'Proposta Enviada', color: 'bg-purple-500' },
    { id: 'fechado', title: 'Fechado/Ganho', color: 'bg-green-500' },
  ];

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Gestão de Leads (CRM)</h1>
          <p className="text-gray-500">Pipeline visual para controle de conversões.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all shadow-sm">
            <Filter size={18} />
            <span>Filtros</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium shadow-md shadow-blue-200"
          >
            <Plus size={18} />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 -mx-4 sm:-mx-8 px-4 sm:px-8 scrollbar-hide select-none">
        {COLUMNS.map((col) => (
          <div 
            key={col.id} 
            className="kanban-column shrink-0 w-[280px] sm:w-[320px]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id as LeadStatus)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wider">{col.title}</h3>
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {leads.filter(l => l.status === col.id).length}
                </span>
              </div>
              <button className="p-1 hover:bg-gray-200 rounded text-gray-400 transition-colors">
                <MoreVertical size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3 min-h-[500px] py-2">
              {leads
                .filter(l => l.status === col.id)
                .map((lead) => (
                  <motion.div 
                    layoutId={lead.id}
                    key={lead.id} 
                    draggable
                    onDragStart={(e: any) => handleDragStart(e, lead.id)}
                    className="kanban-card group cursor-grab active:cursor-grabbing"
                    onClick={() => setSelectedLeadId(lead.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{lead.name}</h4>
                      <button className="text-gray-300 hover:text-gray-600">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Mail size={12} />
                        <span className="truncate">{lead.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">
                          <DollarSign size={10} />
                          <span>{lead.value.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(lead.tags) ? lead.tags : (lead.tags as string)?.split(',') || []).map((tag, i) => (
                        <span key={i} className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-1 rounded-md border border-gray-200/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              {leads.filter(l => l.status === col.id).length === 0 && (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8">
                  <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Solte aqui</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <NewLeadModal 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              fetchLeads();
            }} 
          />
        )}
        {selectedLeadId && (
          <LeadDetailModal 
            leadId={selectedLeadId} 
            onClose={() => setSelectedLeadId(null)} 
            onWin={(lead) => {
              setSelectedLeadId(null);
              setWinLead(lead);
            }}
          />
        )}
        {winLead && (
          <WinLeadModal 
            lead={winLead} 
            onClose={() => setWinLead(null)} 
            onSuccess={() => {
              setWinLead(null);
              fetchLeads();
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NewLeadModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', status: 'novo', value: '', source: '', notes: '', tags: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await apiFetch('/api/leads', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (response.ok) onSuccess();
      else alert("Erro ao criar lead");
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Novo Lead</h2>
            <p className="text-xs text-gray-500 mt-1">Insira os detalhes do novo contato.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nome Completo</label>
              <input required className="modal-input" placeholder="Ex: João Silva" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Valor Estimado (R$)</label>
              <input type="number" className="modal-input" placeholder="0.00" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">E-mail</label>
            <input required type="email" className="modal-input" placeholder="exemplo@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Telefone / WhatsApp</label>
              <input className="modal-input" placeholder="(00) 00000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Origem do Lead</label>
              <select className="modal-input" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                <option value="">Selecione...</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook Ads</option>
                <option value="Google">Google Search</option>
                <option value="Indicacao">Indicação</option>
                <option value="Organico">Orgânico</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Observações</label>
            <textarea className="modal-input min-h-[100px] resize-none" placeholder="Descreva o primeiro contato..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">Cancelar</button>
            <button disabled={submitting} type="submit" className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="animate-spin" size={20} /> : "Criar Lead"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function LeadDetailModal({ leadId, onClose, onWin }: { leadId: string, onClose: () => void, onWin: (lead: any) => void }) {
  const [lead, setLead] = useState<any>(null);
  const [newFollowUp, setNewFollowUp] = useState({ type: 'meeting', content: '', scheduledAt: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}`);
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
      await apiFetch(`/api/leads/${leadId}/followups`, {
        method: 'POST',
        body: JSON.stringify(newFollowUp)
      });
      setNewFollowUp({ type: 'meeting', content: '', scheduledAt: '' });
      fetchDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="bg-white w-full max-w-2xl h-full sm:h-[calc(100vh-32px)] sm:rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-primary bg-blue-50 px-2 py-1 rounded-md w-fit uppercase tracking-wider">{lead.status}</span>
            <h2 className="text-3xl font-bold text-gray-900">{lead.name}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Mail size={14} /> {lead.email}</span>
              {lead.phone && <span className="flex items-center gap-1.5"><Phone size={14} /> {lead.phone}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lead?.status !== 'fechado' && (
              <button onClick={() => onWin(lead)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-100">
                <CheckCircle2 size={16} /> Ganhou!
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors font-bold text-gray-400"><X size={24} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl">
            <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Origem</p><p className="text-sm font-semibold text-gray-700">{lead.source || 'Não informada'}</p></div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Valor</p><p className="text-sm font-bold text-green-600">R$ {lead.value?.toLocaleString()}</p></div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"><History size={20} className="text-primary" /> Linha do Tempo</h3>
            <div className="flex flex-col gap-6 pl-4 border-l-2 border-gray-100 relative">
              {lead.followUps?.map((fu: any) => (
                <div key={fu.id} className="relative">
                  <div className="absolute -left-[25px] top-0 w-4 h-4 bg-white border-2 border-primary rounded-full" />
                  <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-primary uppercase">{fu.type}</span><span className="text-[10px] text-gray-400">{new Date(fu.createdAt).toLocaleDateString('pt-BR')}</span></div>
                    <p className="text-sm text-gray-700 leading-relaxed">{fu.content}</p>
                    {fu.scheduledAt && <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded w-fit"><Calendar size={12} /> Próximo Agendamento: {new Date(fu.scheduledAt).toLocaleDateString('pt-BR')}</div>}
                  </div>
                </div>
              ))}
              {lead.followUps?.length === 0 && <p className="text-sm text-gray-400 italic">Nenhuma interação registrada.</p>}
            </div>
          </div>
        </div>
        <div className="p-8 border-t border-gray-100 bg-gray-50/50">
          <h4 className="text-sm font-bold text-gray-700 mb-4">Registrar Interação</h4>
          <form onSubmit={handleAddFollowUp} className="flex flex-col gap-4">
             <div className="grid grid-cols-2 gap-3">
               <select className="modal-input" value={newFollowUp.type} onChange={e => setNewFollowUp({...newFollowUp, type: e.target.value})}>
                 <option value="meeting">Reunião</option><option value="call">Ligação</option><option value="message">WhatsApp</option><option value="note">Nota Interna</option>
               </select>
               <input type="date" className="modal-input" value={newFollowUp.scheduledAt} onChange={e => setNewFollowUp({...newFollowUp, scheduledAt: e.target.value})} />
             </div>
             <div className="flex gap-2">
               <textarea required className="modal-input flex-1 resize-none" placeholder="O que foi decidido?" rows={2} value={newFollowUp.content} onChange={e => setNewFollowUp({...newFollowUp, content: e.target.value})} />
               <button disabled={submitting} className="bg-primary text-white p-4 rounded-xl hover:bg-blue-600 shadow-lg shadow-blue-200 transition-all self-end"><Send size={20} /></button>
             </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

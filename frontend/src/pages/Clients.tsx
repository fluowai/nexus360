import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  ChevronRight,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Target,
  Globe,
  Briefcase,
  MapPin,
  Trash2,
  Edit3,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const fetchClients = async () => {
    try {
      const res = await apiFetch(`/api/clients`);
      const data = await res.json();
      setClients(data.clients || data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente? Todos os dados vinculados serão perdidos.")) return;
    try {
      await apiFetch(`/api/clients/${id}`, { method: 'DELETE' });
      fetchClients();
    } catch (err) {
      alert("Erro ao excluir cliente.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo': 
        return <span className="bg-green-50 text-green-600 border border-green-100 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
          <CheckCircle2 size={12} /> Ativo
        </span>;
      case 'onboarding': 
        return <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
          <Clock size={12} /> Onboarding
        </span>;
      case 'churned': 
        return <span className="bg-red-50 text-red-600 border border-red-100 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
          <AlertCircle size={12} /> Churn
        </span>;
      default:
        return <span className="bg-gray-50 text-gray-600 border border-gray-100 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit">
          {status}
        </span>;
    }
  };

  const filteredClients = clients.filter(c => 
    c.corporateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tradeName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 h-full p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Gestão de Clientes</h1>
          <p className="text-gray-500">Controle operacional e comercial de contas ativas.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl w-[250px] sm:w-[300px] focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setEditingClient(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all font-bold text-sm shadow-lg shadow-blue-100"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Novo Cliente</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empresa / Raio-X</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsável</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Origem</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold shadow-sm group-hover:scale-110 transition-transform">
                        {client.corporateName?.substring(0, 1) || <Building2 size={18} />}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 leading-none mb-1">{client.corporateName}</div>
                        <div className="text-xs text-gray-500">{client.tradeName || 'Sem nome fantasia'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-semibold text-gray-700">{client.responsibleName || 'Não definido'}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-tighter">{client.responsibleRole || 'Sócio'}</div>
                  </td>
                  <td className="px-6 py-5">
                    {getStatusBadge(client.status)}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                        <Target size={12} className="text-gray-400" />
                        {client.source || 'Indefinida'}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{client.sourceDetail || '-'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/clients/${client.id}`}
                        className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1.5"
                      >
                        Visão 360 <ChevronRight size={14} />
                      </Link>
                      <button 
                        onClick={() => { setEditingClient(client); setShowModal(true); }}
                        className="p-1.5 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(client.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <ClientModal 
            onClose={() => setShowModal(false)} 
            onSuccess={() => { setShowModal(false); fetchClients(); }}
            initialData={editingClient}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClientModal({ onClose, onSuccess, initialData }: { onClose: () => void, onSuccess: () => void, initialData?: any }) {
  const [tab, setTab] = useState<'empresa' | 'raiox' | 'business' | 'pessoa'>('empresa');
  const [formData, setFormData] = useState({
    corporateName: initialData?.corporateName || '',
    tradeName: initialData?.tradeName || '',
    cnpj: initialData?.cnpj || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    website: initialData?.website || '',
    status: initialData?.status || 'prospect',
    source: initialData?.source || 'Google Ads',
    sourceDetail: initialData?.sourceDetail || '',
    segment: initialData?.segment || '',
    porte: initialData?.porte || 'Pequeno',
    revenue: initialData?.revenue || 0,
    responsibleName: initialData?.responsibleName || '',
    responsibleEmail: initialData?.responsibleEmail || '',
    responsiblePhone: initialData?.responsiblePhone || '',
    responsibleRole: initialData?.responsibleRole || ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = initialData ? `/api/clients/${initialData.id}` : '/api/clients';
      const method = initialData ? 'PATCH' : 'POST';
      await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'empresa', label: '🏢 Empresa', icon: <Building2 size={14} /> },
    { id: 'raiox', label: '🎯 Raio-X Origem', icon: <Target size={14} /> },
    { id: 'business', label: '💼 Negócio', icon: <Briefcase size={14} /> },
    { id: 'pessoa', label: '👤 Responsável', icon: <Users size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{initialData ? 'Editar Cliente' : 'Novo Cliente Premium'}</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Cadastro Detalhado 360°</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-100 px-8 bg-gray-50/30">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          <AnimatePresence mode="wait">
            {tab === 'empresa' && (
              <motion.div 
                key="empresa" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Razão Social</label>
                    <input className="modal-input font-bold" placeholder="Nome Jurídico Completo" value={formData.corporateName} onChange={e => setFormData({...formData, corporateName: e.target.value})} required />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome Fantasia</label>
                    <input className="modal-input" placeholder="Como é conhecido" value={formData.tradeName} onChange={e => setFormData({...formData, tradeName: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CNPJ</label>
                    <input className="modal-input" placeholder="00.000.000/0001-00" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">E-mail Corporativo</label>
                    <input className="modal-input" type="email" placeholder="financeiro@empresa.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">WhatsApp/Telefone</label>
                    <input className="modal-input" placeholder="(11) 99999-9999" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'raiox' && (
              <motion.div 
                key="raiox" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="p-6 bg-blue-50/50 rounded-[24px] border border-blue-100 flex items-start gap-4 mb-6">
                   <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <Sparkles size={24} />
                   </div>
                   <div>
                      <h4 className="font-bold text-blue-900 leading-none mb-1 text-sm">Raio-X de Aquisição</h4>
                      <p className="text-xs text-blue-600/70">Entenda de onde esse cliente veio para otimizar seu CAC.</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Canal de Origem</label>
                    <select className="modal-input font-bold" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                      <option value="Google Ads">Google Ads</option>
                      <option value="Meta Ads">Meta Ads (FB/IG)</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Prospecção Ativa">Prospecção Ativa (Cold Call/Email)</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Orgânico / SEO">Orgânico / SEO</option>
                      <option value="Evento / Networking">Evento / Networking</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status da Conta</label>
                    <select className="modal-input font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="prospect">Prospect (Em negociação)</option>
                      <option value="onboarding">Onboarding (Implantando)</option>
                      <option value="ativo">Ativo (Rodando)</option>
                      <option value="churned">Churn (Perdido)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detalhes da Origem</label>
                    <textarea className="modal-input min-h-[100px]" placeholder="Ex: Nome da pessoa que indicou ou Campanha 'Advocacia SP - 2024'" value={formData.sourceDetail} onChange={e => setFormData({...formData, sourceDetail: e.target.value})} />
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'business' && (
              <motion.div 
                key="business" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Segmento / Nicho</label>
                    <input className="modal-input" placeholder="Ex: Advocacia, Saúde, Varejo" value={formData.segment} onChange={e => setFormData({...formData, segment: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Porte da Empresa</label>
                    <select className="modal-input" value={formData.porte} onChange={e => setFormData({...formData, porte: e.target.value})}>
                      <option value="Micro">Micro (Até 10 func.)</option>
                      <option value="Pequeno">Pequeno (Até 50 func.)</option>
                      <option value="Médio">Médio (Até 250 func.)</option>
                      <option value="Grande">Grande (Acima de 250 func.)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Faturamento Estimado (Mensal)</label>
                    <input className="modal-input" type="number" placeholder="R$ 0,00" value={formData.revenue} onChange={e => setFormData({...formData, revenue: parseFloat(e.target.value)})} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Site / URL</label>
                    <input className="modal-input" placeholder="https://..." value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'pessoa' && (
              <motion.div 
                key="pessoa" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome do Responsável / Decisor</label>
                    <input className="modal-input font-bold" placeholder="Nome Completo" value={formData.responsibleName} onChange={e => setFormData({...formData, responsibleName: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cargo</label>
                    <input className="modal-input" placeholder="Ex: CEO, Diretor Comercial" value={formData.responsibleRole} onChange={e => setFormData({...formData, responsibleRole: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">E-mail Direto</label>
                    <input className="modal-input" type="email" placeholder="nome@empresa.com" value={formData.responsibleEmail} onChange={e => setFormData({...formData, responsibleEmail: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Telefone Direto</label>
                    <input className="modal-input" placeholder="(11) 99999-9999" value={formData.responsiblePhone} onChange={e => setFormData({...formData, responsiblePhone: e.target.value})} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-10 flex gap-4 mt-auto">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-all">Cancelar</button>
            <button 
              type="submit" 
              disabled={submitting}
              className="flex-[2] py-4 bg-primary text-white text-xs font-black uppercase rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? 'Salvando...' : (initialData ? 'Salvar Alterações' : 'Cadastrar Cliente')}
              {!submitting && <ChevronRight size={16} />}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

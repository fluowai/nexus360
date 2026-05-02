import { useState, useEffect } from "react";
import { 
  Building2, 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  MoreVertical,
  ArrowRight,
  Globe,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function AdminAgencies() {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', domain: '', plan: 'Pro' });
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [registeringDomain, setRegisteringDomain] = useState(false);

  const handleDomainRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !customDomain) return;
    
    setRegisteringDomain(true);
    try {
      const res = await apiFetch('/api/admin/domains', {
        method: 'POST',
        body: JSON.stringify({ domain: customDomain, orgId: selectedOrg.id })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Domínio configurado com sucesso no Vercel e DirectAdmin!");
        setShowDomainModal(false);
        setCustomDomain('');
        fetchAgencies();
      } else {
        alert("Erro: " + (data.details || data.error));
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setRegisteringDomain(false);
    }
  };

  const fetchAgencies = async () => {
    try {
      const res = await apiFetch('/api/admin/orgs');
      if (res.ok) setAgencies(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/admin/orgs', {
        method: 'POST',
        body: JSON.stringify(newOrg)
      });
      if (res.ok) {
        setShowModal(false);
        fetchAgencies();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta agência? Todos os dados dela serão excluídos.")) return;
    try {
      const res = await apiFetch(`/api/admin/orgs/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAgencies();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agências Clientes</h1>
          <p className="text-sm text-gray-500">Gerencie todas as instâncias e sub-contas da plataforma.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200"
        >
          <Plus size={20} />
          <span>Nova Agência</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               placeholder="Pesquisar por nome, domínio ou ID..." 
               className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
             />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="px-8 py-4">Agência</th>
                <th className="px-4 py-4">Plano</th>
                <th className="px-4 py-4">Usuários</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center text-gray-400">Carregando agências...</td></tr>
              ) : agencies.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-gray-400">Nenhuma agência encontrada.</td></tr>
              ) : agencies.map((org) => (
                <tr key={org.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        {org.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{org.name}</p>
                        <p className="text-xs text-gray-400">{org.domain || 'nexus/custom'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      org.plan === 'Enterprise' ? 'bg-purple-100 text-purple-600' : 
                      org.plan === 'Pro' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-4 py-5 font-medium text-gray-600">
                    {org._count?.users || 0}
                  </td>
                  <td className="px-4 py-5 text-emerald-500 font-medium">Ativo</td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setSelectedOrg(org);
                          setShowDomainModal(true);
                        }}
                        className="p-2 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-all"
                        title="Configurar Domínio Personalizado"
                      >
                        <Globe size={16} />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-all">
                        <ExternalLink size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(org.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-all"
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Provisionar Nova Agência</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome da Agência</label>
                <input 
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={newOrg.name}
                  onChange={e => setNewOrg({...newOrg, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Domínio Personalizado</label>
                <input 
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={newOrg.domain}
                  onChange={e => setNewOrg({...newOrg, domain: e.target.value})}
                  placeholder="ex: agencialife.com"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Plano Inicial</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={newOrg.plan}
                  onChange={e => setNewOrg({...newOrg, plan: e.target.value})}
                >
                  <option value="Free">Gratuito</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex gap-4 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-200"
                >
                  Criar Agência
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Domain Registration Modal */}
      {showDomainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <Globe size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Domínio Personalizado</h2>
                <p className="text-xs text-gray-500">Para: {selectedOrg?.name}</p>
              </div>
            </div>

            <form onSubmit={handleDomainRegister} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Novo Domínio</label>
                <input 
                  required
                  placeholder="ex: mkt.cliente.com.br"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none font-mono"
                  value={customDomain}
                  onChange={e => setCustomDomain(e.target.value)}
                />
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-2">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Atenção</p>
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  Este processo irá configurar o domínio automaticamente no <strong>Vercel</strong> e no <strong>DirectAdmin</strong>. 
                  Certifique-se que o domínio já aponta para os nossos servidores.
                </p>
              </div>

              <div className="flex gap-4 mt-2">
                <button 
                  type="button" 
                  disabled={registeringDomain}
                  onClick={() => setShowDomainModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={registeringDomain}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  {registeringDomain ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <span>Confirmar</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

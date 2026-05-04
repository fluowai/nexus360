import { useState, useEffect } from "react";
import { Globe, Plus, AlertCircle, CheckCircle, ExternalLink, HelpCircle, Loader2, X, MessageSquare } from "lucide-react";
import { apiFetch } from "../lib/api";

interface Domain {
  id: string;
  name: string;
  provider: string;
  status: string;
}

export default function DomainSettings() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState({ name: '', provider: 'vercel' });
  const [isSaving, setIsSaving] = useState(false);

  const fetchDomains = async () => {
    try {
      const res = await apiFetch('/api/domains');
      setDomains(await res.json());
    } catch (error) {
      console.error("Error fetching domains:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiFetch('/api/domains', {
        method: 'POST',
        body: JSON.stringify(newDomain)
      });
      setIsModalOpen(false);
      setNewDomain({ name: '', provider: 'vercel' });
      fetchDomains();
    } catch (error) {
      alert("Erro ao cadastrar domínio. Verifique os dados.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Domínios Personalizados</h2>
          <p className="text-gray-500">Gerencie os endereços das suas landing pages e funis.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
          <span>Novo Domínio</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {domains.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Globe className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-medium">Nenhum domínio configurado.</p>
          </div>
        ) : (
          domains.map((d) => (
            <div key={d.id} className="glass-card p-6 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${d.status === 'verified' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                    <Globe size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{d.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {d.status === 'verified' ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle size={12} /> Verificado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          <AlertCircle size={12} /> Configuração Pendente
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 uppercase font-bold">Provider: {d.provider}</span>
                    </div>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
              </div>

              {/* INSTRUÇÕES DNS */}
              {d.status !== 'verified' && (
                <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100/50">
                  <div className="flex items-center gap-2 text-blue-800 font-bold mb-4">
                    <ExternalLink size={18} />
                    <h4>Configuração de DNS Necessária</h4>
                  </div>
                  <p className="text-sm text-blue-700/80 mb-4">
                    Para que seu domínio funcione no Nexus360, você precisa configurar os apontamentos abaixo no seu provedor de domínio (Registro.br, GoDaddy, etc):
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-blue-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Entrada Tipo A</span>
                      <div className="flex justify-between items-center mt-1">
                        <code className="text-primary font-bold text-lg">76.76.21.21</code>
                        <button className="text-[10px] bg-blue-50 text-primary font-bold px-2 py-1 rounded">Copiar</button>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-blue-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Entrada CNAME (www)</span>
                      <div className="flex justify-between items-center mt-1">
                        <code className="text-primary font-bold text-sm">cname.vercel-dns.com</code>
                        <button className="text-[10px] bg-blue-50 text-primary font-bold px-2 py-1 rounded">Copiar</button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button className="bg-primary text-white text-sm font-bold px-6 py-2 rounded-lg hover:bg-blue-600 transition-all"> Validar DNS agora</button>
                    <button className="bg-white text-gray-700 border border-gray-200 text-sm font-bold px-6 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-all">
                      <HelpCircle size={16} /> Tutorial Completo
                    </button>
                    <button className="ml-auto flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                      <MessageSquare size={16} /> Não conseguiu? Abrir Suporte
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODAL ADICIONAR DOMÍNIO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-bold text-gray-900">Configurar Domínio</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            <form onSubmit={handleAdd} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Endereço do Domínio</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="exemplo.com.br ou lp.seusite.com"
                  value={newDomain.name}
                  onChange={e => setNewDomain({...newDomain, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Tipo de Hospedagem</label>
                <select 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  value={newDomain.provider}
                  onChange={e => setNewDomain({...newDomain, provider: e.target.value})}
                >
                  <option value="vercel">Cloud (Vercel) - Recomendado</option>
                  <option value="directadmin">Servidor Próprio (DirectAdmin)</option>
                </select>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-2xl flex gap-3 border border-orange-100">
                <AlertCircle className="text-orange-500 shrink-0" size={20} />
                <p className="text-xs text-orange-700 leading-relaxed">
                  Ao cadastrar, nosso sistema iniciará o processo de reserva. Você ainda precisará alterar o DNS no seu provedor original.
                </p>
              </div>

              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Globe size={20}/>}
                Cadastrar Domínio
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

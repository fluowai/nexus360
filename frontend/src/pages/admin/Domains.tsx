import { useCallback, useEffect, useState } from "react";
import { 
  Globe, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw,
  Search,
  CheckCircle2
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function AdminDomains() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadDomains = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/admin/domains");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao carregar domínios.");
      setDomains(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar domínios.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void loadDomains(); }, [loadDomains]);
  const verified = domains.filter((domain) => domain.status === "verified").length;
  const pending = domains.filter((domain) => domain.status === "pending").length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Domínios e SSL</h1>
        <p className="text-sm text-gray-500">Monitore o status de apontamento DNS e certificados de segurança das agências.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SSL Ativos</p>
             <h4 className="text-2xl font-bold text-gray-900">{verified}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pendentes</p>
             <h4 className="text-2xl font-bold text-gray-900">{pending}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4 text-primary">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <RefreshCw size={24} />
          </div>
          <div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total cadastrado</p>
             <h4 className="text-2xl font-bold text-gray-900">{domains.length}</h4>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
           <div className="relative w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input placeholder="Buscar domínio..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs outline-none" />
           </div>
           <button onClick={() => void loadDomains()} disabled={loading} className="text-xs font-bold text-primary hover:underline flex items-center gap-1 disabled:opacity-50">
             <RefreshCw size={14} /> Atualizar Todos
           </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="px-8 py-4">Domínio</th>
                <th className="px-4 py-4">Agência</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Atualizado</th>
                <th className="px-8 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && <tr><td colSpan={5} className="p-12 text-center text-gray-400">Consultando domínios...</td></tr>}
              {!loading && error && <tr><td colSpan={5} className="p-12 text-center text-red-600">{error}</td></tr>}
              {!loading && !error && domains.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-gray-400">Nenhum domínio cadastrado.</td></tr>}
              {!loading && !error && domains.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                      <Globe size={16} className="text-gray-400" />
                      {d.name}
                    </div>
                  </td>
                  <td className="px-4 py-5 text-gray-600 font-medium">{d.organization?.name || "—"}</td>
                  <td className="px-4 py-5">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      d.status === 'verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {d.status === "verified" ? "Verificado" : d.status === "error" ? "Erro" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-xs text-gray-500">{new Date(d.updatedAt).toLocaleString("pt-BR")}</td>
                  <td className="px-8 py-5 text-right">
                    <a href={`https://${d.name}`} target="_blank" rel="noreferrer" className="inline-flex p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900">
                      <ExternalLink size={16} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

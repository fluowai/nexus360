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
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
      case 'pausado': 
        return <span className="bg-orange-50 text-orange-600 border border-orange-100 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
          <AlertCircle size={12} /> Pausado
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
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl w-[300px] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-gray-600 shadow-sm">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empresa / Razão Social</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsável</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contatos</th>
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
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail size={12} className="text-gray-300" />
                      {client.email}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone size={12} className="text-gray-300" />
                      {client.phone || 'N/A'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <Link 
                      to={`/clients/${client.id}`}
                      className="px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1.5"
                    >
                      Visão 360 <ChevronRight size={14} />
                    </Link>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                      <Users size={32} />
                    </div>
                    <div className="text-gray-400 font-medium">Nenhum cliente convertido ainda.</div>
                    <Link to="/crm" className="text-primary text-sm font-bold hover:underline">Ir para o CRM →</Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

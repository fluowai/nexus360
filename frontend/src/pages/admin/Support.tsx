import { useState } from "react";
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  User,
  ArrowRight,
  Send
} from "lucide-react";
import { motion } from "motion/react";

export default function AdminSupport() {
  const [tickets] = useState([
    { id: 'TKT-1024', org: 'Agência Alpha', subject: 'Erro ao integrar Meta Ads', priority: 'Alta', status: 'Aberto', date: 'Há 10 min' },
    { id: 'TKT-1025', org: 'Consultio Digital', subject: 'Dúvida sobre plano Enterprise', priority: 'Média', status: 'Em Análise', date: 'Há 1 hora' },
    { id: 'TKT-1026', org: 'Beta Mkt', subject: 'Solicitação de novo template', priority: 'Baixa', status: 'Resolvido', date: 'Há 1 dia' },
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central de Suporte Global</h1>
          <p className="text-sm text-gray-500">Gerencie os chamados e solicitações de todas as agências da plataforma.</p>
        </div>
        <div className="flex gap-2">
           <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs">
             <AlertCircle size={16} />
             2 CHAMADOS URGENTES
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total de Tickets', value: '142', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Abertos', value: '12', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Resolvidos', value: '130', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Tempo Médio', value: '24min', icon: ArrowRight, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
            <h4 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h4>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               placeholder="Pesquisar tickets por ID, agência ou assunto..." 
               className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
             />
           </div>
           <button className="p-3 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-all">
             <Filter size={20} />
           </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="px-8 py-4">ID / Agência</th>
                <th className="px-4 py-4">Assunto</th>
                <th className="px-4 py-4">Prioridade</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-8 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs text-primary font-bold">{t.id}</span>
                      <span className="font-bold text-gray-900">{t.org}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5 font-medium text-gray-600">{t.subject}</td>
                  <td className="px-4 py-5">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      t.priority === 'Alta' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${t.status === 'Resolvido' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                       <span className="font-medium text-gray-700">{t.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="flex items-center gap-2 ml-auto bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black transition-all opacity-0 group-hover:opacity-100">
                      <Send size={14} />
                      Responder
                    </button>
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

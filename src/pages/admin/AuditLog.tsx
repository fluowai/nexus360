import { useState } from "react";
import { 
  History, 
  Search, 
  Filter, 
  ArrowRight, 
  User, 
  ShieldAlert, 
  Settings,
  LogIn
} from "lucide-react";
import { motion } from "motion/react";

export default function AdminAudit() {
  const [logs] = useState([
    { id: 1, user: 'Paulo (Dono)', action: 'Criou Agência', target: 'Agência Beta', date: 'Há 5 minutos', type: 'CREATE', icon: User, color: 'text-blue-500' },
    { id: 2, user: 'Sistema', action: 'Login Super Admin', target: 'contato@consultio.com.br', date: 'Há 12 minutos', type: 'AUTH', icon: LogIn, color: 'text-emerald-500' },
    { id: 3, user: 'Paulo (Dono)', action: 'Alterou Plano', target: 'Agência Alpha', date: 'Há 1 hora', type: 'UPDATE', icon: Settings, color: 'text-purple-500' },
    { id: 4, user: 'Admin 2', action: 'Excluiu Usuário', target: 'user_42', date: 'Há 2 horas', type: 'DELETE', icon: ShieldAlert, color: 'text-red-500' },
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500">Histórico completo de ações realizadas por administradores na plataforma.</p>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4">
           <div className="relative flex-1 min-w-[300px]">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               placeholder="Pesquisar por usuário, ação ou alvo..." 
               className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
             />
           </div>
           <button className="flex items-center gap-2 px-4 py-3 bg-gray-50 text-gray-600 rounded-2xl font-bold text-xs hover:bg-gray-100">
             <Filter size={18} />
             Filtros Avançados
           </button>
        </div>

        <div className="flex flex-col">
          {logs.map((log, i) => (
            <motion.div 
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-6 border-b border-gray-50 hover:bg-gray-50/50 transition-colors flex items-center gap-6"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gray-50 ${log.color} flex items-center justify-center shrink-0`}>
                <log.icon size={20} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900">{log.user}</span>
                  <ArrowRight size={14} className="text-gray-300" />
                  <span className="text-gray-600">{log.action}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-400">Alvo: <span className="font-medium text-gray-500">{log.target}</span></span>
                  <div className="w-1 h-1 bg-gray-200 rounded-full" />
                  <span className="text-gray-400">{log.date}</span>
                </div>
              </div>

              <div className="hidden sm:block">
                <span className={`text-[10px] font-bold px-3 py-1 rounded-lg border ${
                  log.type === 'CREATE' ? 'border-blue-100 text-blue-600' :
                  log.type === 'DELETE' ? 'border-red-100 text-red-600' : 'border-gray-100 text-gray-400'
                }`}>
                  {log.type}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="p-6 bg-gray-50/50 flex justify-center">
          <button className="text-xs font-bold text-gray-400 hover:text-primary transition-colors">
            CARREGAR LOGS ANTIGOS
          </button>
        </div>
      </div>
    </div>
  );
}

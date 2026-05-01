import { useState, useEffect } from "react";
import { 
  Building2, 
  Users, 
  CreditCard, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight,
  Zap,
  Globe,
  Database
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../lib/api";

export default function SuperAdmin() {
  const [metrics, setMetrics] = useState({ agencies: 3, totalUsers: 12, totalLeads: 1540, revenue: 291 });
  const [loading, setLoading] = useState(false);

  // Simulating data loading
  useEffect(() => {
    // fetch data from /api/admin/metrics in the future
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 -m-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1E293B]">Visão Geral</h1>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { 
              label: "Total de Agências", 
              value: metrics.agencies, 
              icon: Building2, 
              iconColor: "text-white", 
              iconBg: "bg-blue-500",
              shadow: "shadow-blue-100" 
            },
            { 
              label: "Assinaturas Ativas", 
              value: metrics.agencies, 
              icon: Users, 
              iconColor: "text-white", 
              iconBg: "bg-emerald-500",
              shadow: "shadow-emerald-100" 
            },
            { 
              label: "Receita Mensal (Est.)", 
              value: `R$ ${metrics.revenue}`, 
              icon: CreditCard, 
              iconColor: "text-white", 
              iconBg: "bg-indigo-500",
              shadow: "shadow-indigo-100" 
            },
            { 
              label: "Status do Servidor", 
              value: "Online", 
              icon: Globe, 
              iconColor: "text-white", 
              iconBg: "bg-purple-500",
              shadow: "shadow-purple-100" 
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all"
            >
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{card.label}</p>
                <h3 className="text-3xl font-bold text-gray-900">{card.value}</h3>
              </div>
              <div className={`w-12 h-12 ${card.iconBg} rounded-2xl flex items-center justify-center ${card.shadow} shadow-lg transition-transform group-hover:scale-110`}>
                <card.icon className={card.iconColor} size={24} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 min-h-[400px]"
          >
            <div className="flex items-center gap-3 mb-8">
              <Activity className="text-gray-400" size={20} />
              <h3 className="text-lg font-bold text-gray-900">Atividade Recente</h3>
            </div>
            
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <Database className="text-gray-300" size={32} />
               </div>
               <p className="text-gray-400 text-sm">Nenhuma atividade recente registrada.</p>
            </div>
          </motion.div>

          {/* System Alerts */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 min-h-[400px]"
          >
            <div className="flex items-center gap-3 mb-8">
              <AlertCircle className="text-gray-400" size={20} />
              <h3 className="text-lg font-bold text-gray-900">Alertas do Sistema</h3>
            </div>

            <div className="flex flex-col items-center justify-center h-full text-center py-20">
               <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                 <CheckCircle2 className="text-emerald-500" size={32} />
               </div>
               <p className="text-gray-500 font-medium mb-1">Tudo operando normalmente</p>
               <p className="text-gray-400 text-sm">Nenhum incidente detectado nas últimas 24h.</p>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions / Agencias (Extra) */}
        <div className="mt-8 bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-gray-900">Agências Recentes</h3>
            <button className="text-primary font-bold text-sm flex items-center gap-2 hover:underline">
              Ver todas as agências <ArrowUpRight size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Agência Alpha', 'Consultio Digital', 'Nexus Master'].map((name, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary font-bold">
                  {name[0]}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">{name}</p>
                  <p className="text-xs text-gray-500">Assinatura Pro</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


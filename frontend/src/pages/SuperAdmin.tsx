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
  Database,
  ShieldCheck,
  Server,
  UserPlus,
  Wallet,
  LayoutDashboard
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../lib/api";
import { Link } from "react-router-dom";

export default function SuperAdmin() {
  const [metrics, setMetrics] = useState({ agencies: 0, totalUsers: 0, totalLeads: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiFetch('/api/admin/metrics');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error("Failed to fetch admin metrics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 -m-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Visão Geral</h1>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { 
              label: "Total de Clientes", 
              value: "3", 
              icon: Building2, 
              iconColor: "text-white", 
              iconBg: "bg-blue-500",
              shadow: "shadow-blue-200"
            },
            { 
              label: "Assinaturas Ativas", 
              value: "3", 
              icon: Users, 
              iconColor: "text-white", 
              iconBg: "bg-emerald-500",
              shadow: "shadow-emerald-200"
            },
            { 
              label: "Receita Mensal (Est.)", 
              value: "R$ 291", 
              icon: Wallet, 
              iconColor: "text-white", 
              iconBg: "bg-indigo-500",
              shadow: "shadow-indigo-200"
            },
            { 
              label: "Status do Servidor", 
              value: "Online", 
              icon: LayoutDashboard, 
              iconColor: "text-white", 
              iconBg: "bg-purple-500",
              shadow: "shadow-purple-200"
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all"
            >
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
                <h3 className="text-3xl font-black text-gray-900">{card.value}</h3>
              </div>
              <div className={`w-14 h-14 ${card.iconBg} rounded-[20px] flex items-center justify-center ${card.shadow} shadow-lg transition-transform group-hover:scale-110`}>
                <card.icon className={card.iconColor} size={28} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 min-h-[350px] relative overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
              <Activity className="text-gray-300" size={20} />
              <h3 className="text-lg font-bold text-gray-900">Atividade Recente</h3>
            </div>
            
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
               <p className="text-gray-400 text-sm font-medium">Nenhuma atividade recente registrada.</p>
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 min-h-[350px] relative overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
              <CheckCircle2 className="text-emerald-500" size={20} />
              <h3 className="text-lg font-bold text-gray-900">Alertas do Sistema</h3>
            </div>

            <div className="flex flex-col items-center justify-center h-[200px] text-center">
               <p className="text-gray-400 text-sm font-medium">Sistema operando normalmente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


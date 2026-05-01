import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Users, 
  Target, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "../lib/api";

export default function Dashboard() {

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const orgId = localStorage.getItem('nexus_org_id') || '';
    apiFetch(`/api/admin/dashboard${orgId ? `?orgId=${orgId}` : ''}`)
      .then(res => {
        if (!res.ok) throw new Error("Não autorizado ou erro no servidor");
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message));
  }, []);

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-red-500 font-medium">{error}</p>
      <button 
        onClick={() => window.location.href = '/login'}
        className="px-4 py-2 bg-primary text-white rounded-lg"
      >
        Ir para Login
      </button>
    </div>
  );

  if (!data || !data.metrics) return <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">Carregando painel...</div>;


  const stats = [
    { label: "Total de Leads", value: data.metrics.leads, icon: Users, color: "bg-blue-50 text-blue-600", trend: "+12%" },
    { label: "Taxa de Conversão", value: `${data.metrics.conversions}%`, icon: Target, color: "bg-green-50 text-green-600", trend: "+2.4%" },
    { label: "Receita Est. (MRR)", value: `R$ ${data.metrics.revenue.toLocaleString()}`, icon: DollarSign, color: "bg-purple-50 text-purple-600", trend: "+18%" },
    { label: "Conteúdos Ativos", value: data.metrics.contentCount, icon: FileText, color: "bg-orange-50 text-orange-600", trend: "+5" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-2">Bem-vindo, Agência Alpha 👋</h1>
        <p className="text-sm sm:text-base text-gray-500">Aqui está um resumo da performance da sua agência hoje.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-card flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <Icon size={24} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend}
                  <TrendingUp size={14} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-lg text-gray-900">Performance Semanal</h3>
              <p className="text-sm text-gray-500">Fluxo de leads e conversão por dia</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded">Leads</span>
              <span className="flex items-center gap-1 text-xs font-medium bg-green-50 text-green-600 px-2 py-1 rounded">Conversão</span>
            </div>
          </div>
          <div className="w-full h-[300px] min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              <Area type="monotone" dataKey="conv" stroke="#10B981" strokeWidth={3} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Summary */}
        <div className="glass-card">
          <h3 className="font-bold text-lg text-gray-900 mb-6">Metas Mensais</h3>
          <div className="flex flex-col gap-8">
            {[
              { label: "Leads Qualificados", current: 850, total: 1000, color: "bg-blue-600" },
              { label: "Propostas Enviadas", current: 42, total: 60, color: "bg-purple-600" },
              { label: "Conversão Final", current: 3.2, total: 5, color: "bg-green-600" },
            ].map((meta, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{meta.label}</span>
                  <span className="text-gray-500">{Math.round((meta.current/meta.total)*100)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(meta.current/meta.total)*100}%` }}
                    className={`h-full ${meta.color}`}
                  />
                </div>
                <span className="text-xs text-gray-400 font-medium">{meta.current} / {meta.total} planejado</span>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-100">
            <button className="w-full py-3 bg-gray-50 text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
              <TrendingUp size={18} />
              <span>Ver Relatório Completo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

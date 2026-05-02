import { useState } from "react";
import { 
  TrendingUp, 
  Users, 
  Activity, 
  BarChart3,
  Calendar
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { motion } from "motion/react";

const growthData = [
  { name: "Jan", users: 400, rev: 2400 },
  { name: "Fev", users: 600, rev: 3500 },
  { name: "Mar", users: 900, rev: 5800 },
  { name: "Abr", users: 1200, rev: 8900 },
  { name: "Mai", users: 1500, rev: 11000 },
  { name: "Jun", users: 2100, rev: 15600 },
];

export default function AdminAnalytics() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Global</h1>
        <p className="text-sm text-gray-500">Métricas de crescimento, retenção e saúde financeira da plataforma.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { label: 'Crescimento de Usuários', value: '+42%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Retenção (Churn)', value: '2.1%', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'LTV Médio', value: 'R$ 4.250', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((m, i) => (
          <div key={i} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${m.bg} ${m.color}`}>
              <m.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{m.label}</p>
              <h4 className="text-2xl font-bold text-gray-900">{m.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Crescimento de Receita (MRR)
            </h3>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-gray-50 text-gray-500 text-xs font-bold rounded-lg hover:bg-gray-100">6 Meses</button>
              <button className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg">12 Meses</button>
            </div>
          </div>
          <div className="h-[300px] min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="rev" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-8 flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Novos Usuários por Mês
          </h3>
          <div className="h-[300px] min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#F8F9FA'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="users" radius={[8, 8, 0, 0]}>
                  {growthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === growthData.length - 1 ? '#3B82F6' : '#E2E8F0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

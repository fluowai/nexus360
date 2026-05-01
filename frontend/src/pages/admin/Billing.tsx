import { useState } from "react";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Filter,
  Download,
  Search
} from "lucide-react";
import { motion } from "motion/react";

export default function AdminBilling() {
  const [invoices] = useState([
    { id: 'INV-001', org: 'Agência Alpha', amount: '499.00', status: 'Pago', date: '30/04/2026' },
    { id: 'INV-002', org: 'Consultio Digital', amount: '1.299.00', status: 'Pendente', date: '29/04/2026' },
    { id: 'INV-003', org: 'Nexus Master', amount: '499.00', status: 'Pago', date: '28/04/2026' },
    { id: 'INV-004', org: 'Agência Beta', amount: '0.00', status: 'Gratuito', date: '27/04/2026' },
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro Global</h1>
        <p className="text-sm text-gray-500">Acompanhe faturamento, inadimplência e assinaturas de todas as agências.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-900 p-8 rounded-[32px] text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          <div className="flex justify-between items-start mb-8">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2 py-1 rounded-lg">
              <ArrowUpRight size={14} />
              +12.5%
            </div>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Faturamento Total (MRR)</p>
          <h2 className="text-3xl font-bold">R$ 22.450,00</h2>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
           <div className="flex justify-between items-start mb-8">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <CreditCard size={24} />
            </div>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Inadimplência</p>
          <h2 className="text-3xl font-bold text-gray-900">2.4%</h2>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
           <div className="flex justify-between items-start mb-8">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
              <ArrowDownLeft size={24} />
            </div>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Tickets Médio</p>
          <h2 className="text-3xl font-bold text-gray-900">R$ 580,00</h2>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
           <h3 className="font-bold text-gray-900">Últimas Faturas</h3>
           <div className="flex gap-2">
             <button className="p-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-all">
               <Download size={18} />
             </button>
             <button className="p-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-all">
               <Filter size={18} />
             </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="px-8 py-4">ID</th>
                <th className="px-4 py-4">Agência</th>
                <th className="px-4 py-4">Valor</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-8 py-4 text-right">Data</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600">
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-4 font-mono text-xs">{inv.id}</td>
                  <td className="px-4 py-4 font-bold text-gray-900">{inv.org}</td>
                  <td className="px-4 py-4 font-medium text-gray-900">R$ {inv.amount}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      inv.status === 'Pago' ? 'bg-emerald-100 text-emerald-600' :
                      inv.status === 'Pendente' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right text-gray-400 font-medium">{inv.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Search, 
  Download, 
  Filter, 
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function AdminBilling() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalPaid: 0,
    totalPending: 0,
    activeSubscribers: 0
  });

  useEffect(() => {
    // Simulação de dados por enquanto, conectaremos ao backend no próximo passo
    setTimeout(() => {
      setInvoices([
        { id: '1', orgName: 'Agência Alpha', amount: 499.00, status: 'PAID', dueDate: '2024-05-10', paidAt: '2024-05-09' },
        { id: '2', orgName: 'Consultio Digital', amount: 999.00, status: 'PENDING', dueDate: '2024-05-15' },
        { id: '3', orgName: 'Marketing Pro', amount: 499.00, status: 'OVERDUE', dueDate: '2024-05-01' },
      ]);
      setMetrics({
        totalPaid: 15420.00,
        totalPending: 2450.00,
        activeSubscribers: 32
      });
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Faturas SaaS</h1>
          <p className="text-sm text-gray-500">Controle o faturamento e as assinaturas das agências.</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200">
          <Plus size={20} />
          <span>Lançar Cobrança</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          label="Recebido (Mês)" 
          value={`R$ ${metrics.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={CheckCircle2}
          color="emerald"
          trend="+12%"
        />
        <MetricCard 
          label="Pendente" 
          value={`R$ ${metrics.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Clock}
          color="amber"
          trend="+5%"
        />
        <MetricCard 
          label="Assinantes Ativos" 
          value={metrics.activeSubscribers.toString()}
          icon={CreditCard}
          color="blue"
          trend="+2"
        />
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between gap-4">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               placeholder="Pesquisar por agência ou ID da fatura..." 
               className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
             />
           </div>
           <div className="flex items-center gap-2">
             <button className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-500 transition-all">
               <Filter size={20} />
             </button>
             <button className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-500 transition-all">
               <Download size={20} />
             </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="px-8 py-4">Agência</th>
                <th className="px-4 py-4">Valor</th>
                <th className="px-4 py-4">Data de Vencimento</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center text-gray-400">Carregando faturas...</td></tr>
              ) : invoices.map((invoice) => (
                <tr key={invoice.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-bold text-gray-900">{invoice.orgName}</p>
                    <p className="text-[10px] text-gray-400 font-mono">INV-{invoice.id.padStart(6, '0')}</p>
                  </td>
                  <td className="px-4 py-5 font-bold text-gray-700">
                    R$ {invoice.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-5 text-gray-600 font-medium">
                    {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-5">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-all">
                      <Download size={16} />
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

function MetricCard({ label, value, icon: Icon, color, trend }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100'
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]} border`}>
          <Icon size={24} />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-bold ${trend.startsWith('+') ? 'text-emerald-500' : 'text-red-500'} bg-gray-50 px-2 py-1 rounded-full`}>
          {trend.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    PAID: { label: 'Pago', bg: 'bg-emerald-50', text: 'text-emerald-600', icon: CheckCircle2 },
    PENDING: { label: 'Pendente', bg: 'bg-amber-50', text: 'text-amber-600', icon: Clock },
    OVERDUE: { label: 'Atrasado', bg: 'bg-red-50', text: 'text-red-600', icon: AlertCircle }
  };

  const item = config[status] || config.PENDING;
  const Icon = item.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${item.bg} ${item.text} border border-current/10`}>
      <Icon size={12} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
    </div>
  );
}

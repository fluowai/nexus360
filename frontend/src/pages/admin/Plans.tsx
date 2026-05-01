import { useState } from "react";
import { 
  Ticket, 
  Check, 
  Plus, 
  Settings2, 
  Zap, 
  Shield, 
  Crown 
} from "lucide-react";
import { motion } from "motion/react";

const initialPlans = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    color: 'bg-gray-100',
    textColor: 'text-gray-600',
    icon: Zap,
    features: ['Até 50 Leads', '1 Usuário', 'Dashboard Básico']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '499',
    color: 'bg-blue-50',
    textColor: 'text-blue-600',
    icon: Shield,
    features: ['Leads Ilimitados', '10 Usuários', 'CRM Completo', 'Automação de Marketing']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '1.299',
    color: 'bg-purple-50',
    textColor: 'text-purple-600',
    icon: Crown,
    features: ['White-label Total', 'Usuários Ilimitados', 'API de Vídeo Meet', 'Suporte Prioritário']
  }
];

export default function AdminPlans() {
  const [plans, setPlans] = useState(initialPlans);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos e Assinaturas</h1>
          <p className="text-sm text-gray-500">Configure os níveis de acesso e preços da plataforma.</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200">
          <Plus size={20} />
          <span>Novo Plano</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, i) => (
          <motion.div 
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="p-8 pb-0">
               <div className={`w-12 h-12 rounded-2xl ${plan.color} ${plan.textColor} flex items-center justify-center mb-6`}>
                 <plan.icon size={24} />
               </div>
               <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
               <div className="flex items-baseline gap-1 mt-2 mb-6">
                 <span className="text-gray-400 text-sm">R$</span>
                 <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                 <span className="text-gray-400 text-sm">/mês</span>
               </div>
            </div>

            <div className="p-8 flex-1 bg-gray-50/50">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Incluso no Plano</p>
               <ul className="space-y-3">
                 {plan.features.map((feat, idx) => (
                   <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                     <Check size={16} className="text-emerald-500" />
                     <span>{feat}</span>
                   </li>
                 ))}
               </ul>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-2">
               <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all">
                 <Settings2 size={14} />
                 <span>Editar Limites</span>
               </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

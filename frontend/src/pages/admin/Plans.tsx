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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget as HTMLFormElement);
    const newPlan = {
      id: editingPlan?.id || Math.random().toString(36).substr(2, 9),
      name: data.get('name') as string,
      price: data.get('price') as string,
      features: (data.get('features') as string).split(',').map(f => f.trim()),
      color: editingPlan?.color || 'bg-blue-50',
      textColor: editingPlan?.textColor || 'text-blue-600',
      icon: editingPlan?.icon || Zap
    };

    if (editingPlan) {
      setPlans(plans.map(p => p.id === editingPlan.id ? newPlan : p));
    } else {
      setPlans([...plans, newPlan]);
    }
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos e Assinaturas</h1>
          <p className="text-sm text-gray-500">Configure os níveis de acesso e preços da plataforma.</p>
        </div>
        <button 
          onClick={() => {
            setEditingPlan(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200"
        >
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
               <button 
                onClick={() => {
                  setEditingPlan(plan);
                  setIsModalOpen(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all"
               >
                 <Settings2 size={14} />
                 <span>Editar Plano</span>
               </button>
            </div>
          </motion.div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingPlan ? 'Editar Plano' : 'Novo Plano'}</h2>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome do Plano</label>
                <input 
                  name="name"
                  defaultValue={editingPlan?.name}
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  placeholder="Ex: Pro Plus"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Preço Mensal (R$)</label>
                <input 
                  name="price"
                  defaultValue={editingPlan?.price}
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  placeholder="Ex: 599"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Recursos (separados por vírgula)</label>
                <textarea 
                  name="features"
                  defaultValue={editingPlan?.features.join(', ')}
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none h-24"
                  placeholder="Lead Ilimitado, Suporte 24h..."
                />
              </div>
              <div className="flex gap-4 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 font-bold text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg"
                >
                  Salvar Plano
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

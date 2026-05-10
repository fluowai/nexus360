import { useState, useEffect } from "react";
import { 
  Check, 
  Plus, 
  Settings2, 
  Zap, 
  Shield, 
  Crown,
  Trash2,
  Users,
  Target
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function AdminPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await apiFetch('/api/admin/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget as HTMLFormElement);
    const planData = {
      name: data.get('name') as string,
      description: data.get('description') as string,
      leadsLimit: parseInt(data.get('leadsLimit') as string),
      clientsLimit: parseInt(data.get('clientsLimit') as string),
      features: (data.get('features') as string).split(',').map(f => f.trim())
    };

    try {
      const method = editingPlan ? 'PATCH' : 'POST';
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      });

      if (res.ok) {
        fetchPlans();
        setIsModalOpen(false);
        setEditingPlan(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando planos...</div>;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Planos</h1>
          <p className="text-sm text-gray-500">Defina os limites e recursos para cada nível de assinatura.</p>
        </div>
        <button 
          onClick={() => {
            setEditingPlan(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
          <span>Novo Plano</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan, i) => (
          <motion.div 
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-all border-b-4 border-b-primary"
          >
            <div className="p-8 pb-0">
               <div className={`w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6`}>
                 <Crown size={24} />
               </div>
               <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
               <p className="text-sm text-gray-500 mt-1 mb-4">{plan.description || 'Sem descrição'}</p>
               
               <div className="flex flex-col gap-2 mb-6">
                 <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                   <Target size={16} className="text-primary" />
                   <span>{plan.leadsLimit} Leads</span>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                   <Users size={16} className="text-primary" />
                   <span>{plan.clientsLimit} Clientes</span>
                 </div>
               </div>
            </div>

            <div className="p-8 flex-1 bg-gray-50/50">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Funcionalidades</p>
               <ul className="space-y-3">
                 {plan.features?.map((feat: string, idx: number) => (
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
                 <span>Editar</span>
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
            className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingPlan ? 'Editar Plano' : 'Novo Plano'}</h2>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome do Plano</label>
                <input 
                  name="name"
                  defaultValue={editingPlan?.name}
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  placeholder="Ex: Pro, Enterprise..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Descrição</label>
                <input 
                  name="description"
                  defaultValue={editingPlan?.description}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  placeholder="Ex: Ideal para agências em crescimento"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Limite de Leads</label>
                <input 
                  name="leadsLimit"
                  type="number"
                  defaultValue={editingPlan?.leadsLimit || 100}
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Limite de Clientes</label>
                <input 
                  name="clientsLimit"
                  type="number"
                  defaultValue={editingPlan?.clientsLimit || 10}
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Funcionalidades (separadas por vírgula)</label>
                <textarea 
                  name="features"
                  defaultValue={editingPlan?.features?.join(', ')}
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none h-24"
                  placeholder="Marketing, CRM, Automação..."
                />
              </div>
              <div className="md:col-span-2 flex gap-4 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 font-bold text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
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


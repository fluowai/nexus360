import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { Plus, Search, FileText, CheckCircle2, Clock, Send, FileEdit, Trash2, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Proposals() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProposals = async () => {
    try {
      const res = await apiFetch(`/api/proposals`);
      setProposals(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Propostas & Contratos</h1>
          <p className="text-gray-500">Crie faturamentos e propostas comerciais profissionais para os novos clientes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-black transition-all font-medium shadow-lg shadow-gray-200"
        >
          <Plus size={18} />
          <span>Nova Proposta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {proposals.map((item) => (
          <motion.div 
            layoutId={item.id}
            key={item.id} 
            className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col gap-4 group"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FileText size={24} />
              </div>
              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md shadow-sm border ${
                item.status === 'aceita' ? 'bg-green-100 text-green-700 border-green-200' :
                item.status === 'enviada' ? 'bg-blue-100 text-primary border-blue-200' :
                'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                {item.status}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary transition-colors truncate">{item.title}</h3>
              <p className="text-sm text-gray-500 font-medium truncate mt-1">Para: {item.client?.corporateName || 'Cliente'}</p>
            </div>

            <div className="flex items-end justify-between mt-auto pt-4 border-t border-gray-50">
               <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Valor Total</p>
                  <p className="font-bold text-gray-900 text-xl">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                  </p>
               </div>
               <div className="flex gap-2">
                 <button className="p-2 bg-gray-50 text-gray-400 hover:text-primary rounded-lg transition-colors border border-gray-100" title="Editar">
                   <FileEdit size={16} />
                 </button>
                 <button className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors border border-gray-100" title="Enviar">
                   <Send size={16} />
                 </button>
               </div>
            </div>
          </motion.div>
        ))}
        {proposals.length === 0 && !loading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
             <FileText size={40} className="text-gray-300 mb-2" />
             <p className="text-gray-400 font-medium text-sm">Nenhuma proposta criada.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <NewProposalModal 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              fetchProposals();
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NewProposalModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({ title: '', clientId: '', newClientName: '', newClientEmail: '' });
  const [items, setItems] = useState([{ service: '', quantity: 1, unitPrice: 0 }]);
  const [clients, setClients] = useState<any[]>([]);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch(`/api/clients`).then(r => r.json()).then(setClients).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const orgId = localStorage.getItem('nexus_org_id') || '';
    
    let finalClientId = formData.clientId;

    if (isCreatingClient) {
       const clientRes = await apiFetch('/api/clients', {
         method: 'POST',
         body: JSON.stringify({ corporateName: formData.newClientName, email: formData.newClientEmail })
       });
       const clientData = await clientRes.json();
       finalClientId = clientData.id;
    }

    if (!finalClientId) return alert("Selecione ou crie um cliente.");

    await apiFetch('/api/proposals', {
      method: 'POST',
      body: JSON.stringify({ title: formData.title, clientId: finalClientId, items, status: 'enviada' })
    });
    
    onSuccess();
  };

  const addItem = () => setItems([...items, { service: '', quantity: 1, unitPrice: 0 }]);
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((acc, current) => acc + (current.quantity * current.unitPrice), 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative z-10"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-sm z-20">
           <div>
             <h2 className="text-2xl font-bold text-gray-900">Construir Proposta</h2>
             <p className="text-sm text-gray-500">Crie o orçamento detalhado</p>
           </div>
           <div className="text-right">
             <p className="text-[10px] text-gray-400 font-bold uppercase">Total Estimado</p>
             <p className="text-2xl font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal())}
             </p>
           </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-8">
           
           {/* Info Principal */}
           <div className="flex flex-col gap-4">
             <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Informações da Proposta</h3>
             <div className="flex flex-col gap-1">
               <label className="text-[10px] font-bold text-gray-400 uppercase">Título Interno</label>
               <input required className="modal-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Proposta B2B SaaS Tráfego" />
             </div>

             <div className="flex flex-col gap-1 bg-gray-50 p-4 rounded-xl border border-gray-100">
               <div className="flex justify-between mb-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase">Cliente Alvo</label>
                 <button 
                  type="button" 
                  onClick={() => setIsCreatingClient(!isCreatingClient)}
                  className="text-xs font-bold text-primary flex items-center gap-1"
                 >
                   <UserPlus size={14}/> {isCreatingClient ? 'Selecionar Existente' : 'Cadastrar Novo'}
                 </button>
               </div>
               
               {isCreatingClient ? (
                 <div className="grid grid-cols-2 gap-4">
                    <input required className="modal-input bg-white" value={formData.newClientName} onChange={e => setFormData({...formData, newClientName: e.target.value})} placeholder="Nome da Empresa" />
                    <input required type="email" className="modal-input bg-white" value={formData.newClientEmail} onChange={e => setFormData({...formData, newClientEmail: e.target.value})} placeholder="Email de Contato" />
                 </div>
               ) : (
                 <select required className="modal-input bg-white" value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                   <option value="">Selecione um cliente cadastrado...</option>
                   {clients.map(c => <option key={c.id} value={c.id}>{c.corporateName}</option>)}
                 </select>
               )}
             </div>
           </div>

           {/* Itens */}
           <div className="flex flex-col gap-4">
             <div className="flex justify-between items-end border-b border-gray-100 pb-2">
               <h3 className="font-bold text-gray-800">Itens / Escopo</h3>
               <button type="button" onClick={addItem} className="text-xs font-bold text-primary hover:text-blue-700 flex items-center gap-1">
                 <Plus size={14}/> Adicionar Item
               </button>
             </div>

             {items.map((item, index) => (
                <div key={index} className="flex items-center gap-4 bg-white p-4 border border-gray-200 rounded-xl shadow-sm relative group">
                  <div className="flex-1 grid grid-cols-12 gap-4">
                     <div className="col-span-12 md:col-span-6">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Serviço/Produto</label>
                        <input required className="modal-input bg-gray-50/50" value={item.service} onChange={e => updateItem(index, 'service', e.target.value)} placeholder="Ex: Gestão de Tráfego" />
                     </div>
                     <div className="col-span-6 md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Qtd</label>
                        <input type="number" required min="1" className="modal-input bg-gray-50/50" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} />
                     </div>
                     <div className="col-span-6 md:col-span-4">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Valor Unitário (R$)</label>
                        <input type="number" required className="modal-input bg-gray-50/50" value={item.unitPrice || ''} onChange={e => updateItem(index, 'unitPrice', Number(e.target.value))} placeholder="0.00" />
                     </div>
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0 mt-4">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
             ))}
           </div>

           <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-gray-100">
             <button type="button" onClick={onClose} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">Cancelar</button>
             <button disabled={submitting} type="submit" className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center gap-2">
               <Send size={18} />
               Gerar Proposta
             </button>
           </div>
        </form>
      </motion.div>
    </div>
  );
}

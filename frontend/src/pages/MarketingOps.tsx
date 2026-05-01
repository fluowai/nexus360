import { useState, useEffect } from "react";
import { 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ImageIcon, 
  Video, 
  Type, 
  ExternalLink,
  MessageSquare,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function MarketingOps() {
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCreatives = async () => {
    try {
      const res = await apiFetch(`/api/creatives`);
      setCreatives(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreatives();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await apiFetch(`/api/creatives/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    fetchCreatives();
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Marketing Ops</h1>
          <p className="text-gray-500">Fluxo de aprovação de criativos, copys e roteiros.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium"
        >
          <Plus size={18} />
          <span>Novo Criativo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creatives.map((item) => (
          <motion.div 
            layoutId={item.id}
            key={item.id} 
            className="glass-card flex flex-col gap-4 group"
          >
            <div className="relative aspect-video rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
              {item.type === 'image' ? (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ImageIcon size={48} />
                </div>
              ) : item.type === 'video' ? (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Video size={48} />
                </div>
              ) : (
                <div className="p-6 text-xs text-gray-400 font-mono italic">
                   {item.copyText?.slice(0, 200)}...
                </div>
              )}
              
              <div className="absolute top-3 left-3">
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md shadow-sm border ${
                  item.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                  item.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                  'bg-yellow-100 text-yellow-700 border-yellow-200'
                }`}>
                  {item.status === 'approved' ? 'Aprovado' : item.status === 'rejected' ? 'Ajustar' : 'Pendente'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{item.title}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <Type size={12} /> {item.type.toUpperCase()}
              </p>
            </div>

            <div className="mt-auto pt-4 flex gap-2 border-t border-gray-50">
               {item.status === 'pending' ? (
                 <>
                   <button 
                    onClick={() => updateStatus(item.id, 'approved')}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-600 py-2 rounded-lg text-xs font-bold hover:bg-green-100 transition-all border border-green-200/50"
                   >
                     <CheckCircle2 size={14} /> APROVAR
                   </button>
                   <button 
                    onClick={() => updateStatus(item.id, 'rejected')}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg text-xs font-bold hover:bg-red-100 transition-all border border-red-200/50"
                   >
                     <XCircle size={14} /> REPROVAR
                   </button>
                 </>
               ) : (
                 <button className="flex-1 flex items-center justify-center gap-2 bg-gray-50 text-gray-500 py-2 rounded-lg text-xs font-bold border border-gray-100">
                    <Clock size={14} /> HISTÓRICO
                 </button>
               )}
            </div>
          </motion.div>
        ))}
        {creatives.length === 0 && !loading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl">
             <Clock size={40} className="text-gray-300 mb-2" />
             <p className="text-gray-400 font-medium text-sm">Nenhum criativo aguardando aprovação.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <NewCreativeModal 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              fetchCreatives();
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NewCreativeModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({ title: '', type: 'image', contentUrl: '', copyText: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await apiFetch('/api/creatives', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
      >
        <div className="p-8 border-b border-gray-100">
           <h2 className="text-xl font-bold text-gray-900">Novo Criativo / Job</h2>
           <p className="text-xs text-gray-500">Suba o material para aprovação do cliente ou gestor.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-4">
           <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-gray-400 uppercase">Título do Anúncio</label>
             <input required className="modal-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Campanha de Inverno FB" />
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div className="flex flex-col gap-1">
               <label className="text-[10px] font-bold text-gray-400 uppercase">Tipo</label>
               <select className="modal-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                 <option value="image">Imagem / Card</option>
                 <option value="video">Víddeo / Reels</option>
                 <option value="copy">Apenas Texto (Copy)</option>
               </select>
             </div>
             <div className="flex flex-col gap-1">
               <label className="text-[10px] font-bold text-gray-400 uppercase">Link do Arquivo</label>
               <input className="modal-input" value={formData.contentUrl} onChange={e => setFormData({...formData, contentUrl: e.target.value})} placeholder="Drive/Dropbox Link" />
             </div>
           </div>
           <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-gray-400 uppercase">Texto da Copy</label>
             <textarea className="modal-input min-h-[100px]" value={formData.copyText} onChange={e => setFormData({...formData, copyText: e.target.value})} placeholder="Cole a copy do anúncio aqui..." />
           </div>
           <button 
            type="submit" 
            disabled={submitting}
            className="mt-4 bg-primary text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-200"
           >
             Enviar para Aprovação
           </button>
        </form>
      </motion.div>
    </div>
  );
}

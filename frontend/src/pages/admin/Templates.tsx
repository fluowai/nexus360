import { useState } from "react";
import { 
  Layout, 
  Mail, 
  FileText, 
  Plus, 
  Eye, 
  Edit3, 
  Copy,
  Trash2
} from "lucide-react";
import { motion } from "motion/react";

export default function AdminTemplates() {
  const [templates] = useState([
    { id: 1, name: 'Landing Page High Conversion', type: 'LP', category: 'Vendas', icon: Layout, color: 'text-blue-600' },
    { id: 2, name: 'E-mail de Boas Vindas', type: 'Email', category: 'Automação', icon: Mail, color: 'text-emerald-600' },
    { id: 3, name: 'Proposta Comercial Premium', type: 'PDF', category: 'Vendas', icon: FileText, color: 'text-purple-600' },
    { id: 4, name: 'Funil de Recrutamento', type: 'LP', category: 'RH', icon: Layout, color: 'text-indigo-600' },
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates Globais</h1>
          <p className="text-sm text-gray-500">Gerencie os modelos oficiais de páginas e comunicações da plataforma.</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200">
          <Plus size={20} />
          <span>Novo Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {templates.map((tpl, i) => (
          <motion.div 
            key={tpl.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all"
          >
            <div className="h-32 bg-gray-50 flex items-center justify-center relative">
               <tpl.icon size={40} className={`${tpl.color} opacity-20`} />
               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/40 backdrop-blur-sm transition-all gap-2">
                 <button className="p-2 bg-white rounded-lg shadow-sm text-gray-600 hover:text-primary"><Eye size={18} /></button>
                 <button className="p-2 bg-white rounded-lg shadow-sm text-gray-600 hover:text-primary"><Copy size={18} /></button>
               </div>
            </div>
            <div className="p-6">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tpl.category}</span>
              <h4 className="font-bold text-gray-900 mt-1 truncate">{tpl.name}</h4>
              <div className="flex justify-between items-center mt-4">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">{tpl.type}</span>
                <div className="flex gap-1">
                   <button className="p-1.5 text-gray-400 hover:text-gray-900"><Edit3 size={14} /></button>
                   <button className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

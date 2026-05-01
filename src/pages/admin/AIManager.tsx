import { useState } from "react";
import { 
  Zap, 
  Brain, 
  Cpu, 
  MessageSquare, 
  Settings, 
  Plus,
  Play,
  Activity
} from "lucide-react";
import { motion } from "motion/react";

export default function AdminAI() {
  const [models] = useState([
    { id: 'gpt-4o', name: 'GPT-4o (Global)', provider: 'OpenAI', status: 'Ativo', usage: '82%', cost: '$ 124.50' },
    { id: 'nexus-brain-v1', name: 'Nexus Brain (Fine-tuned)', provider: 'Local/Custom', status: 'Treinando', usage: '15%', cost: '$ 0.00' },
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importador e Configurações IA</h1>
          <p className="text-sm text-gray-500">Gerencie os modelos de linguagem e a infraestrutura de inteligência artificial.</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200">
          <Brain size={20} />
          <span>Novo Modelo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
           <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
             <Cpu size={20} className="text-primary" />
             Modelos Ativos
           </h3>
           <div className="space-y-4">
             {models.map(m => (
               <div key={m.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-600 shadow-sm">
                     <Brain size={20} />
                   </div>
                   <div>
                     <p className="font-bold text-sm text-gray-900">{m.name}</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase">{m.provider}</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                     m.status === 'Ativo' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                   }`}>
                     {m.status}
                   </span>
                   <p className="text-xs font-bold text-gray-900 mt-1">{m.usage} carga</p>
                 </div>
               </div>
             ))}
           </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col">
           <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
             <Activity size={20} className="text-primary" />
             Consumo de Tokens (Global)
           </h3>
           <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Zap size={32} />
              </div>
              <h4 className="text-2xl font-bold text-gray-900">1.2M</h4>
              <p className="text-gray-400 text-sm">Tokens processados nas últimas 24h</p>
              <button className="mt-6 px-6 py-2 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all flex items-center gap-2">
                <Settings size={14} /> Configurar Cotas
              </button>
           </div>
        </div>
      </div>

      <div className="bg-gray-900 p-8 rounded-[32px] text-white overflow-hidden relative">
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h3 className="text-lg font-bold mb-2">Importador Inteligente Nexus</h3>
            <p className="text-gray-400 text-sm max-w-md leading-relaxed">
              Utilize o motor de IA para varrer fontes de dados externas e importar leads qualificados diretamente para as agências selecionadas.
            </p>
          </div>
          <button className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-xl shadow-blue-500/20">
            <Play size={20} fill="currentColor" />
            INICIAR VARREDURA IA
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-full bg-blue-500/10 blur-3xl rounded-full" />
      </div>
    </div>
  );
}

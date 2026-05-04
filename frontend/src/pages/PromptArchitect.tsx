import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wand2, 
  History, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Globe, 
  Layout, 
  ShoppingCart, 
  Monitor, 
  LayoutDashboard, 
  BrainCircuit, 
  Zap, 
  Megaphone, 
  Image as ImageIcon, 
  Search, 
  FileText,
  Copy,
  Download,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { apiFetch } from '../lib/api';

// --- Tipos de Prompt Master ---
const PROMPT_TYPES = [
  { id: 'lp', icon: Globe, title: 'Landing Page', desc: 'Páginas de captura e vendas de alta conversão.' },
  { id: 'site', icon: Monitor, title: 'Site Institucional', desc: 'Sites profissionais para empresas e autoridades.' },
  { id: 'sales', icon: ShoppingCart, title: 'Página de Vendas', desc: 'Foco total em copy persuasiva e oferta.' },
  { id: 'saas', icon: Layout, title: 'Sistema / SaaS', desc: 'Arquitetura completa de software e dashboards.' },
  { id: 'crm', icon: LayoutDashboard, title: 'CRM / Dashboard', desc: 'Painéis de gestão, métricas e relatórios.' },
  { id: 'agent', icon: BrainCircuit, title: 'Agente de IA', desc: 'Prompts de sistema para agentes autônomos.' },
  { id: 'automation', icon: Zap, title: 'Automação', desc: 'Fluxos de trabalho e integrações inteligentes.' },
  { id: 'marketing', icon: Megaphone, title: 'Campanha Marketing', desc: 'Estratégia completa multicanal e funis.' },
  { id: 'creative', icon: ImageIcon, title: 'Criativo / Ads', desc: 'Variações de anúncios e direção de arte.' },
  { id: 'diagnosis', icon: Search, title: 'Diagnóstico Cliente', desc: 'Análise profunda de operação e marketing.' },
  { id: 'custom', icon: FileText, title: 'Personalizado', desc: 'Prompt livre para qualquer outra necessidade.' },
];

export default function PromptArchitect() {
  const [step, setStep] = useState(0); // 0 = Home, 1-6 = Wizard
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultPrompt, setResultPrompt] = useState<string | null>(null);

  // Estados do Formulário
  const [formData, setFormData] = useState({
    projectName: '',
    clientId: '',
    niche: '',
    targetAudience: '',
    pain: '',
    offer: '',
    objective: '',
    tone: 'Profissional',
    structure: [] as string[],
    designStyle: 'Moderno e clean',
    colors: '',
    advancedFeatures: [] as string[],
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  // --- Renderizadores de Etapas ---
  
  if (step === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                <Wand2 size={32} />
              </div>
              Arquiteto de Prompts
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Crie prompts profissionais para sites, sistemas, campanhas e automações com IA.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all shadow-sm">
              <History size={20} />
              Ver Histórico
            </button>
            <button 
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <Plus size={20} />
              Criar Novo Prompt
            </button>
          </div>
        </div>

        {/* Tipos de Prompt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {PROMPT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedType(type.id);
                setFormData(prev => ({ ...prev, promptType: type.id }));
                setStep(1);
              }}
              className="group p-6 bg-white border border-gray-100 rounded-3xl text-left hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <type.icon size={80} />
              </div>
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mb-4">
                <type.icon size={24} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{type.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{type.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      {/* Wizard Progress */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Etapa {step} de 6</span>
          <span className="text-sm font-medium text-gray-400">
            {step === 1 && "Tipo de Prompt"}
            {step === 2 && "Cliente e Contexto"}
            {step === 3 && "Estrutura"}
            {step === 4 && "Design e Estilo"}
            {step === 5 && "Recursos Avançados"}
            {step === 6 && "Revisão e Geração"}
          </span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
      </div>

      {/* Wizard Content */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm">
        {step === 1 && (
           <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-900">O que deseja criar?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROMPT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedType === type.id ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className="font-bold text-gray-900">{type.title}</div>
                    <div className="text-xs text-gray-500">{type.desc}</div>
                  </button>
                ))}
              </div>
           </div>
        )}

        {/* ... outras etapas serão implementadas ... */}
        
        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between">
          <button 
            onClick={prevStep}
            className="flex items-center gap-2 px-8 py-3 text-gray-500 font-bold hover:text-gray-900 transition-all"
          >
            <ChevronLeft size={20} />
            Voltar
          </button>
          <button 
            onClick={nextStep}
            disabled={!selectedType}
            className="flex items-center gap-2 px-10 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {step === 6 ? "Gerar Prompt Master" : "Próximo Passo"}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

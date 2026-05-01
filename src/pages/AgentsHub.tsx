import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Layout, 
  PenTool, 
  BarChart, 
  Megaphone, 
  Heart, 
  X, 
  Sparkles,
  ArrowRight,
  Loader2,
  ChevronRight,
  Info,
  Zap,
  Brain,
  Cpu,
  Shield
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ACP_AGENTS } from '../lib/agentsConfig';
import './AgentsHub.css';

import { apiFetch } from '../lib/api';

const AgentsHub: React.FC<{ selectedClientId?: string | null }> = ({ selectedClientId }) => {
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');

  const agents = Object.values(ACP_AGENTS);

  const handleAgentClick = (agent: any) => {
    setSelectedAgent(agent);
    setInput('');
    setResult('');
  };

  const handleExecute = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setResult('');

    try {
      const response = await apiFetch('/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          agentId: selectedAgent.id,
          input: input,
          prompt: selectedAgent.prompt,
          model: selectedModel,
          clientId: selectedClientId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao processar inteligência');
      }

      const data = await response.json();
      setResult(data.result);
    } catch (error: any) {
      setResult(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agents-hub-container">
      <header className="hub-header">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="method-acp-badge"
        >
          Método A.C.P. • Arquitetura de Crescimento Previsível
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          Central de Agentes I.A.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Acesse o poder da Consultio. Agentes especializados em cada fase da sua jornada de escala.
        </motion.p>
      </header>

      <div className="agents-grid">
        {agents.map((agent, index) => {
          const IconComponent = {
            diagnostico: Search,
            estruturador: Layout,
            copy_script: PenTool,
            analista_kpi: BarChart,
            copy_ads: Megaphone,
            customer_success: Heart,
            juridico: Shield
          }[agent.id as string] || Sparkles;

          const colors = {
            diagnostico: '#2563eb', // Royal Blue
            estruturador: '#d97706', // Amber/Orange
            copy_script: '#db2777', // Pink/Magenta
            analista_kpi: '#059669', // Emerald
            copy_ads: '#dc2626', // Red
            customer_success: '#7c3aed', // Violet
            juridico: '#334155' // Slate/Navy
          }[agent.id as string] || '#2563eb';

          return (
            <motion.div
              key={agent.id}
              className="agent-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleAgentClick(agent)}
            >
              <div className="agent-icon-wrapper" style={{ color: colors, borderColor: `${colors}33` }}>
                <IconComponent size={32} />
              </div>
              <span className="agent-phase" style={{ color: colors }}>{agent.phase}</span>
              <h3 className="agent-name">{agent.name}</h3>
              <p className="agent-desc">{agent.description}</p>
              <div className="access-link" style={{ color: colors }}>
                <span>Acessar Agente</span>
                <ArrowRight size={18} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Manual / Info Section */}
      <motion.section 
        className="info-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className="info-icon">
          <Info size={32} />
        </div>
        <div className="info-content">
          <h2>Sobre o Método A.C.P.</h2>
          <p>
            Diferente de agências de marketing comuns, a Central de Agentes da Consultio foca na 
            <strong> Arquitetura de Crescimento Previsível</strong>. Cada agente foi treinado para 
            eliminar o improviso e criar processos que garantem escala saudável e controle total de indicadores.
          </p>
        </div>
      </motion.section>

      {/* Agent Interaction Panel */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="agent-interaction-overlay" onClick={() => setSelectedAgent(null)}>
            <motion.div 
              className="agent-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="panel-header">
                <div className="flex items-center gap-4">
                  {(() => {
                    const IconComponent = {
                      diagnostico: Search,
                      estruturador: Layout,
                      copy_script: PenTool,
                      analista_kpi: BarChart,
                      copy_ads: Megaphone,
                      customer_success: Heart,
                      juridico: Shield
                    }[selectedAgent.id as string] || Sparkles;

                    const color = {
                      diagnostico: '#2563eb',
                      estruturador: '#d97706',
                      copy_script: '#db2777',
                      analista_kpi: '#059669',
                      copy_ads: '#dc2626',
                      customer_success: '#7c3aed',
                      juridico: '#334155'
                    }[selectedAgent.id as string] || '#2563eb';

                    return (
                      <div className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm" style={{ color }}>
                        <IconComponent size={32} />
                      </div>
                    );
                  })()}
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">{selectedAgent.name}</h2>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ 
                      color: {
                        diagnostico: '#2563eb',
                        estruturador: '#d97706',
                        copy_script: '#db2777',
                        analista_kpi: '#059669',
                        copy_ads: '#dc2626',
                        customer_success: '#7c3aed',
                        juridico: '#334155'
                      }[selectedAgent.id as string] || '#2563eb'
                    }}>{selectedAgent.phase}</span>
                  </div>
                </div>
                <button 
                  className="close-panel-btn"
                  onClick={() => setSelectedAgent(null)}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="panel-content-scroll custom-scrollbar">
                <div className="system-prompt-box">
                  <div className="text-blue-500 mt-1"><Sparkles size={18} /></div>
                  <p>{selectedAgent.prompt.substring(0, 150)}...</p>
                </div>

                <div className="input-section">
                  <div className="flex flex-col gap-4 mb-6 p-4 bg-gray-50 border border-gray-100 rounded-3xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu size={16} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Motor de Inteligência</span>
                      </div>
                      <select 
                        className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                      >
                        <optgroup label="Google Gemini">
                          <option value="gemini-1.5-flash">Gemini 1.5 Flash (Rápido/Free)</option>
                          <option value="gemini-1.5-pro">Gemini 1.5 Pro (Inteligente)</option>
                        </optgroup>
                        <optgroup label="Groq (Inferência Ultrarrápida)">
                          <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Poderoso)</option>
                          <option value="llama-3.1-8b-instant">Llama 3.1 8B (Instantâneo)</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <label>Descreva o cenário ou cole os dados:</label>
                  <textarea 
                    className="agent-textarea"
                    placeholder="Ex: Somos uma empresa B2B de software, geramos 50 leads/mês mas a conversão está baixa..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button 
                    className="execute-btn"
                    onClick={handleExecute}
                    disabled={loading || !input}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                        Processando Inteligência...
                      </>
                    ) : (
                      <>
                        <Zap size={20} />
                        Executar Agente Estratégico
                      </>
                    )}
                  </button>
                </div>

                {result && (
                  <div className="result-section">
                    <div className="flex items-center gap-2 mb-4 text-emerald-600 font-bold uppercase tracking-widest text-xs">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      Resultado Gerado
                    </div>
                    <div className="result-container">
                      <div className="markdown-content">
                        <ReactMarkdown>{result}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentsHub;

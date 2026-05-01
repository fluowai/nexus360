import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Cpu, 
  Key, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Brain,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { apiFetch } from '../lib/api';

const AISettings: React.FC = () => {
  const [settings, setSettings] = useState({
    geminiKey: '',
    groqKey: '',
    aiProvider: 'gemini'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await apiFetch('/api/org/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          geminiKey: data.geminiKey || '',
          groqKey: data.groqKey || '',
          aiProvider: data.aiProvider || 'gemini'
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await apiFetch('/api/org/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Configurações de IA atualizadas com sucesso!' });
      } else {
        throw new Error();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Carregando configurações...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Configurações de I.A.</h1>
        <p className="text-gray-500">Gerencie seus provedores de inteligência artificial e chaves de API.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gemini Card */}
        <div className={`p-6 rounded-3xl border-2 transition-all ${settings.aiProvider === 'gemini' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white'}`}
             onClick={() => setSettings({...settings, aiProvider: 'gemini'})}>
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${settings.aiProvider === 'gemini' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Brain size={24} />
            </div>
            {settings.aiProvider === 'gemini' && <CheckCircle size={20} className="text-blue-500" />}
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Google Gemini</h3>
          <p className="text-xs text-gray-500">Modelo 1.5 Flash. Ideal para custo zero e alta velocidade.</p>
        </div>

        {/* Groq Card */}
        <div className={`p-6 rounded-3xl border-2 transition-all ${settings.aiProvider === 'groq' ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white'}`}
             onClick={() => setSettings({...settings, aiProvider: 'groq'})}>
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${settings.aiProvider === 'groq' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Zap size={24} />
            </div>
            {settings.aiProvider === 'groq' && <CheckCircle size={20} className="text-orange-500" />}
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Groq (Llama 3)</h3>
          <p className="text-xs text-gray-500">Inferência ultrarrápida. Excelente para scripts e copy.</p>
        </div>

        {/* Info Card */}
        <div className="p-6 rounded-3xl bg-gray-900 text-white flex flex-col justify-center">
          <Globe size={32} className="text-blue-400 mb-4" />
          <p className="text-xs text-gray-400 leading-relaxed">
            Seus agentes usarão automaticamente o provedor selecionado para todas as tarefas do Método A.C.P.
          </p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Key size={18} className="text-blue-500" />
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Gemini API Key</label>
            </div>
            <input 
              type="password"
              placeholder="Cole sua chave do Google AI Studio aqui"
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
              value={settings.geminiKey}
              onChange={e => setSettings({...settings, geminiKey: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Key size={18} className="text-orange-500" />
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Groq API Key</label>
            </div>
            <input 
              type="password"
              placeholder="Cole sua chave do Groq Console aqui"
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-mono text-sm"
              value={settings.groqKey}
              onChange={e => setSettings({...settings, groqKey: e.target.value})}
            />
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-bold">{message.text}</span>
          </div>
        )}

        <div className="pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <ShieldCheck size={18} />
            <span className="text-xs">As chaves são armazenadas de forma segura e cifradas.</span>
          </div>
          <button 
            disabled={isSaving}
            onClick={handleSave}
            className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-black transition-all shadow-xl shadow-gray-200"
          >
            {isSaving ? 'Salvando...' : (
              <>
                <Save size={20} />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISettings;

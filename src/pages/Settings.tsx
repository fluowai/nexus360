import { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon,
  Key, 
  Check, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Zap,
  Brain,
  Cloud,
  Save,
  AlertCircle,
  ChevronDown
} from "lucide-react";
import { motion } from "motion/react";

interface ApiConfig {
  provider: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

const PROVIDERS = {
  groq: {
    name: "Groq",
    icon: "⚡",
    description: "Inferência ultrarrápida com modelos Llama, Mixtral e Qwen",
    models: ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "mixtral-8x7b-32768", "qwen-2.5-32b"],
    baseUrl: "https://api.groq.com/openai/v1"
  },
  gemini: {
    name: "Gemini",
    icon: "🌟",
    description: "Modelos Multimodais Google com contexto longo",
    models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
    baseUrl: "https://generativelanguage.googleapis.com"
  },
  openai: {
    name: "OpenAI",
    icon: "🔮",
    description: "GPT-4o, o1, o3-mini - Líder em reasoning",
    models: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini", "o3-mini"],
    baseUrl: "https://api.openai.com/v1"
  }
};

export default function Settings() {
  const [configs, setConfigs] = useState<ApiConfig[]>([
    { provider: "groq", apiKey: "", model: "llama-3.3-70b-versatile", enabled: true },
    { provider: "gemini", apiKey: "", model: "gemini-2.0-flash", enabled: false },
    { provider: "openai", apiKey: "", model: "gpt-4o", enabled: false }
  ]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [activeProvider, setActiveProvider] = useState("groq");

  useEffect(() => {
    const savedConfigs = localStorage.getItem("nexus_api_configs");
    if (savedConfigs) {
      const parsed = JSON.parse(savedConfigs);
      setConfigs(parsed);
      const enabled = parsed.find((c: ApiConfig) => c.enabled);
      if (enabled) setActiveProvider(enabled.provider);
    }
  }, []);

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const updateConfig = (provider: string, field: keyof ApiConfig, value: string | boolean) => {
    setConfigs(prev => prev.map(c => 
      c.provider === provider ? { ...c, [field]: value } : c
    ));
  };

  const setEnabled = (provider: string) => {
    setConfigs(prev => prev.map(c => ({
      ...c,
      enabled: c.provider === provider
    })));
    setActiveProvider(provider);
  };

  const handleSave = () => {
    localStorage.setItem("nexus_api_configs", JSON.stringify(configs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testConnection = async (config: ApiConfig) => {
    try {
      const provider = PROVIDERS[config.provider as keyof typeof PROVIDERS];
      let response;

      if (config.provider === "gemini") {
        response = await fetch(`${provider.baseUrl}/models?key=${config.apiKey}`);
      } else {
        response = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 5
          })
        });
      }

      return response.ok;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-2">Configurações</h1>
          <p className="text-sm sm:text-base text-gray-500">Gerencie suas integrações com provedores de IA.</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            saved 
              ? 'bg-green-500 text-white' 
              : 'bg-primary text-white hover:bg-blue-600 shadow-lg shadow-blue-200'
          }`}
        >
          {saved ? <Check size={20} /> : <Save size={20} />}
          <span>{saved ? 'Salvo!' : 'Salvar'}</span>
        </button>
      </div>

      {/* Provider Status */}
      <div className="glass-card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Provedor Ativo</h2>
            <p className="text-sm text-gray-500">Selecione qual IA irá gerar conteúdo</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(PROVIDERS).map(([key, provider]) => {
            const config = configs.find(c => c.provider === key);
            const isActive = activeProvider === key && config?.enabled;
            
            return (
              <button
                key={key}
                onClick={() => setEnabled(key)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isActive
                    ? 'border-primary bg-blue-50 ring-2 ring-blue-100'
                    : 'border-gray-100 bg-white hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{provider.icon}</span>
                  {isActive && (
                    <span className="text-xs font-bold text-primary bg-blue-100 px-2 py-1 rounded-full">
                      ATIVO
                    </span>
                  )}
                </div>
                <h3 className={`font-bold ${isActive ? 'text-primary' : 'text-gray-900'}`}>
                  {provider.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {config?.model || provider.models[0]}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* API Keys */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Key size={20} />
          Chaves de API
        </h2>
        
        {configs.map((config) => {
          const provider = PROVIDERS[config.provider as keyof typeof PROVIDERS];
          const isVisible = showKeys[config.provider];
          
          return (
            <motion.div
              key={config.provider}
              layout
              className="glass-card"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{provider.name}</h3>
                    <p className="text-xs text-gray-500">{provider.description}</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => {
                        setEnabled(config.provider);
                        updateConfig(config.provider, "enabled", e.target.checked);
                      }}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      config.enabled ? 'bg-primary' : 'bg-gray-200'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform mt-0.5 ${
                        config.enabled ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {config.enabled ? 'Ativo' : 'Inativo'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={isVisible ? "text" : "password"}
                      value={config.apiKey}
                      onChange={(e) => updateConfig(config.provider, "apiKey", e.target.value)}
                      placeholder={`Cole sua ${provider.name} API key...`}
                      className="w-full p-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(config.provider)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Modelo
                  </label>
                  <div className="relative">
                    <select
                      value={config.model}
                      onChange={(e) => updateConfig(config.provider, "model", e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-sm appearance-none cursor-pointer"
                    >
                      {provider.models.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {config.apiKey && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => testConnection(config)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
                  >
                    <RefreshCw size={14} />
                    <span>Testar conexão</span>
                  </button>
                </div>
              )}

              {config.enabled && !config.apiKey && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                  <AlertCircle size={18} className="text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">
                    Configure a API key para usar este provedor
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="glass-card">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Cloud size={20} />
          Links Rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-xl hover:from-orange-100 hover:to-orange-100 transition-all group"
          >
            <span className="text-2xl">⚡</span>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">Groq</p>
              <p className="text-xs text-gray-500">Obter API Key</p>
            </div>
            <Zap size={16} className="text-orange-400 group-hover:translate-x-1 transition-transform" />
          </a>
          
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl hover:from-blue-100 hover:to-blue-100 transition-all group"
          >
            <span className="text-2xl">🌟</span>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">Gemini</p>
              <p className="text-xs text-gray-500">Obter API Key</p>
            </div>
            <Zap size={16} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
          </a>
          
          <a
            href="https://platform.openai.com/settings/organization/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl hover:from-gray-100 hover:to-gray-100 transition-all group"
          >
            <span className="text-2xl">🔮</span>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">OpenAI</p>
              <p className="text-xs text-gray-500">Obter API Key</p>
            </div>
            <Zap size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
}
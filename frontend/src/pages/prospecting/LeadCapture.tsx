import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Globe, 
  Phone, 
  Star, 
  MoreHorizontal, 
  ExternalLink, 
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Send,
  Wand2,
  Filter,
  History,
  Download,
  ListFilter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../../lib/api';

interface Lead {
  id: string;
  businessName: string;
  category: string;
  phone: string;
  website: string;
  city: string;
  state: string;
  rating: number;
  reviewsCount: number;
  provider: string;
  scoreOpportunity: number;
  opportunityLevel: string;
  sentToCrm: boolean;
  aiDiagnosis?: string;
}

export default function LeadCapture() {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search');
  
  const [searchParams, setSearchParams] = useState({
    provider: 'serpapi',
    keyword: '',
    city: '',
    state: '',
    limit: 50,
    filters: {
      onlyWithPhone: true,
      onlyWithWebsite: false
    }
  });

  useEffect(() => {
    fetchSources();
    fetchLeads();
  }, []);

  const fetchSources = async () => {
    try {
      const res = await apiFetch('/api/lead-capture/sources');
      const data = await res.json();
      setSources(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeads = async (sourceId?: string) => {
    try {
      const url = sourceId ? `/api/lead-capture/leads?sourceId=${sourceId}` : '/api/lead-capture/leads';
      const res = await apiFetch(url);
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/lead-capture/search', {
        method: 'POST',
        body: JSON.stringify(searchParams)
      });
      const data = await res.json();
      setLeads(data.leads || []);
      fetchSources();
      setActiveTab('search');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (leadId: string) => {
    try {
      await apiFetch(`/api/lead-capture/leads/${leadId}/analyze`, { method: 'POST' });
      fetchLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendToCrm = async (leadId: string) => {
    try {
      await apiFetch(`/api/lead-capture/leads/${leadId}/send-to-crm`, { method: 'POST' });
      fetchLeads();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Search className="text-primary" size={32} />
          </div>
          Captação de Leads Elite
        </h1>
        <p className="text-gray-500 font-medium">Motor de prospecção ativa via Google Maps e Inteligência Artificial.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-50">
              <Filter className="text-primary" size={20} />
              <h2 className="font-bold text-gray-800 uppercase text-xs tracking-widest">Configuração da Busca</h2>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Provedor</label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  value={searchParams.provider}
                  onChange={e => setSearchParams({...searchParams, provider: e.target.value as any})}
                >
                  <option value="serpapi">SerpApi (Google Local)</option>
                  <option value="outscraper">Outscraper (Deep Data)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nicho / Palavra-chave</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Ex: Clínica Odontológica"
                    className="w-full p-3 pl-10 bg-gray-50 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    value={searchParams.keyword}
                    onChange={e => setSearchParams({...searchParams, keyword: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Cidade</label>
                  <input 
                    type="text"
                    placeholder="Florianópolis"
                    className="w-full p-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    value={searchParams.city}
                    onChange={e => setSearchParams({...searchParams, city: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">UF</label>
                  <input 
                    type="text"
                    placeholder="SC"
                    maxLength={2}
                    className="w-full p-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    value={searchParams.state}
                    onChange={e => setSearchParams({...searchParams, state: e.target.value.toUpperCase()})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Limite de Leads</label>
                <input 
                  type="number"
                  className="w-full p-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  value={searchParams.limit}
                  onChange={e => setSearchParams({...searchParams, limit: Number(e.target.value)})}
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={searchParams.filters.onlyWithPhone}
                    onChange={e => setSearchParams({...searchParams, filters: {...searchParams.filters, onlyWithPhone: e.target.checked}})}
                  />
                  <span className="text-xs font-bold text-gray-600 group-hover:text-primary transition-colors">Apenas com telefone</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={searchParams.filters.onlyWithWebsite}
                    onChange={e => setSearchParams({...searchParams, filters: {...searchParams.filters, onlyWithWebsite: e.target.checked}})}
                  />
                  <span className="text-xs font-bold text-gray-600 group-hover:text-primary transition-colors">Apenas com site</span>
                </label>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                Buscar Leads Agora
              </button>
            </form>
          </div>

          {/* Search History Card */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="text-gray-400" size={18} />
                <h2 className="font-bold text-gray-800 text-xs uppercase tracking-widest">Histórico</h2>
              </div>
              <button onClick={() => fetchLeads()} className="text-[10px] font-bold text-primary hover:underline">Ver Todos</button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {sources.map(source => (
                <button 
                  key={source.id}
                  onClick={() => fetchLeads(source.id)}
                  className="w-full p-3 rounded-xl border border-gray-50 hover:border-primary/20 hover:bg-primary/5 transition-all text-left group"
                >
                  <p className="text-xs font-bold text-gray-800 line-clamp-1">{source.query}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-medium text-gray-400 capitalize">{source.provider}</span>
                    <span className="text-[10px] font-bold text-primary">{source.totalImported} leads</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Results */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-white p-2.5 rounded-xl shadow-sm">
                  <Database className="text-primary" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Leads Captados</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{leads.length} registros encontrados</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-600 hover:text-primary transition-all shadow-sm">
                  <Download size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Empresa</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contato</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Score</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {leads.map((lead, idx) => (
                      <motion.tr 
                        key={lead.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-gray-50/80 transition-all group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 group-hover:text-primary transition-colors">{lead.businessName}</span>
                            <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                              <MapPin size={10} /> {lead.city}, {lead.state}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {lead.phone ? (
                              <div className="p-2 bg-green-50 text-green-600 rounded-lg" title={lead.phone}>
                                <Phone size={14} />
                              </div>
                            ) : (
                              <div className="p-2 bg-gray-50 text-gray-300 rounded-lg">
                                <Phone size={14} />
                              </div>
                            )}
                            {lead.website ? (
                              <a href={lead.website} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all">
                                <Globe size={14} />
                              </a>
                            ) : (
                              <div className="p-2 bg-gray-50 text-gray-300 rounded-lg">
                                <Globe size={14} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              lead.scoreOpportunity > 70 ? 'bg-orange-100 text-orange-600' : 
                              lead.scoreOpportunity > 40 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {lead.scoreOpportunity}%
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lead.opportunityLevel}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {lead.sentToCrm ? (
                            <div className="flex items-center justify-center gap-1.5 text-green-600">
                              <CheckCircle2 size={16} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">No CRM</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 text-gray-300">
                              <Database size={16} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Pendente</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleAnalyze(lead.id)}
                              className="p-2 bg-primary/5 text-primary border border-primary/10 rounded-xl hover:bg-primary hover:text-white transition-all" 
                              title="Gerar Diagnóstico IA"
                            >
                              <Wand2 size={16} />
                            </button>
                            <button 
                              disabled={lead.sentToCrm}
                              onClick={() => handleSendToCrm(lead.id)}
                              className="p-2 bg-green-50 text-green-600 border border-green-100 rounded-xl hover:bg-green-600 hover:text-white transition-all disabled:opacity-30" 
                              title="Enviar para CRM"
                            >
                              <Send size={16} />
                            </button>
                            <button className="p-2 bg-gray-50 text-gray-400 border border-gray-100 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {leads.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <div className="p-6 bg-gray-50 rounded-full mb-4">
                    <Search size={48} className="opacity-20" />
                  </div>
                  <p className="font-bold">Nenhum lead encontrado.</p>
                  <p className="text-sm">Inicie uma nova busca para captar oportunidades.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

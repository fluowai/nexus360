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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);
  const [activeDossier, setActiveDossier] = useState<Lead | null>(null);
  const [showDossierModal, setShowDossierModal] = useState(false);

  const handleDossier = async (id: string) => {
    setAnalyzingIds(prev => [...prev, id]);
    try {
      const res = await apiFetch(`/api/lead-capture/leads/${id}/dossier`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === id ? data : l));
        setActiveDossier(data);
        setShowDossierModal(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingIds(prev => prev.filter(i => i !== id));
    }
  };
  
  const [searchParams, setSearchParams] = useState({
    provider: 'serper',
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

  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzingIds(prev => [...prev, id]);
    try {
      const res = await apiFetch(`/api/lead-capture/leads/${id}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === id ? data : l));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkValidate = async () => {
    if (selectedLeads.length === 0) return;
    setLoading(true);
    try {
      for (const id of selectedLeads) {
        await handleAnalyze(id);
      }
    } finally {
      setLoading(false);
      setSelectedLeads([]);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearchError(null);
    try {
      const res = await apiFetch('/api/lead-capture/search', {
        method: 'POST',
        body: JSON.stringify(searchParams)
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || `Erro ${res.status}: Falha na busca de leads`);
        return;
      }
      setLeads(data.leads || []);
      fetchSources();
      setActiveTab('search');
    } catch (err: any) {
      console.error(err);
      setSearchError(err.message || 'Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToCrm = async (leadId: string) => {
    try {
      const res = await apiFetch(`/api/lead-capture/leads/${leadId}/send-to-crm`, { method: 'POST' });
      if (res.ok) {
        const updatedLead = await res.json();
        setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2 md:p-4 max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Search className="text-primary" size={28} />
            </div>
            Captação de Leads Elite
          </h1>
          <p className="text-gray-500 font-medium text-sm">Prospecção ativa e inteligência de dados em escala.</p>
        </div>

        {selectedLeads.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-2 bg-primary/5 border border-primary/20 rounded-2xl shadow-sm"
          >
            <span className="text-xs font-bold text-primary ml-2">{selectedLeads.length} selecionados</span>
            <button 
              onClick={handleBulkValidate}
              disabled={loading}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Validar em Massa
            </button>
          </motion.div>
        )}
      </header>

      {/* Busca Horizontal */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Motor de Busca</label>
            <select 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium"
              value={searchParams.provider}
              onChange={e => setSearchParams({...searchParams, provider: e.target.value as any})}
            >
              <option value="serper">Places (Serper.dev)</option>
              <option value="outscraper">Maps (Outscraper)</option>
            </select>
          </div>

          <div className="lg:col-span-1 space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nicho / Palavra-chave</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Ex: Clínica Odontológica"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium"
                value={searchParams.keyword}
                onChange={e => setSearchParams({...searchParams, keyword: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cidade / UF</label>
            <div className="flex gap-2">
              <input 
                type="text" placeholder="Cidade"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium"
                value={searchParams.city}
                onChange={e => setSearchParams({...searchParams, city: e.target.value})}
              />
              <input 
                type="text" placeholder="UF" maxLength={2}
                className="w-20 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium uppercase text-center"
                value={searchParams.state}
                onChange={e => setSearchParams({...searchParams, state: e.target.value.toUpperCase()})}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 h-[50px] px-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={searchParams.filters.onlyWithPhone}
                onChange={e => setSearchParams({...searchParams, filters: {...searchParams.filters, onlyWithPhone: e.target.checked}})}
              />
              <span className="text-[11px] font-bold text-gray-500 group-hover:text-primary transition-colors">Apenas Telefone</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={searchParams.filters.onlyWithWebsite}
                onChange={e => setSearchParams({...searchParams, filters: {...searchParams.filters, onlyWithWebsite: e.target.checked}})}
              />
              <span className="text-[11px] font-bold text-gray-500 group-hover:text-primary transition-colors">Apenas Site</span>
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="h-[50px] bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            <span>Buscar Leads</span>
          </button>
        </form>

        {searchError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
            <AlertCircle size={16} />
            {searchError}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Lista de Resultados */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                Resultados
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full">{leads.length} encontrados</span>
              </h2>
              {leads.length > 0 && (
                <button 
                  onClick={toggleSelectAll}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  {selectedLeads.length === leads.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
               <button className="p-2 text-gray-400 hover:text-primary transition-colors"><ListFilter size={18} /></button>
               <button className="p-2 text-gray-400 hover:text-primary transition-colors"><Download size={18} /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence mode="popLayout">
              {leads.map((lead) => (
                <motion.div
                  key={lead.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group relative bg-white p-4 rounded-2xl border-2 transition-all hover:shadow-xl hover:shadow-gray-200/40 ${selectedLeads.includes(lead.id) ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-50'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center h-full pt-1">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-gray-900 truncate pr-4">{lead.businessName}</h3>
                          <div className="flex flex-col gap-1 mt-1.5">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
                              <MapPin size={12} /> {lead.address || `${lead.city}, ${lead.state}` || 'Endereço não informado'}
                            </span>
                            <span className="w-fit px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black rounded-md uppercase tracking-wider">
                              {lead.category || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className={`flex flex-col items-end px-3 py-1 rounded-xl ${
                            (lead.scoreOpportunity || 0) > 70 ? 'bg-green-50 text-green-600' : 
                            (lead.scoreOpportunity || 0) > 40 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'
                          }`}>
                            <span className="text-[10px] font-black leading-none">{lead.scoreOpportunity || 0}%</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5">Score</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-50 pt-4">
                        <div className="flex items-center gap-2">
                          {lead.phone ? (
                            <div className="flex items-center gap-1">
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition-colors">
                                <Phone size={12} /> Ligar
                              </a>
                              <a 
                                href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 text-green-600 rounded-lg text-[11px] font-bold hover:bg-green-100 transition-colors"
                              >
                                <Phone size={12} className="rotate-90" /> WhatsApp
                              </a>
                            </div>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 text-gray-400 rounded-lg text-[11px] font-bold italic">
                              <Phone size={12} /> Sem número
                            </span>
                          )}

                          {lead.website && (
                            <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold hover:bg-indigo-100 transition-all shadow-sm">
                              <Globe size={12} /> Website
                            </a>
                          )}
                        </div>

                        <div className="flex-1" />

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleDossier(lead.id)}
                            disabled={analyzingIds.includes(lead.id)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2 text-[11px] font-bold disabled:opacity-50"
                            title="Gerar Dossiê de Inteligência"
                          >
                            {analyzingIds.includes(lead.id) ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                            Dossiê
                          </button>
                          <button 
                            onClick={() => handleAnalyze(lead.id)}
                            disabled={analyzingIds.includes(lead.id)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2 text-[11px] font-bold disabled:opacity-50"
                            title="Analisar Oportunidade"
                          >
                            {analyzingIds.includes(lead.id) ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                            Analisar
                          </button>
                          <button 
                            disabled={lead.sentToCrm}
                            onClick={() => handleSendToCrm(lead.id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all disabled:opacity-30"
                          >
                            <Send size={16} />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {leads.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                <Database size={40} className="text-gray-200 mb-2" />
                <p className="text-gray-500 font-bold text-sm">Nenhum lead encontrado.</p>
                <p className="text-xs text-gray-400">Inicie uma busca acima para começar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Histórico */}
        <div className="lg:w-80 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-gray-900 text-sm tracking-tight flex items-center gap-2">
              <History size={16} className="text-primary" />
              Buscas Recentes
            </h3>
          </div>
          
          <div className="space-y-3">
            {sources.slice(0, 5).map((source) => (
              <div key={source.id} className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-primary/20 transition-all cursor-pointer shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-black rounded uppercase tracking-wider">{source.provider}</span>
                  <span className="text-[9px] text-gray-400">{new Date(source.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs font-bold text-gray-800 truncate">{source.keyword}</p>
                <p className="text-[10px] text-gray-400 mt-1">{source.city}, {source.state}</p>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                   <span className="text-[10px] font-black text-primary">{source.totalImported} leads</span>
                   <CheckCircle2 size={12} className="text-green-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dossier Modal */}
      <AnimatePresence>
        {showDossierModal && activeDossier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <Database size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Dossiê Estratégico</h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{activeDossier.businessName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDossierModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900"
                >
                  <Search className="rotate-45" size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-gray-600 prose-p:leading-relaxed">
                <div className="whitespace-pre-wrap text-gray-700 font-medium">
                  {activeDossier.aiDiagnosis || 'Gerando conteúdo...'}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
                <button 
                  onClick={() => setShowDossierModal(false)}
                  className="px-6 py-3 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                >
                  Fechar
                </button>
                <button className="px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2">
                  <Download size={20} />
                  Baixar PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

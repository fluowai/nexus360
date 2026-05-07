import React, { useState, useEffect } from 'react';
import { 
  ListFilter, 
  Search, 
  Calendar, 
  Database, 
  ChevronRight, 
  Trash2, 
  MoreVertical,
  ArrowRight
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNavigate } from 'react-router-dom';

export default function CapturedLists() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const res = await apiFetch('/api/lead-capture/sources');
      const data = await res.json();
      setSources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <ListFilter className="text-primary" size={32} />
          </div>
          Listas de Captação
        </h1>
        <p className="text-gray-500 font-medium">Gerencie suas buscas anteriores e leads captados.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : sources.length === 0 ? (
        <div className="bg-white rounded-[32px] p-20 text-center border border-dashed border-gray-200">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="text-gray-300" size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhuma lista encontrada</h2>
          <p className="text-gray-500 mb-8">Você ainda não realizou nenhuma busca de leads.</p>
          <button 
            onClick={() => navigate('/prospecting/capture')}
            className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all"
          >
            Começar a Captar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sources.map(source => (
            <div 
              key={source.id}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-primary/10 transition-colors">
                  <Database className="text-gray-400 group-hover:text-primary transition-colors" size={24} />
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    source.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {source.status === 'completed' ? 'Concluída' : 'Em Processo'}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{source.query}</h3>
              <div className="flex items-center gap-4 text-xs font-medium text-gray-400 mb-6">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(source.createdAt).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex items-center gap-1">
                  <Search size={14} />
                  {source.provider.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Encontrados</p>
                  <p className="text-xl font-black text-gray-900">{source.totalFound}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Importados</p>
                  <p className="text-xl font-black text-primary">{source.totalImported}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button 
                  onClick={() => navigate(`/prospecting/capture?sourceId=${source.id}`)}
                  className="flex items-center gap-2 text-sm font-bold text-primary hover:gap-3 transition-all"
                >
                  Ver Leads da Lista <ArrowRight size={18} />
                </button>
                <button className="p-2 text-gray-300 hover:text-red-500 transition-all">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Calendar, Target, MapPin, Clock, Repeat, AlertCircle, Play, Pause, XCircle, ChevronDown, ChevronRight, Loader2, ExternalLink, CheckCircle2, Users, MessageSquare, Star } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

interface Mission {
  id: string;
  name: string;
  niche: string;
  city: string;
  state: string;
  leadQuantity: number;
  executionDate: string;
  executionTime: string;
  recurrence: string;
  minScore: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    leads: number;
    messages: number;
    appointments: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  agendada: { label: 'Agendada', color: 'text-blue-600', bg: 'bg-blue-100' },
  em_execucao: { label: 'Em Execução', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  pausada: { label: 'Pausada', color: 'text-amber-600', bg: 'bg-amber-100' },
  concluida: { label: 'Concluída', color: 'text-green-600', bg: 'bg-green-100' },
  erro: { label: 'Erro', color: 'text-red-600', bg: 'bg-red-100' },
  cancelada: { label: 'Cancelada', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const recurrenceLabels: Record<string, string> = {
  unica: 'Uma vez',
  diaria: 'Diária',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
};

export default function MissionsList() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/nexus-prospect/missions');
      const data = await res.json();
      if (data.success) {
        setMissions(data.data);
      }
    } catch (err) {
      console.error('Failed to load missions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/nexus-prospect/missions/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        fetchMissions();
      }
    } catch (err) {
      console.error(`Failed to ${action} mission`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta missão?')) return;
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/nexus-prospect/missions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMissions();
      }
    } catch (err) {
      console.error('Failed to delete mission', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusConfig = (status: string) => statusConfig[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-100' };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Calendar className="text-primary" size={28} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Missões Agendadas</h1>
          </div>
          <p className="text-gray-500 font-medium text-sm ml-[52px]">
            Gerencie suas missões autônomas de captação de leads.
          </p>
        </div>
        <button
          onClick={() => navigate('/prospecting/capture')}
          className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm flex items-center gap-2"
        >
          <Target size={16} />
          Nova Captação
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : missions.length === 0 ? (
        <div className="bg-white rounded-[32px] p-16 text-center border border-dashed border-gray-200 shadow-sm">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="text-gray-300" size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhuma missão agendada</h2>
          <p className="text-gray-500 mb-6">Você ainda não criou nenhuma missão de captação automática.</p>
          <button
            onClick={() => navigate('/prospecting/capture')}
            className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all"
          >
            Criar Primeira Missão
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {missions.map((mission) => {
            const sc = getStatusConfig(mission.status);
            const isExpanded = expandedId === mission.id;

            return (
              <div
                key={mission.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-black text-gray-900 truncate text-lg">{mission.name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${sc.bg} ${sc.color} shrink-0`}>
                          {sc.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Target size={13} className="text-gray-400" />
                          {mission.niche}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-gray-400" />
                          {mission.city}, {mission.state}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-400" />
                          {formatDate(mission.executionDate)} às {mission.executionTime}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Repeat size={13} className="text-gray-400" />
                          {recurrenceLabels[mission.recurrence] || mission.recurrence}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : mission.id)}
                      className="p-2 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-gray-600 shrink-0"
                    >
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                  </div>

                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <Users size={14} className="text-primary" />
                      <span>{mission._count.leads} leads</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <MessageSquare size={14} className="text-emerald-500" />
                      <span>{mission._count.messages} mensagens</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <Star size={14} className="text-amber-500" />
                      <span>Score mín: {mission.minScore}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <Target size={14} className="text-indigo-500" />
                      <span>Qtd: {mission.leadQuantity}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
                    {mission.status === 'agendada' && (
                      <ActionButton
                        icon={<Play size={14} />}
                        label="Iniciar"
                        onClick={() => handleAction(mission.id, 'run')}
                        loading={actionLoading === mission.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      />
                    )}
                    {mission.status === 'em_execucao' && (
                      <ActionButton
                        icon={<Pause size={14} />}
                        label="Pausar"
                        onClick={() => handleAction(mission.id, 'pause')}
                        loading={actionLoading === mission.id}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      />
                    )}
                    {(mission.status === 'pausada' || mission.status === 'erro') && (
                      <ActionButton
                        icon={<Play size={14} />}
                        label="Retomar"
                        onClick={() => handleAction(mission.id, 'resume')}
                        loading={actionLoading === mission.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      />
                    )}
                    {(mission.status === 'agendada' || mission.status === 'pausada') && (
                      <ActionButton
                        icon={<XCircle size={14} />}
                        label="Cancelar"
                        onClick={() => handleAction(mission.id, 'cancel')}
                        loading={actionLoading === mission.id}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      />
                    )}
                    <button
                      onClick={() => handleDelete(mission.id)}
                      disabled={actionLoading === mission.id}
                      className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <InfoBox label="Criada em" value={formatDate(mission.createdAt)} />
                      <InfoBox label="Atualizada em" value={formatDate(mission.updatedAt)} />
                      <InfoBox label="Recorrência" value={recurrenceLabels[mission.recurrence] || mission.recurrence} />
                      <InfoBox label="Score Mínimo" value={`${mission.minScore}%`} />
                    </div>
                    
                    {mission._count.leads > 0 && (
                      <button
                        onClick={() => navigate(`/prospecting/capture`)}
                        className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-all"
                      >
                        <ExternalLink size={14} />
                        Ver leads desta missão na captação
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionButton({ icon, label, onClick, loading, className }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading: boolean;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xs font-bold text-gray-800">{value}</p>
    </div>
  );
}

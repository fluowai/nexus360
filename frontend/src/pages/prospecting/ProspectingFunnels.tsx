import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  GitBranch,
  Loader2,
  MessageCircle,
  PhoneForwarded,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface FunnelStage {
  id: string;
  name: string;
  order: number;
  agentName: string;
  goal: string;
  maxMessages: number;
  isHumanHandoff: boolean;
}

interface Funnel {
  id: string;
  name: string;
  description?: string;
  objective?: string;
  status: string;
  channel: string;
  isDefault: boolean;
  stages: FunnelStage[];
  _count?: { runs: number };
}

interface Run {
  id: string;
  status: string;
  leadName: string;
  leadPhone?: string;
  score: number;
  firstMessage?: string;
  nextAction?: string;
  createdAt: string;
  funnel?: { name: string };
  stage?: { name: string; agentName: string };
}

const statusLabels: Record<string, string> = {
  queued: 'Na fila',
  active: 'Em contato',
  qualified: 'Qualificado',
  nurturing: 'Nutricao',
  human_handoff: 'Humano',
  lost: 'Perdido',
  stopped: 'Pausado'
};

export default function ProspectingFunnels() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDefault, setCreatingDefault] = useState(false);

  const defaultFunnel = useMemo(() => funnels.find(funnel => funnel.isDefault) || funnels[0], [funnels]);
  const queuedRuns = runs.filter(run => run.status === 'queued').length;
  const qualifiedRuns = runs.filter(run => run.status === 'qualified' || run.status === 'human_handoff').length;
  const averageScore = runs.length ? Math.round(runs.reduce((total, run) => total + (run.score || 0), 0) / runs.length) : 0;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [funnelsRes, runsRes] = await Promise.all([
        apiFetch('/api/prospecting-funnels/funnels'),
        apiFetch('/api/prospecting-funnels/runs')
      ]);

      const [funnelsData, runsData] = await Promise.all([
        funnelsRes.json(),
        runsRes.json()
      ]);

      setFunnels(Array.isArray(funnelsData) ? funnelsData : []);
      setRuns(Array.isArray(runsData) ? runsData : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultFunnel = async () => {
    setCreatingDefault(true);
    try {
      await apiFetch('/api/prospecting-funnels/funnels/default', { method: 'POST' });
      await fetchData();
    } finally {
      setCreatingDefault(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-2xl">
              <MessageCircle className="text-emerald-600" size={28} />
            </div>
            Funis IA WhatsApp
          </h1>
          <p className="text-gray-500 font-medium text-sm">Esteira de prospeccao para leads captados, com agentes de abordagem, qualificacao, diagnostico e handoff.</p>
        </div>

        <button
          onClick={createDefaultFunnel}
          disabled={creatingDefault}
          className="h-11 px-5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {creatingDefault ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Criar Funil Padrao
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Metric icon={GitBranch} label="Funis ativos" value={funnels.length} tone="blue" />
        <Metric icon={Users} label="Leads na fila" value={queuedRuns} tone="emerald" />
        <Metric icon={PhoneForwarded} label="Handoffs/qualificados" value={qualifiedRuns} tone="violet" />
        <Metric icon={Zap} label="Score medio" value={`${averageScore}%`} tone="amber" />
      </section>

      {loading ? (
        <div className="flex items-center justify-center h-80">
          <Loader2 className="animate-spin text-emerald-600" size={34} />
        </div>
      ) : funnels.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <Bot className="text-emerald-600" size={30} />
          </div>
          <h2 className="text-xl font-black text-gray-900">Nenhum funil configurado</h2>
          <p className="text-sm text-gray-500 mt-2 mb-6">Crie o funil padrao para receber leads validados e iniciar a prospeccao via WhatsApp.</p>
          <button
            onClick={createDefaultFunnel}
            disabled={creatingDefault}
            className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all inline-flex items-center gap-2"
          >
            {creatingDefault ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Ativar WhatsApp SDR IA
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          <section className="space-y-4">
            {funnels.map(funnel => (
              <div key={funnel.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="text-xl font-black text-gray-900">{funnel.name}</h2>
                      {funnel.isDefault && <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase">Padrao</span>}
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase">{funnel.channel}</span>
                    </div>
                    <p className="text-sm text-gray-500 max-w-3xl">{funnel.description}</p>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 rounded-xl min-w-28 text-right">
                    <p className="text-[10px] font-black uppercase text-gray-400">Inscritos</p>
                    <p className="text-2xl font-black text-gray-900">{funnel._count?.runs || 0}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {funnel.stages.map(stage => (
                    <div key={stage.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
                      <div className="flex items-center justify-between mb-3">
                        <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-black flex items-center justify-center">
                          {stage.order + 1}
                        </span>
                        {stage.isHumanHandoff ? <PhoneForwarded size={16} className="text-violet-600" /> : <Bot size={16} className="text-emerald-600" />}
                      </div>
                      <h3 className="font-black text-gray-900 text-sm">{stage.name}</h3>
                      <p className="text-[11px] font-bold text-emerald-700 mt-1">{stage.agentName}</p>
                      <p className="text-xs text-gray-500 mt-3 leading-relaxed">{stage.goal}</p>
                      <div className="mt-4 text-[10px] font-black text-gray-400 uppercase">
                        Ate {stage.maxMessages} mensagens
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <aside className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="font-black text-gray-900 flex items-center gap-2">
                <Target size={18} className="text-emerald-600" />
                Contexto operacional
              </h2>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <p>Leads captados entram na fila do funil depois da validacao. A primeira etapa gera a mensagem inicial e prepara o contato pelo WhatsApp.</p>
                <p>Quando a conversa qualifica o lead, o run muda para handoff humano e o time comercial recebe um resumo com score e proximo passo.</p>
              </div>
              {defaultFunnel && (
                <div className="mt-5 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <p className="text-[10px] font-black text-emerald-700 uppercase">Funil principal</p>
                  <p className="font-black text-emerald-950">{defaultFunnel.name}</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="font-black text-gray-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" />
                Regras de seguranca
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-2 text-xs font-bold text-gray-600">
                <span className="px-3 py-2 bg-gray-50 rounded-lg">Respeitar palavras de parada</span>
                <span className="px-3 py-2 bg-gray-50 rounded-lg">Limitar mensagens por lead</span>
                <span className="px-3 py-2 bg-gray-50 rounded-lg">Transferir casos sensiveis para humano</span>
                <span className="px-3 py-2 bg-gray-50 rounded-lg">Registrar contexto e score antes do handoff</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-gray-900">Fila de prospeccao</h2>
          <button onClick={fetchData} className="text-xs font-black text-emerald-700 hover:underline">Atualizar</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black text-gray-400 uppercase border-b border-gray-100">
                <th className="py-3 pr-4">Lead</th>
                <th className="py-3 pr-4">Funil</th>
                <th className="py-3 pr-4">Agente atual</th>
                <th className="py-3 pr-4">Score</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Mensagem inicial</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id} className="border-b border-gray-50 align-top">
                  <td className="py-4 pr-4">
                    <p className="font-black text-gray-900">{run.leadName}</p>
                    <p className="text-xs text-gray-400">{run.leadPhone || 'Sem WhatsApp'}</p>
                  </td>
                  <td className="py-4 pr-4 text-gray-600 font-bold">{run.funnel?.name || '-'}</td>
                  <td className="py-4 pr-4">
                    <p className="font-bold text-gray-800">{run.stage?.name || '-'}</p>
                    <p className="text-xs text-emerald-700 font-bold">{run.stage?.agentName || '-'}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-black">{run.score}%</span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black">{statusLabels[run.status] || run.status}</span>
                  </td>
                  <td className="py-4 pr-4 text-xs text-gray-500 max-w-md leading-relaxed">{run.firstMessage || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {runs.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500 font-bold">
              Nenhum lead enviado ao funil ainda.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: any; label: string; value: React.ReactNode; tone: 'blue' | 'emerald' | 'violet' | 'amber' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700'
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  );
}

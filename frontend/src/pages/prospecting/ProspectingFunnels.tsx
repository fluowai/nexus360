import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  GitBranch,
  Loader2,
  MessageCircle,
  PhoneForwarded,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
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
  campaignName?: string;
  agentName?: string;
  firstStagePrompt?: string;
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
  sent: 'Enviado',
  active: 'Em contato',
  qualified: 'Qualificado',
  nurturing: 'Nutricao',
  human_handoff: 'Humano',
  lost: 'Perdido',
  stopped: 'Pausado'
};

const DEFAULT_FIRST_STAGE_PROMPT = 'Primeira etapa: falar como humano e localizar o decisor antes de qualquer explicacao. Procurar socio, proprietario, administrador ou alguem da area comercial. Nunca dizer que somos agencia. Nunca abrir falando de marketing, presenca digital, solucao digital, tecnologia, clientes, diagnostico ou avaliacao. A primeira mensagem deve apenas perguntar quem e o responsavel pelo comercial.';

export default function ProspectingFunnels() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDefault, setCreatingDefault] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [savingFunnel, setSavingFunnel] = useState(false);
  const [form, setForm] = useState({
    name: '',
    campaignName: '',
    agentName: 'Paulo',
    description: '',
    firstStagePrompt: DEFAULT_FIRST_STAGE_PROMPT
  });

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

  const createFunnel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    setSavingFunnel(true);
    try {
      await apiFetch('/api/prospecting-funnels/funnels', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          campaignName: (form.campaignName || form.name).trim(),
          agentName: (form.agentName || 'Paulo').trim(),
          description: form.description.trim() || 'Funil de abordagem por WhatsApp para localizar socio, proprietario ou responsavel comercial antes de qualificar.',
          firstStagePrompt: form.firstStagePrompt.trim()
        })
      });
      setShowCreateForm(false);
      setForm({
        name: '',
        campaignName: '',
        agentName: 'Paulo',
        description: '',
        firstStagePrompt: DEFAULT_FIRST_STAGE_PROMPT
      });
      await fetchData();
    } finally {
      setSavingFunnel(false);
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
          <p className="text-gray-500 font-medium text-sm">Esteira para localizar decisores, abrir conversas humanas e gerar handoff comercial.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="h-11 px-5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Novo funil
          </button>
          <button
            onClick={createDefaultFunnel}
            disabled={creatingDefault}
            className="h-11 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {creatingDefault ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Atualizar padrao
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Metric icon={GitBranch} label="Funis ativos" value={funnels.length} tone="blue" />
        <Metric icon={Users} label="Leads na fila" value={queuedRuns} tone="emerald" />
        <Metric icon={PhoneForwarded} label="Handoffs/qualificados" value={qualifiedRuns} tone="violet" />
        <Metric icon={Zap} label="Score medio" value={`${averageScore}%`} tone="amber" />
      </section>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4">
          <form onSubmit={createFunnel} className="w-full max-w-2xl bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">Criar funil WhatsApp</h2>
                <p className="text-xs text-gray-500 font-medium mt-1">Configure a campanha, o nome do agente e a primeira etapa de abordagem.</p>
              </div>
              <button type="button" onClick={() => setShowCreateForm(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-gray-400">Nome do funil</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm(current => ({ ...current, name: event.target.value }))}
                  placeholder="Ex: Farmacias de manipulacao"
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-gray-400">Campanha</span>
                <input
                  value={form.campaignName}
                  onChange={(event) => setForm(current => ({ ...current, campaignName: event.target.value }))}
                  placeholder="Ex: CNPJ socios maio"
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-gray-400">Nome do agente</span>
                <input
                  value={form.agentName}
                  onChange={(event) => setForm(current => ({ ...current, agentName: event.target.value }))}
                  placeholder="Paulo"
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-gray-400">Descricao</span>
                <input
                  value={form.description}
                  onChange={(event) => setForm(current => ({ ...current, description: event.target.value }))}
                  placeholder="Abordagem para localizar decisor"
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-[10px] font-black uppercase text-gray-400">Etapa 1 - comportamento do agente</span>
                <textarea
                  value={form.firstStagePrompt}
                  onChange={(event) => setForm(current => ({ ...current, firstStagePrompt: event.target.value }))}
                  className="w-full min-h-28 px-3 py-3 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-100 resize-none"
                />
              </label>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateForm(false)} className="h-11 px-5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">
                Cancelar
              </button>
              <button disabled={savingFunnel || !form.name.trim()} className="h-11 px-5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2">
                {savingFunnel ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar funil
              </button>
            </div>
          </form>
        </div>
      )}

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
                    <div className="flex flex-wrap gap-2 mt-3 text-[10px] font-black uppercase">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">Campanha: {funnel.campaignName || funnel.name}</span>
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg">Agente: {funnel.agentName || 'Paulo'}</span>
                    </div>
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
                <p>Leads captados entram na fila depois da validacao. A primeira etapa busca socio, proprietario, administrador ou responsavel comercial e evita qualquer pitch.</p>
                <p>O agente nao se apresenta como agencia e nao abre diagnostico antes de falar com quem decide. A primeira mensagem serve apenas para chegar ao responsavel comercial.</p>
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
                <span className="px-3 py-2 bg-gray-50 rounded-lg">Nunca vender na primeira abordagem</span>
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

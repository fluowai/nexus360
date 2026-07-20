import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Shield,
  Workflow,
  Wrench,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

type CatalogResponse = {
  capabilities: Array<{ key: string; title: string; summary: string; pillar: string }>;
  adapters: Array<{ key: string; label: string; runtime: string }>;
  rolloutChecklist: string[];
  sources: Array<{ label: string; url: string }>;
};

type AccessResponse = {
  enabled: boolean;
  isSuperAdmin: boolean;
  config: {
    enabled: boolean;
    deploymentMode: "self_hosted" | "desktop" | "hybrid";
    baseUrl: string | null;
    hasApiToken: boolean;
    notes: string | null;
    allowedAdapters: string[];
    enabledCapabilities: string[];
    grantedAt: string | null;
    remoteCompanyId: string | null;
    remoteCompanyName: string | null;
    remoteCompanyStatus: string | null;
    lastConnectionAt: string | null;
    lastConnectionStatus: "connected" | "error" | "never";
    lastConnectionError: string | null;
    lastSyncAt: string | null;
    lastSyncError: string | null;
    lastAgentSyncAt: string | null;
    lastAgentSyncCount: number;
    links: {
      boardHome: string | null;
      companyBoard: string | null;
      companyApi: string | null;
      agentsApi: string | null;
    };
  };
};

type OverviewResponse = {
  organization: {
    id: string;
    name: string;
    slug?: string;
    plan: string;
    users: number;
    projects: number;
    automations: number;
  };
  release: AccessResponse["config"];
  readiness: {
    governanceReady: boolean;
    workspaceReady: boolean;
    adaptersConfigured: number;
    capabilitiesEnabled: number;
    connected: boolean;
    remoteProvisioned: boolean;
  };
  enabledCapabilities: Array<{ key: string; title: string; summary: string; pillar: string }>;
  enabledAdapters: Array<{ key: string; label: string; runtime: string }>;
  remote: {
    hasCredentials: boolean;
    companyId: string | null;
    companyName: string | null;
    companyStatus: string | null;
    links: {
      boardHome: string | null;
      companyBoard: string | null;
      companyApi: string | null;
      agentsApi: string | null;
    };
  };
};

type RemoteCompanyResponse = {
  health?: any;
  company?: any;
  links?: {
    boardHome: string | null;
    companyBoard: string | null;
    companyApi: string | null;
    agentsApi: string | null;
  };
};

type RemoteAgentsResponse = {
  agents: Array<{
    id: string | null;
    name: string;
    role: string | null;
    title: string | null;
    status: string | null;
    adapterType: string | null;
    budgetMonthlyCents: number;
    links: {
      agentBoard: string | null;
      agentApi: string | null;
    };
  }>;
};

const deploymentLabels = {
  self_hosted: "Self-hosted",
  desktop: "Desktop",
  hybrid: "Hybrid",
};

function formatDate(value?: string | null) {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

export default function PaperclipHub() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [remoteCompany, setRemoteCompany] = useState<RemoteCompanyResponse | null>(null);
  const [remoteAgents, setRemoteAgents] = useState<RemoteAgentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingCompany, setSyncingCompany] = useState(false);
  const [syncingAgents, setSyncingAgents] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [catalogResponse, accessResponse, overviewResponse] = await Promise.all([
        apiFetch("/api/paperclip/catalog"),
        apiFetch("/api/paperclip/access"),
        apiFetch("/api/paperclip/overview"),
      ]);

      const catalogData = catalogResponse.ok ? await catalogResponse.json() : null;
      const accessData = accessResponse.ok ? await accessResponse.json() : null;
      const overviewData = overviewResponse.ok ? await overviewResponse.json() : null;

      setCatalog(catalogData);
      setAccess(accessData);
      setOverview(overviewData);

      if (accessData?.enabled || accessData?.isSuperAdmin) {
        const [companyResponse, agentsResponse] = await Promise.all([
          apiFetch("/api/paperclip/remote/company"),
          apiFetch("/api/paperclip/remote/agents"),
        ]);

        setRemoteCompany(companyResponse.ok ? await companyResponse.json() : null);
        setRemoteAgents(agentsResponse.ok ? await agentsResponse.json() : { agents: [] });
      } else {
        setRemoteCompany(null);
        setRemoteAgents(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refreshRemote = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const [companyResponse, agentsResponse, overviewResponse] = await Promise.all([
        apiFetch("/api/paperclip/remote/company"),
        apiFetch("/api/paperclip/remote/agents"),
        apiFetch("/api/paperclip/overview"),
      ]);

      setRemoteCompany(companyResponse.ok ? await companyResponse.json() : null);
      setRemoteAgents(agentsResponse.ok ? await agentsResponse.json() : { agents: [] });
      if (overviewResponse.ok) setOverview(await overviewResponse.json());
      setMessage("Snapshot remoto atualizado.");
    } catch {
      setMessage("Nao foi possivel atualizar os dados remotos.");
    } finally {
      setRefreshing(false);
    }
  };

  const syncCompany = async () => {
    setSyncingCompany(true);
    setMessage(null);
    try {
      const response = await apiFetch("/api/paperclip/admin/company/sync", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.details || data?.error || "Falha ao sincronizar empresa.");
        return;
      }

      await load();
      setMessage("Empresa provisionada/sincronizada com sucesso.");
    } finally {
      setSyncingCompany(false);
    }
  };

  const syncAgents = async () => {
    setSyncingAgents(true);
    setMessage(null);
    try {
      const response = await apiFetch("/api/paperclip/admin/agents/sync", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.details || data?.error || "Falha ao sincronizar agentes.");
        return;
      }

      await load();
      setMessage(`Agentes sincronizados. Novos criados: ${data?.createdCount || 0}.`);
    } finally {
      setSyncingAgents(false);
    }
  };

  const visibleCapabilities = useMemo(() => {
    if (!catalog || !access) return [];
    if (access.isSuperAdmin) return catalog.capabilities;
    const allowed = new Set(access.config.enabledCapabilities);
    return catalog.capabilities.filter((capability) => allowed.has(capability.key));
  }, [access, catalog]);

  const visibleAdapters = useMemo(() => {
    if (!catalog || !access) return [];
    if (access.isSuperAdmin) return catalog.adapters;
    const allowed = new Set(access.config.allowedAdapters);
    return catalog.adapters.filter((adapter) => allowed.has(adapter.key));
  }, [access, catalog]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-[#3557B7]" size={30} />
      </div>
    );
  }

  if (!catalog || !access || !overview) {
    return (
      <div className="rounded-[28px] border border-red-100 bg-white p-8 text-sm text-red-500">
        Nao foi possivel carregar o hub do Paperclip.
      </div>
    );
  }

  if (!access.enabled && !access.isSuperAdmin) {
    return (
      <div className="rounded-[30px] border border-[#E2E8F0] bg-white p-10 shadow-sm">
        <div className="flex max-w-2xl flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#64748B]">
            <Shield size={14} />
            Liberacao controlada
          </div>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-[#0F172A]">Paperclip indisponivel para esta conta</h1>
          <p className="text-sm leading-6 text-[#475569]">
            O acesso ao Paperclip precisa ser liberado pelo super admin. Quando isso acontecer, esta area mostrara a configuracao autorizada, a conexao remota e o check-up completo da plataforma.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <section className="overflow-hidden rounded-[30px] border border-[#D9E6FF] bg-[radial-gradient(circle_at_top_left,_#FFFFFF_0%,_#F2F7FF_42%,_#E9F0FF_100%)] p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#3557B7]">
              <Bot size={14} />
              Paperclip Control Hub
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#0F172A]">Orquestracao real com sync e governanca</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#475569]">
              O hub agora combina o check-up do produto com a conexao ativa ao Paperclip da sua conta, incluindo provisionamento remoto, sync de agentes e deep links.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Deployment" value={deploymentLabels[overview.release.deploymentMode]} />
            <MetricCard label="Capacidades" value={String(overview.readiness.capabilitiesEnabled)} />
            <MetricCard label="Adapters" value={String(overview.readiness.adaptersConfigured)} />
            <MetricCard label="Agentes remotos" value={String(remoteAgents?.agents?.length || 0)} />
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-[#D9E6FF] bg-[#F8FBFF] px-4 py-3 text-sm font-bold text-[#3557B7]">
          {message}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
              <Activity size={16} className="text-[#3557B7]" />
              Estado da instancia remota
            </div>
            <button
              onClick={refreshRemote}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#3557B7] px-4 py-2 text-xs font-black text-[#3557B7] disabled:opacity-60"
            >
              {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              Atualizar
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <ReadinessRow label="Conexao" value={overview.readiness.connected} />
            <ReadinessRow label="Empresa provisionada" value={overview.readiness.remoteProvisioned} />
            <ReadinessRow label="Credenciais salvas" value={overview.remote.hasCredentials} />
            <ReadinessRow label="Workspace ready" value={overview.readiness.workspaceReady} />
          </div>

          <div className="mt-5 space-y-3 rounded-2xl bg-[#F8FAFC] p-4 text-sm text-[#475569]">
            <InfoRow label="Ultimo teste" value={formatDate(overview.release.lastConnectionAt)} />
            <InfoRow label="Ultimo sync da empresa" value={formatDate(overview.release.lastSyncAt)} />
            <InfoRow label="Ultimo sync de agentes" value={formatDate(overview.release.lastAgentSyncAt)} />
            <InfoRow label="Empresa remota" value={overview.remote.companyName || "Nao provisionada"} />
          </div>

          {overview.release.lastConnectionError && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-600">
              {overview.release.lastConnectionError}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {remoteCompany?.links?.boardHome && (
              <LinkButton href={remoteCompany.links.boardHome} label="Abrir board" />
            )}
            {remoteCompany?.links?.companyApi && (
              <LinkButton href={remoteCompany.links.companyApi} label="Abrir company API" />
            )}
            {remoteCompany?.links?.agentsApi && (
              <LinkButton href={remoteCompany.links.agentsApi} label="Abrir agents API" />
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
              <Wrench size={16} className="text-[#3557B7]" />
              Operacoes do super admin
            </div>
            <span className="rounded-full bg-[#EDF3FF] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#3557B7]">
              {access.isSuperAdmin ? "SUPER ADMIN" : "VIEW ONLY"}
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            <ActionButton
              disabled={!access.isSuperAdmin || syncingCompany}
              icon={RefreshCcw}
              loading={syncingCompany}
              label="Provisionar/sincronizar empresa no Paperclip"
              onClick={syncCompany}
            />
            <ActionButton
              disabled={!access.isSuperAdmin || syncingAgents}
              icon={Bot}
              loading={syncingAgents}
              label="Sincronizar agentes do Nexus360"
              onClick={syncAgents}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-[#E5E7EB] p-4">
            <div className="text-sm font-black text-[#0F172A]">Notas do rollout</div>
            <p className="mt-2 text-sm leading-6 text-[#475569]">
              {overview.release.notes || "Nenhuma nota operacional registrada pelo super admin para esta conta."}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-[#E5E7EB] p-4">
            <div className="text-sm font-black text-[#0F172A]">Snapshot remoto</div>
            <div className="mt-3 space-y-2 text-xs text-[#475569]">
              <InfoRow label="Nome remoto" value={String(remoteCompany?.company?.name || overview.remote.companyName || "Nao disponivel")} />
              <InfoRow label="Status remoto" value={String(remoteCompany?.company?.status || overview.remote.companyStatus || "Nao disponivel")} />
              <InfoRow label="Health" value={remoteCompany?.health ? "OK" : "Nao consultado"} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
            <Workflow size={16} className="text-[#3557B7]" />
            Capacidade liberada para esta conta
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {visibleCapabilities.map((capability) => (
              <div key={capability.key} className="rounded-2xl border border-[#E5E7EB] bg-[#FCFDFF] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-[#0F172A]">{capability.title}</div>
                  <span className="rounded-full bg-[#EDF3FF] px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#3557B7]">
                    {capability.pillar}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#475569]">{capability.summary}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
            <Cpu size={16} className="text-[#3557B7]" />
            Adapters autorizados
          </div>
          <div className="mt-5 space-y-3">
            {visibleAdapters.map((adapter) => (
              <div key={adapter.key} className="rounded-2xl border border-[#E5E7EB] p-4">
                <div className="text-sm font-black text-[#0F172A]">{adapter.label}</div>
                <p className="mt-1 text-xs text-[#64748B]">{adapter.runtime}</p>
              </div>
            ))}
          </div>
          {overview.release.baseUrl && (
            <a
              href={overview.release.baseUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#3557B7] px-4 py-3 text-xs font-black text-white"
            >
              Abrir instancia Paperclip
              <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
            <Bot size={16} className="text-emerald-500" />
            Agentes remotos sincronizados
          </div>
          <div className="mt-5 space-y-3">
            {(remoteAgents?.agents || []).map((agent) => (
              <div key={agent.id || agent.name} className="rounded-2xl border border-[#E5E7EB] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-[#0F172A]">{agent.name}</div>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {agent.role || "general"} · {agent.adapterType || "adapter indefinido"} · {agent.status || "status indefinido"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {agent.links.agentBoard && <LinkButton href={agent.links.agentBoard} label="Board" compact />}
                    {agent.links.agentApi && <LinkButton href={agent.links.agentApi} label="API" compact />}
                  </div>
                </div>
              </div>
            ))}
            {(remoteAgents?.agents || []).length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] p-4 text-sm text-[#64748B]">
                Nenhum agente remoto retornado ainda. Se a empresa ja estiver provisionada, rode o sync de agentes.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
            <ExternalLink size={16} className="text-[#3557B7]" />
            Fontes e rollout
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="space-y-3">
              {catalog.rolloutChecklist.map((item) => (
                <div key={item} className="flex gap-2 text-sm text-[#475569]">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {catalog.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm font-bold text-[#0F172A] transition hover:border-[#3557B7] hover:text-[#3557B7]"
                >
                  <span>{source.label}</span>
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white bg-white/90 p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">{label}</div>
      <div className="mt-2 text-2xl font-black text-[#0F172A]">{value}</div>
    </div>
  );
}

function ReadinessRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] px-4 py-3">
      <span className="text-sm font-bold text-[#0F172A]">{label}</span>
      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${value ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
        {value ? "OK" : "Pendente"}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-bold text-[#0F172A]">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  loading,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon: typeof RefreshCcw;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3 text-xs font-black text-white disabled:opacity-50"
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
      {label}
    </button>
  );
}

function LinkButton({ href, label, compact = false }: { href: string; label: string; compact?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-2xl border border-[#E5E7EB] text-xs font-black text-[#0F172A] ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      {label}
      <ExternalLink size={14} />
    </a>
  );
}

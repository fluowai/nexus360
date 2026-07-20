import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Building2,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Save,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

type OrganizationItem = {
  id: string;
  name: string;
  slug?: string;
  plan: string;
  subscriptionStatus: string;
  aiAgentsCount: number;
  users: Array<{ id: string; name?: string; email: string; role: string; status: string }>;
  paperclip: {
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

type Catalog = {
  capabilities: Array<{ key: string; title: string; summary: string; pillar: string }>;
  adapters: Array<{ key: string; label: string; runtime: string }>;
  rolloutChecklist: string[];
};

type DraftMap = Record<string, {
  enabled: boolean;
  deploymentMode: "self_hosted" | "desktop" | "hybrid";
  baseUrl: string;
  apiToken: string;
  notes: string;
  allowedAdapters: string[];
  enabledCapabilities: string[];
}>;

type StatusMap = Record<string, string | null>;

function formatDate(value?: string | null) {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

export default function PaperclipManager() {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [catalog, setCatalog] = useState<Catalog>({ capabilities: [], adapters: [], rolloutChecklist: [] });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [syncingCompany, setSyncingCompany] = useState<string | null>(null);
  const [syncingAgents, setSyncingAgents] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMap>({});
  const [drafts, setDrafts] = useState<DraftMap>({});

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/paperclip/admin/access");
      const data = await response.json();
      if (!response.ok) return;

      setOrganizations(data.organizations || []);
      setCatalog(data.catalog || { capabilities: [], adapters: [], rolloutChecklist: [] });

      const nextDrafts: DraftMap = {};
      for (const organization of data.organizations || []) {
        nextDrafts[organization.id] = {
          enabled: organization.paperclip.enabled,
          deploymentMode: organization.paperclip.deploymentMode,
          baseUrl: organization.paperclip.baseUrl || "",
          apiToken: "",
          notes: organization.paperclip.notes || "",
          allowedAdapters: organization.paperclip.allowedAdapters || [],
          enabledCapabilities: organization.paperclip.enabledCapabilities || [],
        };
      }
      setDrafts(nextDrafts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredOrganizations = useMemo(() => {
    const term = search.toLowerCase();
    return organizations.filter((organization) => {
      const inName = organization.name.toLowerCase().includes(term);
      const inSlug = (organization.slug || "").toLowerCase().includes(term);
      const inUsers = organization.users.some((user) =>
        `${user.name || ""} ${user.email}`.toLowerCase().includes(term),
      );
      return inName || inSlug || inUsers;
    });
  }, [organizations, search]);

  const updateDraft = (organizationId: string, patch: Partial<DraftMap[string]>) => {
    setDrafts((current) => ({
      ...current,
      [organizationId]: {
        ...current[organizationId],
        ...patch,
      },
    }));
  };

  const toggleArrayValue = (
    organizationId: string,
    field: "allowedAdapters" | "enabledCapabilities",
    value: string,
  ) => {
    const currentList = drafts[organizationId]?.[field] || [];
    const nextList = currentList.includes(value)
      ? currentList.filter((item) => item !== value)
      : [...currentList, value];

    updateDraft(organizationId, { [field]: nextList } as Partial<DraftMap[string]>);
  };

  const setRowStatus = (organizationId: string, message: string | null) => {
    setStatus((current) => ({ ...current, [organizationId]: message }));
  };

  const saveOrganization = async (organizationId: string) => {
    const draft = drafts[organizationId];
    if (!draft) return;

    setSaving(organizationId);
    setRowStatus(organizationId, null);
    try {
      const response = await apiFetch("/api/paperclip/admin/access", {
        method: "POST",
        body: JSON.stringify({
          organizationId,
          enabled: draft.enabled,
          deploymentMode: draft.deploymentMode,
          baseUrl: draft.baseUrl,
          apiToken: draft.apiToken,
          notes: draft.notes,
          allowedAdapters: draft.allowedAdapters,
          enabledCapabilities: draft.enabledCapabilities,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setRowStatus(organizationId, data?.error || "Falha ao salvar.");
        return;
      }

      setRowStatus(organizationId, "Configuracao salva.");
      await load();
    } finally {
      setSaving(null);
    }
  };

  const testConnection = async (organizationId: string) => {
    const draft = drafts[organizationId];
    if (!draft) return;

    setTesting(organizationId);
    setRowStatus(organizationId, null);
    try {
      const response = await apiFetch("/api/paperclip/admin/instance/test", {
        method: "POST",
        body: JSON.stringify({
          organizationId,
          baseUrl: draft.baseUrl,
          apiToken: draft.apiToken,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setRowStatus(organizationId, data?.details || data?.error || "Falha ao conectar.");
        return;
      }

      setRowStatus(organizationId, "Conexao validada com a instancia Paperclip.");
      await load();
    } finally {
      setTesting(null);
    }
  };

  const syncCompany = async (organizationId: string) => {
    setSyncingCompany(organizationId);
    setRowStatus(organizationId, null);
    try {
      const response = await apiFetch("/api/paperclip/admin/company/sync", {
        method: "POST",
        body: JSON.stringify({ organizationId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setRowStatus(organizationId, data?.details || data?.error || "Falha ao sincronizar empresa.");
        return;
      }

      setRowStatus(organizationId, "Empresa provisionada/sincronizada no Paperclip.");
      await load();
    } finally {
      setSyncingCompany(null);
    }
  };

  const syncAgents = async (organizationId: string) => {
    setSyncingAgents(organizationId);
    setRowStatus(organizationId, null);
    try {
      const response = await apiFetch("/api/paperclip/admin/agents/sync", {
        method: "POST",
        body: JSON.stringify({ organizationId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setRowStatus(organizationId, data?.details || data?.error || "Falha ao sincronizar agentes.");
        return;
      }

      setRowStatus(organizationId, `Agentes sincronizados. Novos agentes criados: ${data?.createdCount || 0}.`);
      await load();
    } finally {
      setSyncingAgents(null);
    }
  };

  const enabledCount = organizations.filter((organization) => organization.paperclip.enabled).length;
  const connectedCount = organizations.filter((organization) => organization.paperclip.lastConnectionStatus === "connected").length;

  return (
    <div className="flex flex-col gap-7">
      <div className="rounded-[28px] border border-[#D9E6FF] bg-gradient-to-br from-[#F6F9FF] via-white to-[#EEF4FF] p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#3557B7]">
              <Shield size={14} />
              Super Admin Control
            </div>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-[-0.04em] text-[#0F172A]">
              <Bot className="text-[#3557B7]" />
              Paperclip - Liberacao, Provisionamento e Sync
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#475569]">
              Aqui o super admin libera o modulo por conta, conecta uma instancia real do Paperclip, provisiona a empresa remota e sincroniza os agentes do Nexus360.
            </p>
          </div>

          <div className="grid min-w-[320px] grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white bg-white/90 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#64748B]">Contas liberadas</div>
              <div className="mt-2 text-3xl font-black text-[#0F172A]">{enabledCount}</div>
            </div>
            <div className="rounded-2xl border border-white bg-white/90 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#64748B]">Instancias conectadas</div>
              <div className="mt-2 text-3xl font-black text-[#0F172A]">{connectedCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_.9fr]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar organizacao, slug ou usuario..."
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-[#3557B7]"
          />
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
            <Sparkles size={16} className="text-[#3557B7]" />
            Rollout recomendado
          </div>
          <div className="mt-3 space-y-2 text-xs text-[#475569]">
            {catalog.rolloutChecklist.slice(0, 3).map((item) => (
              <div key={item} className="flex gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#3557B7]" size={28} />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredOrganizations.map((organization) => {
            const draft = drafts[organization.id];
            const current = organization.paperclip;
            return (
              <section key={organization.id} className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-2xl p-3 ${draft?.enabled ? "bg-[#E9F2FF] text-[#3557B7]" : "bg-gray-100 text-gray-400"}`}>
                      <Building2 size={22} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-[#0F172A]">{organization.name}</h2>
                      <p className="mt-1 text-xs text-gray-400">{organization.slug || organization.id} · Plano {organization.plan} · {organization.subscriptionStatus}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-[11px] font-bold text-[#475569]">
                          {organization.users.length} usuarios
                        </span>
                        <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-[11px] font-bold text-[#475569]">
                          {organization.aiAgentsCount} agentes locais
                        </span>
                        {current.remoteCompanyName && (
                          <span className="rounded-full bg-[#EDF7F0] px-3 py-1 text-[11px] font-bold text-emerald-700">
                            Remoto: {current.remoteCompanyName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => updateDraft(organization.id, { enabled: !draft.enabled })}
                      className={`rounded-2xl px-4 py-2 text-xs font-black ${draft.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {draft.enabled ? "LIBERADO" : "BLOQUEADO"}
                    </button>
                    <button
                      disabled={saving === organization.id}
                      onClick={() => saveOrganization(organization.id)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#3557B7] px-4 py-2 text-xs font-black text-white disabled:opacity-60"
                    >
                      {saving === organization.id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                      Salvar
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 p-6 xl:grid-cols-[.95fr_1.1fr_.95fr]">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Deployment</label>
                      <select
                        value={draft.deploymentMode}
                        onChange={(event) => updateDraft(organization.id, { deploymentMode: event.target.value as DraftMap[string]["deploymentMode"] })}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#3557B7]"
                      >
                        <option value="self_hosted">Self-hosted</option>
                        <option value="desktop">Desktop</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Base URL</label>
                      <input
                        value={draft.baseUrl}
                        onChange={(event) => updateDraft(organization.id, { baseUrl: event.target.value })}
                        placeholder="https://paperclip.suaempresa.com"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#3557B7]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">API Token</label>
                      <input
                        type="password"
                        value={draft.apiToken}
                        onChange={(event) => updateDraft(organization.id, { apiToken: event.target.value })}
                        placeholder={current.hasApiToken ? "Token ja salvo. Preencha so se quiser trocar." : "Cole o bearer token do Paperclip"}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#3557B7]"
                      />
                      <p className="mt-2 text-[11px] text-gray-400">
                        {current.hasApiToken ? "Ja existe um token salvo para esta conta." : "Nenhum token salvo ainda."}
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Notas de liberacao</label>
                      <textarea
                        value={draft.notes}
                        onChange={(event) => updateDraft(organization.id, { notes: event.target.value })}
                        placeholder="Ex: liberar apenas para operacao interna e time de inovacao."
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#3557B7]"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
                        <Cpu size={16} className="text-[#3557B7]" />
                        Adapters autorizados
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {catalog.adapters.map((adapter) => {
                          const active = draft.allowedAdapters.includes(adapter.key);
                          return (
                            <button
                              key={adapter.key}
                              onClick={() => toggleArrayValue(organization.id, "allowedAdapters", adapter.key)}
                              className={`rounded-2xl border px-3 py-2 text-left text-xs font-bold transition ${
                                active
                                  ? "border-[#3557B7] bg-[#EDF3FF] text-[#3557B7]"
                                  : "border-gray-200 bg-white text-gray-500"
                              }`}
                            >
                              <div>{adapter.label}</div>
                              <div className="mt-1 text-[10px] font-medium opacity-80">{adapter.runtime}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
                        <Bot size={16} className="text-[#3557B7]" />
                        Capacidades habilitadas
                      </div>
                      <div className="mt-4 flex flex-col gap-2">
                        {catalog.capabilities.map((capability) => {
                          const active = draft.enabledCapabilities.includes(capability.key);
                          return (
                            <button
                              key={capability.key}
                              onClick={() => toggleArrayValue(organization.id, "enabledCapabilities", capability.key)}
                              className={`rounded-2xl border p-3 text-left transition ${
                                active ? "border-[#3557B7] bg-[#EDF3FF]" : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-black text-[#0F172A]">{capability.title}</div>
                                <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#3557B7]">
                                  {capability.pillar}
                                </span>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-[#475569]">{capability.summary}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#FBFDFF] p-4">
                      <div className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
                        <Activity size={16} className="text-[#3557B7]" />
                        Estado remoto
                      </div>
                      <div className="mt-4 space-y-2 text-xs text-[#475569]">
                        <StatusRow label="Conexao" value={current.lastConnectionStatus === "connected" ? "Conectado" : current.lastConnectionStatus === "error" ? "Com erro" : "Nao testado"} />
                        <StatusRow label="Ultimo teste" value={formatDate(current.lastConnectionAt)} />
                        <StatusRow label="Empresa remota" value={current.remoteCompanyName || "Nao provisionada"} />
                        <StatusRow label="Ultimo sync" value={formatDate(current.lastSyncAt)} />
                        <StatusRow label="Agentes criados no ultimo sync" value={String(current.lastAgentSyncCount || 0)} />
                      </div>
                      {current.lastConnectionError && (
                        <div className="mt-4 rounded-2xl bg-red-50 p-3 text-xs leading-5 text-red-600">
                          {current.lastConnectionError}
                        </div>
                      )}
                      {current.lastSyncError && (
                        <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">
                          {current.lastSyncError}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        disabled={testing === organization.id}
                        onClick={() => testConnection(organization.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#3557B7] px-4 py-3 text-xs font-black text-[#3557B7] disabled:opacity-60"
                      >
                        {testing === organization.id ? <Loader2 size={15} className="animate-spin" /> : <Activity size={15} />}
                        Testar conexao
                      </button>
                      <button
                        disabled={syncingCompany === organization.id}
                        onClick={() => syncCompany(organization.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3 text-xs font-black text-white disabled:opacity-60"
                      >
                        {syncingCompany === organization.id ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
                        Provisionar/sincronizar empresa
                      </button>
                      <button
                        disabled={syncingAgents === organization.id}
                        onClick={() => syncAgents(organization.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black text-white disabled:opacity-60"
                      >
                        {syncingAgents === organization.id ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
                        Sincronizar agentes
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {current.links.boardHome && (
                        <a
                          href={current.links.boardHome}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold text-[#0F172A]"
                        >
                          <span>Abrir board Paperclip</span>
                          <ExternalLink size={14} />
                        </a>
                      )}
                      {current.links.companyApi && (
                        <a
                          href={current.links.companyApi}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold text-[#0F172A]"
                        >
                          <span>Abrir company API</span>
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>

                    {status[organization.id] && (
                      <div className="rounded-2xl bg-[#F8FAFC] p-3 text-xs leading-5 text-[#334155]">
                        {status[organization.id]}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-3 py-2">
      <span className="font-bold text-[#0F172A]">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

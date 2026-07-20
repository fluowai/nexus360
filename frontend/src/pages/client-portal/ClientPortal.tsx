import { FormEvent, useCallback, useEffect, useState } from "react";
import { BarChart3, CreditCard, FileText, LogOut, Users } from "lucide-react";
import { publicApiFetch, readJsonResponse } from "../../lib/api";

type PortalDashboard = {
  metrics: { leadsGenerated: number; conversionRate: string; adsSpent: string; salesClosed: number };
  recentLeads: Array<{ id: string; name: string; status: string; date: string }>;
  invoices: Array<{ id: string; amount: string; status: string; dueDate: string }>;
};

const TOKEN_KEY = "nexus_client_portal_token";

export default function ClientPortal() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "invoices">("overview");
  const [dashboard, setDashboard] = useState<PortalDashboard | null>(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (accessToken: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await publicApiFetch("/api/client-portal/dashboard", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await readJsonResponse<PortalDashboard & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar o portal.");
      setDashboard(data);
    } catch (loadError) {
      setDashboard(null);
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o portal.");
      if (loadError instanceof Error && /token|acesso/i.test(loadError.message)) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken("");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) void loadDashboard(token);
  }, [loadDashboard, token]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await publicApiFetch("/api/client-portal/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      const data = await readJsonResponse<{ token?: string; error?: string }>(response);
      if (!response.ok || !data.token) throw new Error(data.error || "Acesso não autorizado.");
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Falha ao entrar.");
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setDashboard(null);
  };

  if (!token) {
    return <div className="min-h-screen bg-gray-50 grid place-items-center p-6">
      <form onSubmit={login} className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-black text-gray-900">Portal do Cliente</h1>
        <p className="mt-2 text-sm text-gray-500">Entre com o acesso liberado pela sua agência.</p>
        <label className="mt-6 block text-sm font-bold text-gray-700">E-mail</label>
        <input required type="email" value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-primary" />
        <label className="mt-4 block text-sm font-bold text-gray-700">Senha</label>
        <input required type="password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-primary" />
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="mt-6 w-full rounded-xl bg-gray-900 p-3 font-bold text-white disabled:opacity-50">{loading ? "Entrando..." : "Entrar"}</button>
      </form>
    </div>;
  }

  return <div className="min-h-screen bg-gray-50">
    <header className="flex items-center justify-between bg-slate-900 p-6 text-white">
      <h1 className="text-xl font-black">Portal do Cliente</h1>
      <button onClick={logout} className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-bold"><LogOut size={16} /> Sair</button>
    </header>
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-6">
      <nav className="flex gap-4 border-b border-gray-200">
        {([
          ["overview", "Visão Geral", BarChart3], ["leads", "Meus Leads", Users], ["invoices", "Faturas", CreditCard],
        ] as const).map(([key, label, Icon]) => <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-2 border-b-2 px-4 pb-4 text-sm font-bold ${activeTab === key ? "border-primary text-primary" : "border-transparent text-gray-500"}`}><Icon size={18} />{label}</button>)}
      </nav>
      {loading && <p className="py-20 text-center text-gray-500">Carregando dados reais...</p>}
      {!loading && error && <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">{error}</div>}
      {!loading && dashboard && activeTab === "overview" && <div className="grid gap-6 md:grid-cols-4">
        {[
          ["Leads Gerados", dashboard.metrics.leadsGenerated], ["Vendas Fechadas", dashboard.metrics.salesClosed], ["Investimento Ads", dashboard.metrics.adsSpent], ["Conversão", dashboard.metrics.conversionRate],
        ].map(([label, value]) => <div key={label} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p><p className="mt-2 text-3xl font-black text-gray-900">{value}</p></div>)}
      </div>}
      {!loading && dashboard && activeTab === "leads" && <DataList empty="Nenhum lead real vinculado a este cliente.">{dashboard.recentLeads.map((lead) => <div key={lead.id} className="flex justify-between p-5"><div><p className="font-bold">{lead.name}</p><p className="text-sm text-gray-500">{lead.date}</p></div><span className="text-sm font-bold text-primary">{lead.status}</span></div>)}</DataList>}
      {!loading && dashboard && activeTab === "invoices" && <DataList empty="Nenhuma fatura encontrada.">{dashboard.invoices.map((invoice) => <div key={invoice.id} className="flex justify-between p-5"><div className="flex gap-3"><FileText /><div><p className="font-bold">Fatura {invoice.id}</p><p className="text-sm text-gray-500">Vencimento: {invoice.dueDate}</p></div></div><div className="text-right"><p className="font-black">{invoice.amount}</p><p className="text-sm">{invoice.status}</p></div></div>)}</DataList>}
    </main>
  </div>;
}

function DataList({ children, empty }: { children: React.ReactNode[]; empty: string }) {
  return <div className="divide-y divide-gray-100 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">{children.length ? children : <p className="p-10 text-center text-gray-500">{empty}</p>}</div>;
}

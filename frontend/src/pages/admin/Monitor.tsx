import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Database, MemoryStick, Server } from "lucide-react";
import { apiFetch } from "../../lib/api";

type MonitorData = {
  api: { status: string; uptimeSeconds: number };
  database: { status: string; latencyMs: number };
  process: { heapUsedBytes: number; rssBytes: number };
  alerts: Array<{ id: string; level: string; message: string; createdAt: string }>;
  checkedAt: string;
};

const bytesToMb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const duration = (seconds: number) => `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;

export default function AdminMonitor() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await apiFetch("/api/admin/monitor");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao consultar monitoramento.");
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao consultar monitoramento.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return <div className="flex flex-col gap-8">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-900">Monitoramento do Sistema</h1><p className="text-sm text-gray-500">Métricas coletadas diretamente pelo backend e banco de dados.</p></div><button onClick={() => void refresh()} className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white">Atualizar</button></div>
    {loading && <p className="py-20 text-center text-gray-400">Consultando infraestrutura...</p>}
    {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">{error}</div>}
    {data && <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card icon={Activity} label="API" value={data.api.status} detail={`Uptime do processo: ${duration(data.api.uptimeSeconds)}`} />
        <Card icon={Database} label="PostgreSQL" value={data.database.status} detail={`Consulta: ${data.database.latencyMs} ms`} />
        <Card icon={MemoryStick} label="Heap usado" value={bytesToMb(data.process.heapUsedBytes)} detail="Memória do processo Node.js" />
        <Card icon={Server} label="RSS" value={bytesToMb(data.process.rssBytes)} detail={`Coletado em ${new Date(data.checkedAt).toLocaleString("pt-BR")}`} />
      </div>
      <div className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm"><h3 className="flex items-center gap-2 font-bold"><AlertTriangle size={20} /> Alertas não resolvidos</h3>{data.alerts.length === 0 ? <div className="mt-8 flex items-center gap-3 text-emerald-600"><CheckCircle2 /> Nenhum alerta registrado.</div> : <div className="mt-6 divide-y">{data.alerts.map((alert) => <div key={alert.id} className="py-4"><p className="font-bold uppercase text-xs">{alert.level}</p><p>{alert.message}</p><p className="text-xs text-gray-400">{new Date(alert.createdAt).toLocaleString("pt-BR")}</p></div>)}</div>}</div>
    </>}
  </div>;
}

function Card({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm"><Icon className="mb-4 text-primary" /><p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p><p className="mt-1 text-xl font-bold text-gray-900">{value}</p><p className="mt-1 text-xs text-gray-500">{detail}</p></div>;
}

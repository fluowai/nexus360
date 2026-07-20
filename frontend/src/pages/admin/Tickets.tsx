import { useState, useEffect } from "react";
import { 
  Ticket, 
  Search, 
  Filter, 
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ChevronRight,
  User,
  Building2
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function AdminTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/admin/support-tickets")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Falha ao carregar chamados.");
        setTickets((Array.isArray(data) ? data : []).map((ticket) => ({
          ...ticket,
          orgName: ticket.organization?.name || "Organização não encontrada",
          lastUpdate: new Date(ticket.updatedAt).toLocaleString("pt-BR"),
        })));
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Falha ao carregar chamados."))
      .finally(() => setLoading(false));
  }, []);

  const pendingCount = tickets.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  const resolvedCount = tickets.filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  const countCategory = (category: string) => tickets.filter((ticket) => ticket.category === category).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central de Suporte Global</h1>
          <p className="text-sm text-gray-500">Gerencie os chamados de todas as agências da plataforma.</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{pendingCount} Pendentes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{resolvedCount} Resolvidos</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tickets List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-50 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  placeholder="Pesquisar chamados..." 
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm outline-none"
                />
              </div>
              <button className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-500 transition-all border border-gray-100">
                <Filter size={20} />
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {loading ? (
                <div className="p-20 text-center text-gray-400">Carregando chamados...</div>
              ) : error ? (
                <div className="p-20 text-center text-red-600">{error}</div>
              ) : tickets.length === 0 ? (
                <div className="p-20 text-center text-gray-400">Nenhum chamado encontrado.</div>
              ) : tickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </div>
          </div>
        </div>

        {/* Categories & Stats */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-widest">Categorias</h3>
            <div className="flex flex-col gap-4">
              <CategoryStat label="Técnico" count={countCategory("TECHNICAL")} color="blue" />
              <CategoryStat label="Financeiro" count={countCategory("BILLING")} color="amber" />
              <CategoryStat label="Sugestões" count={countCategory("FEATURE")} color="purple" />
              <CategoryStat label="Bugs" count={countCategory("BUG")} color="red" />
            </div>
          </div>

          <div className="bg-primary p-8 rounded-[32px] shadow-xl shadow-primary/20 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">Tempo de Resposta</h3>
              <p className="text-blue-100 text-xs mb-6">Este indicador exige histórico de respostas, ainda não registrado pelo modelo atual.</p>
              <div className="text-2xl font-black mb-2">Não medido</div>
            </div>
            <Ticket className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: any }) {
  const priorityColors: any = {
    HIGH: 'text-red-500 bg-red-50',
    MEDIUM: 'text-amber-500 bg-amber-50',
    LOW: 'text-blue-500 bg-blue-50',
    URGENT: 'text-purple-500 bg-purple-50'
  };

  const statusIcons: any = {
    OPEN: { icon: Clock, color: 'text-blue-500' },
    IN_PROGRESS: { icon: MessageSquare, color: 'text-amber-500' },
    RESOLVED: { icon: CheckCircle2, color: 'text-emerald-500' }
  };

  const statusConfig = statusIcons[ticket.status] || statusIcons.OPEN;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-6 hover:bg-gray-50/50 transition-colors cursor-pointer group">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${priorityColors[ticket.priority]}`}>
            {ticket.priority}
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{ticket.category}</span>
        </div>
        <span className="text-[10px] text-gray-400 font-medium">{ticket.lastUpdate}</span>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className={`mt-1 ${statusConfig.color}`}>
            <StatusIcon size={20} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{ticket.subject}</h4>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-1">
                <Building2 size={12} />
                <span>{ticket.orgName}</span>
              </div>
              <div className="flex items-center gap-1">
                <User size={12} />
                <span>ID: {ticket.id}</span>
              </div>
            </div>
          </div>
        </div>
        <ChevronRight className="text-gray-300 group-hover:text-primary transition-colors" size={20} />
      </div>
    </div>
  );
}

function CategoryStat({ label, count, color }: any) {
  const colors: any = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500'
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colors[color]}`} />
        <span className="text-sm text-gray-600 font-medium">{label}</span>
      </div>
      <span className="text-xs font-bold text-gray-400">{count}</span>
    </div>
  );
}

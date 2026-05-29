import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  Contact,
  FileText,
  GitBranch,
  Handshake,
  Layers,
  LayoutDashboard,
  Mail,
  Menu,
  MessageCircle,
  Monitor,
  PieChart,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

const PRIMARY = "#6054F8";
const PRIMARY_HOVER = "#5146E8";
const DARK = "#212040";

const stats = [
  { label: "Leads em pipeline", value: "+12.500", icon: Users },
  { label: "Taxa de conversão", value: "+34%", icon: TrendingUp },
  { label: "Propostas enviadas", value: "3.200+", icon: FileText },
  { label: "Clientes ativos", value: "580+", icon: Building2 },
];

const crmFeatures = [
  {
    title: "Funil de vendas personalizável",
    description: "Pipelines BDR, SDR e Closer com etapas customizáveis, SLA por fase e checklists inteligentes para não perder nenhuma oportunidade.",
    icon: Layers,
  },
  {
    title: "Kanban visual",
    description: "Arraste e solte leads entre colunas. Veja o funil completo: Novos Leads, Em Contato, Qualificados, Proposta e Ganhos.",
    icon: LayoutDashboard,
  },
  {
    title: "Captação inteligente de leads",
    description: "Busque empresas por nicho, cidade e segmento. A IA enriquece e qualifica cada lead antes de entrar no seu funil.",
    icon: Search,
  },
  {
    title: "Follow-ups automáticos",
    description: "Agende chamadas, reuniões, e-mails e tarefas com lembretes inteligentes. Nunca mais perca um contato importante.",
    icon: Timer,
  },
  {
    title: "Propostas e contratos",
    description: "Gere propostas profissionais em segundos. Aceite público, assinatura digital e onboarding automático do cliente.",
    icon: FileText,
  },
  {
    title: "Relatórios e métricas",
    description: "Acompanhe conversão, ticket médio, receita prevista, metas e gargalos em dashboards interativos em tempo real.",
    icon: BarChart3,
  },
  {
    title: "Agentes de IA comerciais",
    description: "Diagnóstico de leads, redação de propostas, análise de objeções e recomendações de próxima ação com inteligência artificial.",
    icon: Bot,
  },
  {
    title: "Integração WhatsApp",
    description: "Histórico de conversas, atalhos de contato e base pronta para transformar conversas do WhatsApp em oportunidades comerciais.",
    icon: MessageCircle,
  },
  {
    title: "Gestão de equipe",
    description: "Distribua leads, acompanhe performance individual, metas por vendedor e ranking de conversão do time comercial.",
    icon: Users,
  },
];

const aiFeatures = [
  {
    title: "Diagnóstico de leads",
    description: "A IA analisa o perfil, fit e intenção de cada lead e sugere a melhor abordagem.",
    icon: Sparkles,
  },
  {
    title: "Assistente de propostas",
    description: "Gere propostas personalizadas com base no histórico do lead e serviços mais aderentes.",
    icon: Wand2,
  },
  {
    title: "Recomendações de growth",
    description: "A IA identifica padrões, sugere playbooks e recomenda ações para aumentar conversão.",
    icon: TrendingUp,
  },
  {
    title: "Automação de follow-up",
    description: "Dispare sequências automáticas de e-mail e WhatsApp baseadas em gatilhos do funil.",
    icon: Zap,
  },
];

const plans = [
  {
    name: "Starter",
    price: "Grátis",
    period: "",
    description: "Para agências que estão começando a organizar o comercial.",
    features: [
      "CRM completo com funil",
      "Até 100 leads",
      "1 usuário",
      "Kanban e listagem",
      "Relatórios básicos",
    ],
    cta: "Criar conta grátis",
    highlight: false,
  },
  {
    name: "Profissional",
    price: "R$ 97",
    period: "/mês",
    description: "Para agências em crescimento com equipe comercial.",
    features: [
      "Tudo do Starter",
      "Leads ilimitados",
      "5 usuários",
      "Propostas e contratos",
      "Agentes de IA",
      "Relatórios avançados",
      "Integração WhatsApp",
    ],
    cta: "Assinar agora",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "R$ 197",
    period: "/mês",
    description: "Para agências com operação completa e múltiplas equipes.",
    features: [
      "Tudo do Profissional",
      "Usuários ilimitados",
      "Delivery e projetos",
      "Financeiro e notas",
      "Health score",
      "Portal do cliente",
      "Automações avançadas",
      "Suporte prioritário",
    ],
    cta: "Falar com vendas",
    highlight: false,
  },
];

const faqs = [
  {
    q: "O Nexus360 CRM é adequado para minha agência?",
    a: "Sim. O Nexus360 foi construído especificamente para agências de marketing e geração de leads. Ele cobre desde a prospecção até a entrega e retenção, tudo em uma plataforma unificada.",
  },
  {
    q: "Posso migrar meus dados de outro CRM?",
    a: "Sim. Oferecemos suporte completo para importação de leads, clientes e histórico comercial de outras ferramentas como Agendor, PipeDrive e planilhas.",
  },
  {
    q: "Precisa de cartão de crédito para começar?",
    a: "Não. O plano Starter é gratuito e não exige cartão de crédito. Você pode usar o CRM completo por tempo ilimitado com até 100 leads.",
  },
  {
    q: "A IA realmente ajuda nas vendas?",
    a: "Sim. Nossos agentes de IA analisam leads, sugerem abordagens, geram propostas e identificam oportunidades de upsell automaticamente. Os usuários reportam aumento médio de 34% na conversão.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim. O Nexus360 é totalmente responsivo e funciona perfeitamente em smartphones e tablets. Sua equipe pode gerenciar o pipeline de qualquer lugar.",
  },
];

function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    ["Recursos", "#recursos"],
    ["IA", "#ia"],
    ["Planos", "#planos"],
    ["FAQ", "#faq"],
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#EDECF0]/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/vendas" className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg"
            style={{ backgroundColor: PRIMARY, boxShadow: `0 8px 24px ${PRIMARY}33` }}
          >
            <Monitor size={21} />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight" style={{ color: DARK }}>
              Nexus360
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9F90B8]">
              CRM para agências
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-sm font-bold text-[#657098] transition"
              onMouseEnter={(e) => (e.currentTarget.style.color = PRIMARY)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#657098")}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="px-5 py-2.5 text-sm font-bold text-[#657098] transition"
            onMouseEnter={(e) => (e.currentTarget.style.color = PRIMARY)}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#657098")}
          >
            Entrar
          </Link>
          <a
            href="#planos"
            className="rounded-xl px-5 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02]"
            style={{ backgroundColor: PRIMARY, boxShadow: `0 8px 24px ${PRIMARY}33` }}
          >
            Começar grátis
          </a>
        </div>

        <button onClick={() => setOpen(!open)} className="rounded-xl p-2 text-[#657098] md:hidden">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[#EDECF0] bg-white px-5 py-5 md:hidden"
          >
            <div className="flex flex-col gap-4">
              {links.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="text-base font-bold text-[#212040]"
                >
                  {label}
                </a>
              ))}
              <Link
                to="/login"
                className="rounded-xl border border-[#EDECF0] px-4 py-3 text-center font-bold text-[#657098]"
              >
                Entrar
              </Link>
              <a
                href="#planos"
                className="rounded-xl px-4 py-3 text-center font-black text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                Começar grátis
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function PipelineDemo() {
  const columns = [
    { name: "Novos Leads", color: "#9B97FC", count: 24 },
    { name: "Em Contato", color: "#6054F8", count: 16 },
    { name: "Qualificados", color: "#5146E8", count: 9 },
    { name: "Proposta", color: "#7C3AED", count: 5 },
    { name: "Ganhos", color: "#5AE7AC", count: 3 },
  ];

  return (
    <div
      className="rounded-[2rem] border p-5 shadow-2xl"
      style={{ borderColor: "#EDECF0", backgroundColor: "#FAFAFB" }}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-[#9F90B8]">
            Pipeline em tempo real
          </div>
          <div className="text-lg font-black" style={{ color: DARK }}>
            Funil de vendas consultivas
          </div>
        </div>
        <div
          className="rounded-full px-3 py-1 text-xs font-black"
          style={{ backgroundColor: "#DFF5EA", color: "#2F7D68" }}
        >
          +34% conversão
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => (
          <div key={col.name} className="min-w-[180px] flex-1">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#9F90B8]">
                {col.name}
              </span>
              <span
                className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: col.color }}
              >
                {col.count}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { name: "Clínica Odonto", value: "R$ 4.800" },
                { name: "E-commerce Fit", value: "R$ 9.200" },
                { name: "Advocacia Lima", value: "R$ 6.500" },
              ]
                .slice(0, col.count > 10 ? 2 : col.count > 5 ? 2 : 1)
                .map((lead) => (
                  <div
                    key={lead.name}
                    className="rounded-xl border p-3 shadow-sm"
                    style={{ backgroundColor: "white", borderColor: "#EDECF0" }}
                  >
                    <div className="mb-1 text-sm font-black" style={{ color: DARK }}>
                      {lead.name}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#657098]">{lead.value}</span>
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-center text-[10px] font-black text-white"
                        style={{ backgroundColor: PRIMARY }}
                      >
                        <Contact size={12} />
                      </span>
                    </div>
                  </div>
                ))}
              {col.count > 3 && (
                <div className="pt-1 text-center text-xs font-bold text-[#9F90B8]">
                  +{col.count - 1} leads
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#EDECF0]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-6 py-6 text-left"
      >
        <span className="text-lg font-black" style={{ color: DARK }}>
          {question}
        </span>
        <ChevronDown
          className={`shrink-0 transition ${open ? "rotate-180" : ""}`}
          style={{ color: PRIMARY }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pb-6 leading-7 text-[#657098]"
          >
            {answer}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CRMSalesPage() {
  return (
    <main className="min-h-screen overflow-hidden" style={{ backgroundColor: "#F0F0F7", color: DARK }}>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pb-24 pt-36 lg:px-8 lg:pb-32" style={{ backgroundColor: "#FAFAFB" }}>
        <div
          className="absolute left-1/2 top-20 h-[620px] w-[860px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ backgroundColor: `${PRIMARY}0D` }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_1fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div
              className="mb-7 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.2em]"
              style={{ backgroundColor: `${PRIMARY}0D`, borderColor: `${PRIMARY}33`, color: PRIMARY }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIMARY }} />
              CRM 360 para agências
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight md:text-7xl" style={{ color: DARK }}>
              O CRM que sua agência precisa para vender mais e melhor.
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-[#657098]">
              Nexus360 é o CRM completo para agências de marketing. Capture leads, gerencie o pipeline, envie propostas, feche contratos e acompanhe a entrega — tudo em um só lugar com inteligência artificial.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#planos"
                className="inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-black text-white shadow-xl transition hover:scale-[1.02]"
                style={{ backgroundColor: PRIMARY, boxShadow: `0 8px 32px ${PRIMARY}40` }}
              >
                Começar grátis
                <ArrowRight size={18} />
              </a>
              <a
                href="#recursos"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-base font-black transition"
                style={{ borderColor: "#EDECF0", color: DARK }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = PRIMARY;
                  e.currentTarget.style.color = PRIMARY;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#EDECF0";
                  e.currentTarget.style.color = DARK;
                }}
              >
                <Play size={18} />
                Ver recursos
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-[#657098]">
              <span className="flex items-center gap-2">
                <Check size={16} style={{ color: PRIMARY }} /> Acesso imediato
              </span>
              <span className="flex items-center gap-2">
                <Check size={16} style={{ color: PRIMARY }} /> Sem cartão de crédito
              </span>
              <span className="flex items-center gap-2">
                <Check size={16} style={{ color: PRIMARY }} /> Feito para agências
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="relative"
          >
            <div
              className="absolute -right-8 -top-8 h-28 w-28 rounded-[2rem] opacity-10"
              style={{ backgroundColor: PRIMARY }}
            />
            <div
              className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full opacity-10"
              style={{ backgroundColor: PRIMARY }}
            />
            <PipelineDemo />
            <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border p-4 shadow-sm"
                  style={{ backgroundColor: "white", borderColor: "#EDECF0" }}
                >
                  <div
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${PRIMARY}0D`, color: PRIMARY }}
                  >
                    <stat.icon size={18} />
                  </div>
                  <div className="text-2xl font-black" style={{ color: DARK }}>
                    {stat.value}
                  </div>
                  <div className="text-xs font-bold text-[#657098]">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="px-5 py-24 lg:px-8" style={{ backgroundColor: "#F0F0F7" }}>
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p
              className="mb-3 text-xs font-black uppercase tracking-[0.25em]"
              style={{ color: PRIMARY }}
            >
              Tudo que sua agência precisa
            </p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl" style={{ color: DARK }}>
              Um CRM completo para cada etapa da venda.
            </h2>
            <p className="mt-4 text-lg text-[#657098]">
              Do primeiro lead ao pós-venda, o Nexus360 acompanha toda a jornada comercial da sua agência.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {crmFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-[1.5rem] border p-7 shadow-sm transition hover:-translate-y-1"
                style={{ backgroundColor: "white", borderColor: "#EDECF0" }}
              >
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${PRIMARY}0D`, color: PRIMARY }}
                >
                  <feature.icon size={22} />
                </div>
                <h3 className="text-lg font-black" style={{ color: DARK }}>
                  {feature.title}
                </h3>
                <p className="mt-3 leading-7 text-[#657098]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Intelligence */}
      <section id="ia" className="px-5 py-24 lg:px-8" style={{ backgroundColor: DARK }}>
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p
              className="mb-3 text-xs font-black uppercase tracking-[0.25em]"
              style={{ color: PRIMARY }}
            >
              Inteligência artificial
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              Venda com o poder da IA.
            </h2>
            <p className="mt-4 text-lg text-[#9F90B8]">
              Nossos agentes de IA trabalham 24/7 para qualificar leads, gerar propostas e recomendar a melhor ação.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {aiFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-[1.75rem] border p-7 text-white"
                style={{ borderColor: `${PRIMARY}33`, backgroundColor: `${PRIMARY}08` }}
              >
                <div
                  className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${PRIMARY}33`, color: "#9B97FC" }}
                >
                  <feature.icon size={23} />
                </div>
                <h3 className="text-xl font-black">{feature.title}</h3>
                <p className="mt-4 leading-7 text-[#9F90B8]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="px-5 py-24 lg:px-8" style={{ backgroundColor: "#FAFAFB" }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p
              className="mb-3 text-xs font-black uppercase tracking-[0.25em]"
              style={{ color: PRIMARY }}
            >
              Por que Nexus360?
            </p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl" style={{ color: DARK }}>
              Mais que um CRM. A operação completa da sua agência.
            </h2>
          </div>
          <div
            className="overflow-hidden rounded-[2rem] border shadow-xl"
            style={{ backgroundColor: "white", borderColor: "#EDECF0" }}
          >
            <div
              className="grid grid-cols-3 px-6 py-4 text-sm font-black uppercase tracking-widest text-white"
              style={{ backgroundColor: DARK }}
            >
              <div>Funcionalidade</div>
              <div>CRM Tradicional</div>
              <div>Nexus360</div>
            </div>
            {[
              ["Funil de vendas", "Kanban básico", "Pipelines BDR/SDR/Closer"],
              ["Captação de leads", "Manual", "Automática com IA"],
              ["Propostas", "Separado", "Integrado ao funil"],
              ["Contratos", "Fora do CRM", "Onboarding automático"],
              ["Delivery", "Não tem", "Entregas e aprovações"],
              ["Financeiro", "Não tem", "Faturas e despesas"],
              ["IA e automação", "Limitado", "Agentes inteligentes"],
              ["Portal do cliente", "Não tem", "Acompanhamento online"],
            ].map((row, i) => (
              <div
                key={row[0]}
                className="grid grid-cols-1 gap-4 border-t px-6 py-5 md:grid-cols-3 md:gap-0"
                style={{ borderColor: "#EDECF0", backgroundColor: i % 2 === 0 ? "#FAFAFB" : "white" }}
              >
                <div className="font-black" style={{ color: DARK }}>
                  {row[0]}
                </div>
                <div className="text-[#657098]">{row[1]}</div>
                <div className="font-bold" style={{ color: PRIMARY }}>
                  {row[2]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="px-5 py-24 lg:px-8" style={{ backgroundColor: "#F0F0F7" }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p
              className="mb-3 text-xs font-black uppercase tracking-[0.25em]"
              style={{ color: PRIMARY }}
            >
              Jornada completa
            </p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl" style={{ color: DARK }}>
              Da prospecção à retenção em um só fluxo.
            </h2>
            <p className="mt-4 text-lg text-[#657098]">
              Enquanto CRMs tradicionais param no fechamento, o Nexus360 continua: onboarding, entrega, saúde do cliente e expansão.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ["Captação", "Busca ativa com IA e fontes externas", Search],
              ["Funil", "Pipeline, follow-up e qualificação", Target],
              ["Fechamento", "Proposta, contrato e onboarding", Handshake],
              ["Entrega", "Delivery, tarefas e aprovações", ClipboardList],
              ["Retenção", "Health score, expansão e nurture", TrendingUp],
            ].map(([step, desc, Icon], i) => (
              <motion.div
                key={step as string}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl border p-5 text-center"
                style={{ backgroundColor: "white", borderColor: "#EDECF0" }}
              >
                <div
                  className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <Icon size={20} />
                </div>
                <div className="text-lg font-black" style={{ color: DARK }}>
                  {step as string}
                </div>
                <p className="mt-2 text-sm text-[#657098]">{desc as string}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="px-5 py-24 lg:px-8" style={{ backgroundColor: "white" }}>
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p
              className="mb-3 text-xs font-black uppercase tracking-[0.25em]"
              style={{ color: PRIMARY }}
            >
              Planos
            </p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl" style={{ color: DARK }}>
              Comece grátis. Escale quando quiser.
            </h2>
            <p className="mt-4 text-lg text-[#657098]">
              Todos os planos incluem acesso ao CRM completo. Sem surpresas, sem taxas escondidas.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="relative rounded-[2rem] border p-8 shadow-sm"
                style={{
                  backgroundColor: plan.highlight ? "white" : "#FAFAFB",
                  borderColor: plan.highlight ? PRIMARY : "#EDECF0",
                  boxShadow: plan.highlight ? `0 8px 40px ${PRIMARY}20` : undefined,
                }}
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-black uppercase tracking-widest text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Mais popular
                  </div>
                )}
                <div className="mb-1 text-lg font-black" style={{ color: DARK }}>
                  {plan.name}
                </div>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-4xl font-black" style={{ color: DARK }}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm font-bold text-[#657098]">{plan.period}</span>
                  )}
                </div>
                <p className="mb-6 text-sm text-[#657098]">{plan.description}</p>
                <ul className="mb-8 flex flex-col gap-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm font-medium text-[#657098]">
                      <Check size={16} style={{ color: PRIMARY }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.name === "Enterprise" ? "#contato" : "#"}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white transition hover:scale-[1.02]"
                  style={{
                    backgroundColor: plan.highlight ? PRIMARY : DARK,
                  }}
                >
                  {plan.cta}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-5 py-24 lg:px-8" style={{ backgroundColor: "#F0F0F7" }}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-black" style={{ color: DARK }}>
              Perguntas frequentes
            </h2>
            <p className="mt-4 text-[#657098]">
              Tire suas dúvidas sobre o CRM Nexus360.
            </p>
          </div>
          <div
            className="rounded-[2rem] border p-8 shadow-sm"
            style={{ backgroundColor: "white", borderColor: "#EDECF0" }}
          >
            {faqs.map((faq) => (
              <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-24 lg:px-8" style={{ backgroundColor: DARK }}>
        <div className="mx-auto max-w-4xl text-center">
          <p
            className="mb-4 text-xs font-black uppercase tracking-[0.25em]"
            style={{ color: PRIMARY }}
          >
            Comece agora
          </p>
          <h2 className="text-4xl font-black tracking-tight text-white md:text-6xl">
            Pronto para transformar as vendas da sua agência?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#9F90B8]">
            Junte-se a mais de 580 agências que já usam o Nexus360 para captar, vender, entregar e reter clientes em uma plataforma unificada.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#planos"
              className="inline-flex items-center gap-2 rounded-2xl px-10 py-4 text-base font-black text-white shadow-xl transition hover:scale-[1.02]"
              style={{ backgroundColor: PRIMARY, boxShadow: `0 8px 32px ${PRIMARY}40` }}
            >
              Criar conta grátis
              <ArrowRight size={18} />
            </a>
            <Link
              to="/login"
              className="rounded-2xl border px-10 py-4 text-base font-black text-white transition hover:bg-white/10"
              style={{ borderColor: `${PRIMARY}66` }}
            >
              Fazer login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 py-12 text-white" style={{ backgroundColor: "#1B1A38" }}>
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              <Monitor size={20} />
            </div>
            <div>
              <div className="font-black">Nexus360</div>
              <div className="text-xs text-[#9F90B8]">CRM e operação 360 para agências.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-bold text-[#9F90B8]">
            <a href="#recursos" className="transition hover:text-white">
              Recursos
            </a>
            <a href="#ia" className="transition hover:text-white">
              IA
            </a>
            <a href="#planos" className="transition hover:text-white">
              Planos
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
            <Link to="/login" className="transition hover:text-white">
              Entrar
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#9F90B8]">
            <ShieldCheck size={16} />
            Dados seguros e operação centralizada.
          </div>
        </div>
      </footer>
    </main>
  );
}

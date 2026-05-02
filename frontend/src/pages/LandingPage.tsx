import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Monitor, 
  ChevronRight, 
  Zap, 
  Users, 
  BarChart3, 
  Shield, 
  Globe, 
  FileText, 
  Sparkles, 
  Check, 
  ArrowRight,
  Menu,
  X,
  Play,
  Mail,
  Instagram,
  Linkedin,
  Twitter,
  Plus,
  Minus,
  LayoutDashboard,
  ClipboardList,
  KanbanSquare,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Monitor size={22} />
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tight">Nexus360</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#recursos" className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">Recursos</a>
          <a href="#solucoes" className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">Soluções</a>
          <a href="#planos" className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">Planos</a>
          <a href="#faq" className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">FAQ</a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="px-6 py-2.5 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors">
            Entrar
          </Link>
          <button className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            Solicitar Demonstração
          </button>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 px-6 py-8 flex flex-col gap-6"
          >
            <a href="#recursos" onClick={() => setIsOpen(false)} className="text-lg font-bold text-gray-900">Recursos</a>
            <a href="#solucoes" onClick={() => setIsOpen(false)} className="text-lg font-bold text-gray-900">Soluções</a>
            <a href="#planos" onClick={() => setIsOpen(false)} className="text-lg font-bold text-gray-900">Planos</a>
            <a href="#faq" onClick={() => setIsOpen(false)} className="text-lg font-bold text-gray-900">FAQ</a>
            <hr className="border-gray-50" />
            <div className="flex flex-col gap-4">
              <Link to="/login" className="text-center font-bold text-gray-700 py-3">Entrar</Link>
              <button className="bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200">
                Solicitar Demonstração
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left hover:text-blue-600 transition-colors"
      >
        <span className="text-lg font-bold text-gray-900">{question}</span>
        {isOpen ? <Minus size={20} className="text-blue-600" /> : <Plus size={20} className="text-gray-400" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-gray-500 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              Plataforma 360 para Agências e Consultores
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] mb-8">
              A máquina 360 para gerir sua agência em um só lugar.
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-10 max-w-xl">
              Capte leads, organize processos, gere contratos, acompanhe a execução com agentes de IA e centralize toda a operação em um painel único.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-2 group">
                Solicitar Demonstração
                <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="bg-white text-gray-900 border-2 border-gray-100 px-10 py-5 rounded-2xl font-black text-lg hover:border-blue-600 hover:text-blue-600 transition-all flex items-center justify-center gap-2">
                <Play size={20} fill="currentColor" />
                Ver Plataforma
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { label: "Leads captados", value: "1.250+", icon: Mail, color: "text-blue-600" },
                { label: "Contratos gerados", value: "820+", icon: FileText, color: "text-emerald-600" },
                { label: "Clientes ativos", value: "430+", icon: Users, color: "text-indigo-600" },
                { label: "Automação IA", value: "Ativa", icon: Sparkles, color: "text-amber-600" },
              ].map((stat, i) => (
                <div key={i}>
                  <div className={`flex items-center gap-2 mb-1 font-black text-lg ${stat.color}`}>
                    <stat.icon size={18} />
                    {stat.value}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-indigo-100 blur-3xl opacity-50 -z-10 rounded-[40px]"></div>
            <div className="bg-white p-2 rounded-[32px] shadow-2xl border border-gray-100 transform lg:rotate-2 hover:rotate-0 transition-transform duration-700">
              <img 
                src="/nexus360_mockup_landing_page_1777753431423.png" 
                alt="Nexus360 Dashboard" 
                className="rounded-[24px] w-full"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-32 px-6 bg-gray-50/50">
        <div className="max-w-7xl mx-auto text-center mb-20">
          <h2 className="text-4xl font-black text-gray-900 mb-6">Chega de operar no escuro e com ferramentas desconectadas.</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">Sua empresa merece uma visão 360° real para escalar sem perder o controle.</p>
        </div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { 
              title: "Dados espalhados", 
              desc: "Informações em planilhas, e-mails e diversas ferramentas que não se comunicam.",
              icon: Globe,
              color: "red"
            },
            { 
              title: "Retrabalho e perda de tempo", 
              desc: "Processos manuais, contratos lentos e acompanhamento ineficiente de clientes.",
              icon: Zap,
              color: "orange"
            },
            { 
              title: "Falta de visão 360", 
              desc: "Sem uma visão completa do funil, finanças e execução da operação.",
              icon: BarChart3,
              color: "purple"
            },
            { 
              title: "Crescimento limitado", 
              desc: "Sem previsibilidade e controle, fica difícil escalar com consistência.",
              icon: Monitor,
              color: "emerald"
            }
          ].map((item, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all"
            >
              <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center bg-${item.color}-50 text-${item.color}-600 shadow-inner`}>
                <item.icon size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 text-center">
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-6">Tudo que sua operação precisa para crescer</h2>
            <p className="text-xl text-gray-500">Funcionalidades pensadas para quem vive a realidade de agências e consultorias.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            {[
              { title: "Gestão de Leads", desc: "Capture leads de múltiplos canais e centralize tudo em um único painel.", icon: Mail },
              { title: "CRM Comercial", desc: "Acompanhe oportunidades, atividades e negociações com visão clara.", icon: LayoutDashboard },
              { title: "Gestão de Clientes", desc: "Histórico, contratos, entregas e relacionamento centralizados.", icon: Users },
              { title: "Contratos Automáticos", desc: "Crie e envie contratos profissionais em poucos cliques.", icon: FileText },
              { title: "Agentes de IA", desc: "Agentes inteligentes que ajudam na análise, follow-up e automação.", icon: Sparkles },
              { title: "Agenda e Tarefas", desc: "Organize equipe, prazos, reuniões e demandas em tempo real.", icon: ClipboardList },
              { title: "Relatórios Premium", desc: "Dashboards completos para tomar decisões com base em dados.", icon: BarChart3 },
              { title: "Operação 360", desc: "Marketing, comercial, contratos, financeiro e entrega conectados.", icon: Globe },
            ].map((feature, i) => (
              <div key={i} className="group cursor-default">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner">
                  <feature.icon size={22} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 px-6 bg-blue-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-800/30 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">Como o Nexus360 funciona</h2>
            <p className="text-xl text-blue-200">A jornada para uma gestão impecável em 3 passos simples.</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-16">
            {[
              { step: "01", title: "Capture e organize", desc: "Conecte seus canais, capture leads e centralize tudo no CRM com qualificação automática.", icon: Zap },
              { step: "02", title: "Automatize onboarding", desc: "Gere propostas e contratos em minutos e automatize o onboarding do seu novo cliente.", icon: FileText },
              { step: "03", title: "Execute e escale", desc: "Acompanhe a execução, receba insights da IA e foque no que realmente traz resultado.", icon: Sparkles },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-7xl font-black text-white/5 absolute -top-12 -left-4 leading-none">{item.step}</div>
                <div className="w-20 h-20 rounded-3xl bg-blue-800 flex items-center justify-center mb-8 shadow-2xl">
                  <item.icon size={36} className="text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                <p className="text-blue-200 leading-relaxed">{item.desc}</p>
                {i < 2 && <div className="hidden lg:block absolute top-10 -right-8 w-16 h-[2px] bg-gradient-to-r from-blue-700 to-transparent"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Demo Simulation */}
      <section className="py-32 px-6 bg-gray-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-6">Sua operação, em um único lugar</h2>
            <p className="text-xl text-gray-500">Visualize tudo o que importa sem trocar de aba.</p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {/* CRM Block */}
            <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <h4 className="font-black text-gray-900 flex items-center gap-2">
                  <KanbanSquare size={18} className="text-blue-600" />
                  CRM & Funil de Vendas
                </h4>
                <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">Ver todos</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Novos Leads', 'Qualificados', 'Proposta', 'Fechados'].map((col, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="bg-gray-50 p-2 rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{col}</div>
                    {[1, 2].map(card => (
                      <div key={card} className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                        <div className="text-xs font-bold text-gray-900 mb-1">Lead #{Math.floor(Math.random() * 1000)}</div>
                        <div className="text-[10px] text-gray-400">R$ {Math.floor(Math.random() * 10)}k • 2 dias</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Executivo */}
            <div className="bg-blue-600 text-white rounded-[32px] p-8 shadow-xl shadow-blue-200">
               <h4 className="font-black mb-8 flex items-center gap-2">
                  <BarChart3 size={18} />
                  Executivo
                </h4>
                <div className="space-y-6">
                  <div>
                    <div className="text-[10px] font-bold text-blue-100 uppercase mb-1 tracking-widest">Leads este mês</div>
                    <div className="text-4xl font-black">1.250 <span className="text-xs text-blue-200">+12%</span></div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-blue-100 uppercase mb-1 tracking-widest">Conversão</div>
                    <div className="text-4xl font-black">24,6% <span className="text-xs text-blue-200">+2.4%</span></div>
                  </div>
                  <div className="pt-6 border-t border-blue-500/30">
                    <div className="text-[10px] font-bold text-blue-100 uppercase mb-2 tracking-widest">Progresso da Meta</div>
                    <div className="h-2 bg-blue-800 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-[75%] rounded-full shadow-[0_0_10px_white]"></div>
                    </div>
                  </div>
                </div>
            </div>

            {/* Contratos */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <h4 className="font-black text-gray-900 flex items-center gap-2">
                  <FileText size={18} className="text-emerald-600" />
                  Contratos Ativos
                </h4>
              </div>
              <div className="space-y-4">
                {[
                  { name: "Agência Alpha", status: "Assinado", val: "8.500", color: "emerald" },
                  { name: "Startup X", status: "Pendente", val: "4.900", color: "amber" },
                  { name: "Loja Online", status: "Assinado", val: "6.200", color: "emerald" },
                ].map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{c.name}</div>
                      <div className={`text-[10px] font-bold text-${c.color}-600 uppercase`}>{c.status}</div>
                    </div>
                    <div className="text-sm font-black text-gray-900">R$ {c.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agentes de IA */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <h4 className="font-black text-gray-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  Agentes de IA
                </h4>
              </div>
              <div className="space-y-4">
                {['Follow-up', 'Qualificação', 'Insights'].map((a, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-gray-900">Agente de {a}</div>
                      <div className="h-1 bg-gray-100 rounded-full mt-1">
                        <div className="h-full bg-amber-500 w-[90%] rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-emerald-500 uppercase">Ativo</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tarefas */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <h4 className="font-black text-gray-900 flex items-center gap-2">
                  <ClipboardList size={18} className="text-indigo-600" />
                  Tarefas Equipe
                </h4>
              </div>
              <div className="space-y-4">
                {[
                  { t: "Reunião Agência Alpha", p: "Alta" },
                  { t: "Enviar proposta Consultoria", p: "Média" },
                  { t: "Follow-up Startup X", p: "Alta" },
                ].map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded border-2 border-gray-200"></div>
                      <span className="text-xs font-bold text-gray-700">{t.t}</span>
                    </div>
                    <div className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded ${t.p === 'Alta' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>{t.p}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-8 leading-tight">Mais controle. Mais produtividade. Mais crescimento.</h2>
              <div className="space-y-8">
                {[
                  { title: "Centralização total", desc: "Tudo conectado em uma plataforma única e intuitiva.", icon: Globe },
                  { title: "Produtividade máxima", desc: "Automação e IA para eliminar tarefas manuais e repetitivas.", icon: Zap },
                  { title: "Previsibilidade financeira", desc: "Receitas recorrentes, contratos e métricas claras para decidir melhor.", icon: BarChart3 },
                ].map((b, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-inner">
                      <b.icon size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{b.title}</h3>
                      <p className="text-gray-500 leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { title: "Menos retrabalho", desc: "Processos padronizados.", icon: RefreshCw },
                { title: "Visão 360", desc: "Histórico completo.", icon: LayoutDashboard },
                { title: "Escalabilidade", desc: "Estrutura para crescer.", icon: ArrowRight },
                { title: "IA Integrada", desc: "Inteligência real.", icon: Sparkles },
              ].map((item, i) => (
                <div key={i} className={`p-8 rounded-[32px] border border-gray-100 shadow-sm ${i === 1 || i === 2 ? 'bg-blue-50/30' : 'bg-white'}`}>
                  <item.icon className="text-blue-600 mb-4" size={24} />
                  <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <h2 className="text-4xl lg:text-5xl font-black text-center mb-20">O que nossos clientes dizem</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                q: "O Nexus360 transformou nossa operação. Agora temos visão completa do funil, contratos e entregas em um só lugar.",
                n: "Amanda Ribeiro",
                r: "CEO, Agência Impulso",
                a: "AR"
              },
              { 
                q: "Como consultor, consigo gerenciar todos os clientes, contratos e processos com muito mais organização e previsibilidade.",
                n: "Felipe Andrade",
                r: "Consultor de Marketing",
                a: "FA"
              },
              { 
                q: "A IA nos ajuda no follow-up e nos insights diários. Ganhamos tempo e aumentamos nossa produtividade comercial.",
                n: "Marcos Vieira",
                r: "Gestor Comercial",
                a: "MV"
              },
            ].map((t, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 p-10 rounded-[40px] hover:bg-white/10 transition-all duration-500 group">
                <div className="text-4xl text-blue-500 font-serif mb-6 opacity-50 group-hover:opacity-100 transition-opacity">“</div>
                <p className="text-lg text-gray-300 leading-relaxed mb-10 italic">{t.q}</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">{t.a}</div>
                  <div>
                    <div className="font-bold text-white">{t.n}</div>
                    <div className="text-xs text-gray-500">{t.r}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[48px] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-200">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10">
            <h2 className="text-4xl lg:text-6xl font-black mb-8 leading-tight">Pronto para transformar sua operação em uma máquina 360?</h2>
            <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">Agende uma demonstração gratuita e veja como o Nexus360 pode levar seu negócio para o próximo nível.</p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12">
              <button className="w-full md:w-auto bg-white text-blue-600 px-12 py-6 rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-xl">
                Agendar Demonstração
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-bold text-blue-200 uppercase tracking-widest">
              <div className="flex items-center gap-2"><Check size={16} /> Demonstração personalizada</div>
              <div className="flex items-center gap-2"><Check size={16} /> Implantação rápida</div>
              <div className="flex items-center gap-2"><Check size={16} /> Planos flexíveis</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-32 px-6 bg-gray-50/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-20">
             <h2 className="text-4xl font-black text-gray-900 mb-6">Perguntas Frequentes</h2>
             <p className="text-gray-500 font-medium">Tudo o que você precisa saber sobre o Nexus360.</p>
          </div>
          <div className="space-y-2">
            <FAQItem 
              question="O Nexus360 serve para agências e consultores?" 
              answer="Sim. A plataforma foi criada especificamente para centralizar a gestão de agências, consultores, profissionais de marketing e operações comerciais B2B." 
            />
            <FAQItem 
              question="O sistema centraliza todos os clientes e contratos?" 
              answer="Com certeza. Você pode gerenciar todo o ciclo de vida do cliente: desde o primeiro lead, passando pela proposta, geração do contrato, onboarding e acompanhamento das entregas." 
            />
            <FAQItem 
              question="Existem agentes de IA na plataforma?" 
              answer="Sim! Nossos agentes de IA nativos apoiam no follow-up comercial, qualificação de leads, geração de insights de performance e até na criação automática de tarefas e documentos." 
            />
            <FAQItem 
              question="É possível gerar contratos automaticamente?" 
              answer="Sim. O Nexus360 permite a criação de modelos de contratos que são preenchidos automaticamente com os dados dos seus clientes, economizando horas de trabalho jurídico manual." 
            />
            <FAQItem 
              question="O Nexus360 se integra com outras ferramentas?" 
              answer="Sim. A plataforma é preparada para integrações via Webhooks e APIs, permitindo conectar com WhatsApp, ferramentas de Meta/Google Ads e automações externas." 
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0f1a] text-white pt-32 pb-12 px-6 overflow-hidden relative">
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-16 mb-24">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Monitor size={22} />
                </div>
                <span className="text-xl font-black tracking-tight">Nexus360</span>
              </div>
              <p className="text-gray-500 leading-relaxed mb-8">
                A plataforma 360 para agências e consultores que querem crescer com organização, previsibilidade e tecnologia.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer"><Instagram size={18} /></div>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer"><Twitter size={18} /></div>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer"><Linkedin size={18} /></div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:col-span-3 gap-8">
              <div>
                <h5 className="font-bold mb-6 text-white uppercase text-[10px] tracking-widest opacity-40">Produto</h5>
                <ul className="space-y-4 text-sm text-gray-500">
                  <li className="hover:text-blue-500 transition-colors"><a href="#">Recursos</a></li>
                  <li className="hover:text-blue-500 transition-colors"><a href="#">Funcionalidades</a></li>
                  <li className="hover:text-blue-500 transition-colors"><a href="#">Integrações</a></li>
                  <li className="hover:text-blue-500 transition-colors"><a href="#">Planos</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-bold mb-6 text-white uppercase text-[10px] tracking-widest opacity-40">Soluções</h5>
                <ul className="space-y-4 text-sm text-gray-500">
                  <li className="hover:text-blue-500 transition-colors"><a href="#">Agências de Marketing</a></li>
                  <li className="hover:text-blue-500 transition-colors"><a href="#">Consultores</a></li>
                  <li className="hover:text-blue-500 transition-colors"><a href="#">Gestores Comerciais</a></li>
                  <li className="hover:text-blue-500 transition-colors"><a href="#">Times de Growth</a></li>
                </ul>
              </div>
              <div className="col-span-2 md:col-span-1">
                <h5 className="font-bold mb-6 text-white uppercase text-[10px] tracking-widest opacity-40">Newsletter</h5>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">Receba novidades e conteúdos exclusivos sobre gestão e escala.</p>
                <div className="relative">
                  <input 
                    type="email" 
                    placeholder="Seu melhor e-mail" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                  />
                  <button className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 px-3 rounded-lg transition-colors">
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-xs text-gray-500 font-medium">© 2024 Nexus360. Todos os direitos reservados.</div>
            <div className="flex gap-8 text-xs text-gray-500 font-medium">
              <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

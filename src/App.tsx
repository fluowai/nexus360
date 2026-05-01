import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Briefcase, 
  Settings as SettingsIcon, 
  PieChart, 
  LogOut, 
  Bell,
  Search,
  Plus,
  Menu,
  X,
  Zap,
  Megaphone,
  ShieldCheck,
  FileSignature,
  DollarSign,
  CheckSquare,
  Calendar as CalendarIcon,
  Images,
  Globe,
  HelpCircle,
  BarChart3,
  Activity,
  Building2,
  Ticket,
  Wallet,
  Flag,
  Layout as LayoutIcon
} from "lucide-react";
import { useState, useEffect, lazy, Suspense } from "react";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Content from "./pages/Content";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SuperAdmin from "./pages/SuperAdmin";
import AdminAgencies from "./pages/admin/Agencies";
import AdminAnalytics from "./pages/admin/Analytics";
import SystemTeam from "./pages/admin/SystemTeam";
import AdminPlans from "./pages/admin/Plans";
import AdminMonitor from "./pages/admin/Monitor";
import AdminBilling from "./pages/admin/Billing";
import AdminSupport from "./pages/admin/Support";
import AdminFlags from "./pages/admin/FeatureFlags";

import AdminAudit from "./pages/admin/AuditLog";
import AdminTemplates from "./pages/admin/Templates";
import AdminDomains from "./pages/admin/Domains";
import AdminAI from "./pages/admin/AIManager";
import MarketingOps from "./pages/MarketingOps";






import SalesMachine from "./pages/SalesMachine";
import Proposals from "./pages/Proposals";
import MeetingRoom from "./pages/MeetingRoom";
import Onboarding from "./pages/Onboarding";
const Login = lazy(() => import("./pages/Login"));


import Finance from "./pages/Finance";
import Tasks from "./pages/Tasks";
import Calendar from "./pages/Calendar";
import AdAccounts from "./pages/AdsAccounts";
import AssetsLibrary from "./pages/AssetsLibrary";
import LandingPages from "./pages/LandingPages";
import QuizBuilder from "./pages/QuizBuilder";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "./lib/api";

const categories = [
  {
    title: "Principal",
    items: [
      { id: 'dash', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { id: 'finance', label: 'Financeiro', icon: DollarSign, path: '/finance' },
      { id: 'calendar', label: 'Calendário', icon: CalendarIcon, path: '/calendar' },
      { id: 'tasks', label: 'Tarefas', icon: CheckSquare, path: '/tasks' },
    ]
  },
  {
    title: "Marketing",
    items: [
      { id: 'marketing', label: 'Marketing Ops', icon: Zap, path: '/marketing' },
      { id: 'assets', label: 'Assets', icon: Images, path: '/assets' },
      { id: 'landing', label: 'Landing Pages', icon: Globe, path: '/landing' },
      { id: 'quiz', label: 'Quiz', icon: HelpCircle, path: '/quiz' },
      { id: 'ads', label: 'Contas de Anúncio', icon: Megaphone, path: '/ads' },
    ]
  },
  {
    title: "Vendas",
    items: [
      { id: 'crm', label: 'CRM Leads', icon: Users, path: '/crm' },
      { id: 'sales', label: 'Sales Machine', icon: Zap, path: '/sales' },
      { id: 'proposals', label: 'Propostas', icon: FileSignature, path: '/proposals' },
    ]
  },
  {
    title: "Gestão",
    items: [
      { id: 'projects', label: 'Projetos', icon: Briefcase, path: '/projects' },
      { id: 'team', label: 'Equipe', icon: SettingsIcon, path: '/team' },
      { id: 'settings', label: 'Configuração', icon: SettingsIcon, path: '/settings' },
      { id: 'reports', label: 'Relatórios', icon: PieChart, path: '/reports' },
    ]
  }
];

const adminCategories = [
  {
    title: "Sistema",
    items: [
      { id: 'admin-dash', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
      { id: 'admin-analytics', label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
      { id: 'admin-monitor', label: 'Monitoring', icon: Activity, path: '/admin/monitor' },
    ]
  },
  {
    title: "Gestão",
    items: [
      { id: 'admin-agencies', label: 'Agências', icon: Building2, path: '/admin/orgs' },
      { id: 'admin-support', label: 'Suporte', icon: HelpCircle, path: '/admin/support' },
      { id: 'admin-team', label: 'Equipe', icon: Users, path: '/admin/team' },
    ]
  },
  {
    title: "Financeiro",
    items: [
      { id: 'admin-plans', label: 'Planos', icon: Ticket, path: '/admin/plans' },
      { id: 'admin-billing', label: 'Billing', icon: Wallet, path: '/admin/billing' },
    ]
  },
  {
    title: "Desenvolvedor",
    items: [
      { id: 'admin-flags', label: 'Feature Flags', icon: Flag, path: '/admin/flags' },
      { id: 'admin-audit', label: 'Audit Log', icon: FileText, path: '/admin/audit' },
      { id: 'admin-templates', label: 'Templates', icon: LayoutIcon, path: '/admin/templates' },
      { id: 'admin-domains', label: 'Domínios', icon: Globe, path: '/admin/domains' },
      { id: 'admin-ai', label: 'Importador IA', icon: Zap, path: '/admin/ai' },
    ]
  }
];


function SidebarContent({ onClose, userRole }: { onClose?: () => void, userRole?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentCategories = userRole === 'SUPER_ADMIN' ? adminCategories : categories;
  const isDark = userRole === 'SUPER_ADMIN';

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'text-gray-400' : 'text-gray-900'}`}>
      <div className="flex items-center justify-between mb-10 px-2">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${isDark ? 'bg-red-600' : 'bg-primary'} rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20`}>
            {isDark ? <ShieldCheck className="text-white" size={20} /> : <span className="text-white font-bold text-xl">N</span>}
          </div>
          <span className={`font-bold text-xl tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isDark ? 'Super Admin' : 'Nexus360'}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className={`lg:hidden p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        {currentCategories.map((cat, idx) => (
          <div key={idx}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 pl-4">{cat.title}</p>
            <div className="flex flex-col gap-1">
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link 
                    key={item.id} 
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium ${
                      isActive 
                        ? (isDark ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-primary text-white shadow-lg shadow-primary/20') 
                        : (isDark ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-gray-50 text-gray-600 hover:text-primary')
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`mt-auto pt-6 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-red-900/20">
            D
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className={`text-sm font-bold truncate ${isDark ? 'text-white' : ''}`}>Dono do Sistema</span>
            <span className="text-[10px] text-gray-500 truncate">fluowai@gmail.com</span>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-3 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-50/5 rounded-xl transition-all"
        >
          <LogOut size={16} />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </div>
  );
}


function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const userRole = localStorage.getItem('nexus_user_role') || 'ADMIN';
  const isDark = userRole === 'SUPER_ADMIN';

  const [orgs, setOrgs] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    const onboardingDone = localStorage.getItem('nexus_onboarding_done') === 'true';
    const isMeet = location.pathname.startsWith('/meet');
    const isLogin = location.pathname === '/login';
    const isOnboarding = location.pathname === '/onboarding';

    // 1. Regra de Ouro: Se não tem token, só pode ver Login ou Meet
    if (!token && !isLogin && !isMeet) {
      navigate('/login');
      return;
    }

    // 2. Regra de Fluxo: Se logado e sem onboarding, FORÇA onboarding (exceto se for Admin Master)
    if (token && !onboardingDone && !isOnboarding && !isLogin && !isMeet && userRole !== 'SUPER_ADMIN') {
      navigate('/onboarding');
      return;
    }

    // 3. Regra de Login: Se já logou e tenta ir pro login, manda pra home
    if (token && isLogin) {
      navigate(onboardingDone ? '/' : '/onboarding');
      return;
    }

    // 4. Carregamento de Dados (Apenas se estiver em rotas internas)
    if (token && !isLogin && !isOnboarding && !isMeet) {
      apiFetch('/api/orgs')
        .then(res => res.ok ? res.json() : [])
        .then(data => setOrgs(Array.isArray(data) ? data : []))
        .catch(() => setOrgs([]));
    }
  }, [location.pathname, navigate]);

  // Se estiver em telas "Full Screen", não renderiza o Sidebar
  if (location.pathname === '/login' || location.pathname === '/onboarding' || location.pathname.startsWith('/meet')) {
    return <>{children}</>;
  }



  
  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <aside className={`hidden lg:flex flex-col w-72 h-full border-r transition-all duration-300 ${isDark ? 'bg-[#0F172A] border-white/5 p-6 shadow-2xl' : 'bg-white border-gray-100 p-6'}`}>
        <SidebarContent userRole={userRole} />
      </aside>

      {/* Sidebar Mobile */}
      <div className={`lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <aside className={`absolute left-0 top-0 bottom-0 w-72 transition-transform duration-300 ${isDark ? 'bg-[#0F172A]' : 'bg-white'} p-6 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent onClose={() => setIsSidebarOpen(false)} userRole={userRole} />
        </aside>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className={`h-16 flex items-center justify-between px-8 border-b z-10 ${isDark ? 'bg-[#0F172A] border-white/5' : 'bg-white/80 backdrop-blur-md border-gray-100'}`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xs font-bold uppercase tracking-widest">{isDark ? 'Sistema Master' : 'Nexus360'}</span>
              <span className="text-gray-200">/</span>
              <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard</span>
            </div>
          </div>


          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            {/* Tenant Simulator */}
            <select 
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-1 outline-none font-semibold text-gray-600"
              onChange={(e) => {
                localStorage.setItem('nexus_org_id', e.target.value);
                window.location.reload();
              }}
              defaultValue={localStorage.getItem('nexus_org_id') || ''}
            >
              <option value="">🗺️ Visão Global</option>
              {Array.isArray(orgs) && orgs.map(org => (
                <option key={org.id} value={org.id}>🏢 {org.name}</option>
              ))}

            </select>

            <div className="h-4 w-[1px] bg-gray-200 mx-2" />

            <select 
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-1 outline-none font-semibold text-gray-600"
              onChange={(e) => {
                localStorage.setItem('nexus_user_role', e.target.value);
                window.location.reload();
              }}
              defaultValue={localStorage.getItem('nexus_user_role') || 'ADMIN'}
            >
              <option value="ADMIN">👑 Agência Admin</option>
              <option value="SUPERADMIN">🛡️ Super Admin</option>
            </select>

            <div className="flex sm:hidden p-2 text-gray-400 hover:text-primary transition-colors hover:bg-blue-50 rounded-lg cursor-pointer">
              <Search size={22} />
            </div>
            <button className="p-2 text-gray-400 hover:text-primary transition-colors hover:bg-blue-50 rounded-lg">
              <Bell size={20} />
            </button>
            <button className="flex items-center gap-2 bg-primary text-white p-2 sm:px-4 sm:py-2 rounded-xl hover:bg-blue-600 transition-all font-medium text-sm shadow-md shadow-blue-200">
              <Plus size={18} />
              <span className="hidden sm:inline">Novo</span>
            </button>
          </div>
        </header>

        {/* Page Area */}
        <div className="p-4 sm:p-8 pb-12 overflow-x-hidden overflow-y-auto h-[calc(100vh-64px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}


const AdminComingSoon = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center">
    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
      <Zap className="text-red-600 animate-pulse" size={40} />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">Módulo em Desenvolvimento</h2>
    <p className="text-gray-500 max-w-sm">Esta funcionalidade do Painel Master está sendo preparada e estará disponível em breve.</p>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">Carregando...</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/ads" element={<AdAccounts />} />
            <Route path="/assets" element={<AssetsLibrary />} />
            <Route path="/landing" element={<LandingPages />} />
            <Route path="/quiz" element={<QuizBuilder />} />
            <Route path="/content" element={<Content />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/team" element={<Team />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin" element={<SuperAdmin />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />

            <Route path="/admin/monitor" element={<AdminMonitor />} />
            <Route path="/admin/orgs" element={<AdminAgencies />} />

            <Route path="/admin/support" element={<AdminSupport />} />
            <Route path="/admin/team" element={<SystemTeam />} />

            <Route path="/admin/plans" element={<AdminPlans />} />
            <Route path="/admin/billing" element={<AdminBilling />} />

            <Route path="/admin/flags" element={<AdminFlags />} />
            <Route path="/admin/audit" element={<AdminAudit />} />
            <Route path="/admin/templates" element={<AdminTemplates />} />
            <Route path="/admin/domains" element={<AdminDomains />} />
            <Route path="/admin/ai" element={<AdminAI />} />

            <Route path="/marketing" element={<MarketingOps />} />
            <Route path="/sales" element={<SalesMachine />} />
            <Route path="/proposals" element={<Proposals />} />
             <Route path="/meet/:roomName" element={<MeetingRoom />} />
             <Route path="/onboarding" element={<Onboarding />} />
             <Route path="/login" element={<Login />} />

          </Routes>
        </Suspense>




      </Layout>
    </BrowserRouter>
  );
}

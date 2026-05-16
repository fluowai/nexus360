import { BrowserRouter, Routes, Route, useLocation, useNavigate, useParams } from "react-router-dom";
import { 
  LogOut, 
  Menu,
  Monitor
} from "lucide-react";
import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";

// Components
import { Sidebar } from "./components/sidebar/Sidebar";
import { apiFetch, clearAuthSession, hasAccessToken } from "./lib/api";
import ErrorBoundary from "./components/ErrorBoundary";

// Only eagerly load Dashboard (most visited page)
import Dashboard from "./pages/Dashboard";

// Lazy load all other pages for code splitting
const CRM = lazy(() => import("./pages/CRM"));
const Content = lazy(() => import("./pages/Content"));
const Projects = lazy(() => import("./pages/Projects"));
const Team = lazy(() => import("./pages/Team"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const MarketingOps = lazy(() => import("./pages/MarketingOps"));
const SalesMachine = lazy(() => import("./pages/SalesMachine"));
const Proposals = lazy(() => import("./pages/Proposals"));
const ClientsPage = lazy(() => import("./pages/Clients"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetail"));
const SoldServicesPage = lazy(() => import("./pages/SoldServices"));
const MeetingRoom = lazy(() => import("./pages/MeetingRoom"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AgentsHub = lazy(() => import("./pages/AgentsHub"));
const AISettings = lazy(() => import("./pages/AISettings"));
const Finance = lazy(() => import("./pages/Finance"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Calendar = lazy(() => import("./pages/Calendar"));
const AdAccounts = lazy(() => import("./pages/AdsAccounts"));
const AssetsLibrary = lazy(() => import("./pages/AssetsLibrary"));
const LandingPages = lazy(() => import("./pages/LandingPages"));
const QuizBuilder = lazy(() => import("./pages/QuizBuilder"));
const AdminAgencies = lazy(() => import("./pages/admin/Agencies"));
const SystemTeam = lazy(() => import("./pages/admin/SystemTeam"));
const AdminDomains = lazy(() => import("./pages/admin/Domains"));
const AdminMonitor = lazy(() => import("./pages/admin/Monitor"));
const AdminAudit = lazy(() => import("./pages/admin/AuditLog"));
const AdminPlans = lazy(() => import("./pages/admin/Plans"));
const AdminBilling = lazy(() => import("./pages/admin/Billing"));
const AdminTickets = lazy(() => import("./pages/admin/Tickets"));
const WhiteLabel = lazy(() => import("./pages/admin/WhiteLabel"));
const ReleaseControl = lazy(() => import("./pages/admin/ReleaseControl"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const PromptArchitect = lazy(() => import("./pages/PromptArchitect"));
const LandingDemo = lazy(() => import("./pages/LandingDemo"));
const LandingEditor = lazy(() => import("./pages/LandingTemplates/LandingEditor"));
const PublicProposal = lazy(() => import("./pages/PublicProposal"));
const LeadCapture = lazy(() => import("./pages/prospecting/LeadCapture"));
const CapturedLists = lazy(() => import("./pages/prospecting/CapturedLists"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const Login = lazy(() => import("./pages/Login"));

// Novas páginas de automação de agência
const AutomationBuilder = lazy(() => import("./pages/AutomationBuilder"));
const NotificationsCenter = lazy(() => import("./pages/NotificationsCenter"));
const DeliveryKanban = lazy(() => import("./pages/DeliveryKanban"));
const ServiceCatalog = lazy(() => import("./pages/ServiceCatalog"));
const TimeTracking = lazy(() => import("./pages/TimeTracking"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const ClientHealthDashboard = lazy(() => import("./pages/ClientHealthDashboard"));
const Billing = lazy(() => import("./pages/Billing"));

const Layout = ({ 
  children, 
  onLogout, 
  user,
  authLoading,
  selectedClientId,
  onSelectClient
}: { 
  children: React.ReactNode; 
  onLogout: () => void; 
  user: any;
  authLoading: boolean;
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { slug } = useParams();

  useEffect(() => {
    if (authLoading) return;

    const token = hasAccessToken();
    const onboardingDone = localStorage.getItem('nexus_onboarding_done') === 'true';
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isLoginPath = location.pathname === '/login';
    const isOnboardingPath = location.pathname === '/onboarding';
    const isMeetPath = location.pathname.startsWith('/meet');
    const isLandingPage = location.pathname === '/site';
    const isAdminPath = location.pathname.startsWith('/admin');

    // Detectar se a URL contém um slug de agência
    const pathParts = location.pathname.split('/').filter(Boolean);
    const firstPart = pathParts[0] || '';
    const reservedWords = ['admin', 'site', 'login', 'onboarding', 'meet', 'dashboard', 'crm', 'finance', 'settings', 'team', 'projects', 'reports', 'api'];
    const urlHasSlug = firstPart && !reservedWords.includes(firstPart);

    const isPublicProposal = location.pathname.startsWith('/p/');
    const isClientPortal = location.pathname.startsWith('/client-portal');

    // Páginas públicas: nunca redirecionar
    if (isLoginPath || isMeetPath || isLandingPage || isOnboardingPath || isPublicProposal || isClientPortal) return;

    // Se não tem token e NÃO está em página pública, manda para login
    if (!token) {
      navigate('/login');
      return;
    }

    // Se tem token mas está na raiz "/", redireciona baseado no papel
    if (location.pathname === '/') {
      if (isSuperAdmin && !selectedClientId) {
        navigate('/admin');
      } else {
        const savedSlug = localStorage.getItem('nexus_org_slug');
        if (savedSlug) {
          navigate(`/${savedSlug}/dashboard`);
        } else {
          navigate('/dashboard');
        }
      }
      return;
    }

    // Se está em uma rota com slug de agência, DEIXA EM PAZ (nunca redireciona)
    if (urlHasSlug) return;

    // Se é Super Admin sem cliente selecionado e não está em /admin, manda para /admin
    if (isSuperAdmin && !selectedClientId && !isAdminPath) {
      navigate('/admin');
      return;
    }

    // Se não fez onboarding
    if (!onboardingDone && !isSuperAdmin && !isOnboardingPath) {
      navigate('/onboarding');
    }
  }, [location.pathname, user, navigate, authLoading, selectedClientId]);

  if (location.pathname === '/login' || location.pathname === '/onboarding' || location.pathname.startsWith('/meet') || location.pathname === '/site' || location.pathname.startsWith('/p/') || location.pathname.startsWith('/client-portal')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        isMobileOpen={isMobileMenuOpen} 
        setIsMobileOpen={setIsMobileMenuOpen} 
        collapsed={isCollapsed}
        setCollapsed={setIsCollapsed}
        selectedClientId={selectedClientId}
        onSelectClient={onSelectClient}
      />
      
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'md:pl-[80px]' : 'md:pl-[280px]'}`}>
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Monitor size={18} />
            </div>
            <span className="font-black text-gray-900">Nexus360</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <Menu size={24} />
          </button>
        </div>

        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
          <ErrorBoundary>
            <Suspense fallback={
            <div className="flex items-center justify-center h-[60vh]">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            </div>
          }>
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
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(localStorage.getItem('nexus_selected_client'));

  const handleSelectClient = (clientId: string | null) => {
    setSelectedClientId(clientId);
    if (clientId) {
      localStorage.setItem('nexus_selected_client', clientId);
      // Se for Super Admin, redireciona para o Dashboard da agência selecionada
      if (user?.role === 'SUPER_ADMIN') {
        window.location.href = '/dashboard';
      }
    } else {
      localStorage.removeItem('nexus_selected_client');
      // Se for Super Admin e voltar para Global, redireciona para o Painel Admin
      if (user?.role === 'SUPER_ADMIN') {
        window.location.href = '/admin';
      }
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (!res.ok) throw new Error("Invalid session");
        const data = await res.json();
        setUser(data);
      } catch (error) {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    clearAuthSession();
    localStorage.clear();
    window.location.href = '/login';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white animate-pulse">
            <Monitor size={24} />
          </div>
          <p className="text-sm text-gray-500 font-medium animate-pulse">Validando acesso...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout 
        user={user} 
        authLoading={authLoading}
        onLogout={handleLogout}
        selectedClientId={selectedClientId}
        onSelectClient={handleSelectClient}
      >
        <Routes>
          {/* Public & Auth */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/prospecting/capture" element={<LeadCapture />} />
          <Route path="/prospecting/lists" element={<CapturedLists />} />
          <Route path="/team" element={<Team />} />
          <Route path="/site" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/meet/:roomName" element={<MeetingRoom />} />
          <Route path="/landing-demo" element={<LandingDemo />} />
          <Route path="/landing-editor" element={<LandingEditor />} />
          <Route path="/p/:slug" element={<PublicProposal />} />
          <Route path="/client-portal" element={<ClientPortal />} />

          {/* Super Admin */}
          <Route path="/admin" element={<SuperAdmin />} />
          <Route path="/admin/agencies" element={<AdminAgencies />} />
          <Route path="/admin/team" element={<SystemTeam />} />
          <Route path="/admin/domains" element={<AdminDomains />} />
          <Route path="/admin/monitor" element={<AdminMonitor />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
          <Route path="/admin/plans" element={<AdminPlans />} />
          <Route path="/admin/billing" element={<AdminBilling />} />
          <Route path="/admin/tickets" element={<AdminTickets />} />
          <Route path="/admin/whitelabel" element={<WhiteLabel />} />
          <Route path="/admin/releases" element={<ReleaseControl />} />

          {/* Agências com Slug: nexus.woopanel.com.br/slug/dashboard */}
          <Route path="/:slug" element={<Dashboard />} /> 
          <Route path="/:slug/dashboard" element={<Dashboard />} />
          <Route path="/:slug/admin" element={<Dashboard />} />
          <Route path="/:slug/finance" element={<Finance />} />
          <Route path="/:slug/tasks" element={<Tasks />} />
          <Route path="/:slug/calendar" element={<Calendar />} />
          <Route path="/:slug/crm" element={<CRM />} />
          <Route path="/:slug/clients" element={<ClientsPage />} />
          <Route path="/:slug/clients/:id" element={<ClientDetailPage />} />
          <Route path="/:slug/sold-services" element={<SoldServicesPage />} />
          <Route path="/:slug/ad-accounts" element={<AdAccounts />} />
          <Route path="/:slug/assets" element={<AssetsLibrary />} />
          <Route path="/:slug/landing-pages" element={<LandingPages />} />
          <Route path="/:slug/prospecting/capture" element={<LeadCapture />} />
          <Route path="/:slug/prospecting/lists" element={<CapturedLists />} />
          <Route path="/:slug/quiz" element={<QuizBuilder />} />
          <Route path="/:slug/content" element={<Content />} />
          <Route path="/:slug/projects" element={<Projects />} />
          <Route path="/:slug/team" element={<Team />} />
          <Route path="/:slug/settings" element={<Settings />} />
          <Route path="/:slug/reports" element={<Reports />} />
          <Route path="/:slug/marketing" element={<MarketingOps />} />
          <Route path="/:slug/sales-machine" element={<SalesMachine />} />
          <Route path="/:slug/proposals" element={<Proposals />} />
          <Route path="/:slug/agents-hub" element={<AgentsHub selectedClientId={selectedClientId} />} />
          <Route path="/:slug/ai-settings" element={<AISettings />} />
          <Route path="/:slug/prompt-architect" element={<PromptArchitect />} />
          <Route path="/:slug/billing" element={<Billing />} />

          {/* Novas Rotas de Automação */}
          <Route path="/:slug/automations" element={<AutomationBuilder />} />
          <Route path="/:slug/notifications" element={<NotificationsCenter />} />
          <Route path="/:slug/delivery" element={<DeliveryKanban />} />
          <Route path="/:slug/service-catalog" element={<ServiceCatalog />} />
          <Route path="/:slug/time-tracking" element={<TimeTracking />} />
          <Route path="/:slug/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/:slug/client-health" element={<ClientHealthDashboard />} />
          <Route path="/automations" element={<AutomationBuilder />} />
          <Route path="/notifications" element={<NotificationsCenter />} />
          <Route path="/delivery" element={<DeliveryKanban />} />
          <Route path="/service-catalog" element={<ServiceCatalog />} />
          <Route path="/time-tracking" element={<TimeTracking />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/client-health" element={<ClientHealthDashboard />} />

          {/* Fallback Legacy Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/billing" element={<Billing />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

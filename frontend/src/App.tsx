import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { 
  Menu,
  Monitor
} from "lucide-react";
import { useEffect, useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";

import { Sidebar } from "./components/sidebar/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./lib/useAuth";
import { isCustomWorkspaceHost, workspacePath } from "./lib/workspaceRoute";

import Dashboard from "./pages/Dashboard";
import { useWhitelabel } from "./lib/useWhitelabel";

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
const Onboarding = lazy(() => import("./pages/OnboardingWizard"));
const OnboardingPreview = lazy(() => import("./pages/OnboardingPreview"));
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
const AdminAcpManager = lazy(() => import("./pages/admin/AcpManager"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const PromptArchitect = lazy(() => import("./pages/PromptArchitect"));
const LandingDemo = lazy(() => import("./pages/LandingDemo"));
const LandingEditor = lazy(() => import("./pages/LandingTemplates/LandingEditor"));
const PublicProposal = lazy(() => import("./pages/PublicProposal"));
const LeadCapture = lazy(() => import("./pages/prospecting/LeadCapture"));
const CapturedLists = lazy(() => import("./pages/prospecting/CapturedLists"));
const ProspectingFunnels = lazy(() => import("./pages/prospecting/ProspectingFunnels"));
const MissionsList = lazy(() => import("./pages/prospecting/MissionsList"));
const FunnelBuilder = lazy(() => import("./pages/prospecting/FunnelBuilder"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const Login = lazy(() => import("./pages/Login"));
const CRMSalesPage = lazy(() => import("./pages/CRMSalesPage"));
const AcpHub = lazy(() => import("./pages/AcpHub"));

const AutomationBuilder = lazy(() => import("./pages/AutomationBuilder"));
const NotificationsCenter = lazy(() => import("./pages/NotificationsCenter"));
const DeliveryKanban = lazy(() => import("./pages/DeliveryKanban"));
const ServiceCatalog = lazy(() => import("./pages/ServiceCatalog"));
const TimeTracking = lazy(() => import("./pages/TimeTracking"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const ClientHealthDashboard = lazy(() => import("./pages/ClientHealthDashboard"));
const Billing = lazy(() => import("./pages/Billing"));

const RESERVED_WORDS = new Set([
  'admin', 'site', 'vendas', 'login', 'onboarding', 'meet',
  'dashboard', 'crm', 'finance', 'settings', 'team', 'projects',
  'reports', 'api', 'automations', 'notifications', 'delivery',
  'service-catalog', 'time-tracking', 'knowledge-base', 'client-health', 'whatsapp', 'acp'
]);

function isPublicPath(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/onboarding' ||
    pathname === '/site' ||
    pathname === '/vendas' ||
    pathname.startsWith('/meet') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/client-portal')
  );
}

function hasUrlSlug(pathname: string) {
  const firstPart = pathname.split('/').filter(Boolean)[0] || '';
  return firstPart && !RESERVED_WORDS.has(firstPart);
}

const Layout = ({ 
  children, 
  onLogout,
  user,
  selectedClientId,
  onSelectClient,
  whiteLabel
}: { 
  children: React.ReactNode; 
  onLogout: () => void; 
  user: any;
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  whiteLabel?: any;
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (isPublicPath(location.pathname)) {
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
        whiteLabel={whiteLabel}
      />
      
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'md:pl-[80px]' : 'md:pl-[280px]'}`}>
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            {whiteLabel?.logoUrl ? (
              <img src={whiteLabel.logoUrl} alt={whiteLabel?.name || "Logo"} className="h-8 w-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <Monitor size={18} />
              </div>
            )}
            <span className="font-black text-gray-900">{whiteLabel?.name || "Nexus360"}</span>
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

function useNavigationGuard(user: any, selectedClientId: string | null) {
  const location = useLocation();
  const navigate = useNavigate();

  const { pathname } = location;

  useEffect(() => {
    if (isPublicPath(pathname)) return;
    if (hasUrlSlug(pathname)) return;

    const onboardingDone = localStorage.getItem('nexus_onboarding_done') === 'true';
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    if (pathname === '/') {
      if (isSuperAdmin && !selectedClientId) {
        navigate('/admin', { replace: true });
      } else {
        const savedSlug = localStorage.getItem('nexus_org_slug');
        navigate(workspacePath('/dashboard', savedSlug), { replace: true });
      }
      return;
    }

    if (isSuperAdmin && !selectedClientId && !pathname.startsWith('/admin')) {
      navigate('/admin', { replace: true });
      return;
    }

    if (!onboardingDone && !isSuperAdmin && pathname !== '/onboarding' && !isCustomWorkspaceHost()) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate, pathname, selectedClientId, user?.role]);
}

export default function App() {
  const { config: whiteLabel } = useWhitelabel();
  const { user, setUser, authLoading, handleLogout } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    localStorage.getItem('nexus_selected_client')
  );

  const handleSelectClient = (clientId: string | null) => {
    setSelectedClientId(clientId);
    if (clientId) {
      localStorage.setItem('nexus_selected_client', clientId);
    } else {
      localStorage.removeItem('nexus_selected_client');
    }
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
      <Guard user={user} selectedClientId={selectedClientId} />
      <Layout 
        user={user} 
        onLogout={handleLogout}
        selectedClientId={selectedClientId}
        onSelectClient={handleSelectClient}
        whiteLabel={whiteLabel}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/prospecting/capture" element={<LeadCapture />} />
          <Route path="/prospecting/lists" element={<CapturedLists />} />
          <Route path="/prospecting/funnels" element={<ProspectingFunnels />} />
          <Route path="/prospecting/funnels/builder" element={<FunnelBuilder />} />
          <Route path="/prospecting/missions" element={<MissionsList />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/team" element={<Team />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/sold-services" element={<SoldServicesPage />} />
          <Route path="/ad-accounts" element={<AdAccounts />} />
          <Route path="/assets" element={<AssetsLibrary />} />
          <Route path="/landing-pages" element={<LandingPages />} />
          <Route path="/quiz" element={<QuizBuilder />} />
          <Route path="/content" element={<Content />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/marketing" element={<MarketingOps />} />
          <Route path="/sales-machine" element={<SalesMachine />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/agents-hub" element={<AgentsHub selectedClientId={selectedClientId} />} />
          <Route path="/acp" element={<AcpHub selectedClientId={selectedClientId} />} />
          <Route path="/ai-settings" element={<AISettings />} />
          <Route path="/prompt-architect" element={<PromptArchitect />} />
          <Route path="/site" element={<LandingPage />} />
          <Route path="/vendas" element={<CRMSalesPage />} />
          <Route path="/login" element={<Login onAuthenticated={setUser} />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/onboarding/preview" element={<OnboardingPreview />} />
          <Route path="/meet/:roomName" element={<MeetingRoom />} />
          <Route path="/landing-demo" element={<LandingDemo />} />
          <Route path="/landing-editor" element={<LandingEditor />} />
          <Route path="/p/:slug" element={<PublicProposal />} />
          <Route path="/client-portal" element={<ClientPortal />} />

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
          <Route path="/admin/acp" element={<AdminAcpManager />} />

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
          <Route path="/:slug/prospecting/funnels" element={<ProspectingFunnels />} />
          <Route path="/:slug/prospecting/funnels/builder" element={<FunnelBuilder />} />
          <Route path="/:slug/prospecting/missions" element={<MissionsList />} />
          <Route path="/:slug/whatsapp" element={<WhatsApp />} />
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
          <Route path="/:slug/acp" element={<AcpHub selectedClientId={selectedClientId} />} />
          <Route path="/:slug/ai-settings" element={<AISettings />} />
          <Route path="/:slug/prompt-architect" element={<PromptArchitect />} />
          <Route path="/:slug/billing" element={<Billing />} />

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

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/billing" element={<Billing />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

function Guard({ user, selectedClientId }: { user: any; selectedClientId: string | null }) {
  useNavigationGuard(user, selectedClientId);
  return null;
}

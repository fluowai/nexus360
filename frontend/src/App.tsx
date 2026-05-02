import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { 
  LogOut, 
  Menu,
  Monitor
} from "lucide-react";
import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";

// Components
import { Sidebar } from "./components/sidebar/Sidebar";
import { apiFetch } from "./lib/api";

// Pages
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Content from "./pages/Content";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SuperAdmin from "./pages/SuperAdmin";
import MarketingOps from "./pages/MarketingOps";
import SalesMachine from "./pages/SalesMachine";
import Proposals from "./pages/Proposals";
import ClientsPage from "./pages/Clients";
import ClientDetailPage from "./pages/ClientDetail";
import SoldServicesPage from "./pages/SoldServices";
import MeetingRoom from "./pages/MeetingRoom";
import Onboarding from "./pages/Onboarding";
import AgentsHub from "./pages/AgentsHub";
import AISettings from "./pages/AISettings";
import Finance from "./pages/Finance";
import Tasks from "./pages/Tasks";
import Calendar from "./pages/Calendar";
import AdAccounts from "./pages/AdsAccounts";
import AssetsLibrary from "./pages/AssetsLibrary";
import LandingPages from "./pages/LandingPages";
import QuizBuilder from "./pages/QuizBuilder";
import AdminAgencies from "./pages/admin/Agencies";
import SystemTeam from "./pages/admin/SystemTeam";
import AdminDomains from "./pages/admin/Domains";
import AdminMonitor from "./pages/admin/Monitor";
import AdminAudit from "./pages/admin/AuditLog";
import AdminPlans from "./pages/admin/Plans";
import WhiteLabel from "./pages/admin/WhiteLabel";

import LandingPage from "./pages/LandingPage";

const Login = lazy(() => import("./pages/Login"));

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

  useEffect(() => {
    if (authLoading) return;

    const token = localStorage.getItem('nexus_token');
    const onboardingDone = localStorage.getItem('nexus_onboarding_done') === 'true';
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isLoginPath = location.pathname === '/login';
    const isOnboardingPath = location.pathname === '/onboarding';
    const isMeetPath = location.pathname.startsWith('/meet');
    const isLandingPage = location.pathname === '/site';

    // Se não estiver logado e não for página pública, vai para login
    if (!token && !isLoginPath && !isMeetPath && !isLandingPage && location.pathname !== '/') {
      navigate('/login');
      return;
    }

    // Se estiver na raiz (/) e não estiver logado, vai para /site
    if (!token && location.pathname === '/') {
      navigate('/site');
      return;
    }

    // Se estiver logado e for a Landing Page (/site) ou Login, redireciona para o Dashboard/Admin
    if (token && (isLandingPage || isLoginPath || location.pathname === '/')) {
      if (isSuperAdmin && !selectedClientId) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
      return;
    }

    if (token && !onboardingDone && !isSuperAdmin && !isOnboardingPath && !isLoginPath && !isMeetPath) {
      navigate('/onboarding');
    }

    if (token && isSuperAdmin && !selectedClientId && !location.pathname.startsWith('/admin') && !isLoginPath && !isMeetPath && !isLandingPage) {
      navigate('/admin');
    }
  }, [location.pathname, user, navigate, authLoading, selectedClientId]);

  if (location.pathname === '/login' || location.pathname === '/onboarding' || location.pathname.startsWith('/meet') || location.pathname === '/site') {
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
      const token = localStorage.getItem('nexus_token');
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const res = await apiFetch('/api/auth/me');
        const data = await res.json();
        setUser(data);
      } catch (error) {
        console.error("[Auth] Session validation error:", error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/site" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/sold-services" element={<SoldServicesPage />} />
          <Route path="/ad-accounts" element={<AdAccounts />} />
          <Route path="/assets" element={<AssetsLibrary />} />
          <Route path="/landing-pages" element={<LandingPages />} />
          <Route path="/quiz" element={<QuizBuilder />} />
          <Route path="/content" element={<Content />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/team" element={<Team />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/marketing" element={<MarketingOps />} />
          <Route path="/sales-machine" element={<SalesMachine />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/meet/:roomName" element={<MeetingRoom />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/agents-hub" element={<AgentsHub selectedClientId={selectedClientId} />} />
          <Route path="/ai-settings" element={<AISettings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<SuperAdmin />} />
          <Route path="/admin/agencies" element={<AdminAgencies />} />
          <Route path="/admin/team" element={<SystemTeam />} />
          <Route path="/admin/domains" element={<AdminDomains />} />
          <Route path="/admin/monitor" element={<AdminMonitor />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
          <Route path="/admin/plans" element={<AdminPlans />} />
          <Route path="/admin/whitelabel" element={<WhiteLabel />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

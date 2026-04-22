import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Briefcase, 
  Settings, 
  PieChart, 
  LogOut, 
  Bell,
  Search,
  Plus,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Content from "./pages/Content";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import Reports from "./pages/Reports";
import { motion, AnimatePresence } from "motion/react";

function SidebarContent({ onClose, location }: { onClose?: () => void, location: any }) {
  const menuItems = [
    { id: 'dash', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'crm', label: 'CRM Leads', icon: Users, path: '/crm' },
    { id: 'content', label: 'Conteúdo IA', icon: FileText, path: '/content' },
    { id: 'projects', label: 'Projetos', icon: Briefcase, path: '/projects' },
    { id: 'team', label: 'Equipe', icon: Settings, path: '/team' },
    { id: 'reports', label: 'Relatórios', icon: PieChart, path: '/reports' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-12 px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <span className="font-bold text-xl tracking-tight">Nexus360</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.id} 
              to={item.path}
              onClick={onClose}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate">Agência Alpha</span>
            <span className="text-xs text-[var(--color-text-muted)] italic truncate">Plano Enterprise</span>
          </div>
        </div>
        <button className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600">
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[var(--color-border-light)] flex-col p-6 sticky top-0 h-screen shrink-0">
        <SidebarContent location={location} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 p-6 shadow-2xl lg:hidden flex flex-col"
            >
              <SidebarContent onClose={() => setIsSidebarOpen(false)} location={location} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 w-full">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[var(--color-border-light)] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 lg:gap-4 shrink-0">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex items-center gap-3 bg-gray-50 border border-gray-200 px-3 lg:px-4 py-2 rounded-xl w-48 lg:w-96">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                className="bg-transparent border-none outline-none text-sm w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
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


export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/content" element={<Content />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/team" element={<Team />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

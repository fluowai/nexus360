import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Wallet, 
  Users, 
  FileText, 
  Zap, 
  Megaphone, 
  Globe, 
  ClipboardList, 
  FolderKanban, 
  KanbanSquare, 
  UsersRound, 
  BarChart3, 
  Sparkles, 
  Settings,
  Layout,
  Shield,
  ChevronDown,
  X,
  LogOut,
  ChevronRight,
  Monitor,
  Ticket,
  Building2
} from 'lucide-react';
import { ClientSelector } from './ClientSelector';
import './Sidebar.css';

interface SidebarItemProps {
  icon: any;
  label: string;
  path?: string;
  isActive?: boolean;
  isAi?: boolean;
  badge?: string;
  children?: React.ReactNode;
  collapsed?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon: Icon, 
  label, 
  path, 
  isActive, 
  isAi, 
  badge, 
  children,
  collapsed 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isChildActive = children && React.Children.toArray(children).some((child: any) => 
    child.props.path === location.pathname
  );

  useEffect(() => {
    if (isChildActive) setIsOpen(true);
  }, [isChildActive]);

  const content = (
    <div className={`sidebar-item ${isActive || isChildActive ? 'active' : ''} ${isAi ? 'sidebar-item-ai' : ''}`}>
      <Icon size={20} className="sidebar-item-icon" />
      {!collapsed && (
        <>
          <span className="sidebar-item-label">{label}</span>
          {badge && <span className="ai-badge">{badge}</span>}
          {children && (
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={14} className="ml-auto opacity-50" />
            </motion.div>
          )}
        </>
      )}
    </div>
  );

  if (children && !collapsed) {
    return (
      <div>
        <div onClick={() => setIsOpen(!isOpen)}>{content}</div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sidebar-submenu"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return path ? (
    <NavLink to={path} style={{ textDecoration: 'none' }}>
      {content}
    </NavLink>
  ) : (
    content
  );
};

const SidebarGroup: React.FC<{ label: string; children: React.ReactNode; collapsed?: boolean }> = ({ label, children, collapsed }) => (
  <div className="sidebar-group">
    {!collapsed && <div className="sidebar-group-label">{label}</div>}
    {children}
  </div>
);

export const Sidebar: React.FC<{ 
  onLogout: () => void; 
  user: any;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
}> = ({ 
  onLogout, 
  user, 
  isMobileOpen, 
  setIsMobileOpen, 
  collapsed, 
  setCollapsed,
  selectedClientId,
  onSelectClient
}) => {
  const location = useLocation();
  const { slug } = useParams();

  // Função auxiliar para construir caminhos com slug
  const getPath = (basePath: string) => {
    if (basePath.startsWith('/admin')) return basePath;
    if (slug) return `/${slug}${basePath}`;
    return basePath;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999] md:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      <aside className={`sidebar-container ${collapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-wrapper">
            <div className="logo-icon">
              <Monitor size={20} />
            </div>
            <span className="logo-text">Nexus360</span>
          </div>
          <button 
            className="hidden md:flex p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronRight size={18} style={{ transform: collapsed ? '' : 'rotate(180deg)', transition: '0.3s' }} />
          </button>
          <button 
            className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
            onClick={() => setIsMobileOpen?.(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-scroll custom-scrollbar">
          <ClientSelector 
            user={user}
            selectedClientId={selectedClientId} 
            onSelectClient={onSelectClient} 
            collapsed={collapsed}
          />

          {user?.role === 'SUPER_ADMIN' && selectedClientId && (
            <div className="px-4 mb-4">
              <button 
                onClick={() => onSelectClient(null)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-2xl text-xs font-bold border border-amber-100 hover:bg-amber-100 transition-all shadow-sm"
              >
                <Shield size={16} />
                {!collapsed && "Voltar ao Modo Admin"}
              </button>
            </div>
          )}

          {user?.role === 'SUPER_ADMIN' && !selectedClientId ? (
            <>
              <SidebarGroup label="Menu Super Admin" collapsed={collapsed}>
                <SidebarItem 
                  icon={LayoutDashboard} 
                  label="Dashboard" 
                  path="/admin" 
                  isActive={location.pathname === '/admin'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Zap} 
                  label="Monitoramento" 
                  path="/admin/monitor" 
                  isActive={location.pathname === '/admin/monitor'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Building2} 
                  label="Clientes" 
                  path="/admin/agencies" 
                  isActive={location.pathname === '/admin/agencies'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Users} 
                  label="Equipe Sistema" 
                  path="/admin/team" 
                  isActive={location.pathname === '/admin/team'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Ticket} 
                  label="Planos SaaS" 
                  path="/admin/plans" 
                  isActive={location.pathname === '/admin/plans'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={FileText} 
                  label="Log de Auditoria" 
                  path="/admin/audit" 
                  isActive={location.pathname === '/admin/audit'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Globe} 
                  label="Domínios" 
                  path="/admin/domains" 
                  isActive={location.pathname === '/admin/domains'}
                  collapsed={collapsed}
                />
              </SidebarGroup>
            </>
          ) : (
            <>
              {/* Menu da Agência (Mostrado para ORG_ADMIN ou para SUPER_ADMIN em modo impersonificação) */}
              <SidebarGroup label="Visão Geral" collapsed={collapsed}>
                <SidebarItem 
                  icon={LayoutDashboard} 
                  label="Dashboard" 
                  path={getPath("/dashboard")} 
                  isActive={location.pathname === getPath('/dashboard') || location.pathname === '/'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={CalendarDays} 
                  label="Agenda" 
                  collapsed={collapsed}
                >
                  <SidebarItem 
                    icon={ChevronRight} 
                    label="Calendário" 
                    path={getPath("/calendar")} 
                    isActive={location.pathname === getPath('/calendar')}
                  />
                  <SidebarItem 
                    icon={ChevronRight} 
                    label="Tarefas" 
                    path={getPath("/tasks")} 
                    isActive={location.pathname === getPath('/tasks')}
                  />
                </SidebarItem>
                <SidebarItem 
                  icon={BarChart3} 
                  label="Relatórios" 
                  path={getPath("/reports")} 
                  isActive={location.pathname === getPath('/reports')}
                  collapsed={collapsed}
                />
              </SidebarGroup>

              <SidebarGroup label="Aquisição" collapsed={collapsed}>
                <SidebarItem 
                  icon={Megaphone} 
                  label="Marketing Ops" 
                  path={getPath("/marketing")} 
                  isActive={location.pathname === getPath('/marketing')}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Globe} 
                  label="Landing Pages" 
                  path={getPath("/landing-pages")} 
                  isActive={location.pathname === getPath('/landing-pages')}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={ClipboardList} 
                  label="Quiz" 
                  path={getPath("/quiz")} 
                  isActive={location.pathname === getPath('/quiz')}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Monitor} 
                  label="Contas de Anúncio" 
                  path={getPath("/ad-accounts")} 
                  isActive={location.pathname === getPath('/ad-accounts')}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={FolderKanban} 
                  label="Assets" 
                  path={getPath("/assets")} 
                  isActive={location.pathname === getPath('/assets')}
                  collapsed={collapsed}
                />
              </SidebarGroup>

              <SidebarGroup label="Comercial" collapsed={collapsed}>
                <SidebarItem 
                  icon={Users} 
                  label="CRM Leads" 
                  path={getPath("/crm")} 
                  isActive={location.pathname === getPath('/crm')}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={UsersRound} 
                  label="Gestão de Clientes" 
                  path={getPath("/clients")} 
                  isActive={location.pathname.startsWith(getPath('/clients'))}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Zap} 
                  label="Sales Machine" 
                  path={getPath("/sales-machine")} 
                  isActive={location.pathname === getPath('/sales-machine')}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={FileText} 
                  label="Propostas" 
                  path={getPath("/proposals")} 
                  isActive={location.pathname === getPath('/proposals')}
                  collapsed={collapsed}
                />
              </SidebarGroup>

              <SidebarGroup label="Operação" collapsed={collapsed}>
                <SidebarItem 
                  icon={ClipboardList} 
                  label="Serviços Vendidos" 
                  path={getPath("/sold-services")} 
                  isActive={location.pathname === getPath('/sold-services')}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={KanbanSquare} 
                  label="Projetos" 
                  path={getPath("/projects")} 
                  isActive={location.pathname === getPath('/projects')}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={UsersRound} 
                  label="Equipe" 
                  path={getPath("/team")} 
                  isActive={location.pathname === getPath('/team')}
                  collapsed={collapsed}
                />
              </SidebarGroup>

              <SidebarGroup label="Inteligência" collapsed={collapsed}>
                <SidebarItem 
                  icon={Sparkles} 
                  label="Central de Agentes" 
                  path={getPath("/agents-hub")} 
                  isActive={location.pathname === getPath('/agents-hub')}
                  isAi
                  badge="AI"
                  collapsed={collapsed}
                />
              </SidebarGroup>

              <SidebarGroup label="Administrativo" collapsed={collapsed}>
                <SidebarItem 
                  icon={Wallet} 
                  label="Financeiro" 
                  path={getPath("/finance")} 
                  isActive={location.pathname === getPath('/finance')}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Settings} 
                  label="Configurações" 
                  path={getPath("/settings")} 
                  isActive={location.pathname === getPath('/settings') || location.pathname === getPath('/ai-settings')}
                  collapsed={collapsed}
                />
              </SidebarGroup>
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile-mini">
            <div className="user-avatar">
              {user?.name?.substring(0, 1) || 'U'}
            </div>
            {!collapsed && (
              <div className="user-info">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button 
              onClick={onLogout}
              className="w-full mt-4 flex items-center justify-center gap-2 p-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors text-sm font-semibold"
            >
              <LogOut size={16} />
              Sair do Sistema
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

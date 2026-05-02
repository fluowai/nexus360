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
            selectedClientId={selectedClientId} 
            onSelectClient={onSelectClient} 
            collapsed={collapsed}
          />

          {user?.role === 'SUPER_ADMIN' ? (
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
                  icon={BarChart3} 
                  label="Analytics" 
                  path="/admin/analytics" 
                  isActive={location.pathname === '/admin/analytics'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Zap} 
                  label="Monitoring" 
                  path="/admin/monitor" 
                  isActive={location.pathname === '/admin/monitor'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Building2} 
                  label="Imobiliárias" 
                  path="/admin/agencies" 
                  isActive={location.pathname === '/admin/agencies'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={UsersRound} 
                  label="Suporte" 
                  path="/admin/support" 
                  isActive={location.pathname === '/admin/support'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Users} 
                  label="Equipe" 
                  path="/admin/team" 
                  isActive={location.pathname === '/admin/team'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Ticket} 
                  label="Planos" 
                  path="/admin/plans" 
                  isActive={location.pathname === '/admin/plans'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Wallet} 
                  label="Billing" 
                  path="/admin/billing" 
                  isActive={location.pathname === '/admin/billing'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Shield} 
                  label="Feature Flags" 
                  path="/admin/feature-flags" 
                  isActive={location.pathname === '/admin/feature-flags'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={FileText} 
                  label="Audit Log" 
                  path="/admin/audit" 
                  isActive={location.pathname === '/admin/audit'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Layout} 
                  label="Templates" 
                  path="/admin/templates" 
                  isActive={location.pathname === '/admin/templates'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Globe} 
                  label="Domínios" 
                  path="/admin/domains" 
                  isActive={location.pathname === '/admin/domains'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Sparkles} 
                  label="Importador IA" 
                  path="/admin/ai-importer" 
                  isActive={location.pathname === '/admin/ai-importer'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Settings} 
                  label="Configurações" 
                  path="/admin/settings" 
                  isActive={location.pathname === '/admin/settings'}
                  collapsed={collapsed}
                />
              </SidebarGroup>
            </>
          ) : (
            <>
              <SidebarGroup label="Visão Geral" collapsed={collapsed}>
                <SidebarItem 
                  icon={LayoutDashboard} 
                  label="Dashboard" 
                  path="/dashboard" 
                  isActive={location.pathname === '/dashboard' || location.pathname === '/'}
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
                    path="/calendar" 
                    isActive={location.pathname === '/calendar'}
                  />
                  <SidebarItem 
                    icon={ChevronRight} 
                    label="Tarefas" 
                    path="/tasks" 
                    isActive={location.pathname === '/tasks'}
                  />
                </SidebarItem>
                <SidebarItem 
                  icon={BarChart3} 
                  label="Relatórios" 
                  path="/reports" 
                  isActive={location.pathname === '/reports'}
                  collapsed={collapsed}
                />
              </SidebarGroup>

              <SidebarGroup label="Aquisição" collapsed={collapsed}>
                <SidebarItem 
                  icon={Megaphone} 
                  label="Marketing Ops" 
                  path="/marketing" 
                  isActive={location.pathname === '/marketing'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Globe} 
                  label="Landing Pages" 
                  path="/landing-pages" 
                  isActive={location.pathname === '/landing-pages'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={ClipboardList} 
                  label="Quiz" 
                  path="/quiz" 
                  isActive={location.pathname === '/quiz'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Monitor} 
                  label="Contas de Anúncio" 
                  path="/ad-accounts" 
                  isActive={location.pathname === '/ad-accounts'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={FolderKanban} 
                  label="Assets" 
                  path="/assets" 
                  isActive={location.pathname === '/assets'}
                  collapsed={collapsed}
                />
              </SidebarGroup>

              <SidebarGroup label="Comercial" collapsed={collapsed}>
                <SidebarItem 
                  icon={Users} 
                  label="CRM Leads" 
                  path="/crm" 
                  isActive={location.pathname === '/crm'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={UsersRound} 
                  label="Gestão de Clientes" 
                  path="/clients" 
                  isActive={location.pathname.startsWith('/clients')}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Zap} 
                  label="Sales Machine" 
                  path="/sales-machine" 
                  isActive={location.pathname === '/sales-machine'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={FileText} 
                  label="Propostas" 
                  path="/proposals" 
                  isActive={location.pathname === '/proposals'}
                  collapsed={collapsed}
                />
              </SidebarGroup>

              <SidebarGroup label="Operação" collapsed={collapsed}>
                <SidebarItem 
                  icon={ClipboardList} 
                  label="Serviços Vendidos" 
                  path="/sold-services" 
                  isActive={location.pathname === '/sold-services'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={KanbanSquare} 
                  label="Projetos" 
                  path="/projects" 
                  isActive={location.pathname === '/projects'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={UsersRound} 
                  label="Equipe" 
                  path="/team" 
                  isActive={location.pathname === '/team'}
                  collapsed={collapsed}
                />
              </SidebarGroup>

              <SidebarGroup label="Inteligência" collapsed={collapsed}>
                <SidebarItem 
                  icon={Sparkles} 
                  label="Central de Agentes" 
                  path="/agents-hub" 
                  isActive={location.pathname === '/agents-hub'}
                  isAi
                  badge="AI"
                  collapsed={collapsed}
                />
              </SidebarGroup>

              <SidebarGroup label="Administrativo" collapsed={collapsed}>
                <SidebarItem 
                  icon={Wallet} 
                  label="Financeiro" 
                  path="/finance" 
                  isActive={location.pathname === '/finance'}
                  collapsed={collapsed}
                />
                <SidebarItem 
                  icon={Settings} 
                  label="Configurações" 
                  path="/settings" 
                  isActive={location.pathname === '/settings' || location.pathname === '/ai-settings'}
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

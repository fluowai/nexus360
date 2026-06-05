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
  Globe,
  FolderKanban,
  KanbanSquare,
  UsersRound,
  BarChart3,
  Search,
  Sparkles,
  Settings,
  Shield,
  ChevronDown,
  X,
  LogOut,
  ChevronRight,
  Monitor,
  Ticket,
  CreditCard,
  Building2,
  Rocket,
  Bell,
  Truck,
  Package,
  Clock,
  BookOpen,
  Activity,
  GitBranch,
  MessageCircle
} from 'lucide-react';
import { ClientSelector } from './ClientSelector';
import { useAccess } from '../../lib/access';
import { isCustomWorkspaceHost, workspacePath } from '../../lib/workspaceRoute';
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

  const isChildActive = React.Children.toArray(children).some((child) =>
    React.isValidElement(child) && (child.props as any)?.path === location.pathname
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
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
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
  const access = useAccess(user);
  const isSuper = user?.role === 'SUPER_ADMIN';

  const getSlugFromPath = () => {
    if (isCustomWorkspaceHost()) return '';

    const parts = location.pathname.split('/').filter(Boolean);
    const firstPart = parts[0] || '';
    const reserved = ['admin', 'site', 'login', 'onboarding', 'meet', 'dashboard', 'crm', 'finance', 'settings', 'team', 'projects', 'reports'];
    if (firstPart && !reserved.includes(firstPart)) return firstPart;
    return localStorage.getItem('nexus_org_slug') || '';
  };

  const currentSlug = getSlugFromPath();
  const getPath = (basePath: string) => {
    return workspacePath(basePath, currentSlug);
  };

  const canSeeModule = (moduleKey: string) => isSuper || access.hasModule(moduleKey);
  const canSeeAny = (moduleKeys: string[]) => isSuper || access.hasAnyModule(moduleKeys);

  const workspaceItems = [
    { module: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', active: (path: string) => path === getPath('/dashboard') || path === '/' },
  ];

  const menuGroups = [
    {
      label: 'Comercial',
      modules: ['prospecting', 'whatsapp_funnels', 'whatsapp', 'crm', 'sales', 'proposals'],
      items: [
        { module: 'prospecting', icon: Search, label: 'Captacao de Leads', path: '/prospecting/capture' },
        { module: 'prospecting', icon: CalendarDays, label: 'Missoes Agendadas', path: '/prospecting/missions' },
        { module: 'whatsapp_funnels', icon: MessageCircle, label: 'Funis IA WhatsApp', path: '/prospecting/funnels' },
        { module: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', path: '/whatsapp' },
        { module: 'crm', icon: Users, label: 'CRM & Pipelines', path: '/crm', startsWith: true },
        { module: 'sales', icon: Zap, label: 'Sales Machine', path: '/sales-machine' },
        { module: 'proposals', icon: FileText, label: 'Propostas', path: '/proposals' },
      ],
    },
    {
      label: 'Operacao',
      modules: ['projects', 'delivery', 'service_catalog', 'time_tracking'],
      items: [
        { module: 'projects', icon: KanbanSquare, label: 'Projetos & Demandas', path: '/projects', startsWith: true },
        { module: 'delivery', icon: Truck, label: 'Entregas & Aprovacoes', path: '/delivery' },
        { module: 'service_catalog', icon: Package, label: 'Catalogo de Servicos', path: '/service-catalog' },
        { module: 'time_tracking', icon: Clock, label: 'Apontamento de Horas', path: '/time-tracking' },
      ],
    },
    {
      label: 'Marketing',
      modules: ['ads', 'landing_pages', 'assets'],
      items: [
        { module: 'ads', icon: Monitor, label: 'Trafego (Ads)', path: '/ad-accounts' },
        { module: 'landing_pages', icon: Globe, label: 'Landing Pages', path: '/landing-pages' },
        { module: 'assets', icon: FolderKanban, label: 'Criativos & Assets', path: '/assets' },
      ],
    },
    {
      label: 'Automacao',
      modules: ['automations', 'notifications', 'knowledge_base'],
      items: [
        { module: 'automations', icon: GitBranch, label: 'Automacoes', path: '/automations' },
        { module: 'notifications', icon: Bell, label: 'Notificacoes', path: '/notifications' },
        { module: 'knowledge_base', icon: BookOpen, label: 'Base de Conhecimento', path: '/knowledge-base' },
      ],
    },
    {
      label: 'Inteligencia Artificial',
      modules: ['ai', 'prompt_architect'],
      items: [
        { module: 'ai', icon: Sparkles, label: 'Central de Agentes', path: '/agents-hub', isAi: true, badge: 'AI' },
        { module: 'prompt_architect', icon: Zap, label: 'Arquiteto de Prompts', path: '/prompt-architect', isAi: true },
      ],
    },
    {
      label: 'Gestao',
      modules: ['reports', 'finance', 'health_score', 'agenda'],
      items: [
        { module: 'reports', icon: BarChart3, label: 'Relatorios', path: '/reports' },
        { module: 'finance', icon: Wallet, label: 'Financeiro', path: '/finance' },
        { module: 'health_score', icon: Activity, label: 'Health Score', path: '/client-health' },
      ],
      children: [
        {
          module: 'agenda',
          icon: CalendarDays,
          label: 'Agenda',
          items: [
            { label: 'Calendario', path: '/calendar' },
            { label: 'Tarefas', path: '/tasks' },
          ],
        },
      ],
    },
    {
      label: 'Administracao',
      modules: ['team', 'clients', 'billing', 'settings'],
      items: [
        { module: 'clients', icon: UsersRound, label: 'Meus Clientes', path: '/clients', startsWith: true },
        { module: 'team', icon: UsersRound, label: 'Equipe e Acessos', path: '/team' },
        { module: 'billing', icon: CreditCard, label: 'Assinatura e Uso', path: '/billing' },
      ],
      children: [
        {
          module: 'settings',
          icon: Settings,
          label: 'Configuracoes',
          items: [
            { label: 'Dados Gerais', path: '/settings' },
            { label: 'Configuracoes de IA', path: '/ai-settings' },
          ],
        },
      ],
    },
  ];

  const renderMenuItem = (item: any) => {
    if (!canSeeModule(item.module)) return null;
    const path = getPath(item.path);
    const active = item.active ? item.active(location.pathname) : item.startsWith ? location.pathname.startsWith(path) : location.pathname === path;
    return (
      <SidebarItem
        key={`${item.module}-${item.path}`}
        icon={item.icon}
        label={item.label}
        path={path}
        isActive={active}
        isAi={item.isAi}
        badge={item.badge}
        collapsed={collapsed}
      />
    );
  };

  return (
    <>
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
                {!collapsed && 'Voltar ao Modo Admin'}
              </button>
            </div>
          )}

          {user?.role === 'SUPER_ADMIN' && !selectedClientId ? (
            <SidebarGroup label="Menu Super Admin" collapsed={collapsed}>
              <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/admin" isActive={location.pathname === '/admin'} collapsed={collapsed} />
              <SidebarItem icon={Zap} label="Monitoramento" path="/admin/monitor" isActive={location.pathname === '/admin/monitor'} collapsed={collapsed} />
              <SidebarItem icon={Building2} label="Clientes" path="/admin/agencies" isActive={location.pathname === '/admin/agencies'} collapsed={collapsed} />
              <SidebarItem icon={Users} label="Equipe Sistema" path="/admin/team" isActive={location.pathname === '/admin/team'} collapsed={collapsed} />
              <SidebarItem icon={Ticket} label="Planos SaaS" path="/admin/plans" isActive={location.pathname === '/admin/plans'} collapsed={collapsed} />
              <SidebarItem icon={FileText} label="Log de Auditoria" path="/admin/audit" isActive={location.pathname === '/admin/audit'} collapsed={collapsed} />
              <SidebarItem icon={CreditCard} label="Faturas SaaS" path="/admin/billing" isActive={location.pathname === '/admin/billing'} collapsed={collapsed} />
              <SidebarItem icon={Ticket} label="Chamados Globais" path="/admin/tickets" isActive={location.pathname === '/admin/tickets'} collapsed={collapsed} />
              <SidebarItem icon={Globe} label="Dominios" path="/admin/domains" isActive={location.pathname === '/admin/domains'} collapsed={collapsed} />
              <SidebarItem icon={Rocket} label="Controle de Lancamento" path="/admin/releases" isActive={location.pathname === '/admin/releases'} collapsed={collapsed} />
            </SidebarGroup>
          ) : (
            <>
              <SidebarGroup label="Workspace" collapsed={collapsed}>
                {workspaceItems.map(renderMenuItem)}
              </SidebarGroup>

              {menuGroups.map((group) => {
                if (!canSeeAny(group.modules)) return null;
                return (
                  <SidebarGroup key={group.label} label={group.label} collapsed={collapsed}>
                    {group.items.map(renderMenuItem)}
                    {group.children?.map((child: any) => {
                      if (!canSeeModule(child.module)) return null;
                      return (
                        <SidebarItem key={child.module} icon={child.icon} label={child.label} collapsed={collapsed}>
                          {child.items.map((subItem: any) => (
                            <SidebarItem
                              key={subItem.path}
                              icon={ChevronRight}
                              label={subItem.label}
                              path={getPath(subItem.path)}
                              isActive={location.pathname === getPath(subItem.path)}
                            />
                          ))}
                        </SidebarItem>
                      );
                    })}
                  </SidebarGroup>
                );
              })}
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile-mini">
            <div className="user-avatar">{user?.name?.substring(0, 1) || 'U'}</div>
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

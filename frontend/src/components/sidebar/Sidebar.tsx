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
  MessageCircle,
  Brain,
  Palette,
  PlugZap,
  Target,
  Megaphone,
  Bot,
  LockKeyhole,
  KeyRound,
  MapPinned,
  Cpu
} from 'lucide-react';
import { ClientSelector } from './ClientSelector';
import { useAccess } from '../../lib/access';
import { apiFetch } from '../../lib/api';
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
      <Icon size={21} className="sidebar-item-icon" />
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

const SidebarGroup: React.FC<{
  label: string;
  icon?: any;
  count?: number;
  children: React.ReactNode;
  collapsed?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}> = ({ label, icon: Icon, count, children, collapsed, collapsible, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const visibleChildren = !collapsible || collapsed || isOpen;

  return (
    <div className="sidebar-group">
      {!collapsed && (
        <button
          type="button"
          className={`sidebar-group-label ${collapsible ? 'sidebar-group-trigger' : ''}`}
          onClick={() => collapsible && setIsOpen((open) => !open)}
        >
          <span className="sidebar-group-title">
            {Icon && <Icon size={16} />}
            <span>{label}</span>
          </span>
          <span className="sidebar-group-meta">
            {typeof count === 'number' && <span className="sidebar-group-count">{count}</span>}
            {collapsible && (
              <ChevronDown size={15} className={`sidebar-group-chevron ${isOpen ? 'open' : ''}`} />
            )}
          </span>
        </button>
      )}
      {visibleChildren && children}
    </div>
  );
};

export const Sidebar: React.FC<{
  onLogout: () => void;
  user: any;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  whiteLabel?: any;
}> = ({
  onLogout,
  user,
  isMobileOpen,
  setIsMobileOpen,
  collapsed,
  setCollapsed,
  selectedClientId,
  onSelectClient,
  whiteLabel
}) => {
  const location = useLocation();
  const access = useAccess(user);
  const isSuper = user?.role === 'SUPER_ADMIN';
  const [googleLocalEnabled, setGoogleLocalEnabled] = useState(isSuper);

  useEffect(() => {
    if (isSuper) {
      setGoogleLocalEnabled(true);
      return;
    }
    apiFetch('/api/google-local/access')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setGoogleLocalEnabled(Boolean(data?.enabled)))
      .catch(() => setGoogleLocalEnabled(false));
  }, [isSuper, user?.id]);

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

  const canSeeModule = (moduleKey: string) => moduleKey === 'google_local'
    ? googleLocalEnabled
    : isSuper || access.hasModule(moduleKey);
  const canSeeAny = (moduleKeys: string[]) => isSuper || access.hasAnyModule(moduleKeys);

  const menuGroups: any[] = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      modules: ['dashboard'],
      items: [
        { module: 'dashboard', icon: LayoutDashboard, label: 'Dashboard Executivo', path: '/dashboard', active: (path: string) => path === getPath('/dashboard') || path === '/' },
      ],
    },
    {
      label: 'Prospeccao',
      icon: Target,
      modules: ['prospecting', 'whatsapp_funnels', 'sales'],
      items: [
        { module: 'prospecting', icon: Target, label: 'Captacao de Leads', path: '/prospecting/capture' },
        { module: 'prospecting', icon: CalendarDays, label: 'Missoes Agendadas', path: '/prospecting/missions' },
        { module: 'sales', icon: Zap, label: 'Sales Machine', path: '/sales-machine' },
        { module: 'whatsapp_funnels', icon: BarChart3, label: 'Funis IA WhatsApp', path: '/prospecting/funnels' },
      ],
    },
    {
      label: 'CRM',
      icon: UsersRound,
      modules: ['crm', 'whatsapp'],
      items: [
        { module: 'crm', icon: Users, label: 'CRM & Pipelines', path: '/crm', startsWith: true },
        { module: 'crm', icon: Building2, label: 'Clientes', path: '/clients', startsWith: true },
        { module: 'whatsapp', icon: MessageCircle, label: 'Mensagens', path: '/whatsapp?tab=messages' },
        { module: 'whatsapp', icon: PlugZap, label: 'Conexoes WhatsApp', path: '/whatsapp?tab=instances' },
        { module: 'crm', icon: KanbanSquare, label: 'Kanban', path: '/crm?tab=funil' },
      ],
    },
    {
      label: 'Marketing',
      icon: Megaphone,
      modules: ['ads', 'landing_pages', 'assets', 'proposals', 'google_local'],
      items: [
        { module: 'ads', icon: Megaphone, label: 'Trafego Pago', path: '/ad-accounts' },
        { module: 'assets', icon: Palette, label: 'Criativos & Assets', path: '/assets' },
        { module: 'landing_pages', icon: Globe, label: 'Landing Pages', path: '/landing-pages' },
        { module: 'proposals', icon: FileText, label: 'Propostas', path: '/proposals' },
        { module: 'google_local', icon: MapPinned, label: 'Google Local', path: '/google-local' },
      ],
    },
    {
      label: 'Operacao',
      icon: FolderKanban,
      modules: ['projects', 'delivery', 'time_tracking', 'service_catalog'],
      items: [
        { module: 'projects', icon: FolderKanban, label: 'Projetos', path: '/projects', startsWith: true },
        { module: 'delivery', icon: Truck, label: 'Entregas', path: '/delivery' },
        { module: 'time_tracking', icon: Clock, label: 'Apontamento de Horas', path: '/time-tracking' },
        { module: 'service_catalog', icon: Package, label: 'Catalogo de Servicos', path: '/service-catalog' },
      ],
    },
    {
      label: 'IA ACP',
      icon: Bot,
      modules: ['ai', 'prompt_architect', 'knowledge_base'],
      items: [
        { module: 'ai', icon: Bot, label: 'Agentes de IA', path: '/agents-hub', isAi: true },
        { module: 'prompt_architect', icon: Brain, label: 'Arquiteto de Prompts', path: '/prompt-architect', isAi: true },
        { module: 'ai', icon: Zap, label: 'Orquestrador ACP', path: '/acp', isAi: true, badge: 'v2' },
        { module: 'knowledge_base', icon: BookOpen, label: 'Base de Conhecimento', path: '/knowledge-base' },
      ],
    },
    {
      label: 'Gestao',
      icon: BarChart3,
      modules: ['reports', 'finance', 'health_score', 'agenda', 'notifications'],
      items: [
        { module: 'reports', icon: BarChart3, label: 'Relatorios', path: '/reports' },
        { module: 'finance', icon: Wallet, label: 'Financeiro', path: '/finance' },
        { module: 'health_score', icon: Activity, label: 'Health Score', path: '/client-health' },
        { module: 'agenda', icon: CalendarDays, label: 'Agenda', path: '/calendar' },
        { module: 'notifications', icon: Bell, label: 'Notificacoes', path: '/notifications' },
      ],
    },
    {
      label: 'Configuracoes',
      icon: Settings,
      modules: ['settings', 'team', 'integrations'],
      items: [
        { module: 'settings', icon: Settings, label: 'Administracao', path: '/settings' },
        { module: 'team', icon: UsersRound, label: 'Usuarios', path: '/team' },
        { module: 'team', icon: LockKeyhole, label: 'Permissoes', path: '/team?tab=permissions' },
        { module: 'settings', icon: KeyRound, label: 'Integracoes', path: '/settings?tab=integrations' },
      ],
    },
  ];

  const renderMenuItem = (item: any) => {
    if (!canSeeModule(item.module)) return null;
    const path = getPath(item.path);
    const comparablePath = path.split('?')[0];
    const active = item.active
      ? item.active(location.pathname)
      : item.path.includes('?')
        ? `${location.pathname}${location.search}` === path
        : item.startsWith
          ? location.pathname.startsWith(comparablePath)
          : location.pathname === comparablePath;
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
            {whiteLabel?.logoUrl ? (
              <img src={whiteLabel.logoUrl} alt={whiteLabel?.name || "Logo"} className="logo-icon object-contain" />
            ) : (
              <div className="logo-icon">
                <Monitor size={20} />
              </div>
            )}
            <span className="logo-text">{whiteLabel?.name || "Nexus360"}</span>
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
                className="w-full flex items-center justify-center gap-2.5 p-3.5 bg-amber-50 text-amber-700 rounded-2xl text-[13px] font-bold border border-amber-100 hover:bg-amber-100 transition-all shadow-sm"
              >
                <Shield size={17} />
                {!collapsed && 'Voltar ao Modo Admin'}
              </button>
            </div>
          )}

          {user?.role === 'SUPER_ADMIN' && !selectedClientId ? (
            <SidebarGroup label="Menu Super Admin" collapsed={collapsed}>
              <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/admin" isActive={location.pathname === '/admin'} collapsed={collapsed} />
              <SidebarItem icon={Zap} label="Monitoramento" path="/admin/monitor" isActive={location.pathname === '/admin/monitor'} collapsed={collapsed} />
              <SidebarItem icon={Building2} label="Clientes" path="/admin/agencies" isActive={location.pathname === '/admin/agencies'} collapsed={collapsed} />
              <SidebarItem icon={Palette} label="White-label" path="/admin/whitelabel" isActive={location.pathname === '/admin/whitelabel'} collapsed={collapsed} />
              <SidebarItem icon={Users} label="Equipe Sistema" path="/admin/team" isActive={location.pathname === '/admin/team'} collapsed={collapsed} />
              <SidebarItem icon={Ticket} label="Planos SaaS" path="/admin/plans" isActive={location.pathname === '/admin/plans'} collapsed={collapsed} />
              <SidebarItem icon={FileText} label="Log de Auditoria" path="/admin/audit" isActive={location.pathname === '/admin/audit'} collapsed={collapsed} />
              <SidebarItem icon={CreditCard} label="Faturas SaaS" path="/admin/billing" isActive={location.pathname === '/admin/billing'} collapsed={collapsed} />
              <SidebarItem icon={Ticket} label="Chamados Globais" path="/admin/tickets" isActive={location.pathname === '/admin/tickets'} collapsed={collapsed} />
              <SidebarItem icon={Globe} label="Dominios" path="/admin/domains" isActive={location.pathname === '/admin/domains'} collapsed={collapsed} />
              <SidebarItem icon={Rocket} label="Controle de Lancamento" path="/admin/releases" isActive={location.pathname === '/admin/releases'} collapsed={collapsed} />
              <SidebarItem icon={Brain} label="Orquestrador ACP" path="/acp" isActive={location.pathname === '/acp'} collapsed={collapsed} badge="v2" />
              <SidebarItem icon={Cpu} label="AI Core" path="/admin/ai" isActive={location.pathname === '/admin/ai'} collapsed={collapsed} />
              <SidebarItem icon={Brain} label="ACP - Liberação" path="/admin/acp" isActive={location.pathname === '/admin/acp'} collapsed={collapsed} />
              <SidebarItem icon={MapPinned} label="Google Local" path="/admin/google-local" isActive={location.pathname === '/admin/google-local'} collapsed={collapsed} />
            </SidebarGroup>
          ) : (
            <>
              {menuGroups.map((group) => {
                if (!canSeeAny(group.modules)) return null;
                const groupHasActiveItem = group.items.some((item) => location.pathname.startsWith(getPath(item.path).split('?')[0]));
                const groupHasActiveChild = group.children?.some((child: any) =>
                  child.items.some((subItem: any) => location.pathname === getPath(subItem.path))
                );
                const visibleItemsCount = group.items.filter((item) => canSeeModule(item.module)).length +
                  (group.children || []).reduce((total: number, child: any) => (
                    canSeeModule(child.module) ? total + child.items.length : total
                  ), 0);
                return (
                  <SidebarGroup
                    key={group.label}
                    label={group.label}
                    icon={group.icon}
                    count={visibleItemsCount}
                    collapsed={collapsed}
                    collapsible
                    defaultOpen={group.label === 'Dashboard' || Boolean(groupHasActiveItem || groupHasActiveChild)}
                  >
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
              className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors text-[15px] font-semibold"
            >
              <LogOut size={17} />
              Sair do Sistema
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum, type UserRole } from '../types/auth.types';
import { ProfileManagementView } from './profile/ProfileManagementView';
import { RevisionRolesView } from './admin/RevisionRolesView';
import { Footer } from '../Footer';
import { RoleSwitcher } from './RoleSwitcher';
import NotificationBell from './notifications/NotificationBell';
import { isDashboardRole } from '../utils/roleRouting';
import {
  BarChart3,
  Bot,
  ChevronRight,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  User,
  Users,
  Wrench,
  X,
} from 'lucide-react';

interface RoleDrawerLayoutProps {
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR =
  'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

export const RoleDrawerLayout: React.FC<RoleDrawerLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, profile, logout, activeRole } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'revision_roles' | 'perfil'>('dashboard');
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const currentRole: UserRole =
    activeRole && isDashboardRole(activeRole)
      ? activeRole
      : (profile?.roles.find((role) => role.is_primary && isDashboardRole(role.code))?.code as UserRole ||
        'usuario');
  const roleMeta = ROLE_METADATA[currentRole] || ROLE_METADATA.usuario;
  const isAdminOrSuperAdmin =
    currentRole === UserRoleEnum.ADMIN || currentRole === UserRoleEnum.SUPER_ADMIN;

  useEffect(() => {
    if (!isDrawerOpen) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDrawerOpen(false);
    };

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('keydown', trapFocus);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('keydown', trapFocus);
    };
  }, [isDrawerOpen]);

  const handleSelectTab = (tab: 'dashboard' | 'revision_roles' | 'perfil') => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
  };

  const operationLinks = [
    ...(profile?.permissions.includes('*') || profile?.permissions.includes('content:moderate')
      ? [{ label: 'Moderación', route: '/moderador', icon: ShieldCheck }]
      : []),
    ...(profile?.permissions.includes('*') || profile?.permissions.includes('support:tickets_manage')
      ? [{ label: 'Soporte', route: '/soporte', icon: Headphones }]
      : []),
    ...(profile?.permissions.includes('*') || profile?.permissions.includes('bi:analytics_read')
      ? [{ label: 'Analítica', route: '/analista_datos', icon: BarChart3 }]
      : []),
    ...(currentRole === UserRoleEnum.SUPER_ADMIN
      ? [
          { label: 'Sistema', route: '/desarrollador', icon: Wrench },
          { label: 'Motor inteligente', route: '/servicios_ia', icon: Bot },
        ]
      : []),
  ];

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {isDrawerOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <aside
        ref={drawerRef}
        id="role-navigation-drawer"
        role="dialog"
        aria-hidden={!isDrawerOpen}
        aria-modal={isDrawerOpen}
        aria-label="Navegación principal"
        inert={!isDrawerOpen}
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col justify-between border-r border-[var(--border-medium)] bg-[var(--bg-secondary)] shadow-2xl transition-transform duration-300 ease-in-out sm:w-80 ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6 p-5">
          <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="my-0 text-sm font-bold leading-tight text-[var(--text-primary)]">
                  Turismo Cajamarca
                </h2>
                <p className="text-[10px] font-semibold text-[var(--text-muted)]">Trabajando como</p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Cerrar menú"
              className="cursor-pointer rounded-full p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
              onClick={() => setIsDrawerOpen(false)}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-2 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-base font-bold text-purple-400">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold ${roleMeta.badgeColor}`}>
                {roleMeta.label}
              </span>
            </div>
            <div>
              <h4 className="my-0 truncate text-xs font-bold text-[var(--text-primary)]">
                {profile?.full_name || 'Usuario'}
              </h4>
              <p className="truncate font-mono text-[11px] text-[var(--text-muted)]">{user?.email}</p>
            </div>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{roleMeta.description}</p>
            <RoleSwitcher />
            {(profile?.roles.filter((role) => role.is_active && !role.is_system).length || 0) > 1 && (
              <p className="text-[11px] text-[var(--text-muted)]">
                Cambiar de panel no elimina tus otros roles.
              </p>
            )}
          </div>

          <div className="space-y-1.5 pt-2">
            <button
              type="button"
              className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-xs font-bold transition ${
                activeTab === 'dashboard'
                  ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => handleSelectTab('dashboard')}
            >
              <span className="flex items-center gap-3">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard / Inicio
              </span>
              <ChevronRight className="h-4 w-4 opacity-70" aria-hidden="true" />
            </button>

            {isAdminOrSuperAdmin && (
              <button
                type="button"
                className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-xs font-bold transition ${
                  activeTab === 'revision_roles'
                    ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                }`}
                onClick={() => handleSelectTab('revision_roles')}
              >
                <span className="flex items-center gap-3">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Revisión de Roles
                </span>
                <ChevronRight className="h-4 w-4 opacity-70" aria-hidden="true" />
              </button>
            )}

            {isAdminOrSuperAdmin && (
              <div className="space-y-1.5 pt-3">
                <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Operación
                </p>
                {operationLinks.map(({ label, route, icon: Icon }) => (
                  <button
                    key={route}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      navigate(route);
                    }}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{label}</span>
                    <ChevronRight className="ml-auto h-4 w-4 opacity-70" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-xs font-bold transition ${
                activeTab === 'perfil'
                  ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => handleSelectTab('perfil')}
            >
              <span className="flex items-center gap-3">
                <User className="h-4 w-4" aria-hidden="true" />
                Mi Perfil &amp; Datos
              </span>
              <ChevronRight className="h-4 w-4 opacity-70" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="border-t border-[var(--border-light)] p-5">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 transition hover:bg-red-500/20"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-[var(--border-light)] bg-[var(--bg-secondary)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={isDrawerOpen}
              aria-controls="role-navigation-drawer"
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-2 text-[var(--text-primary)] shadow-sm transition hover:border-purple-400/40"
              onClick={() => setIsDrawerOpen(true)}
            >
              <Menu className="h-5 w-5 text-purple-400" aria-hidden="true" />
              <span className="hidden text-xs font-bold sm:inline">Menú</span>
            </button>
            <div>
              <h1 className="my-0 flex items-center gap-1.5 text-sm font-bold leading-tight text-[var(--text-primary)] sm:text-base">
                Turismo Cajamarca
                <span className="hidden text-xs font-normal text-[var(--text-muted)] md:inline">
                  •{' '}
                  {activeTab === 'dashboard'
                    ? 'Panel de Control'
                    : activeTab === 'revision_roles'
                      ? 'Revisión de Roles'
                      : 'Autogestión de Perfil'}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <NotificationBell />
            <span className={`hidden rounded-xl border px-2.5 py-1 text-[10px] font-bold sm:inline-block ${roleMeta.badgeColor}`}>
              {roleMeta.label}
            </span>
            <button
              type="button"
              title="Ir a Mi Perfil"
              className={`flex cursor-pointer items-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition ${
                activeTab === 'perfil'
                  ? 'border-purple-500 bg-purple-600 text-white'
                  : 'border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => handleSelectTab('perfil')}
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Mi Perfil</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {activeTab === 'dashboard' ? (
          children
        ) : activeTab === 'revision_roles' ? (
          <RevisionRolesView isSuperAdmin={currentRole === UserRoleEnum.SUPER_ADMIN} />
        ) : (
          <ProfileManagementView />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default RoleDrawerLayout;

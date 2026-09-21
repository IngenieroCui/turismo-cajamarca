import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import { getPlatformLogo } from '../../utils/getPlatformLogo';
import { APP_NAME, APP_VERSION } from '../../config/app';
import { RoleSwitcher } from '../RoleSwitcher';
import { usePlatformConfig } from '../../context/usePlatformConfig';
import {
  Bot,
  Calendar,
  ChevronRight,
  ClipboardList,
  Compass,
  Heart,
  Home,
  Hotel,
  LogOut,
  MapPin,
  PhoneCall,
  ShoppingBag,
  Sparkles,
  User,
  Utensils,
  X,
} from 'lucide-react';

interface TouristDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

const TOURIST_NAV_ITEMS = [
  {
    path: '/turista',
    label: 'Inicio & Explorar',
    icon: Home,
    description: 'Novedades y resumen de Cajamarca',
  },
  {
    path: '/turista/perfil',
    label: 'Mi Perfil',
    icon: User,
    description: 'Ver y editar mis datos personales',
  },
  {
    path: '/turista/reservas',
    label: 'Mis Reservas',
    icon: ClipboardList,
    description: 'Consulta y gestiona tus solicitudes',
  },
  {
    path: '/turista/favoritos',
    label: 'Favoritos',
    icon: Heart,
    description: 'Lugares y experiencias guardadas',
  },
  {
    path: '/turista/asistente',
    label: 'Asistente de viaje',
    icon: Bot,
    description: 'Recomendaciones e itinerarios personalizados',
  },
  {
    path: '/turista/atractivos',
    label: 'Atractivos & Rutas',
    icon: MapPin,
    description: 'Sitios turísticos, mapas y senderos',
  },
  {
    path: '/turista/alojamientos',
    label: 'Alojamientos & Hoteles',
    icon: Hotel,
    description: 'Hoteles, posadas y hospedajes',
  },
  {
    path: '/turista/gastronomia',
    label: 'Gastronomía & Platos',
    icon: Utensils,
    description: 'Restaurantes y comidas típicas',
  },
  {
    path: '/turista/tours',
    label: 'Tours & Guiado Oficial',
    icon: Compass,
    description: 'Agencias de viajes y guías',
  },
  {
    path: '/turista/eventos',
    label: 'Eventos & Festividades',
    icon: Calendar,
    description: 'Carnavales, ferias y cultura',
  },
  {
    path: '/turista/artesanias',
    label: 'Artesanías & Souvenirs',
    icon: ShoppingBag,
    description: 'Mercados artesanales y compras',
  },
  {
    path: '/turista/asistencia',
    label: 'Asistencia & Emergencias',
    icon: PhoneCall,
    description: 'Números de ayuda y policía turística',
  },
];

export const TouristDrawer: React.FC<TouristDrawerProps> = ({ isOpen, onClose }) => {
  const assistantEnabled = usePlatformConfig((state) => state.assistantEnabled);
  const navigate = useNavigate();
  const { user, profile, logout } = useAuthStore();
  const [logoPath] = useState(() => getPlatformLogo());
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
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
      if (event.key === 'Escape') onCloseRef.current();
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
  }, [isOpen]);

  const handleLogout = async () => {
    onCloseRef.current();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => onCloseRef.current()}
      />

      <aside
        ref={drawerRef}
        id="tourist-navigation-drawer"
        role="dialog"
        aria-hidden={!isOpen}
        aria-modal={isOpen}
        aria-label="Navegación principal"
        inert={!isOpen}
        className={`fixed left-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col justify-between border-r border-[var(--border-light)] bg-[var(--bg-secondary)] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-[var(--border-light)] bg-[var(--bg-primary)]/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-xl border border-[var(--border-light)] bg-transparent p-0.5">
                <img
                  src={logoPath}
                  alt="Turismo Cajamarca Logo"
                  className="h-full w-full object-contain"
                  onError={(event) => {
                    (event.target as HTMLImageElement).src = '/web/icon-192.png';
                  }}
                />
              </div>
              <div>
                <h2 className="my-0 text-sm font-bold leading-tight text-[var(--text-primary)]">
                  Turismo Cajamarca
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)]">Menú de Navegación</p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Cerrar menú"
              title="Cerrar menú"
              className="cursor-pointer rounded-xl bg-[var(--bg-hover)] p-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              onClick={() => onCloseRef.current()}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-primary-light)]/40 bg-[var(--color-primary)]/20 text-sm font-bold text-[var(--color-primary-light)]">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                {profile?.full_name || 'Turista Registrado'}
              </p>
              <p className="truncate text-[11px] text-[var(--text-secondary)]">
                {user?.email || 'turista@ejemplo.com'}
              </p>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary-light)]">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Turista
              </div>
            </div>
          </div>
          <div className="mt-3">
            <RoleSwitcher />
          </div>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto p-4">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Módulos del Turista
          </p>
          {TOURIST_NAV_ITEMS.filter(
            (item) => assistantEnabled || item.path !== '/turista/asistente',
          ).map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/turista'}
                className={({ isActive }) =>
                  `group flex cursor-pointer items-center justify-between rounded-2xl p-3 transition ${
                    isActive
                      ? 'border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/20 font-bold text-[var(--color-primary-light)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`
                }
                onClick={() => onCloseRef.current()}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <IconComponent className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="my-0 truncate text-xs font-semibold leading-tight">{item.label}</p>
                    <p className="truncate text-[10px] text-[var(--text-muted)]">{item.description}</p>
                  </div>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 opacity-40 transition group-hover:opacity-100"
                  aria-hidden="true"
                />
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-[var(--border-light)] bg-[var(--bg-primary)]/50 p-4">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Cerrar Sesión
          </button>
          <div className="text-center text-[10px] text-[var(--text-muted)]">
            <p>
              {APP_NAME} PWA • v{APP_VERSION}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

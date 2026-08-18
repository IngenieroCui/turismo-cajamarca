import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import { getPlatformLogo } from '../../utils/getPlatformLogo';
import {
  Home,
  User,
  MapPin,
  Hotel,
  Utensils,
  Compass,
  Calendar,
  ShoppingBag,
  PhoneCall,
  LogOut,
  X,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface TouristDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TOURIST_NAV_ITEMS = [
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
  const navigate = useNavigate();
  const { user, profile, logout } = useAuthStore();
  const [logoPath, setLogoPath] = useState('/web/icon-192.png');

  useEffect(() => {
    setLogoPath(getPlatformLogo());
  }, []);

  // Bloquear scroll de fondo cuando el drawer está abierto en móviles
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* MÁSCARA / BACKDROP OVERLAY */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* DRAWER SLIDE PANEL */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-80 max-w-[85vw] bg-[var(--bg-secondary)] border-r border-[var(--border-light)] shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* DRAWER HEADER */}
        <div className="p-5 border-b border-[var(--border-light)] bg-[var(--bg-primary)]/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-transparent border border-[var(--border-light)] p-0.5">
                <img
                  src={logoPath}
                  alt="Turismo Cajamarca Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/web/icon-192.png';
                  }}
                />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] my-0 leading-tight">
                  Turismo Cajamarca
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)]">Menú de Navegación</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* PERFIL RESUMIDO DEL TURISTA */}
          <div className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary-light)]/40 flex items-center justify-center text-[var(--color-primary-light)] font-bold text-sm shrink-0">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                {profile?.full_name || 'Turista Registrado'}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                {user?.email || 'turista@ejemplo.pe'}
              </p>
              <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[10px] font-semibold text-[var(--color-primary-light)]">
                <Sparkles className="w-3 h-3" /> Turista
              </div>
            </div>
          </div>
        </div>

        {/* DRAWER MENU ITEMS LIST */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-3 mb-2">
            Módulos del Turista
          </p>

          {TOURIST_NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/turista'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between p-3 rounded-2xl transition group cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 text-[var(--color-primary-light)] font-bold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconComponent className="w-5 h-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold my-0 leading-tight truncate">{item.label}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition shrink-0" />
              </NavLink>
            );
          })}
        </nav>

        {/* DRAWER FOOTER */}
        <div className="p-4 border-t border-[var(--border-light)] bg-[var(--bg-primary)]/50 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>

          <div className="text-center text-[10px] text-[var(--text-muted)]">
            <p>Turismo Cajamarca PWA • v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};

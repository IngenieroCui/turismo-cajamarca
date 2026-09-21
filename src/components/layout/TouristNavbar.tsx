import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import { getPlatformLogo } from '../../utils/getPlatformLogo';
import { LogOut, Menu, Sparkles, User } from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';

interface TouristNavbarProps {
  isDrawerOpen?: boolean;
  onOpenDrawer: () => void;
}

export const TouristNavbar: React.FC<TouristNavbarProps> = ({
  isDrawerOpen = false,
  onOpenDrawer,
}) => {
  const navigate = useNavigate();
  const { profile, logout } = useAuthStore();
  const [logoPath] = useState(() => getPlatformLogo());

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-light)] bg-[var(--bg-secondary)]/90 shadow-lg backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Abrir menú"
            aria-controls="tourist-navigation-drawer"
            aria-expanded={isDrawerOpen}
            className="flex cursor-pointer items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-2 text-[var(--text-primary)] transition hover:border-[var(--color-primary-light)]"
            onClick={onOpenDrawer}
            title="Abrir menú"
          >
            <Menu className="h-5 w-5 text-[var(--color-primary-light)]" aria-hidden="true" />
          </button>

          <Link to="/turista" className="group flex items-center gap-2.5">
            <div className="h-9 w-9 overflow-hidden rounded-xl border border-[var(--border-light)] bg-transparent p-0.5 transition group-hover:scale-105">
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
              <h1 className="my-0 text-base font-bold leading-tight tracking-tight text-[var(--text-primary)]">
                Turismo Cajamarca
              </h1>
              <p className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-primary-light)]">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Modo Turista
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link
            to="/turista/perfil"
            title="Ver Mi Perfil"
            className="flex items-center gap-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-1.5 text-[var(--text-primary)] transition hover:border-[var(--color-primary-light)]"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-xs font-bold text-[var(--color-primary-light)]">
              {profile?.full_name ? (
                profile.full_name.charAt(0).toUpperCase()
              ) : (
                <User className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </div>
            <span className="hidden max-w-[120px] truncate text-xs font-semibold sm:inline">
              {profile?.full_name || 'Mi Perfil'}
            </span>
          </Link>

          <button
            type="button"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="cursor-pointer rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};

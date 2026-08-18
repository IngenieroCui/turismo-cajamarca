import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import { getPlatformLogo } from '../../utils/getPlatformLogo';
import { Menu, User, LogOut, Sparkles } from 'lucide-react';

interface TouristNavbarProps {
  onOpenDrawer: () => void;
}

export const TouristNavbar: React.FC<TouristNavbarProps> = ({ onOpenDrawer }) => {
  const navigate = useNavigate();
  const { profile, logout } = useAuthStore();
  const [logoPath, setLogoPath] = useState('/web/icon-192.png');

  useEffect(() => {
    setLogoPath(getPlatformLogo());
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-secondary)]/90 backdrop-blur-md border-b border-[var(--border-light)] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* LADO IZQUIERDO: BOTÓN HAMBURGUESA + LOGO */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenDrawer}
            className="p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] hover:border-[var(--color-primary-light)] transition flex items-center justify-center cursor-pointer"
            aria-label="Abrir Menú de Navegación"
            title="Abrir Menú de Navegación"
          >
            <Menu className="w-5 h-5 text-[var(--color-primary-light)]" />
          </button>

          <Link to="/turista" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-transparent border border-[var(--border-light)] p-0.5 group-hover:scale-105 transition">
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
              <h1 className="text-base font-bold text-[var(--text-primary)] my-0 leading-tight tracking-tight">
                Turismo Cajamarca
              </h1>
              <p className="text-[10px] text-[var(--color-primary-light)] font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Modo Turista
              </p>
            </div>
          </Link>
        </div>

        {/* LADO DERECHO: BOTÓN MI PERFIL + CERRAR SESIÓN */}
        <div className="flex items-center gap-2">
          <Link
            to="/turista/perfil"
            className="px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] hover:border-[var(--color-primary-light)] text-[var(--text-primary)] transition flex items-center gap-2"
            title="Ver Mi Perfil"
          >
            <div className="w-6 h-6 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary-light)] flex items-center justify-center text-xs font-bold">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <span className="text-xs font-semibold hidden sm:inline truncate max-w-[120px]">
              {profile?.full_name || 'Mi Perfil'}
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { useAuthStore } from '../context/useAuthStore';
import { ROLE_METADATA, type UserRole } from '../types/auth.types';
import { ProfileManagementView } from './profile/ProfileManagementView';
import { Footer } from '../Footer';
import {
  Menu,
  X,
  LayoutDashboard,
  User,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface RoleDrawerLayoutProps {
  children: React.ReactNode;
}

export const RoleDrawerLayout: React.FC<RoleDrawerLayoutProps> = ({ children }) => {
  const { user, profile, logout } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'perfil'>('dashboard');

  const currentRole: UserRole = profile?.role || 'turista';
  const roleMeta = ROLE_METADATA[currentRole];

  const handleSelectTab = (tab: 'dashboard' | 'perfil') => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between relative overflow-x-hidden">
      {/* OVERLAY CUANDO EL DRAWER ESTÁ ABIERTO */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
        />
      )}

      {/* DRAWER / SIDEBAR LATERAL NAVEGACIÓN */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 sm:w-80 bg-[var(--bg-secondary)] border-r border-[var(--border-medium)] shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* TOP DRAWER HEADER */}
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] my-0 leading-tight">
                  Turismo Cajamarca
                </h2>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold">Navegación del Rol</p>
              </div>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CARD RESUMEN USUARIO EN DRAWER */}
          <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-base">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${roleMeta.badgeColor}`}>
                {roleMeta.label}
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] truncate my-0">
                {profile?.full_name || 'Usuario'}
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] truncate font-mono">{user?.email}</p>
            </div>
          </div>

          {/* MENÚ PESTAÑAS DEL DRAWER */}
          <div className="space-y-1.5 pt-2">
            <button
              onClick={() => handleSelectTab('dashboard')}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center justify-between border ${activeTab === 'dashboard'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/20'
                  : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard / Inicio</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>

            <button
              onClick={() => handleSelectTab('perfil')}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center justify-between border ${activeTab === 'perfil'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/20'
                  : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                }`}
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4" />
                <span>Mi Perfil & Datos</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>
          </div>
        </div>

        {/* FOOTER EN DRAWER */}
        <div className="p-5 border-t border-[var(--border-light)]">
          <button
            onClick={() => logout()}
            className="w-full px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* STICKY TOP HEADER CON BOTÓN DE DRAWER */}
      <header className="border-b border-[var(--border-light)] bg-[var(--bg-secondary)]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] hover:border-purple-400/40 text-[var(--text-primary)] transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Abrir menú lateral"
            >
              <Menu className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-bold hidden sm:inline">Menú</span>
            </button>

            <div>
              <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] my-0 leading-tight flex items-center gap-1.5">
                Turismo Cajamarca
                <span className="text-xs text-[var(--text-muted)] font-normal hidden md:inline">
                  • {activeTab === 'dashboard' ? 'Panel de Control' : 'Autogestión de Perfil'}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border hidden sm:inline-block ${roleMeta.badgeColor}`}>
              {roleMeta.label}
            </span>

            <button
              onClick={() => handleSelectTab('perfil')}
              className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'perfil'
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:text-[var(--text-primary)]'
                }`}
              title="Ir a Mi Perfil"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Mi Perfil</span>
            </button>
          </div>
        </div>
      </header>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'dashboard' ? children : <ProfileManagementView />}
      </main>

      <Footer />
    </div>
  );
};

export default RoleDrawerLayout;

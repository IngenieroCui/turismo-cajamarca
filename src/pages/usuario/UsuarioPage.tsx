import React from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { Footer } from '../../Footer';
import { User, LogOut, ShieldCheck, Compass } from 'lucide-react';

export const UsuarioPage: React.FC = () => {
  const { user, profile, logout } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.USUARIO];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg">
              <Compass className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 my-0 tracking-tight">Turismo Cajamarca</h1>
              <p className="text-xs text-slate-400">Portal de Usuario</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="p-6 rounded-3xl bg-slate-800/40 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-700/50 border border-slate-600 flex items-center justify-center text-teal-400">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-100">{profile?.full_name || user?.email}</h2>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
              {meta.label} ({meta.folderName})
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h3 className="text-sm font-semibold text-teal-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Descripción del Rol
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">{meta.description}</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UsuarioPage;

import React from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { Footer } from '../../Footer';
import { Code, LogOut, Terminal, GitBranch, Server } from 'lucide-react';

export const DesarrolladorPage: React.FC = () => {
  const { user, profile, logout } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.DESARROLLADOR];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-600/10 border border-slate-600/20 flex items-center justify-center text-slate-300">
              <Code className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 my-0 tracking-tight">Turismo Cajamarca</h1>
              <p className="text-xs text-slate-400">Portal Desarrollador / DevOps</p>
            </div>
          </div>
          <button onClick={() => logout()} className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="p-6 rounded-3xl bg-slate-800/40 border border-slate-700/60 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-200">{profile?.full_name || user?.email}</h2>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
              {meta.label} ({meta.folderName})
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{meta.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <Terminal className="w-5 h-5 text-slate-300" />
              <h4 className="text-xs font-bold text-slate-200">CLI & Deployments</h4>
              <p className="text-[11px] text-slate-400">CI/CD & Staging</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <GitBranch className="w-5 h-5 text-teal-400" />
              <h4 className="text-xs font-bold text-slate-200">Control de Versiones</h4>
              <p className="text-[11px] text-slate-400">Ramas & Releases</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <Server className="w-5 h-5 text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-200">Infraestructura PWA</h4>
              <p className="text-[11px] text-slate-400">Vite & Workbox SW</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DesarrolladorPage;

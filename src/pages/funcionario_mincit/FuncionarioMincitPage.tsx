import React from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { Footer } from '../../Footer';
import { Building, LogOut, CheckCircle2, FileText, Landmark } from 'lucide-react';

export const FuncionarioMincitPage: React.FC = () => {
  const { user, profile, logout } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.FUNCIONARIO_MINCIT];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 my-0 tracking-tight">Turismo Cajamarca</h1>
              <p className="text-xs text-slate-400">Funcionario MinCIT / FONTUR (Entidad Reguladora)</p>
            </div>
          </div>
          <button onClick={() => logout()} className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="p-6 rounded-3xl bg-slate-800/40 border border-yellow-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-yellow-200">{profile?.full_name || user?.email}</h2>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
              {meta.label} ({meta.folderName})
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{meta.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <CheckCircle2 className="w-5 h-5 text-yellow-400" />
              <h4 className="text-xs font-bold text-slate-200">Verificación RNT</h4>
              <p className="text-[11px] text-slate-400">Validación oficial</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <FileText className="w-5 h-5 text-teal-400" />
              <h4 className="text-xs font-bold text-slate-200">Reportes de Cumplimiento</h4>
              <p className="text-[11px] text-slate-400">Fiscalización estatal</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <Building className="w-5 h-5 text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-200">Supervisión por Sector</h4>
              <p className="text-[11px] text-slate-400">Datos agreagados / Habeas Data</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FuncionarioMincitPage;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/useAuthStore';
import { ShieldX, Home, UserCheck } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const { profile } = useAuthStore();
  const location = useLocation();
  const reason = (location.state as { reason?: string })?.reason;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-slate-800/50 border border-red-500/20 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
          <ShieldX className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-100">Acceso No Autorizado (403)</h2>
          <p className="text-xs text-slate-400">
            Tu rol actual <strong className="text-teal-400">{profile?.role || 'desconocido'}</strong> no posee permisos suficientes para ver este módulo.
          </p>
          {reason && (
            <p className="text-[11px] text-slate-500 italic bg-slate-900/60 py-1 px-3 rounded-lg inline-block">
              Restricción aplicada por: {reason === 'role' ? 'Rol insuficiente' : 'Permiso granular no otorgado'}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to="/dashboard"
            className="flex-1 py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" /> Ir a Mi Panel
          </Link>
          <Link
            to="/"
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;

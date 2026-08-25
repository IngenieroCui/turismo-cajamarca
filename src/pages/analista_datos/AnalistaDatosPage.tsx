import React from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import { BarChart3, TrendingUp, PieChart } from 'lucide-react';

export const AnalistaDatosPage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.ANALISTA_DATOS];

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-cyan-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-cyan-200 my-0">{profile?.full_name || user?.email}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{user?.email}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
              {meta.label}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{meta.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Métricas Turísticas</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Afluencia y ocupación</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Tendencias</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Análisis prospectivo</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <PieChart className="w-5 h-5 text-emerald-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Reportes Ejecutivos</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Exportación BI</p>
            </div>
          </div>
        </div>
      </div>
    </RoleDrawerLayout>
  );
};

export default AnalistaDatosPage;

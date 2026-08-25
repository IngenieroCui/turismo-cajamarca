import React from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import { Store, Calendar, Award } from 'lucide-react';

export const PrestadorTuristicoPage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.PRESTADOR_TURISTICO];

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] my-0">
                {profile?.full_name || user?.email}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{user?.email}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
              {meta.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20">
              <span className="text-xs text-teal-400 font-semibold">Sub-tipo de Servicio:</span>{' '}
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase">{profile?.sub_role || 'No asignado'}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20">
              <span className="text-xs text-teal-400 font-semibold">N° Registro RNT:</span>{' '}
              <span className="text-xs font-mono font-bold text-amber-400">{profile?.rnt_number || 'Pendiente'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] flex items-center gap-3">
              <Store className="w-6 h-6 text-emerald-400" />
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Catálogo de Servicios</h4>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Ofertas y experiencias</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] flex items-center gap-3">
              <Calendar className="w-6 h-6 text-teal-400" />
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Reservas Activas</h4>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Gestión de itinerarios</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] flex items-center gap-3">
              <Award className="w-6 h-6 text-amber-400" />
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Insignia RNT</h4>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Verificación Oficial</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleDrawerLayout>
  );
};

export default PrestadorTuristicoPage;

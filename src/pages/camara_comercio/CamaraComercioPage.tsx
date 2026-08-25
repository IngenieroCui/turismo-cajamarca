import React from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import { Building, Award, Users } from 'lucide-react';

export const CamaraComercioPage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.CAMARA_COMERCIO];

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-blue-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-blue-200 my-0">{profile?.full_name || user?.email}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{user?.email}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
              {meta.label}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{meta.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <Building className="w-5 h-5 text-blue-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Directorio Empresarial</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Empresas registradas</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <Award className="w-5 h-5 text-indigo-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Formalización</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Certificados y convenios</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <Users className="w-5 h-5 text-cyan-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Gremio Turístico</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Alianzas comerciales</p>
            </div>
          </div>
        </div>
      </div>
    </RoleDrawerLayout>
  );
};

export default CamaraComercioPage;

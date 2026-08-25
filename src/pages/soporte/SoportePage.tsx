import React from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import { LifeBuoy, MessageSquare, Headphones } from 'lucide-react';

export const SoportePage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.SOPORTE];

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-sky-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-sky-200 my-0">{profile?.full_name || user?.email}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{user?.email}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
              {meta.label}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{meta.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <LifeBuoy className="w-5 h-5 text-sky-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Tickets de Soporte</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Atención de reclamos</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <Headphones className="w-5 h-5 text-blue-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Chat en Vivo</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Asistencia al usuario</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <MessageSquare className="w-5 h-5 text-teal-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">F.A.Q. & Guías</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Base de conocimiento</p>
            </div>
          </div>
        </div>
      </div>
    </RoleDrawerLayout>
  );
};

export default SoportePage;

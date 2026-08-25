import React from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import { Code2, Terminal, Cpu } from 'lucide-react';

export const DesarrolladorPage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.DESARROLLADOR];

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-violet-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-violet-200 my-0">{profile?.full_name || user?.email}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{user?.email}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
              {meta.label}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{meta.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <Code2 className="w-5 h-5 text-violet-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">API & Webhooks</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Integraciones técnicas</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <Terminal className="w-5 h-5 text-purple-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Dev Console</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Entorno de Sandbox</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <Cpu className="w-5 h-5 text-pink-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Infraestructura</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Estado de microservicios</p>
            </div>
          </div>
        </div>
      </div>
    </RoleDrawerLayout>
  );
};

export default DesarrolladorPage;

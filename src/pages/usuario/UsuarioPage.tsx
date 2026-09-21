import React from 'react';
import { User, Mail } from 'lucide-react';
import { useAuthStore } from '../../context/useAuthStore';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import RoleWorkspaceHeader from '../../components/workspace/RoleWorkspaceHeader';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import { getRoleLabel } from '../../utils/roleRouting';

const UsuarioPage: React.FC = () => {
  const { profile, user } = useAuthStore();
  const roles = (profile?.roles || []).filter((role) => role.is_active && !role.is_system);
  const hasOperationalRole = roles.some((role) => role.code !== 'usuario');

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <RoleWorkspaceHeader
          eyebrow="Cuenta"
          title="Mi cuenta"
          description="Tu cuenta está activa. Un administrador puede asignarte roles adicionales según tu participación en la plataforma."
          roleLabel="Usuario"
          roleBadgeClass="border-slate-500/30 bg-slate-500/10 text-slate-200"
          icon={User}
        />

        <section className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5 shadow-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="my-0 text-base font-bold">Datos de la cuenta</h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Tu identidad y los roles que actualmente tiene asignados tu cuenta.</p>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Roles actuales">
              {roles.length ? roles.map((role) => (
                <StatusBadge key={role.id} label={`${getRoleLabel(role)}${role.is_primary ? ' · Principal' : ''}`} tone={role.is_primary ? 'success' : role.is_protected ? 'warning' : 'neutral'} />
              )) : <StatusBadge label="Sin roles activos" tone="danger" />}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Nombre</p>
              <p className="mt-1 text-sm font-semibold">{profile?.full_name || 'Sin nombre'}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"><Mail className="h-3 w-3" aria-hidden="true" /> Email</p>
              <p className="mt-1 break-all text-sm font-semibold">{user?.email || profile?.email || 'Sin correo'}</p>
            </div>
          </div>
        </section>

        {!hasOperationalRole && (
          <EmptyState
            title={roles.length ? 'Aún no tienes un rol operativo asignado.' : 'No tienes roles activos asignados.'}
            description={roles.length ? 'Cuando recibas un rol adicional podrás cambiar de panel desde el selector de roles.' : 'Contacta a un administrador de la plataforma.'}
          />
        )}
      </div>
    </RoleDrawerLayout>
  );
};

export default UsuarioPage;

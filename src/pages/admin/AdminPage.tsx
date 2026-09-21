import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, ShieldCheck, Tag, UserCog, Users } from 'lucide-react';
import { useAuthStore } from '../../context/useAuthStore';
import { getAllUsersProfiles, getTurismoRoles, type TurismoRoleItem, type UserProfileItem } from '../../services/rolesService';
import RoleDrawerLayout from '../../components/RoleDrawerLayout';
import UserRolesModal from '../../components/admin/UserRolesModal';
import RolePermissionsModal from '../../components/admin/RolePermissionsModal';
import RoleWorkspaceHeader from '../../components/workspace/RoleWorkspaceHeader';
import MetricCard from '../../components/workspace/MetricCard';

type FlashMessage = { type: 'success' | 'error'; text: string };
const rbacLoadMessage = 'No fue posible cargar la configuración RBAC. Verifica que la migración 08_refactor_rbac_multi_role.sql esté aplicada en Supabase.';

export const AdminPage: React.FC = () => {
  const { isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const [tab, setTab] = useState<'roles' | 'users'>('roles');
  const [roles, setRoles] = useState<TurismoRoleItem[]>([]);
  const [users, setUsers] = useState<UserProfileItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfileItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<TurismoRoleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<FlashMessage | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextRoles, nextUsers] = await Promise.all([getTurismoRoles(), getAllUsersProfiles()]);
      setRoles(nextRoles);
      setUsers(nextUsers);
    } catch (error: unknown) {
      setRoles([]);
      setUsers([]);
      setLoadError(error instanceof Error ? `${rbacLoadMessage} ${error.message}` : rbacLoadMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => load());
  // Initial load only.
  }, []);

  const visibleUsers = users.filter((user) => (
    (superAdmin || !user.roles.some((role) => role.is_protected))
    && `${user.email} ${user.full_name || ''} ${user.phone || ''} ${user.document_number || ''} ${user.roles.map((role) => role.name).join(' ')}`.toLowerCase().includes(search.toLowerCase())
  ));
  const visibleRoles = roles.filter((role) => `${role.name} ${role.code}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <RoleWorkspaceHeader eyebrow="Operación" title="Centro de administración" description="Gestiona usuarios, roles y accesos de la plataforma." roleLabel="Administrador" roleBadgeClass="border-purple-500/30 bg-purple-500/10 text-purple-200" icon={ShieldCheck} primaryAction={<button type="button" onClick={() => void load()} className="min-h-10 rounded-xl border border-[var(--border-light)] px-3 py-2 text-xs font-bold"><RefreshCw className={loading ? 'mr-1 inline h-4 w-4 animate-spin' : 'mr-1 inline h-4 w-4'} />Actualizar</button>} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MetricCard label="Usuarios visibles" value={visibleUsers.length} icon={UserCog} tone="text-purple-300" /><MetricCard label="Roles activos" value={roles.filter((role) => role.is_active).length} icon={ShieldCheck} tone="text-purple-300" /><MetricCard label="Usuarios activos" value={users.filter((user) => user.is_active).length} icon={UserCog} tone="text-emerald-300" /><MetricCard label="Roles protegidos" value={roles.filter((role) => role.is_protected).length} icon={ShieldCheck} tone="text-amber-300" /></div>

        {message && <p className={`p-3 rounded-xl border text-xs ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>{message.text}</p>}
        {loadError && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-200">{loadError}</div>}
        {loading && <p className="text-xs text-[var(--text-secondary)]">Cargando configuración RBAC...</p>}

        {!loading && !loadError && (
          <>
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex gap-2">
                <button onClick={() => setTab('roles')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${tab === 'roles' ? 'bg-purple-600 text-white' : 'bg-[var(--bg-secondary)]'}`}><Tag className="inline w-4 h-4 mr-1" />Roles</button>
                <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${tab === 'users' ? 'bg-purple-600 text-white' : 'bg-[var(--bg-secondary)]'}`}><Users className="inline w-4 h-4 mr-1" />Usuarios</button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar..." className="pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-xs" />
              </div>
            </div>

            {tab === 'roles' ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleRoles.map((role) => (
                  <article key={role.id} className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] space-y-4">
                    <div className="flex justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold ${role.badge_color}`}>{role.name}</span>
                      <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold ${role.is_active ? 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10' : 'text-slate-300 border-slate-500/20 bg-slate-500/10'}`}>{role.is_active ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <p className="font-mono text-xs text-[var(--text-secondary)]">{role.code}</p>
                    <p className="text-xs text-[var(--text-muted)]">{role.description}</p>
                    <button onClick={() => setSelectedRole(role)} className="w-full py-2 rounded-xl border border-purple-500/30 text-purple-300 text-xs font-bold cursor-pointer">Permisos</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead><tr className="border-b border-[var(--border-light)] text-[var(--text-muted)]"><th scope="col" className="p-4">Usuario</th><th scope="col" className="p-4">Roles asignados</th><th scope="col" className="p-4">Estado</th><th scope="col" className="p-4 text-right">Acción</th></tr></thead>
                  <tbody>{visibleUsers.map((user) => (
                    <tr key={user.id} className="border-b border-[var(--border-light)]">
                      <td className="p-4"><div className="font-bold">{user.full_name || 'Sin nombre'}</div><div className="text-[var(--text-muted)]">{user.email}</div></td>
                      <td className="p-4"><div className="flex flex-wrap gap-1">{user.roles.map((role) => <span key={role.id} className={`px-2 py-1 rounded-lg border text-[10px] ${role.badge_color}`}>{role.name}</span>)}</div></td>
                      <td className="p-4">{user.is_active ? 'Activa' : 'Inactiva'}</td>
                      <td className="p-4 text-right"><button onClick={() => setSelectedUser(user)} className="px-3 py-2 rounded-xl bg-purple-600 text-white font-bold text-[10px] cursor-pointer"><ShieldCheck className="inline w-3 h-3 mr-1" />Gestionar roles</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </>
        )}

        {selectedUser && <UserRolesModal user={selectedUser} availableRoles={roles} isSuperAdmin={superAdmin} onClose={() => setSelectedUser(null)} onSaved={() => void load()} />}
        {selectedRole && <RolePermissionsModal role={selectedRole} isSuperAdmin={superAdmin} onClose={() => setSelectedRole(null)} onSaved={() => setMessage({ type: 'success', text: 'Permisos guardados.' })} />}
      </div>
    </RoleDrawerLayout>
  );
};

export default AdminPage;

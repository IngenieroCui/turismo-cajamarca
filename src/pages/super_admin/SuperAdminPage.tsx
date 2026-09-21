import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw, Search, Tag, Users } from 'lucide-react';
import {
  createTurismoRole,
  getAllUsersProfiles,
  getTurismoRoles,
  toggleTurismoRoleStatus,
  type TurismoRoleItem,
  type UserProfileItem,
} from '../../services/rolesService';
import RoleDrawerLayout from '../../components/RoleDrawerLayout';
import UserRolesModal from '../../components/admin/UserRolesModal';
import RolePermissionsModal from '../../components/admin/RolePermissionsModal';
import PlatformSettingsPanel from '../../components/admin/PlatformSettingsPanel';
import PrivacyRequestsPanel from '../../components/admin/PrivacyRequestsPanel';
import ModalShell from '../../components/ui/ModalShell';
import RoleWorkspaceHeader from '../../components/workspace/RoleWorkspaceHeader';
import MetricCard from '../../components/workspace/MetricCard';

type FlashMessage = { type: 'success' | 'error'; text: string };
const rbacLoadMessage = 'No fue posible cargar la configuración RBAC. Verifica que la migración 08_refactor_rbac_multi_role.sql esté aplicada en Supabase.';

export const SuperAdminPage: React.FC = () => {
  const [tab, setTab] = useState<'roles' | 'users' | 'configuration' | 'privacy'>('roles');
  const [roles, setRoles] = useState<TurismoRoleItem[]>([]);
  const [users, setUsers] = useState<UserProfileItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfileItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<TurismoRoleItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '', badge_color: 'bg-slate-500/10 text-slate-300 border-slate-500/20', folder_name: 'custom' });
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

  const filteredRoles = roles.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(search.toLowerCase()));
  const filteredUsers = users.filter((item) => `${item.email} ${item.full_name || ''} ${item.phone || ''} ${item.document_number || ''} ${item.roles.map((role) => role.name).join(' ')}`.toLowerCase().includes(search.toLowerCase()));

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await createTurismoRole(form);
    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'No se pudo crear el rol.' });
      return;
    }
    setMessage({ type: 'success', text: 'Rol creado.' });
    setCreateOpen(false);
    setForm({ ...form, code: '', name: '', description: '' });
    await load();
  };

  const changeRoleStatus = async (role: TurismoRoleItem) => {
    const result = await toggleTurismoRoleStatus(role.code, !role.is_active);
    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'No se pudo actualizar el estado del rol.' });
      return;
    }
    setMessage({ type: 'success', text: 'Estado de rol actualizado.' });
    await load();
  };

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <RoleWorkspaceHeader eyebrow="Gobernanza" title="Centro de gobierno de la plataforma" description="Supervisa roles, usuarios, configuración, privacidad y salud operativa." roleLabel="Super Administrador" roleBadgeClass="border-red-500/30 bg-red-500/10 text-red-200" icon={Tag} primaryAction={<button type="button" onClick={() => void load()} className="min-h-10 rounded-xl border border-[var(--border-light)] px-3 py-2 text-xs font-bold"><RefreshCw className={loading ? 'mr-1 inline h-4 w-4 animate-spin' : 'mr-1 inline h-4 w-4'} />Actualizar</button>} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MetricCard label="Usuarios" value={users.length} icon={Users} tone="text-red-300" /><MetricCard label="Roles" value={roles.length} icon={Tag} tone="text-red-300" /><MetricCard label="Roles activos" value={roles.filter((role) => role.is_active).length} icon={Tag} tone="text-emerald-300" /><MetricCard label="Usuarios activos" value={users.filter((user) => user.is_active).length} icon={Users} tone="text-emerald-300" /></div>

        {message && <p className={`p-3 rounded-xl border text-xs ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>{message.text}</p>}
        {loadError && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-200">{loadError}</div>}
        {loading && <p className="text-xs text-[var(--text-secondary)]">Cargando configuración RBAC...</p>}

        {!loading && !loadError && (
          <>
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex gap-2">
                <button onClick={() => setTab('roles')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${tab === 'roles' ? 'bg-red-600 text-white' : 'bg-[var(--bg-secondary)]'}`}><Tag className="inline w-4 h-4 mr-1" />Roles</button>
                <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${tab === 'users' ? 'bg-red-600 text-white' : 'bg-[var(--bg-secondary)]'}`}><Users className="inline w-4 h-4 mr-1" />Usuarios</button>
                <button onClick={() => setTab('configuration')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${tab === 'configuration' ? 'bg-red-600 text-white' : 'bg-[var(--bg-secondary)]'}`}>Configuración</button>
                <button onClick={() => setTab('privacy')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${tab === 'privacy' ? 'bg-red-600 text-white' : 'bg-[var(--bg-secondary)]'}`}>Privacidad</button>
              </div>
              <div className="flex gap-2">
                <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar..." className="pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-xs" /></div>
                {tab === 'roles' && <button onClick={() => setCreateOpen(true)} className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer"><Plus className="inline w-4 h-4 mr-1" />Nuevo rol</button>}
              </div>
            </div>

            {tab === 'configuration' ? <PlatformSettingsPanel /> : tab === 'privacy' ? <PrivacyRequestsPanel /> : tab === 'roles' ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRoles.map((item) => (
                  <article key={item.id} className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] space-y-4">
                    <div className="flex justify-between gap-2"><span className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold ${item.badge_color}`}>{item.name}</span><button onClick={() => void changeRoleStatus(item)} className="text-[10px] text-amber-300 cursor-pointer">{item.is_active ? 'Activo' : 'Inactivo'}</button></div>
                    <p className="font-mono text-xs text-[var(--text-secondary)]">{item.code}</p><p className="text-xs text-[var(--text-muted)]">{item.description}</p>
                    <button onClick={() => setSelectedRole(item)} className="w-full py-2 rounded-xl border border-red-500/30 text-red-300 text-xs font-bold cursor-pointer">Permisos</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-x-auto">
                <table className="w-full text-left text-xs"><thead><tr className="border-b border-[var(--border-light)] text-[var(--text-muted)]"><th scope="col" className="p-4">Usuario</th><th scope="col" className="p-4">Roles asignados</th><th scope="col" className="p-4">Estado</th><th scope="col" className="p-4 text-right">Acción</th></tr></thead>
                  <tbody>{filteredUsers.map((item) => <tr key={item.id} className="border-b border-[var(--border-light)]"><td className="p-4"><div className="font-bold">{item.full_name || 'Sin nombre'}</div><div className="text-[var(--text-muted)]">{item.email}</div></td><td className="p-4"><div className="flex flex-wrap gap-1">{item.roles.slice(0, 3).map((assigned) => <span key={assigned.id} className={`px-2 py-1 rounded-lg border text-[10px] ${assigned.badge_color}`}>{assigned.name}{assigned.is_primary ? ' · Principal' : ''}</span>)}{item.roles.length > 3 && <span className="px-2 py-1 rounded-lg border border-slate-500/20 bg-slate-500/10 text-[10px] text-slate-300">+{item.roles.length - 3}</span>}</div></td><td className="p-4">{item.is_active ? 'Activa' : 'Inactiva'}</td><td className="p-4 text-right"><button onClick={() => setSelectedUser(item)} className="px-3 py-2 rounded-xl bg-red-600 text-white font-bold text-[10px] cursor-pointer">Gestionar roles</button></td></tr>)}</tbody>
                </table>
              </div>
            )}
          </>
        )}

        {selectedUser && <UserRolesModal user={selectedUser} availableRoles={roles} isSuperAdmin onClose={() => setSelectedUser(null)} onSaved={() => void load()} />}
        {selectedRole && <RolePermissionsModal role={selectedRole} isSuperAdmin onClose={() => setSelectedRole(null)} onSaved={() => setMessage({ type: 'success', text: 'Permisos guardados.' })} />}
        {createOpen && <ModalShell open title="Crear rol personalizado" onClose={() => setCreateOpen(false)}><form id="custom-role-form" onSubmit={(event) => void create(event)} className="space-y-4">{(['code', 'name', 'description', 'folder_name'] as const).map((key) => <label key={key} htmlFor={`custom-role-${key}`} className="block text-xs font-semibold capitalize">{key === 'folder_name' ? 'Carpeta' : key}<input id={`custom-role-${key}`} required={key === 'code' || key === 'name'} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2 text-xs" /></label>)}<button type="submit" className="w-full rounded-xl bg-red-600 py-2 text-xs font-bold text-white">Guardar rol</button></form></ModalShell>}
      </div>
    </RoleDrawerLayout>
  );
};

export default SuperAdminPage;

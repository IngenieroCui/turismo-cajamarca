import React, { useMemo, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import {
  assignUserRole,
  getAllUsersProfiles,
  revokeUserRole,
  setPrimaryUserRole,
  type TurismoRoleItem,
  type UserProfileItem,
} from '../../services/rolesService';
import { getRoleLabel } from '../../utils/roleRouting';
import ModalShell from '../ui/ModalShell';

interface Props {
  user: UserProfileItem;
  availableRoles: TurismoRoleItem[];
  isSuperAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const UserRolesModal: React.FC<Props> = ({ user, availableRoles, isSuperAdmin, onClose, onSaved }) => {
  const [currentUser, setCurrentUser] = useState<UserProfileItem | null>(user);
  const [selectedRole, setSelectedRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const assigned = useMemo(() => currentUser?.roles.filter((role) => role.is_active) || [], [currentUser]);
  const choices = useMemo(
    () => availableRoles.filter((role) => (
      role.is_active
      && !role.is_system
      && !assigned.some((current) => current.code === role.code)
      && (isSuperAdmin || !role.is_protected)
    )),
    [assigned, availableRoles, isSuperAdmin],
  );

  const refreshInsideModal = async () => {
    try {
      const users = await getAllUsersProfiles();
      const refreshed = users.find((item) => item.id === currentUser?.id);
      if (refreshed) {
        setCurrentUser(refreshed);
        return;
      }
      setCurrentUser(null);
      setError(isSuperAdmin
        ? 'No se encontró el usuario después de actualizar sus roles.'
        : 'No tienes autorización para consultar este usuario.');
    } catch (refreshError: unknown) {
      setCurrentUser(null);
      setError(refreshError instanceof Error ? refreshError.message : 'No se pudo actualizar el usuario.');
    }
  };

  const save = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    setSaving(true);
    setError('');
    try {
      const result = await action();
      if (!result.success) {
        setError(result.error || 'No se pudo guardar el cambio.');
        return;
      }
      onSaved();
      await refreshInsideModal();
      setSelectedRole('');
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'No se pudo guardar el cambio.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <ModalShell open title="Gestionar roles" onClose={onClose} maxWidth="max-w-lg">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--text-primary)] my-0">Gestionar roles</h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-primary)] cursor-pointer" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error || 'No se pudo cargar el usuario.'}</p>
          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-bold cursor-pointer">Cerrar</button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell open title="Gestionar roles" description={currentUser.full_name || currentUser.email} onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] my-0">Gestionar roles</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{currentUser.full_name || currentUser.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-primary)] cursor-pointer" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <p className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</p>}

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Roles asignados</p>
          {assigned.map((role) => (
            <div key={role.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)]">
              <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold ${role.badge_color}`}>{getRoleLabel(role)}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={saving || role.is_primary || (!isSuperAdmin && role.is_protected)}
                  onClick={() => void save(() => setPrimaryUserRole(currentUser.id, role.code))}
                  className="text-[10px] font-bold text-teal-300 disabled:opacity-40 cursor-pointer"
                >
                  {role.is_primary ? 'Principal' : 'Hacer principal'}
                </button>
                <button
                  disabled={saving || assigned.length <= 1 || (!isSuperAdmin && role.is_protected)}
                  onClick={() => void save(() => revokeUserRole(currentUser.id, role.code))}
                  className="text-[10px] font-bold text-red-300 disabled:opacity-40 cursor-pointer"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-xs">
            <option value="">Añadir rol...</option>
            {choices.map((role) => <option key={role.id} value={role.code}>{role.name}</option>)}
          </select>
          <button disabled={!selectedRole || saving} onClick={() => void save(() => assignUserRole(currentUser.id, selectedRole, assigned.length === 0))} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer">Asignar</button>
        </div>

        {assigned.some((role) => role.is_protected) && (
          <p className="text-[10px] text-amber-300 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Cuenta protegida por un rol administrativo.</p>
        )}
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-bold cursor-pointer">Cerrar</button>
        </div>
      </div>
    </ModalShell>
  );
};

export default UserRolesModal;

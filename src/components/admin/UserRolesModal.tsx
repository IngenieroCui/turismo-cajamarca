import React, { useEffect, useMemo, useState } from 'react';
import { Info, ShieldCheck } from 'lucide-react';
import {
  assignUserRole,
  getUserRoleAssignments,
  revokeUserRole,
  setPrimaryUserRole,
  type TurismoRoleItem,
  type UserProfileItem,
} from '../../services/rolesService';
import { getRoleRoute } from '../../utils/roleRouting';
import ModalShell from '../ui/ModalShell';
import StatusBadge from '../ui/StatusBadge';

interface Props {
  user: UserProfileItem;
  availableRoles: TurismoRoleItem[];
  isSuperAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type RoleSection = 'operativos' | 'protegidos' | 'sistema' | 'legados';

const sectionForRole = (role: TurismoRoleItem): RoleSection => {
  if (role.code === 'usuario') return 'legados';
  if (role.is_system) return 'sistema';
  if (role.is_protected) return 'protegidos';
  return 'operativos';
};

const sortRoles = (left: TurismoRoleItem, right: TurismoRoleItem) => left.name.localeCompare(right.name, 'es');

export const UserRolesModal: React.FC<Props> = ({ user, availableRoles, isSuperAdmin, onClose, onSaved }) => {
  const [currentUser, setCurrentUser] = useState<UserProfileItem>({ ...user, roles: user.roles || [] });
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refreshInsideModal = async () => {
    const roles = await getUserRoleAssignments(currentUser.id);
    setCurrentUser((previous) => ({ ...previous, roles }));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void getUserRoleAssignments(user.id)
        .then((roles) => setCurrentUser((previous) => ({ ...previous, roles })))
        .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los roles.'))
        .finally(() => setLoadingRoles(false));
    }, 0);
    // The modal represents one fixed user for its lifetime.
    return () => window.clearTimeout(timer);
  }, [user.id]);

  const assigned = currentUser.roles;
  const definitions = useMemo(() => {
    const merged = new Map<string, TurismoRoleItem>();
    availableRoles.forEach((role) => merged.set(role.code, role));
    assigned.forEach((role) => {
      if (!merged.has(role.code)) merged.set(role.code, role);
    });
    return Array.from(merged.values()).sort(sortRoles);
  }, [assigned, availableRoles]);

  const sections = useMemo(() => ({
    operativos: definitions.filter((role) => sectionForRole(role) === 'operativos'),
    protegidos: definitions.filter((role) => sectionForRole(role) === 'protegidos'),
    sistema: definitions.filter((role) => sectionForRole(role) === 'sistema'),
    legados: definitions.filter((role) => sectionForRole(role) === 'legados'),
  }), [definitions]);

  const assignedHumanRoles = assigned.filter((role) => !role.is_system);
  const activeHumanRoles = assigned.filter((role) => role.is_active && !role.is_system);
  const hasActiveSystemRole = assigned.some((role) => role.is_system);
  const hasActiveHumanRole = assignedHumanRoles.length > 0;
  const hasActiveProtectedHumanRole = assignedHumanRoles.some((role) => role.is_protected);
  const isMixedIdentity = hasActiveSystemRole && hasActiveHumanRole;
  const hasActiveDevOps = activeHumanRoles.some((role) => role.code === 'desarrollador');
  const hasActiveBusinessRole = activeHumanRoles.some((role) => role.code !== 'desarrollador');
  const hasActiveTurista = activeHumanRoles.some((role) => role.code === 'turista');
  const hasActiveGrowthRole = activeHumanRoles.some((role) => ['afiliado', 'embajador'].includes(role.code));
  const primaryCandidates = activeHumanRoles.filter((role) =>
    Boolean(getRoleRoute(role.code))
    && (!['afiliado', 'embajador'].includes(role.code) || hasActiveTurista),
  );

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
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'No se pudo guardar el cambio.');
    } finally {
      setSaving(false);
    }
  };

  const renderRole = (role: TurismoRoleItem) => {
    const roleAssignment = assigned.find((assignedRole) => assignedRole.code === role.code);
    const checked = Boolean(roleAssignment);
    const isLegacyRole = role.code === 'usuario';
    const isSystemRole = role.is_system;
    const inactive = !role.is_active;
    const protectedForAdmin = role.is_protected && !isSuperAdmin;
    const routeMessage = !getRoleRoute(role.code) && !role.is_system;
    const regulatoryConflict = (role.code === 'funcionario_mincit' && activeHumanRoles.some((assignedRole) => assignedRole.code === 'camara_comercio'))
      || (role.code === 'camara_comercio' && activeHumanRoles.some((assignedRole) => assignedRole.code === 'funcionario_mincit'));
    const systemRoleCannotBeAssigned = isSystemRole && !checked;
    const systemRoleCannotBeRemoved = isSystemRole && checked && !isSuperAdmin;
    const growthRoleRequiresTourist = ['afiliado', 'embajador'].includes(role.code) && !hasActiveTurista;
    const touristHasGrowthDependency = role.code === 'turista' && checked && hasActiveGrowthRole;
    const incompatibleDevOpsCheck = (role.code === 'desarrollador' && hasActiveBusinessRole)
      || (hasActiveDevOps && !isSystemRole && !isLegacyRole);
    const cannotCheck = !checked && (
      systemRoleCannotBeAssigned
      || protectedForAdmin
      || inactive
      || isLegacyRole
      || isMixedIdentity
      || hasActiveSystemRole
      || (!isSuperAdmin && hasActiveProtectedHumanRole)
      || incompatibleDevOpsCheck
      || regulatoryConflict
      || growthRoleRequiresTourist
    );
    const cannotUncheck = checked && (
      systemRoleCannotBeRemoved
      || protectedForAdmin
      || (!isSuperAdmin && hasActiveProtectedHumanRole)
      || touristHasGrowthDependency
    );
    const cannotAssign = cannotCheck || cannotUncheck;
    const disabled = saving || cannotAssign;
    const checkboxId = `user-role-${currentUser.id}-${role.id}`;

    return (
      <div key={role.id} className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-3">
        <div className="flex items-start gap-3">
          <input
            id={checkboxId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={() => void save(() => checked
              ? revokeUserRole(currentUser.id, role.code)
              : assignUserRole(currentUser.id, role.code, Boolean(getRoleRoute(role.code)) && primaryCandidates.length === 0))}
            className="mt-1 h-4 w-4 accent-purple-500"
          />
          <label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer">
            <span className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              <span>{role.name}</span>
              {roleAssignment?.is_primary && <StatusBadge label="Principal" tone="success" />}
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-[var(--text-secondary)]">{role.description || 'Sin descripción.'}</span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge label={role.is_active ? 'Activo' : 'Inactivo'} tone={role.is_active ? 'success' : 'neutral'} />
              {role.is_protected && <StatusBadge label="Protegido" tone="warning" />}
              {role.is_system && <StatusBadge label="Sistema" tone="purple" />}
              {isLegacyRole && <StatusBadge label="Legado" tone="neutral" />}
            </span>
          </label>
        </div>
        {protectedForAdmin && <p className="mt-2 flex items-center gap-1 text-[10px] text-amber-300"><ShieldCheck className="h-3 w-3" aria-hidden="true" />Solo un Super Administrador puede asignar este rol.</p>}
        {role.is_system && !checked && <p className="mt-2 text-[10px] text-purple-300">Los roles del sistema no se asignan a personas.</p>}
        {role.is_system && checked && <p className="mt-2 text-[10px] text-purple-300">Asignación de sistema heredada: solo Super Admin puede retirarla.</p>}
        {isLegacyRole && <p className="mt-2 text-[10px] text-slate-300">Rol histórico. Las nuevas cuentas utilizan Turista.</p>}
        {isLegacyRole && !checked && <p className="mt-2 text-[10px] text-[var(--text-muted)]">No admite nuevas asignaciones.</p>}
        {inactive && !checked && <p className="mt-2 text-[10px] text-[var(--text-muted)]">No se puede asignar mientras esté inactivo.</p>}
        {routeMessage && <p className="mt-2 flex items-center gap-1 text-[10px] text-[var(--text-muted)]"><Info className="h-3 w-3" aria-hidden="true" />Este rol no tiene un panel asociado y no puede ser el rol principal.</p>}
        {role.code === 'desarrollador' && <p className="mt-2 text-[10px] text-slate-300">DevOps debe mantenerse separado de los roles de negocio.</p>}
        {growthRoleRequiresTourist && !checked && <p className="mt-2 text-[10px] text-amber-200">Requiere el rol Turista.</p>}
        {touristHasGrowthDependency && <p className="mt-2 text-[10px] text-amber-200">Retira primero Afiliado/Embajador.</p>}
        {regulatoryConflict && <p className="mt-2 text-[10px] text-amber-300">Los roles MinCIT/FONTUR y Cámara de Comercio son mutuamente excluyentes.</p>}
      </div>
    );
  };

  return (
    <ModalShell
      open
      title={`Roles de ${currentUser.full_name || currentUser.email}`}
      description="Una cuenta puede tener varios roles. El rol principal determina el panel inicial; el usuario puede cambiar entre sus otros roles asignados."
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300" role="alert">{error}</p>}
        {loadingRoles ? <p className="text-xs text-[var(--text-secondary)]">Cargando roles asignados...</p> : (
          <>
            {isMixedIdentity && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-sm font-bold text-red-100">Esta cuenta combina roles humanos y de sistema. Corrige las asignaciones existentes antes de agregar nuevos roles.</p>}
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Rol principal</legend>
              <p className="text-[11px] text-[var(--text-secondary)]">El rol principal solo define el panel inicial; no elimina los demás roles.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {primaryCandidates.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-3 text-xs">
                    <input
                      type="radio"
                      name={`primary-role-${currentUser.id}`}
                      value={role.code}
                      checked={role.is_primary}
                      disabled={saving || hasActiveSystemRole || (!isSuperAdmin && hasActiveProtectedHumanRole) || (role.is_protected && !isSuperAdmin) || (['afiliado', 'embajador'].includes(role.code) && !hasActiveTurista)}
                      onChange={() => void save(() => setPrimaryUserRole(currentUser.id, role.code))}
                      className="accent-emerald-500"
                    />
                    <span>{role.name}</span>
                    {role.is_primary && <StatusBadge label="Principal" tone="success" />}
                  </label>
                ))}
              </div>
              {!primaryCandidates.length && <p className="text-xs text-[var(--text-muted)]">No hay roles humanos activos con panel asociado para seleccionar como principal.</p>}
            </fieldset>

            {([['operativos', 'Roles operativos'], ['protegidos', 'Roles protegidos · Solo Super Admin'], ['sistema', 'Roles del sistema · No asignables a personas'], ['legados', 'Roles legados']] as const).map(([key, title]) => (
              <section key={key} className="space-y-2">
                <h3 className="my-0 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</h3>
                <div className="grid gap-2 md:grid-cols-2">{sections[key].map(renderRole)}</div>
              </section>
            ))}

            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border-light)] px-4 py-2 text-xs font-bold">Cerrar</button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
};

export default UserRolesModal;

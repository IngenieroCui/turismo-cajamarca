import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  getPermissions,
  getRolePermissions,
  setRolePermissions,
  type PermissionItem,
  type TurismoRoleItem,
} from '../../services/rolesService';
import type { Permission } from '../../types/auth.types';
import ModalShell from '../ui/ModalShell';

const ADMIN_ASSIGNABLE_PERMISSIONS: Permission[] = [
  'platform:read',
  'content:moderate',
  'content:approve',
  'content:reject',
  'provider:catalog_manage',
  'provider:offers_manage',
  'provider:bookings_view',
  'provider:finances_view',
  'tourist:book',
  'tourist:review',
  'tourist:profile',
  'support:tickets_manage',
  'support:refund_issue',
  'bi:analytics_read',
  'bi:reports_export',
  'ambassador:referral_manage',
  'ambassador:commissions_view',
];

type FlashMessage = { type: 'success' | 'error'; text: string };

interface Props {
  role: TurismoRoleItem;
  isSuperAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const RolePermissionsModal: React.FC<Props> = ({ role, isSuperAdmin, onClose, onSaved }) => {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selected, setSelected] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<FlashMessage | null>(null);

  const isLegacyRole = role.code === 'usuario';
  const readOnly = isLegacyRole || role.is_system || role.code === 'super_admin' || (role.is_protected && !isSuperAdmin);
  const readOnlyDescription = isLegacyRole
    ? 'Usuario es un rol legado sin permisos operativos. No admite nuevas asignaciones.'
    : 'Rol protegido: permisos de solo lectura.';

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    setMessage(null);
    try {
      const [all, current] = await Promise.all([getPermissions(), getRolePermissions(role.code)]);
      setPermissions(all);
      setSelected(current.filter((permission) => permission !== '*'));
    } catch (error: unknown) {
      setPermissions([]);
      setSelected([]);
      setLoadError(error instanceof Error ? error.message : 'No fue posible cargar los permisos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => load());
  // load is intentionally scoped to the selected role.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.code]);

  const visiblePermissions = useMemo(
    () => permissions.filter((permission) => permission.code !== '*' && (isSuperAdmin || ADMIN_ASSIGNABLE_PERMISSIONS.includes(permission.code))),
    [isSuperAdmin, permissions],
  );
  const grouped = useMemo(
    () => visiblePermissions.reduce<Record<string, PermissionItem[]>>((groups, permission) => {
      (groups[permission.module] ||= []).push(permission);
      return groups;
    }, {}),
    [visiblePermissions],
  );

  const toggle = (code: Permission) => {
    if (readOnly || loadError || !ADMIN_ASSIGNABLE_PERMISSIONS.includes(code) && !isSuperAdmin) return;
    setSelected((current) => current.includes(code)
      ? current.filter((item) => item !== code)
      : [...current, code]);
  };

  const save = async () => {
    if (loading || loadError || readOnly) return;
    setSaving(true);
    setMessage(null);
    const result = await setRolePermissions(role.code, selected.filter((permission) => permission !== '*'));
    setSaving(false);
    if (result.success) {
      setMessage({ type: 'success', text: 'Permisos guardados.' });
      onSaved();
    } else {
      setMessage({ type: 'error', text: result.error || 'No se pudieron guardar los permisos.' });
    }
  };

  return (
    <ModalShell open title={`Permisos: ${role.name}`} description={readOnly ? readOnlyDescription : 'Define qué puede hacer cada rol dentro de la plataforma.'} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] my-0">Permisos: {role.name}</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {readOnly ? readOnlyDescription : 'Permisos heredados por las asignaciones de este rol.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-primary)] cursor-pointer" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && <p className="text-xs text-[var(--text-secondary)]">Cargando permisos...</p>}
        {!loading && loadError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-3">
            <p className="text-xs text-red-200">{loadError}</p>
            <div className="flex gap-2">
              <button onClick={() => void load()} className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer">Reintentar</button>
              <button onClick={onClose} className="px-3 py-2 rounded-xl border border-red-500/30 text-red-200 text-xs font-bold cursor-pointer">Cerrar</button>
            </div>
          </div>
        )}
        {!loading && !loadError && role.code === 'super_admin' && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-200 font-bold">* Acceso global — inmutable</div>
        )}
        {!loading && !loadError && role.code === 'usuario' && (
          <div className="rounded-2xl border border-slate-500/20 bg-slate-500/10 p-4 text-xs text-slate-200">
            Usuario es un rol legado sin permisos operativos. No admite nuevas asignaciones.
          </div>
        )}
        {!loading && !loadError && role.code !== 'super_admin' && !isLegacyRole && Object.entries(grouped).map(([module, items]) => (
          <section key={module} className="space-y-2">
            <h4 className="text-xs uppercase tracking-wider font-bold text-purple-300">{module}</h4>
            <div className="grid sm:grid-cols-2 gap-2">
              {items.map((permission) => (
                <label key={permission.code} className="flex items-start gap-2 p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-xs">
                  <input
                    type="checkbox"
                    checked={selected.includes(permission.code)}
                    disabled={readOnly}
                    onChange={() => toggle(permission.code)}
                    className="mt-0.5 accent-purple-500"
                  />
                  <span>
                    <span className="block font-semibold text-[var(--text-primary)]">{permission.name}</span>
                    <span className="block text-[10px] text-[var(--text-muted)]">{permission.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}

        {message && <p className={`text-xs ${message.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-bold cursor-pointer">Cerrar</button>
          {!readOnly && (
            <button disabled={saving || loading || Boolean(loadError)} onClick={() => void save()} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
              {saving ? 'Guardando...' : 'Guardar permisos'}
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

export default RolePermissionsModal;

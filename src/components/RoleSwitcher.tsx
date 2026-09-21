import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/useAuthStore';
import { getRoleLabel, getRoleRoute, isDashboardRole } from '../utils/roleRouting';
import type { UserRole } from '../types/auth.types';

export const RoleSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { profile, activeRole, setActiveRole } = useAuthStore();
  const roles = (profile?.roles || []).filter((role) => role.is_active && !role.is_system && isDashboardRole(role.code));
  if (roles.length < 2) return null;
  return <div className="space-y-1.5"><label htmlFor="role-panel-switcher" className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Cambiar panel</label>
    <select id="role-panel-switcher" aria-label="Cambiar panel" value={activeRole || roles[0].code} onChange={(event) => { const code = event.target.value; const route = getRoleRoute(code); setActiveRole(code as UserRole); if (route) navigate(route); }} className="w-full cursor-pointer rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-purple-400 focus:outline-none">
      {roles.map((role) => <option key={role.id} value={role.code}>{getRoleLabel(role)}</option>)}
    </select><p className="text-[11px] text-[var(--text-muted)]">Tienes {roles.length} roles activos</p>
  </div>;
};
export default RoleSwitcher;

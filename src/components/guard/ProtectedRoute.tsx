import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import type { UserRole, Permission } from '../../types/auth.types';
import PageLoader from '../PageLoader';
import { usePlatformConfig } from '../../context/usePlatformConfig';
import { ShieldAlert } from 'lucide-react';
import { ROLE_ROUTES, isDashboardRole } from '../../utils/roleRouting';

export interface ProtectedRouteProps { allowedRoles?: UserRole[]; requiredPermissions?: Permission[]; redirectTo?: string; unauthorizedRedirectTo?: string; allowEmptyHumanRoles?: boolean; children?: React.ReactNode; }

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, requiredPermissions, redirectTo = '/login', unauthorizedRedirectTo = '/unauthorized', allowEmptyHumanRoles = false, children }) => {
  const { session, user, profile, loading, initialized, activeRole, hasRole, hasPermission, logout } = useAuthStore();
  const setActiveRole = useAuthStore((state) => state.setActiveRole);
  const supportContactEmail = usePlatformConfig((state) => state.supportContactEmail);
  const location = useLocation();
  useEffect(() => {
    if (!profile) return;

    const routeRole = Object.entries(ROLE_ROUTES).find(([, route]) => route === location.pathname)?.[0];
    const directRole = routeRole && isDashboardRole(routeRole)
      ? profile.roles.find((role) => role.is_active && !role.is_system && role.code === routeRole)
      : undefined;
    if (directRole) {
      setActiveRole(directRole.code as UserRole);
      return;
    }

    const activeRoleIsOwned = activeRole && profile.roles.some(
      (role) => role.is_active && !role.is_system && isDashboardRole(role.code) && role.code === activeRole,
    );
    if (!activeRoleIsOwned && allowedRoles?.length) {
      const matchingRole = profile.roles.find(
        (role) => role.is_active && !role.is_system && allowedRoles.includes(role.code as UserRole),
      );
      if (matchingRole) setActiveRole(matchingRole.code as UserRole);
    }
  }, [activeRole, allowedRoles, location.pathname, profile, setActiveRole]);
  if (loading || !initialized) return <PageLoader />;
  if (!session || !user) return <Navigate to={redirectTo} state={{ from: location }} replace />;
  if (profile && !profile.is_active) return <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 p-4 text-slate-100"><div className="w-full max-w-md space-y-4 rounded-2xl border border-red-800/40 bg-red-950/40 p-8 text-center shadow-2xl"><ShieldAlert className="mx-auto h-12 w-12 text-red-400" /><h2 className="text-xl font-bold text-red-200">Cuenta inactiva o suspendida</h2><p className="text-sm text-slate-300">Tu cuenta ha sido desactivada temporalmente por administración. Contacta al canal de soporte.</p>{supportContactEmail && <p className="text-sm text-slate-300">Soporte: <a className="text-teal-300 underline" href={`mailto:${supportContactEmail}`}>{supportContactEmail}</a></p>}<button type="button" onClick={() => void logout()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">Cerrar sesión</button></div></div>;
  const hasNoActiveHumanRole = Boolean(profile && !profile.roles.some((role) => role.is_active && !role.is_system));
  if (allowedRoles?.length && !hasRole(allowedRoles) && !(allowEmptyHumanRoles && hasNoActiveHumanRole)) return <Navigate to={unauthorizedRedirectTo} state={{ from: location, reason: 'role' }} replace />;
  if (requiredPermissions?.length && !requiredPermissions.every((permission) => hasPermission(permission))) return <Navigate to={unauthorizedRedirectTo} state={{ from: location, reason: 'permission' }} replace />;
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;

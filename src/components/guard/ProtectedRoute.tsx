import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import type { UserRole, Permission } from '../../types/auth.types';
import { Loader2, ShieldAlert } from 'lucide-react';

export interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requiredPermissions?: Permission[];
  redirectTo?: string;
  unauthorizedRedirectTo?: string;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  requiredPermissions,
  redirectTo = '/login',
  unauthorizedRedirectTo = '/unauthorized',
  children,
}) => {
  const { session, user, profile, loading, initialized, hasRole, hasPermission } = useAuthStore();
  const location = useLocation();

  if (loading || !initialized) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-4">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-slate-800/50 backdrop-blur border border-slate-700/50 shadow-2xl">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-teal-500/20 border-t-teal-400 animate-spin" />
            <Loader2 className="w-8 h-8 text-teal-400 animate-pulse absolute" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-lg text-slate-200">Turismo Cajamarca</h3>
            <p className="text-xs text-slate-400">Verificando credenciales y permisos de acceso...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (profile && !profile.is_active) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-red-950/40 border border-red-800/40 shadow-2xl text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-red-200">Cuenta Inactiva o Suspendida</h2>
          <p className="text-sm text-slate-300">
            Tu cuenta de usuario ha sido desactivada temporalmente por administración. Por favor contacta al canal de soporte.
          </p>
        </div>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const isAuthorizedByRole = hasRole(allowedRoles);
    if (!isAuthorizedByRole) {
      return <Navigate to={unauthorizedRedirectTo} state={{ from: location, reason: 'role' }} replace />;
    }
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every((perm) => hasPermission(perm));
    if (!hasAllPermissions) {
      return <Navigate to={unauthorizedRedirectTo} state={{ from: location, reason: 'permission' }} replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;

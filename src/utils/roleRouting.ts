import { ROLE_METADATA, UserRoleEnum, type AssignedRole, type UserRole } from '../types/auth.types';

export const ROLE_ROUTES: Record<string, string> = {
  usuario: '/turista',
  turista: '/turista',
  prestador_turistico: '/prestador_turistico',
  admin: '/admin',
  super_admin: '/super_admin',
  moderador: '/moderador',
  auditor: '/auditor',
  soporte: '/soporte',
  analista_datos: '/analista_datos',
  desarrollador: '/desarrollador',
  embajador: '/embajador',
  afiliado: '/afiliado',
  funcionario_mincit: '/funcionario_mincit',
  camara_comercio: '/camara_comercio',
};

export const isDashboardRole = (code: string): code is UserRole =>
  Boolean(ROLE_ROUTES[code as UserRole])
  && code !== UserRoleEnum.SERVICIOS_IA;

export const getRoleRoute = (code: string): string | null =>
  isDashboardRole(code) ? ROLE_ROUTES[code] || '/turista' : null;

export const getDefaultRoleRoute = (roles?: AssignedRole[] | null): string => {
  const assigned = roles || [];
  const primary = assigned.find((role) => role.is_active && !role.is_system && role.is_primary && isDashboardRole(role.code));
  if (primary) {
    const route = getRoleRoute(primary.code);
    if (route) return route;
  }

  const firstKnown = assigned.find((role) => role.is_active && !role.is_system && isDashboardRole(role.code));
  if (firstKnown) {
    const route = getRoleRoute(firstKnown.code);
    if (route) return route;
  }

  // Fallback seguro: Todo usuario autenticado o registrado tiene acceso al panel de Turista por defecto
  return '/turista';
};

export const getRoleLabel = (role: AssignedRole): string =>
  ROLE_METADATA[role.code as UserRole]?.label || role.name;

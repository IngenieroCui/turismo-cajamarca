import { ROLE_METADATA, UserRoleEnum, type AssignedRole, type UserRole } from '../types/auth.types';

export const ROLE_ROUTES: Partial<Record<UserRole, string>> = {
  usuario: '/usuario',
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
  Boolean(ROLE_ROUTES[code as UserRole]) && code !== UserRoleEnum.SERVICIOS_IA;

export const getRoleRoute = (code: string): string | null =>
  isDashboardRole(code) ? ROLE_ROUTES[code] || null : null;

export const getDefaultRoleRoute = (roles?: AssignedRole[] | null): string => {
  const assigned = roles || [];
  const primary = assigned.find((role) => role.is_active && role.is_primary && isDashboardRole(role.code));
  if (primary) return getRoleRoute(primary.code) || '/turista';

  const firstKnown = assigned.find((role) => role.is_active && isDashboardRole(role.code));
  if (firstKnown) return getRoleRoute(firstKnown.code) || '/turista';

  return '/turista';
};

export const getRoleLabel = (role: AssignedRole): string =>
  ROLE_METADATA[role.code as UserRole]?.label || role.name;

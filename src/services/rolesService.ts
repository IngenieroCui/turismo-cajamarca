import { supabase } from '../lib/supabase/client';
import type { AssignedRole, Permission } from '../types/auth.types';

export interface TurismoRoleItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  badge_color: string;
  folder_name: string;
  is_active: boolean;
  is_protected: boolean;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PermissionItem {
  code: Permission;
  name: string;
  description: string | null;
  module: string;
}

export interface UserProfileItem {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  document_type?: string | null;
  document_number?: string | null;
  is_active: boolean;
  is_verified?: boolean;
  created_at: string;
  roles: AssignedRole[];
}

const databaseError = (operation: string, error: { message?: string } | null) =>
  new Error(`No fue posible ${operation}: ${error?.message || 'error desconocido de Supabase.'}`);

export const getTurismoRoles = async (): Promise<TurismoRoleItem[]> => {
  const { data, error } = await supabase.from('turismo_roles').select('*').order('name');
  if (error) throw databaseError('cargar los roles RBAC', error);
  if (!data) throw databaseError('cargar los roles RBAC', { message: 'Supabase no devolvió datos.' });
  return data as TurismoRoleItem[];
};

export const getPermissions = async (): Promise<PermissionItem[]> => {
  const { data, error } = await supabase.from('turismo_permissions').select('*').order('module').order('name');
  if (error) throw databaseError('cargar el catálogo de permisos', error);
  if (!data) throw databaseError('cargar el catálogo de permisos', { message: 'Supabase no devolvió datos.' });
  return data as PermissionItem[];
};

export const getRolePermissions = async (roleCode: string): Promise<Permission[]> => {
  const { data: role, error: roleError } = await supabase
    .from('turismo_roles')
    .select('id')
    .eq('code', roleCode)
    .single();
  if (roleError) throw databaseError(`cargar el rol ${roleCode}`, roleError);
  if (!role) throw new Error(`No se encontró el rol ${roleCode}.`);

  const { data, error } = await supabase
    .from('turismo_role_permissions')
    .select('permission_code')
    .eq('role_id', role.id);
  if (error) throw databaseError(`cargar los permisos del rol ${roleCode}`, error);
  if (!data) throw databaseError(`cargar los permisos del rol ${roleCode}`, { message: 'Supabase no devolvió datos.' });
  return data.map((row) => row.permission_code as Permission);
};

export const createTurismoRole = async (roleData: {
  code: string;
  name: string;
  description?: string;
  badge_color?: string;
  folder_name?: string;
}): Promise<{ success: boolean; data?: TurismoRoleItem; error?: string }> => {
  const { data, error } = await supabase.rpc('turismo_create_role', {
    p_code: roleData.code,
    p_name: roleData.name,
    p_description: roleData.description || null,
    p_badge_color: roleData.badge_color || null,
    p_folder_name: roleData.folder_name || null,
  });
  return error
    ? { success: false, error: error.message }
    : { success: true, data: data as TurismoRoleItem };
};

export const toggleTurismoRoleStatus = async (roleCode: string, isActive: boolean) => {
  const { error } = await supabase.rpc('turismo_set_role_status', {
    p_role_code: roleCode,
    p_is_active: isActive,
  });
  return error ? { success: false, error: error.message } : { success: true };
};

export const getAllUsersProfiles = async (): Promise<UserProfileItem[]> => {
  const { data: profiles, error: profileError } = await supabase
    .from('turismo_profiles')
    .select('id, email, full_name, phone, document_type, document_number, is_active, is_verified, created_at')
    .order('created_at', { ascending: false });
  if (profileError) throw databaseError('cargar los perfiles de usuarios', profileError);
  if (!profiles) throw databaseError('cargar los perfiles de usuarios', { message: 'Supabase no devolvió datos.' });

  const ids = profiles.map((profile) => profile.id);
  if (ids.length === 0) return [];

  const { data: assignments, error: assignmentError } = await supabase
    .from('turismo_user_roles')
    .select('user_id, role_id, is_active, is_primary')
    .in('user_id', ids)
    .eq('is_active', true);
  if (assignmentError) throw databaseError('cargar las asignaciones de roles', assignmentError);
  if (!assignments) throw databaseError('cargar las asignaciones de roles', { message: 'Supabase no devolvió datos.' });

  const roleIds = Array.from(new Set(assignments.map((row) => row.role_id)));
  if (roleIds.length === 0) return profiles.map((profile) => ({ ...profile, roles: [] }));

  const { data: roles, error: roleError } = await supabase
    .from('turismo_roles')
    .select('*')
    .in('id', roleIds)
    .eq('is_active', true);
  if (roleError) throw databaseError('cargar las definiciones activas de roles', roleError);
  if (!roles) throw databaseError('cargar las definiciones activas de roles', { message: 'Supabase no devolvió datos.' });

  const roleMap = new Map(roles.map((role) => [role.id, role as TurismoRoleItem]));
  return profiles.map((profile) => ({
    ...profile,
    roles: assignments
      .filter((assignment) => assignment.user_id === profile.id)
      .map((assignment) => {
        const role = roleMap.get(assignment.role_id);
        return role ? { ...role, is_primary: assignment.is_primary } : null;
      })
      .filter((role): role is AssignedRole => Boolean(role)),
  }));
};

export const getUserRoleAssignments = async (userId: string): Promise<AssignedRole[]> => {
  const { data: assignments, error: assignmentError } = await supabase
    .from('turismo_user_roles')
    .select('role_id, is_active, is_primary')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (assignmentError) throw databaseError('cargar las asignaciones del usuario', assignmentError);

  const roleIds = Array.from(new Set((assignments || []).map((assignment) => assignment.role_id)));
  if (!roleIds.length) return [];
  const { data: roles, error: roleError } = await supabase
    .from('turismo_roles')
    .select('*')
    .in('id', roleIds);
  if (roleError) throw databaseError('cargar las definiciones de roles del usuario', roleError);
  if (!roles) return [];

  const roleMap = new Map(roles.map((role) => [role.id, role as TurismoRoleItem]));
  return (assignments || [])
    .map((assignment) => {
      const role = roleMap.get(assignment.role_id);
      return role ? { ...role, is_primary: assignment.is_primary } : null;
    })
    .filter((role): role is AssignedRole => Boolean(role));
};

const rpcResult = async (name: string, args: Record<string, unknown>) => {
  const { error } = await supabase.rpc(name, args);
  return error ? { success: false, error: error.message } : { success: true };
};

export const assignUserRole = (userId: string, roleCode: string, makePrimary = false) =>
  rpcResult('turismo_assign_user_role', {
    p_user_id: userId,
    p_role_code: roleCode,
    p_make_primary: makePrimary,
  });

export const revokeUserRole = (userId: string, roleCode: string) =>
  rpcResult('turismo_revoke_user_role', { p_user_id: userId, p_role_code: roleCode });

export const setPrimaryUserRole = (userId: string, roleCode: string) =>
  rpcResult('turismo_set_primary_user_role', { p_user_id: userId, p_role_code: roleCode });

export const setRolePermissions = (roleCode: string, permissions: Permission[]) =>
  rpcResult('turismo_set_role_permissions', {
    p_role_code: roleCode,
    p_permission_codes: permissions,
  });

export const setUserStatus = (userId: string, isActive: boolean) =>
  rpcResult('turismo_set_user_status', { p_user_id: userId, p_is_active: isActive });

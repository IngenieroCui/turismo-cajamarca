import { supabase } from '../lib/supabase/client';
import { UserRoleEnum, type AssignedRole, type UserProfile, type UserRole } from '../types/auth.types';

interface BaseProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  tenant_id: string | null;
  document_type: UserProfile['document_type'];
  document_number: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export type RoleProfileDetails = BaseProfileRow &
  Partial<Omit<UserProfile, keyof BaseProfileRow | 'roles' | 'permissions'>> & {
    roles: AssignedRole[];
  };

const extensionTable = (role: UserRole): string | null => {
  if (role === UserRoleEnum.TURISTA) return 'turismo_tourist_profiles';
  if (role === UserRoleEnum.PRESTADOR_TURISTICO) return 'turismo_provider_profiles';
  if (role === UserRoleEnum.MODERADOR) return 'turismo_moderator_profiles';
  if (role === UserRoleEnum.AUDITOR) return 'turismo_auditor_profiles';
  if (role === UserRoleEnum.SOPORTE) return 'turismo_support_profiles';
  if (role === UserRoleEnum.ANALISTA_DATOS) return 'turismo_analyst_profiles';
  if (role === UserRoleEnum.DESARROLLADOR) return 'turismo_devops_profiles';
  if (role === UserRoleEnum.SERVICIOS_IA) return 'turismo_ai_service_profiles';
  if (role === UserRoleEnum.FUNCIONARIO_MINCIT || role === UserRoleEnum.CAMARA_COMERCIO) return 'turismo_regulatory_profiles';
  if (role === UserRoleEnum.EMBAJADOR || role === UserRoleEnum.AFILIADO) return 'turismo_affiliate_profiles';
  return null;
};

const serviceError = (operation: string, error: { message?: string } | null) =>
  new Error(`No fue posible ${operation}: ${error?.message || 'error desconocido de Supabase.'}`);

const getActiveRolesForUsers = async (userIds: string[]): Promise<Map<string, AssignedRole[]>> => {
  const result = new Map<string, AssignedRole[]>();
  if (!userIds.length) return result;

  const { data: assignments, error: assignmentError } = await supabase
    .from('turismo_user_roles')
    .select('user_id, role_id, is_primary')
    .in('user_id', userIds)
    .eq('is_active', true);
  if (assignmentError) throw serviceError('cargar las asignaciones activas', assignmentError);

  const roleIds = Array.from(new Set((assignments || []).map((assignment) => assignment.role_id)));
  if (!roleIds.length) return result;

  const { data: roles, error: roleError } = await supabase
    .from('turismo_roles')
    .select('*')
    .in('id', roleIds)
    .eq('is_active', true);
  if (roleError) throw serviceError('cargar las definiciones activas de roles', roleError);

  const roleMap = new Map((roles || []).map((role) => [role.id, role]));
  for (const assignment of assignments || []) {
    const role = roleMap.get(assignment.role_id);
    if (!role) continue;
    const current = result.get(assignment.user_id) || [];
    current.push({ ...role, is_primary: assignment.is_primary } as AssignedRole);
    result.set(assignment.user_id, current);
  }
  return result;
};

const mergeDetails = (
  baseProfile: BaseProfileRow,
  extension: Record<string, unknown> | null,
  roles: AssignedRole[],
): RoleProfileDetails => ({
  ...baseProfile,
  ...(extension || {}),
  ...(extension && 'sub_type' in extension ? { sub_role: extension.sub_type as UserProfile['sub_role'] } : {}),
  roles,
});

export const getUserFullRoleProfile = async (userId: string, role: UserRole): Promise<RoleProfileDetails | null> => {
  const { data: baseProfile, error: baseError } = await supabase
    .from('turismo_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (baseError) throw serviceError('cargar el perfil base', baseError);
  if (!baseProfile) return null;

  const table = extensionTable(role);
  const extension = table
    ? (await supabase.from(table).select('*').eq('profile_id', userId).maybeSingle())
    : { data: null, error: null };
  if (extension.error) throw serviceError('cargar los detalles del perfil', extension.error);

  const activeRoles = await getActiveRolesForUsers([userId]);
  return mergeDetails(baseProfile as BaseProfileRow, extension.data as Record<string, unknown> | null, activeRoles.get(userId) || []);
};

export const updateUserRoleProfile = async (
  userId: string,
  role: UserRole | null,
  baseFields: {
    full_name?: string | null;
    phone?: string | null;
    document_type?: 'DNI' | 'RUC' | 'PASAPORTE' | 'CE' | null;
    document_number?: string | null;
    sub_role?: string | null;
    org_role?: string | null;
    rnt_number?: string | null;
  },
  specificFields: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (userId !== (await supabase.auth.getUser()).data.user?.id) throw new Error('Solo puedes editar tu propio perfil.');
    const { error: baseError } = await supabase.rpc('turismo_update_own_profile', {
      p_full_name: baseFields.full_name ?? null,
      p_phone: baseFields.phone ?? null,
      p_document_type: baseFields.document_type ?? null,
      p_document_number: baseFields.document_number ?? null,
    });
    if (baseError) throw baseError;

    if (role === UserRoleEnum.TURISTA) {
      const touristFields = ['country_of_origin', 'nationality', 'preferred_language', 'emergency_contact_name', 'emergency_contact_phone'] as const;
      const payload = Object.fromEntries(touristFields.filter((key) => specificFields[key] !== undefined).map((key) => [key, specificFields[key]]));
      if (Object.keys(payload).length) {
        const { error } = await supabase.from('turismo_tourist_profiles').upsert([{ profile_id: userId, ...payload }], { onConflict: 'profile_id' });
        if (error) throw error;
      }
    } else if (role === UserRoleEnum.PRESTADOR_TURISTICO) {
      const { error } = await supabase.rpc('turismo_update_own_provider_profile', {
        p_ruc: String(specificFields.ruc || ''),
        p_razon_social: String(specificFields.razon_social || ''),
        p_nombre_comercial: (specificFields.nombre_comercial as string) || null,
        p_sub_type: (specificFields.sub_type || baseFields.sub_role) as string || null,
        p_org_role: (specificFields.org_role || baseFields.org_role) as string || null,
        p_rnt_number: (specificFields.rnt_number || baseFields.rnt_number) as string || null,
        p_address: (specificFields.address as string) || null,
        p_latitude: (specificFields.latitude as number) || null,
        p_longitude: (specificFields.longitude as number) || null,
        p_website_url: (specificFields.website_url as string) || null,
        p_social_links: specificFields.social_links || {},
        p_specific_metadata: specificFields.specific_metadata || {},
      });
      if (error) throw error;
    } else if (role === UserRoleEnum.EMBAJADOR || role === UserRoleEnum.AFILIADO) {
      const { error } = await supabase.rpc('turismo_update_own_affiliate_preferences', {
        p_payout_method: specificFields.payout_method as string || null,
        p_payout_account_info: specificFields.payout_account_info || null,
      });
      if (error) throw error;
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Error al actualizar perfil.' };
  }
};

export const getFullProfilesByRole = async (role: UserRole): Promise<RoleProfileDetails[]> => {
  const { data: roleRow, error: roleError } = await supabase
    .from('turismo_roles')
    .select('id, is_active')
    .eq('code', role)
    .single();
  if (roleError) throw serviceError('cargar el rol de revisión', roleError);
  if (!roleRow || !roleRow.is_active) return [];

  const { data: assignments, error: assignmentError } = await supabase
    .from('turismo_user_roles')
    .select('user_id')
    .eq('role_id', roleRow.id)
    .eq('is_active', true);
  if (assignmentError) throw serviceError('cargar los usuarios asignados al rol', assignmentError);
  const ids = (assignments || []).map((assignment) => assignment.user_id);
  if (!ids.length) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('turismo_profiles')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false });
  if (profileError) throw serviceError('cargar los perfiles de revisión', profileError);
  if (!profiles) return [];

  const table = extensionTable(role);
  const extensionResult = table
    ? await supabase.from(table).select('*').in('profile_id', ids)
    : { data: [], error: null };
  if (extensionResult.error) throw serviceError('cargar los detalles de revisión', extensionResult.error);
  const extensionMap = new Map((extensionResult.data || []).map((extension) => [extension.profile_id, extension as Record<string, unknown>]));
  const roleMap = await getActiveRolesForUsers(ids);

  return profiles.map((profile) => mergeDetails(
    profile as BaseProfileRow,
    extensionMap.get(profile.id) || null,
    roleMap.get(profile.id) || [],
  ));
};

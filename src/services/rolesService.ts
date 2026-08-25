import { supabase } from '../lib/supabase/client';
import { ROLE_METADATA, UserRoleEnum, type UserRole } from '../types/auth.types';

export interface TurismoRoleItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  badge_color: string;
  folder_name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileItem {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

/**
  Cargar todos los roles desde la tabla `turismo_roles` en Supabase.
  Si la tabla no ha sido creada aún en la BD, retorna los roles por defecto del sistema.
 */
export const getTurismoRoles = async (): Promise<TurismoRoleItem[]> => {
  try {
    const { data, error } = await supabase
      .from('turismo_roles')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('[rolesService]: Usando fallback de roles estáticos:', error?.message);
      return Object.values(UserRoleEnum).map((roleCode) => {
        const meta = ROLE_METADATA[roleCode as UserRole];
        return {
          id: roleCode,
          code: roleCode,
          name: meta.label,
          description: meta.description,
          badge_color: meta.badgeColor,
          folder_name: meta.folderName,
          is_active: true,
        };
      });
    }

    return data as TurismoRoleItem[];
  } catch (err) {
    console.error('[rolesService]: Error al obtener roles:', err);
    return Object.values(UserRoleEnum).map((roleCode) => {
      const meta = ROLE_METADATA[roleCode as UserRole];
      return {
        id: roleCode,
        code: roleCode,
        name: meta.label,
        description: meta.description,
        badge_color: meta.badgeColor,
        folder_name: meta.folderName,
        is_active: true,
      };
    });
  }
};

/**
  Crear un nuevo rol dinámico en la tabla `turismo_roles`.
 */
export const createTurismoRole = async (roleData: {
  code: string;
  name: string;
  description?: string;
  badge_color?: string;
  folder_name?: string;
}): Promise<{ success: boolean; data?: TurismoRoleItem; error?: string }> => {
  try {
    const cleanCode = roleData.code.trim().toLowerCase().replace(/\s+/g, '_');
    const { data, error } = await supabase
      .from('turismo_roles')
      .insert([
        {
          code: cleanCode,
          name: roleData.name,
          description: roleData.description || null,
          badge_color: roleData.badge_color || 'bg-slate-500/10 text-slate-300 border-slate-500/20',
          folder_name: roleData.folder_name || cleanCode,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as TurismoRoleItem };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al crear el rol.';
    return { success: false, error: message };
  }
};

/**
  Actualizar datos de un rol en la tabla `turismo_roles`.
 */
export const updateTurismoRole = async (
  id: string,
  updatedFields: Partial<Omit<TurismoRoleItem, 'id' | 'created_at'>>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('turismo_roles')
      .update({ ...updatedFields, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar el rol.';
    return { success: false, error: message };
  }
};

/**
  Cambiar el estado de activación de un rol (Activo / Inactivo).
 */
export const toggleTurismoRoleStatus = async (
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> => {
  return updateTurismoRole(id, { is_active: isActive });
};

/**
  Obtener la lista de todos los usuarios registrados en `turismo_profiles`.
 */
export const getAllUsersProfiles = async (): Promise<UserProfileItem[]> => {
  try {
    const { data, error } = await supabase
      .from('turismo_profiles')
      .select('id, email, full_name, phone, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as UserProfileItem[];
  } catch (err) {
    console.error('[rolesService]: Error al obtener usuarios:', err);
    return [];
  }
};

/**
  Actualizar el rol de un usuario en `turismo_profiles`.
 */
export const updateUserProfileRole = async (
  userId: string,
  newRoleCode: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('turismo_profiles')
      .update({ role: newRoleCode, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al asignar el rol al usuario.';
    return { success: false, error: message };
  }
};

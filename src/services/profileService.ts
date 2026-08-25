import { supabase } from '../lib/supabase/client';
import type { UserProfile, UserRole } from '../types/auth.types';
import { UserRoleEnum } from '../types/auth.types';

/**
 * Obtener el perfil completo del usuario, unificando `turismo_profiles` con su tabla secundaria.
 */
export const getUserFullRoleProfile = async (
  userId: string,
  role: UserRole
): Promise<UserProfile | null> => {
  try {
    // 1. Obtener perfil base
    const { data: baseProfile, error: baseError } = await supabase
      .from('turismo_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (baseError || !baseProfile) {
      console.warn('[profileService]: Error al obtener perfil base:', baseError?.message);
      return null;
    }

    let extraData: Record<string, unknown> = {};

    // 2. Obtener tabla específica de acuerdo al rol
    if (role === UserRoleEnum.TURISTA || role === UserRoleEnum.USUARIO) {
      const { data } = await supabase.from('turismo_tourist_profiles').select('*').eq('profile_id', userId).single();
      if (data) extraData = data;
    } else if (role === UserRoleEnum.PRESTADOR_TURISTICO) {
      const { data } = await supabase.from('turismo_provider_profiles').select('*').eq('profile_id', userId).single();
      if (data) extraData = data;
    } else if (role === UserRoleEnum.MODERADOR) {
      const { data } = await supabase.from('turismo_moderator_profiles').select('*').eq('profile_id', userId).single();
      if (data) extraData = data;
    } else if (role === UserRoleEnum.AUDITOR) {
      const { data } = await supabase.from('turismo_auditor_profiles').select('*').eq('profile_id', userId).single();
      if (data) extraData = data;
    } else if (role === UserRoleEnum.SOPORTE) {
      const { data } = await supabase.from('turismo_support_profiles').select('*').eq('profile_id', userId).single();
      if (data) extraData = data;
    } else if (role === UserRoleEnum.ANALISTA_DATOS) {
      const { data } = await supabase.from('turismo_analyst_profiles').select('*').eq('profile_id', userId).single();
      if (data) extraData = data;
    } else if (role === UserRoleEnum.DESARROLLADOR) {
      const { data } = await supabase.from('turismo_devops_profiles').select('*').eq('profile_id', userId).single();
      if (data) extraData = data;
    } else if (role === UserRoleEnum.SERVICIOS_IA) {
      const { data } = await supabase.from('turismo_ai_service_profiles').select('*').eq('profile_id', userId).single();
      if (data) extraData = data;
    } else if (role === UserRoleEnum.FUNCIONARIO_MINCIT || role === UserRoleEnum.CAMARA_COMERCIO) {
      const { data } = await supabase.from('turismo_regulatory_profiles').select('*').eq('profile_id', userId).single();
      if (data) extraData = data;
    } else if (role === UserRoleEnum.EMBAJADOR || role === UserRoleEnum.AFILIADO) {
      const { data } = await supabase.from('turismo_affiliate_profiles').select('*').eq('profile_id', userId).single();
      if (data) extraData = data;
    }

    return {
      ...baseProfile,
      ...extraData,
    } as UserProfile;
  } catch (err) {
    console.error('[profileService]: Error obteniendo perfil completo:', err);
    return null;
  }
};

/**
 * Actualizar los datos del perfil (los campos base + la tabla del rol específico).
 * NOTA DE SEGURIDAD: El correo electrónico (email) NUNCA se modifica en esta función.
 */
export const updateUserRoleProfile = async (
  userId: string,
  role: UserRole,
  baseFields: {
    full_name?: string | null;
    phone?: string | null;
    document_type?: 'DNI' | 'RUC' | 'PASAPORTE' | 'CE' | null;
    document_number?: string | null;
    sub_role?: string | null;
    org_role?: string | null;
    rnt_number?: string | null;
  },
  specificFields: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Actualizar campos base en `turismo_profiles` (excluye correo)
    const { error: baseErr } = await supabase
      .from('turismo_profiles')
      .update({
        full_name: baseFields.full_name,
        phone: baseFields.phone,
        document_type: baseFields.document_type,
        document_number: baseFields.document_number,
        sub_role: baseFields.sub_role,
        org_role: baseFields.org_role,
        rnt_number: baseFields.rnt_number,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (baseErr) throw baseErr;

    // 2. Upsert en la tabla del rol correspondiente si existen datos específicos
    if (Object.keys(specificFields).length > 0) {
      const payload = { profile_id: userId, ...specificFields, updated_at: new Date().toISOString() };

      if (role === UserRoleEnum.TURISTA || role === UserRoleEnum.USUARIO) {
        await supabase.from('turismo_tourist_profiles').upsert([payload], { onConflict: 'profile_id' });
      } else if (role === UserRoleEnum.PRESTADOR_TURISTICO) {
        await supabase.from('turismo_provider_profiles').upsert([payload], { onConflict: 'profile_id' });
      } else if (role === UserRoleEnum.MODERADOR) {
        await supabase.from('turismo_moderator_profiles').upsert([payload], { onConflict: 'profile_id' });
      } else if (role === UserRoleEnum.AUDITOR) {
        await supabase.from('turismo_auditor_profiles').upsert([payload], { onConflict: 'profile_id' });
      } else if (role === UserRoleEnum.SOPORTE) {
        await supabase.from('turismo_support_profiles').upsert([payload], { onConflict: 'profile_id' });
      } else if (role === UserRoleEnum.ANALISTA_DATOS) {
        await supabase.from('turismo_analyst_profiles').upsert([payload], { onConflict: 'profile_id' });
      } else if (role === UserRoleEnum.DESARROLLADOR) {
        await supabase.from('turismo_devops_profiles').upsert([payload], { onConflict: 'profile_id' });
      } else if (role === UserRoleEnum.SERVICIOS_IA) {
        await supabase.from('turismo_ai_service_profiles').upsert([payload], { onConflict: 'profile_id' });
      } else if (role === UserRoleEnum.FUNCIONARIO_MINCIT || role === UserRoleEnum.CAMARA_COMERCIO) {
        await supabase.from('turismo_regulatory_profiles').upsert([payload], { onConflict: 'profile_id' });
      } else if (role === UserRoleEnum.EMBAJADOR || role === UserRoleEnum.AFILIADO) {
        await supabase.from('turismo_affiliate_profiles').upsert([payload], { onConflict: 'profile_id' });
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar perfil.';
    console.error('[profileService]: Error en updateUserRoleProfile:', err);
    return { success: false, error: message };
  }
};

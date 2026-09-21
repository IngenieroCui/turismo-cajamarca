import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { UserRoleEnum, type AssignedRole, type LoginFormData, type Permission, type SignUpFormData, type UserProfile, type UserRole } from '../types/auth.types';
import { isDashboardRole } from '../utils/roleRouting';

interface AuthState {
  session: Session | null; user: User | null; profile: UserProfile | null;
  loading: boolean; initialized: boolean; error: string | null; activeRole: UserRole | null;
  setActiveRole: (role: UserRole) => void;
  loginWithEmail: (data: LoginFormData) => Promise<{ success: boolean; profile?: UserProfile | null; error?: string }>;
  signUp: (data: SignUpFormData) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }>;
  logout: () => Promise<void>; fetchProfile: (userId: string) => Promise<UserProfile | null>;
  updateProfile: (updatedData: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  listenToAuthChanges: () => () => void; clearError: () => void;
  hasRole: (allowedRoles: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: Permission) => boolean; isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null, user: null, profile: null, loading: true, initialized: false, error: null, activeRole: null,
  clearError: () => set({ error: null }),

  setActiveRole: (role) => {
    const profile = get().profile;
    if (profile?.roles.some((assigned) => assigned.code === role && assigned.is_active && isDashboardRole(role))) {
      set({ activeRole: role });
    }
  },

  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase.from('turismo_profiles').select('*').eq('id', userId).single();
      if (error || !data) return null;

      const { data: assignments } = await supabase.from('turismo_user_roles')
        .select('role_id, is_primary').eq('user_id', userId).eq('is_active', true);
      const roleIds = (assignments || []).map((assignment) => assignment.role_id);
      const { data: roleRows } = roleIds.length
        ? await supabase.from('turismo_roles').select('*').in('id', roleIds).eq('is_active', true)
        : { data: [] as Record<string, unknown>[] };
      const roleMap = new Map((roleRows || []).map((role) => [role.id, role]));
      const roles: AssignedRole[] = (assignments || []).map((assignment) => {
        const role = roleMap.get(assignment.role_id);
        return role ? { ...role, is_primary: assignment.is_primary } as AssignedRole : null;
      }).filter((role): role is AssignedRole => Boolean(role));

      const activeRoleIds = roles.map((role) => role.id);
      const { data: permissionRows } = activeRoleIds.length
        ? await supabase.from('turismo_role_permissions').select('permission_code').in('role_id', activeRoleIds)
        : { data: [] as { permission_code: string }[] };
      const permissions = Array.from(new Set((permissionRows || []).map((row) => row.permission_code as Permission)));

      let touristExtension: Record<string, unknown> = {};
      if (roles.some((role) => role.code === UserRoleEnum.TURISTA || role.code === UserRoleEnum.USUARIO)) {
        const { data: tourist } = await supabase.from('turismo_tourist_profiles').select('*').eq('profile_id', userId).maybeSingle();
        if (tourist) touristExtension = tourist;
      }

      const userProfile: UserProfile = { ...data, roles, permissions, ...touristExtension } as UserProfile;
      const previousActive = get().activeRole;
      const retained = roles.find((role) => role.code === previousActive && isDashboardRole(role.code));
      const primary = roles.find((role) => role.is_primary && isDashboardRole(role.code));
      const firstKnown = roles.find((role) => isDashboardRole(role.code));
      set({ profile: userProfile, activeRole: retained?.code as UserRole || primary?.code as UserRole || firstKnown?.code as UserRole || null });
      return userProfile;
    } catch (err) {
      console.error('[useAuthStore] Error loading profile:', err);
      return null;
    }
  },

  updateProfile: async (updatedData) => {
    const { user } = get();
    if (!user) return { success: false, error: 'No hay sesión de usuario activa.' };
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.rpc('turismo_update_own_profile', {
        p_full_name: updatedData.full_name ?? null, p_phone: updatedData.phone ?? null,
        p_document_type: updatedData.document_type ?? null, p_document_number: updatedData.document_number ?? null,
      });
      if (error) throw error;

      const touristFields = ['country_of_origin', 'nationality', 'preferred_language', 'emergency_contact_name', 'emergency_contact_phone'] as const;
      const touristPayload = Object.fromEntries(touristFields.filter((key) => updatedData[key] !== undefined).map((key) => [key, updatedData[key]]));
      if (Object.keys(touristPayload).length) {
        const { error: touristError } = await supabase.from('turismo_tourist_profiles').upsert([{ profile_id: user.id, ...touristPayload }], { onConflict: 'profile_id' });
        if (touristError) throw touristError;
      }
      await get().fetchProfile(user.id); set({ loading: false }); return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar perfil.';
      set({ loading: false, error: message }); return { success: false, error: message };
    }
  },

  loginWithEmail: async ({ email, password }) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { set({ loading: false, error: error.message }); return { success: false, error: error.message }; }
      let profile: UserProfile | null = null;
      if (data.user) { set({ session: data.session, user: data.user }); profile = await get().fetchProfile(data.user.id); }
      set({ loading: false }); return { success: true, profile };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado al iniciar sesión.';
      set({ loading: false, error: message });
      return { success: false, error: message };
    }
  },

  signUp: async ({ email, password, fullName, phone, documentType = 'DNI', documentNumber, countryOfOrigin = 'Colombia', nationality = 'Colombiana', preferredLanguage = 'es', emergencyContactName, emergencyContactPhone }) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: {
        full_name: fullName, phone: phone || null, document_type: documentType, document_number: documentNumber || null,
        country_of_origin: countryOfOrigin, nationality, preferred_language: preferredLanguage,
        emergency_contact_name: emergencyContactName || null, emergency_contact_phone: emergencyContactPhone || null,
      } } });
      if (error) { const message = error.message.includes('Database error saving new user') ? 'Debes ejecutar la migración RBAC en Supabase.' : error.message; set({ loading: false, error: message }); return { success: false, error: message }; }
      if (data.user && data.session) { set({ session: data.session, user: data.user }); await get().fetchProfile(data.user.id); }
      set({ loading: false }); return { success: true, requiresEmailConfirmation: Boolean(data.user && !data.session) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado durante el registro.';
      set({ loading: false, error: message });
      return { success: false, error: message };
    }
  },

  logout: async () => {
    set({ loading: true });
    try { await supabase.auth.signOut(); } catch { /* Clear local state even when the network is unavailable. */ }
    set({ session: null, user: null, profile: null, activeRole: null, loading: false, error: null });
  },

  listenToAuthChanges: () => {
    set({ loading: true });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { set({ session, user: session.user }); get().fetchProfile(session.user.id).finally(() => set({ loading: false, initialized: true })); }
      else set({ session: null, user: null, profile: null, activeRole: null, loading: false, initialized: true });
    }).catch((err: unknown) => {
      set({ session: null, user: null, profile: null, activeRole: null, loading: false, initialized: true, error: err instanceof Error ? err.message : 'No fue posible inicializar la sesión.' });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) { set({ session, user: session.user }); await get().fetchProfile(session.user.id); }
      else set({ session: null, user: null, profile: null, activeRole: null });
      set({ loading: false, initialized: true });
    });
    return () => subscription.unsubscribe();
  },

  hasRole: (allowedRoles) => {
    const profile = get().profile; if (!profile || !profile.is_active) return false;
    const requested = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return profile.roles.some((role) => role.is_active && (requested.includes(role.code as UserRole) || role.code === UserRoleEnum.SUPER_ADMIN));
  },
  hasPermission: (permission) => { const profile = get().profile; return Boolean(profile?.is_active && (profile.permissions.includes('*') || profile.permissions.includes(permission))); },
  isSuperAdmin: () => Boolean(get().profile?.is_active && get().profile?.roles.some((role) => role.code === UserRoleEnum.SUPER_ADMIN && role.is_active)),
}));

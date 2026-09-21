import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import {
  UserRoleEnum,
  type AssignedRole,
  type LoginFormData,
  type Permission,
  type SignUpFormData,
  type UserProfile,
  type UserRole,
} from '../types/auth.types';
import { getRoleRoute, isDashboardRole } from '../utils/roleRouting';

const ACTIVE_ROLE_STORAGE_KEY = 'turismo_active_role';

const isUsableDashboardRole = (role: AssignedRole): boolean =>
  role.is_active && !role.is_system && isDashboardRole(role.code);

const clearStoredActiveRole = () => {
  try {
    window.sessionStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
  } catch {
    // sessionStorage may be unavailable in privacy-restricted browsers.
  }
};

const persistActiveRole = (userId: string, role: string) => {
  try {
    window.sessionStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, JSON.stringify({ userId, role }));
  } catch {
    // The in-memory Zustand state remains the source for the current render.
  }
};

const readStoredActiveRole = (userId: string, roles: AssignedRole[]): UserRole | null => {
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_ROLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      clearStoredActiveRole();
      return null;
    }

    const stored = parsed as { userId?: unknown; role?: unknown };
    if (stored.userId !== userId || typeof stored.role !== 'string') {
      clearStoredActiveRole();
      return null;
    }

    const role = roles.find((assigned) => assigned.code === stored.role && isUsableDashboardRole(assigned));
    if (!role) {
      clearStoredActiveRole();
      return null;
    }
    return role.code as UserRole;
  } catch {
    clearStoredActiveRole();
    return null;
  }
};

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  activeRole: UserRole | null;
  setActiveRole: (role: UserRole) => void;
  loginWithEmail: (data: LoginFormData) => Promise<{ success: boolean; profile?: UserProfile | null; error?: string }>;
  signUp: (data: SignUpFormData) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }>;
  logout: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<UserProfile | null>;
  updateProfile: (updatedData: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  listenToAuthChanges: () => () => void;
  clearError: () => void;
  hasRole: (allowedRoles: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  error: null,
  activeRole: null,
  clearError: () => set({ error: null }),

  setActiveRole: (role) => {
    const { profile, user } = get();
    const assigned = profile?.roles.find((item) => item.code === role);
    if (!user || !assigned || !isUsableDashboardRole(assigned) || !getRoleRoute(role)) return;
    persistActiveRole(user.id, role);
    set({ activeRole: role });
  },

  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase.from('turismo_profiles').select('*').eq('id', userId).single();
      if (error || !data) return null;

      const { data: assignments, error: assignmentsError } = await supabase
        .from('turismo_user_roles')
        .select('role_id, is_primary')
        .eq('user_id', userId)
        .eq('is_active', true);
      if (assignmentsError) throw assignmentsError;

      const roleIds = (assignments || []).map((assignment) => assignment.role_id);
      const { data: roleRows, error: rolesError } = roleIds.length
        ? await supabase.from('turismo_roles').select('*').in('id', roleIds).eq('is_active', true)
        : { data: [], error: null };
      if (rolesError) throw rolesError;

      const roleMap = new Map((roleRows || []).map((role) => [role.id, role]));
      const roles: AssignedRole[] = (assignments || [])
        .map((assignment) => {
          const role = roleMap.get(assignment.role_id);
          return role ? ({ ...role, is_primary: assignment.is_primary } as AssignedRole) : null;
        })
        .filter((role): role is AssignedRole => Boolean(role));

      const activeRoleIds = roles.map((role) => role.id);
      const { data: permissionRows, error: permissionsError } = activeRoleIds.length
        ? await supabase.from('turismo_role_permissions').select('permission_code').in('role_id', activeRoleIds)
        : { data: [], error: null };
      if (permissionsError) throw permissionsError;
      const permissions = Array.from(new Set((permissionRows || []).map((row) => row.permission_code as Permission)));

      let touristExtension: Record<string, unknown> = {};
      if (roles.some((role) => role.code === UserRoleEnum.TURISTA)) {
        const { data: tourist, error: touristError } = await supabase
          .from('turismo_tourist_profiles')
          .select('*')
          .eq('profile_id', userId)
          .maybeSingle();
        if (touristError) throw touristError;
        if (tourist) touristExtension = tourist;
      }

      const userProfile: UserProfile = { ...data, roles, permissions, ...touristExtension } as UserProfile;
      const storedRole = readStoredActiveRole(userId, roles);
      const primary = roles.find((role) => isUsableDashboardRole(role) && role.is_primary);
      const firstKnown = roles.find(isUsableDashboardRole);
      const resolvedRole = storedRole || primary?.code || firstKnown?.code || null;
      if (resolvedRole) persistActiveRole(userId, resolvedRole);
      else clearStoredActiveRole();
      set({ profile: userProfile, activeRole: resolvedRole as UserRole | null });
      return userProfile;
    } catch (err) {
      console.error('[useAuthStore] Error loading profile:', err);
      return null;
    }
  },

  updateProfile: async (updatedData) => {
    const { user, profile } = get();
    if (!user) return { success: false, error: 'No hay sesión de usuario activa.' };
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.rpc('turismo_update_own_profile', {
        p_full_name: updatedData.full_name ?? null,
        p_phone: updatedData.phone ?? null,
        p_document_type: updatedData.document_type ?? null,
        p_document_number: updatedData.document_number ?? null,
      });
      if (error) throw error;

      const touristFields = ['country_of_origin', 'nationality', 'preferred_language', 'emergency_contact_name', 'emergency_contact_phone'] as const;
      const touristPayload = Object.fromEntries(
        touristFields.filter((key) => updatedData[key] !== undefined).map((key) => [key, updatedData[key]]),
      );
      if (profile?.roles.some((role) => role.code === UserRoleEnum.TURISTA) && Object.keys(touristPayload).length) {
        const { error: touristError } = await supabase
          .from('turismo_tourist_profiles')
          .upsert([{ profile_id: user.id, ...touristPayload }], { onConflict: 'profile_id' });
        if (touristError) throw touristError;
      }
      await get().fetchProfile(user.id);
      set({ loading: false });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar el perfil.';
      set({ loading: false, error: message });
      return { success: false, error: message };
    }
  },

  loginWithEmail: async ({ email, password }) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        set({ loading: false, error: error.message });
        return { success: false, error: error.message };
      }
      let profile: UserProfile | null = null;
      if (data.user) {
        const previousUser = get().user;
        if (previousUser && previousUser.id !== data.user.id) clearStoredActiveRole();
        set({ session: data.session, user: data.user, profile: null, activeRole: null });
        profile = await get().fetchProfile(data.user.id);
      }
      set({ loading: false });
      return { success: true, profile };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado al iniciar sesión.';
      set({ loading: false, error: message });
      return { success: false, error: message };
    }
  },

  signUp: async ({ email, password, fullName, phone, documentType = 'DNI', documentNumber }) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
            document_type: documentType,
            document_number: documentNumber || null,
          },
        },
      });
      if (error) {
        const message = error.message.includes('Database error saving new user')
          ? 'Debes ejecutar la migración RBAC en Supabase.'
          : error.message;
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
      if (data.user && data.session) {
        clearStoredActiveRole();
        set({ session: data.session, user: data.user, profile: null, activeRole: null });
        await get().fetchProfile(data.user.id);
      }
      set({ loading: false });
      return { success: true, requiresEmailConfirmation: Boolean(data.user && !data.session) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado durante el registro.';
      set({ loading: false, error: message });
      return { success: false, error: message };
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
    } catch {
      // Clear local state even when the network is unavailable.
    }
    clearStoredActiveRole();
    set({ session: null, user: null, profile: null, activeRole: null, loading: false, error: null });
  },

  listenToAuthChanges: () => {
    set({ loading: true });
    const resolveSession = async (session: Session | null) => {
      const previousUser = get().user;
      if (session?.user) {
        if (previousUser && previousUser.id !== session.user.id) clearStoredActiveRole();
        set({ session, user: session.user, profile: null, activeRole: null });
        await get().fetchProfile(session.user.id);
      } else {
        clearStoredActiveRole();
        set({ session: null, user: null, profile: null, activeRole: null });
      }
      set({ loading: false, initialized: true });
    };

    void supabase.auth.getSession()
      .then(({ data: { session } }) => resolveSession(session))
      .catch((err: unknown) => {
        clearStoredActiveRole();
        set({
          session: null,
          user: null,
          profile: null,
          activeRole: null,
          loading: false,
          initialized: true,
          error: err instanceof Error ? err.message : 'No fue posible inicializar la sesión.',
        });
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveSession(session);
    });
    return () => subscription.unsubscribe();
  },

  hasRole: (allowedRoles) => {
    const profile = get().profile;
    if (!profile || !profile.is_active) return false;
    const requested = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return profile.roles.some(
      (role) => role.is_active && (requested.includes(role.code as UserRole) || role.code === UserRoleEnum.SUPER_ADMIN),
    );
  },

  hasPermission: (permission) => {
    const profile = get().profile;
    return Boolean(profile?.is_active && (profile.permissions.includes('*') || profile.permissions.includes(permission)));
  },

  isSuperAdmin: () => Boolean(
    get().profile?.is_active && get().profile?.roles.some((role) => role.code === UserRoleEnum.SUPER_ADMIN && role.is_active),
  ),
}));

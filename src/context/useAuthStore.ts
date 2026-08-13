import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { UserRoleEnum } from '../types/auth.types';
import type {
  UserProfile,
  UserRole,
  Permission,
  LoginFormData,
  SignUpFormData,
} from '../types/auth.types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;

  loginWithEmail: (data: LoginFormData) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: SignUpFormData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<UserProfile | null>;
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

  clearError: () => set({ error: null }),

  fetchProfile: async (userId: string): Promise<UserProfile | null> => {
    try {
      // Consulta a la tabla con prefijo del proyecto: turismo_profiles
      const { data, error } = await supabase
        .from('turismo_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('[useAuthStore]: Error fetching user profile from turismo_profiles table:', error.message);
        return null;
      }

      if (data) {
        const userProfile: UserProfile = {
          id: data.id,
          email: data.email,
          full_name: data.full_name ?? null,
          avatar_url: data.avatar_url ?? null,
          phone: data.phone ?? null,
          role: (data.role as UserRole) || UserRoleEnum.USUARIO,
          sub_role: data.sub_role ?? null,
          org_role: data.org_role ?? null,
          tenant_id: data.tenant_id ?? null,
          permissions: (data.permissions as Permission[]) || [],
          rnt_number: data.rnt_number ?? null,
          document_type: data.document_type ?? null,
          document_number: data.document_number ?? null,
          is_active: data.is_active ?? true,
          is_verified: data.is_verified ?? false,
          created_at: data.created_at ?? new Date().toISOString(),
          updated_at: data.updated_at ?? new Date().toISOString(),
        };

        set({ profile: userProfile });
        return userProfile;
      }

      return null;
    } catch (err: unknown) {
      console.error('[useAuthStore]: Unexpected error loading profile:', err);
      return null;
    }
  },

  loginWithEmail: async ({ email, password }: LoginFormData) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ loading: false, error: error.message });
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        set({ session: data.session, user: data.user });
        await get().fetchProfile(data.user.id);
      }

      set({ loading: false });
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al iniciar sesión.';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  signUp: async ({ email, password, fullName, role = UserRoleEnum.USUARIO, subRole, rntNumber }: SignUpFormData) => {
    set({ loading: true, error: null });
    try {
      const assignedRole = role || UserRoleEnum.USUARIO;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: assignedRole,
            sub_role: subRole || null,
          },
        },
      });

      if (error) {
        set({ loading: false, error: error.message });
        return { success: false, error: error.message };
      }

      if (data.user) {
        const newProfile: Partial<UserProfile> = {
          id: data.user.id,
          email,
          full_name: fullName,
          role: assignedRole,
          sub_role: subRole || null,
          rnt_number: rntNumber || null,
          tenant_id: null,
          permissions: assignedRole === UserRoleEnum.SUPER_ADMIN ? ['*'] : [],
          is_active: true,
          is_verified: false,
        };

        // Insertar en la tabla con prefijo del proyecto: turismo_profiles
        const { error: profileError } = await supabase
          .from('turismo_profiles')
          .upsert([newProfile], { onConflict: 'id' });

        if (profileError) {
          console.warn('[useAuthStore]: Non-fatal profile creation warning:', profileError.message);
        }

        set({
          session: data.session,
          user: data.user,
          profile: newProfile as UserProfile,
        });
      }

      set({ loading: false });
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado durante el registro.';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[useAuthStore]: Error signing out:', err);
    } finally {
      set({
        session: null,
        user: null,
        profile: null,
        loading: false,
        error: null,
      });
    }
  },

  listenToAuthChanges: () => {
    set({ loading: true });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        set({ session, user: session.user });
        get().fetchProfile(session.user.id).finally(() => {
          set({ loading: false, initialized: true });
        });
      } else {
        set({ session: null, user: null, profile: null, loading: false, initialized: true });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          set({ session, user: session.user });
          await get().fetchProfile(session.user.id);
        } else {
          set({ session: null, user: null, profile: null });
        }
        set({ loading: false, initialized: true });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  },

  hasRole: (allowedRoles: UserRole | UserRole[]): boolean => {
    const { profile } = get();
    if (!profile || !profile.is_active) return false;

    if (profile.role === UserRoleEnum.SUPER_ADMIN) return true;

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return rolesArray.includes(profile.role);
  },

  hasPermission: (permission: Permission): boolean => {
    const { profile } = get();
    if (!profile || !profile.is_active) return false;

    if (profile.role === UserRoleEnum.SUPER_ADMIN || profile.permissions.includes('*')) {
      return true;
    }

    return profile.permissions.includes(permission);
  },

  isSuperAdmin: (): boolean => {
    const { profile } = get();
    return profile?.role === UserRoleEnum.SUPER_ADMIN;
  },
}));

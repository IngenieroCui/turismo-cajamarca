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

  clearError: () => set({ error: null }),

  fetchProfile: async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('turismo_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('[useAuthStore]: Warning fetching user profile from turismo_profiles table:', error.message);
        return null;
      }

      if (data) {
        let touristExtension = {};
        if (data.role === UserRoleEnum.TURISTA || data.role === UserRoleEnum.USUARIO) {
          const { data: tData } = await supabase
            .from('turismo_tourist_profiles')
            .select('*')
            .eq('profile_id', userId)
            .maybeSingle();

          if (tData) {
            touristExtension = {
              country_of_origin: tData.country_of_origin,
              nationality: tData.nationality,
              preferred_language: tData.preferred_language,
              emergency_contact_name: tData.emergency_contact_name,
              emergency_contact_phone: tData.emergency_contact_phone,
            };
          }
        }

        const userProfile: UserProfile = {
          id: data.id,
          email: data.email,
          full_name: data.full_name ?? null,
          avatar_url: data.avatar_url ?? null,
          phone: data.phone ?? null,
          role: (data.role as UserRole) || UserRoleEnum.TURISTA,
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
          ...touristExtension,
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

  updateProfile: async (updatedData: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    const { user } = get();
    if (!user) return { success: false, error: 'No hay sesión de usuario activa.' };

    set({ loading: true, error: null });
    try {
      const profilePayload: Record<string, unknown> = {};
      if (updatedData.full_name !== undefined) profilePayload.full_name = updatedData.full_name;
      if (updatedData.phone !== undefined) profilePayload.phone = updatedData.phone;
      if (updatedData.document_type !== undefined) profilePayload.document_type = updatedData.document_type;
      if (updatedData.document_number !== undefined) profilePayload.document_number = updatedData.document_number;

      if (Object.keys(profilePayload).length > 0) {
        const { error: pError } = await supabase
          .from('turismo_profiles')
          .update(profilePayload)
          .eq('id', user.id);

        if (pError) throw pError;
      }

      const touristPayload: Record<string, unknown> = {};
      if (updatedData.country_of_origin !== undefined) touristPayload.country_of_origin = updatedData.country_of_origin;
      if (updatedData.nationality !== undefined) touristPayload.nationality = updatedData.nationality;
      if (updatedData.preferred_language !== undefined) touristPayload.preferred_language = updatedData.preferred_language;
      if (updatedData.emergency_contact_name !== undefined) touristPayload.emergency_contact_name = updatedData.emergency_contact_name;
      if (updatedData.emergency_contact_phone !== undefined) touristPayload.emergency_contact_phone = updatedData.emergency_contact_phone;

      if (Object.keys(touristPayload).length > 0) {
        const { error: tError } = await supabase
          .from('turismo_tourist_profiles')
          .upsert([{ profile_id: user.id, ...touristPayload }], { onConflict: 'profile_id' });

        if (tError) throw tError;
      }

      await get().fetchProfile(user.id);
      set({ loading: false });
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar perfil.';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
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

  signUp: async ({
    email,
    password,
    fullName,
    phone,
    documentType = 'DNI',
    documentNumber,
    countryOfOrigin = 'Colombia',
    nationality = 'Colombiana',
    preferredLanguage = 'es',
    emergencyContactName,
    emergencyContactPhone,
    role = UserRoleEnum.TURISTA,
    subRole,
    rntNumber,
  }: SignUpFormData) => {
    set({ loading: true, error: null });
    try {
      const assignedRole = role || UserRoleEnum.TURISTA;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: assignedRole,
            phone: phone || null,
            document_type: documentType,
            document_number: documentNumber || null,
            country_of_origin: countryOfOrigin || 'Colombia',
            nationality: nationality || 'Colombiana',
            preferred_language: preferredLanguage || 'es',
            emergency_contact_name: emergencyContactName || null,
            emergency_contact_phone: emergencyContactPhone || null,
          },
        },
      });

      if (error) {
        let friendlyError = error.message;
        if (error.message.includes('Database error saving new user')) {
          friendlyError = 'Debes ejecutar el script SQL sql/00_master_schema_all_in_one.sql en tu proyecto de Supabase para crear las tablas con el prefijo turismo_.';
        }
        set({ loading: false, error: friendlyError });
        return { success: false, error: friendlyError };
      }

      if (data.user) {
        const newProfile: Partial<UserProfile> = {
          id: data.user.id,
          email,
          full_name: fullName,
          phone: phone || null,
          document_type: documentType,
          document_number: documentNumber || null,
          role: assignedRole,
          sub_role: subRole || null,
          rnt_number: rntNumber || null,
          tenant_id: null,
          permissions: assignedRole === UserRoleEnum.SUPER_ADMIN ? ['*'] : [],
          is_active: true,
          is_verified: true,
        };

        try {
          await supabase
            .from('turismo_profiles')
            .upsert([newProfile], { onConflict: 'id' });
        } catch (e) {
          console.warn('[useAuthStore]: Profile creation catch:', e);
        }

        if (assignedRole === UserRoleEnum.TURISTA || assignedRole === UserRoleEnum.USUARIO) {
          try {
            await supabase
              .from('turismo_tourist_profiles')
              .upsert([
                {
                  profile_id: data.user.id,
                  country_of_origin: countryOfOrigin || 'Colombia',
                  nationality: nationality || 'Colombiana',
                  preferred_language: preferredLanguage || 'es',
                  emergency_contact_name: emergencyContactName || null,
                  emergency_contact_phone: emergencyContactPhone || null,
                },
              ], { onConflict: 'profile_id' });
          } catch (e) {
            console.warn('[useAuthStore]: Tourist profile extension catch:', e);
          }
        }

        set({
          session: data.session,
          user: data.user,
          profile: {
            ...newProfile,
            country_of_origin: countryOfOrigin,
            nationality,
            preferred_language: preferredLanguage,
            emergency_contact_name: emergencyContactName,
            emergency_contact_phone: emergencyContactPhone,
          } as UserProfile,
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

import { create } from 'zustand';
import { getMyProviderContexts } from '../services/providerTeamService';
import { supabase } from '../lib/supabase/client';
import type { ProviderContext } from '../types/providerTeam.types';

interface ProviderContextState {
  contexts: ProviderContext[];
  activeProviderId: string | null;
  loading: boolean;
  initialized: boolean;
  loadedForUserId: string | null;
  load: (userId?: string) => Promise<void>;
  setActiveProviderId: (providerId: string) => void;
  reset: () => void;
}

const storageKey = 'turismo-active-provider-id';
const storedProviderId = (): string | null => {
  try { return sessionStorage.getItem(storageKey); } catch { return null; }
};

export const useProviderContext = create<ProviderContextState>((set, get) => ({
  contexts: [], activeProviderId: null, loading: false, initialized: false, loadedForUserId: null,
  load: async (userId) => {
    const resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id ?? null;
    if (!resolvedUserId) { get().reset(); return; }
    if (get().loadedForUserId && get().loadedForUserId !== resolvedUserId) get().reset();
    if (get().initialized && get().loadedForUserId === resolvedUserId) return;
    if (get().loading) return;
    set({ loading: true });
    try {
      const contexts = await getMyProviderContexts();
      const latestUserId = (await supabase.auth.getUser()).data.user?.id ?? null;
      if (latestUserId !== resolvedUserId) { set({ loading: false }); return; }
      const stored = storedProviderId();
      const selected = contexts.find((context) => context.providerId === stored) || contexts.find((context) => context.isOwner) || contexts[0] || null;
      if (selected) { try { sessionStorage.setItem(storageKey, selected.providerId); } catch { /* storage is optional */ } }
      set({ contexts, activeProviderId: selected?.providerId || null, loading: false, initialized: true, loadedForUserId: resolvedUserId });
    } catch {
      set({ contexts: [], activeProviderId: null, loading: false, initialized: true, loadedForUserId: resolvedUserId });
    }
  },
  setActiveProviderId: (providerId) => {
    if (!get().contexts.some((context) => context.providerId === providerId)) return;
    try { sessionStorage.setItem(storageKey, providerId); } catch { /* storage is optional */ }
    set({ activeProviderId: providerId });
  },
  reset: () => { try { sessionStorage.removeItem(storageKey); } catch { /* storage is optional */ } set({ contexts: [], activeProviderId: null, initialized: false, loadedForUserId: null }); },
}));

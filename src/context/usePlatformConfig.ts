import { create } from 'zustand';
import { getPublicPlatformSettings } from '../services/platformConfigService';
import type { PublicPlatformSettings } from '../types/platform.types';

interface PlatformConfigState extends PublicPlatformSettings {
  loading: boolean;
  initialized: boolean;
  error: string | null;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
}

const defaults: PublicPlatformSettings = {
  maintenanceMode: false,
  reservationsEnabled: true,
  reviewsEnabled: true,
  promotionsEnabled: true,
  referralsEnabled: true,
  assistantEnabled: true,
  supportEnabled: true,
  platformName: 'Turismo Cajamarca',
  supportContactEmail: '',
};

export const usePlatformConfig = create<PlatformConfigState>((set, get) => ({
  ...defaults,
  loading: false,
  initialized: false,
  error: null,
  load: async () => {
    if (get().loading || get().initialized) return;
    set({ loading: true, error: null });
    try {
      const settings = await getPublicPlatformSettings();
      set({ ...settings, loading: false, initialized: true });
    } catch (error: unknown) {
      set({ loading: false, initialized: true, error: error instanceof Error ? error.message : 'No fue posible cargar la configuración.' });
    }
  },
  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await getPublicPlatformSettings();
      set({ ...settings, loading: false, initialized: true });
    } catch (error: unknown) {
      set({ loading: false, initialized: true, error: error instanceof Error ? error.message : 'No fue posible cargar la configuración.' });
    }
  },
}));

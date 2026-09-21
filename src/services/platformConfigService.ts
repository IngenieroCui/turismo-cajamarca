import { supabase } from '../lib/supabase/client';
import type { PlatformSetting, PlatformSettingKey, PlatformSettingValue, PublicPlatformSettings } from '../types/platform.types';

type Row = Record<string, unknown>;

const asRow = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const asBoolean = (value: unknown, fallback = false): boolean => typeof value === 'boolean' ? value : fallback;
const asString = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const asValue = (value: unknown): PlatformSettingValue => typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string' ? value : '';

const settingFromRow = (value: unknown): PlatformSetting => {
  const row = asRow(value);
  return {
    key: String(row.key || '') as PlatformSettingKey,
    value: asValue(row.value),
    category: String(row.category || 'system') as PlatformSetting['category'],
    description: typeof row.description === 'string' ? row.description : null,
    isPublic: Boolean(row.is_public),
    updatedAt: String(row.updated_at || ''),
  };
};

const publicSettingsFromValue = (value: unknown): PublicPlatformSettings => {
  const row = asRow(value);
  return {
    maintenanceMode: asBoolean(row.maintenance_mode),
    reservationsEnabled: asBoolean(row.reservations_enabled, true),
    reviewsEnabled: asBoolean(row.reviews_enabled, true),
    promotionsEnabled: asBoolean(row.promotions_enabled, true),
    referralsEnabled: asBoolean(row.referrals_enabled, true),
    assistantEnabled: asBoolean(row.assistant_enabled, true),
    supportEnabled: asBoolean(row.support_enabled, true),
    platformName: asString(row.platform_name, 'Turismo Cajamarca'),
    supportContactEmail: asString(row.support_contact_email),
  };
};

export const getPublicPlatformSettings = async (): Promise<PublicPlatformSettings> => {
  const { data, error } = await supabase.rpc('turismo_get_public_settings');
  if (error) throw new Error(`No fue posible cargar la configuración pública: ${error.message}`);
  return publicSettingsFromValue(data);
};

export const getPlatformSettings = async (): Promise<PlatformSetting[]> => {
  const { data, error } = await supabase.rpc('turismo_get_platform_settings');
  if (error) throw new Error(`No fue posible cargar la configuración: ${error.message}`);
  return (Array.isArray(data) ? data : []).map(settingFromRow);
};

export const updatePlatformSetting = async (key: PlatformSettingKey, value: PlatformSettingValue): Promise<void> => {
  const { error } = await supabase.rpc('turismo_update_platform_setting', { p_key: key, p_value: value });
  if (error) throw new Error(`No fue posible actualizar la configuración: ${error.message}`);
};

export const isPublicFeatureEnabled = async (key: PlatformSettingKey): Promise<boolean> => {
  const settings = await getPublicPlatformSettings();
  const values: Partial<Record<PlatformSettingKey, PlatformSettingValue>> = {
    maintenance_mode: settings.maintenanceMode,
    reservations_enabled: settings.reservationsEnabled,
    reviews_enabled: settings.reviewsEnabled,
    promotions_enabled: settings.promotionsEnabled,
    referrals_enabled: settings.referralsEnabled,
    assistant_enabled: settings.assistantEnabled,
    support_enabled: settings.supportEnabled,
  };
  return values[key] === true;
};

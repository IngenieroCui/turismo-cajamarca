export type PlatformSettingCategory = 'system' | 'marketplace' | 'growth' | 'intelligence' | 'operations' | 'branding' | 'support';

export type PlatformSettingKey =
  | 'maintenance_mode'
  | 'reservations_enabled'
  | 'reviews_enabled'
  | 'promotions_enabled'
  | 'referrals_enabled'
  | 'assistant_enabled'
  | 'support_enabled'
  | 'default_affiliate_commission_rate'
  | 'platform_name'
  | 'support_contact_email';

export type PlatformSettingValue = boolean | number | string;

export interface PlatformSetting {
  key: PlatformSettingKey;
  value: PlatformSettingValue;
  category: PlatformSettingCategory;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
}

export interface PublicPlatformSettings {
  maintenanceMode: boolean;
  reservationsEnabled: boolean;
  reviewsEnabled: boolean;
  promotionsEnabled: boolean;
  referralsEnabled: boolean;
  assistantEnabled: boolean;
  supportEnabled: boolean;
  platformName: string;
  supportContactEmail: string;
}

import { supabase } from '../lib/supabase/client';
import type { AffiliateCommission, AffiliateDashboardData } from '../types/operations.types';

const STORAGE_KEY = 'turismo_cajamarca_referral';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
type StoredReferral = { code: string; expiresAt: number; visitorToken: string };
type Row = Record<string, unknown>;

const asRow = (value: unknown): Row => value && typeof value === 'object' ? value as Row : {};
const asNumber = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : Number(value || 0);

const readStoredReferral = (): StoredReferral | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as unknown;
    const row = asRow(value);
    if (typeof row.code !== 'string' || typeof row.visitorToken !== 'string' || typeof row.expiresAt !== 'number') return null;
    return { code: row.code, visitorToken: row.visitorToken, expiresAt: row.expiresAt };
  } catch {
    return null;
  }
};

export const clearExpiredReferral = (): void => {
  const stored = readStoredReferral();
  if (stored && stored.expiresAt <= Date.now()) window.localStorage.removeItem(STORAGE_KEY);
};

export const getActiveReferralCode = (): string | null => {
  clearExpiredReferral();
  return readStoredReferral()?.code || null;
};

export const captureReferralFromUrl = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  clearExpiredReferral();
  const code = new URLSearchParams(window.location.search).get('ref')?.trim();
  if (!code) return getActiveReferralCode();
  const existing = readStoredReferral();
  const visitorToken = existing?.visitorToken || globalThis.crypto.randomUUID();
  const { data, error } = await supabase.rpc('turismo_register_referral_visit', {
    p_referral_code: code,
    p_visitor_token: visitorToken,
    p_landing_path: `${window.location.pathname}${window.location.search}`,
  });
  if (error || data !== true) {
    if (existing?.code !== code) window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  const stored: StoredReferral = { code, visitorToken, expiresAt: Date.now() + TTL_MS };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  return code;
};

export const getAffiliateDashboard = async (): Promise<AffiliateDashboardData> => {
  const { data, error } = await supabase.rpc('turismo_get_affiliate_dashboard');
  if (error) throw new Error(`No fue posible cargar el panel de referidos: ${error.message}`);
  const row = asRow(data);
  const commissions = Array.isArray(row.recent_commissions) ? row.recent_commissions : [];
  return {
    referralCode: String(row.referral_code || ''),
    commissionRate: asNumber(row.commission_rate),
    totalEarnings: asNumber(row.total_earnings),
    uniqueVisits: asNumber(row.unique_visits),
    referredReservations: asNumber(row.referred_reservations),
    pendingCommission: asNumber(row.pending_commission),
    earnedCommission: asNumber(row.earned_commission),
    paidCommission: asNumber(row.paid_commission),
    payoutMethod: typeof row.payout_method === 'string' ? row.payout_method : null,
    recentCommissions: commissions.map((entry): AffiliateCommission => {
      const item = asRow(entry);
      return {
        reservationId: String(item.reservation_id || ''),
        catalogItemTitle: typeof item.catalog_item_title === 'string' ? item.catalog_item_title : null,
        status: item.status as AffiliateCommission['status'],
        baseAmount: asNumber(item.base_amount),
        commissionAmount: asNumber(item.commission_amount),
        createdAt: String(item.created_at || ''),
      };
    }),
  };
};

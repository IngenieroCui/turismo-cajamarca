import { supabase } from '../lib/supabase/client';
import type { Promotion, PromotionType } from '../types/tourism.types';
import { useProviderContext } from '../context/useProviderContext';

type DatabaseRow = Record<string, unknown>;

const serviceError = (operation: string, error: { message?: string } | null) =>
  new Error(`No fue posible ${operation}: ${error?.message || 'error desconocido de Supabase.'}`);

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
};

export const mapPromotion = (value: unknown): Promotion => {
  const row = (value || {}) as DatabaseRow;
  return {
    id: String(row.id || ''),
    providerId: String(row.provider_id || ''),
    itemId: String(row.item_id || ''),
    title: String(row.title || ''),
    description: typeof row.description === 'string' ? row.description : null,
    code: typeof row.code === 'string' ? row.code : null,
    promotionType: row.promotion_type as PromotionType,
    discountValue: asNumber(row.discount_value),
    startsAt: String(row.starts_at || ''),
    endsAt: String(row.ends_at || ''),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
};

export interface PromotionInput {
  itemId: string;
  title: string;
  description?: string | null;
  code?: string | null;
  promotionType: PromotionType;
  discountValue?: number | null;
  startsAt: string;
  endsAt: string;
}

const promotionArgs = (input: PromotionInput, providerId?: string | null) => ({
  p_item_id: input.itemId,
  p_title: input.title,
  p_description: input.description || null,
  p_code: input.code || null,
  p_promotion_type: input.promotionType,
  p_discount_value: input.discountValue ?? null,
  p_starts_at: input.startsAt,
  p_ends_at: input.endsAt,
  p_provider_id: providerId || useProviderContext.getState().activeProviderId || null,
});

export const getActivePromotionsForItem = async (itemId: string): Promise<Promotion[]> => {
  const { data, error } = await supabase.from('turismo_promotions').select('*').eq('item_id', itemId).eq('is_active', true).lte('starts_at', new Date().toISOString()).gte('ends_at', new Date().toISOString()).order('ends_at', { ascending: true });
  if (error) throw serviceError('cargar las promociones activas', error);
  return (data || []).map(mapPromotion);
};

export const getActivePromotionsForItems = async (itemIds: string[]): Promise<Map<string, Promotion[]>> => {
  const result = new Map<string, Promotion[]>();
  if (!itemIds.length) return result;
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('turismo_promotions').select('*').in('item_id', itemIds).eq('is_active', true).lte('starts_at', now).gte('ends_at', now).order('ends_at', { ascending: true });
  if (error) throw serviceError('cargar las promociones activas', error);
  for (const promotion of (data || []).map(mapPromotion)) result.set(promotion.itemId, [...(result.get(promotion.itemId) || []), promotion]);
  return result;
};

export const getProviderPromotions = async (providerId?: string): Promise<Promotion[]> => {
  const { data, error } = await supabase.from('turismo_promotions').select('*').eq('provider_id', providerId || useProviderContext.getState().activeProviderId || '').order('created_at', { ascending: false });
  if (error) throw serviceError('cargar las promociones del prestador', error);
  return (data || []).map(mapPromotion);
};

const rpcUuid = (data: unknown): string => typeof data === 'string' ? data : String((data as DatabaseRow | null)?.id || '');

export const createPromotion = async (input: PromotionInput, providerId?: string): Promise<string> => {
  const { data, error } = await supabase.rpc('turismo_create_promotion', promotionArgs(input, providerId));
  if (error) throw serviceError('crear la promoción', error);
  return rpcUuid(data);
};

export const updatePromotion = async (id: string, input: PromotionInput, providerId?: string): Promise<string> => {
  const { data, error } = await supabase.rpc('turismo_update_promotion', { p_promotion_id: id, ...promotionArgs(input, providerId) });
  if (error) throw serviceError('actualizar la promoción', error);
  return rpcUuid(data);
};

export const deactivatePromotion = async (id: string, providerId?: string): Promise<void> => {
  const { error } = await supabase.rpc('turismo_deactivate_promotion', { p_promotion_id: id, p_provider_id: providerId || useProviderContext.getState().activeProviderId || null });
  if (error) throw serviceError('desactivar la promoción', error);
};

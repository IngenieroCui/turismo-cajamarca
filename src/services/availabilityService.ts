import { supabase } from '../lib/supabase/client';
import type { CatalogAvailability } from '../types/tourism.types';
import { useProviderContext } from '../context/useProviderContext';

type DatabaseRow = Record<string, unknown>;

const serviceError = (operation: string, error: { message?: string } | null) =>
  new Error(`No fue posible ${operation}: ${error?.message || 'error desconocido de Supabase.'}`);

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
};

const mapAvailability = (value: unknown): CatalogAvailability => {
  const row = (value || {}) as DatabaseRow;
  return {
    itemId: String(row.item_id || ''),
    availableDate: String(row.available_date || ''),
    isAvailable: Boolean(row.is_available),
    capacity: asNumber(row.capacity),
    priceOverride: asNumber(row.price_override),
    notes: typeof row.notes === 'string' ? row.notes : null,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
};

export interface SetAvailabilityInput {
  itemId: string;
  startDate: string;
  endDate: string;
  isAvailable: boolean;
  capacity?: number | null;
  priceOverride?: number | null;
  notes?: string | null;
}

export const getCatalogAvailability = async (itemId: string, fromDate?: string, toDate?: string): Promise<CatalogAvailability[]> => {
  let query = supabase.from('turismo_catalog_availability').select('*').eq('item_id', itemId).order('available_date', { ascending: true });
  if (fromDate) query = query.gte('available_date', fromDate);
  if (toDate) query = query.lte('available_date', toDate);
  const { data, error } = await query;
  if (error) throw serviceError('cargar la disponibilidad', error);
  return (data || []).map(mapAvailability);
};

export const getProviderItemAvailability = async (itemId: string, providerId?: string): Promise<CatalogAvailability[]> => {
  const { data, error } = await supabase.from('turismo_catalog_availability').select('*, turismo_catalog_items!inner(provider_id)').eq('item_id', itemId).eq(providerId ? 'turismo_catalog_items.provider_id' : 'item_id', providerId || itemId).order('available_date', { ascending: true });
  if (error) throw serviceError('cargar la disponibilidad del prestador', error);
  return (data || []).map(mapAvailability);
};

export const setCatalogAvailability = async (input: SetAvailabilityInput, providerId?: string): Promise<number> => {
  const { data, error } = await supabase.rpc('turismo_set_catalog_availability', {
    p_item_id: input.itemId,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_is_available: input.isAvailable,
    p_capacity: input.capacity ?? null,
    p_price_override: input.priceOverride ?? null,
    p_notes: input.notes || null,
    p_provider_id: providerId || useProviderContext.getState().activeProviderId || null,
  });
  if (error) throw serviceError('guardar la disponibilidad', error);
  return typeof data === 'number' ? data : Number(data || 0);
};

export const clearCatalogAvailability = async (itemId: string, startDate: string, endDate: string, providerId?: string): Promise<number> => {
  const { data, error } = await supabase.rpc('turismo_clear_catalog_availability', { p_item_id: itemId, p_start_date: startDate, p_end_date: endDate, p_provider_id: providerId || useProviderContext.getState().activeProviderId || null });
  if (error) throw serviceError('limpiar la disponibilidad', error);
  return typeof data === 'number' ? data : Number(data || 0);
};

export const hasExplicitAvailability = async (itemId: string): Promise<boolean> => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('turismo_catalog_availability').select('available_date').eq('item_id', itemId).gte('available_date', today).limit(1);
  if (error) throw serviceError('consultar el calendario de disponibilidad', error);
  return Boolean(data?.length);
};

import { supabase } from '../lib/supabase/client';
import type { CatalogItemType, Reservation, ReservationStatus, Review, ReviewStatus } from '../types/tourism.types';
import { getActiveReferralCode } from './referralService';
import { useProviderContext } from '../context/useProviderContext';

type DatabaseRow = Record<string, unknown>;

const serviceError = (operation: string, error: { message?: string } | null) =>
  new Error(`No fue posible ${operation}: ${error?.message || 'error desconocido de Supabase.'}`);

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && Number.isFinite(Number(value))) return Number(value);
  return null;
};

const relationObject = (value: unknown): DatabaseRow | null => {
  if (Array.isArray(value)) return (value[0] || null) as DatabaseRow | null;
  return value && typeof value === 'object' ? value as DatabaseRow : null;
};

const mapReservation = (value: unknown): Reservation => {
  const row = (value || {}) as DatabaseRow;
  const item = relationObject(row.turismo_catalog_items);
  return {
    id: String(row.id),
    itemId: String(row.item_id),
    touristId: String(row.tourist_id),
    providerId: asString(row.provider_id),
    reservationDate: String(row.reservation_date || ''),
    endDate: asString(row.end_date),
    guests: asNumber(row.guests) || 1,
    notes: asString(row.notes),
    status: row.status as ReservationStatus,
    quotedAmount: asNumber(row.quoted_amount),
    currency: String(row.currency || 'COP'),
    providerResponse: asString(row.provider_response),
    promotionId: asString(row.promotion_id),
    promotionCode: asString(row.promotion_code),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
    item: item ? {
      id: String(item.id),
      title: String(item.title || 'Oferta turística'),
      coverImageUrl: asString(item.cover_image_url),
      itemType: item.item_type as CatalogItemType,
    } : null,
    touristName: asString(row.tourist_name),
  };
};

const mapReview = (value: unknown): Review => {
  const row = (value || {}) as DatabaseRow;
  const item = relationObject(row.turismo_catalog_items);
  const tourist = relationObject(row.turismo_profiles);
  return {
    id: String(row.id),
    itemId: String(row.item_id),
    touristId: String(row.tourist_id),
    reservationId: String(row.reservation_id),
    rating: asNumber(row.rating) || 0,
    comment: asString(row.comment),
    status: row.status as ReviewStatus,
    moderationReason: asString(row.moderation_reason),
    providerResponse: asString(row.provider_response),
    providerRespondedAt: asString(row.provider_responded_at),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
    itemTitle: asString(item?.title),
    touristName: asString(row.tourist_name) || asString(tourist?.full_name),
  };
};

const rpcUuid = (data: unknown): string => {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && 'id' in data) return String((data as DatabaseRow).id);
  throw new Error('Supabase no devolvió el identificador creado.');
};

const currentAuthUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('No hay una sesión activa.');
  return data.user.id;
};

export interface ReservationInput {
  itemId: string;
  reservationDate: string;
  endDate?: string | null;
  guests: number;
  notes?: string | null;
  promotionCode?: string | null;
}

export const getMyReservations = async (): Promise<Reservation[]> => {
  const userId = await currentAuthUserId();
  const { data, error } = await supabase.from('turismo_reservations')
    .select('*, turismo_catalog_items(id,title,cover_image_url,item_type)')
    .eq('tourist_id', userId)
    .order('reservation_date', { ascending: false });
  if (error) throw serviceError('cargar tus reservas', error);
  return (data || []).map(mapReservation);
};

export const getProviderReservations = async (providerId?: string): Promise<Reservation[]> => {
  const userId = providerId || useProviderContext.getState().activeProviderId || await currentAuthUserId();
  const { data, error } = await supabase.from('turismo_reservations')
    .select('*, turismo_catalog_items(id,title,cover_image_url,item_type)')
    .eq('provider_id', userId)
    .order('reservation_date', { ascending: true });
  if (error) throw serviceError('cargar las reservas del prestador', error);
  return (data || []).map(mapReservation);
};

export const createReservation = async (input: ReservationInput): Promise<string> => {
  const referralCode = getActiveReferralCode();
  const { data, error } = await supabase.rpc('turismo_create_reservation', {
    p_item_id: input.itemId,
    p_reservation_date: input.reservationDate,
    p_end_date: input.endDate || null,
    p_guests: input.guests,
    p_notes: input.notes || null,
    p_referral_code: referralCode,
    p_promotion_code: input.promotionCode || null,
  });
  if (error) throw serviceError('crear la reserva', error);
  return rpcUuid(data);
};

export const cancelReservation = async (id: string): Promise<void> => {
  const { error } = await supabase.rpc('turismo_cancel_reservation', { p_reservation_id: id });
  if (error) throw serviceError('cancelar la reserva', error);
};

export const providerUpdateReservation = async (
  id: string,
  action: 'confirm' | 'reject' | 'complete',
  quotedAmount?: number | null,
  response?: string | null,
  providerId?: string,
): Promise<void> => {
  const { error } = await supabase.rpc('turismo_provider_update_reservation', {
    p_reservation_id: id,
    p_action: action,
    p_quoted_amount: quotedAmount ?? null,
    p_response: response || null,
    p_provider_id: providerId || useProviderContext.getState().activeProviderId || null,
  });
  if (error) throw serviceError('actualizar el estado de la reserva', error);
};

export const getPublishedReviews = async (itemId: string): Promise<Review[]> => {
  const { data, error } = await supabase.from('turismo_reviews')
    .select('*, turismo_catalog_items(id,title)')
    .eq('item_id', itemId).eq('status', 'published').order('created_at', { ascending: false });
  if (error) throw serviceError('cargar las reseñas publicadas', error);
  return (data || []).map(mapReview);
};

export const getProviderReviews = async (providerId?: string): Promise<Review[]> => {
  const userId = providerId || useProviderContext.getState().activeProviderId || await currentAuthUserId();
  const { data, error } = await supabase.from('turismo_reviews')
    .select('*, turismo_catalog_items!inner(id,title,provider_id)')
    .eq('turismo_catalog_items.provider_id', userId)
    .eq('status', 'published').order('created_at', { ascending: false });
  if (error) throw serviceError('cargar las reseñas del prestador', error);
  return (data || []).map(mapReview);
};

export const getPendingReviews = async (): Promise<Review[]> => {
  const { data, error } = await supabase.from('turismo_reviews')
    .select('*, turismo_catalog_items(id,title)')
    .eq('status', 'pending').order('created_at', { ascending: true });
  if (error) throw serviceError('cargar la cola de reseñas', error);
  return (data || []).map(mapReview);
};

export const getMyReviews = async (): Promise<Review[]> => {
  const userId = await currentAuthUserId();
  const { data, error } = await supabase.from('turismo_reviews')
    .select('*, turismo_catalog_items(id,title)')
    .eq('tourist_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw serviceError('cargar tus reseñas', error);
  return (data || []).map(mapReview);
};

export const createReview = async (reservationId: string, rating: number, comment: string): Promise<string> => {
  const { data, error } = await supabase.rpc('turismo_create_review', {
    p_reservation_id: reservationId,
    p_rating: rating,
    p_comment: comment || null,
  });
  if (error) throw serviceError('crear la reseña', error);
  return rpcUuid(data);
};

export const moderateReview = async (id: string, action: 'approve' | 'reject', reason?: string): Promise<void> => {
  const { error } = await supabase.rpc('turismo_moderate_review', {
    p_review_id: id,
    p_action: action,
    p_reason: reason || null,
  });
  if (error) throw serviceError('moderar la reseña', error);
};

export const respondToReview = async (id: string, response: string, providerId?: string): Promise<void> => {
  const { error } = await supabase.rpc('turismo_respond_to_review', {
    p_review_id: id,
    p_response: response,
    p_provider_id: providerId || useProviderContext.getState().activeProviderId || null,
  });
  if (error) throw serviceError('responder la reseña', error);
};

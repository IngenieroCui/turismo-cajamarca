import { supabase } from '../lib/supabase/client';
import type {
  CatalogItem,
  CatalogItemInput,
  CatalogItemMetadata,
  CatalogItemStatus,
  CatalogItemType,
  Favorite,
} from '../types/tourism.types';
import { getActivePromotionsForItems } from './promotionService';
import { useProviderContext } from '../context/useProviderContext';

type DatabaseRow = Record<string, unknown>;

export interface PublishedCatalogOptions {
  type?: CatalogItemType;
  category?: string;
  search?: string;
  featured?: boolean;
  limit?: number;
  includePromotions?: boolean;
}

const serviceError = (operation: string, error: { message?: string } | null) =>
  new Error(`No fue posible ${operation}: ${error?.message || 'error desconocido de Supabase.'}`);

const stringValue = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const numberValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
};

const metadataFromDatabase = (value: unknown): CatalogItemMetadata => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as DatabaseRow;
  const strings = (key: string): string[] | undefined => {
    const list = source[key];
    return Array.isArray(list) ? list.filter((entry): entry is string => typeof entry === 'string') : undefined;
  };
  return {
    highlights: strings('highlights'),
    amenities: strings('amenities'),
    includes: strings('includes'),
    popularIn: stringValue(source.popular_in) || undefined,
    operatorName: stringValue(source.operator_name) || undefined,
    eventDate: stringValue(source.event_date) || undefined,
    eventEndDate: source.event_end_date === null ? null : stringValue(source.event_end_date),
    artisanName: stringValue(source.artisan_name) || undefined,
  };
};

const metadataToDatabase = (metadata: CatalogItemMetadata | undefined): DatabaseRow => ({
  highlights: metadata?.highlights || [],
  amenities: metadata?.amenities || [],
  popular_in: metadata?.popularIn || null,
  includes: metadata?.includes || [],
  operator_name: metadata?.operatorName || null,
  event_date: metadata?.eventDate || null,
  event_end_date: metadata?.eventEndDate || null,
  artisan_name: metadata?.artisanName || null,
});

const mapCatalogItem = (value: unknown): CatalogItem => {
  const row = (value || {}) as DatabaseRow;
  return {
    id: String(row.id),
    providerId: stringValue(row.provider_id),
    itemType: row.item_type as CatalogItemType,
    title: String(row.title || ''),
    slug: String(row.slug || ''),
    category: stringValue(row.category),
    shortDescription: String(row.short_description || ''),
    description: stringValue(row.description),
    location: stringValue(row.location),
    address: stringValue(row.address),
    latitude: numberValue(row.latitude),
    longitude: numberValue(row.longitude),
    coverImageUrl: stringValue(row.cover_image_url),
    contactWhatsapp: stringValue(row.contact_whatsapp),
    priceFrom: numberValue(row.price_from),
    priceTo: numberValue(row.price_to),
    priceLabel: stringValue(row.price_label),
    currency: String(row.currency || 'COP'),
    durationText: stringValue(row.duration_text),
    difficulty: row.difficulty as CatalogItem['difficulty'],
    isReservable: Boolean(row.is_reservable),
    metadata: metadataFromDatabase(row.metadata),
    status: row.status as CatalogItemStatus,
    moderationReason: stringValue(row.moderation_reason),
    isFeatured: Boolean(row.is_featured),
    rating: numberValue(row.rating) || 0,
    reviewsCount: numberValue(row.reviews_count) || 0,
    publishedAt: stringValue(row.published_at),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
};

const currentUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw serviceError('identificar la sesión activa', error);
  return data.user.id;
};

const rpcUuid = (data: unknown): string => {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && 'id' in data) return String((data as DatabaseRow).id);
  throw new Error('Supabase no devolvió el identificador creado.');
};

const inputArguments = (input: CatalogItemInput, providerId?: string | null): DatabaseRow => ({
  p_item_type: input.itemType,
  p_title: input.title,
  p_slug: input.slug,
  p_category: input.category || null,
  p_short_description: input.shortDescription,
  p_description: input.description || null,
  p_location: input.location || null,
  p_address: input.address || null,
  p_latitude: input.latitude ?? null,
  p_longitude: input.longitude ?? null,
  p_cover_image_url: input.coverImageUrl || null,
  p_contact_whatsapp: input.contactWhatsapp || null,
  p_price_from: input.priceFrom ?? null,
  p_price_to: input.priceTo ?? null,
  p_price_label: input.priceLabel || null,
  p_currency: input.currency || 'COP',
  p_duration_text: input.durationText || null,
  p_difficulty: input.difficulty || null,
  p_is_reservable: input.isReservable ?? false,
  p_metadata: metadataToDatabase(input.metadata),
  p_provider_id: providerId || useProviderContext.getState().activeProviderId || null,
});

export const getPublishedCatalogItems = async (options: PublishedCatalogOptions = {}): Promise<CatalogItem[]> => {
  let query = supabase.from('turismo_catalog_items').select('*').eq('status', 'published').order('is_featured', { ascending: false }).order('published_at', { ascending: false });
  if (options.type) query = query.eq('item_type', options.type);
  if (options.category) query = query.eq('category', options.category);
  if (options.featured !== undefined) query = query.eq('is_featured', options.featured);
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw serviceError('cargar el catálogo publicado', error);
  const items = (data || []).map(mapCatalogItem);
  const search = options.search?.trim().toLocaleLowerCase();
  const filtered = !search ? items : items.filter((item) => [item.title, item.shortDescription, item.description, item.location, item.category]
    .filter((field): field is string => Boolean(field))
    .some((field) => field.toLocaleLowerCase().includes(search)));
  if (!options.includePromotions || !filtered.length) return filtered;
  return attachActivePromotions(filtered);
};

export const attachActivePromotions = async (items: CatalogItem[]): Promise<CatalogItem[]> => {
  const promotions = await getActivePromotionsForItems(items.map((item) => item.id));
  return items.map((item) => ({ ...item, activePromotion: promotions.get(item.id)?.[0] || null }));
};

export const getCatalogItemById = async (id: string): Promise<CatalogItem> => {
  const { data, error } = await supabase.from('turismo_catalog_items').select('*').eq('id', id).single();
  if (error || !data) throw serviceError('cargar el elemento del catálogo', error);
  return mapCatalogItem(data);
};

export const getProviderCatalogItems = async (providerId?: string): Promise<CatalogItem[]> => {
  const userId = providerId || useProviderContext.getState().activeProviderId || await currentUserId();
  const { data, error } = await supabase.from('turismo_catalog_items').select('*').eq('provider_id', userId).order('created_at', { ascending: false });
  if (error) throw serviceError('cargar el catálogo del prestador', error);
  return (data || []).map(mapCatalogItem);
};

export const createCatalogItem = async (input: CatalogItemInput, providerId?: string): Promise<string> => {
  const { data, error } = await supabase.rpc('turismo_create_catalog_item', inputArguments(input, providerId));
  if (error) throw serviceError('crear la oferta del catálogo', error);
  return rpcUuid(data);
};

export const updateCatalogItem = async (id: string, input: CatalogItemInput, providerId?: string): Promise<string> => {
  const { data, error } = await supabase.rpc('turismo_update_catalog_item', { p_item_id: id, ...inputArguments(input, providerId) });
  if (error) throw serviceError('actualizar la oferta del catálogo', error);
  return rpcUuid(data);
};

export const submitCatalogItem = async (id: string, providerId?: string): Promise<void> => {
  const { error } = await supabase.rpc('turismo_submit_catalog_item', { p_item_id: id, p_provider_id: providerId || useProviderContext.getState().activeProviderId || null });
  if (error) throw serviceError('enviar la oferta a revisión', error);
};

export const archiveCatalogItem = async (id: string, providerId?: string): Promise<void> => {
  const { error } = await supabase.rpc('turismo_archive_catalog_item', { p_item_id: id, p_provider_id: providerId || useProviderContext.getState().activeProviderId || null });
  if (error) throw serviceError('archivar la oferta', error);
};

export const getPendingModerationItems = async (): Promise<CatalogItem[]> => {
  const { data, error } = await supabase.from('turismo_catalog_items').select('*').eq('status', 'pending_review').order('created_at', { ascending: true });
  if (error) throw serviceError('cargar la cola de moderación', error);
  return (data || []).map(mapCatalogItem);
};

export const moderateCatalogItem = async (id: string, action: 'approve' | 'reject' | 'suspend', reason?: string): Promise<void> => {
  const { error } = await supabase.rpc('turismo_moderate_catalog_item', { p_item_id: id, p_action: action, p_reason: reason || null });
  if (error) throw serviceError('moderar la oferta del catálogo', error);
};

export const getFavoriteItemIds = async (): Promise<string[]> => {
  const userId = await currentUserId();
  const { data, error } = await supabase.from('turismo_favorites').select('item_id').eq('user_id', userId);
  if (error) throw serviceError('cargar tus favoritos', error);
  return (data || []).map((row) => String((row as DatabaseRow).item_id));
};

export const getFavoriteItems = async (): Promise<CatalogItem[]> => {
  const ids = await getFavoriteItemIds();
  if (!ids.length) return [];
  const items = await getPublishedCatalogItems();
  return items.filter((item) => ids.includes(item.id));
};

export const addFavorite = async (itemId: string): Promise<void> => {
  const userId = await currentUserId();
  const { error } = await supabase.from('turismo_favorites').insert({ user_id: userId, item_id: itemId });
  if (error) throw serviceError('guardar el favorito', error);
};

export const removeFavorite = async (itemId: string): Promise<void> => {
  const userId = await currentUserId();
  const { error } = await supabase.from('turismo_favorites').delete().eq('user_id', userId).eq('item_id', itemId);
  if (error) throw serviceError('quitar el favorito', error);
};

export const toggleFavorite = async (itemId: string): Promise<boolean> => {
  const ids = await getFavoriteItemIds();
  if (ids.includes(itemId)) {
    await removeFavorite(itemId);
    return false;
  }
  await addFavorite(itemId);
  return true;
};

export type { Favorite };

export type CatalogItemType =
  | 'atractivo'
  | 'alojamiento'
  | 'gastronomia'
  | 'tour'
  | 'evento'
  | 'artesania';

export type CatalogItemStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'suspended'
  | 'archived';

export interface CatalogItemMetadata {
  highlights?: string[];
  amenities?: string[];
  popularIn?: string;
  includes?: string[];
  operatorName?: string;
  eventDate?: string;
  eventEndDate?: string | null;
  artisanName?: string;
}

export interface CatalogItem {
  id: string;
  providerId: string | null;
  itemType: CatalogItemType;
  title: string;
  slug: string;
  category: string | null;
  shortDescription: string;
  description: string | null;
  location: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  coverImageUrl: string | null;
  contactWhatsapp: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  priceLabel: string | null;
  currency: string;
  durationText: string | null;
  difficulty: 'facil' | 'moderado' | 'exigente' | null;
  isReservable: boolean;
  metadata: CatalogItemMetadata;
  status: CatalogItemStatus;
  moderationReason: string | null;
  isFeatured: boolean;
  rating: number;
  reviewsCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  activePromotion?: Promotion | null;
}

export interface CatalogAvailability {
  itemId: string;
  availableDate: string;
  isAvailable: boolean;
  capacity: number | null;
  priceOverride: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PromotionType = 'percentage' | 'fixed' | 'benefit';

export interface Promotion {
  id: string;
  providerId: string;
  itemId: string;
  title: string;
  description: string | null;
  code: string | null;
  promotionType: PromotionType;
  discountValue: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItemInput {
  itemType: CatalogItemType;
  title: string;
  slug: string;
  category?: string | null;
  shortDescription: string;
  description?: string | null;
  location?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coverImageUrl?: string | null;
  contactWhatsapp?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  priceLabel?: string | null;
  currency?: string;
  durationText?: string | null;
  difficulty?: 'facil' | 'moderado' | 'exigente' | null;
  isReservable?: boolean;
  metadata?: CatalogItemMetadata;
}

export type ReservationStatus = 'requested' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export interface Reservation {
  id: string;
  itemId: string;
  touristId: string;
  providerId: string | null;
  reservationDate: string;
  endDate: string | null;
  guests: number;
  notes: string | null;
  status: ReservationStatus;
  quotedAmount: number | null;
  currency: string;
  providerResponse: string | null;
  promotionId: string | null;
  promotionCode: string | null;
  createdAt: string;
  updatedAt: string;
  item: Pick<CatalogItem, 'id' | 'title' | 'coverImageUrl' | 'itemType'> | null;
  touristName: string | null;
}

export type ReviewStatus = 'pending' | 'published' | 'rejected';

export interface Review {
  id: string;
  itemId: string;
  touristId: string;
  reservationId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  moderationReason: string | null;
  providerResponse: string | null;
  providerRespondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemTitle: string | null;
  touristName: string | null;
}

export interface Favorite {
  userId: string;
  itemId: string;
  createdAt: string;
}

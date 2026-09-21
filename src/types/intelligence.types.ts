import type { CatalogItem, Promotion } from './tourism.types';

export type TravelPreference =
  | 'naturaleza'
  | 'aventura'
  | 'gastronomia'
  | 'cultura'
  | 'descanso'
  | 'familia'
  | 'artesania'
  | 'eventos'
  | 'alojamiento';

export interface RecommendationReason {
  code: string;
  text: string;
}

export interface RecommendedCatalogItem extends CatalogItem {
  score: number;
  reasons: RecommendationReason[];
  activePromotion?: Promotion | null;
}

export type ItineraryBudget = 'economico' | 'moderado' | 'premium' | 'flexible';
export type ItinerarySlot = 'morning' | 'midday' | 'afternoon' | 'evening';

export interface ItineraryItem {
  id?: string;
  catalogItemId: string;
  catalogItem?: CatalogItem | null;
  dayNumber: number;
  slot: ItinerarySlot;
  position: number;
}

export interface Itinerary {
  id?: string;
  touristId?: string;
  name: string;
  days: number;
  interests: TravelPreference[];
  budgetLevel: ItineraryBudget;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  items: ItineraryItem[];
}

export interface GenerateItineraryInput {
  days: number;
  interests: TravelPreference[];
  budgetLevel: ItineraryBudget;
}

export interface SaveItineraryInput extends GenerateItineraryInput {
  name: string;
  notes?: string | null;
  items: ItineraryItem[];
}

export interface AssistantResponse {
  text: string;
  items: RecommendedCatalogItem[];
}

import { supabase } from '../lib/supabase/client';

export interface IntelligenceMetrics {
  publishedCatalog: number;
  touristsWithPreferences: number;
  savedItineraries: number;
  favoritesCount: number;
  completedReservations: number;
  averageRating: number;
  topPreferences: Array<{ preference: string; count: number }>;
}

type DatabaseRow = Record<string, unknown>;

export const getIntelligenceMetrics = async (): Promise<IntelligenceMetrics> => {
  const { data, error } = await supabase.rpc('turismo_get_intelligence_metrics');
  if (error) throw new Error(`No fue posible cargar las métricas de inteligencia: ${error.message}`);
  const row = (data || {}) as DatabaseRow;
  const list = Array.isArray(row.top_preferences) ? row.top_preferences : [];
  return { publishedCatalog: Number(row.published_catalog || 0), touristsWithPreferences: Number(row.tourists_with_preferences || 0), savedItineraries: Number(row.saved_itineraries || 0), favoritesCount: Number(row.favorites_count || 0), completedReservations: Number(row.completed_reservations || 0), averageRating: Number(row.average_rating || 0), topPreferences: list.map((entry) => { const item = entry as DatabaseRow; return { preference: String(item.preference || ''), count: Number(item.count || 0) }; }) };
};

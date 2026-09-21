import { supabase } from '../lib/supabase/client';
import type { AnalyticsData, AnalyticsBreakdownItem } from '../types/operations.types';

type Row = Record<string, unknown>;
const asRow = (value: unknown): Row => value && typeof value === 'object' ? value as Row : {};
const asNumber = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : Number(value || 0);
const mapBreakdown = (value: unknown): AnalyticsBreakdownItem[] => !Array.isArray(value) ? [] : value.map((entry): AnalyticsBreakdownItem => { const row = asRow(entry); return { label: String(row.label || ''), value: asNumber(row.value), ...(row.rating !== undefined ? { rating: asNumber(row.rating) } : {}) }; });

export const getAnalytics = async (period: AnalyticsData['period']): Promise<AnalyticsData> => {
  const { data, error } = await supabase.rpc('turismo_get_analytics', { p_period: period });
  if (error) throw new Error(`No fue posible cargar la analítica: ${error.message}`);
  const row = asRow(data);
  return { period, periodStart: String(row.period_start || ''), publishedCatalogCount: asNumber(row.published_catalog_count), activeProviderCount: asNumber(row.active_provider_count), reservationCount: asNumber(row.reservation_count), completedReservations: asNumber(row.completed_reservations), cancelledReservations: asNumber(row.cancelled_reservations), uniqueTourists: asNumber(row.unique_tourists), publishedReviews: asNumber(row.published_reviews), averageRating: asNumber(row.average_rating), quotedReservationValue: asNumber(row.quoted_reservation_value), catalogByType: mapBreakdown(row.catalog_by_type), reservationByStatus: mapBreakdown(row.reservation_by_status), topCategories: mapBreakdown(row.top_categories), topCatalogItems: mapBreakdown(row.top_catalog_items) };
};

const escapeCsv = (value: string | number): string => `"${String(value).replaceAll('"', '""')}"`;
export const exportAnalyticsCsv = (data: AnalyticsData): void => {
  const rows: Array<Array<string | number>> = [
    ['Métrica','Valor'], ['Periodo', data.period], ['Inicio del periodo', data.periodStart], ['Catálogo publicado', data.publishedCatalogCount], ['Prestadores activos', data.activeProviderCount], ['Reservas', data.reservationCount], ['Reservas completadas', data.completedReservations], ['Reservas canceladas o rechazadas', data.cancelledReservations], ['Turistas únicos', data.uniqueTourists], ['Reseñas publicadas', data.publishedReviews], ['Calificación promedio', data.averageRating], ['Valor cotizado de reservas', data.quotedReservationValue],
    [], ['Catálogo por tipo','Cantidad'], ...data.catalogByType.map((item) => [item.label, item.value]), [], ['Reservas por estado','Cantidad'], ...data.reservationByStatus.map((item) => [item.label, item.value]), [], ['Categorías principales','Cantidad'], ...data.topCategories.map((item) => [item.label, item.value]), [], ['Ofertas principales','Reseñas'], ...data.topCatalogItems.map((item) => [item.label, item.value]),
  ];
  const csv = rows.map((row) => row.map((value) => escapeCsv(value)).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `turismo-cajamarca-analytics-${data.period}.csv`; anchor.click(); URL.revokeObjectURL(url);
};

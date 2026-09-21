import { supabase } from '../lib/supabase/client';

export interface SystemHealth {
  databaseTime: string;
  activeUsers: number;
  activeRoles: number;
  publishedCatalog: number;
  openSupportTickets: number;
  pendingCatalogModeration: number;
  pendingReviews: number;
  pendingDeletionRequests: number;
  latestAuditEventAt: string | null;
  notificationCount24h: number;
  schemaVersion: number;
}

type Row = Record<string, unknown>;
const asNumber = (value: unknown): number => typeof value === 'number' ? value : Number(value || 0);
const asString = (value: unknown): string | null => typeof value === 'string' ? value : null;

export const getSystemHealth = async (): Promise<SystemHealth> => {
  const { data, error } = await supabase.rpc('turismo_get_system_health');
  if (error) throw new Error(`No fue posible cargar la salud del sistema: ${error.message}`);
  const row = (data && typeof data === 'object' ? data : {}) as Row;
  return {
    databaseTime: String(row.database_time || ''), activeUsers: asNumber(row.active_users), activeRoles: asNumber(row.active_roles),
    publishedCatalog: asNumber(row.published_catalog), openSupportTickets: asNumber(row.open_support_tickets),
    pendingCatalogModeration: asNumber(row.pending_catalog_moderation), pendingReviews: asNumber(row.pending_reviews),
    pendingDeletionRequests: asNumber(row.pending_deletion_requests), latestAuditEventAt: asString(row.latest_audit_event_at),
    notificationCount24h: asNumber(row.notification_count_24h), schemaVersion: asNumber(row.schema_version),
  };
};

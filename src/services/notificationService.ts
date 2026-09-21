import { supabase } from '../lib/supabase/client';

export interface AppNotification {
  id: string;
  userId: string;
  notificationType: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  actionPath: string | null;
  isRead: boolean;
  createdAt: string;
}

type DatabaseRow = Record<string, unknown>;

const serviceError = (operation: string, error: { message?: string } | null) => new Error(`No fue posible ${operation}: ${error?.message || 'error desconocido de Supabase.'}`);

const mapNotification = (value: unknown): AppNotification => {
  const row = (value || {}) as DatabaseRow;
  return {
    id: String(row.id || ''), userId: String(row.user_id || ''), notificationType: String(row.notification_type || ''),
    title: String(row.title || ''), body: String(row.body || ''), entityType: typeof row.entity_type === 'string' ? row.entity_type : null,
    entityId: typeof row.entity_id === 'string' ? row.entity_id : null, actionPath: typeof row.action_path === 'string' ? row.action_path : null,
    isRead: Boolean(row.is_read), createdAt: String(row.created_at || ''),
  };
};

export const getNotifications = async (limit = 30): Promise<AppNotification[]> => {
  const { data, error } = await supabase.from('turismo_notifications').select('*').order('created_at', { ascending: false }).limit(Math.min(Math.max(limit, 1), 100));
  if (error) throw serviceError('cargar tus notificaciones', error);
  return (data || []).map(mapNotification);
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const { count, error } = await supabase.from('turismo_notifications').select('id', { count: 'exact', head: true }).eq('is_read', false);
  if (error) throw serviceError('consultar tus notificaciones pendientes', error);
  return count || 0;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  const { error } = await supabase.rpc('turismo_mark_notification_read', { p_notification_id: id });
  if (error) throw serviceError('marcar la notificación como leída', error);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  const { error } = await supabase.rpc('turismo_mark_all_notifications_read');
  if (error) throw serviceError('marcar las notificaciones como leídas', error);
};

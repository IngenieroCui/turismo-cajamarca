import { supabase } from '../lib/supabase/client';
import type {
  RefundRequest,
  SupportMessage,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from '../types/operations.types';

type Row = Record<string, unknown>;
const asRow = (value: unknown): Row => value && typeof value === 'object' ? value as Row : {};
const asNumber = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : Number(value || 0);
const serviceError = (operation: string, message?: string): Error => new Error(`No fue posible ${operation}: ${message || 'error desconocido de Supabase.'}`);

const currentUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw serviceError('identificar la sesión');
  return data.user.id;
};

const mapTicket = (value: unknown): SupportTicket => {
  const row = asRow(value);
  return {
    id: String(row.id || ''), requesterId: String(row.requester_id || ''),
    requesterName: typeof row.requester_name === 'string' ? row.requester_name : null,
    requesterEmail: typeof row.requester_email === 'string' ? row.requester_email : null,
    category: row.category as SupportTicketCategory, reservationId: typeof row.reservation_id === 'string' ? row.reservation_id : null,
    catalogItemId: typeof row.catalog_item_id === 'string' ? row.catalog_item_id : null,
    subject: String(row.subject || ''), description: String(row.description || ''),
    priority: row.priority as SupportTicketPriority, status: row.status as SupportTicketStatus,
    assignedSupportId: typeof row.assigned_support_id === 'string' ? row.assigned_support_id : null,
    resolutionSummary: typeof row.resolution_summary === 'string' ? row.resolution_summary : null,
    createdAt: String(row.created_at || ''), updatedAt: String(row.updated_at || ''),
    resolvedAt: typeof row.resolved_at === 'string' ? row.resolved_at : null,
  };
};

export interface CreateSupportTicketInput {
  category: SupportTicketCategory;
  subject: string;
  description: string;
  priority: SupportTicketPriority;
  reservationId?: string | null;
  catalogItemId?: string | null;
  providerContextId?: string | null;
}

export const createSupportTicket = async (input: CreateSupportTicketInput): Promise<string> => {
  const { data, error } = await supabase.rpc('turismo_create_support_ticket', {
    p_category: input.category, p_subject: input.subject, p_description: input.description,
    p_priority: input.priority, p_reservation_id: input.reservationId || null, p_catalog_item_id: input.catalogItemId || null, p_provider_context_id: input.providerContextId || null,
  });
  if (error) throw serviceError('crear la solicitud de soporte', error.message);
  return typeof data === 'string' ? data : String(asRow(data).id || data);
};

export const getMySupportTickets = async (): Promise<SupportTicket[]> => {
  const userId = await currentUserId();
  const { data, error } = await supabase.from('turismo_support_tickets').select('*').eq('requester_id', userId).order('created_at', { ascending: false });
  if (error) throw serviceError('cargar tus solicitudes de soporte', error.message);
  return (data || []).map(mapTicket);
};

export interface SupportQueueFilters {
  status?: SupportTicketStatus | null;
  priority?: SupportTicketPriority | null;
  category?: SupportTicketCategory | null;
  search?: string;
}

export const getSupportQueue = async (filters: SupportQueueFilters = {}): Promise<SupportTicket[]> => {
  const { data, error } = await supabase.rpc('turismo_get_support_queue', {
    p_status: filters.status || null, p_priority: filters.priority || null,
    p_category: filters.category || null, p_search: filters.search?.trim() || null,
  });
  if (error) throw serviceError('cargar la cola de soporte', error.message);
  return (Array.isArray(data) ? data : []).map(mapTicket);
};

export const getSupportTicketMessages = async (ticketId: string): Promise<SupportMessage[]> => {
  const { data, error } = await supabase.from('turismo_support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
  if (error) throw serviceError('cargar la conversación del ticket', error.message);
  return (data || []).map((value): SupportMessage => {
    const row = asRow(value);
    return { id: String(row.id || ''), ticketId: String(row.ticket_id || ''), authorId: String(row.author_id || ''), authorName: null, body: String(row.body || ''), isInternal: Boolean(row.is_internal), createdAt: String(row.created_at || '') };
  });
};

export const addSupportMessage = async (ticketId: string, body: string, isInternal = false): Promise<string> => {
  const { data, error } = await supabase.rpc('turismo_add_support_message', { p_ticket_id: ticketId, p_body: body, p_is_internal: isInternal });
  if (error) throw serviceError('agregar el mensaje', error.message);
  return typeof data === 'string' ? data : String(asRow(data).id || data);
};

export const updateSupportTicket = async (ticketId: string, status: SupportTicketStatus, priority?: SupportTicketPriority | null, assignToSelf = false, resolutionSummary?: string | null): Promise<void> => {
  const { error } = await supabase.rpc('turismo_support_update_ticket', {
    p_ticket_id: ticketId, p_status: status, p_priority: priority || null, p_assign_to_self: assignToSelf, p_resolution_summary: resolutionSummary || null,
  });
  if (error) throw serviceError('actualizar el ticket', error.message);
};

export const initiateRefundRequest = async (ticketId: string, reservationId: string, amount: number, reason: string): Promise<string> => {
  const { data, error } = await supabase.rpc('turismo_initiate_refund_request', { p_ticket_id: ticketId, p_reservation_id: reservationId, p_amount: amount, p_reason: reason });
  if (error) throw serviceError('iniciar la solicitud de reembolso', error.message);
  return typeof data === 'string' ? data : String(asRow(data).id || data);
};

export const getRefundRequestsForTicket = async (ticketId: string): Promise<RefundRequest[]> => {
  const { data, error } = await supabase.from('turismo_refund_requests').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false });
  if (error) throw serviceError('cargar los reembolsos del ticket', error.message);
  return (data || []).map((value): RefundRequest => {
    const row = asRow(value);
    return { id: String(row.id || ''), ticketId: String(row.ticket_id || ''), reservationId: String(row.reservation_id || ''), initiatedBy: String(row.initiated_by || ''), amount: asNumber(row.amount), currency: String(row.currency || 'COP'), reason: String(row.reason || ''), status: row.status as RefundRequest['status'], createdAt: String(row.created_at || ''), processedAt: typeof row.processed_at === 'string' ? row.processed_at : null };
  });
};

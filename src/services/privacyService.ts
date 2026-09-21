import { supabase } from '../lib/supabase/client';
import type { AccountDeletionRequest } from '../types/privacy.types';

type Row = Record<string, unknown>;
const asRow = (value: unknown): Row => value && typeof value === 'object' ? value as Row : {};
const mapRequest = (value: unknown): AccountDeletionRequest => {
  const row = asRow(value);
  return {
    id: String(row.id || ''), userId: String(row.user_id || ''), email: typeof row.email === 'string' ? row.email : null,
    fullName: typeof row.full_name === 'string' ? row.full_name : null, reason: typeof row.reason === 'string' ? row.reason : null,
    status: row.status as AccountDeletionRequest['status'], requestedAt: String(row.requested_at || ''),
    reviewedAt: typeof row.reviewed_at === 'string' ? row.reviewed_at : null, reviewedBy: typeof row.reviewed_by === 'string' ? row.reviewed_by : null,
    reviewNote: typeof row.review_note === 'string' ? row.review_note : null,
  };
};

export const exportMyData = async (): Promise<unknown> => {
  const { data, error } = await supabase.rpc('turismo_export_my_data');
  if (error) throw new Error(`No fue posible exportar tus datos: ${error.message}`);
  return data;
};

export const downloadMyDataJson = async (): Promise<void> => {
  const data = await exportMyData();
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `turismo-cajamarca-mis-datos-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const requestAccountDeletion = async (reason?: string | null): Promise<string> => {
  const { data, error } = await supabase.rpc('turismo_request_account_deletion', { p_reason: reason || null });
  if (error) throw new Error(`No fue posible solicitar la eliminación: ${error.message}`);
  return typeof data === 'string' ? data : String(asRow(data).id || data || '');
};

export const cancelAccountDeletion = async (): Promise<void> => {
  const { error } = await supabase.rpc('turismo_cancel_account_deletion_request');
  if (error) throw new Error(`No fue posible cancelar la solicitud: ${error.message}`);
};

export const getMyDeletionRequest = async (): Promise<AccountDeletionRequest | null> => {
  const { data, error } = await supabase.rpc('turismo_get_my_account_deletion_request');
  if (error) throw new Error(`No fue posible consultar la solicitud: ${error.message}`);
  return data ? mapRequest(data) : null;
};

export const getPendingDeletionRequests = async (): Promise<AccountDeletionRequest[]> => {
  const { data, error } = await supabase.rpc('turismo_get_pending_account_deletion_requests');
  if (error) throw new Error(`No fue posible cargar solicitudes de privacidad: ${error.message}`);
  return (Array.isArray(data) ? data : []).map(mapRequest);
};

export const reviewAccountDeletion = async (requestId: string, decision: 'approve' | 'reject', note?: string | null): Promise<void> => {
  const { error } = await supabase.rpc('turismo_review_account_deletion_request', { p_request_id: requestId, p_decision: decision, p_note: note || null });
  if (error) throw new Error(`No fue posible revisar la solicitud: ${error.message}`);
};

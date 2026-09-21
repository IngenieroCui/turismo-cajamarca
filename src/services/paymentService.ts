import { supabase } from '../lib/supabase/client';
import type { ExternalPaymentMethod, PaymentRecord, PaymentRecordStatus } from '../types/payment.types';

export const currentAuthUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('No hay una sesión autenticada.');
  return data.user.id;
};

type Row = Record<string, unknown>;
const asRow = (value: unknown): Row => value && typeof value === 'object' ? value as Row : {};
const asNumber = (value: unknown): number => typeof value === 'number' ? value : Number(value || 0);
const mapPayment = (value: unknown): PaymentRecord => {
  const row = asRow(value);
  return {
    id: String(row.id || ''), reservationId: String(row.reservation_id || ''), touristId: String(row.tourist_id || ''),
    providerId: typeof row.provider_id === 'string' ? row.provider_id : null, amount: asNumber(row.amount), currency: String(row.currency || 'COP'),
    method: row.method as ExternalPaymentMethod, externalReference: typeof row.external_reference === 'string' ? row.external_reference : null,
    notes: typeof row.notes === 'string' ? row.notes : null, status: row.status as PaymentRecordStatus, declaredAt: String(row.declared_at || ''),
    verifiedAt: typeof row.verified_at === 'string' ? row.verified_at : null, verifiedBy: typeof row.verified_by === 'string' ? row.verified_by : null,
    rejectionReason: typeof row.rejection_reason === 'string' ? row.rejection_reason : null,
  };
};

export const getMyPaymentRecords = async (): Promise<PaymentRecord[]> => {
  const userId = await currentAuthUserId();
  const { data, error } = await supabase.from('turismo_payment_records').select('*').eq('tourist_id', userId).order('declared_at', { ascending: false });
  if (error) throw new Error(`No fue posible cargar tus pagos: ${error.message}`);
  return (data || []).map(mapPayment);
};

export const getProviderPaymentRecords = async (providerId: string): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase.from('turismo_payment_records').select('*').eq('provider_id', providerId).order('declared_at', { ascending: false });
  if (error) throw new Error(`No fue posible cargar los pagos externos: ${error.message}`);
  return (data || []).map(mapPayment);
};

export const declareExternalPayment = async (reservationId: string, method: ExternalPaymentMethod, reference?: string | null, notes?: string | null): Promise<string> => {
  const { data, error } = await supabase.rpc('turismo_declare_external_payment', {
    p_reservation_id: reservationId, p_method: method, p_external_reference: reference || null, p_notes: notes || null,
  });
  if (error) throw new Error(`No fue posible registrar el pago externo: ${error.message}`);
  return typeof data === 'string' ? data : String(asRow(data).id || data || '');
};

export const reviewExternalPayment = async (paymentId: string, action: 'verify' | 'reject', rejectionReason?: string | null): Promise<void> => {
  const { error } = await supabase.rpc('turismo_provider_review_payment', { p_payment_id: paymentId, p_action: action, p_rejection_reason: rejectionReason || null });
  if (error) throw new Error(`No fue posible revisar el pago externo: ${error.message}`);
};

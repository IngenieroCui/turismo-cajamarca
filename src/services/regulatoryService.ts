import { supabase } from '../lib/supabase/client';
import type { ProviderCompliance, RegulatoryDecision, RegulatoryObservation, RegulatoryReviewType } from '../types/operations.types';

type Row = Record<string, unknown>;
const asRow = (value: unknown): Row => value && typeof value === 'object' ? value as Row : {};
const mapCompliance = (value: unknown): ProviderCompliance => {
  const row = asRow(value);
  return {
    providerId: String(row.provider_id || ''), fullName: typeof row.full_name === 'string' ? row.full_name : null, email: typeof row.email === 'string' ? row.email : null,
    ruc: typeof row.ruc === 'string' ? row.ruc : null, razonSocial: typeof row.razon_social === 'string' ? row.razon_social : null, nombreComercial: typeof row.nombre_comercial === 'string' ? row.nombre_comercial : null,
    subType: typeof row.sub_type === 'string' ? row.sub_type : null, rntNumber: typeof row.rnt_number === 'string' ? row.rnt_number : null, rntStatus: row.rnt_status as ProviderCompliance['rntStatus'], address: typeof row.address === 'string' ? row.address : null,
    commercialRegistrationNumber: typeof row.commercial_registration_number === 'string' ? row.commercial_registration_number : null, commercialStatus: (row.commercial_status || 'pendiente') as ProviderCompliance['commercialStatus'],
    commercialExpiresAt: typeof row.commercial_expires_at === 'string' ? row.commercial_expires_at : null, rntExpiresAt: typeof row.rnt_expires_at === 'string' ? row.rnt_expires_at : null, rntVerifiedAt: typeof row.rnt_verified_at === 'string' ? row.rnt_verified_at : null, commercialVerifiedAt: typeof row.commercial_verified_at === 'string' ? row.commercial_verified_at : null,
    lastRntNote: typeof row.last_rnt_note === 'string' ? row.last_rnt_note : null, lastCommercialNote: typeof row.last_commercial_note === 'string' ? row.last_commercial_note : null,
  };
};
const serviceError = (operation: string, message?: string): Error => new Error(`No fue posible ${operation}: ${message || 'error desconocido de Supabase.'}`);

export interface RegulatoryProfile { profileId: string; entityType: 'MINCIT' | 'FONTUR' | 'CAMARA_COMERCIO'; institutionalId: string; jurisdictionScope: string | null; credentialUrl: string | null; }

export const getRegulatoryProviders = async (): Promise<ProviderCompliance[]> => {
  const { data, error } = await supabase.rpc('turismo_get_regulatory_providers');
  if (error) throw serviceError('cargar los prestadores regulatorios', error.message);
  return (Array.isArray(data) ? data : []).map(mapCompliance);
};

export const getProviderCompliance = async (providerId: string): Promise<ProviderCompliance | null> => {
  const { data: row, error } = await supabase.from('turismo_provider_compliance').select('*').eq('provider_id', providerId).maybeSingle();
  if (error) throw serviceError('cargar el cumplimiento del prestador', error.message);
  const { data: provider, error: providerError } = await supabase.from('turismo_provider_profiles').select('profile_id,ruc,razon_social,nombre_comercial,sub_type,rnt_number,address').eq('profile_id', providerId).maybeSingle();
  if (providerError) throw serviceError('cargar los datos del prestador', providerError.message);
  if (!row && !provider) return null;
  const merged: Row = { ...(row || {}), ...(provider || {}), provider_id: providerId, rnt_status: provider?.rnt_number ? (row?.rnt_verified_at ? 'verificado' : row?.rnt_expires_at && row.rnt_expires_at < new Date().toISOString().slice(0, 10) ? 'vencido' : 'pendiente') : 'sin_rnt' };
  return mapCompliance(merged);
};

export const getProviderObservations = async (providerId: string): Promise<RegulatoryObservation[]> => {
  const { data, error } = await supabase.from('turismo_regulatory_observations').select('*').eq('provider_id', providerId).order('created_at', { ascending: false });
  if (error) throw serviceError('cargar el historial regulatorio', error.message);
  return (data || []).map((value): RegulatoryObservation => { const row = asRow(value); return { id: String(row.id || ''), providerId: String(row.provider_id || ''), reviewerId: String(row.reviewer_id || ''), entityType: row.entity_type as RegulatoryObservation['entityType'], reviewType: row.review_type as RegulatoryReviewType, decision: row.decision as RegulatoryDecision, notes: typeof row.notes === 'string' ? row.notes : null, effectiveUntil: typeof row.effective_until === 'string' ? row.effective_until : null, createdAt: String(row.created_at || '') }; });
};

export const getMyRegulatoryObservations = async (): Promise<RegulatoryObservation[]> => {
  const { data, error } = await supabase.from('turismo_regulatory_observations').select('*').eq('reviewer_id', (await supabase.auth.getUser()).data.user?.id || '').order('created_at', { ascending: false });
  if (error) throw serviceError('cargar tu historial regulatorio', error.message);
  return (data || []).map((value): RegulatoryObservation => { const row = asRow(value); return { id: String(row.id || ''), providerId: String(row.provider_id || ''), reviewerId: String(row.reviewer_id || ''), entityType: row.entity_type as RegulatoryObservation['entityType'], reviewType: row.review_type as RegulatoryReviewType, decision: row.decision as RegulatoryDecision, notes: typeof row.notes === 'string' ? row.notes : null, effectiveUntil: typeof row.effective_until === 'string' ? row.effective_until : null, createdAt: String(row.created_at || '') }; });
};

export const reviewProviderCompliance = async (providerId: string, reviewType: RegulatoryReviewType, decision: RegulatoryDecision, notes?: string | null, effectiveUntil?: string | null, registrationNumber?: string | null): Promise<void> => {
  const { error } = await supabase.rpc('turismo_review_provider_compliance', { p_provider_id: providerId, p_review_type: reviewType, p_decision: decision, p_notes: notes || null, p_effective_until: effectiveUntil || null, p_registration_number: registrationNumber || null });
  if (error) throw serviceError('guardar la revisión regulatoria', error.message);
};

export const configureRegulatoryProfile = async (userId: string, entityType: RegulatoryProfile['entityType'], institutionalId: string, jurisdictionScope: string, credentialUrl: string): Promise<void> => {
  const { error } = await supabase.rpc('turismo_configure_regulatory_profile', { p_user_id: userId, p_entity_type: entityType, p_institutional_id: institutionalId, p_jurisdiction_scope: jurisdictionScope || null, p_credential_url: credentialUrl || null });
  if (error) throw serviceError('configurar el perfil institucional', error.message);
};

export const getMyRegulatoryProfile = async (): Promise<RegulatoryProfile | null> => {
  const { data, error } = await supabase.from('turismo_regulatory_profiles').select('*').maybeSingle();
  if (error) throw serviceError('cargar el perfil institucional', error.message);
  if (!data) return null;
  return { profileId: String(data.profile_id), entityType: data.entity_type as RegulatoryProfile['entityType'], institutionalId: String(data.institutional_id), jurisdictionScope: data.jurisdiction_scope, credentialUrl: data.credential_url };
};

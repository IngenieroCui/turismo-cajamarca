import { supabase } from '../lib/supabase/client';
import type { AuditLogEntry, AuditReport } from '../types/operations.types';

type Row = Record<string, unknown>;
const asRow = (value: unknown): Row => value && typeof value === 'object' ? value as Row : {};
const errorFor = (operation: string, message?: string): Error => new Error(`No fue posible ${operation}: ${message || 'error desconocido de Supabase.'}`);

export interface AuditLogFilters { action?: string; from?: string; to?: string; }

export const getAuditLogs = async (filters: AuditLogFilters = {}, limit = 100, offset = 0): Promise<AuditLogEntry[]> => {
  const { data, error } = await supabase.rpc('turismo_get_audit_logs', { p_action: filters.action || null, p_from: filters.from || null, p_to: filters.to ? `${filters.to}T23:59:59.999Z` : null, p_limit: limit, p_offset: offset });
  if (error) throw errorFor('cargar los eventos de auditoría', error.message);
  return (Array.isArray(data) ? data : []).map((value): AuditLogEntry => { const row = asRow(value); return { id: String(row.id || ''), actorId: typeof row.actor_id === 'string' ? row.actor_id : null, actorName: typeof row.actor_name === 'string' ? row.actor_name : null, actorEmail: typeof row.actor_email === 'string' ? row.actor_email : null, action: String(row.action || ''), entityTarget: String(row.entity_target || ''), details: asRow(row.details), createdAt: String(row.created_at || '') }; });
};

export const getAuditReports = async (): Promise<AuditReport[]> => {
  const { data, error } = await supabase.from('turismo_audit_reports').select('*').order('created_at', { ascending: false });
  if (error) throw errorFor('cargar los informes de auditoría', error.message);
  return (data || []).map((value): AuditReport => { const row = asRow(value); return { id: String(row.id || ''), auditorId: String(row.auditor_id || ''), title: String(row.title || ''), periodStart: typeof row.period_start === 'string' ? row.period_start : null, periodEnd: typeof row.period_end === 'string' ? row.period_end : null, summary: String(row.summary || ''), findings: Array.isArray(row.findings) ? row.findings.filter((item): item is string => typeof item === 'string') : [], createdAt: String(row.created_at || '') }; });
};

export const createAuditReport = async (title: string, periodStart: string | null, periodEnd: string | null, summary: string, findings: string[]): Promise<string> => {
  const { data, error } = await supabase.rpc('turismo_create_audit_report', { p_title: title, p_period_start: periodStart || null, p_period_end: periodEnd || null, p_summary: summary, p_findings: findings });
  if (error) throw errorFor('crear el informe de auditoría', error.message);
  return typeof data === 'string' ? data : String(asRow(data).id || data);
};

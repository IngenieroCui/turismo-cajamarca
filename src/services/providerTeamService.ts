import { supabase } from '../lib/supabase/client';
import type { ProviderCollaborator, ProviderContext, ProviderMemberRole, ProviderTeamPermission, ProviderCollaboratorStatus } from '../types/providerTeam.types';

type Row = Record<string, unknown>;
const asRow = (value: unknown): Row => value && typeof value === 'object' ? value as Row : {};
const permissionList = (value: unknown): ProviderTeamPermission[] => Array.isArray(value) ? value.filter((item): item is ProviderTeamPermission => ['catalog', 'availability', 'promotions', 'reservations', 'reviews', 'finance', 'support'].includes(String(item))) : [];
const mapContext = (value: unknown): ProviderContext => {
  const row = asRow(value);
  return { providerId: String(row.provider_id || ''), businessName: String(row.business_name || 'Negocio turístico'), isOwner: Boolean(row.is_owner), memberRole: row.member_role as ProviderMemberRole, permissions: permissionList(row.permissions) };
};
const mapCollaborator = (value: unknown): ProviderCollaborator => {
  const row = asRow(value);
  return { providerId: String(row.provider_id || ''), collaboratorId: String(row.collaborator_id || ''), fullName: typeof row.full_name === 'string' ? row.full_name : null, email: String(row.email || ''), memberRole: row.member_role as Exclude<ProviderMemberRole, 'owner'>, permissions: permissionList(row.permissions), status: row.status as ProviderCollaboratorStatus, createdAt: String(row.created_at || ''), updatedAt: String(row.updated_at || '') };
};
const rpcError = (operation: string, error: { message?: string } | null): Error => new Error(`No fue posible ${operation}: ${error?.message || 'error desconocido de Supabase.'}`);

export const getMyProviderContexts = async (): Promise<ProviderContext[]> => {
  const { data, error } = await supabase.rpc('turismo_get_my_provider_contexts');
  if (error) throw rpcError('cargar tus negocios', error);
  return (Array.isArray(data) ? data : []).map(mapContext);
};

export const getProviderCollaborators = async (providerId: string): Promise<ProviderCollaborator[]> => {
  const { data, error } = await supabase.rpc('turismo_get_provider_collaborators', { p_provider_id: providerId });
  if (error) throw rpcError('cargar el equipo', error);
  return (Array.isArray(data) ? data : []).map(mapCollaborator);
};

export const addProviderCollaborator = async (email: string, memberRole: Exclude<ProviderMemberRole, 'owner'>, permissions: ProviderTeamPermission[], providerId?: string): Promise<void> => {
  const { error } = await supabase.rpc('turismo_add_provider_collaborator', { p_email: email, p_member_role: memberRole, p_permissions: permissions, p_provider_id: providerId || null });
  if (error) throw rpcError('agregar el colaborador', error);
};

export const updateProviderCollaborator = async (collaboratorId: string, memberRole: Exclude<ProviderMemberRole, 'owner'>, permissions: ProviderTeamPermission[], status: ProviderCollaboratorStatus, providerId?: string): Promise<void> => {
  const { error } = await supabase.rpc('turismo_update_provider_collaborator', { p_collaborator_id: collaboratorId, p_member_role: memberRole, p_permissions: permissions, p_status: status, p_provider_id: providerId || null });
  if (error) throw rpcError('actualizar el colaborador', error);
};

export const removeProviderCollaborator = async (collaboratorId: string, providerId?: string): Promise<void> => {
  const { error } = await supabase.rpc('turismo_remove_provider_collaborator', { p_collaborator_id: collaboratorId, p_provider_id: providerId || null });
  if (error) throw rpcError('remover el colaborador', error);
};

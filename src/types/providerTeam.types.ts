export type ProviderTeamPermission = 'catalog' | 'availability' | 'promotions' | 'reservations' | 'reviews' | 'finance' | 'support';
export type ProviderMemberRole = 'owner' | 'manager' | 'colaborador';
export type ProviderCollaboratorStatus = 'active' | 'inactive';

export interface ProviderContext {
  providerId: string;
  businessName: string;
  isOwner: boolean;
  memberRole: ProviderMemberRole;
  permissions: ProviderTeamPermission[];
}

export interface ProviderCollaborator {
  providerId: string;
  collaboratorId: string;
  fullName: string | null;
  email: string;
  memberRole: Exclude<ProviderMemberRole, 'owner'>;
  permissions: ProviderTeamPermission[];
  status: ProviderCollaboratorStatus;
  createdAt: string;
  updatedAt: string;
}

export type AccountDeletionRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'processed';

export interface AccountDeletionRequest {
  id: string;
  userId: string;
  email: string | null;
  fullName: string | null;
  reason: string | null;
  status: AccountDeletionRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
}

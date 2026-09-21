export type SupportTicketCategory = 'reservation' | 'catalog' | 'account' | 'refund' | 'technical' | 'other';
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  requesterId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  category: SupportTicketCategory;
  reservationId: string | null;
  catalogItemId: string | null;
  subject: string;
  description: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedSupportId: string | null;
  resolutionSummary: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export type RefundRequestStatus = 'pending_financial_processing' | 'rejected' | 'processed';

export interface RefundRequest {
  id: string;
  ticketId: string;
  reservationId: string;
  initiatedBy: string;
  amount: number;
  currency: string;
  reason: string;
  status: RefundRequestStatus;
  createdAt: string;
  processedAt: string | null;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityTarget: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AuditReport {
  id: string;
  auditorId: string;
  title: string;
  periodStart: string | null;
  periodEnd: string | null;
  summary: string;
  findings: string[];
  createdAt: string;
}

export type ComplianceStatus = 'pendiente' | 'verificado' | 'observado' | 'rechazado' | 'vencido' | 'sin_registro';

export interface ProviderCompliance {
  providerId: string;
  fullName: string | null;
  email: string | null;
  ruc: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
  subType: string | null;
  rntNumber: string | null;
  rntStatus: 'verificado' | 'pendiente' | 'vencido' | 'sin_rnt';
  address: string | null;
  commercialRegistrationNumber: string | null;
  commercialStatus: ComplianceStatus;
  commercialExpiresAt: string | null;
  rntExpiresAt: string | null;
  rntVerifiedAt: string | null;
  commercialVerifiedAt: string | null;
  lastRntNote: string | null;
  lastCommercialNote: string | null;
}

export type RegulatoryReviewType = 'rnt' | 'commercial';
export type RegulatoryDecision = 'verified' | 'observed' | 'rejected' | 'expired';

export interface RegulatoryObservation {
  id: string;
  providerId: string;
  reviewerId: string;
  entityType: 'MINCIT' | 'FONTUR' | 'CAMARA_COMERCIO';
  reviewType: RegulatoryReviewType;
  decision: RegulatoryDecision;
  notes: string | null;
  effectiveUntil: string | null;
  createdAt: string;
}

export interface AffiliateCommission {
  reservationId: string;
  catalogItemTitle: string | null;
  status: 'pending' | 'earned' | 'void' | 'paid';
  baseAmount: number;
  commissionAmount: number;
  createdAt: string;
}

export interface AffiliateDashboardData {
  referralCode: string;
  commissionRate: number;
  totalEarnings: number;
  uniqueVisits: number;
  referredReservations: number;
  pendingCommission: number;
  earnedCommission: number;
  paidCommission: number;
  payoutMethod: string | null;
  recentCommissions: AffiliateCommission[];
}

export interface AnalyticsBreakdownItem {
  label: string;
  value: number;
  rating?: number;
}

export interface AnalyticsData {
  period: 'month' | 'quarter' | 'year';
  periodStart: string;
  publishedCatalogCount: number;
  activeProviderCount: number;
  reservationCount: number;
  completedReservations: number;
  cancelledReservations: number;
  uniqueTourists: number;
  publishedReviews: number;
  averageRating: number;
  quotedReservationValue: number;
  catalogByType: AnalyticsBreakdownItem[];
  reservationByStatus: AnalyticsBreakdownItem[];
  topCategories: AnalyticsBreakdownItem[];
  topCatalogItems: AnalyticsBreakdownItem[];
}

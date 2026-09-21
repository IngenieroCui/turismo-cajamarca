export type ExternalPaymentMethod = 'nequi' | 'daviplata' | 'bank_transfer' | 'cash_provider';
export type PaymentRecordStatus = 'declared' | 'verified' | 'rejected' | 'cancelled';

export interface PaymentRecord {
  id: string;
  reservationId: string;
  touristId: string;
  providerId: string | null;
  amount: number;
  currency: string;
  method: ExternalPaymentMethod;
  externalReference: string | null;
  notes: string | null;
  status: PaymentRecordStatus;
  declaredAt: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
}

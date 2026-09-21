const labels = {
  documentType: {
    DNI: 'Cédula de ciudadanía',
    CC: 'Cédula de ciudadanía',
    RUC: 'NIT',
    NIT: 'NIT',
    PASAPORTE: 'Pasaporte',
    CE: 'Cédula de extranjería',
  },
  reservationStatus: { requested: 'Solicitada', confirmed: 'Confirmada', rejected: 'Rechazada', cancelled: 'Cancelada', completed: 'Completada' },
  supportStatus: { open: 'Abierto', in_progress: 'En progreso', waiting_user: 'Esperando usuario', resolved: 'Resuelto', closed: 'Cerrado' },
  supportPriority: { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' },
  supportCategory: { reservation: 'Reserva', catalog: 'Catálogo', account: 'Cuenta', refund: 'Reembolso', technical: 'Técnico', other: 'Otro' },
  paymentMethod: { nequi: 'Nequi', daviplata: 'Daviplata', bank_transfer: 'Transferencia bancaria', cash_provider: 'Efectivo con el prestador' },
  paymentStatus: { declared: 'Declarado', verified: 'Verificado', rejected: 'Rechazado', cancelled: 'Cancelado' },
  complianceStatus: { pendiente: 'Pendiente', verificado: 'Verificado', observado: 'Observado', rechazado: 'Rechazado', vencido: 'Vencido', sin_registro: 'Sin registro', sin_rnt: 'Sin RNT' },
  providerMemberRole: { owner: 'Propietario', manager: 'Administrador del negocio', colaborador: 'Colaborador' },
  providerPermission: { catalog: 'Catálogo', availability: 'Disponibilidad', promotions: 'Promociones', reservations: 'Reservas', reviews: 'Reseñas', finance: 'Finanzas', support: 'Soporte' },
  catalogStatus: { draft: 'Borrador', pending_review: 'Pendiente de revisiÃ³n', published: 'Publicado', rejected: 'Rechazado', suspended: 'Suspendido', archived: 'Archivado' },
  reviewStatus: { pending: 'Pendiente', published: 'Publicada', rejected: 'Rechazada' },
  commissionStatus: { pending: 'Pendiente', earned: 'Ganada', void: 'Anulada', paid: 'Pagada' },
  regulatoryDecision: { verified: 'Verificado', observed: 'Observado', rejected: 'Rechazado', expired: 'Vencido' },
  itinerarySlot: { morning: 'MaÃ±ana', midday: 'MediodÃ­a', afternoon: 'Tarde', evening: 'Noche' },
} as const;

const lookup = (map: Record<string, string>, value: string | null | undefined): string => value ? map[value] || value : '';

export const formatDocumentType = (value?: string | null): string => lookup(labels.documentType, value);
export const formatReservationStatus = (value?: string | null): string => lookup(labels.reservationStatus, value);
export const formatSupportStatus = (value?: string | null): string => lookup(labels.supportStatus, value);
export const formatSupportPriority = (value?: string | null): string => lookup(labels.supportPriority, value);
export const formatSupportCategory = (value?: string | null): string => lookup(labels.supportCategory, value);
export const formatPaymentMethod = (value?: string | null): string => lookup(labels.paymentMethod, value);
export const formatPaymentStatus = (value?: string | null): string => lookup(labels.paymentStatus, value);
export const formatComplianceStatus = (value?: string | null): string => lookup(labels.complianceStatus, value);
export const formatProviderMemberRole = (value?: string | null): string => lookup(labels.providerMemberRole, value);
export const formatProviderPermission = (value?: string | null): string => lookup(labels.providerPermission, value);
export const formatCatalogStatus = (value?: string | null): string => lookup(labels.catalogStatus, value);
export const formatReviewStatus = (value?: string | null): string => lookup(labels.reviewStatus, value);
export const formatCommissionStatus = (value?: string | null): string => lookup(labels.commissionStatus, value);
export const formatRegulatoryDecision = (value?: string | null): string => lookup(labels.regulatoryDecision, value);
export const formatItinerarySlot = (value?: string | null): string => lookup(labels.itinerarySlot, value);

export const formatCop = (value: number | null | undefined): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value ?? 0);

export const formatDate = (value?: string | Date | null): string => value ? new Intl.DateTimeFormat('es-CO').format(new Date(value)) : '—';
export const formatDateTime = (value?: string | Date | null): string => value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export const safeExternalUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const candidate = value.trim();
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (/^[a-z][a-z\d+.-]*:/i.test(candidate)) return null;
  return `https://${candidate}`;
};

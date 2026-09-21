import React, { useCallback, useEffect, useState } from "react";
import {
  Award,
  CalendarDays,
  Check,
  Clock3,
  Eye,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Store,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "../../context/useAuthStore";
import { ROLE_METADATA, UserRoleEnum } from "../../types/auth.types";
import { RoleDrawerLayout } from "../../components/RoleDrawerLayout";
import CatalogItemFormModal from "../../components/provider/CatalogItemFormModal";
import {
  archiveCatalogItem,
  getProviderCatalogItems,
  submitCatalogItem,
} from "../../services/catalogService";
import {
  getProviderReservations,
  getProviderReviews,
  respondToReview,
} from "../../services/marketplaceService";
import type {
  CatalogItem,
  Reservation,
  Review,
} from "../../types/tourism.types";
import type { Promotion } from "../../types/tourism.types";
import AvailabilityManager from "../../components/provider/AvailabilityManager";
import PromotionFormModal from "../../components/provider/PromotionFormModal";
import {
  deactivatePromotion,
  getProviderPromotions,
} from "../../services/promotionService";
import SupportTicketModal from "../../components/support/SupportTicketModal";
import {
  getProviderCompliance,
  getProviderObservations,
} from "../../services/regulatoryService";
import type {
  ProviderCompliance,
  RegulatoryObservation,
} from "../../types/operations.types";
import { useProviderContext } from "../../context/useProviderContext";
import { usePlatformConfig } from "../../context/usePlatformConfig";
import ProviderBusinessSwitcher from "../../components/provider/ProviderBusinessSwitcher";
import ProviderCollaboratorModal from "../../components/provider/ProviderCollaboratorModal";
import {
  getProviderCollaborators,
  removeProviderCollaborator,
} from "../../services/providerTeamService";
import type { ProviderCollaborator } from "../../types/providerTeam.types";
import {
  getProviderPaymentRecords,
  reviewExternalPayment,
} from "../../services/paymentService";
import type { PaymentRecord } from "../../types/payment.types";
import ReservationActionModal from "../../components/provider/ReservationActionModal";
import PaymentReviewModal from "../../components/provider/PaymentReviewModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SafeImage from "../../components/ui/SafeImage";
import {
  formatPaymentMethod,
  formatPaymentStatus,
  formatReservationStatus,
} from "../../utils/uiFormatters";
import RoleWorkspaceHeader from "../../components/workspace/RoleWorkspaceHeader";
import JourneyChecklist from "../../components/workspace/JourneyChecklist";
import QuickActionCard from "../../components/workspace/QuickActionCard";
import SectionTabs from "../../components/workspace/SectionTabs";
import WorkspaceSection from "../../components/workspace/WorkspaceSection";
import StatusBadge from "../../components/ui/StatusBadge";
import { formatCatalogStatus } from "../../utils/uiFormatters";
import ModalShell from "../../components/ui/ModalShell";

type ProviderTab =
  | "resumen"
  | "catalogo"
  | "disponibilidad"
  | "promociones"
  | "reservas"
  | "resenas"
  | "equipo"
  | "finanzas";

const statusLabels: Record<CatalogItem["status"], string> = {
  draft: "Borrador",
  pending_review: "Pendiente de revisión",
  published: "Publicado",
  rejected: "Rechazado",
  suspended: "Suspendido",
  archived: "Archivado",
};

const statusClasses: Record<CatalogItem["status"], string> = {
  draft: "text-slate-300 bg-slate-500/10 border-slate-500/20",
  pending_review: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  published: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  rejected: "text-red-300 bg-red-500/10 border-red-500/20",
  suspended: "text-orange-300 bg-orange-500/10 border-orange-500/20",
  archived: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

const reservationLabels: Record<Reservation["status"], string> = {
  requested: "Solicitada",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  completed: "Completada",
};

interface ProviderCatalogCardProps {
  item: CatalogItem;
  canManage: boolean;
  actionId: string | null;
  onEdit: () => void;
  onSubmit: () => void;
  onArchive: () => void;
}

const ProviderCatalogCard: React.FC<ProviderCatalogCardProps> = ({
  item,
  canManage,
  actionId,
  onEdit,
  onSubmit,
  onArchive,
}) => (
  <article className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] flex gap-4">
    <div className="w-24 h-20 rounded-xl overflow-hidden bg-[var(--bg-primary)] shrink-0">
      {item.coverImageUrl && (
        <SafeImage
          src={item.coverImageUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
      )}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
            {item.title}
          </h4>
          <p className="text-[11px] text-[var(--text-muted)]">
            {item.itemType} · {item.category || "Sin categoría"}
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded-full border text-[10px] font-bold whitespace-nowrap ${statusClasses[item.status]}`}
        >
          {formatCatalogStatus(item.status)}
        </span>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-2">
        {item.priceLabel ||
          (item.priceFrom !== null
            ? `Desde ${item.priceFrom.toLocaleString("es-CO")} ${item.currency}`
            : "Precio por consultar")}{" "}
        · {new Date(item.createdAt).toLocaleDateString("es-CO")}
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        {(item.status === "draft" || item.status === "rejected") &&
          canManage && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="text-[11px] font-bold text-blue-300 cursor-pointer"
              >
                <Pencil className="w-3 h-3 inline mr-1" />
                Editar
              </button>
              <button
                type="button"
                disabled={actionId === item.id}
                onClick={onSubmit}
                className="text-[11px] font-bold text-amber-300 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3 h-3 inline mr-1" />
                Enviar a revisión
              </button>
              <button
                type="button"
                disabled={actionId === item.id}
                onClick={onArchive}
                className="text-[11px] font-bold text-red-300 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3 inline mr-1" />
                Archivar
              </button>
            </>
          )}
        {item.status === "published" && (
          <>
            <button
              type="button"
              className="text-[11px] font-bold text-blue-300 cursor-pointer"
            >
              <Eye className="w-3 h-3 inline mr-1" />
              Ver
            </button>
            {canManage && (
              <button
                type="button"
                disabled={actionId === item.id}
                onClick={onArchive}
                className="text-[11px] font-bold text-red-300 cursor-pointer disabled:opacity-50"
              >
                Archivar
              </button>
            )}
          </>
        )}
        {item.status === "pending_review" && (
          <span className="text-[11px] text-[var(--text-muted)]">
            En revisión
          </span>
        )}
        {item.status === "suspended" && (
          <span className="text-[11px] text-orange-300">
            {item.moderationReason || "Suspendido"}
          </span>
        )}
        {item.status === "archived" && (
          <span className="text-[11px] text-[var(--text-muted)]">
            Solo lectura
          </span>
        )}
      </div>
    </div>
  </article>
);

interface ProviderReservationCardProps {
  reservation: Reservation;
  actionId: string | null;
  onAction: (action: "confirm" | "reject" | "complete") => void;
}

const ProviderReservationCard: React.FC<ProviderReservationCardProps> = ({
  reservation,
  actionId,
  onAction,
}) => (
  <article className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 className="text-sm font-bold text-[var(--text-primary)]">
          {reservation.item?.title || "Oferta turística"}
        </h4>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          {reservation.reservationDate}
          {reservation.endDate ? ` - ${reservation.endDate}` : ""} ·{" "}
          {reservation.guests} persona{reservation.guests === 1 ? "" : "s"}
        </p>
      </div>
      <span className="px-2.5 py-1 rounded-full border text-[10px] font-bold text-blue-300 border-blue-500/20 bg-blue-500/10">
        {formatReservationStatus(reservation.status)}
      </span>
    </div>
    {reservation.notes && (
      <p className="text-xs text-[var(--text-secondary)] mt-3">
        <strong>Notas:</strong> {reservation.notes}
      </p>
    )}
    {reservation.promotionCode && (
      <p className="text-xs text-amber-300 mt-2">
        <strong>Promoción solicitada:</strong> {reservation.promotionCode}
      </p>
    )}
    {reservation.quotedAmount !== null && (
      <p className="text-xs text-[var(--color-primary-light)] mt-2">
        Cotización: {reservation.quotedAmount.toLocaleString("es-CO")}{" "}
        {reservation.currency}
      </p>
    )}
    <div className="flex flex-wrap gap-2 mt-3">
      {reservation.status === "requested" && (
        <>
          <button
            type="button"
            disabled={actionId === reservation.id}
            onClick={() => onAction("confirm")}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            Confirmar
          </button>
          <button
            type="button"
            disabled={actionId === reservation.id}
            onClick={() => onAction("reject")}
            className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            Rechazar
          </button>
        </>
      )}
      {reservation.status === "confirmed" && (
        <button
          type="button"
          disabled={actionId === reservation.id}
          onClick={() => onAction("complete")}
          className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
        >
          Marcar como completada
        </button>
      )}
    </div>
  </article>
);

const ProviderReviewResponseModal: React.FC<{
  review: Review;
  onClose: () => void;
  onSaved: () => void;
}> = ({ review, onClose, onSaved }) => {
  const [response, setResponse] = useState(review.providerResponse || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await respondToReview(review.id, response);
      onSaved();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No fue posible responder.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open
      title="Responder reseña"
      description={`${review.itemTitle || "Experiencia"} · ${review.rating}/5`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-light)] px-4 py-2 text-xs"
          >
            Cancelar
          </button>
          <button
            disabled={saving}
            type="submit"
            form="review-response-form"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Publicar respuesta"}
          </button>
        </div>
      }
    >
      <form
        id="review-response-form"
        onSubmit={(event) => void save(event)}
        className="space-y-4"
      >
        {error && (
          <p role="alert" className="text-xs text-red-300">
            {error}
          </p>
        )}
        <label
          htmlFor="review-response"
          className="block text-xs font-semibold"
        >
          Respuesta
          <textarea
            id="review-response"
            required
            rows={5}
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            placeholder="Escribe una respuesta para el turista..."
            className="mt-1 w-full resize-none rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
          />
        </label>
      </form>
    </ModalShell>
  );
};

export const PrestadorTuristicoPage: React.FC = () => {
  void statusLabels;
  void reservationLabels;
  const { user, profile } = useAuthStore();
  const {
    contexts,
    activeProviderId,
    initialized: contextInitialized,
    load: loadContexts,
  } = useProviderContext();
  const activeContext =
    contexts.find((context) => context.providerId === activeProviderId) ||
    contexts[0];
  const promotionsEnabled = usePlatformConfig(
    (state) => state.promotionsEnabled,
  );
  const canProvider = useCallback(
    (
      permission:
        | "catalog"
        | "availability"
        | "promotions"
        | "reservations"
        | "reviews"
        | "finance"
        | "support",
    ): boolean =>
      Boolean(
        activeContext?.isOwner ||
          activeContext?.permissions.includes(permission),
      ),
    [activeContext],
  );
  const meta = ROLE_METADATA[UserRoleEnum.PRESTADOR_TURISTICO];
  const [tab, setTab] = useState<ProviderTab>("resumen");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [responseReview, setResponseReview] = useState<Review | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [compliance, setCompliance] = useState<ProviderCompliance | null>(null);
  const [observations, setObservations] = useState<RegulatoryObservation[]>([]);
  const [supportOpen, setSupportOpen] = useState(false);
  const [promotionFormOpen, setPromotionFormOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null,
  );
  const [collaborators, setCollaborators] = useState<ProviderCollaborator[]>(
    [],
  );
  const [collaboratorModalOpen, setCollaboratorModalOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] =
    useState<ProviderCollaborator | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [reservationAction, setReservationAction] = useState<{
    reservation: Reservation;
    action: "confirm" | "reject" | "complete";
  } | null>(null);
  const [paymentReview, setPaymentReview] = useState<{
    payment: PaymentRecord;
    action: "verify" | "reject";
  } | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const load = useCallback(async () => {
    if (!activeProviderId) return;
    setLoading(true);
    setError(null);
    try {
      const [
        catalog,
        reservationRows,
        reviewRows,
        promotionRows,
        complianceRow,
        observationRows,
        teamRows,
        paymentRows,
      ] = await Promise.all([
        getProviderCatalogItems(activeProviderId),
        canProvider("reservations")
          ? getProviderReservations(activeProviderId)
          : Promise.resolve([]),
        canProvider("reviews")
          ? getProviderReviews(activeProviderId)
          : Promise.resolve([]),
        canProvider("promotions")
          ? getProviderPromotions(activeProviderId)
          : Promise.resolve([]),
        user && activeContext?.isOwner
          ? getProviderCompliance(user.id)
          : Promise.resolve(null),
        user && activeContext?.isOwner
          ? getProviderObservations(user.id)
          : Promise.resolve([]),
        activeContext?.isOwner
          ? getProviderCollaborators(activeProviderId)
          : Promise.resolve([]),
        canProvider("finance")
          ? getProviderPaymentRecords(activeProviderId)
          : Promise.resolve([]),
      ]);
      setItems(catalog);
      setReservations(reservationRows);
      setReviews(reviewRows);
      setPromotions(promotionRows);
      setCompliance(complianceRow);
      setObservations(observationRows);
      setCollaborators(teamRows);
      setPayments(paymentRows);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el panel del prestador.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeContext, activeProviderId, canProvider, user]);

  useEffect(() => {
    if (!contextInitialized) void loadContexts();
  }, [contextInitialized, loadContexts]);
  useEffect(() => {
    if (contextInitialized) {
      const timer = window.setTimeout(() => {
        void load();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [contextInitialized, load]);
  useEffect(() => {
    const allowed =
      tab === "resumen" ||
      (tab === "catalogo" && canProvider("catalog")) ||
      (tab === "disponibilidad" && canProvider("availability")) ||
      (tab === "promociones" && canProvider("promotions")) ||
      (tab === "reservas" && canProvider("reservations")) ||
      (tab === "resenas" && canProvider("reviews")) ||
      (tab === "equipo" && Boolean(activeContext?.isOwner)) ||
      (tab === "finanzas" && canProvider("finance"));
    if (!allowed) {
      const timer = window.setTimeout(() => setTab("resumen"), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [activeContext?.isOwner, canProvider, tab]);

  const runCatalogAction = async (id: string, action: "submit" | "archive") => {
    setActionId(id);
    setError(null);
    try {
      if (action === "submit")
        await submitCatalogItem(id, activeProviderId || undefined);
      else await archiveCatalogItem(id, activeProviderId || undefined);
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar la oferta.",
      );
    } finally {
      setActionId(null);
    }
  };

  const deactivate = async (promotion: Promotion) => {
    setConfirmation({
      title: "Desactivar promoción",
      message: "¿Deseas desactivar esta promoción?",
      onConfirm: () => {
        setConfirmation(null);
        void doDeactivate(promotion);
      },
    });
  };
  const doDeactivate = async (promotion: Promotion) => {
    setActionId(promotion.id);
    setError(null);
    try {
      await deactivatePromotion(promotion.id, activeProviderId || undefined);
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible desactivar la promoción.",
      );
    } finally {
      setActionId(null);
    }
  };

  const runReservationAction = async (
    reservation: Reservation,
    action: "confirm" | "reject" | "complete",
  ) => {
    setReservationAction({ reservation, action });
  };

  const published = items.filter((item) => item.status === "published");
  const activeReservations = reservations.filter(
    (reservation) =>
      reservation.status === "requested" || reservation.status === "confirmed",
  );
  const averageRating = reviews.length
    ? (
        reviews.reduce((total, review) => total + review.rating, 0) /
        reviews.length
      ).toFixed(1)
    : "0.0";
  const tabs: Array<[ProviderTab, string]> = [
    ["resumen", "Resumen"],
    ...(canProvider("catalog")
      ? [["catalogo", "Catálogo"] as [ProviderTab, string]]
      : []),
    ...(canProvider("availability")
      ? [["disponibilidad", "Disponibilidad"] as [ProviderTab, string]]
      : []),
    ...(canProvider("promotions")
      ? [["promociones", "Promociones"] as [ProviderTab, string]]
      : []),
    ...(canProvider("reservations")
      ? [["reservas", "Reservas"] as [ProviderTab, string]]
      : []),
    ...(canProvider("reviews")
      ? [["resenas", "Reseñas"] as [ProviderTab, string]]
      : []),
    ...(activeContext?.isOwner
      ? [["equipo", "Equipo"] as [ProviderTab, string]]
      : []),
    ...(canProvider("finance")
      ? [["finanzas", "Finanzas"] as [ProviderTab, string]]
      : []),
  ];
  const stats = [
    ["Total catálogo", items.length, Store],
    ["Publicados", published.length, Check],
    [
      "Pendientes",
      items.filter((item) => item.status === "pending_review").length,
      Clock3,
    ],
    ["Reservas activas", activeReservations.length, CalendarDays],
    ["Rating promedio", averageRating, Award],
  ] as const;

  const readinessSteps = [
    {
      id: "profile",
      label: "Perfil empresarial",
      description: "Tu negocio tiene una identidad comercial definida.",
      complete: Boolean(
        activeContext &&
          (compliance?.razonSocial ||
            profile?.razon_social ||
            profile?.nombre_comercial),
      ),
    },
    {
      id: "rnt",
      label: "RNT",
      description:
        compliance?.rntNumber ||
        profile?.rnt_number ||
        "Aún no hay un número registrado.",
      complete:
        compliance?.rntStatus === "verificado" ||
        profile?.rnt_status === "verificado",
    },
    {
      id: "first-offer",
      label: "Primera oferta",
      description: "Crea inventario para que el catálogo pueda revisarlo.",
      complete: items.length > 0,
    },
    {
      id: "published",
      label: "Contenido publicado",
      description: "Al menos una oferta está visible para viajeros.",
      complete: published.length > 0,
    },
    {
      id: "availability",
      label: "Disponibilidad",
      description:
        "Las ofertas reservables están listas para recibir solicitudes.",
      complete: items.some((item) => item.isReservable),
    },
    {
      id: "operation",
      label: "Operación",
      description: "Ya existe actividad de reservas en el negocio.",
      complete: reservations.length > 0,
    },
    {
      id: "reputation",
      label: "Reputación",
      description: "Tus experiencias ya tienen reseñas publicadas.",
      complete: reviews.length > 0,
    },
  ];
  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <RoleWorkspaceHeader
          eyebrow="Espacio de trabajo del prestador"
          title={`${activeContext?.isOwner ? "Gestión" : "Operación"} de ${compliance?.razonSocial || profile?.nombre_comercial || profile?.razon_social || "tu negocio"}`}
          description={
            activeContext?.isOwner
              ? "Administra la presencia, operación y atención de tu negocio."
              : "Estás trabajando con permisos delegados para este negocio."
          }
          roleLabel={activeContext?.isOwner ? "Propietario" : "Colaborador"}
          roleBadgeClass={meta.badgeColor}
          icon={Store}
          contextSlot={<ProviderBusinessSwitcher />}
          primaryAction={
            activeContext?.isOwner || canProvider("support") ? (
              <button
                type="button"
                onClick={() => setSupportOpen(true)}
                className="min-h-10 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white"
              >
                Solicitar soporte
              </button>
            ) : undefined
          }
        />
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] my-0">
                {profile?.full_name || user?.email}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {user?.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(activeContext?.isOwner || canProvider("support")) && (
                <button
                  type="button"
                  onClick={() => setSupportOpen(true)}
                  className="px-3 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold cursor-pointer"
                >
                  Solicitar soporte
                </button>
              )}
              <span
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.badgeColor}`}
              >
                {meta.label}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20">
              <span className="text-xs text-teal-400 font-semibold">
                Subtipo de servicio:{" "}
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase">
                {profile?.sub_role || compliance?.subType || "No asignado"}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20">
              <span className="text-xs text-teal-400 font-semibold">RNT: </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {compliance?.rntStatus ||
                  (profile?.rnt_number ? "pendiente" : "sin_rnt")}
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                {compliance?.rntNumber || profile?.rnt_number || "Sin número"}
                {compliance?.rntExpiresAt
                  ? ` · vence ${compliance.rntExpiresAt}`
                  : ""}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <span className="text-xs text-blue-300 font-semibold">
                Registro mercantil:{" "}
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {compliance?.commercialStatus || "pendiente"}
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                {compliance?.commercialRegistrationNumber || "Sin número"}
                {compliance?.commercialExpiresAt
                  ? ` · vence ${compliance.commercialExpiresAt}`
                  : ""}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs text-amber-300 font-semibold">
                Última observación
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                {observations[0]?.notes || "No hay observaciones regulatorias."}
              </p>
            </div>
          </div>
        </div>

        <SectionTabs
          items={tabs.map(([id, label]) => ({ id, label }))}
          active={tab}
          onChange={(value) => setTab(value as ProviderTab)}
        />
        {error && (
          <p className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            {error}
          </p>
        )}
        {loading && (
          <p className="text-xs text-[var(--text-secondary)]">
            Cargando panel...
          </p>
        )}
        {!loading && tab === "resumen" && (
          <>
            {activeContext?.isOwner ? (
              <JourneyChecklist
                title="Estado de tu negocio"
                description="Una vista real de la preparación y actividad de tu negocio."
                steps={readinessSteps}
              />
            ) : (
              <WorkspaceSection
                title="Tu acceso en este negocio"
                description="Estas son las operaciones que puedes realizar con tu acceso delegado."
              >
                <div className="flex flex-wrap gap-2">
                  {(activeContext?.permissions || []).map((permission) => (
                    <StatusBadge
                      key={permission}
                      label={permission}
                      tone="info"
                    />
                  ))}
                </div>
              </WorkspaceSection>
            )}
            <WorkspaceSection
              title="Siguientes acciones"
              description="Accede directamente a la operación que necesita tu atención."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {canProvider("catalog") && (
                  <QuickActionCard
                    title="Nueva oferta"
                    description="Publica una experiencia para revisión."
                    actionLabel="Crear oferta"
                    icon={Plus}
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                    tone="text-emerald-300"
                  />
                )}
                {canProvider("availability") && (
                  <QuickActionCard
                    title="Disponibilidad"
                    description="Configura cuándo puedes recibir solicitudes."
                    actionLabel="Configurar disponibilidad"
                    icon={CalendarDays}
                    onClick={() => setTab("disponibilidad")}
                    tone="text-blue-300"
                  />
                )}
                {promotionsEnabled && canProvider("promotions") && (
                  <QuickActionCard
                    title="Promoción"
                    description="Crea un beneficio para tus viajeros."
                    actionLabel="Crear promoción"
                    icon={Plus}
                    onClick={() => {
                      setEditingPromotion(null);
                      setPromotionFormOpen(true);
                    }}
                    tone="text-amber-300"
                  />
                )}
                {canProvider("reservations") && (
                  <QuickActionCard
                    title="Reservas"
                    description="Revisa solicitudes y responde a viajeros."
                    actionLabel="Ver reservas"
                    icon={CalendarDays}
                    onClick={() => setTab("reservas")}
                    tone="text-purple-300"
                  />
                )}
                {canProvider("reviews") && (
                  <QuickActionCard
                    title="Reseñas"
                    description="Consulta y responde la reputación de tus ofertas."
                    actionLabel="Ver reseñas"
                    icon={MessageSquare}
                    onClick={() => setTab("resenas")}
                    tone="text-rose-300"
                  />
                )}
                {canProvider("finance") && (
                  <QuickActionCard
                    title="Finanzas"
                    description="Consulta pagos externos informados por las partes."
                    actionLabel="Ver finanzas"
                    icon={Store}
                    onClick={() => setTab("finanzas")}
                    tone="text-cyan-300"
                  />
                )}
              </div>
            </WorkspaceSection>
          </>
        )}

        {!loading && tab === "resumen" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {stats.map(([label, value, Icon]) => (
                <div
                  key={label}
                  className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)]"
                >
                  <Icon className="w-5 h-5 text-emerald-400" />
                  <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">
                    {value}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
            <p className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">
              Gestiona tus ofertas desde Catálogo, atiende solicitudes en
              Reservas y responde las opiniones publicadas.
            </p>
          </div>
        )}

        {!loading && tab === "catalogo" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] my-0">
                  Mi catálogo
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Las nuevas ofertas empiezan como borrador.
                </p>
              </div>
              {canProvider("catalog") && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nueva oferta
                </button>
              )}
            </div>
            {items.length === 0 && (
              <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">
                Aún no tienes ofertas.
              </p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map((item) => (
                <ProviderCatalogCard
                  key={item.id}
                  item={item}
                  canManage={canProvider("catalog")}
                  actionId={actionId}
                  onEdit={() => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                  onSubmit={() => void runCatalogAction(item.id, "submit")}
                  onArchive={() => void runCatalogAction(item.id, "archive")}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && tab === "disponibilidad" && (
          <AvailabilityManager
            items={items}
            providerId={activeProviderId}
            onError={setError}
          />
        )}

        {!loading && tab === "promociones" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold my-0">Promociones</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {promotionsEnabled
                    ? "Los beneficios activos se muestran a los turistas."
                    : "Las promociones están deshabilitadas temporalmente."}
                </p>
              </div>
              {promotionsEnabled && canProvider("promotions") && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPromotion(null);
                    setPromotionFormOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="inline w-4 h-4 mr-1" />
                  Nueva promoción
                </button>
              )}
            </div>
            {promotions.length === 0 && (
              <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">
                No tienes promociones activas.
              </p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {promotions.map((promotion) => (
                <article
                  key={promotion.id}
                  className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold">{promotion.title}</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {items.find((item) => item.id === promotion.itemId)
                          ?.title || "Oferta"}{" "}
                        ·{" "}
                        {promotion.promotionType === "percentage"
                          ? `${promotion.discountValue}%`
                          : promotion.promotionType === "fixed"
                            ? `${promotion.discountValue?.toLocaleString("es-CO")} COP`
                            : "Beneficio"}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold ${promotion.isActive && new Date(promotion.endsAt) >= new Date() ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-300"}`}
                    >
                      {promotion.isActive &&
                      new Date(promotion.endsAt) >= new Date()
                        ? "Activa"
                        : "Expirada/inactiva"}
                    </span>
                  </div>
                  {promotion.code && (
                    <p className="text-xs text-amber-300 mt-2">
                      Código: {promotion.code}
                    </p>
                  )}
                  <p className="text-[11px] text-[var(--text-muted)] mt-2">
                    {new Date(promotion.startsAt).toLocaleDateString("es-CO")} -{" "}
                    {new Date(promotion.endsAt).toLocaleDateString("es-CO")}
                  </p>
                  {promotionsEnabled && canProvider("promotions") && (
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPromotion(promotion);
                          setPromotionFormOpen(true);
                        }}
                        className="text-xs font-bold text-blue-300 cursor-pointer"
                      >
                        Editar
                      </button>
                      {promotion.isActive && (
                        <button
                          type="button"
                          disabled={actionId === promotion.id}
                          onClick={() => void deactivate(promotion)}
                          className="text-xs font-bold text-red-300 cursor-pointer disabled:opacity-50"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {!loading && tab === "reservas" && (
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] my-0">
              Reservas recibidas
            </h3>
            {reservations.length === 0 && (
              <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">
                No hay reservas para gestionar.
              </p>
            )}
            {reservations.map((reservation) => (
              <ProviderReservationCard
                key={reservation.id}
                reservation={reservation}
                actionId={actionId}
                onAction={(action) =>
                  void runReservationAction(reservation, action)
                }
              />
            ))}
          </section>
        )}

        {!loading && tab === "resenas" && (
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] my-0">
              Reseñas de mis ofertas
            </h3>
            {reviews.length === 0 && (
              <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">
                Todavía no hay reseñas publicadas.
              </p>
            )}
            {reviews.map((review) => (
              <article
                key={review.id}
                className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {review.itemTitle || "Oferta turística"}
                    </h4>
                    <p className="text-xs text-amber-300 mt-1">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)} ·{" "}
                      {review.touristName || "Turista"}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(review.createdAt).toLocaleDateString("es-CO")}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-[var(--text-secondary)] mt-3">
                    {review.comment}
                  </p>
                )}
                {review.providerResponse && (
                  <p className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                    <strong>Tu respuesta:</strong> {review.providerResponse}
                  </p>
                )}
                {!review.providerResponse && (
                  <button
                    type="button"
                    onClick={() => setResponseReview(review)}
                    className="mt-3 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-xs font-bold text-[var(--text-primary)] cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                    Responder
                  </button>
                )}
              </article>
            ))}
          </section>
        )}

        {!loading && tab === "equipo" && activeContext?.isOwner && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold my-0">Equipo interno</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Gestiona accesos delegados para este negocio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingCollaborator(null);
                  setCollaboratorModalOpen(true);
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"
              >
                <Plus className="mr-1 inline h-4 w-4" />
                Agregar colaborador
              </button>
            </div>
            {collaborators.length === 0 && (
              <p className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-6 text-sm text-[var(--text-secondary)]">
                Aún no hay colaboradores.
              </p>
            )}
            {collaborators.map((collaborator) => (
              <article
                key={collaborator.collaboratorId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4"
              >
                <div>
                  <p className="text-sm font-bold">
                    {collaborator.fullName || collaborator.email}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {collaborator.email} · {collaborator.memberRole} ·{" "}
                    {collaborator.status}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {collaborator.permissions.join(", ") ||
                      "Sin permisos delegados"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCollaborator(collaborator);
                      setCollaboratorModalOpen(true);
                    }}
                    className="rounded-xl border border-[var(--border-light)] px-3 py-2 text-xs font-bold"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmation({
                        title: "Remover colaborador",
                        message:
                          "¿Deseas remover este colaborador del negocio?",
                        onConfirm: () => {
                          setConfirmation(null);
                          void removeProviderCollaborator(
                            collaborator.collaboratorId,
                            activeProviderId || undefined,
                          ).then(() => load());
                        },
                      })
                    }
                    className="rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300"
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
        {!loading && tab === "finanzas" && canProvider("finance") && (
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-bold my-0">Finanzas</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Valor de pagos externos verificados. Turismo Cajamarca no
                procesa dinero.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                <p className="text-2xl font-black">
                  {
                    payments.filter((payment) => payment.status === "declared")
                      .length
                  }
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Pagos declarados
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                <p className="text-2xl font-black">
                  {
                    payments.filter((payment) => payment.status === "verified")
                      .length
                  }
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Pagos verificados
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                <p className="text-2xl font-black">
                  {
                    payments.filter((payment) => payment.status === "rejected")
                      .length
                  }
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Pagos rechazados
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                <p className="text-2xl font-black">
                  {payments
                    .filter((payment) => payment.status === "verified")
                    .reduce((total, payment) => total + payment.amount, 0)
                    .toLocaleString("es-CO")}{" "}
                  COP
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Valor de pagos externos verificados
                </p>
              </div>
            </div>
            {payments.map((payment) => (
              <article
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4"
              >
                <div>
                  <p className="text-sm font-bold">
                    {payment.amount.toLocaleString("es-CO")} {payment.currency}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatPaymentMethod(payment.method)} ·{" "}
                    {formatPaymentStatus(payment.status)}
                  </p>
                </div>
                {payment.status === "declared" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void reviewExternalPayment(payment.id, "verify").then(
                          () => load(),
                        )
                      }
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                    >
                      Verificar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentReview({ payment, action: "reject" })
                      }
                      className="rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
        {formOpen && (
          <CatalogItemFormModal
            item={editing}
            onClose={() => setFormOpen(false)}
            onSaved={() => {
              setFormOpen(false);
              void load();
            }}
          />
        )}
        {promotionFormOpen && (
          <PromotionFormModal
            items={items.filter((item) => item.status !== "archived")}
            promotion={editingPromotion}
            onClose={() => setPromotionFormOpen(false)}
            onSaved={() => {
              setPromotionFormOpen(false);
              void load();
            }}
          />
        )}
        {responseReview && (
          <ProviderReviewResponseModal
            review={responseReview}
            onClose={() => setResponseReview(null)}
            onSaved={() => {
              setResponseReview(null);
              void load();
            }}
          />
        )}
        {supportOpen && (
          <SupportTicketModal
            reservations={reservations}
            catalogItems={items}
            providerContextId={activeProviderId}
            onClose={() => setSupportOpen(false)}
            onCreated={() => setSupportOpen(false)}
          />
        )}
        {collaboratorModalOpen && activeProviderId && (
          <ProviderCollaboratorModal
            providerId={activeProviderId}
            collaborator={editingCollaborator}
            onClose={() => setCollaboratorModalOpen(false)}
            onSaved={() => {
              setCollaboratorModalOpen(false);
              void load();
            }}
          />
        )}
      </div>
      {reservationAction && (
        <ReservationActionModal
          reservation={reservationAction.reservation}
          action={reservationAction.action}
          activeProviderId={activeProviderId}
          onClose={() => setReservationAction(null)}
          onSaved={() => {
            setReservationAction(null);
            void load();
          }}
        />
      )}
      {paymentReview && (
        <PaymentReviewModal
          payment={paymentReview.payment}
          action={paymentReview.action}
          onClose={() => setPaymentReview(null)}
          onSaved={() => {
            setPaymentReview(null);
            void load();
          }}
        />
      )}
      {confirmation && (
        <ConfirmDialog
          open
          title={confirmation.title}
          message={confirmation.message}
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmation.onConfirm}
        />
      )}
    </RoleDrawerLayout>
  );
};

export default PrestadorTuristicoPage;

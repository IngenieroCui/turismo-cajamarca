import React, { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Users,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  cancelReservation,
  getMyReservations,
  getMyReviews,
} from "../../services/marketplaceService";
import type { Reservation, Review } from "../../types/tourism.types";
import ReviewModal from "../../components/tourist/ReviewModal";
import ExternalPaymentModal from "../../components/tourist/ExternalPaymentModal";
import { getMyPaymentRecords } from "../../services/paymentService";
import type { PaymentRecord } from "../../types/payment.types";
import { usePlatformConfig } from "../../context/usePlatformConfig";
import {
  formatCop,
  formatDate,
  formatReservationStatus,
} from "../../utils/uiFormatters";
import StatusBadge from "../../components/ui/StatusBadge";
import MetricCard from "../../components/workspace/MetricCard";

const reservationTones: Record<
  Reservation["status"],
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  requested: "warning",
  confirmed: "success",
  rejected: "danger",
  cancelled: "neutral",
  completed: "info",
};

interface ReservationCardProps {
  reservation: Reservation;
  hasReview: boolean;
  reviewsEnabled: boolean;
  cancelling: boolean;
  hasPayment: boolean;
  onCancel: () => void;
  onReview: () => void;
  onPayment: () => void;
}
const ReservationCard: React.FC<ReservationCardProps> = ({
  reservation,
  hasReview,
  reviewsEnabled,
  cancelling,
  hasPayment,
  onCancel,
  onReview,
  onPayment,
}) => {
  const canCancel =
    reservation.status === "requested" || reservation.status === "confirmed";
  const canPay =
    Boolean(reservation.quotedAmount && reservation.quotedAmount > 0) &&
    (reservation.status === "confirmed" ||
      reservation.status === "completed") &&
    !hasPayment;
  return (
    <article className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4 shadow-lg sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-24 w-full shrink-0 overflow-hidden rounded-2xl bg-[var(--bg-primary)] sm:w-32">
          {reservation.item?.coverImageUrl && (
            <img
              src={reservation.item.coverImageUrl}
              alt={reservation.item.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="m-0 text-base font-bold">
                {reservation.item?.title || "Oferta turística"}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Solicitada el {formatDate(reservation.createdAt)}
              </p>
            </div>
            <StatusBadge
              label={formatReservationStatus(reservation.status)}
              tone={reservationTones[reservation.status]}
              icon
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4 text-blue-400" />
              {formatDate(reservation.reservationDate)}
              {reservation.endDate
                ? ` - ${formatDate(reservation.endDate)}`
                : ""}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4 text-purple-400" />
              {reservation.guests} persona{reservation.guests === 1 ? "" : "s"}
            </span>
          </div>
          {reservation.providerResponse && (
            <p className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-200">
              <strong>Respuesta del prestador:</strong>{" "}
              {reservation.providerResponse}
            </p>
          )}
          {reservation.quotedAmount !== null && (
            <p className="text-sm font-bold text-[var(--color-primary-light)]">
              Cotización: {formatCop(reservation.quotedAmount)}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {canPay && (
              <button
                type="button"
                onClick={onPayment}
                className="min-h-10 rounded-xl bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-[var(--color-primary-contrast)]"
              >
                Registrar pago externo
              </button>
            )}
            {reservation.status === "completed" &&
              !hasReview &&
              reviewsEnabled && (
                <button
                  type="button"
                  onClick={onReview}
                  className="min-h-10 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950"
                >
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                  Calificar experiencia
                </button>
              )}
            {canCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={cancelling}
                className="min-h-10 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-50"
              >
                <XCircle className="mr-1 inline h-3.5 w-3.5" />
                {cancelling ? "Cancelando..." : "Cancelar"}
              </button>
            )}
            {reservation.status === "completed" && hasReview && (
              <span className="flex items-center gap-1 text-xs text-emerald-300">
                <Clock3 className="h-3.5 w-3.5" />
                Reseña enviada
              </span>
            )}
            {hasPayment && (
              <span className="text-xs text-[var(--text-secondary)]">
                Pago externo registrado
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export const MisReservasPage: React.FC = () => {
  const reviewsEnabled = usePlatformConfig((state) => state.reviewsEnabled);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewReservation, setReviewReservation] =
    useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentReservation, setPaymentReservation] =
    useState<Reservation | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reservationRows, reviewRows, paymentRows] = await Promise.all([
        getMyReservations(),
        getMyReviews(),
        getMyPaymentRecords(),
      ]);
      setReservations(reservationRows);
      setReviews(reviewRows);
      setPayments(paymentRows);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar tus reservas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const cancel = async (id: string) => {
    setCancelling(id);
    setError(null);
    try {
      await cancelReservation(id);
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cancelar la reserva.",
      );
    } finally {
      setCancelling(null);
    }
  };
  const requested = reservations.filter(
    (item) => item.status === "requested",
  ).length;
  const confirmed = reservations.filter(
    (item) => item.status === "confirmed",
  ).length;
  const completed = reservations.filter(
    (item) => item.status === "completed",
  ).length;
  return (
    <div className="space-y-6 pb-8">
      <header className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-6 shadow-xl">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary-light)]">
          Tu viaje
        </p>
        <h1 className="m-0 text-2xl font-bold sm:text-3xl">Mis reservas</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Sigue tus solicitudes, pagos informados y experiencias pendientes de
          calificar.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Solicitadas"
          value={requested}
          icon={Clock3}
          tone="text-amber-300"
        />
        <MetricCard
          label="Confirmadas"
          value={confirmed}
          icon={CheckCircle2}
          tone="text-emerald-300"
        />
        <MetricCard
          label="Completadas"
          value={completed}
          icon={CalendarDays}
          tone="text-blue-300"
        />
      </div>
      {loading && (
        <p className="text-sm text-[var(--text-secondary)]">
          Cargando reservas...
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {!loading && !error && reservations.length === 0 && (
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-6 text-sm text-[var(--text-secondary)]">
          Todavía no tienes reservas.{" "}
          <Link
            to="/turista/atractivos"
            className="font-bold text-[var(--color-primary-light)]"
          >
            Explorar experiencias
          </Link>
        </div>
      )}
      {!loading && reservations.length > 0 && (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              hasReview={reviews.some(
                (review) => review.reservationId === reservation.id,
              )}
              reviewsEnabled={reviewsEnabled}
              cancelling={cancelling === reservation.id}
              hasPayment={payments.some(
                (payment) =>
                  payment.reservationId === reservation.id &&
                  ["declared", "verified"].includes(payment.status),
              )}
              onCancel={() => void cancel(reservation.id)}
              onReview={() => setReviewReservation(reservation)}
              onPayment={() => setPaymentReservation(reservation)}
            />
          ))}
        </div>
      )}
      {reviewReservation && (
        <ReviewModal
          reservationId={reviewReservation.id}
          itemTitle={reviewReservation.item?.title || "Experiencia turística"}
          onClose={() => setReviewReservation(null)}
          onCreated={() => {
            setReviewReservation(null);
            void load();
          }}
        />
      )}
      {paymentReservation && (
        <ExternalPaymentModal
          reservation={paymentReservation}
          onClose={() => setPaymentReservation(null)}
          onCreated={() => {
            setPaymentReservation(null);
            void load();
          }}
        />
      )}
    </div>
  );
};

export default MisReservasPage;

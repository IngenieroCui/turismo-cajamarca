import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import type {
  CatalogAvailability,
  CatalogItem,
  Promotion,
} from "../../types/tourism.types";
import { createReservation } from "../../services/marketplaceService";
import {
  getCatalogAvailability,
  hasExplicitAvailability,
} from "../../services/availabilityService";
import { getActivePromotionsForItem } from "../../services/promotionService";
import ModalShell from "../ui/ModalShell";

interface Props {
  item: CatalogItem;
  onClose: () => void;
  onCreated: () => void;
}
const today = () => new Date().toISOString().slice(0, 10);
const ReservationModal: React.FC<Props> = ({ item, onClose, onCreated }) => {
  const [reservationDate, setReservationDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [notes, setNotes] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [availability, setAvailability] = useState<CatalogAvailability[]>([]);
  const [explicitAvailability, setExplicitAvailability] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  useEffect(() => {
    let mounted = true;
    void Promise.all([
      getCatalogAvailability(item.id),
      hasExplicitAvailability(item.id),
      getActivePromotionsForItem(item.id),
    ])
      .then(([rows, explicit, active]) => {
        if (mounted) {
          setAvailability(rows);
          setExplicitAvailability(explicit);
          setPromotions(active);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoadingOptions(false);
      });
    return () => {
      mounted = false;
    };
  }, [item.id]);
  const availableDates = useMemo(
    () =>
      availability
        .filter((row) => row.isAvailable)
        .map((row) => row.availableDate),
    [availability],
  );
  const selectedAvailability = availability.find(
    (row) => row.availableDate === reservationDate,
  );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createReservation({
        itemId: item.id,
        reservationDate,
        endDate: endDate || null,
        guests,
        notes,
        promotionCode: promotionCode || null,
      });
      setCreated(true);
      onCreated();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible crear la reserva.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell
      open
      title="Solicitud de reserva"
      description={item.title}
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={
        created ? (
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[var(--color-primary)] py-2.5 text-xs font-bold text-white"
          >
            Cerrar
          </button>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border-light)] px-4 py-2.5 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="reservation-form"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
            >
              <CalendarDays className="h-4 w-4" />
              {saving ? "Enviando…" : "Solicitar reserva"}
            </button>
          </div>
        )
      }
    >
      {created ? (
        <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          Tu reserva fue enviada y está pendiente de respuesta del prestador.
        </p>
      ) : (
        <form
          id="reservation-form"
          onSubmit={(event) => void submit(event)}
          className="space-y-4"
        >
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300"
            >
              {error}
            </p>
          )}
          {loadingOptions && (
            <p className="text-xs text-[var(--text-secondary)]">
              Consultando disponibilidad y promociones…
            </p>
          )}
          {explicitAvailability ? (
            <label
              htmlFor="reservation-date"
              className="block text-xs font-semibold"
            >
              Fecha de inicio
              <select
                id="reservation-date"
                required
                value={reservationDate}
                onChange={(event) => setReservationDate(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
              >
                <option value="">Selecciona una fecha</option>
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {new Date(`${date}T00:00:00`).toLocaleDateString("es-CO")}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label
              htmlFor="reservation-date"
              className="block text-xs font-semibold"
            >
              Fecha de inicio
              <input
                id="reservation-date"
                required
                type="date"
                min={today()}
                value={reservationDate}
                onChange={(event) => setReservationDate(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
              />
            </label>
          )}
          {selectedAvailability && (
            <p className="text-xs text-[var(--text-secondary)]">
              {selectedAvailability.capacity !== null
                ? `Capacidad: ${selectedAvailability.capacity} personas.`
                : "Capacidad a confirmar por el prestador."}
            </p>
          )}
          <label
            htmlFor="reservation-end-date"
            className="block text-xs font-semibold"
          >
            Fecha de finalización (opcional)
            <input
              id="reservation-end-date"
              type="date"
              min={reservationDate || today()}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
            />
          </label>
          <label
            htmlFor="reservation-guests"
            className="block text-xs font-semibold"
          >
            Número de personas
            <input
              id="reservation-guests"
              required
              min={1}
              type="number"
              value={guests}
              onChange={(event) =>
                setGuests(Math.max(1, Number(event.target.value)))
              }
              className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
            />
          </label>
          {promotions.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs">
              <p className="font-bold text-amber-200">
                Promociones disponibles
              </p>
              {promotions.map((promotion) => (
                <p
                  key={promotion.id}
                  className="mt-1 text-[var(--text-secondary)]"
                >
                  {promotion.title}
                </p>
              ))}
            </div>
          )}
          <label
            htmlFor="reservation-promotion"
            className="block text-xs font-semibold"
          >
            Código de promoción (opcional)
            <input
              id="reservation-promotion"
              value={promotionCode}
              onChange={(event) => setPromotionCode(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
            />
          </label>
          <label
            htmlFor="reservation-notes"
            className="block text-xs font-semibold"
          >
            Notas (opcional)
            <textarea
              id="reservation-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 w-full resize-none rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
            />
          </label>
        </form>
      )}
    </ModalShell>
  );
};
export default ReservationModal;

import React, { useState } from "react";
import type { Reservation } from "../../types/tourism.types";
import { providerUpdateReservation } from "../../services/marketplaceService";
import ModalShell from "../ui/ModalShell";

interface Props {
  reservation: Reservation;
  action: "confirm" | "reject" | "complete";
  activeProviderId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}
const titles = {
  confirm: "Confirmar reserva",
  reject: "Rechazar reserva",
  complete: "Completar reserva",
};
const ReservationActionModal: React.FC<Props> = ({
  reservation,
  action,
  activeProviderId,
  onClose,
  onSaved,
}) => {
  const [quotedAmount, setQuotedAmount] = useState(
    reservation.quotedAmount?.toString() || "",
  );
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = quotedAmount.trim() ? Number(quotedAmount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      setError("Ingresa un monto válido igual o mayor que cero.");
      return;
    }
    if (action === "reject" && !response.trim()) {
      setError("Indica el motivo del rechazo.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await providerUpdateReservation(
        reservation.id,
        action,
        amount,
        response.trim() || null,
        activeProviderId || undefined,
      );
      onSaved();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible actualizar la reserva.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell
      open
      title={titles[action]}
      onClose={onClose}
      description={reservation.item?.title || "Reserva"}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-light)] px-4 py-2 text-xs font-bold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="reservation-action-form"
            disabled={saving}
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      }
    >
      <form
        id="reservation-action-form"
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-500/10 p-3 text-xs text-red-300"
          >
            {error}
          </p>
        )}
        {action === "confirm" && (
          <label
            htmlFor="quoted-amount"
            className="block text-xs font-semibold"
          >
            Monto cotizado (opcional)
            <input
              id="quoted-amount"
              type="number"
              min="0"
              step="1"
              value={quotedAmount}
              onChange={(event) => setQuotedAmount(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
            />
          </label>
        )}
        <label
          htmlFor="reservation-response"
          className="block text-xs font-semibold"
        >
          {action === "reject"
            ? "Motivo del rechazo"
            : "Respuesta para el turista (opcional)"}
          <textarea
            id="reservation-response"
            required={action === "reject"}
            rows={4}
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            className="mt-1 w-full resize-none rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
          />
        </label>
      </form>
    </ModalShell>
  );
};
export default ReservationActionModal;

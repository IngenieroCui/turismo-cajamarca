import React, { useState } from "react";
import type { SupportTicket } from "../../types/operations.types";
import { initiateRefundRequest } from "../../services/supportService";
import ModalShell from "../ui/ModalShell";

interface Props {
  ticket: SupportTicket;
  onClose: () => void;
  onSaved: () => void;
}
const RefundRequestModal: React.FC<Props> = ({ ticket, onClose, onSaved }) => {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !reason.trim() ||
      !ticket.reservationId
    ) {
      setError("Ingresa un monto mayor que cero y un motivo.");
      return;
    }
    setSaving(true);
    try {
      await initiateRefundRequest(
        ticket.id,
        ticket.reservationId,
        numericAmount,
        reason.trim(),
      );
      onSaved();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible iniciar el reembolso.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell
      open
      title="Solicitar reembolso"
      onClose={onClose}
      description={`Reserva: ${ticket.reservationId || "no disponible"}`}
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
            form="refund-request-form"
            disabled={saving}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950"
          >
            {saving ? "Guardando…" : "Solicitar reembolso"}
          </button>
        </div>
      }
    >
      <form
        id="refund-request-form"
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <label htmlFor="refund-amount" className="block text-xs font-semibold">
          Monto solicitado (COP)
          <input
            id="refund-amount"
            required
            min="0.01"
            step="1"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-3 text-sm"
          />
        </label>
        <label htmlFor="refund-reason" className="block text-xs font-semibold">
          Motivo
          <textarea
            id="refund-reason"
            required
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 w-full resize-none rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-3 text-sm"
          />
        </label>
        {error && (
          <p role="alert" className="text-xs text-red-300">
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
};
export default RefundRequestModal;

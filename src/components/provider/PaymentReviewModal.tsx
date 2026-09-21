import React, { useState } from "react";
import type { PaymentRecord } from "../../types/payment.types";
import { reviewExternalPayment } from "../../services/paymentService";
import ModalShell from "../ui/ModalShell";

interface Props {
  payment: PaymentRecord;
  action: "verify" | "reject";
  onClose: () => void;
  onSaved: () => void;
}
const PaymentReviewModal: React.FC<Props> = ({
  payment,
  action,
  onClose,
  onSaved,
}) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (action === "reject" && !reason.trim()) {
      setError("Indica el motivo del rechazo.");
      return;
    }
    setSaving(true);
    try {
      await reviewExternalPayment(payment.id, action, reason.trim() || null);
      onSaved();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible revisar el pago.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell
      open
      title={action === "verify" ? "Verificar pago" : "Rechazar pago"}
      onClose={onClose}
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
            form="payment-review-form"
            disabled={saving}
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white"
          >
            {saving ? "Guardando…" : "Confirmar"}
          </button>
        </div>
      }
    >
      <form
        id="payment-review-form"
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <p className="text-sm text-[var(--text-secondary)]">
          {payment.amount.toLocaleString("es-CO")} {payment.currency}
        </p>
        {error && (
          <p role="alert" className="text-xs text-red-300">
            {error}
          </p>
        )}
        {action === "reject" && (
          <label
            htmlFor="payment-rejection-reason"
            className="block text-xs font-semibold"
          >
            Motivo
            <textarea
              id="payment-rejection-reason"
              required
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full resize-none rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-3 text-sm"
            />
          </label>
        )}
      </form>
    </ModalShell>
  );
};
export default PaymentReviewModal;

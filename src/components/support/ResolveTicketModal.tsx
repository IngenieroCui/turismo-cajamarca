import React, { useState } from "react";
import type { SupportTicket } from "../../types/operations.types";
import { updateSupportTicket } from "../../services/supportService";
import ModalShell from "../ui/ModalShell";

interface Props {
  ticket: SupportTicket;
  onClose: () => void;
  onSaved: () => void;
}
const ResolveTicketModal: React.FC<Props> = ({ ticket, onClose, onSaved }) => {
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!summary.trim()) {
      setError("El resumen es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      await updateSupportTicket(
        ticket.id,
        "resolved",
        ticket.priority,
        false,
        summary.trim(),
      );
      onSaved();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible resolver el ticket.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell
      open
      title="Resolver ticket"
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
            form="resolve-ticket-form"
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
          >
            {saving ? "Guardando…" : "Resolver ticket"}
          </button>
        </div>
      }
    >
      <form id="resolve-ticket-form" onSubmit={(event) => void submit(event)}>
        <label
          htmlFor="resolution-summary"
          className="block text-xs font-semibold"
        >
          Resumen de resolución
          <textarea
            id="resolution-summary"
            required
            rows={5}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className="mt-1 w-full resize-none rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-3 text-sm"
          />
        </label>
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-300">
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
};
export default ResolveTicketModal;

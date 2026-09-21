import React, { useState } from "react";
import ModalShell from "../ui/ModalShell";

interface Props {
  title: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}
const ModerationReasonModal: React.FC<Props> = ({
  title,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError("El motivo es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(reason.trim());
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible completar la revisión.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell
      open
      title={title}
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
            form="moderation-reason-form"
            disabled={saving}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"
          >
            {saving ? "Guardando…" : "Enviar motivo"}
          </button>
        </div>
      }
    >
      <form
        id="moderation-reason-form"
        onSubmit={(event) => void submit(event)}
      >
        <label
          htmlFor="moderation-reason"
          className="block text-xs font-semibold"
        >
          Motivo
          <textarea
            id="moderation-reason"
            required
            rows={5}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
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
export default ModerationReasonModal;

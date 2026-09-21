import React, { useState } from "react";
import { Star } from "lucide-react";
import { createReview } from "../../services/marketplaceService";
import ModalShell from "../ui/ModalShell";

interface Props {
  reservationId: string;
  itemTitle: string;
  onClose: () => void;
  onCreated: () => void;
}
const ReviewModal: React.FC<Props> = ({
  reservationId,
  itemTitle,
  onClose,
  onCreated,
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createReview(reservationId, rating, comment);
      onCreated();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible enviar la reseña.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell
      open
      title="Tu experiencia"
      description={itemTitle}
      onClose={onClose}
      footer={
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
            form="review-form"
            disabled={saving}
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50"
          >
            {saving ? "Enviando…" : "Enviar reseña"}
          </button>
        </div>
      }
    >
      <form
        id="review-form"
        onSubmit={(event) => void submit(event)}
        className="space-y-5"
      >
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-500/10 p-3 text-xs text-red-300"
          >
            {error}
          </p>
        )}
        <fieldset>
          <legend className="mb-2 text-xs font-semibold">Calificación</legend>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setRating(value)}
                aria-label={`${value} estrellas`}
                className="cursor-pointer"
              >
                <Star
                  className={`h-8 w-8 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-[var(--text-muted)]"}`}
                />
              </button>
            ))}
          </div>
        </fieldset>
        <label htmlFor="review-comment" className="block text-xs font-semibold">
          Comentario
          <textarea
            id="review-comment"
            rows={5}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="mt-1 w-full resize-none rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-3 text-sm"
          />
        </label>
      </form>
    </ModalShell>
  );
};
export default ReviewModal;

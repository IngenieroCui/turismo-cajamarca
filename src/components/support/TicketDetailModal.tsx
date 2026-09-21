import React, { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import {
  addSupportMessage,
  getRefundRequestsForTicket,
  getSupportTicketMessages,
} from "../../services/supportService";
import type {
  RefundRequest,
  SupportMessage,
  SupportTicket,
} from "../../types/operations.types";
import {
  formatSupportCategory,
  formatSupportPriority,
  formatSupportStatus,
} from "../../utils/uiFormatters";
import ModalShell from "../ui/ModalShell";

interface Props {
  ticket: SupportTicket;
  canManage?: boolean;
  onClose: () => void;
  onChanged: () => void;
}
const TicketDetailModal: React.FC<Props> = ({
  ticket,
  canManage = false,
  onClose,
  onChanged,
}) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [messageRows, refundRows] = await Promise.all([
        getSupportTicketMessages(ticket.id),
        getRefundRequestsForTicket(ticket.id),
      ]);
      setMessages(messageRows);
      setRefunds(refundRows);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el detalle.",
      );
    } finally {
      setLoading(false);
    }
  }, [ticket.id]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addSupportMessage(ticket.id, body, canManage && internal);
      setBody("");
      await load();
      onChanged();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible enviar el mensaje.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell
      open
      title={ticket.subject}
      description={`${formatSupportCategory(ticket.category)} · ${formatSupportPriority(ticket.priority)} · ${formatSupportStatus(ticket.status)}`}
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={
        ticket.status !== "closed" || canManage ? (
          <form
            id="ticket-message-form"
            onSubmit={(event) => void send(event)}
            className="space-y-2"
          >
            <label htmlFor="ticket-message" className="sr-only">
              Mensaje
            </label>
            <textarea
              id="ticket-message"
              required
              rows={3}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                canManage
                  ? "Escribe una respuesta o nota interna..."
                  : "Escribe un mensaje para soporte..."
              }
              className="w-full resize-none rounded-xl bg-[var(--bg-secondary)] px-3 py-2.5 text-sm"
            />
            {canManage && (
              <label
                htmlFor="ticket-internal"
                className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
              >
                <input
                  id="ticket-internal"
                  type="checkbox"
                  checked={internal}
                  onChange={(event) => setInternal(event.target.checked)}
                />
                Nota interna (no visible para el solicitante)
              </label>
            )}
            <div className="flex justify-end">
              <button
                disabled={saving}
                type="submit"
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {saving ? "Enviando..." : "Enviar mensaje"}
              </button>
            </div>
          </form>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--bg-primary)] p-3">
            <span className="block text-[var(--text-muted)]">Solicitante</span>
            <strong>
              {ticket.requesterName ||
                ticket.requesterEmail ||
                ticket.requesterId}
            </strong>
          </div>
          <div className="rounded-xl bg-[var(--bg-primary)] p-3">
            <span className="block text-[var(--text-muted)]">Contexto</span>
            <strong>
              {ticket.reservationId
                ? `Reserva ${ticket.reservationId.slice(0, 8)}`
                : ticket.catalogItemId
                  ? `Oferta ${ticket.catalogItemId.slice(0, 8)}`
                  : "Sin contexto vinculado"}
            </strong>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-4">
          <p className="m-0 whitespace-pre-wrap text-sm">
            {ticket.description}
          </p>
        </div>
        {ticket.resolutionSummary && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs">
            <strong>Resolución:</strong> {ticket.resolutionSummary}
          </div>
        )}
        {refunds.length > 0 && (
          <div className="space-y-2">
            <h3 className="m-0 text-sm font-bold">Reembolsos</h3>
            {refunds.map((refund) => (
              <div
                key={refund.id}
                className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs"
              >
                <strong>
                  {refund.amount.toLocaleString("es-CO")} {refund.currency}
                </strong>{" "}
                ·{" "}
                {refund.status === "pending_financial_processing"
                  ? "Solicitud pendiente de procesamiento financiero"
                  : refund.status === "processed"
                    ? "Procesado"
                    : "Rechazado"}
              </div>
            ))}
          </div>
        )}
        <div className="space-y-3">
          <h3 className="m-0 flex items-center gap-2 text-sm font-bold">
            <MessageCircle className="h-4 w-4 text-teal-400" />
            Conversación
          </h3>
          {loading && (
            <p className="text-xs text-[var(--text-secondary)]">
              Cargando mensajes...
            </p>
          )}
          {error && (
            <p role="alert" className="text-xs text-red-300">
              {error}
            </p>
          )}
          {!loading && messages.length === 0 && (
            <p className="text-xs text-[var(--text-secondary)]">
              Aún no hay mensajes.
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl border p-3 ${message.isInternal ? "border-amber-500/20 bg-amber-500/10" : "border-[var(--border-light)] bg-[var(--bg-primary)]"}`}
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                <span>
                  {message.isInternal ? "Nota interna" : "Mensaje público"}
                </span>
                <span>
                  {new Date(message.createdAt).toLocaleString("es-CO")}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
};

export default TicketDetailModal;

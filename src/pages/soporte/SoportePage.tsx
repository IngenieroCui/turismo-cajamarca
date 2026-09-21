import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, LifeBuoy, MessageSquare, RefreshCw } from "lucide-react";
import { useAuthStore } from "../../context/useAuthStore";
import { ROLE_METADATA, UserRoleEnum } from "../../types/auth.types";
import { RoleDrawerLayout } from "../../components/RoleDrawerLayout";
import TicketDetailModal from "../../components/support/TicketDetailModal";
import ResolveTicketModal from "../../components/support/ResolveTicketModal";
import RefundRequestModal from "../../components/support/RefundRequestModal";
import {
  getRefundRequestsForTicket,
  getSupportQueue,
  updateSupportTicket,
} from "../../services/supportService";
import type {
  RefundRequest,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from "../../types/operations.types";
import {
  formatSupportCategory,
  formatSupportPriority,
  formatSupportStatus,
} from "../../utils/uiFormatters";
import RoleWorkspaceHeader from "../../components/workspace/RoleWorkspaceHeader";
import MetricCard from "../../components/workspace/MetricCard";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";

const statuses: Array<[SupportTicketStatus, string]> = [
  ["open", "Abierto"],
  ["in_progress", "En progreso"],
  ["waiting_user", "Esperando usuario"],
  ["resolved", "Resuelto"],
  ["closed", "Cerrado"],
];
const priorities: Array<[SupportTicketPriority, string]> = [
  ["low", "Baja"],
  ["normal", "Normal"],
  ["high", "Alta"],
  ["urgent", "Urgente"],
];
const priorityRank: Record<SupportTicketPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};
const categories: Array<[SupportTicketCategory, string]> = [
  ["reservation", "Reserva"],
  ["catalog", "Catálogo"],
  ["account", "Cuenta"],
  ["refund", "Reembolso"],
  ["technical", "Técnico"],
  ["other", "Otro"],
];

const SoportePage: React.FC = () => {
  const { user, profile, hasPermission } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.SOPORTE];
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [tab, setTab] = useState<"resumen" | "tickets" | "reembolsos">(
    "resumen",
  );
  const [status, setStatus] = useState<SupportTicketStatus | "">("");
  const [priority, setPriority] = useState<SupportTicketPriority | "">("");
  const [category, setCategory] = useState<SupportTicketCategory | "">("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [resolveTarget, setResolveTarget] = useState<SupportTicket | null>(
    null,
  );
  const [refundTarget, setRefundTarget] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getSupportQueue();
      setTickets(rows);
      setRefunds(
        (
          await Promise.all(
            rows.map((ticket) => getRefundRequestsForTicket(ticket.id)),
          )
        ).flat(),
      );
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible cargar la operación de soporte.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(
    () =>
      tickets
        .filter((ticket) => {
          const text =
            `${ticket.subject} ${ticket.requesterName || ""} ${ticket.requesterEmail || ""}`.toLowerCase();
          return (
            (!status || ticket.status === status) &&
            (!priority || ticket.priority === priority) &&
            (!category || ticket.category === category) &&
            (!search.trim() || text.includes(search.toLowerCase()))
          );
        })
        .sort(
          (left, right) =>
            priorityRank[left.priority] - priorityRank[right.priority],
        ),
    [category, priority, search, status, tickets],
  );
  const assign = async (ticket: SupportTicket) => {
    try {
      await updateSupportTicket(
        ticket.id,
        ticket.status,
        ticket.priority,
        true,
      );
      await load();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible asignar el ticket.",
      );
    }
  };
  const changeStatus = async (
    ticket: SupportTicket,
    nextStatus: SupportTicketStatus,
  ) => {
    try {
      await updateSupportTicket(
        ticket.id,
        nextStatus,
        ticket.priority,
        false,
        null,
      );
      await load();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible cambiar el estado.",
      );
    }
  };
  const metrics = {
    open: tickets.filter((ticket) => ticket.status === "open").length,
    progress: tickets.filter((ticket) => ticket.status === "in_progress")
      .length,
    waiting: tickets.filter((ticket) => ticket.status === "waiting_user")
      .length,
    urgent: tickets.filter(
      (ticket) => ticket.priority === "urgent" && ticket.status !== "closed",
    ).length,
  };

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <RoleWorkspaceHeader
          eyebrow="Atención operativa"
          title="Centro de soporte"
          description="Prioriza los casos urgentes y continúa las conversaciones abiertas."
          roleLabel="Soporte"
          roleBadgeClass={meta.badgeColor}
          icon={LifeBuoy}
          primaryAction={
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-10 rounded-xl border border-[var(--border-light)] px-3 py-2 text-xs font-bold"
            >
              <RefreshCw className="mr-1 inline h-4 w-4" />
              Actualizar cola
            </button>
          }
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Urgentes"
            value={metrics.urgent}
            icon={LifeBuoy}
            tone="text-red-300"
          />
          <MetricCard
            label="Abiertos"
            value={metrics.open}
            icon={LifeBuoy}
            tone="text-sky-300"
          />
          <MetricCard
            label="En progreso"
            value={metrics.progress}
            icon={LifeBuoy}
            tone="text-amber-300"
          />
          <MetricCard
            label="Esperando usuario"
            value={metrics.waiting}
            icon={LifeBuoy}
            tone="text-slate-300"
          />
        </div>
        <header className="rounded-3xl border border-sky-500/20 bg-[var(--bg-secondary)] p-6 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="my-0 text-2xl font-bold text-sky-200">
                {profile?.full_name || user?.email}
              </h1>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {user?.email}
              </p>
            </div>
            <span
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${meta.badgeColor}`}
            >
              {meta.label}
            </span>
          </div>
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            {meta.description}
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          {(["resumen", "tickets", "reembolsos"] as const).map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setTab(value)}
              className={`rounded-xl border px-4 py-2.5 text-xs font-bold ${tab === value ? "border-sky-500 bg-sky-600 text-white" : "border-[var(--border-light)] bg-[var(--bg-secondary)]"}`}
            >
              {value === "resumen"
                ? "Resumen"
                : value === "tickets"
                  ? "Tickets"
                  : "Reembolsos"}
            </button>
          ))}
          <button
            type="button"
            aria-label="Actualizar cola"
            onClick={() => void load()}
            className="ml-auto rounded-xl border border-[var(--border-light)] p-2.5"
          >
            <RefreshCw
              className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
          </button>
        </div>
        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {loading && (
          <p className="text-xs text-[var(--text-secondary)]">Cargando cola…</p>
        )}
        {!loading && tab === "resumen" && (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Abiertos", metrics.open],
              ["En progreso", metrics.progress],
              ["Esperando usuario", metrics.waiting],
              ["Urgentes", metrics.urgent],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5"
              >
                <LifeBuoy className="h-5 w-5 text-sky-400" />
                <p className="mt-2 text-2xl font-black">{value}</p>
                <p className="text-xs text-[var(--text-secondary)]">{label}</p>
              </div>
            ))}
          </section>
        )}
        {!loading && tab === "tickets" && (
          <section className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="sr-only" htmlFor="support-search">
                Buscar tickets
              </label>
              <input
                id="support-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar asunto, nombre o correo"
                className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-xs"
              />
              <select
                aria-label="Filtrar estado"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as SupportTicketStatus | "")
                }
                className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-xs"
              >
                <option value="">Todos los estados</option>
                {statuses.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar prioridad"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as SupportTicketPriority | "")
                }
                className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-xs"
              >
                <option value="">Todas las prioridades</option>
                {priorities.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar categoría"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as SupportTicketCategory | "")
                }
                className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-xs"
              >
                <option value="">Todas las categorías</option>
                {categories.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {visible.length === 0 ? (
              <EmptyState title="No hay tickets en esta cola." />
            ) : (
              <div className="space-y-2">
                {visible.map((ticket) => (
                  <article
                    key={ticket.id}
                    className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="my-0 text-sm font-bold">
                          {ticket.subject}
                        </h2>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {ticket.requesterName ||
                            ticket.requesterEmail ||
                            "Solicitante"}{" "}
                          · {formatSupportCategory(ticket.category)}
                        </p>
                      </div>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <span className="rounded-full bg-sky-500/10 px-2 py-1 text-sky-300">
                          {formatSupportStatus(ticket.status)}
                        </span>
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-300">
                          {formatSupportPriority(ticket.priority)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void assign(ticket)}
                        className="rounded-xl bg-sky-600 px-3 py-2 text-[11px] font-bold text-white"
                      >
                        Asignarme
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelected(ticket)}
                        className="rounded-xl border border-[var(--border-light)] px-3 py-2 text-[11px] font-bold"
                      >
                        <MessageSquare className="mr-1 inline h-3 w-3" />
                        Ver conversación
                      </button>
                      <select
                        aria-label={`Cambiar estado de ${ticket.subject}`}
                        value={ticket.status}
                        onChange={(event) =>
                          void changeStatus(
                            ticket,
                            event.target.value as SupportTicketStatus,
                          )
                        }
                        className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-2 py-2 text-[11px]"
                      >
                        {statuses.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {ticket.status !== "resolved" &&
                        ticket.status !== "closed" && (
                          <button
                            type="button"
                            onClick={() => setResolveTarget(ticket)}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white"
                          >
                            <CheckCircle2 className="mr-1 inline h-3 w-3" />
                            Resolver
                          </button>
                        )}
                      {hasPermission("support:refund_issue") &&
                        ticket.reservationId && (
                          <button
                            type="button"
                            onClick={() => setRefundTarget(ticket)}
                            className="rounded-xl border border-amber-500/30 px-3 py-2 text-[11px] font-bold text-amber-300"
                          >
                            Iniciar reembolso
                          </button>
                        )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
        {!loading && tab === "reembolsos" && (
          <section className="space-y-3">
            {refunds.length === 0 ? (
              <EmptyState title="No hay solicitudes de reembolso." />
            ) : (
              refunds.map((refund) => (
                <div
                  key={refund.id}
                  className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong className="text-sm">
                      {refund.amount.toLocaleString("es-CO")} {refund.currency}
                    </strong>
                    <span className="text-xs text-amber-300">
                      {refund.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Reserva {refund.reservationId.slice(0, 8)}
                  </p>
                  <p className="mt-2 text-xs">{refund.reason}</p>
                </div>
              ))
            )}
          </section>
        )}
        {selected && (
          <TicketDetailModal
            ticket={selected}
            canManage
            onClose={() => setSelected(null)}
            onChanged={() => void load()}
          />
        )}
        {resolveTarget && (
          <ResolveTicketModal
            ticket={resolveTarget}
            onClose={() => setResolveTarget(null)}
            onSaved={() => {
              setResolveTarget(null);
              void load();
            }}
          />
        )}
        {refundTarget && (
          <RefundRequestModal
            ticket={refundTarget}
            onClose={() => setRefundTarget(null)}
            onSaved={() => {
              setRefundTarget(null);
              void load();
            }}
          />
        )}
      </div>
    </RoleDrawerLayout>
  );
};

export default SoportePage;

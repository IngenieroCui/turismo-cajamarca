import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, FileSearch, Plus, ShieldCheck } from "lucide-react";
import { RoleDrawerLayout } from "../../components/RoleDrawerLayout";
import AuditReportModal from "../../components/audit/AuditReportModal";
import { getAuditLogs, getAuditReports } from "../../services/auditService";
import type { AuditLogEntry, AuditReport } from "../../types/operations.types";
import RoleWorkspaceHeader from "../../components/workspace/RoleWorkspaceHeader";
import MetricCard from "../../components/workspace/MetricCard";
import SectionTabs from "../../components/workspace/SectionTabs";

const AuditorPage: React.FC = () => {
  const [tab, setTab] = useState<"resumen" | "logs" | "informes">("resumen");
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logRows, reportRows] = await Promise.all([
        getAuditLogs(
          {
            action: action || undefined,
            from: from || undefined,
            to: to || undefined,
          },
          100,
          offset,
        ),
        getAuditReports(),
      ]);
      setLogs(logRows);
      setReports(reportRows);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar la auditoría.",
      );
    } finally {
      setLoading(false);
    }
  }, [action, from, offset, to]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const dayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const weekStart = dayStart - 6 * 86400000;
  const eventsToday = logs.filter(
    (item) => new Date(item.createdAt).getTime() >= dayStart,
  ).length;
  const eventsWeek = logs.filter(
    (item) => new Date(item.createdAt).getTime() >= weekStart,
  ).length;
  const actors = new Set(logs.map((item) => item.actorId).filter(Boolean)).size;
  const critical = logs.filter((item) =>
    /security|permission|role|refund|regulatory|support_ticket/i.test(
      item.action,
    ),
  ).length;
  const filteredLogs = useMemo(
    () =>
      logs.filter(
        (item) =>
          !search.trim() ||
          `${item.actorName || ""} ${item.actorEmail || ""} ${item.entityTarget}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [logs, search],
  );
  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <RoleWorkspaceHeader
          eyebrow="Trazabilidad"
          title="Auditoría y trazabilidad"
          description="Consulta cambios y documenta hallazgos de trazabilidad."
          roleLabel="Auditor"
          roleBadgeClass="border-amber-500/30 bg-amber-500/10 text-amber-200"
          icon={ShieldCheck}
          primaryAction={
            <button
              type="button"
              onClick={() => setReportModal(true)}
              className="min-h-10 rounded-xl bg-yellow-600 px-3 py-2 text-xs font-bold text-white"
            >
              <Plus className="mr-1 inline h-4 w-4" />
              Crear informe
            </button>
          }
        />
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </p>
        )}
        <SectionTabs
          items={[
            { id: "resumen", label: "Resumen" },
            { id: "logs", label: "Eventos" },
            { id: "informes", label: "Informes" },
          ]}
          active={tab}
          onChange={(value) => setTab(value as typeof tab)}
        />
        {loading && (
          <p className="text-sm text-[var(--text-secondary)]">
            Cargando auditoría...
          </p>
        )}
        {!loading && tab === "resumen" && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label="Eventos hoy"
              value={eventsToday}
              icon={FileSearch}
              tone="text-amber-300"
            />
            <MetricCard
              label="Últimos 7 días"
              value={eventsWeek}
              icon={FileSearch}
              tone="text-amber-300"
            />
            <MetricCard
              label="Actores únicos"
              value={actors}
              icon={FileSearch}
              tone="text-blue-300"
            />
            <MetricCard
              label="Acciones críticas"
              value={critical}
              icon={FileSearch}
              tone="text-red-300"
            />
          </div>
        )}
        {!loading && tab === "logs" && (
          <section className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label htmlFor="audit-action" className="sr-only">
                Filtrar acción
              </label>
              <input
                id="audit-action"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value);
                  setOffset(0);
                }}
                placeholder="Filtrar por acción"
                className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
              />
              <input
                aria-label="Desde"
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setOffset(0);
                }}
                className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
              />
              <input
                aria-label="Hasta"
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setOffset(0);
                }}
                className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
              />
              <label htmlFor="audit-search" className="sr-only">
                Buscar actor
              </label>
              <input
                id="audit-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar actor o entidad"
                className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
              />
            </div>
            {filteredLogs.length === 0 ? (
              <p className="rounded-2xl bg-[var(--bg-secondary)] p-6 text-sm text-[var(--text-secondary)]">
                No se encontraron eventos con estos filtros.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <strong className="text-sm">{item.action}</strong>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {item.actorName || item.actorEmail || "Sistema"} ·{" "}
                          {item.entityTarget} ·{" "}
                          {new Date(item.createdAt).toLocaleString("es-CO")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(expanded === item.id ? null : item.id)
                        }
                        className="rounded-xl border border-[var(--border-light)] p-2"
                        aria-label="Ver detalles"
                      >
                        <ChevronDown
                          className={`h-4 w-4 ${expanded === item.id ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                    {expanded === item.id && (
                      <pre className="mt-3 overflow-x-auto rounded-xl bg-[var(--bg-primary)] p-3 text-xs">
                        {JSON.stringify(item.details, null, 2)}
                      </pre>
                    )}
                  </article>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 100))}
                className="rounded-xl border border-[var(--border-light)] px-3 py-2 text-xs disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs text-[var(--text-muted)]">
                {offset + 1}-{offset + logs.length}
              </span>
              <button
                type="button"
                disabled={logs.length < 100}
                onClick={() => setOffset(offset + 100)}
                className="rounded-xl border border-[var(--border-light)] px-3 py-2 text-xs disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </section>
        )}
        {!loading && tab === "informes" && (
          <section className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setReportModal(true)}
                className="min-h-10 rounded-xl bg-yellow-600 px-3 py-2 text-xs font-bold text-white"
              >
                <Plus className="mr-1 inline h-4 w-4" />
                Crear informe
              </button>
            </div>
            {reports.length === 0 ? (
              <p className="rounded-2xl bg-[var(--bg-secondary)] p-6 text-sm text-[var(--text-secondary)]">
                Aún no hay informes de auditoría.
              </p>
            ) : (
              reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5"
                >
                  <h3 className="m-0 text-sm font-bold">{report.title}</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {report.summary}
                  </p>
                  {report.findings.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                      {report.findings.map((finding) => (
                        <li key={finding}>{finding}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))
            )}{" "}
          </section>
        )}
        {reportModal && (
          <AuditReportModal
            onClose={() => setReportModal(false)}
            onSaved={() => {
              setReportModal(false);
              void load();
            }}
          />
        )}
      </div>
    </RoleDrawerLayout>
  );
};
export default AuditorPage;

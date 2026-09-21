import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileCheck, RefreshCw } from "lucide-react";
import { RoleDrawerLayout } from "../../components/RoleDrawerLayout";
import ComplianceReviewModal from "../../components/regulatory/ComplianceReviewModal";
import {
  getMyRegulatoryObservations,
  getMyRegulatoryProfile,
  getRegulatoryProviders,
} from "../../services/regulatoryService";
import type {
  ProviderCompliance,
  RegulatoryObservation,
} from "../../types/operations.types";
import RoleWorkspaceHeader from "../../components/workspace/RoleWorkspaceHeader";
import MetricCard from "../../components/workspace/MetricCard";
import AttentionCard from "../../components/workspace/AttentionCard";
import DataTableContainer from "../../components/ui/DataTableContainer";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  formatComplianceStatus,
  formatDate,
  formatRegulatoryDecision,
} from "../../utils/uiFormatters";

const priority: Record<string, number> = {
  vencido: 0,
  sin_rnt: 1,
  pendiente: 2,
  verificado: 3,
};

const FuncionarioMincitPage: React.FC = () => {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<ProviderCompliance[]>([]);
  const [history, setHistory] = useState<RegulatoryObservation[]>([]);
  const [selected, setSelected] = useState<ProviderCompliance | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profileRow = await getMyRegulatoryProfile();
      setConfigured(Boolean(profileRow));
      if (profileRow) {
        const [providerRows, historyRows] = await Promise.all([
          getRegulatoryProviders(),
          getMyRegulatoryObservations(),
        ]);
        setProviders(providerRows);
        setHistory(historyRows);
      } else {
        setProviders([]);
        setHistory([]);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el panel regulatorio.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const ordered = useMemo(
    () =>
      providers
        .filter((item) => !status || item.rntStatus === status)
        .sort(
          (a, b) => (priority[a.rntStatus] ?? 9) - (priority[b.rntStatus] ?? 9),
        ),
    [providers, status],
  );
  const pending = providers.filter(
    (item) => item.rntStatus === "pendiente",
  ).length;
  const verified = providers.filter(
    (item) => item.rntStatus === "verificado",
  ).length;
  const expired = providers.filter(
    (item) => item.rntStatus === "vencido",
  ).length;
  const without = providers.filter(
    (item) => item.rntStatus === "sin_rnt",
  ).length;

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <RoleWorkspaceHeader
          eyebrow="Revisión institucional"
          title="Supervisión RNT"
          description="Prioriza prestadores que requieren atención regulatoria y documenta cada decisión."
          roleLabel="Funcionario MinCIT"
          roleBadgeClass="border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
          icon={FileCheck}
          primaryAction={
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-10 rounded-xl border border-[var(--border-light)] px-3 py-2 text-xs font-bold"
            >
              <RefreshCw className="mr-1 inline h-4 w-4" />
              Actualizar
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
        {loading && (
          <p className="text-sm text-[var(--text-secondary)]">
            Cargando prestadores...
          </p>
        )}
        {!loading && configured === false && (
          <AttentionCard
            title="Perfil institucional pendiente"
            description="Tu perfil institucional debe ser configurado por un Super Administrador antes de revisar prestadores."
            tone="warning"
          />
        )}
        {!loading && configured && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                label="Pendientes"
                value={pending}
                icon={FileCheck}
                tone="text-amber-300"
              />
              <MetricCard
                label="Verificados"
                value={verified}
                icon={FileCheck}
                tone="text-emerald-300"
              />
              <MetricCard
                label="Vencidos"
                value={expired}
                icon={FileCheck}
                tone="text-red-300"
              />
              <MetricCard
                label="Sin RNT"
                value={without}
                icon={FileCheck}
                tone="text-slate-300"
              />
            </div>
            <DataTableContainer
              title="Prestadores que requieren revisión"
              description="Ordenados por vencimiento, ausencia de RNT y pendientes."
            >
              <div className="mb-4 flex flex-wrap gap-2">
                <label htmlFor="mincit-status" className="sr-only">
                  Filtrar estado RNT
                </label>
                <select
                  id="mincit-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="min-h-10 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2 text-xs"
                >
                  <option value="">Todos los estados</option>
                  <option value="vencido">Vencidos</option>
                  <option value="sin_rnt">Sin RNT</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="verificado">Verificados</option>
                </select>
              </div>
              {ordered.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  No hay prestadores con este filtro.
                </p>
              ) : (
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-light)] text-[var(--text-muted)]">
                      <th scope="col" className="p-3">
                        Prestador
                      </th>
                      <th scope="col" className="p-3">
                        NIT
                      </th>
                      <th scope="col" className="p-3">
                        RNT
                      </th>
                      <th scope="col" className="p-3">
                        Estado
                      </th>
                      <th scope="col" className="p-3">
                        Vencimiento
                      </th>
                      <th scope="col" className="p-3">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.map((item) => (
                      <tr
                        key={item.providerId}
                        className="border-b border-[var(--border-light)]"
                      >
                        <td className="p-3 font-bold">
                          {item.razonSocial ||
                            item.nombreComercial ||
                            item.fullName}
                        </td>
                        <td className="p-3">{item.ruc || "Sin NIT"}</td>
                        <td className="p-3">{item.rntNumber || "Sin RNT"}</td>
                        <td className="p-3">
                          <StatusBadge
                            label={formatComplianceStatus(item.rntStatus)}
                            tone={
                              item.rntStatus === "verificado"
                                ? "success"
                                : item.rntStatus === "vencido"
                                  ? "danger"
                                  : "warning"
                            }
                          />
                        </td>
                        <td className="p-3">{formatDate(item.rntExpiresAt)}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setSelected(item)}
                            className="min-h-10 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white"
                          >
                            Revisar RNT
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DataTableContainer>
            <DataTableContainer
              title="Historial de revisiones"
              description="Decisiones documentadas con el identificador técnico solo como referencia secundaria."
            >
              {history.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  No hay observaciones regulatorias.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl bg-[var(--bg-primary)] p-3 text-sm"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong>Proveedor {item.providerId.slice(0, 8)}</strong>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {formatRegulatoryDecision(item.decision)} ·{" "}
                        {item.reviewType === "rnt"
                          ? "RNT"
                          : "Registro mercantil"}
                      </p>
                      {item.notes && (
                        <p className="mt-2 text-xs text-[var(--text-secondary)]">
                          {item.notes}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </DataTableContainer>
          </>
        )}
        {selected && (
          <ComplianceReviewModal
            providerId={selected.providerId}
            businessName={
              selected.razonSocial || selected.nombreComercial || "Prestador"
            }
            reviewType="rnt"
            onClose={() => setSelected(null)}
            onSaved={() => {
              setSelected(null);
              void load();
            }}
          />
        )}
      </div>
    </RoleDrawerLayout>
  );
};

export default FuncionarioMincitPage;

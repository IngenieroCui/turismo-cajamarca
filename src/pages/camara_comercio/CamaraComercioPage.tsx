import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building, RefreshCw } from "lucide-react";
import { RoleDrawerLayout } from "../../components/RoleDrawerLayout";
import ComplianceReviewModal from "../../components/regulatory/ComplianceReviewModal";
import {
  getMyRegulatoryProfile,
  getRegulatoryProviders,
} from "../../services/regulatoryService";
import type { ProviderCompliance } from "../../types/operations.types";
import RoleWorkspaceHeader from "../../components/workspace/RoleWorkspaceHeader";
import MetricCard from "../../components/workspace/MetricCard";
import AttentionCard from "../../components/workspace/AttentionCard";
import DataTableContainer from "../../components/ui/DataTableContainer";
import StatusBadge from "../../components/ui/StatusBadge";
import { formatComplianceStatus, formatDate } from "../../utils/uiFormatters";

const priority: Record<string, number> = {
  vencido: 0,
  rechazado: 1,
  observado: 2,
  pendiente: 3,
  verificado: 4,
};

const CamaraComercioPage: React.FC = () => {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<ProviderCompliance[]>([]);
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
      setProviders(profileRow ? await getRegulatoryProviders() : []);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el directorio empresarial.",
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
        .filter((item) => !status || item.commercialStatus === status)
        .sort(
          (a, b) =>
            (priority[a.commercialStatus] ?? 9) -
            (priority[b.commercialStatus] ?? 9),
        ),
    [providers, status],
  );
  const verified = providers.filter(
    (item) => item.commercialStatus === "verificado",
  ).length;
  const pending = providers.filter(
    (item) =>
      item.commercialStatus === "pendiente" ||
      item.commercialStatus === "observado",
  ).length;
  const expired = providers.filter(
    (item) => item.commercialStatus === "vencido",
  ).length;
  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <RoleWorkspaceHeader
          eyebrow="Formalización"
          title="Formalización empresarial"
          description="Valida registros mercantiles y atiende primero los casos que requieren decisión."
          roleLabel="Cámara de Comercio"
          roleBadgeClass="border-lime-500/30 bg-lime-500/10 text-lime-200"
          icon={Building}
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
            Cargando directorio empresarial...
          </p>
        )}
        {!loading && configured === false && (
          <AttentionCard
            title="Perfil institucional pendiente"
            description="Tu perfil institucional debe ser configurado por un Super Administrador antes de revisar registros."
            tone="warning"
          />
        )}
        {!loading && configured && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                label="Prestadores registrados"
                value={providers.length}
                icon={Building}
                tone="text-blue-300"
              />
              <MetricCard
                label="Verificados"
                value={verified}
                icon={Building}
                tone="text-emerald-300"
              />
              <MetricCard
                label="Pendientes u observados"
                value={pending}
                icon={Building}
                tone="text-amber-300"
              />
              <MetricCard
                label="Vencidos"
                value={expired}
                icon={Building}
                tone="text-red-300"
              />
            </div>
            <DataTableContainer
              title="Directorio empresarial"
              description="Prioridad: vencido, rechazado, observado, pendiente y verificado."
            >
              <div className="mb-4 flex flex-wrap gap-2">
                <label htmlFor="chamber-status" className="sr-only">
                  Filtrar estado comercial
                </label>
                <select
                  id="chamber-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="min-h-10 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2 text-xs"
                >
                  <option value="">Todos los estados</option>
                  <option value="vencido">Vencidos</option>
                  <option value="rechazado">Rechazados</option>
                  <option value="observado">Observados</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="verificado">Verificados</option>
                </select>
              </div>
              {ordered.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  No hay prestadores con este filtro.
                </p>
              ) : (
                <table className="w-full min-w-[860px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-light)] text-[var(--text-muted)]">
                      <th scope="col" className="p-3">
                        Prestador
                      </th>
                      <th scope="col" className="p-3">
                        NIT
                      </th>
                      <th scope="col" className="p-3">
                        Registro mercantil
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
                        <td className="p-3">
                          {item.commercialRegistrationNumber || "Sin registro"}
                        </td>
                        <td className="p-3">
                          <StatusBadge
                            label={formatComplianceStatus(
                              item.commercialStatus,
                            )}
                            tone={
                              item.commercialStatus === "verificado"
                                ? "success"
                                : item.commercialStatus === "vencido" ||
                                    item.commercialStatus === "rechazado"
                                  ? "danger"
                                  : "warning"
                            }
                          />
                        </td>
                        <td className="p-3">
                          {formatDate(item.commercialExpiresAt)}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setSelected(item)}
                            className="min-h-10 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white"
                          >
                            Revisar registro
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            reviewType="commercial"
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

export default CamaraComercioPage;

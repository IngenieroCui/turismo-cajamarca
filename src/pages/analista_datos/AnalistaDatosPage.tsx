import React, { useEffect, useState } from "react";
import { BarChart3, Download, Filter, RefreshCw } from "lucide-react";
import { RoleDrawerLayout } from "../../components/RoleDrawerLayout";
import {
  exportAnalyticsCsv,
  getAnalytics,
} from "../../services/analyticsService";
import type {
  AnalyticsData,
  AnalyticsBreakdownItem,
} from "../../types/operations.types";
import RoleWorkspaceHeader from "../../components/workspace/RoleWorkspaceHeader";
import MetricCard from "../../components/workspace/MetricCard";

const breakdown = (title: string, rows: AnalyticsBreakdownItem[]) => (
  <section className="space-y-3 rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
    <h3 className="m-0 text-sm font-bold">{title}</h3>
    {rows.length === 0 ? (
      <p className="text-sm text-[var(--text-secondary)]">
        No hay actividad para el período seleccionado.
      </p>
    ) : (
      rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex justify-between gap-2 text-sm">
            <span>{row.label}</span>
            <strong>
              {row.value}
              {row.rating !== undefined ? ` · ${row.rating.toFixed(1)}` : ""}
            </strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
            <div
              className="h-full bg-cyan-500"
              style={{
                width: `${Math.min(100, Math.max(4, (row.value / Math.max(1, rows[0].value)) * 100))}%`,
              }}
            />
          </div>
        </div>
      ))
    )}
  </section>
);

const AnalistaDatosPage: React.FC = () => {
  const [period, setPeriod] = useState<AnalyticsData["period"]>("month");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async (selected: AnalyticsData["period"]) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalytics(selected));
    } catch (err: unknown) {
      setData(null);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar la analítica.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(period);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [period]);
  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <RoleWorkspaceHeader
          eyebrow="Datos agregados"
          title="Inteligencia turística"
          description="Analiza el comportamiento agregado de la plataforma para identificar tendencias operativas."
          icon={BarChart3}
          primaryAction={
            data ? (
              <button
                type="button"
                onClick={() => exportAnalyticsCsv(data)}
                className="min-h-10 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white"
              >
                <Download className="mr-1 inline h-4 w-4" />
                Exportar CSV
              </button>
            ) : undefined
          }
        />
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
          <Filter className="h-4 w-4 text-cyan-400" />
          {(["month", "quarter", "year"] as const).map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setPeriod(value)}
              className={`min-h-10 rounded-xl px-3 py-2 text-xs font-bold ${period === value ? "bg-cyan-600 text-white" : "bg-[var(--bg-primary)] text-[var(--text-secondary)]"}`}
            >
              {value === "month"
                ? "Mes"
                : value === "quarter"
                  ? "Trimestre"
                  : "Año"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load(period)}
            aria-label="Actualizar analítica"
            className="ml-auto rounded-xl border border-[var(--border-light)] p-2"
          >
            <RefreshCw
              className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
          </button>
        </div>
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
            Cargando datos agregados...
          </p>
        )}
        {!loading && data && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard
                label="Reservas"
                value={data.reservationCount}
                icon={BarChart3}
                tone="text-cyan-300"
              />
              <MetricCard
                label="Prestadores activos"
                value={data.activeProviderCount}
                icon={BarChart3}
                tone="text-emerald-300"
              />
              <MetricCard
                label="Turistas únicos"
                value={data.uniqueTourists}
                icon={BarChart3}
                tone="text-blue-300"
              />
              <MetricCard
                label="Rating promedio"
                value={data.averageRating.toFixed(2)}
                icon={BarChart3}
                tone="text-amber-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <MetricCard
                label="Catálogo publicado"
                value={data.publishedCatalogCount}
                icon={BarChart3}
                tone="text-cyan-300"
              />
              <MetricCard
                label="Reservas completadas"
                value={data.completedReservations}
                icon={BarChart3}
                tone="text-emerald-300"
              />
              <MetricCard
                label="Valor cotizado"
                value={`${data.quotedReservationValue.toLocaleString("es-CO")} COP`}
                icon={BarChart3}
                tone="text-slate-300"
                description="Valor cotizado; no representa ingresos procesados."
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {breakdown("Catálogo por tipo", data.catalogByType)}
              {breakdown("Reservas por estado", data.reservationByStatus)}
              {breakdown("Categorías principales", data.topCategories)}
              {breakdown("Ofertas principales", data.topCatalogItems)}
            </div>
          </>
        )}
      </div>
    </RoleDrawerLayout>
  );
};
export default AnalistaDatosPage;

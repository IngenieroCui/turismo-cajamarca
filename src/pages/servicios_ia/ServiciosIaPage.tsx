import React, { useCallback, useEffect, useState } from "react";
import { Activity, BarChart3, Bot, RefreshCw } from "lucide-react";
import { RoleDrawerLayout } from "../../components/RoleDrawerLayout";
import {
  getIntelligenceMetrics,
  type IntelligenceMetrics,
} from "../../services/intelligenceService";
import { usePlatformConfig } from "../../context/usePlatformConfig";
import RoleWorkspaceHeader from "../../components/workspace/RoleWorkspaceHeader";
import MetricCard from "../../components/workspace/MetricCard";
import AttentionCard from "../../components/workspace/AttentionCard";

export const ServiciosIaPage: React.FC = () => {
  const assistantEnabled = usePlatformConfig((state) => state.assistantEnabled);
  const [metrics, setMetrics] = useState<IntelligenceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMetrics(await getIntelligenceMetrics());
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar las métricas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <RoleWorkspaceHeader
          eyebrow="Supervisión del sistema"
          title="Motor de experiencia inteligente"
          description="Monitoreo del motor determinístico de recomendaciones e itinerarios."
          icon={Bot}
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
        <AttentionCard
          title={`Asistente ${assistantEnabled ? "habilitado" : "deshabilitado"}`}
          description="La experiencia inteligente actual utiliza recomendaciones determinísticas con datos existentes de la plataforma."
          tone={assistantEnabled ? "success" : "warning"}
          icon={Activity}
        />
        {loading && (
          <p className="text-sm text-[var(--text-secondary)]">
            Cargando métricas reales...
          </p>
        )}
        {!loading && metrics && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <MetricCard
                label="Catálogo publicado"
                value={metrics.publishedCatalog}
                icon={Activity}
                tone="text-purple-300"
              />
              <MetricCard
                label="Turistas con preferencias"
                value={metrics.touristsWithPreferences}
                icon={Activity}
                tone="text-purple-300"
              />
              <MetricCard
                label="Itinerarios guardados"
                value={metrics.savedItineraries}
                icon={Activity}
                tone="text-purple-300"
              />
              <MetricCard
                label="Favoritos"
                value={metrics.favoritesCount}
                icon={Activity}
                tone="text-purple-300"
              />
              <MetricCard
                label="Reservas completadas"
                value={metrics.completedReservations}
                icon={Activity}
                tone="text-purple-300"
              />
              <MetricCard
                label="Rating promedio"
                value={metrics.averageRating.toFixed(2)}
                icon={Activity}
                tone="text-amber-300"
              />
            </div>
            <section className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
              <h2 className="m-0 flex items-center gap-2 text-base font-bold">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                Preferencias principales
              </h2>
              {metrics.topPreferences.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {metrics.topPreferences.map((entry) => (
                    <span
                      key={entry.preference}
                      className="rounded-full bg-purple-500/10 px-3 py-1.5 text-xs text-purple-200"
                    >
                      {entry.preference}: {entry.count}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  Aún no hay preferencias registradas.
                </p>
              )}
            </section>
            <p className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-xs text-purple-100">
              IA generativa externa: no configurada.
            </p>
          </>
        )}
      </div>
    </RoleDrawerLayout>
  );
};
export default ServiciosIaPage;

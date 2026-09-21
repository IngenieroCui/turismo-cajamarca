import React, { useEffect, useState } from "react";
import { Activity, Database, RefreshCw, Server } from "lucide-react";
import { RoleDrawerLayout } from "../../components/RoleDrawerLayout";
import {
  getSystemHealth,
  type SystemHealth,
} from "../../services/systemHealthService";
import RoleWorkspaceHeader from "../../components/workspace/RoleWorkspaceHeader";
import MetricCard from "../../components/workspace/MetricCard";
import WorkspaceSection from "../../components/workspace/WorkspaceSection";

const DesarrolladorPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setHealth(await getSystemHealth());
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible consultar el sistema.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <RoleWorkspaceHeader
          eyebrow="Operación técnica"
          title="Estado técnico de la plataforma"
          description="Consulta el estado real de la aplicación y del esquema sin exponer secretos."
          icon={Server}
          primaryAction={
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-10 rounded-xl border border-[var(--border-light)] px-3 py-2 text-xs font-bold"
            >
              <RefreshCw
                className={
                  loading
                    ? "mr-1 inline h-4 w-4 animate-spin"
                    : "mr-1 inline h-4 w-4"
                }
              />
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
            Consultando métricas...
          </p>
        )}
        {health && (
          <>
            <WorkspaceSection
              title="Plataforma"
              description="Contexto técnico y actividad agregada."
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="Usuarios activos"
                  value={health.activeUsers}
                  icon={Activity}
                  tone="text-slate-300"
                />
                <MetricCard
                  label="Catálogo publicado"
                  value={health.publishedCatalog}
                  icon={Activity}
                  tone="text-emerald-300"
                />
                <MetricCard
                  label="Notificaciones 24h"
                  value={health.notificationCount24h}
                  icon={Activity}
                  tone="text-blue-300"
                />
                <MetricCard
                  label="Versión de esquema"
                  value={health.schemaVersion}
                  icon={Database}
                  tone="text-purple-300"
                />
              </div>
            </WorkspaceSection>
            <WorkspaceSection
              title="Operación"
              description="Colas actuales que requieren seguimiento."
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="Tickets abiertos"
                  value={health.openSupportTickets}
                  icon={Activity}
                  tone="text-sky-300"
                />
                <MetricCard
                  label="Moderación pendiente"
                  value={health.pendingCatalogModeration}
                  icon={Activity}
                  tone="text-indigo-300"
                />
                <MetricCard
                  label="Reseñas pendientes"
                  value={health.pendingReviews}
                  icon={Activity}
                  tone="text-amber-300"
                />
                <MetricCard
                  label="Privacidad pendiente"
                  value={health.pendingDeletionRequests}
                  icon={Activity}
                  tone="text-rose-300"
                />
              </div>
            </WorkspaceSection>
            <WorkspaceSection title="Auditoría">
              <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
                <Activity className="h-5 w-5 text-violet-400" />
                <p className="mt-2 text-sm font-bold">Último evento</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {health.latestAuditEventAt
                    ? new Date(health.latestAuditEventAt).toLocaleString(
                        "es-CO",
                      )
                    : "Sin eventos registrados"}
                </p>
              </div>
            </WorkspaceSection>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
                <Database className="h-5 w-5 text-emerald-400" />
                <h3 className="mt-3 text-sm font-bold">
                  React + Supabase BaaS
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Hora de base de datos:{" "}
                  {new Date(health.databaseTime).toLocaleString("es-CO")}
                </p>
              </article>
              <article className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
                <Server className="h-5 w-5 text-blue-400" />
                <h3 className="mt-3 text-sm font-bold">
                  Conexión de plataforma
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Las operaciones se ejecutan mediante servicios existentes y
                  RPC de Supabase.
                </p>
              </article>
            </div>
          </>
        )}
      </div>
    </RoleDrawerLayout>
  );
};
export default DesarrolladorPage;

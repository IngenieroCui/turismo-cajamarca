import React, { useEffect, useState } from "react";
import { Check, Copy, Link2, Users, Wallet } from "lucide-react";
import { getAffiliateDashboard } from "../../services/referralService";
import type { AffiliateDashboardData } from "../../types/operations.types";
import MetricCard from "../workspace/MetricCard";
import { formatCommissionStatus, formatCop } from "../../utils/uiFormatters";

interface Props {
  variant: "affiliate" | "ambassador";
}
const AffiliateDashboard: React.FC<Props> = ({ variant }) => {
  const [data, setData] = useState<AffiliateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      void getAffiliateDashboard()
        .then((value) => {
          if (mounted) setData(value);
        })
        .catch((err: unknown) => {
          if (mounted)
            setError(
              err instanceof Error
                ? err.message
                : "No fue posible cargar el panel.",
            );
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }, 0);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);
  if (loading)
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        Cargando datos de referidos...
      </p>
    );
  if (error)
    return (
      <p
        role="alert"
        className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
      >
        {error}
      </p>
    );
  if (!data)
    return (
      <p className="rounded-2xl bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
        Aún no hay datos de referidos.
      </p>
    );
  const link = `${window.location.origin}/?ref=${encodeURIComponent(data.referralCode)}`;
  const conversion =
    data.uniqueVisits > 0
      ? Math.round((data.referredReservations / data.uniqueVisits) * 100)
      : null;
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-rose-400" />
          <div>
            <h2 className="m-0 text-base font-bold">
              {variant === "affiliate"
                ? "Rendimiento de referidos"
                : "Impacto de tus referidos"}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {variant === "affiliate"
                ? "Comparte tu enlace y entiende la conversión registrada."
                : "Comparte Cajamarca con métricas reales de visitas y reservas."}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            aria-label="Enlace de referido"
            readOnly
            value={link}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void copy()}
            className="min-h-11 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white"
          >
            {copied ? (
              <>
                <Check className="mr-1 inline h-3.5 w-3.5" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="mr-1 inline h-3.5 w-3.5" />
                {variant === "affiliate"
                  ? "Copiar enlace"
                  : "Compartir Cajamarca"}
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Visitas únicas al enlace:{" "}
          <strong className="text-[var(--text-primary)]">
            {data.uniqueVisits}
          </strong>{" "}
          · Tasa de comisión: {data.commissionRate}%
        </p>
      </section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard
          label="Visitas únicas"
          value={data.uniqueVisits}
          icon={Users}
          tone="text-rose-300"
        />
        <MetricCard
          label="Reservas referidas"
          value={data.referredReservations}
          icon={Link2}
          tone="text-rose-300"
        />
        <MetricCard
          label="Comisión pendiente"
          value={formatCop(data.pendingCommission)}
          icon={Wallet}
          tone="text-amber-300"
        />
        <MetricCard
          label="Comisión ganada"
          value={formatCop(data.earnedCommission)}
          icon={Wallet}
          tone="text-emerald-300"
        />
        <MetricCard
          label="Total acumulado"
          value={formatCop(data.totalEarnings)}
          icon={Wallet}
          tone="text-purple-300"
        />
      </div>
      <section className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
        <h3 className="m-0 text-base font-bold">Conversión registrada</h3>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="rounded-xl bg-slate-500/10 px-3 py-2">
            Visitas: {data.uniqueVisits}
          </span>
          <span className="text-[var(--text-muted)]">↓</span>
          <span className="rounded-xl bg-rose-500/10 px-3 py-2">
            Reservas: {data.referredReservations}
          </span>
        </div>
        {conversion !== null && (
          <p className="mt-3 text-sm font-bold text-rose-300">
            Conversión: {conversion}%
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          La conversión refleja únicamente visitas y reservas atribuidas al
          enlace.
        </p>
      </section>
      <section className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
        <h3 className="m-0 text-base font-bold">Comisiones recientes</h3>
        {data.recentCommissions.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Aún no se registran referidos.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.recentCommissions.map((commission) => (
              <div
                key={commission.reservationId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg-primary)] p-3 text-sm"
              >
                <span>
                  {commission.catalogItemTitle ||
                    `Reserva ${commission.reservationId.slice(0, 8)}`}
                </span>
                <span className="text-rose-300">
                  {formatCop(commission.commissionAmount)} ·{" "}
                  {formatCommissionStatus(commission.status)}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Método de pago: {data.payoutMethod || "Pendiente de configurar"}
        </p>
      </section>
    </div>
  );
};
export default AffiliateDashboard;

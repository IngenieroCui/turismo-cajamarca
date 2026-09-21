import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import {
  getPlatformSettings,
  updatePlatformSetting,
} from "../../services/platformConfigService";
import type {
  PlatformSetting,
  PlatformSettingKey,
  PlatformSettingValue,
} from "../../types/platform.types";
import { usePlatformConfig } from "../../context/usePlatformConfig";
import ConfirmDialog from "../ui/ConfirmDialog";

const labels: Record<PlatformSettingKey, string> = {
  maintenance_mode: "Modo mantenimiento",
  reservations_enabled: "Reservas",
  reviews_enabled: "Reseñas",
  promotions_enabled: "Promociones",
  referrals_enabled: "Referidos",
  assistant_enabled: "Asistente",
  support_enabled: "Soporte",
  default_affiliate_commission_rate: "Comisión predeterminada",
  platform_name: "Nombre plataforma",
  support_contact_email: "Correo soporte",
};
const groups: Array<[string, PlatformSettingKey[]]> = [
  ["Sistema", ["maintenance_mode"]],
  [
    "Marketplace",
    ["reservations_enabled", "reviews_enabled", "promotions_enabled"],
  ],
  ["Operaciones", ["support_enabled"]],
  ["Growth", ["referrals_enabled", "default_affiliate_commission_rate"]],
  ["Inteligencia", ["assistant_enabled"]],
  ["Branding y soporte", ["platform_name", "support_contact_email"]],
];

const PlatformSettingsPanel: React.FC = () => {
  const refreshPlatformConfig = usePlatformConfig((state) => state.refresh);
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PlatformSettingKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    setting: PlatformSetting;
    value: PlatformSettingValue;
  } | null>(null);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await getPlatformSettings());
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar la configuración.",
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
  const byKey = useMemo(
    () => new Map(settings.map((setting) => [setting.key, setting])),
    [settings],
  );
  const save = async (
    setting: PlatformSetting,
    value: PlatformSettingValue,
  ) => {
    const disabling =
      typeof value === "boolean" &&
      value === false &&
      ["reservations_enabled", "support_enabled"].includes(setting.key);
    const maintenanceOn = setting.key === "maintenance_mode" && value === true;
    if ((disabling || maintenanceOn) && !confirmation) {
      setConfirmation({ setting, value });
      return;
    }
    if (confirmation) setConfirmation(null);
    setSaving(setting.key);
    setError(null);
    try {
      await updatePlatformSetting(setting.key, value);
      await refreshPlatformConfig();
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar la configuración.",
      );
    } finally {
      setSaving(null);
    }
  };
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black my-0">Configuración</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Valores persistidos en Supabase y aplicados por las reglas del
            servidor.
          </p>
        </div>
        <button
          type="button"
          aria-label="Actualizar configuración"
          onClick={() => void load()}
          className="rounded-xl border border-[var(--border-light)] p-2"
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </button>
      </div>
      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </p>
      )}
      {loading && (
        <p className="text-xs text-[var(--text-secondary)]">
          Cargando configuración...
        </p>
      )}
      {!loading &&
        groups.map(([group, keys]) => (
          <div key={group} className="space-y-3">
            <h4 className="text-sm font-bold text-red-200">{group}</h4>
            <div className="grid gap-3 md:grid-cols-2">
              {keys.map((key) => {
                const setting = byKey.get(key);
                if (!setting) return null;
                const isBoolean = typeof setting.value === "boolean";
                return (
                  <article
                    key={key}
                    className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{labels[key]}</p>
                        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                          {setting.description || "Sin descripción"}
                        </p>
                        <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                          Actualizado:{" "}
                          {setting.updatedAt
                            ? new Date(setting.updatedAt).toLocaleString(
                                "es-CO",
                              )
                            : "—"}
                        </p>
                      </div>
                      {isBoolean ? (
                        <button
                          type="button"
                          disabled={saving === key}
                          onClick={() => void save(setting, !setting.value)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${setting.value ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-300"}`}
                        >
                          {setting.value ? "Activo" : "Inactivo"}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            value={String(setting.value)}
                            onChange={(event) =>
                              setSettings((current) =>
                                current.map((item) =>
                                  item.key === key
                                    ? {
                                        ...item,
                                        value:
                                          key ===
                                          "default_affiliate_commission_rate"
                                            ? Number(event.target.value)
                                            : event.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="w-40 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2 text-xs"
                          />
                          <button
                            type="button"
                            disabled={saving === key}
                            onClick={() => void save(setting, setting.value)}
                            className="rounded-xl bg-red-600 p-2 text-white"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      {confirmation && (
        <ConfirmDialog
          open
          title="Confirmar cambio crítico"
          message={`¿Confirmas ${labels[confirmation.setting.key].toLowerCase()}?`}
          variant="warning"
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void save(confirmation.setting, confirmation.value)}
        />
      )}
    </section>
  );
};

export default PlatformSettingsPanel;

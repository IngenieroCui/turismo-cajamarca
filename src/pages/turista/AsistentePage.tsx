import React, { useEffect, useMemo, useState } from "react";
import { Bot, MessageCircleQuestion, Save, Trash2 } from "lucide-react";
import CatalogItemCard from "../../components/tourist/CatalogItemCard";
import { useAuthStore } from "../../context/useAuthStore";
import { usePlatformConfig } from "../../context/usePlatformConfig";
import {
  deleteItinerary,
  generateItinerary,
  getMyItineraries,
  getPersonalizedRecommendations,
  askCatalog,
  saveItinerary,
} from "../../services/recommendationService";
import type {
  AssistantResponse,
  Itinerary,
  ItineraryBudget,
  RecommendedCatalogItem,
  TravelPreference,
} from "../../types/intelligence.types";
import WorkspaceSection from "../../components/workspace/WorkspaceSection";
import ModalShell from "../../components/ui/ModalShell";
import { formatItinerarySlot } from "../../utils/uiFormatters";

const preferences: Array<[TravelPreference, string]> = [
  ["naturaleza", "Naturaleza"],
  ["aventura", "Aventura"],
  ["gastronomia", "Gastronomía"],
  ["cultura", "Cultura"],
  ["descanso", "Descanso"],
  ["familia", "Familia"],
  ["artesania", "Artesanía"],
  ["eventos", "Eventos"],
  ["alojamiento", "Alojamiento"],
];
const slots: Array<Itinerary["items"][number]["slot"]> = [
  "morning",
  "midday",
  "afternoon",
  "evening",
];

export const AsistentePage: React.FC = () => {
  const assistantEnabled = usePlatformConfig((state) => state.assistantEnabled);
  const { profile } = useAuthStore();
  const [recommendations, setRecommendations] = useState<
    RecommendedCatalogItem[]
  >([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [generated, setGenerated] = useState<Itinerary | null>(null);
  const [selected, setSelected] = useState<Itinerary | null>(null);
  const [days, setDays] = useState(2);
  const [interests, setInterests] = useState<TravelPreference[]>([]);
  const [budget, setBudget] = useState<ItineraryBudget>("flexible");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [items, saved] = await Promise.all([
        getPersonalizedRecommendations(12),
        getMyItineraries(),
      ]);
      setRecommendations(items);
      setItineraries(saved);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el asistente.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setInterests(
        (profile?.travel_preferences || []).filter(
          (value): value is TravelPreference =>
            preferences.some(([option]) => option === value),
        ),
      );
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [profile]);
  const groupedGenerated = useMemo(
    () =>
      Array.from({ length: generated?.days || 0 }, (_, index) => ({
        day: index + 1,
        items:
          generated?.items.filter((item) => item.dayNumber === index + 1) || [],
      })),
    [generated],
  );
  if (!assistantEnabled)
    return (
      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-6 text-sm">
        El asistente está deshabilitado temporalmente.
      </div>
    );
  const generate = async () => {
    setWorking(true);
    setError(null);
    try {
      setGenerated(
        await generateItinerary({ days, interests, budgetLevel: budget }),
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible generar el itinerario.",
      );
    } finally {
      setWorking(false);
    }
  };
  const save = async () => {
    if (!generated || !name.trim()) {
      setError("Escribe un nombre para guardar el itinerario.");
      return;
    }
    setWorking(true);
    try {
      await saveItinerary({
        name,
        days: generated.days,
        interests: generated.interests,
        budgetLevel: generated.budgetLevel,
        items: generated.items,
      });
      setName("");
      setGenerated(null);
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar el itinerario.",
      );
    } finally {
      setWorking(false);
    }
  };
  const remove = async (id: string) => {
    setWorking(true);
    try {
      await deleteItinerary(id);
      setSelected(null);
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible eliminar el itinerario.",
      );
    } finally {
      setWorking(false);
    }
  };
  const ask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;
    setWorking(true);
    try {
      setAnswer(await askCatalog(query));
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible consultar el catálogo.",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <header className="rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 via-[var(--bg-secondary)] to-[var(--bg-secondary)] p-6 shadow-xl sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15">
            <Bot className="h-7 w-7 text-emerald-300" />
          </div>
          <div>
            <h1 className="m-0 text-2xl font-black sm:text-3xl">
              Asistente de viaje
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Descubre, planifica y guarda tu próxima experiencia con datos del
              catálogo publicado.
            </p>
          </div>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      <WorkspaceSection
        title="Para ti"
        description="Experiencias ordenadas con tus preferencias y datos reales del catálogo."
      >
        {loading && (
          <p className="text-sm text-[var(--text-secondary)]">
            Cargando recomendaciones...
          </p>
        )}
        {!loading && !recommendations.length && (
          <p className="rounded-2xl bg-[var(--bg-secondary)] p-5 text-sm text-[var(--text-secondary)]">
            Selecciona tus intereses para mejorar tus recomendaciones.
          </p>
        )}
        {!loading && recommendations.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((recommendation) => (
              <div key={recommendation.id}>
                <CatalogItemCard item={recommendation} />
                <div className="mt-2 flex flex-wrap gap-1.5 px-2">
                  {recommendation.reasons.map((reason) => (
                    <span
                      key={reason.code}
                      className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300"
                    >
                      {reason.text}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </WorkspaceSection>
      <WorkspaceSection
        title="Planear viaje"
        description="Un flujo visible de tres pasos; puedes ajustar todo en la misma página."
      >
        <section className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5 shadow-xl sm:p-6">
          <div className="mb-5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                Paso 1
              </p>
              <p className="mt-1 text-sm font-bold">Duración</p>
            </div>
            <div className="rounded-xl border border-[var(--border-light)] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Paso 2
              </p>
              <p className="mt-1 text-sm font-bold">Intereses + presupuesto</p>
            </div>
            <div className="rounded-xl border border-[var(--border-light)] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Paso 3
              </p>
              <p className="mt-1 text-sm font-bold">Generar / guardar</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label
              htmlFor="itinerary-days"
              className="text-xs font-semibold text-[var(--text-secondary)]"
            >
              Duración
              <select
                id="itinerary-days"
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                  <option key={value} value={value}>
                    {value} día{value === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
            <label
              htmlFor="itinerary-budget"
              className="text-xs font-semibold text-[var(--text-secondary)]"
            >
              Presupuesto
              <select
                id="itinerary-budget"
                value={budget}
                onChange={(event) =>
                  setBudget(event.target.value as ItineraryBudget)
                }
                className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
              >
                <option value="economico">Económico</option>
                <option value="moderado">Moderado</option>
                <option value="premium">Premium</option>
                <option value="flexible">Flexible</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={working}
                onClick={() => void generate()}
                className="min-h-11 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {working ? "Generando..." : "Generar itinerario"}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {preferences.map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() =>
                  setInterests((current) =>
                    current.includes(value)
                      ? current.filter((entry) => entry !== value)
                      : [...current, value],
                  )
                }
                className={`min-h-10 rounded-full border px-3 py-1.5 text-xs font-bold ${
                  interests.includes(value)
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-[var(--border-light)] text-[var(--text-secondary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {generated && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label="Nombre del itinerario"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nombre del itinerario"
                  className="min-h-11 min-w-52 flex-1 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
                />
                <button
                  type="button"
                  disabled={working}
                  onClick={() => void save()}
                  className="min-h-11 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  <Save className="mr-2 inline h-4 w-4" />
                  Guardar itinerario
                </button>
              </div>
              {groupedGenerated.map((day) => (
                <div
                  key={day.day}
                  className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-4"
                >
                  <h3 className="m-0 text-sm font-bold">Día {day.day}</h3>
                  {slots.map((slot) => {
                    const item = day.items.find((entry) => entry.slot === slot);
                    return item?.catalogItem ? (
                      <p
                        key={slot}
                        className="mt-2 text-sm text-[var(--text-secondary)]"
                      >
                        <strong className="text-[var(--text-primary)]">
                          {formatItinerarySlot(slot)}:
                        </strong>{" "}
                        {item.catalogItem.title}
                      </p>
                    ) : null;
                  })}
                </div>
              ))}
            </div>
          )}
        </section>
      </WorkspaceSection>
      <WorkspaceSection
        title="Preguntar al catálogo"
        description="Busca por tipo, lugar, interés o palabras sencillas."
      >
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5 text-amber-300" />
          <form
            onSubmit={(event) => void ask(event)}
            className="flex min-w-0 flex-1 gap-2"
          >
            <label htmlFor="catalog-question" className="sr-only">
              Pregunta al catálogo
            </label>
            <input
              id="catalog-question"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. naturaleza y aventura"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={working}
              className="min-h-11 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50"
            >
              Consultar
            </button>
          </form>
        </div>
        {answer && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              {answer.text}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {answer.items.map((item) => (
                <CatalogItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </WorkspaceSection>
      <WorkspaceSection
        title="Itinerarios guardados"
        description="Recupera tus planes para comparar y ajustar tu viaje."
      >
        {!itineraries.length && (
          <p className="rounded-2xl bg-[var(--bg-secondary)] p-5 text-sm text-[var(--text-secondary)]">
            Aún no has guardado itinerarios.
          </p>
        )}
        {itineraries.map((itinerary) => (
          <article
            key={itinerary.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4"
          >
            <div>
              <h3 className="m-0 text-sm font-bold">{itinerary.name}</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {itinerary.days} día{itinerary.days === 1 ? "" : "s"} ·{" "}
                {itinerary.createdAt
                  ? new Date(itinerary.createdAt).toLocaleDateString("es-CO")
                  : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(itinerary)}
                className="min-h-10 rounded-xl border border-[var(--border-light)] px-3 py-2 text-xs font-bold"
              >
                Ver detalles
              </button>
              <button
                type="button"
                onClick={() => itinerary.id && void remove(itinerary.id)}
                className="min-h-10 rounded-xl border border-red-500/30 p-2 text-red-300"
                aria-label={`Eliminar ${itinerary.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </WorkspaceSection>
      {selected && (
        <ModalShell
          open
          title={selected.name}
          description={`${selected.days} día${selected.days === 1 ? "" : "s"}`}
          onClose={() => setSelected(null)}
        >
          {Array.from({ length: selected.days }, (_, index) => (
            <div
              key={index}
              className="mb-3 rounded-xl bg-[var(--bg-primary)] p-3"
            >
              <strong className="text-sm">Día {index + 1}</strong>
              {selected.items
                .filter((item) => item.dayNumber === index + 1)
                .map((item) => (
                  <p
                    key={`${item.dayNumber}-${item.slot}-${item.catalogItemId}`}
                    className="mt-2 text-sm text-[var(--text-secondary)]"
                  >
                    <strong className="text-[var(--text-primary)]">
                      {formatItinerarySlot(item.slot)}:
                    </strong>{" "}
                    {item.catalogItem?.title || "Experiencia publicada"}
                  </p>
                ))}
            </div>
          ))}
        </ModalShell>
      )}
    </div>
  );
};

export default AsistentePage;

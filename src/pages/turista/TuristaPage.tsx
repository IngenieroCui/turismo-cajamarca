import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Hotel,
  Utensils,
  Compass,
  Calendar,
  ShoppingBag,
  PhoneCall,
  User,
  Sparkles,
  Search,
  ChevronRight,
  Mountain,
  X,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "../../context/useAuthStore";
import {
  getFavoriteItemIds,
  getPublishedCatalogItems,
} from "../../services/catalogService";
import {
  getMyItineraries,
  getPersonalizedRecommendations,
} from "../../services/recommendationService";
import { getMyReservations } from "../../services/marketplaceService";
import type { CatalogItem } from "../../types/tourism.types";
import type { RecommendedCatalogItem } from "../../types/intelligence.types";
import CatalogItemCard from "../../components/tourist/CatalogItemCard";
import JourneyChecklist from "../../components/workspace/JourneyChecklist";

export const TuristaPage: React.FC = () => {
  const { profile } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [attractions, setAttractions] = useState<CatalogItem[]>([]);
  const [gastronomy, setGastronomy] = useState<CatalogItem[]>([]);
  const [recommendations, setRecommendations] = useState<
    RecommendedCatalogItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journeyData, setJourneyData] = useState({
    favorites: 0,
    itineraries: 0,
    reservations: 0,
  });
  useEffect(() => {
    let mounted = true;
    void Promise.all([
      getPublishedCatalogItems({ type: "atractivo", featured: true }),
      getPublishedCatalogItems({ type: "gastronomia", limit: 3 }),
      getPersonalizedRecommendations(6),
      getFavoriteItemIds(),
      getMyReservations(),
      getMyItineraries(),
    ])
      .then(
        ([
          attractionItems,
          gastronomyItems,
          recommendationItems,
          favoriteIds,
          reservations,
          itineraries,
        ]) => {
          if (!mounted) return;
          setAttractions(attractionItems);
          setGastronomy(gastronomyItems);
          setRecommendations(recommendationItems);
          setJourneyData({
            favorites: favoriteIds.length,
            reservations: reservations.length,
            itineraries: itineraries.length,
          });
        },
      )
      .catch((err: unknown) => {
        if (mounted)
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar el contenido destacado.",
          );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const categories = useMemo(
    () => [
      "Todos",
      ...Array.from(
        new Set(
          attractions
            .map((item) => item.category)
            .filter((category): category is string => Boolean(category)),
        ),
      ),
    ],
    [attractions],
  );
  const filteredAttractions = attractions.filter((item) => {
    const query = searchQuery.toLocaleLowerCase();
    const matchesSearch =
      !query ||
      [item.title, item.shortDescription, item.description, item.location]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLocaleLowerCase().includes(query));
    return (
      matchesSearch &&
      (selectedCategory === "Todos" || item.category === selectedCategory)
    );
  });
  const modules = [
    [
      "Atractivos & Rutas",
      "Bosques de Palma de Cera, Cañón del Anaime y Volcán Machín.",
      MapPin,
      "/turista/atractivos",
      "Ecoturismo",
    ],
    [
      "Alojamientos & Hoteles",
      "Fincas agroturísticas, posadas rurales y hoteles formales.",
      Hotel,
      "/turista/alojamientos",
      "Hospedaje",
    ],
    [
      "Gastronomía Tolimense",
      "Tamal tolimense, lechona, arracacha y sancocho criollo.",
      Utensils,
      "/turista/gastronomia",
      "Despensa Agrícola",
    ],
    [
      "Tours & Guiado Oficial",
      "Excursiones con guías profesionales y agencias autorizadas.",
      Compass,
      "/turista/tours",
      "Aventura",
    ],
    [
      "Eventos & Fiestas",
      "Carnaval, encuentros y ferias agrícolas.",
      Calendar,
      "/turista/eventos",
      "Cultura",
    ],
    [
      "Artesanías & Comercio",
      "Productos del campo, tejidos y recuerdos locales.",
      ShoppingBag,
      "/turista/artesanias",
      "Comercio",
    ],
    [
      "Asistencia al Turista",
      "Línea de emergencia y apoyo durante tu visita.",
      PhoneCall,
      "/turista/asistencia",
      "Ayuda",
    ],
    [
      "Mi Perfil Turístico",
      "Gestiona tus datos y preferencias de viaje.",
      User,
      "/turista/perfil",
      "Cuenta",
    ],
  ] as const;
  const journeySteps = [
    {
      id: "preferences",
      label: "Personaliza tus intereses",
      description: "Cuéntanos qué tipo de viaje quieres vivir.",
      complete: (profile?.travel_preferences?.length || 0) > 0,
      action: <Link to="/turista/perfil">Configurar perfil</Link>,
    },
    {
      id: "favorites",
      label: "Guarda experiencias",
      description: "Conserva opciones para comparar y planear.",
      complete: journeyData.favorites > 0,
      action: <Link to="/turista/atractivos">Explorar experiencias</Link>,
    },
    {
      id: "plan",
      label: "Planifica o reserva",
      description: "Crea un itinerario o solicita una experiencia.",
      complete: journeyData.itineraries > 0 || journeyData.reservations > 0,
      action: <Link to="/turista/asistente">Planear mi viaje</Link>,
    },
    {
      id: "manage",
      label: "Gestiona tu viaje",
      description: "Consulta tus solicitudes y reservas.",
      complete: journeyData.reservations > 0,
      action: <Link to="/turista/reservas">Ver reservas</Link>,
    },
  ];
  return (
    <div className="space-y-10 pb-8">
      <JourneyChecklist
        title="Tu viaje"
        description={
          journeySteps.every((step) => step.complete)
            ? "Tu experiencia de viaje está configurada."
            : "Avanza con acciones concretas para organizar tu experiencia."
        }
        steps={journeySteps}
      />
      {recommendations.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-bold sm:text-xl">
                Recomendado para ti
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Sugerencias basadas en tus intereses y el catálogo publicado.
              </p>
            </div>
            <Link
              to="/turista/asistente"
              className="text-xs font-bold text-[var(--color-primary-light)]"
            >
              Ver asistente
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((item) => (
              <div key={item.id}>
                <CatalogItemCard item={item} />
                <div className="mt-2 flex flex-wrap gap-1 px-2">
                  {item.reasons.slice(0, 2).map((reason) => (
                    <span
                      key={reason.code}
                      className="text-[11px] text-emerald-300"
                    >
                      {reason.text}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] shadow-2xl">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1600&q=80"
            alt="Paisaje de Cajamarca"
            className="h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-secondary)] via-[var(--bg-secondary)]/80 to-transparent" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-6 p-6 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300">
            <Sparkles className="h-4 w-4" />
            Cajamarca, Tolima · La Despensa Agrícola de Colombia
          </div>
          <h1 className="m-0 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            ¡Hola, {profile?.full_name?.split(" ")[0] || "Viajero"}!
            <br className="hidden sm:inline" /> Descubre el Corazón Verde del
            Tolima
          </h1>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
            Explora bosques de Palma de Cera, disfruta del auténtico tamal
            tolimense, hospédate en fincas agroturísticas y vive aventuras en la
            Cordillera Central.
          </p>
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
            <label htmlFor="tourist-search" className="sr-only">
              Buscar experiencias
            </label>
            <input
              id="tourist-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar entre los atractivos destacados..."
              className="w-full rounded-2xl border border-[var(--border-medium)] bg-[var(--bg-primary)]/90 py-3.5 pl-12 pr-12 text-sm focus:border-[var(--color-primary-light)] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/turista/atractivos"
              className="inline-flex min-h-11 items-center rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-[var(--color-primary-contrast)]"
            >
              Explorar experiencias
            </Link>
            <Link
              to="/turista/asistente"
              className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)]/70 px-4 py-2.5 text-xs font-bold"
            >
              Planear mi viaje
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                  selectedCategory === category
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)]'
                    : 'border-[var(--border-light)] bg-[var(--bg-primary)]/70 text-[var(--text-secondary)]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="m-0 flex items-center gap-2 text-lg font-bold sm:text-xl">
            <Compass className="h-5 w-5 text-[var(--color-primary-light)]" />
            Explora los servicios de Cajamarca
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Todo lo que necesitas para tu estadía.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map(([title, desc, Icon, path, badge]) => (
            <Link
              key={path}
              to={path}
              className={[
                'group flex flex-col justify-between space-y-4 rounded-3xl',
                'border border-[var(--border-light)] bg-[var(--bg-secondary)]',
                'p-5 shadow-xl transition hover:-translate-y-1',
                'hover:border-[var(--color-primary-light)]/60',
              ].join(' ')}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-light)] bg-[var(--color-primary)]/10 text-[var(--color-primary-light)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full border border-[var(--border-light)] bg-[var(--bg-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)]">
                    {badge}
                  </span>
                </div>
                <div>
                  <h3 className="m-0 text-base font-bold group-hover:text-[var(--color-primary-light)]">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {desc}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 border-t border-[var(--border-light)] pt-3 text-xs font-semibold text-[var(--color-primary-light)]">
                Ingresar al catálogo
                <ChevronRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 flex items-center gap-2 text-lg font-bold sm:text-xl">
              <Mountain className="h-5 w-5 text-emerald-400" />
              Atractivos emblemáticos y rutas
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Destinos imperdibles en Cajamarca, Tolima.
            </p>
          </div>
          <Link
            to="/turista/atractivos"
            className="flex items-center gap-1 text-xs font-bold text-[var(--color-primary-light)]"
          >
            Ver todos ({attractions.length})<ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {loading && (
          <p className="text-sm text-[var(--text-secondary)]">
            Cargando contenido destacado...
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </p>
        )}
        {!loading && !error && filteredAttractions.length === 0 && (
          <p className="rounded-2xl bg-[var(--bg-secondary)] p-5 text-sm text-[var(--text-secondary)]">
            No hay atractivos destacados para esta búsqueda.
          </p>
        )}
        {!loading && !error && filteredAttractions.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAttractions.map((item) => (
              <CatalogItemCard key={item.id} item={item} accent="emerald" />
            ))}
          </div>
        )}
      </section>
      <section className="space-y-6 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-[var(--bg-secondary)] to-[var(--bg-secondary)] p-6 shadow-2xl sm:p-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
              Gastronomía de Cajamarca
            </span>
            <h2 className="my-2 text-xl font-bold sm:text-2xl">
              Sabores auténticos de la Despensa Agrícola
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Disfruta de la cocina tradicional campesina y tolimense.
            </p>
          </div>
          <Link
            to="/turista/gastronomia"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950"
          >
            <Utensils className="h-4 w-4" />
            Ver menú gastronómico
          </Link>
        </div>
        {!loading && !error && gastronomy.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)]">
            No hay gastronomía publicada.
          </p>
        )}
        {!loading && !error && gastronomy.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gastronomy.map((item) => (
              <CatalogItemCard key={item.id} item={item} accent="amber" />
            ))}
          </div>
        )}
      </section>
      <section className="space-y-6 rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-6 shadow-2xl sm:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
            <Navigation className="h-3.5 w-3.5" />
            Ubicación y accesos
          </div>
          <h2 className="my-2 text-xl font-bold sm:text-2xl">
            ¿Cómo llegar a Cajamarca, Tolima?
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Ubicado sobre la Carretera Panamericana, en el corazón de Colombia.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl bg-[var(--bg-primary)] p-5">
            <div className="flex items-center gap-3 text-sm font-bold text-emerald-400">
              <MapPin className="h-5 w-5" />
              Desde Ibagué
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Cajamarca está a 35 kilómetros de Ibagué, aproximadamente 45
              minutos en automóvil.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Buses frecuentes desde la terminal.
            </div>
          </div>
          <div className="space-y-3 rounded-2xl bg-[var(--bg-primary)] p-5">
            <div className="flex items-center gap-3 text-sm font-bold text-blue-400">
              <Navigation className="h-5 w-5" />
              Desde Armenia
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Cruza la Cordillera Central por la vía Panamericana y el Túnel de
              La Línea.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
              Conecta la Ruta del Café con el Tolima.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TuristaPage;

import { supabase } from "../lib/supabase/client";
import { getActivePromotionsForItems } from "./promotionService";
import { getPublishedCatalogItems } from "./catalogService";
import type { CatalogItem } from "../types/tourism.types";
import type {
  AssistantResponse,
  GenerateItineraryInput,
  Itinerary,
  ItineraryBudget,
  ItineraryItem,
  ItinerarySlot,
  RecommendedCatalogItem,
  RecommendationReason,
  SaveItineraryInput,
  TravelPreference,
} from "../types/intelligence.types";

type DatabaseRow = Record<string, unknown>;

const SCORE = {
  rating: 2,
  featured: 1.5,
  preference: 6,
  favoriteSimilarity: 3,
  historySimilarity: 2,
} as const;
const PREFERENCES: TravelPreference[] = [
  "naturaleza",
  "aventura",
  "gastronomia",
  "cultura",
  "descanso",
  "familia",
  "artesania",
  "eventos",
  "alojamiento",
];
const SLOTS: ItinerarySlot[] = ["morning", "midday", "afternoon", "evening"];
const ITINERARY_SELECT = [
  "*, turismo_itinerary_items(*, turismo_catalog_items(",
  "id,provider_id,item_type,title,slug,category,short_description,description,location,cover_image_url,is_reservable,is_featured,rating,reviews_count,published_at,created_at,updated_at))",
].join("");

const textOf = (item: CatalogItem): string =>
  [
    item.title,
    item.category,
    item.itemType,
    item.location,
    item.shortDescription,
    item.description,
    item.metadata.popularIn,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
const tokens = (value: string): string[] =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);

const matchesPreference = (
  item: CatalogItem,
  preference: TravelPreference,
): boolean => {
  const text = textOf(item);
  if (
    preference === "gastronomia" ||
    preference === "artesania" ||
    preference === "eventos" ||
    preference === "alojamiento"
  )
    return item.itemType === preference;
  if (preference === "naturaleza")
    return (
      (item.itemType === "atractivo" || item.itemType === "tour") &&
      /natur|bosque|cascad|rio|volcan|ecotur|palma|montana|paisaje/.test(text)
    );
  if (preference === "aventura")
    return (
      (item.itemType === "tour" || item.itemType === "atractivo") &&
      (item.difficulty === "moderado" ||
        item.difficulty === "exigente" ||
        /trek|aventura|sender|cicl|montan|termal/.test(text))
    );
  if (preference === "cultura")
    return (
      ["atractivo", "evento", "artesania"].includes(item.itemType) &&
      /cultur|histori|tradicion|festiv|patrimonio|museo|feria/.test(text)
    );
  if (preference === "descanso")
    return (
      item.itemType === "alojamiento" ||
      item.difficulty === "facil" ||
      /termal|relaj|descanso|tranquil/.test(text)
    );
  return (
    item.difficulty === "facil" || /famil|nino|niña|niñ|parque|facil/.test(text)
  );
};

const addReason = (
  reasons: RecommendationReason[],
  code: string,
  text: string,
): void => {
  if (!reasons.some((reason) => reason.code === code))
    reasons.push({ code, text });
};

const currentUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("No hay una sesión activa.");
  return data.user.id;
};

const relationObject = (value: unknown): DatabaseRow | null => {
  if (Array.isArray(value)) return (value[0] || null) as DatabaseRow | null;
  return value && typeof value === "object" ? (value as DatabaseRow) : null;
};

export const getPersonalizedRecommendations = async (
  limit = 12,
): Promise<RecommendedCatalogItem[]> => {
  const [catalog, userId] = await Promise.all([
    getPublishedCatalogItems(),
    currentUserId(),
  ]);
  const [{ data: tourist }, { data: favorites }, { data: reservations }] =
    await Promise.all([
      supabase
        .from("turismo_tourist_profiles")
        .select("travel_preferences")
        .eq("profile_id", userId)
        .maybeSingle(),
      supabase
        .from("turismo_favorites")
        .select("item_id")
        .eq("user_id", userId),
      supabase
        .from("turismo_reservations")
        .select("item_id, status, turismo_catalog_items(item_type, category)")
        .eq("tourist_id", userId),
    ]);
  const preferences = Array.isArray(tourist?.travel_preferences)
    ? tourist.travel_preferences.filter(
        (entry): entry is TravelPreference =>
          typeof entry === "string" &&
          PREFERENCES.includes(entry as TravelPreference),
      )
    : [];
  const favoriteIds = new Set(
    (favorites || []).map((row) => String((row as DatabaseRow).item_id)),
  );
  const favoriteItems = catalog.filter((item) => favoriteIds.has(item.id));
  const historyTypes = new Set(
    (reservations || [])
      .filter((row) =>
        ["requested", "confirmed", "completed"].includes(String(row.status)),
      )
      .map((row) =>
        String(
          relationObject((row as DatabaseRow).turismo_catalog_items)
            ?.item_type || "",
        ),
      ),
  );
  const promotionMap = await getActivePromotionsForItems(
    catalog.map((item) => item.id),
  );
  return catalog
    .map((item) => {
      let score =
        item.rating * SCORE.rating + (item.isFeatured ? SCORE.featured : 0);
      const reasons: RecommendationReason[] = [];
      if (item.rating >= 4.5)
        addReason(reasons, "rating", "Alta valoración de viajeros");
      if (item.isFeatured)
        addReason(reasons, "featured", "Destacado en Cajamarca");
      for (const preference of preferences)
        if (matchesPreference(item, preference)) {
          score += SCORE.preference;
          addReason(
            reasons,
            `preference-${preference}`,
            `Coincide con tu interés en ${preference}`,
          );
        }
      if (
        favoriteItems.some(
          (favorite) =>
            favorite.itemType === item.itemType ||
            favorite.category === item.category,
        )
      ) {
        score += SCORE.favoriteSimilarity;
        addReason(reasons, "favorite", "Similar a experiencias que guardaste");
      }
      if (historyTypes.has(item.itemType)) {
        score += SCORE.historySimilarity;
        addReason(
          reasons,
          "history",
          "Relacionado con experiencias que disfrutaste",
        );
      }
      if (!reasons.length)
        addReason(reasons, "catalog", "Seleccionado del catálogo publicado");
      return {
        ...item,
        score,
        reasons,
        activePromotion: promotionMap.get(item.id)?.[0] || null,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.title.localeCompare(right.title),
    )
    .slice(0, Math.max(1, limit));
};

const slotMatches = (item: CatalogItem, slot: ItinerarySlot): boolean => {
  if (slot === "morning")
    return item.itemType === "atractivo" || item.itemType === "tour";
  if (slot === "midday" || slot === "evening")
    return item.itemType === "gastronomia" || item.itemType === "evento";
  return (
    item.itemType === "atractivo" ||
    item.itemType === "artesania" ||
    item.itemType === "evento"
  );
};

const budgetScore = (item: CatalogItem, budget: ItineraryBudget): number => {
  if (budget === "flexible" || item.priceFrom === null) return 0;
  if (budget === "economico") return -item.priceFrom / 100000;
  if (budget === "premium") return item.priceFrom / 100000 + item.rating;
  return item.rating - item.priceFrom / 200000;
};

export const generateItinerary = async (
  input: GenerateItineraryInput,
): Promise<Itinerary> => {
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 7)
    throw new Error("El itinerario debe tener entre 1 y 7 días.");
  const recommendations = await getPersonalizedRecommendations(100);
  const used = new Set<string>();
  const items: ItineraryItem[] = [];
  for (let day = 1; day <= input.days; day += 1) {
    let filled = 0;
    for (const slot of SLOTS) {
      const candidate = recommendations
        .filter((item) => !used.has(item.id) && slotMatches(item, slot))
        .sort(
          (left, right) =>
            right.score +
            budgetScore(right, input.budgetLevel) -
            (left.score + budgetScore(left, input.budgetLevel)),
        )[0];
      if (!candidate) continue;
      used.add(candidate.id);
      items.push({
        catalogItemId: candidate.id,
        catalogItem: candidate,
        dayNumber: day,
        slot,
        position: 0,
      });
      filled += 1;
      if (filled >= 3) break;
    }
  }
  return {
    name: "Itinerario sugerido",
    days: input.days,
    interests: input.interests,
    budgetLevel: input.budgetLevel,
    notes: null,
    items,
  };
};

const mapItinerary = (value: unknown): Itinerary => {
  const row = (value || {}) as DatabaseRow;
  const rows = Array.isArray(row.turismo_itinerary_items)
    ? row.turismo_itinerary_items
    : [];
  return {
    id: String(row.id || ""),
    touristId: typeof row.tourist_id === "string" ? row.tourist_id : undefined,
    name: String(row.name || ""),
    days: Number(row.days || 1),
    interests: Array.isArray(row.interests)
      ? row.interests.filter(
          (entry): entry is TravelPreference => typeof entry === "string",
        )
      : [],
    budgetLevel: row.budget_level as ItineraryBudget,
    notes: typeof row.notes === "string" ? row.notes : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
    items: rows.map((entry) => {
      const itemRow = entry as DatabaseRow;
      const catalog = itemRow.turismo_catalog_items as DatabaseRow | null;
      return {
        id: typeof itemRow.id === "string" ? itemRow.id : undefined,
        catalogItemId: String(itemRow.catalog_item_id || ""),
        dayNumber: Number(itemRow.day_number || 1),
        slot: itemRow.slot as ItinerarySlot,
        position: Number(itemRow.position || 0),
        catalogItem: catalog
          ? {
              id: String(catalog.id),
              providerId:
                typeof catalog.provider_id === "string"
                  ? catalog.provider_id
                  : null,
              itemType: catalog.item_type as CatalogItem["itemType"],
              title: String(catalog.title || ""),
              slug: String(catalog.slug || ""),
              category:
                typeof catalog.category === "string" ? catalog.category : null,
              shortDescription: String(catalog.short_description || ""),
              description:
                typeof catalog.description === "string"
                  ? catalog.description
                  : null,
              location:
                typeof catalog.location === "string" ? catalog.location : null,
              address: null,
              latitude: null,
              longitude: null,
              coverImageUrl:
                typeof catalog.cover_image_url === "string"
                  ? catalog.cover_image_url
                  : null,
              contactWhatsapp: null,
              priceFrom: null,
              priceTo: null,
              priceLabel: null,
              currency: "COP",
              durationText: null,
              difficulty: null,
              isReservable: Boolean(catalog.is_reservable),
              metadata: {},
              status: "published",
              moderationReason: null,
              isFeatured: Boolean(catalog.is_featured),
              rating: Number(catalog.rating || 0),
              reviewsCount: Number(catalog.reviews_count || 0),
              publishedAt:
                typeof catalog.published_at === "string"
                  ? catalog.published_at
                  : null,
              createdAt: String(catalog.created_at || ""),
              updatedAt: String(catalog.updated_at || ""),
            }
          : null,
      };
    }),
  };
};

export const getMyItineraries = async (): Promise<Itinerary[]> => {
  const { data, error } = await supabase
    .from("turismo_itineraries")
    .select(ITINERARY_SELECT)
    .order("created_at", { ascending: false });
  if (error)
    throw new Error(`No fue posible cargar tus itinerarios: ${error.message}`);
  return (data || []).map(mapItinerary);
};

export const saveItinerary = async (
  input: SaveItineraryInput,
): Promise<string> => {
  const payload = input.items.map((item) => ({
    catalog_item_id: item.catalogItemId,
    day_number: item.dayNumber,
    slot: item.slot,
    position: item.position,
  }));
  const { data, error } = await supabase.rpc("turismo_save_itinerary", {
    p_name: input.name,
    p_days: input.days,
    p_interests: input.interests,
    p_budget_level: input.budgetLevel,
    p_items: payload,
  });
  if (error)
    throw new Error(`No fue posible guardar el itinerario: ${error.message}`);
  return typeof data === "string"
    ? data
    : String((data as DatabaseRow | null)?.id || "");
};

export const deleteItinerary = async (id: string): Promise<void> => {
  const { error } = await supabase.rpc("turismo_delete_itinerary", {
    p_itinerary_id: id,
  });
  if (error)
    throw new Error(`No fue posible eliminar el itinerario: ${error.message}`);
};

export const askCatalog = async (query: string): Promise<AssistantResponse> => {
  const catalog = await getPublishedCatalogItems();
  const normalized = query
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const concepts: Record<string, string[]> = {
    hotel: ["alojamiento"],
    alojamiento: ["alojamiento"],
    dormir: ["alojamiento"],
    restaurante: ["gastronomia"],
    comer: ["gastronomia"],
    comida: ["gastronomia"],
    tour: ["tour"],
    naturaleza: ["naturaleza"],
    aventura: ["aventura"],
    artesania: ["artesania"],
    evento: ["evento"],
    familia: ["familia"],
    barato: ["economico"],
    economico: ["economico"],
  };
  const queryTokens = tokens(normalized);
  const conceptWords = Object.entries(concepts)
    .filter(([word]) => normalized.includes(word))
    .flatMap(([, values]) => values);
  const matches = catalog
    .map((item) => {
      const text = textOf(item);
      const tokenScore = queryTokens.reduce(
        (score, token) => score + (text.includes(token) ? 2 : 0),
        0,
      );
      const conceptScore = conceptWords.reduce(
        (score, concept) =>
          score +
          (concept === "economico"
            ? item.priceFrom !== null && item.priceFrom < 100000
              ? 3
              : 0
            : matchesPreference(item, concept as TravelPreference)
              ? 3
              : 0),
        0,
      );
      return { item, score: tokenScore + conceptScore + item.rating * 0.2 };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
  const selected = matches.length
    ? matches.map((entry) => entry.item)
    : catalog
        .filter((item) => item.isFeatured || item.rating >= 4.5)
        .slice(0, 6);
  const promotionMap = await getActivePromotionsForItems(
    selected.map((item) => item.id),
  );
  const items: RecommendedCatalogItem[] = selected.map((item) => ({
    ...item,
    score:
      matches.find((entry) => entry.item.id === item.id)?.score || item.rating,
    reasons: [
      {
        code: "query",
        text: matches.length
          ? "Coincide con tu búsqueda en el catálogo publicado"
          : "Experiencia destacada del catálogo publicado",
      },
    ],
    activePromotion: promotionMap.get(item.id)?.[0] || null,
  }));
  return {
    text: matches.length
      ? `Encontré ${matches.length} experiencias relacionadas con tu búsqueda.`
      : "No encontré una coincidencia exacta. Estas son algunas experiencias destacadas de Cajamarca.",
    items,
  };
};

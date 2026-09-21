import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { getFavoriteItems } from "../../services/catalogService";
import type { CatalogItem } from "../../types/tourism.types";
import CatalogItemCard from "../../components/tourist/CatalogItemCard";

export const FavoritosPage: React.FC = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void getFavoriteItems()
      .then((data) => {
        if (mounted) setItems(data);
      })
      .catch((err: unknown) => {
        if (mounted)
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar tus favoritos.",
          );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <Heart className="h-7 w-7 fill-rose-400 text-rose-400" />
          <div>
            <h1 className="m-0 text-2xl font-bold">Favoritos</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Tu lista para comparar y planear.
            </p>
          </div>
        </div>
      </div>
      {loading && (
        <p className="text-sm text-[var(--text-secondary)]">
          Cargando favoritos...
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-6 text-sm text-[var(--text-secondary)]">
          <p className="m-0">
            Aún no tienes favoritos. Guarda experiencias para compararlas antes
            de planear.
          </p>
          <Link
            to="/turista/atractivos"
            className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-[var(--color-primary-contrast)]"
          >
            Explorar experiencias
          </Link>
        </div>
      )}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CatalogItemCard key={item.id} item={item} accent="rose" />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritosPage;

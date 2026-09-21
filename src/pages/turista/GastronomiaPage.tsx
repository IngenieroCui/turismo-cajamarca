import React, { useEffect, useMemo, useState } from 'react';
import { Search, Utensils } from 'lucide-react';
import { getPublishedCatalogItems } from '../../services/catalogService';
import type { CatalogItem } from '../../types/tourism.types';
import CatalogItemCard from '../../components/tourist/CatalogItemCard';

export const GastronomiaPage: React.FC = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getPublishedCatalogItems({ type: 'gastronomia' }).then((data) => { if (mounted) setItems(data); }).catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : 'No fue posible cargar la gastronomía.'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(items.map((item) => item.category).filter((category): category is string => Boolean(category))))], [items]);
  const filteredItems = items.filter((item) => (selectedCategory === 'Todos' || item.category === selectedCategory) && (!searchQuery || [item.title, item.shortDescription, item.description, item.location, item.metadata.popularIn].filter((field): field is string => Boolean(field)).some((field) => field.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()))));

  return <div className="space-y-8 pb-8">
    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/20 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-amber-500/30 shadow-xl"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0"><Utensils className="w-7 h-7" /></div><div><div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold mb-1">Sabores de la Despensa Agrícola</div><h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0">Gastronomía & Restaurantes de Cajamarca Tolima</h1><p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Disfruta del Tamal Tolimense, Lechona crujiente, trucha campestre y especialidades de Arracacha.</p></div></div></div>
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"><div className="relative flex-1 max-w-md"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar tamal, lechona, arracacha..." className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs focus:outline-none focus:border-amber-400" /></div><div className="flex flex-wrap items-center gap-2">{categories.map((category) => <button type="button" key={category} onClick={() => setSelectedCategory(category)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${selectedCategory === category ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-amber-400/40'}`}>{category}</button>)}</div></div>
    {loading && <p className="text-xs text-[var(--text-secondary)]">Cargando gastronomía...</p>}
    {error && <p className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</p>}
    {!loading && !error && filteredItems.length === 0 && <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">No hay opciones gastronómicas publicadas para este filtro.</p>}
    {!loading && !error && filteredItems.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredItems.map((item) => <CatalogItemCard key={item.id} item={item} accent="amber" />)}</div>}
  </div>;
};

export default GastronomiaPage;

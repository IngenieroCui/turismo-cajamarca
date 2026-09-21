import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Hotel, Sparkles } from 'lucide-react';
import { getPublishedCatalogItems } from '../../services/catalogService';
import type { CatalogItem } from '../../types/tourism.types';
import CatalogItemCard from '../../components/tourist/CatalogItemCard';

export const AlojamientosPage: React.FC = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getPublishedCatalogItems({ type: 'alojamiento' }).then((data) => { if (mounted) setItems(data); }).catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : 'No fue posible cargar los alojamientos.'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(items.map((item) => item.category).filter((category): category is string => Boolean(category))))], [items]);
  const filteredItems = selectedCategory === 'Todos' ? items : items.filter((item) => item.category === selectedCategory);

  return <div className="space-y-8 pb-8">
    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-500/20 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-blue-500/30 shadow-xl"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0"><Hotel className="w-7 h-7" /></div><div><div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold mb-1"><Sparkles className="w-3 h-3" /> Hospedaje Verificado en Cajamarca Tolima</div><h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0">Alojamientos, Fincas Agroturísticas & Hoteles</h1><p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Encuentra la tranquilidad del campo o la comodidad urbana en Cajamarca, Tolima.</p></div></div></div>
    <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 mr-2"><Filter className="w-3.5 h-3.5" /> Tipo:</span>{categories.map((category) => <button type="button" key={category} onClick={() => setSelectedCategory(category)} className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer border ${selectedCategory === category ? 'bg-blue-600 text-white border-blue-500' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-blue-400/40'}`}>{category}</button>)}</div>
    {loading && <p className="text-xs text-[var(--text-secondary)]">Cargando alojamientos...</p>}
    {error && <p className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</p>}
    {!loading && !error && filteredItems.length === 0 && <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">No hay alojamientos publicados para este filtro.</p>}
    {!loading && !error && filteredItems.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{filteredItems.map((item) => <CatalogItemCard key={item.id} item={item} accent="blue" horizontal />)}</div>}
  </div>;
};

export default AlojamientosPage;

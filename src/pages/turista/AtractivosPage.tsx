import React, { useEffect, useMemo, useState } from 'react';
import { Filter, MapPin, Sparkles } from 'lucide-react';
import { getPublishedCatalogItems } from '../../services/catalogService';
import type { CatalogItem } from '../../types/tourism.types';
import CatalogItemCard from '../../components/tourist/CatalogItemCard';

export const AtractivosPage: React.FC = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getPublishedCatalogItems({ type: 'atractivo' }).then((data) => { if (mounted) setItems(data); }).catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : 'No fue posible cargar los atractivos.'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(items.map((item) => item.category).filter((category): category is string => Boolean(category))))], [items]);
  const filteredItems = selectedCategory === 'Todos' ? items : items.filter((item) => item.category === selectedCategory);

  return <div className="space-y-8 pb-8">
    <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl relative overflow-hidden"><div className="relative z-10 flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0"><MapPin className="w-7 h-7" /></div><div><div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold mb-1"><Sparkles className="w-3 h-3" /> Naturaleza & Rutas Ecológicas</div><h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0">Atractivos Turísticos de Cajamarca Tolima</h1><p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Explora el Bosque de Palmas de Cera, el Cañón del Anaime, cascadas y volcanes.</p></div></div></div>
    <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 mr-2"><Filter className="w-3.5 h-3.5" /> Filtrar por:</span>{categories.map((category) => <button type="button" key={category} onClick={() => setSelectedCategory(category)} className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer border ${selectedCategory === category ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-emerald-500/40'}`}>{category}</button>)}</div>
    {loading && <p className="text-xs text-[var(--text-secondary)]">Cargando atractivos...</p>}
    {error && <p className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</p>}
    {!loading && !error && filteredItems.length === 0 && <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">No hay atractivos publicados para este filtro.</p>}
    {!loading && !error && filteredItems.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredItems.map((item) => <CatalogItemCard key={item.id} item={item} accent="emerald" />)}</div>}
  </div>;
};

export default AtractivosPage;

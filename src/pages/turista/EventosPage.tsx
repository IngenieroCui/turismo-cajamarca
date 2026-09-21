import React, { useEffect, useState } from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import { getPublishedCatalogItems } from '../../services/catalogService';
import type { CatalogItem } from '../../types/tourism.types';
import CatalogItemCard from '../../components/tourist/CatalogItemCard';

export const EventosPage: React.FC = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getPublishedCatalogItems({ type: 'evento' }).then((data) => { if (mounted) setItems(data); }).catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : 'No fue posible cargar los eventos.'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return <div className="space-y-8 pb-8">
    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-500/20 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-rose-500/30 shadow-xl"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0"><Calendar className="w-7 h-7" /></div><div><div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold mb-1"><Sparkles className="w-3 h-3" /> Calendario Cultural & Deportivo</div><h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0">Eventos & Festividades en Cajamarca Tolima</h1><p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Disfruta del Carnaval del Cerdo, Encuentro Motero y las Ferias de la Arracacha.</p></div></div></div>
    {loading && <p className="text-xs text-[var(--text-secondary)]">Cargando eventos...</p>}
    {error && <p className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</p>}
    {!loading && !error && items.length === 0 && <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">No hay eventos publicados.</p>}
    {!loading && !error && items.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{items.map((item) => <CatalogItemCard key={item.id} item={item} accent="rose" />)}</div>}
  </div>;
};

export default EventosPage;

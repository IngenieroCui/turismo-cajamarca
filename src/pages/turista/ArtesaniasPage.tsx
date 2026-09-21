import React, { useEffect, useState } from 'react';
import { ShoppingBag, Sparkles } from 'lucide-react';
import { getPublishedCatalogItems } from '../../services/catalogService';
import type { CatalogItem } from '../../types/tourism.types';
import CatalogItemCard from '../../components/tourist/CatalogItemCard';

export const ArtesaniasPage: React.FC = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getPublishedCatalogItems({ type: 'artesania' }).then((data) => { if (mounted) setItems(data); }).catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : 'No fue posible cargar las artesanías.'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return <div className="space-y-8 pb-8">
    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-orange-500/20 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-orange-500/30 shadow-xl"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0"><ShoppingBag className="w-7 h-7" /></div><div><div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-bold mb-1"><Sparkles className="w-3 h-3" /> Comercio & Artesanía Campesina</div><h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0">Artesanías & Recuerdos de Cajamarca Tolima</h1><p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Apoya a las familias artesanas y llévate un pedacito de la Despensa Agrícola de Colombia.</p></div></div></div>
    {loading && <p className="text-xs text-[var(--text-secondary)]">Cargando artesanías...</p>}
    {error && <p className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</p>}
    {!loading && !error && items.length === 0 && <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">No hay artesanías publicadas.</p>}
    {!loading && !error && items.length > 0 && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{items.map((item) => <CatalogItemCard key={item.id} item={item} accent="orange" />)}</div>}
  </div>;
};

export default ArtesaniasPage;

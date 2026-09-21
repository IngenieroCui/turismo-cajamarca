import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eraser, Save } from 'lucide-react';
import type { CatalogAvailability, CatalogItem } from '../../types/tourism.types';
import { clearCatalogAvailability, getProviderItemAvailability, setCatalogAvailability } from '../../services/availabilityService';

interface AvailabilityManagerProps { items: CatalogItem[]; providerId?: string | null; onError?: (message: string) => void; }

const today = () => new Date().toISOString().slice(0, 10);

export const AvailabilityManager: React.FC<AvailabilityManagerProps> = ({ items, providerId = null, onError }) => {
  const [itemId, setItemId] = useState(items[0]?.id || '');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [isAvailable, setIsAvailable] = useState(true);
  const [capacity, setCapacity] = useState('');
  const [priceOverride, setPriceOverride] = useState('');
  const [notes, setNotes] = useState('');
  const [filterDays, setFilterDays] = useState<30 | 60 | 90>(30);
  const [rows, setRows] = useState<CatalogAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!items.length) { setRows([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const values = await Promise.all(items.map((item) => getProviderItemAvailability(item.id, providerId || undefined)));
      setRows(values.flat());
    } catch (err: unknown) { const message = err instanceof Error ? err.message : 'No fue posible cargar la disponibilidad.'; setError(message); onError?.(message); } finally { setLoading(false); }
  }, [items, onError, providerId]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { if (!itemId && items[0]) { const timer = window.setTimeout(() => setItemId(items[0].id), 0); return () => window.clearTimeout(timer); } return undefined; }, [itemId, items]);

  const visibleRows = useMemo(() => {
    const limit = new Date(); limit.setDate(limit.getDate() + filterDays);
    return rows.filter((row) => new Date(`${row.availableDate}T00:00:00`) <= limit).sort((a, b) => a.availableDate.localeCompare(b.availableDate) || a.itemId.localeCompare(b.itemId));
  }, [filterDays, rows]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!itemId) return;
    setSaving(true); setError(null);
    try { await setCatalogAvailability({ itemId, startDate, endDate, isAvailable, capacity: capacity ? Number(capacity) : null, priceOverride: priceOverride ? Number(priceOverride) : null, notes: notes || null }, providerId || undefined); await load(); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : 'No fue posible guardar la disponibilidad.'; setError(message); onError?.(message); }
    finally { setSaving(false); }
  };

  const clear = async () => {
    if (!itemId) return; setSaving(true); setError(null);
    try { await clearCatalogAvailability(itemId, startDate, endDate, providerId || undefined); await load(); }
    catch (err: unknown) { const message = err instanceof Error ? err.message : 'No fue posible limpiar el rango.'; setError(message); onError?.(message); }
    finally { setSaving(false); }
  };

  return <section className="space-y-4">
    <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
      <div className="flex items-center gap-2 mb-4"><CalendarDays className="w-5 h-5 text-emerald-400" /><div><h3 className="text-lg font-bold my-0">Gestionar disponibilidad</h3><p className="text-xs text-[var(--text-secondary)] mt-1">Sin registros futuros, el servicio continúa bajo solicitud.</p></div></div>
      <form onSubmit={(event) => void submit(event)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-xs font-semibold text-[var(--text-secondary)] lg:col-span-2">Oferta<select required value={itemId} onChange={(event) => setItemId(event.target.value)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] px-3 py-2.5 text-sm">{items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--text-secondary)]">Desde<input required type="date" min={today()} value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] px-3 py-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-[var(--text-secondary)]">Hasta<input required type="date" min={startDate || today()} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] px-3 py-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-[var(--text-secondary)]">Estado<select value={isAvailable ? 'yes' : 'no'} onChange={(event) => setIsAvailable(event.target.value === 'yes')} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] px-3 py-2.5 text-sm"><option value="yes">Disponible</option><option value="no">No disponible</option></select></label>
        <label className="text-xs font-semibold text-[var(--text-secondary)]">Capacidad<input type="number" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="Opcional" className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] px-3 py-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-[var(--text-secondary)]">Precio especial<input type="number" min={0} value={priceOverride} onChange={(event) => setPriceOverride(event.target.value)} placeholder="COP, opcional" className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] px-3 py-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-[var(--text-secondary)] lg:col-span-2">Notas<textarea rows={1} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full resize-none rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] px-3 py-2.5 text-sm" /></label>
        <div className="flex items-end gap-2 lg:col-span-2"><button disabled={saving || !items.length} type="submit" className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />Guardar disponibilidad</button><button disabled={saving || !items.length} type="button" onClick={() => void clear()} className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Eraser className="w-4 h-4" />Limpiar rango</button></div>
      </form>
      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
    </div>
    {!items.length && <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">Primero crea una oferta para administrar sus fechas.</p>}
    <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-[var(--text-secondary)]">Mostrar próximas:</span>{([30, 60, 90] as const).map((days) => <button type="button" key={days} onClick={() => setFilterDays(days)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${filterDays === days ? 'bg-emerald-600 text-white border-emerald-500' : 'border-[var(--border-light)] text-[var(--text-secondary)]'}`}>{days} días</button>)}</div>
    {loading && <p className="text-xs text-[var(--text-secondary)]">Cargando disponibilidad...</p>}
    {!loading && !rows.length && <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">No hay registros de disponibilidad. Este prestador atiende reservas bajo solicitud.</p>}
    {!loading && rows.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{visibleRows.map((row) => <article key={`${row.itemId}-${row.availableDate}`} className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)]"><p className="text-xs font-bold truncate">{items.find((item) => item.id === row.itemId)?.title || 'Oferta'}</p><p className="text-sm mt-1">{new Date(`${row.availableDate}T00:00:00`).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</p><span className={`inline-block mt-2 px-2 py-1 rounded-full text-[10px] font-bold ${row.isAvailable ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>{row.isAvailable ? 'Disponible' : 'No disponible'}</span>{row.capacity !== null && <p className="text-xs text-[var(--text-secondary)] mt-2">Capacidad: {row.capacity}</p>}{row.priceOverride !== null && <p className="text-xs text-[var(--color-primary-light)] mt-1">Precio especial: {row.priceOverride.toLocaleString('es-CO')} COP</p>}</article>)}</div>}
  </section>;
};

export default AvailabilityManager;

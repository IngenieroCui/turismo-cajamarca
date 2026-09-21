import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { createCatalogItem, updateCatalogItem } from '../../services/catalogService';
import type { CatalogItem, CatalogItemInput, CatalogItemMetadata } from '../../types/tourism.types';
import ModalShell from '../ui/ModalShell';

interface CatalogItemFormModalProps {
  item?: CatalogItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm: CatalogItemInput = {
  itemType: 'atractivo', title: '', slug: '', category: '', shortDescription: '', description: '', location: '', address: '',
  coverImageUrl: '', contactWhatsapp: '', priceFrom: null, priceTo: null, priceLabel: '', currency: 'COP', durationText: '', difficulty: null,
  isReservable: false, metadata: {},
};

const formFromItem = (item?: CatalogItem | null): CatalogItemInput => item ? {
  itemType: item.itemType, title: item.title, slug: item.slug, category: item.category, shortDescription: item.shortDescription,
  description: item.description, location: item.location, address: item.address, latitude: item.latitude, longitude: item.longitude,
  coverImageUrl: item.coverImageUrl, contactWhatsapp: item.contactWhatsapp, priceFrom: item.priceFrom, priceTo: item.priceTo,
  priceLabel: item.priceLabel, currency: item.currency, durationText: item.durationText, difficulty: item.difficulty,
  isReservable: item.isReservable, metadata: item.metadata,
} : emptyForm;

const toSlug = (value: string) => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const arrayText = (value: string[] | undefined) => (value || []).join('\n');
const parseArray = (value: string) => value.split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean);

export const CatalogItemFormModal: React.FC<CatalogItemFormModalProps> = ({ item, onClose, onSaved }) => {
  const [form, setForm] = useState<CatalogItemInput>(() => formFromItem(item));
  const [metadataText, setMetadataText] = useState(() => {
    const metadata = formFromItem(item).metadata || {};
    return { highlights: arrayText(metadata.highlights), amenities: arrayText(metadata.amenities), includes: arrayText(metadata.includes), popularIn: metadata.popularIn || '', operatorName: metadata.operatorName || '', eventDate: metadata.eventDate || '', eventEndDate: metadata.eventEndDate || '', artisanName: metadata.artisanName || '' };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof CatalogItemInput>(key: K, value: CatalogItemInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const setMetadataField = (key: keyof typeof metadataText, value: string) => setMetadataText((current) => ({ ...current, [key]: value }));

  const metadata = (): CatalogItemMetadata => ({
    highlights: parseArray(metadataText.highlights), amenities: parseArray(metadataText.amenities), includes: parseArray(metadataText.includes),
    popularIn: metadataText.popularIn || undefined, operatorName: metadataText.operatorName || undefined, eventDate: metadataText.eventDate || undefined,
    eventEndDate: metadataText.eventEndDate || null, artisanName: metadataText.artisanName || undefined,
  });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload: CatalogItemInput = { ...form, slug: form.slug || toSlug(form.title), metadata: metadata() };
    try {
      if (item) await updateCatalogItem(item.id, payload);
      else await createCatalogItem(payload);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar la oferta.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'mt-1 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]';
  const label = (text: string, child: React.ReactNode) => { const id = `catalog-${text.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`; return <label htmlFor={id} className="block text-xs font-semibold text-[var(--text-secondary)]">{text}{React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<{ id?: string }>, { id }) : child}</label>; };

  return <ModalShell open title={item ? 'Editar oferta' : 'Nueva oferta'} description="Catálogo turístico" onClose={onClose} maxWidth="max-w-3xl">
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <div className="sticky top-0 z-10 p-5 bg-[var(--bg-secondary)] border-b border-[var(--border-light)] flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Catálogo turístico</p><h2 className="text-xl font-bold text-[var(--text-primary)] my-1">{item ? 'Editar oferta' : 'Nueva oferta'}</h2></div><button type="button" onClick={onClose} className="p-2 rounded-xl bg-[var(--bg-primary)] text-[var(--text-secondary)] cursor-pointer"><X className="w-5 h-5" /></button></div>
      <div className="space-y-4">
        {error && <p className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {label('Tipo', <select required value={form.itemType} onChange={(event) => setField('itemType', event.target.value as CatalogItemInput['itemType'])} className={inputClass}><option value="atractivo">Atractivo</option><option value="alojamiento">Alojamiento</option><option value="gastronomia">Gastronomía</option><option value="tour">Tour</option><option value="evento">Evento</option><option value="artesania">Artesanía</option></select>)}
          {label('Título', <input required value={form.title} onChange={(event) => { setField('title', event.target.value); if (!item) setField('slug', toSlug(event.target.value)); }} className={inputClass} />)}
          {label('Categoría', <input value={form.category || ''} onChange={(event) => setField('category', event.target.value)} className={inputClass} />)}
          {label('Slug', <input required value={form.slug} onChange={(event) => setField('slug', toSlug(event.target.value))} className={inputClass} />)}
          {label('Descripción corta', <textarea required rows={2} value={form.shortDescription} onChange={(event) => setField('shortDescription', event.target.value)} className={`${inputClass} resize-none`} />)}
          {label('Descripción completa', <textarea rows={3} value={form.description || ''} onChange={(event) => setField('description', event.target.value)} className={`${inputClass} resize-none`} />)}
          {label('Ubicación', <input required value={form.location || ''} onChange={(event) => setField('location', event.target.value)} className={inputClass} />)}
          {label('Dirección', <input value={form.address || ''} onChange={(event) => setField('address', event.target.value)} className={inputClass} />)}
          {label('URL de imagen', <input required type="url" value={form.coverImageUrl || ''} onChange={(event) => setField('coverImageUrl', event.target.value)} className={inputClass} placeholder="https://..." />)}
          {label('WhatsApp', <input value={form.contactWhatsapp || ''} onChange={(event) => setField('contactWhatsapp', event.target.value)} className={inputClass} />)}
          {label('Precio desde', <input type="number" min={0} value={form.priceFrom ?? ''} onChange={(event) => setField('priceFrom', event.target.value === '' ? null : Number(event.target.value))} className={inputClass} />)}
          {label('Precio hasta', <input type="number" min={0} value={form.priceTo ?? ''} onChange={(event) => setField('priceTo', event.target.value === '' ? null : Number(event.target.value))} className={inputClass} />)}
          {label('Etiqueta de precio', <input value={form.priceLabel || ''} onChange={(event) => setField('priceLabel', event.target.value)} className={inputClass} placeholder="$85.000 COP / persona" />)}
          {label('Duración', <input value={form.durationText || ''} onChange={(event) => setField('durationText', event.target.value)} className={inputClass} />)}
          {label('Dificultad', <select value={form.difficulty || ''} onChange={(event) => setField('difficulty', (event.target.value || null) as CatalogItemInput['difficulty'])} className={inputClass}><option value="">No aplica</option><option value="facil">Fácil</option><option value="moderado">Moderado</option><option value="exigente">Exigente</option></select>)}
          {label('Moneda', <input value={form.currency || 'COP'} onChange={(event) => setField('currency', event.target.value.toUpperCase())} className={inputClass} />)}
        </div>
        <label htmlFor="catalog-reservable" className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]"><input id="catalog-reservable" type="checkbox" checked={form.isReservable || false} onChange={(event) => setField('isReservable', event.target.checked)} className="accent-emerald-500" /> Permitir solicitudes de reserva</label>
        <div className="border-t border-[var(--border-light)] pt-4 space-y-4"><p className="text-sm font-bold text-[var(--text-primary)]">Información específica</p>
          {form.itemType === 'atractivo' && label('Highlights (uno por línea)', <textarea rows={3} value={metadataText.highlights} onChange={(event) => setMetadataField('highlights', event.target.value)} className={`${inputClass} resize-none`} />)}
          {form.itemType === 'alojamiento' && label('Amenidades (una por línea)', <textarea rows={3} value={metadataText.amenities} onChange={(event) => setMetadataField('amenities', event.target.value)} className={`${inputClass} resize-none`} />)}
          {form.itemType === 'gastronomia' && label('Popular en', <input value={metadataText.popularIn} onChange={(event) => setMetadataField('popularIn', event.target.value)} className={inputClass} />)}
          {form.itemType === 'tour' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{label('Incluye (uno por línea)', <textarea rows={3} value={metadataText.includes} onChange={(event) => setMetadataField('includes', event.target.value)} className={`${inputClass} resize-none`} />)}{label('Operador', <input value={metadataText.operatorName} onChange={(event) => setMetadataField('operatorName', event.target.value)} className={inputClass} />)}</div>}
          {form.itemType === 'evento' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{label('Fecha del evento', <input value={metadataText.eventDate} onChange={(event) => setMetadataField('eventDate', event.target.value)} className={inputClass} />)}{label('Fecha final (opcional)', <input value={metadataText.eventEndDate} onChange={(event) => setMetadataField('eventEndDate', event.target.value)} className={inputClass} />)}</div>}
          {form.itemType === 'artesania' && label('Artesano / asociación', <input value={metadataText.artisanName} onChange={(event) => setMetadataField('artisanName', event.target.value)} className={inputClass} />)}
        </div>
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[var(--border-light)] text-xs font-bold text-[var(--text-secondary)] cursor-pointer">Cancelar</button><button disabled={saving} type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-2"><Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar borrador'}</button></div>
      </div>
    </form>
  </ModalShell>;
};

export default CatalogItemFormModal;

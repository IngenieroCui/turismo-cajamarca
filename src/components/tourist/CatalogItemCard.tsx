import React, { useEffect, useState } from 'react';
import { Clock, DollarSign, MapPin, MessageCircle, Star, CheckCircle2 } from 'lucide-react';
import type { CatalogItem, Review } from '../../types/tourism.types';
import FavoriteButton from './FavoriteButton';
import ReservationModal from './ReservationModal';
import { getPublishedReviews } from '../../services/marketplaceService';
import { usePlatformConfig } from '../../context/usePlatformConfig';
import SafeImage from '../ui/SafeImage';
import ModalShell from '../ui/ModalShell';

interface CatalogItemCardProps {
  item: CatalogItem;
  accent?: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' | 'orange';
  horizontal?: boolean;
}

const accents = {
  emerald: { border: 'hover:border-emerald-400/50', badge: 'text-emerald-300 border-emerald-500/30', button: 'bg-emerald-600 hover:bg-emerald-500' },
  blue: { border: 'hover:border-blue-400/50', badge: 'text-blue-300 border-blue-500/30', button: 'bg-blue-600 hover:bg-blue-500' },
  amber: { border: 'hover:border-amber-400/50', badge: 'text-amber-300 border-amber-500/30', button: 'bg-amber-500 hover:bg-amber-400 text-slate-950' },
  purple: { border: 'hover:border-purple-400/50', badge: 'text-purple-300 border-purple-500/30', button: 'bg-purple-600 hover:bg-purple-500' },
  rose: { border: 'hover:border-rose-400/50', badge: 'text-rose-300 border-rose-500/30', button: 'bg-rose-600 hover:bg-rose-500' },
  orange: { border: 'hover:border-orange-400/50', badge: 'text-orange-300 border-orange-500/30', button: 'bg-orange-500 hover:bg-orange-400 text-slate-950' },
};

const typeLabels: Record<CatalogItem['itemType'], string> = {
  atractivo: 'Atractivo', alojamiento: 'Alojamiento', gastronomia: 'Gastronomía',
  tour: 'Tour', evento: 'Evento', artesania: 'Artesanía',
};

const difficultyLabels: Record<NonNullable<CatalogItem['difficulty']>, string> = {
  facil: 'Fácil',
  moderado: 'Moderado',
  exigente: 'Exigente',
};

const priceText = (item: CatalogItem): string | null => {
  if (item.priceLabel) return item.priceLabel;
  if (item.priceFrom !== null && item.priceTo !== null) return `$${item.priceFrom.toLocaleString('es-CO')} - $${item.priceTo.toLocaleString('es-CO')} ${item.currency}`;
  if (item.priceFrom !== null) return `Desde $${item.priceFrom.toLocaleString('es-CO')} ${item.currency}`;
  return null;
};

const whatsapp = (item: CatalogItem) => {
  if (!item.contactWhatsapp) return;
  const message = encodeURIComponent(`Hola! Vengo de Turismo Cajamarca y deseo más información sobre: ${item.title}`);
  window.open(`https://wa.me/${item.contactWhatsapp}?text=${message}`, '_blank', 'noopener,noreferrer');
};

const metadataEntries = (item: CatalogItem): string[] => {
  if (item.itemType === 'atractivo') return item.metadata.highlights || [];
  if (item.itemType === 'alojamiento') return item.metadata.amenities || [];
  if (item.itemType === 'tour') return item.metadata.includes || [];
  return [];
};

export const CatalogItemCard: React.FC<CatalogItemCardProps> = ({ item, accent = 'emerald', horizontal = false }) => {
  const reservationsEnabled = usePlatformConfig((state) => state.reservationsEnabled);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const style = accents[accent];
  const price = priceText(item);
  const entries = metadataEntries(item);

  useEffect(() => {
    if (!detailsOpen || item.reviewsCount === 0) return;
    let mounted = true;
    void getPublishedReviews(item.id).then((data) => {
      if (mounted) setReviews(data);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [detailsOpen, item.id, item.reviewsCount]);

  return (
    <>
      <article className={`rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden shadow-xl ${style.border} transition-all duration-300 flex ${horizontal ? 'flex-col sm:flex-row' : 'flex-col'} group`}>
        <div className={`relative ${horizontal ? 'sm:w-2/5 h-48 sm:h-auto' : 'h-48'} overflow-hidden shrink-0 bg-[var(--bg-primary)]`}>
          {item.coverImageUrl ? <SafeImage src={item.coverImageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">Sin imagen</div>}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold bg-black/70 backdrop-blur-md border ${style.badge}`}>{item.category || typeLabels[item.itemType]}</span>
            {item.activePromotion && <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">{item.activePromotion.promotionType === 'percentage' ? `-${item.activePromotion.discountValue}%` : item.activePromotion.promotionType === 'fixed' ? `-${item.activePromotion.discountValue?.toLocaleString('es-CO')} COP` : 'Promoción'}</span>}
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-amber-300 text-xs font-bold"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{item.rating.toFixed(1)} <span className="text-[10px] text-white/70">({item.reviewsCount})</span></span>
            <FavoriteButton itemId={item.id} />
          </div>
        </div>

        <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[var(--text-primary)] my-0 leading-snug group-hover:text-[var(--color-primary-light)] transition">{item.title}</h3>
            <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">{item.shortDescription}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
              {item.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-400" />{item.location}</span>}
              {item.durationText && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-400" />{item.durationText}</span>}
              {item.difficulty && <span className="text-[var(--text-secondary)]">Dificultad: {difficultyLabels[item.difficulty]}</span>}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[var(--border-light)]">
            {price && <div className="flex items-center gap-1.5 text-xs text-[var(--color-primary-light)] font-semibold"><DollarSign className="w-3.5 h-3.5" />{price}</div>}
            {entries.length > 0 && <div className="flex flex-wrap gap-1.5">{entries.slice(0, 4).map((entry) => <span key={entry} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-light)]">{entry}</span>)}</div>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setDetailsOpen(true)} className="flex-1 min-w-[100px] px-3 py-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-light)] text-xs font-bold text-[var(--text-primary)] transition cursor-pointer">Ver detalles</button>
              {item.isReservable && <button type="button" disabled={!reservationsEnabled} onClick={() => setReservationOpen(true)} title={!reservationsEnabled ? 'Las reservas están deshabilitadas temporalmente' : undefined} className="flex-1 min-w-[100px] px-3 py-2 rounded-xl bg-[var(--color-primary)] hover:opacity-90 text-[var(--color-primary-contrast)] text-xs font-bold transition cursor-pointer disabled:opacity-50">{reservationsEnabled ? 'Reservar' : 'Reservas deshabilitadas'}</button>}
              {item.contactWhatsapp && <button type="button" onClick={() => whatsapp(item)} className={`${item.isReservable ? 'w-full' : 'flex-1'} px-3 py-2 rounded-xl ${style.button} text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5`}><MessageCircle className="w-3.5 h-3.5" />WhatsApp</button>}
            </div>
          </div>
        </div>
      </article>

      {detailsOpen && <ModalShell open title={item.title} description={item.location || undefined} onClose={() => setDetailsOpen(false)} maxWidth="max-w-2xl" footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setDetailsOpen(false)} className="rounded-xl border border-[var(--border-light)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)]">Cerrar</button>{item.isReservable && <button type="button" disabled={!reservationsEnabled} onClick={() => { setDetailsOpen(false); setReservationOpen(true); }} className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-[var(--color-primary-contrast)] disabled:opacity-50">{reservationsEnabled ? 'Reservar' : 'Reservas deshabilitadas'}</button>}</div>}>
        <div className="space-y-4">
          <div className="relative h-56 sm:h-64 bg-[var(--bg-primary)]">
            {item.coverImageUrl && <SafeImage src={item.coverImageUrl} alt={item.title} className="w-full h-full object-cover" />}
          </div>
          <div className="p-6 space-y-4">
            <div><span className={`text-xs font-bold ${style.badge.split(' ')[0]}`}>{typeLabels[item.itemType]}{item.category ? ` · ${item.category}` : ''}</span><h2 className="text-xl font-bold text-[var(--text-primary)] my-1">{item.title}</h2>{item.location && <p className="text-xs text-[var(--color-primary-light)] flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{item.location}</p>}</div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.description || item.shortDescription}</p>
            {item.itemType === 'gastronomia' && item.metadata.popularIn && <p className="text-xs text-[var(--text-secondary)]"><strong>Popular en:</strong> {item.metadata.popularIn}</p>}
            {item.itemType === 'tour' && item.metadata.operatorName && <p className="text-xs text-[var(--text-secondary)]"><strong>Operador:</strong> {item.metadata.operatorName}</p>}
            {item.itemType === 'evento' && item.metadata.eventDate && <p className="text-xs text-[var(--text-secondary)]"><strong>Fecha:</strong> {item.metadata.eventDate}{item.metadata.eventEndDate ? ` - ${item.metadata.eventEndDate}` : ''}</p>}
            {item.itemType === 'artesania' && item.metadata.artisanName && <p className="text-xs text-[var(--text-secondary)]"><strong>Artesano:</strong> {item.metadata.artisanName}</p>}
            {item.activePromotion && <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"><p className="text-xs font-bold text-amber-200">{item.activePromotion.title}</p>{item.activePromotion.description && <p className="text-xs text-[var(--text-secondary)] mt-1">{item.activePromotion.description}</p>}{item.activePromotion.code && <p className="text-[11px] text-amber-300 mt-1">Código: {item.activePromotion.code}</p>}</div>}
            {entries.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{entries.map((entry) => <div key={entry} className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-xs text-[var(--text-secondary)]"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{entry}</div>)}</div>}
            {price && <p className="text-sm font-bold text-[var(--color-primary-light)]">{price}</p>}
            {item.reviewsCount > 0 && <div className="space-y-2"><h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Reseñas publicadas</h3>{reviews.map((review) => <div key={review.id} className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)]"><p className="text-xs text-amber-300">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>{review.comment && <p className="text-xs text-[var(--text-secondary)] mt-1">{review.comment}</p>}{review.providerResponse && <p className="text-xs text-emerald-200 mt-2"><strong>Respuesta del prestador:</strong> {review.providerResponse}</p>}</div>)}</div>}
          </div>
        </div>
      </ModalShell>}

      {reservationOpen && <ReservationModal item={item} onClose={() => setReservationOpen(false)} onCreated={() => setReservationOpen(false)} />}
    </>
  );
};

export default CatalogItemCard;

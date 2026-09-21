import React, { useCallback, useEffect, useState } from 'react';
import { CheckSquare, Eye, MessageSquare, ShieldCheck, XCircle } from 'lucide-react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import { getPendingModerationItems, moderateCatalogItem } from '../../services/catalogService';
import { getPendingReviews, moderateReview } from '../../services/marketplaceService';
import type { CatalogItem, Review } from '../../types/tourism.types';
import ModerationReasonModal from '../../components/moderation/ModerationReasonModal';
import RoleWorkspaceHeader from '../../components/workspace/RoleWorkspaceHeader';
import MetricCard from '../../components/workspace/MetricCard';

type ModeratorTab = 'catalogo' | 'resenas';

interface PendingCatalogCardProps {
  item: CatalogItem;
  canApprove: boolean;
  canReject: boolean;
  actionId: string | null;
  onAction: (item: CatalogItem, action: 'approve' | 'reject') => void;
}

const PendingCatalogCard: React.FC<PendingCatalogCardProps> = ({ item, canApprove, canReject, actionId, onAction }) => (
  <article className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
    <div className="flex flex-col md:flex-row gap-4">
      <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden shrink-0 bg-[var(--bg-primary)]">
        {item.coverImageUrl && <img src={item.coverImageUrl} alt={item.title} className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] text-indigo-300 uppercase font-bold">{item.itemType} · {item.category || 'Sin categoría'}</p>
            <h3 className="text-lg font-bold text-[var(--text-primary)] my-1">{item.title}</h3>
            <p className="text-xs text-[var(--text-muted)]">Prestador: {item.providerId || 'Editorial'}</p>
          </div>
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-3">{item.description || item.shortDescription}</p>
        <p className="text-xs text-[var(--text-muted)] mt-2">{item.location || 'Sin ubicación'}{item.priceLabel ? ` · ${item.priceLabel}` : ''}</p>
        <div className="flex gap-2 mt-4">
          {canApprove && <button type="button" disabled={actionId === item.id} onClick={() => onAction(item, 'approve')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"><CheckSquare className="w-3.5 h-3.5 inline mr-1" />Aprobar</button>}
          {canReject && <button type="button" disabled={actionId === item.id} onClick={() => onAction(item, 'reject')} className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold cursor-pointer disabled:opacity-50"><XCircle className="w-3.5 h-3.5 inline mr-1" />Rechazar</button>}
          <button type="button" className="px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)] text-xs font-bold cursor-pointer"><Eye className="w-3.5 h-3.5 inline mr-1" />Ver datos</button>
        </div>
      </div>
    </div>
  </article>
);

interface PendingReviewCardProps {
  review: Review;
  canApprove: boolean;
  canReject: boolean;
  actionId: string | null;
  onAction: (review: Review, action: 'approve' | 'reject') => void;
}

const PendingReviewCard: React.FC<PendingReviewCardProps> = ({ review, canApprove, canReject, actionId, onAction }) => (
  <article className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] uppercase text-indigo-300 font-bold">{review.itemTitle || 'Oferta turística'}</p>
        <p className="text-amber-300 mt-1">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
      </div>
      <span className="text-xs text-[var(--text-muted)]">{review.touristName || 'Turista'}</span>
    </div>
    {review.comment && <p className="text-sm text-[var(--text-secondary)] mt-3">{review.comment}</p>}
    <div className="flex gap-2 mt-4">
      {canApprove && <button type="button" disabled={actionId === review.id} onClick={() => onAction(review, 'approve')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Aprobar</button>}
      {canReject && <button type="button" disabled={actionId === review.id} onClick={() => onAction(review, 'reject')} className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold cursor-pointer disabled:opacity-50">Rechazar</button>}
    </div>
  </article>
);

export const ModeradorPage: React.FC = () => {
  const { user, profile, hasPermission } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.MODERADOR];
  const [tab, setTab] = useState<ModeratorTab>('catalogo');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [reasonTarget, setReasonTarget] = useState<{ kind: 'catalog' | 'review'; item: CatalogItem | Review } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalog, reviewRows] = await Promise.all([getPendingModerationItems(), getPendingReviews()]);
      setItems(catalog);
      setReviews(reviewRows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar la moderación.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const catalogAction = async (item: CatalogItem, action: 'approve' | 'reject') => {
    if (action === 'reject') { setReasonTarget({ kind: 'catalog', item }); return; }
    await performCatalogAction(item, action);
  };

  const performCatalogAction = async (item: CatalogItem, action: 'approve' | 'reject', reason?: string) => {
    setActionId(item.id);
    setError(null);
    try {
      await moderateCatalogItem(item.id, action, reason || undefined);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No fue posible moderar el catálogo.');
    } finally {
      setActionId(null);
    }
  };

  const reviewAction = async (review: Review, action: 'approve' | 'reject') => {
    if (action === 'reject') { setReasonTarget({ kind: 'review', item: review }); return; }
    await performReviewAction(review, action);
  };

  const performReviewAction = async (review: Review, action: 'approve' | 'reject', reason?: string) => {
    setActionId(review.id);
    setError(null);
    try {
      await moderateReview(review.id, action, reason || undefined);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No fue posible moderar la reseña.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <RoleWorkspaceHeader eyebrow="Cola de decisiones" title="Centro de moderación" description="Tienes contenido pendiente de decisión. Revisa y resuelve primero lo más urgente." roleLabel="Moderador" roleBadgeClass={meta.badgeColor} icon={ShieldCheck} primaryAction={<button type="button" onClick={() => void load()} className="min-h-10 rounded-xl border border-[var(--border-light)] px-3 py-2 text-xs font-bold">Actualizar cola</button>} />
        <div className="grid grid-cols-2 gap-3"><MetricCard label="Contenido pendiente" value={items.length} icon={CheckSquare} tone="text-indigo-300" /><MetricCard label="Reseñas pendientes" value={reviews.length} icon={MessageSquare} tone="text-amber-300" /></div>
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-indigo-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="text-2xl font-bold text-indigo-200 my-0">{profile?.full_name || user?.email}</h2><p className="text-xs text-[var(--text-secondary)] mt-0.5">{user?.email}</p></div>
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>{meta.label}</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Revisa las ofertas y reseñas enviadas por la comunidad antes de hacerlas públicas.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setTab('catalogo')} className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${tab === 'catalogo' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)]'}`}><CheckSquare className="w-3.5 h-3.5 inline mr-1" />Catálogo pendiente ({items.length})</button>
          <button type="button" onClick={() => setTab('resenas')} className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${tab === 'resenas' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)]'}`}><MessageSquare className="w-3.5 h-3.5 inline mr-1" />Reseñas pendientes ({reviews.length})</button>
        </div>

        {error && <p className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{error}</p>}
        {loading && <p className="text-xs text-[var(--text-secondary)]">Cargando cola de moderación...</p>}

        {!loading && tab === 'catalogo' && (
          <section className="space-y-4">
            {items.length === 0 && <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">Todo al día: no hay ofertas pendientes.</p>}
            {items.map((item) => <PendingCatalogCard key={item.id} item={item} canApprove={hasPermission('content:approve')} canReject={hasPermission('content:reject')} actionId={actionId} onAction={(selected, action) => void catalogAction(selected, action)} />)}
          </section>
        )}

        {!loading && tab === 'resenas' && (
          <section className="space-y-4">
            {reviews.length === 0 && <p className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)]">Todo al día: no hay reseñas pendientes.</p>}
            {reviews.map((review) => <PendingReviewCard key={review.id} review={review} canApprove={hasPermission('content:approve')} canReject={hasPermission('content:reject')} actionId={actionId} onAction={(selected, action) => void reviewAction(selected, action)} />)}
          </section>
        )}
      </div>
      {reasonTarget && <ModerationReasonModal title={reasonTarget.kind === 'catalog' ? 'Motivo del rechazo del catálogo' : 'Motivo del rechazo de la reseña'} onClose={() => setReasonTarget(null)} onSubmit={async (reason) => { if (reasonTarget.kind === 'catalog') await performCatalogAction(reasonTarget.item as CatalogItem, 'reject', reason); else await performReviewAction(reasonTarget.item as Review, 'reject', reason); setReasonTarget(null); }} />}
    </RoleDrawerLayout>
  );
};

export default ModeradorPage;

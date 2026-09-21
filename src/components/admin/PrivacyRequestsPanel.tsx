import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getPendingDeletionRequests } from '../../services/privacyService';
import type { AccountDeletionRequest } from '../../types/privacy.types';
import PrivacyRequestReviewModal from './PrivacyRequestReviewModal';

const PrivacyRequestsPanel: React.FC = () => {
  const [requests, setRequests] = useState<AccountDeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ request: AccountDeletionRequest; decision: 'approve' | 'reject' } | null>(null);
  const load = async () => { setLoading(true); setError(null); try { setRequests(await getPendingDeletionRequests()); } catch (err: unknown) { setError(err instanceof Error ? err.message : 'No fue posible cargar las solicitudes.'); } finally { setLoading(false); } };
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);
  const review = (request: AccountDeletionRequest, decision: 'approve' | 'reject') => setReviewTarget({ request, decision });
  return <section className="space-y-4"><div className="flex items-center justify-between"><div><h3 className="text-xl font-black my-0">Privacidad</h3><p className="text-xs text-[var(--text-secondary)] mt-1">Solicitudes pendientes. Aprobar no elimina usuarios de Auth automáticamente.</p></div><button type="button" aria-label="Actualizar solicitudes" onClick={() => void load()} className="rounded-xl border border-[var(--border-light)] p-2"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button></div>{error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}{!loading && requests.length === 0 && <p className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-6 text-sm text-[var(--text-secondary)]">No hay solicitudes pendientes.</p>}{requests.map((request) => <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4"><div><p className="text-sm font-bold">{request.fullName || 'Usuario'}</p><p className="text-xs text-[var(--text-secondary)]">{request.email || 'Correo no disponible'} · {new Date(request.requestedAt).toLocaleString('es-CO')}</p></div><div className="flex gap-2"><button type="button" onClick={() => review(request, 'approve')} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Aprobar solicitud</button><button type="button" onClick={() => review(request, 'reject')} className="rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300">Rechazar solicitud</button></div></article>)}{reviewTarget && <PrivacyRequestReviewModal request={reviewTarget.request} decision={reviewTarget.decision} onClose={() => setReviewTarget(null)} onSaved={() => { setReviewTarget(null); void load(); }} />}</section>;
};

export default PrivacyRequestsPanel;

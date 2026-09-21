import React, { useState } from 'react';
import { reviewProviderCompliance } from '../../services/regulatoryService';
import type { RegulatoryDecision, RegulatoryReviewType } from '../../types/operations.types';
import ModalShell from '../ui/ModalShell';

interface Props { providerId: string; reviewType: RegulatoryReviewType; businessName: string; onClose: () => void; onSaved: () => void; }
const decisions: Array<[RegulatoryDecision, string]> = [['verified', 'Verificar'], ['observed', 'Observar'], ['rejected', 'Rechazar'], ['expired', 'Marcar vencido']];

const ComplianceReviewModal: React.FC<Props> = ({ providerId, reviewType, businessName, onClose, onSaved }) => {
  const [decision, setDecision] = useState<RegulatoryDecision>('verified');
  const [notes, setNotes] = useState(''); const [effectiveUntil, setEffectiveUntil] = useState(''); const [registrationNumber, setRegistrationNumber] = useState('');
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(null); try { await reviewProviderCompliance(providerId, reviewType, decision, notes, effectiveUntil || null, registrationNumber || null); onSaved(); } catch (err: unknown) { setError(err instanceof Error ? err.message : 'No fue posible guardar la revisión.'); } finally { setSaving(false); } };
  return <ModalShell open title={`Revisión ${reviewType === 'rnt' ? 'RNT' : 'de registro mercantil'}`} description={businessName} onClose={onClose} footer={<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-[var(--border-light)] px-4 py-2 text-xs">Cancelar</button><button form="compliance-review-form" disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar revisión'}</button></div>}>
    <form id="compliance-review-form" onSubmit={(event) => void submit(event)} className="space-y-4">{error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      <label htmlFor="compliance-decision" className="block text-xs font-semibold">Decisión<select id="compliance-decision" value={decision} onChange={(event) => setDecision(event.target.value as RegulatoryDecision)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm">{decisions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {reviewType === 'commercial' && <label htmlFor="commercial-registration" className="block text-xs font-semibold">Número de registro mercantil<input id="commercial-registration" value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label>}
      <label htmlFor="compliance-effective-until" className="block text-xs font-semibold">Vigencia hasta<input id="compliance-effective-until" type="date" value={effectiveUntil} onChange={(event) => setEffectiveUntil(event.target.value)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label>
      <label htmlFor="compliance-notes" className="block text-xs font-semibold">Notas<textarea id="compliance-notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full resize-none rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label>
    </form>
  </ModalShell>;
};

export default ComplianceReviewModal;

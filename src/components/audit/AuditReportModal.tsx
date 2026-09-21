import React, { useState } from 'react';
import { createAuditReport } from '../../services/auditService';
import ModalShell from '../ui/ModalShell';

interface Props { onClose: () => void; onSaved: () => void; }

const AuditReportModal: React.FC<Props> = ({ onClose, onSaved }) => {
  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [summary, setSummary] = useState('');
  const [findings, setFindings] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(null);
    try { await createAuditReport(title, periodStart || null, periodEnd || null, summary, findings.split('\n').map((line) => line.trim()).filter(Boolean)); onSaved(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'No fue posible crear el informe.'); }
    finally { setSaving(false); }
  };
  return <ModalShell open title="Crear informe" onClose={onClose} maxWidth="max-w-xl" footer={<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-[var(--border-light)] px-4 py-2 text-xs">Cancelar</button><button type="submit" form="audit-report-form" disabled={saving} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Publicar informe'}</button></div>}>
    <form id="audit-report-form" onSubmit={(event) => void submit(event)} className="space-y-4">
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      <label htmlFor="audit-title" className="block text-xs font-semibold">Título<input id="audit-title" required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label htmlFor="audit-period-start" className="text-xs font-semibold">Desde<input id="audit-period-start" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label><label htmlFor="audit-period-end" className="text-xs font-semibold">Hasta<input id="audit-period-end" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label></div>
      <label htmlFor="audit-summary" className="block text-xs font-semibold">Resumen<textarea id="audit-summary" required rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} className="mt-1 w-full resize-none rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label>
      <label htmlFor="audit-findings" className="block text-xs font-semibold">Hallazgos (uno por línea)<textarea id="audit-findings" rows={5} value={findings} onChange={(event) => setFindings(event.target.value)} className="mt-1 w-full resize-none rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label>
    </form>
  </ModalShell>;
};

export default AuditReportModal;

import React, { useState } from 'react';
import type { Reservation } from '../../types/tourism.types';
import type { ExternalPaymentMethod } from '../../types/payment.types';
import { declareExternalPayment } from '../../services/paymentService';
import ModalShell from '../ui/ModalShell';

interface Props { reservation: Reservation; onClose: () => void; onCreated: () => void; }
const methods: Array<[ExternalPaymentMethod, string]> = [['nequi', 'Nequi'], ['daviplata', 'Daviplata'], ['bank_transfer', 'Transferencia bancaria'], ['cash_provider', 'Efectivo con el prestador']];

const ExternalPaymentModal: React.FC<Props> = ({ reservation, onClose, onCreated }) => {
  const [method, setMethod] = useState<ExternalPaymentMethod>('nequi'); const [reference, setReference] = useState(''); const [notes, setNotes] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(null); try { await declareExternalPayment(reservation.id, method, reference || null, notes || null); onCreated(); } catch (err: unknown) { setError(err instanceof Error ? err.message : 'No fue posible registrar el pago.'); } finally { setSaving(false); } };
  return <ModalShell open title="Registrar pago externo" description={`${reservation.item?.title || 'Reserva'} · ${reservation.quotedAmount?.toLocaleString('es-CO')} ${reservation.currency}`} onClose={onClose} footer={<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-[var(--border-light)] px-4 py-2 text-xs font-bold">Cancelar</button><button disabled={saving} form="external-payment-form" type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Registrando...' : 'Registrar declaración'}</button></div>}>
    <form id="external-payment-form" onSubmit={(event) => void submit(event)} className="space-y-4"><p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">El pago se realiza por fuera de la plataforma. Turismo Cajamarca registra el estado informado por las partes. Este registro no ejecuta ni confirma una transferencia bancaria.</p>{error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      <label htmlFor="payment-method" className="block text-xs font-semibold">Método<select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value as ExternalPaymentMethod)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm">{methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label htmlFor="payment-reference" className="block text-xs font-semibold">Referencia {method === 'bank_transfer' ? '(obligatoria)' : '(opcional)'}<input id="payment-reference" required={method === 'bank_transfer'} value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label>
      <label htmlFor="payment-notes" className="block text-xs font-semibold">Notas (opcional)<textarea id="payment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1 w-full resize-none rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label>
    </form>
  </ModalShell>;
};

export default ExternalPaymentModal;

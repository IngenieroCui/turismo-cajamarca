import React from 'react';
import ModalShell from './ModalShell';

interface Props { open: boolean; title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: 'default' | 'danger' | 'warning'; onConfirm: () => void; onCancel: () => void; loading?: boolean; }
const ConfirmDialog: React.FC<Props> = ({ open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'default', onConfirm, onCancel, loading = false }) => {
  const button = variant === 'danger' ? 'bg-red-600 hover:bg-red-500' : variant === 'warning' ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]';
  return <ModalShell open={open} title={title} onClose={onCancel} maxWidth="max-w-md" footer={<div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl border border-[var(--border-light)] px-4 py-2 text-xs font-bold">{cancelLabel}</button><button type="button" onClick={onConfirm} disabled={loading} className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${button}`}>{loading ? 'Procesando…' : confirmLabel}</button></div>}><p className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]">{message}</p></ModalShell>;
};
export default ConfirmDialog;

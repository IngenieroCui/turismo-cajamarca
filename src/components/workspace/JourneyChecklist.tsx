import React from 'react';
import { Check, Circle } from 'lucide-react';

export interface JourneyStep { id: string; label: string; description?: string; complete: boolean; actionLabel?: string; action?: React.ReactNode; }
interface JourneyChecklistProps { title: string; description?: string; steps: JourneyStep[]; }

const JourneyChecklist: React.FC<JourneyChecklistProps> = ({ title, description, steps }) => {
  const completed = steps.filter((step) => step.complete).length;
  return <section className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5 shadow-xl sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-bold">{title}</h2>{description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>}</div><span className="rounded-full border border-[var(--border-light)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)]">{completed}/{steps.length} completos</span></div><div className="mt-5 grid gap-3 md:grid-cols-2">{steps.map((step) => <div key={step.id} className={`rounded-2xl border p-4 ${step.complete ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-[var(--border-light)] bg-[var(--bg-primary)]'}`}><div className="flex items-start gap-3">{step.complete ? <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-label="Completado" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-muted)]" aria-label="Pendiente" />}<div className="min-w-0 flex-1"><p className="m-0 text-sm font-bold">{step.label}</p>{step.description && <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{step.description}</p>}{!step.complete && (step.action || step.actionLabel) && <div className="mt-3 text-xs font-bold text-[var(--color-primary-light)]">{step.action || step.actionLabel}</div>}</div></div></div>)}</div></section>;
};

export default JourneyChecklist;

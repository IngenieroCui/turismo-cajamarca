import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SectionTabItem { id: string; label: string; icon?: LucideIcon; count?: number; badge?: React.ReactNode; }
interface SectionTabsProps { items: SectionTabItem[]; active: string; onChange: (id: string) => void; }

const SectionTabs: React.FC<SectionTabsProps> = ({ items, active, onChange }) => (
  <div role="tablist" aria-label="Secciones del espacio de trabajo" className="flex gap-2 overflow-x-auto pb-1">
    {items.map(({ id, label, icon: Icon, count, badge }) => <button key={id} type="button" role="tab" aria-selected={active === id} onClick={() => onChange(id)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${active === id ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)]' : 'border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}><span>{Icon && <Icon className="h-4 w-4" aria-hidden="true" />}</span>{label}{count !== undefined && <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-[11px]">{count}</span>}{badge}</button>)}
  </div>
);

export default SectionTabs;

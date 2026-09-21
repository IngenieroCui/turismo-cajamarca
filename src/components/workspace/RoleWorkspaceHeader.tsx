import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface RoleWorkspaceHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  roleLabel?: string;
  roleBadgeClass?: string;
  icon?: LucideIcon;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  contextSlot?: React.ReactNode;
}

const RoleWorkspaceHeader: React.FC<RoleWorkspaceHeaderProps> = ({
  eyebrow,
  title,
  description,
  roleLabel,
  roleBadgeClass,
  icon: Icon,
  primaryAction,
  secondaryActions,
  contextSlot,
}) => (
  <header className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5 shadow-xl sm:p-6">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary-light)]"><Icon className="h-5 w-5" aria-hidden="true" /></div>}
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary-light)]">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{title}</h1>
            {roleLabel && <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${roleBadgeClass || 'border-[var(--border-light)] text-[var(--text-secondary)]'}`}>{roleLabel}</span>}
          </div>
          {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>}
        </div>
      </div>
      {(contextSlot || primaryAction || secondaryActions) && <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[16rem] lg:items-end">{contextSlot}{(primaryAction || secondaryActions) && <div className="flex flex-wrap gap-2 lg:justify-end">{secondaryActions}{primaryAction}</div>}</div>}
    </div>
  </header>
);

export default RoleWorkspaceHeader;

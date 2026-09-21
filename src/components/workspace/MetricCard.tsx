import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  description?: string;
  tone?: string;
  trendText?: string;
  action?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, description, tone = 'text-[var(--color-primary-light)]', trendText, action }) => (
  <article className="min-w-0 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4 shadow-lg">
    <div className="flex items-start justify-between gap-3">
      {Icon && <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />}
      {action}
    </div>
    <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">{value}</p>
    <p className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">{label}</p>
    {description && <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>}
    {trendText && <p className="mt-2 text-xs font-semibold text-emerald-300">{trendText}</p>}
  </article>
);

export default MetricCard;

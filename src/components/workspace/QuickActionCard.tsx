import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel: string;
  onClick?: () => void;
  to?: string;
  tone?: string;
  disabled?: boolean;
  disabledReason?: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, icon: Icon, actionLabel, onClick, to, tone = 'text-[var(--color-primary-light)]', disabled, disabledReason }) => {
  const content = <><div className="flex items-start gap-3"><Icon className={`h-5 w-5 shrink-0 ${tone}`} aria-hidden="true" /><div className="min-w-0"><h3 className="m-0 text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{disabled && disabledReason ? disabledReason : description}</p></div></div><span className="mt-4 inline-flex min-h-10 items-center text-xs font-bold text-[var(--color-primary-light)]">{disabled ? 'No disponible' : actionLabel}</span></>;
  const className = `rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4 shadow-lg transition ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5 hover:border-[var(--color-primary-light)]/50'}`;
  if (!disabled && to) return <Link to={to} className={className}>{content}</Link>;
  if (!disabled && onClick) return <button type="button" onClick={onClick} className={`${className} w-full text-left`}>{content}</button>;
  return <div className={className}>{content}</div>;
};

export default QuickActionCard;

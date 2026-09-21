import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface AttentionCardProps { title: string; description: string; tone?: 'warning' | 'danger' | 'info' | 'success'; icon?: LucideIcon; action?: React.ReactNode; }
const styles = { warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100', danger: 'border-red-500/30 bg-red-500/10 text-red-100', info: 'border-sky-500/30 bg-sky-500/10 text-sky-100', success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' };
const AttentionCard: React.FC<AttentionCardProps> = ({ title, description, tone = 'warning', icon: Icon, action }) => <aside className={`rounded-2xl border p-4 ${styles[tone]}`}><div className="flex items-start gap-3">{Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}<div className="min-w-0 flex-1"><h3 className="m-0 text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-relaxed opacity-90">{description}</p>{action && <div className="mt-3">{action}</div>}</div></div></aside>;
export default AttentionCard;

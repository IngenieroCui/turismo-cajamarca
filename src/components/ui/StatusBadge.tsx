import React from 'react';
import { Check, CircleAlert, Info, X } from 'lucide-react';

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple';
interface StatusBadgeProps { label: string; tone?: StatusTone; icon?: boolean; }
const tones: Record<StatusTone, string> = { neutral: 'border-slate-500/30 bg-slate-500/10 text-slate-300', info: 'border-sky-500/30 bg-sky-500/10 text-sky-200', success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200', warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200', danger: 'border-red-500/30 bg-red-500/10 text-red-200', purple: 'border-purple-500/30 bg-purple-500/10 text-purple-200' };
const StatusBadge: React.FC<StatusBadgeProps> = ({ label, tone = 'neutral', icon = false }) => { const Icon = tone === 'success' ? Check : tone === 'danger' ? X : tone === 'warning' ? CircleAlert : tone === 'info' ? Info : null; return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>{icon && Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{label}</span>; };
export default StatusBadge;

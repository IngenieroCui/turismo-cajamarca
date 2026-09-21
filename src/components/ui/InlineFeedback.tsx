import React from 'react';

interface Props { type: 'success' | 'error' | 'info'; message: string; }
const styles = { success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200', error: 'border-red-500/30 bg-red-500/10 text-red-200', info: 'border-sky-500/30 bg-sky-500/10 text-sky-200' };
const InlineFeedback: React.FC<Props> = ({ type, message }) => <div className={`rounded-xl border p-3 text-xs ${styles[type]}`} role={type === 'error' ? 'alert' : undefined} aria-live="polite">{message}</div>;
export default InlineFeedback;

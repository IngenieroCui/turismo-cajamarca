import React from 'react';

interface Props { title: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode; }
const EmptyState: React.FC<Props> = ({ title, description, icon, action }) => <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-light)] bg-[var(--bg-secondary)]/60 p-8 text-center"><div className="mb-3 text-[var(--text-muted)]">{icon}</div><h3 className="my-0 text-sm font-bold">{title}</h3>{description && <p className="mt-1 max-w-md text-xs text-[var(--text-secondary)]">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>;
export default EmptyState;

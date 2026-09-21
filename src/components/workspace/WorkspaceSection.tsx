import React from 'react';

interface WorkspaceSectionProps { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; }
const WorkspaceSection: React.FC<WorkspaceSectionProps> = ({ title, description, action, children, className = '' }) => <section className={`space-y-4 ${className}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-bold sm:text-xl">{title}</h2>{description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>}</div>{action}</div>{children}</section>;
export default WorkspaceSection;

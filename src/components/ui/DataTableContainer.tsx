import React from 'react';

interface DataTableContainerProps { title?: string; description?: string; children: React.ReactNode; }
const DataTableContainer: React.FC<DataTableContainerProps> = ({ title, description, children }) => <section className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] shadow-xl"><div className="p-5 sm:p-6">{title && <h2 className="m-0 text-base font-bold">{title}</h2>}{description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>}</div><div className="overflow-x-auto px-5 pb-5 sm:px-6 sm:pb-6">{children}</div></section>;
export default DataTableContainer;

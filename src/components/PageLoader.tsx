import React from 'react';
import { Loader2 } from 'lucide-react';
import { APP_NAME } from '../config/app';

const PageLoader: React.FC = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] p-4" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 p-8 shadow-2xl">
      <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary-light)]" aria-hidden="true" />
      <div className="text-center"><h1 className="text-lg font-semibold">{APP_NAME}</h1><p className="text-xs text-[var(--text-secondary)]">Cargando…</p></div>
    </div>
  </div>
);

export default PageLoader;

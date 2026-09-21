import React from 'react';
import { Loader2 } from 'lucide-react';

const SectionLoader: React.FC = () => <div className="flex items-center justify-center gap-2 p-6 text-xs text-[var(--text-secondary)]" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Cargando…</div>;
export default SectionLoader;

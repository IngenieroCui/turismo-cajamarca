import React from 'react';
import { Building2 } from 'lucide-react';
import { useProviderContext } from '../../context/useProviderContext';
import { formatProviderMemberRole } from '../../utils/uiFormatters';

const ProviderBusinessSwitcher: React.FC = () => {
  const { contexts, activeProviderId, setActiveProviderId } = useProviderContext();
  if (contexts.length <= 1) return null;
  return (
    <label className="flex min-w-64 items-center gap-2 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2 text-xs">
      <Building2 className="h-4 w-4 text-emerald-400" />
      <span className="sr-only">Negocio activo</span>
      <select aria-label="Negocio activo" value={activeProviderId || ''} onChange={(event) => setActiveProviderId(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[var(--text-primary)] outline-none">
        {contexts.map((context) => <option key={context.providerId} value={context.providerId}>{context.businessName} · {formatProviderMemberRole(context.memberRole)}</option>)}
      </select>
    </label>
  );
};

export default ProviderBusinessSwitcher;

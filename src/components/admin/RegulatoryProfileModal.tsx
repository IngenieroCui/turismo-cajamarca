import React, { useState } from 'react';
import { configureRegulatoryProfile } from '../../services/regulatoryService';
import ModalShell from '../ui/ModalShell';

interface Props { userId: string; initialEntity?: 'MINCIT' | 'FONTUR' | 'CAMARA_COMERCIO'; onClose: () => void; onSaved: () => void; }

const RegulatoryProfileModal: React.FC<Props> = ({ userId, initialEntity = 'MINCIT', onClose, onSaved }) => {
  const [entityType, setEntityType] = useState<Props['initialEntity']>(initialEntity);
  const [institutionalId, setInstitutionalId] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(null);
    try { await configureRegulatoryProfile(userId, entityType || 'MINCIT', institutionalId, jurisdiction, credentialUrl); onSaved(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'No fue posible configurar el perfil.'); }
    finally { setSaving(false); }
  };
  return <ModalShell open title="Configurar institución" description="Solo Super Administrador puede definir este perfil." onClose={onClose} footer={<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-[var(--border-light)] px-4 py-2 text-xs">Cancelar</button><button disabled={saving} form="regulatory-profile-form" type="submit" className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar configuración'}</button></div>}>
    <form id="regulatory-profile-form" onSubmit={(event) => void submit(event)} className="space-y-4">
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      <label htmlFor="regulatory-entity" className="block text-xs font-semibold">Entidad<select id="regulatory-entity" value={entityType} onChange={(event) => setEntityType(event.target.value as Props['initialEntity'])} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm"><option value="MINCIT">MINCIT</option><option value="FONTUR">FONTUR</option><option value="CAMARA_COMERCIO">Cámara de Comercio</option></select></label>
      <label htmlFor="institutional-id" className="block text-xs font-semibold">ID institucional<input id="institutional-id" required value={institutionalId} onChange={(event) => setInstitutionalId(event.target.value)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label>
      <label htmlFor="institutional-jurisdiction" className="block text-xs font-semibold">Jurisdicción<input id="institutional-jurisdiction" value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label>
      <label htmlFor="credential-url" className="block text-xs font-semibold">URL de credencial<input id="credential-url" type="url" value={credentialUrl} onChange={(event) => setCredentialUrl(event.target.value)} className="mt-1 w-full rounded-xl bg-[var(--bg-primary)] px-3 py-2.5 text-sm" /></label>
    </form>
  </ModalShell>;
};

export default RegulatoryProfileModal;

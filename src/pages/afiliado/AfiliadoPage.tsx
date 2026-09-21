import React from 'react';
import { DollarSign, Link2 } from 'lucide-react';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import AffiliateDashboard from '../../components/referral/AffiliateDashboard';
import RoleWorkspaceHeader from '../../components/workspace/RoleWorkspaceHeader';

const AfiliadoPage: React.FC = () => <RoleDrawerLayout><div className="space-y-6"><RoleWorkspaceHeader eyebrow="Socio de conversión" title="Rendimiento de referidos" description="Comparte tu enlace, sigue las reservas atribuidas y consulta tus comisiones." roleLabel="Afiliado" roleBadgeClass="border-rose-500/30 bg-rose-500/10 text-rose-200" icon={Link2} /><AffiliateDashboard variant="affiliate" /><div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]"><DollarSign className="mr-2 inline h-4 w-4 text-rose-400" />Las comisiones ganadas se calculan cuando la reserva referida se completa.</div></div></RoleDrawerLayout>;
export default AfiliadoPage;

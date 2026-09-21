import React from 'react';
import { Award, Link2 } from 'lucide-react';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import AffiliateDashboard from '../../components/referral/AffiliateDashboard';
import RoleWorkspaceHeader from '../../components/workspace/RoleWorkspaceHeader';

const EmbajadorPage: React.FC = () => <RoleDrawerLayout><div className="space-y-6"><RoleWorkspaceHeader eyebrow="Promoción comunitaria" title="Impacto de tus referidos" description="Comparte Cajamarca y entiende el impacto medido por visitas únicas y reservas atribuidas." roleLabel="Embajador" roleBadgeClass="border-orange-500/30 bg-orange-500/10 text-orange-200" icon={Link2} /><AffiliateDashboard variant="ambassador" /><div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]"><Award className="mr-2 inline h-4 w-4 text-orange-400" />Las personas alcanzadas corresponden a visitas únicas registradas en tu enlace.</div></div></RoleDrawerLayout>;
export default EmbajadorPage;

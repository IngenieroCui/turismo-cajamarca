import React from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import { Building, Award, Users, FileText, ShieldCheck } from 'lucide-react';

export const CamaraComercioPage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.CAMARA_COMERCIO];

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        {/* BANNER PRINCIPAL CÁMARA DE COMERCIO */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-secondary)] border border-blue-500/20 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] my-0">
                  Portal de Cámara de Comercio
                </h2>
                <span className={`px-3 py-1 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Funcionario / Representante: <strong>{profile?.full_name || user?.email}</strong> • ID Institucional: <span className="font-mono text-lime-400 font-bold">{profile?.institutional_id || 'CAMARA-TOLIMA-2026'}</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Entidad Reguladora</p>
                <p className="text-xs font-bold text-slate-100 font-mono">Cámara de Comercio de Ibagué / Tolima</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {meta.description} • Validación de Registro Mercantil, expedición de certificados de formalización y acompañamiento gremial a prestadores turísticos.
          </p>
        </div>

        {/* METRICAS DE FORMALIZACIÓN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Building className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Empresas Formalizadas</h4>
            <p className="text-2xl font-black text-blue-400 font-mono my-0">142</p>
            <p className="text-[10px] text-[var(--text-muted)]">Con Matrícula Mercantil activa en Cajamarca</p>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Certificados de Formalización</h4>
            <p className="text-2xl font-black text-lime-400 font-mono my-0">98.5%</p>
            <p className="text-[10px] text-[var(--text-muted)]">Verificación RUC y NIT empresarial</p>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Alianzas Gremiales</h4>
            <p className="text-2xl font-black text-indigo-400 font-mono my-0">8 Convenios</p>
            <p className="text-[10px] text-[var(--text-muted)]">Con la Alcaldía de Cajamarca y FONTUR</p>
          </div>
        </div>

        {/* SECCIÓN DIRECTORIO CON ESTADO MERCANTIL */}
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-light)] pb-4">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] my-0 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Directorio Empresarial de Cajamarca - Estado de Registro Mercantil</span>
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-light)] text-[var(--text-muted)] uppercase tracking-wider font-bold bg-[var(--bg-primary)]/50">
                  <th className="p-3">Razón Social / Empresa</th>
                  <th className="p-3">RUC / NIT</th>
                  <th className="p-3">Sub-tipo de Servicio</th>
                  <th className="p-3">Estado Matrícula</th>
                  <th className="p-3 text-right font-mono">Verificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-primary)]">
                <tr>
                  <td className="p-3 font-bold">Posada Campestre Anaime S.A.S.</td>
                  <td className="p-3 font-mono text-[var(--text-secondary)]">901.234.567-1</td>
                  <td className="p-3 text-emerald-400 font-semibold">Alojamiento</td>
                  <td className="p-3 font-bold text-emerald-400">Renovado 2026</td>
                  <td className="p-3 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Vigente
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Restaurante El Fogon Tolimense</td>
                  <td className="p-3 font-mono text-[var(--text-secondary)]">800.987.654-2</td>
                  <td className="p-3 text-amber-400 font-semibold">Gastronomía</td>
                  <td className="p-3 font-bold text-emerald-400">Renovado 2026</td>
                  <td className="p-3 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Vigente
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Operador Ecoturismo Cordillera Central</td>
                  <td className="p-3 font-mono text-[var(--text-secondary)]">900.112.334-5</td>
                  <td className="p-3 text-blue-400 font-semibold">Agencia de Viajes</td>
                  <td className="p-3 font-bold text-amber-400">Pendiente Renovación</td>
                  <td className="p-3 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      ⚠ En trámite
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleDrawerLayout>
  );
};

export default CamaraComercioPage;

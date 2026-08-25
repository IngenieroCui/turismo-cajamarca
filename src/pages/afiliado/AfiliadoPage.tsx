import React, { useState } from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import { Share2, DollarSign, Wallet, Copy, CheckCircle2, Users } from 'lucide-react';

export const AfiliadoPage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.AFILIADO];
  const [copied, setCopied] = useState(false);

  const referralCode = profile?.referral_code || `REF-${user?.id.substring(0, 6).toUpperCase() || 'CAJAMARCA'}`;
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        {/* BANNER PRINCIPAL AFILIADO */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-secondary)] border border-rose-500/20 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] my-0">
                  ¡Hola, {profile?.full_name || 'Afiliado'}!
                </h2>
                <span className={`px-3 py-1 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{user?.email}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-rose-400" />
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                  Comisión Base
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                  {profile?.commission_rate || 5.0}% por reserva
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Promociona los destinos y experiencias de Cajamarca Tolima usando tu código exclusivo y gana comisiones automáticas.
          </p>
        </div>

        {/* CÓDIGO Y LINK DE REFERIDOS */}
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-4">
          <h3 className="text-base font-bold text-[var(--text-primary)] my-0 flex items-center gap-2 border-b border-[var(--border-light)] pb-3">
            <Share2 className="w-4 h-4 text-rose-400" />
            <span>Tu Enlace Único de Afiliado</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Código Único</label>
              <div className="px-4 py-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-rose-400 font-mono font-bold text-sm tracking-wider">
                {referralCode}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Enlace Promocional Directo</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 px-3.5 py-2.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)] font-mono text-xs focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/20"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* METRICAS Y METODO DE PAGO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Ganancias Acumuladas</h4>
            <p className="text-xl font-black text-emerald-400 font-mono my-0">
              $ {profile?.total_earnings || '0.00'} COP
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Turistas Referidos</h4>
            <p className="text-xl font-black text-[var(--text-primary)] font-mono my-0">
              0 clicks / 0 reservas
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Método de Cobro</h4>
            <p className="text-xs font-bold text-amber-400 uppercase font-mono my-0">
              {profile?.payout_method || 'Yape / Nequi'}
            </p>
          </div>
        </div>
      </div>
    </RoleDrawerLayout>
  );
};

export default AfiliadoPage;

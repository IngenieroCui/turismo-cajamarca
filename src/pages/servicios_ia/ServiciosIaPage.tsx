import React from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import { Bot, Sparkles, Cpu } from 'lucide-react';

export const ServiciosIaPage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.SERVICIOS_IA];

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-purple-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-purple-200 my-0">{profile?.full_name || user?.email}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{user?.email}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
              {meta.label}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{meta.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <Bot className="w-5 h-5 text-purple-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Agente Recomendador</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Gemini 2.5 Flash</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Generación de Itinerarios</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Personalización IA</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-1">
              <Cpu className="w-5 h-5 text-violet-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] my-0">Vector Database</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Embeddings de catálogo</p>
            </div>
          </div>
        </div>
      </div>
    </RoleDrawerLayout>
  );
};

export default ServiciosIaPage;

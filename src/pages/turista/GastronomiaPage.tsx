import React from 'react';
import { Utensils } from 'lucide-react';

export const GastronomiaPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] my-0">Gastronomía & Restaurantes</h2>
            <p className="text-xs text-[var(--text-secondary)]">Sabores auténticos de Cajamarca</p>
          </div>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl text-center space-y-3">
        <Utensils className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Guía Gastronómica en Desarrollo</h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          Próximamente descubrirás restaurantes típicos, quesos de origen, manjar blanco y platos bandera de la región.
        </p>
      </div>
    </div>
  );
};

export default GastronomiaPage;

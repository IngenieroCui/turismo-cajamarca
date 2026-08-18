import React from 'react';
import { Calendar } from 'lucide-react';

export const EventosPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] my-0">Eventos & Festividades</h2>
            <p className="text-xs text-[var(--text-secondary)]">Agenda cultural y carnavales de Cajamarca</p>
          </div>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl text-center space-y-3">
        <Calendar className="w-12 h-12 text-rose-400 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Calendario de Eventos Culturales</h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          Próximamente podrás consultar fechas del Carnaval de Cajamarca, ferias artesanales y celebraciones patronales.
        </p>
      </div>
    </div>
  );
};

export default EventosPage;

import React from 'react';
import { Hotel, Bed } from 'lucide-react';

export const AlojamientosPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Hotel className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] my-0">Alojamientos & Hoteles</h2>
            <p className="text-xs text-[var(--text-secondary)]">Hoteles, posadas y alojamientos verificados con RNT</p>
          </div>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl text-center space-y-3">
        <Bed className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Reserva de Hospedajes en Desarrollo</h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          Próximamente podrás consultar disponibilidad, categorías por estrellas y realizar reservas en establecimientos formales de Cajamarca.
        </p>
      </div>
    </div>
  );
};

export default AlojamientosPage;

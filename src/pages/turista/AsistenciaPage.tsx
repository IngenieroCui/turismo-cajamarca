import React from 'react';
import { PhoneCall, ShieldAlert } from 'lucide-react';

export const AsistenciaPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] my-0">Asistencia & Emergencias</h2>
            <p className="text-xs text-[var(--text-secondary)]">Policía turística, serenazgo y soporte al viajero</p>
          </div>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-teal-400 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Líneas Directas de Protección al Turista</h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          Acceso rápido a iPerú (PromPerú), Policía Nacional de Turismo y centros médicos de atención primaria en Cajamarca.
        </p>
      </div>
    </div>
  );
};

export default AsistenciaPage;

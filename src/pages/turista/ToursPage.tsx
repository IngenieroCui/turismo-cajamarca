import React from 'react';
import { Compass } from 'lucide-react';

export const ToursPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] my-0">Tours & Guiado Oficial</h2>
            <p className="text-xs text-[var(--text-secondary)]">Agencias formalizadas y guías de turismo calificados</p>
          </div>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl text-center space-y-3">
        <Compass className="w-12 h-12 text-purple-400 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Reserva de Tours Guiados</h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          Podrás contratar guías oficiales de turismo y agencias autorizadas con RNT verificado.
        </p>
      </div>
    </div>
  );
};

export default ToursPage;

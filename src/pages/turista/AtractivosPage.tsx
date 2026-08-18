import React from 'react';
import { MapPin, Compass } from 'lucide-react';

export const AtractivosPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] my-0">Atractivos & Rutas Turísticas</h2>
            <p className="text-xs text-[var(--text-secondary)]">Lugares turísticos emblemáticos de Cajamarca</p>
          </div>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl text-center space-y-3">
        <Compass className="w-12 h-12 text-[var(--color-primary-light)] mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Catálogo de Rutas Turísticas en Construcción</h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          Próximamente podrás explorar mapas interactivos, Baños del Inca, Ventanillas de Otuzco, Cumbemayo y la Plaza de Armas de Cajamarca.
        </p>
      </div>
    </div>
  );
};

export default AtractivosPage;

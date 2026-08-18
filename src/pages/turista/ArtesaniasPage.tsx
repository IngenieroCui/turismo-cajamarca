import React from 'react';
import { ShoppingBag } from 'lucide-react';

export const ArtesaniasPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] my-0">Artesanías & Souvenirs</h2>
            <p className="text-xs text-[var(--text-secondary)]">Tejeduría, talleres de piedra y recuerdos locales</p>
          </div>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl text-center space-y-3">
        <ShoppingBag className="w-12 h-12 text-orange-400 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Catálogo de Artesanos</h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          Próximamente podrás comprar directo a maestros artesanos cajamarquinos.
        </p>
      </div>
    </div>
  );
};

export default ArtesaniasPage;

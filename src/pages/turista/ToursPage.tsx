import React, { useState } from 'react';
import { TOURS_DATA } from '../../data/touristData';
import {
  Compass,
  Star,
  Sparkles,
  Clock,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';

export const ToursPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const categories = ['Todos', 'Ecoturismo', 'Agroturismo', 'Trekking'];

  const filteredTours = TOURS_DATA.filter((tour) => {
    return selectedCategory === 'Todos' || tour.category === selectedCategory;
  });

  const handleBookTourWhatsApp = (phone: string, tourTitle: string) => {
    const message = encodeURIComponent(
      `Hola! Deseo cotizar y reservar el tour guiado: ${tourTitle} en Cajamarca Tolima.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-8 pb-8">
      {/* HEADER TOURS */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-500/20 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-purple-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
              <Compass className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold mb-1">
                <Sparkles className="w-3 h-3" /> Guías Oficiales & RNT Verificado
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0">
                Tours & Experiencias Guiadas en Cajamarca Tolima
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                Explora el Volcán Machín, la Ruta del Café y los Bosques de Palma de Cera de la mano de expertos locales.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS POR CATEGORÍA */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer border ${
              selectedCategory === cat
                ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-purple-400/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GRID DE TOURS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTours.map((tour) => (
          <div
            key={tour.id}
            className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden shadow-xl hover:border-purple-400/50 transition-all duration-300 flex flex-col justify-between group"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={tour.image}
                alt={tour.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/70 backdrop-blur-md text-purple-300 border border-purple-500/30">
                  {tour.category}
                </span>
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-amber-300 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{tour.rating}</span>
              </div>
            </div>

            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[var(--text-primary)] my-0 leading-snug group-hover:text-purple-400 transition">
                  {tour.title}
                </h3>
                <p className="text-xs text-purple-300 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Operador: {tour.operator}</span>
                </p>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>{tour.duration}</span>
                  </span>
                  <span className="font-extrabold text-[var(--color-primary-light)]">
                    {tour.price}
                  </span>
                </div>
              </div>

              {/* Incluye */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-light)]">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                    El paquete incluye:
                  </span>
                  <div className="grid grid-cols-1 gap-1">
                    {tour.includes.map((inc, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleBookTourWhatsApp(tour.contactWhatsApp, tour.title)}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Reservar Tour por WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToursPage;

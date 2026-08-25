import React, { useState } from 'react';
import { ATRACTIVOS_DATA, type Attraction } from '../../data/touristData';
import {
  MapPin,
  Star,
  Clock,
  MessageCircle,
  X,
  CheckCircle2,
  Filter,
  Sparkles,
} from 'lucide-react';

export const AtractivosPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [activeModal, setActiveModal] = useState<Attraction | null>(null);

  const categories = ['Todos', 'Ecoturismo', 'Agroturismo', 'Aventura', 'Cultura', 'Relax'];

  const filteredAttractions = ATRACTIVOS_DATA.filter((item) => {
    return selectedCategory === 'Todos' || item.category === selectedCategory;
  });

  const handleWhatsAppContact = (phone: string, attractionName: string) => {
    const message = encodeURIComponent(
      `Hola! Deseo más información sobre el atractivo turístico: ${attractionName}`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-8 pb-8">
      {/* HEADER DE LA PÁGINA */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <MapPin className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold mb-1">
                <Sparkles className="w-3 h-3" /> Naturaleza & Rutas Ecológicas
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0">
                Atractivos Turísticos de Cajamarca Tolima
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                Explora el Bosque de Palmas de Cera, el Cañón del Anaime, cascadas y volcanes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS POR CATEGORÍA */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 mr-2">
          <Filter className="w-3.5 h-3.5" /> Filtrar por:
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer border ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-emerald-500/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GRID DE ATRACTIVOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAttractions.map((attraction) => (
          <div
            key={attraction.id}
            className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden shadow-xl hover:border-[var(--color-primary-light)]/60 transition-all duration-300 flex flex-col justify-between group"
          >
            <div className="relative h-52 overflow-hidden">
              <img
                src={attraction.image}
                alt={attraction.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/70 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                  {attraction.category}
                </span>
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-amber-300 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{attraction.rating}</span>
              </div>
            </div>

            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[var(--text-primary)] my-0 leading-snug group-hover:text-[var(--color-primary-light)] transition">
                  {attraction.name}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  {attraction.shortDesc}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span className="truncate max-w-[160px]">{attraction.location}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>{attraction.duration}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-light)]">
                  <button
                    onClick={() => setActiveModal(attraction)}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-light)] text-xs font-bold text-[var(--text-primary)] transition cursor-pointer text-center"
                  >
                    Ver detalles
                  </button>
                  {attraction.contactWhatsApp && (
                    <button
                      onClick={() => handleWhatsAppContact(attraction.contactWhatsApp!, attraction.name)}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DETALLES */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="relative h-64 sm:h-72">
              <img src={activeModal.image} alt={activeModal.name} className="w-full h-full object-cover" />
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-md">
                  {activeModal.category}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 flex items-center gap-1 shadow-md">
                  <Star className="w-3.5 h-3.5 fill-slate-950" /> {activeModal.rating}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] my-0">{activeModal.name}</h3>
                <p className="text-xs text-[var(--color-primary-light)] font-semibold flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" /> {activeModal.location}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {activeModal.fullDesc}
              </p>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Highlights & Recomendaciones:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeModal.highlights.map((hl, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-light)]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[var(--bg-primary)] border-t border-[var(--border-light)] flex items-center justify-between gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border-light)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                Cerrar
              </button>
              {activeModal.contactWhatsApp && (
                <button
                  onClick={() => handleWhatsAppContact(activeModal.contactWhatsApp!, activeModal.name)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contactar Guía por WhatsApp</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AtractivosPage;

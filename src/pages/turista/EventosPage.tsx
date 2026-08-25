import React from 'react';
import { EVENTOS_DATA } from '../../data/touristData';
import { Calendar, MapPin, Sparkles, Ticket } from 'lucide-react';

export const EventosPage: React.FC = () => {
  return (
    <div className="space-y-8 pb-8">
      {/* HEADER EVENTOS */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-500/20 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-rose-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold mb-1">
                <Sparkles className="w-3 h-3" /> Calendario Cultural & Deportivo
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0">
                Eventos & Festividades en Cajamarca Tolima
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                Disfruta del Carnaval del Cerdo, Encuentro Motero y las Ferias de la Arracacha.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LISTA DE EVENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EVENTOS_DATA.map((evt) => (
          <div
            key={evt.id}
            className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden shadow-xl hover:border-rose-400/50 transition-all duration-300 flex flex-col justify-between group"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={evt.image}
                alt={evt.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/70 backdrop-blur-md text-rose-300 border border-rose-500/30">
                  {evt.category}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                  <Calendar className="w-4 h-4" />
                  <span>{evt.date}</span>
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] my-0 group-hover:text-rose-400 transition">
                  {evt.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {evt.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-light)] space-y-2">
                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">{evt.location}</span>
                </p>
                <div className="flex items-center justify-between text-xs font-bold text-[var(--color-primary-light)]">
                  <span className="flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5" /> Entrada Libre / Abierta
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventosPage;

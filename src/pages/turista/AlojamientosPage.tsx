import React, { useState } from 'react';
import { ALOJAMIENTOS_DATA } from '../../data/touristData';
import {
  Hotel,
  Star,
  Sparkles,
  MapPin,
  MessageCircle,
} from 'lucide-react';

export const AlojamientosPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('Todos');

  const types = ['Todos', 'Finca Agroturística', 'Hotel', 'Glamping', 'Posada Rural'];

  const filteredHotels = ALOJAMIENTOS_DATA.filter((h) => {
    return selectedType === 'Todos' || h.type === selectedType;
  });

  const handleBookingWhatsApp = (phone: string, hotelName: string) => {
    const message = encodeURIComponent(
      `Hola! Vengo de la app Turismo Cajamarca y me interesa reservar en: ${hotelName}`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-8 pb-8">
      {/* HEADER ALOJAMIENTOS */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-500/20 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-blue-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <Hotel className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold mb-1">
                <Sparkles className="w-3 h-3" /> Hospedaje Verificado en Cajamarca Tolima
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0">
                Alojamientos, Fincas Agroturísticas & Hoteles
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                Encuentra la tranquilidad del campo o la comodidad urbana en Cajamarca, Tolima.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS POR TIPO */}
      <div className="flex flex-wrap items-center gap-2">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer border ${
              selectedType === type
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-blue-400/40'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* GRID DE ALOJAMIENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredHotels.map((hotel) => (
          <div
            key={hotel.id}
            className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden shadow-xl hover:border-blue-400/50 transition-all duration-300 flex flex-col sm:flex-row group"
          >
            <div className="relative sm:w-2/5 h-48 sm:h-auto overflow-hidden shrink-0">
              <img
                src={hotel.image}
                alt={hotel.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-black/70 backdrop-blur-md text-blue-300 border border-blue-500/30">
                  {hotel.type}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[var(--text-primary)] my-0 leading-snug group-hover:text-blue-400 transition">
                    {hotel.name}
                  </h3>
                  <div className="flex items-center gap-1 text-amber-300 text-xs font-bold shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{hotel.rating}</span>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{hotel.location}</span>
                </p>

                <p className="text-sm font-extrabold text-[var(--color-primary-light)]">
                  {hotel.pricePerNight}
                </p>
              </div>

              {/* Amenidades */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-light)]">
                <div className="flex flex-wrap gap-1.5">
                  {hotel.amenities.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-light)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handleBookingWhatsApp(hotel.contactWhatsApp, hotel.name)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Reservar por WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlojamientosPage;

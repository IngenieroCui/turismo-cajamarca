import React, { useState } from 'react';
import { GASTRONOMIA_DATA } from '../../data/touristData';
import {
  Utensils,
  Star,
  Sparkles,
  Search,
  DollarSign,
  MapPin,
  MessageCircle,
} from 'lucide-react';

export const GastronomiaPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['Todos', 'Plato Fuerte', 'Postres', 'Bebidas', 'Mecatos'];

  const filteredDishes = GASTRONOMIA_DATA.filter((dish) => {
    const matchesCategory =
      selectedCategory === 'Todos' || dish.category === selectedCategory;
    const matchesSearch =
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.popularIn.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOrderWhatsApp = (dishName: string) => {
    const message = encodeURIComponent(
      `Hola! Quisiera consultar restaurantes y hacer un pedido de: ${dishName} en Cajamarca Tolima.`
    );
    window.open(`https://wa.me/573025091063?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-8 pb-8">
      {/* HEADER GASTRONOMÍA */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/20 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Utensils className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold mb-1">
                <Sparkles className="w-3 h-3" /> Sabores de la Despensa Agrícola
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0">
                Gastronomía & Restaurantes de Cajamarca Tolima
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                Disfruta del Tamal Tolimense, Lechona crujiente, trucha campestre y especialidades de Arracacha.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Buscar tamal, lechona, arracacha..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs focus:outline-none focus:border-amber-400 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-amber-400/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE PLATOS GASTRONÓMICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDishes.map((dish) => (
          <div
            key={dish.id}
            className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden shadow-xl hover:border-amber-400/50 transition-all duration-300 flex flex-col justify-between group"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={dish.image}
                alt={dish.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/70 backdrop-blur-md text-amber-300 border border-amber-500/30">
                  {dish.category}
                </span>
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-amber-300 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{dish.rating}</span>
              </div>
            </div>

            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[var(--text-primary)] my-0 leading-snug group-hover:text-amber-400 transition">
                  {dish.name}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {dish.description}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1 text-xs text-[var(--text-muted)] border-t border-[var(--border-light)] pt-3">
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{dish.popularIn}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{dish.priceRange}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOrderWhatsApp(dish.name)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Consultar Restaurantes</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GastronomiaPage;

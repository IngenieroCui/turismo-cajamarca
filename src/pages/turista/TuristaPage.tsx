import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import {
  ATRACTIVOS_DATA,
  GASTRONOMIA_DATA,
  type Attraction,
} from '../../data/touristData';
import {
  MapPin,
  Hotel,
  Utensils,
  Compass,
  Calendar,
  ShoppingBag,
  PhoneCall,
  User,
  Sparkles,
  Search,
  ChevronRight,
  Star,
  Clock,
  Navigation,
  MessageCircle,
  X,
  CheckCircle2,
  Mountain,
} from 'lucide-react';

export const TuristaPage: React.FC = () => {
  const { profile } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [activeAttractionModal, setActiveAttractionModal] = useState<Attraction | null>(null);

  // Módulos principales de la aplicación
  const touristModules = [
    {
      title: 'Atractivos & Rutas',
      desc: 'Bosques de Palma de Cera, Cañón del Anaime y Volcán Machín.',
      icon: MapPin,
      path: '/turista/atractivos',
      badge: 'Ecoturismo',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      title: 'Alojamientos & Hoteles',
      desc: 'Fincas agroturísticas, posadas rurales y hoteles formales.',
      icon: Hotel,
      path: '/turista/alojamientos',
      badge: 'Hospedaje',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      title: 'Gastronomía Tolimense',
      desc: 'Tamal tolimense, lechona, arracacha y sancocho criollo.',
      icon: Utensils,
      path: '/turista/gastronomia',
      badge: 'Despensa Agrícola',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    {
      title: 'Tours & Guiado Oficial',
      desc: 'Excursiones con guías profesionales y agencias autorizadas.',
      icon: Compass,
      path: '/turista/tours',
      badge: 'Aventura',
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    {
      title: 'Eventos & Fiestas',
      desc: 'Carnaval del Cerdo, Encuentro Motero y Ferias Agrícolas.',
      icon: Calendar,
      path: '/turista/eventos',
      badge: 'Cultura',
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    {
      title: 'Artesanías & Comercio',
      desc: 'Productos del campo, tejidos y recuerdos locales.',
      icon: ShoppingBag,
      path: '/turista/artesanias',
      badge: 'Comercio',
      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    },
    {
      title: 'Asistencia al Turista',
      desc: 'Línea de emergencia, Policía de Turismo Tolima y mapa.',
      icon: PhoneCall,
      path: '/turista/asistencia',
      badge: '24/7',
      color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    },
    {
      title: 'Mi Perfil Turístico',
      desc: 'Gestiona tus datos personales y reservas guardadas.',
      icon: User,
      path: '/turista/perfil',
      badge: 'Cuenta',
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    },
  ];

  // Filtrado dinámico de atractivos en el buscador
  const filteredAttractions = ATRACTIVOS_DATA.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'Todos' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleWhatsAppContact = (phone: string, attractionName: string) => {
    const message = encodeURIComponent(
      `Hola! Vengo de la app Turismo Cajamarca y deseo más información sobre: ${attractionName}`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <RoleDrawerLayout>
      <div className="space-y-10 pb-8">
        {/* HERO BANNER PRINCIPAL */}
        <div className="relative rounded-3xl overflow-hidden border border-[var(--border-light)] shadow-2xl bg-[var(--bg-secondary)]">
          {/* Imagen de fondo con overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1600&q=80"
              alt="Cajamarca Tolima Paisaje"
              className="w-full h-full object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-secondary)] via-[var(--bg-secondary)]/80 to-transparent" />
          </div>

          <div className="relative z-10 p-6 sm:p-10 space-y-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Cajamarca, Tolima • La Despensa Agrícola de Colombia</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] my-0 leading-tight tracking-tight">
              ¡Hola, {profile?.full_name?.split(' ')[0] || 'Viajero'}! <br className="hidden sm:inline" />
              Descubre el Corazón Verde del Tolima
            </h1>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Explora majestuosos bosques de Palma de Cera, disfruta del auténtico tamal tolimense, hospedate en fincas agroturísticas y vive aventuras en la Cordillera Central.
            </p>

            {/* Buscador Integrado */}
            <div className="pt-2">
              <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar atractivos, cascadas, lechona, hoteles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[var(--bg-primary)]/90 border border-[var(--border-medium)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] focus:ring-2 focus:ring-[var(--color-primary-light)]/20 shadow-lg transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Categorías Rápidas */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {['Todos', 'Ecoturismo', 'Agroturismo', 'Aventura', 'Cultura', 'Relax'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                    selectedCategory === cat
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-contrast)] border-[var(--color-primary)] shadow-md'
                      : 'bg-[var(--bg-primary)]/70 text-[var(--text-secondary)] border-[var(--border-light)] hover:border-[var(--color-primary-light)]/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN MÓDULOS DEL TURISTA */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] my-0 flex items-center gap-2">
                <Compass className="w-5 h-5 text-[var(--color-primary-light)]" />
                <span>Explora los Servicios de Cajamarca Tolima</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Todo lo que necesitas para tu estadía perfecta
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {touristModules.map((item) => {
              const IconComp = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] hover:border-[var(--color-primary-light)]/60 shadow-xl transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${item.color}`}>
                        <IconComp className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)]">
                        {item.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary-light)] transition my-0">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center text-xs font-semibold text-[var(--color-primary-light)] gap-1 pt-3 border-t border-[var(--border-light)]">
                    <span>Ingresar al catálogo</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* CATÁLOGO DE ATRACTIVOS DESTACADOS */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] my-0 flex items-center gap-2">
                <Mountain className="w-5 h-5 text-emerald-400" />
                <span>Atractivos Emblemáticos & Rutas</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Destinos imperdibles en el municipio de Cajamarca, Tolima
              </p>
            </div>
            <Link
              to="/turista/atractivos"
              className="text-xs font-bold text-[var(--color-primary-light)] hover:underline flex items-center gap-1"
            >
              Ver todos ({ATRACTIVOS_DATA.length}) <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAttractions.map((attraction) => (
              <div
                key={attraction.id}
                className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden shadow-xl hover:border-[var(--color-primary-light)]/50 transition-all duration-300 flex flex-col justify-between group"
              >
                {/* Imagen con Badges */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={attraction.image}
                    alt={attraction.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--bg-primary)]/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                      {attraction.category}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-300 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{attraction.rating}</span>
                  </div>
                </div>

                {/* Contenido */}
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
                        <span className="truncate max-w-[170px]">{attraction.location}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>{attraction.duration}</span>
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-light)]">
                      <button
                        onClick={() => setActiveAttractionModal(attraction)}
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
        </div>

        {/* SECCIÓN ESPECIAL: SABORES AUTÉNTICOS DEL TOLIMA */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-amber-500/20 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Gastronomía de Cajamarca Tolima
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] my-0">
                Sabores Auténticos de la Despensa Agrícola
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Disfruta de la mejor cocina tradicional campesina y tolimense.
              </p>
            </div>
            <Link
              to="/turista/gastronomia"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
            >
              <Utensils className="w-4 h-4" /> Ver Menú Gastronómico
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GASTRONOMIA_DATA.slice(0, 3).map((dish) => (
              <div
                key={dish.id}
                className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] flex gap-4 items-center shadow-lg"
              >
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="w-20 h-20 rounded-xl object-cover"
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] my-0">{dish.name}</h4>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                      ★ {dish.rating}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{dish.description}</p>
                  <p className="text-[11px] font-semibold text-[var(--color-primary-light)]">{dish.priceRange}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECCIÓN "CÓMO LLEGAR A CAJAMARCA TOLIMA" */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-2xl space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
              <Navigation className="w-3.5 h-3.5" /> Ubicación & Accesos
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] my-0">
              ¿Cómo llegar a Cajamarca, Tolima?
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Ubicado estratégicamente sobre la Carretera Panamericana en el corazón de Colombia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-3">
              <div className="flex items-center gap-3 text-emerald-400 font-bold text-sm">
                <MapPin className="w-5 h-5" /> Desde Ibagué (Capital del Tolima)
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Cajamarca está a solo <strong>35 kilómetros de Ibagué</strong> (aproximadamente 45 minutos en automóvil o transporte público). La vía principal recorre impresionantes cañones de montaña.
              </p>
              <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Buses frecuentes cada 15 min desde la Terminal de Ibagué.
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)] space-y-3">
              <div className="flex items-center gap-3 text-blue-400 font-bold text-sm">
                <Navigation className="w-5 h-5" /> Desde Armenia (Eje Cafetero - Quindío)
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Cruzando la Cordillera Central a través de la vía Panamericana y el <strong>Túnel de La Línea</strong>, el trayecto desde Armenia toma alrededor de <strong>90 minutos</strong>.
              </p>
              <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" /> Ideal para conectar la Ruta del Café con el Tolima.
              </div>
            </div>
          </div>
        </div>

        {/* MODAL DE DETALLES DEL ATRACTIVO */}
        {activeAttractionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
              {/* Header del modal con imagen */}
              <div className="relative h-64 sm:h-72">
                <img
                  src={activeAttractionModal.image}
                  alt={activeAttractionModal.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setActiveAttractionModal(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-md">
                    {activeAttractionModal.category}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 flex items-center gap-1 shadow-md">
                    <Star className="w-3.5 h-3.5 fill-slate-950" /> {activeAttractionModal.rating}
                  </span>
                </div>
              </div>

              {/* Cuerpo del modal */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] my-0">
                    {activeAttractionModal.name}
                  </h3>
                  <p className="text-xs text-[var(--color-primary-light)] font-semibold flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {activeAttractionModal.location}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {activeAttractionModal.fullDesc}
                </p>

                {/* Highlights */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Lo más destacado:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeAttractionModal.highlights.map((hl, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-light)]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer del Modal */}
              <div className="p-4 bg-[var(--bg-primary)] border-t border-[var(--border-light)] flex items-center justify-between gap-3">
                <button
                  onClick={() => setActiveAttractionModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-light)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                >
                  Cerrar
                </button>
                {activeAttractionModal.contactWhatsApp && (
                  <button
                    onClick={() =>
                      handleWhatsAppContact(
                        activeAttractionModal.contactWhatsApp!,
                        activeAttractionModal.name
                      )
                    }
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Contactar por WhatsApp</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleDrawerLayout>
  );
};

export default TuristaPage;

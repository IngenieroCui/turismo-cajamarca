import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
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
  ChevronRight,
} from 'lucide-react';

export const TuristaPage: React.FC = () => {
  const { profile } = useAuthStore();

  const touristModules = [
    {
      title: 'Atractivos & Rutas',
      desc: 'Descubre los Baños del Inca, Cumbemayo, Otuzco y senderos.',
      icon: MapPin,
      path: '/turista/atractivos',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      title: 'Alojamientos & Hoteles',
      desc: 'Reserva hospedajes, posadas y hoteles certificados.',
      icon: Hotel,
      path: '/turista/alojamientos',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      title: 'Gastronomía & Platos',
      desc: 'Disfruta del queso mantecoso, cuy frito y restaurantes.',
      icon: Utensils,
      path: '/turista/gastronomia',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    {
      title: 'Tours & Guiado Oficial',
      desc: 'Agencias formalizadas y guías de turismo calificados.',
      icon: Compass,
      path: '/turista/tours',
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    {
      title: 'Eventos & Festividades',
      desc: 'Calendario del Carnaval de Cajamarca y fiestas locales.',
      icon: Calendar,
      path: '/turista/eventos',
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    {
      title: 'Artesanías & Souvenirs',
      desc: 'Productos de tejeduría, cerámica y tiendas de regalos.',
      icon: ShoppingBag,
      path: '/turista/artesanias',
      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    },
    {
      title: 'Asistencia al Turista',
      desc: 'Policía turística, mapas offline y asistencia inmediata.',
      icon: PhoneCall,
      path: '/turista/asistencia',
      color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    },
    {
      title: 'Mi Perfil Turístico',
      desc: 'Ver y actualizar tus datos de cuenta y emergencias.',
      icon: User,
      path: '/turista/perfil',
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* BANNER DE BIENVENIDA */}
      <div className="relative p-8 rounded-3xl bg-gradient-to-r from-[var(--color-primary-dark)] via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-[var(--border-light)] shadow-2xl overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary-light)]/20 border border-[var(--color-primary-light)]/40 text-[var(--color-primary-light)] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Portal Inteligente de Turismo
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0 leading-tight">
            ¡Hola, {profile?.full_name || 'Viajero'}! Bienvenido a Cajamarca
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Explora destinos icónicos, reserva gastronomía auténtica y gestiona toda tu experiencia de viaje desde un solo lugar.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/turista/perfil"
              className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-primary-contrast)] text-xs font-bold shadow-lg shadow-[var(--color-primary)]/20 transition flex items-center gap-2"
            >
              <User className="w-4 h-4" /> Ver Mi Perfil
            </Link>
          </div>
        </div>
      </div>

      {/* MÓDULOS DE NAVEGACIÓN */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
          Explora los Servicios Turísticos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {touristModules.map((item) => {
            const IconComp = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] hover:border-[var(--color-primary-light)]/50 shadow-xl transition group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${item.color}`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary-light)] transition my-0">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-xs font-semibold text-[var(--color-primary-light)] gap-1 pt-2 border-t border-[var(--border-light)]">
                  <span>Acceder</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TuristaPage;

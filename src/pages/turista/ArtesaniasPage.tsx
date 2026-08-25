import React from 'react';
import { ShoppingBag, Sparkles, MessageCircle } from 'lucide-react';

export const ArtesaniasPage: React.FC = () => {
  const products = [
    {
      id: '1',
      title: 'Canastos y Tejidos en Fibra de Plátano',
      artisan: 'Artesanas de Anaime',
      desc: 'Canastos tradicionales y accesorios elaborados a mano con fibras de plátano y palma.',
      price: '$25.000 - $45.000 COP',
      image: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: '2',
      title: 'Productos Derivados del Café Especial',
      artisan: 'Asociación de Cafeteros de Cajamarca',
      desc: 'Café tostado en origen, galletas de café, arequipe de café y licores artesanales.',
      price: '$15.000 - $35.000 COP',
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: '3',
      title: 'Souvenirs en Madera & Palma de Cera',
      artisan: 'Taller Artesanal El Urapán',
      desc: 'Tallados en madera sostenible representando la fauna autóctona y la Palma de Cera.',
      price: '$12.000 - $30.000 COP',
      image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const handleBuyWhatsApp = (productTitle: string) => {
    const message = encodeURIComponent(
      `Hola! Quisiera comprar / cotizar la artesanía: ${productTitle} de Cajamarca Tolima.`
    );
    window.open(`https://wa.me/573025091063?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-8 pb-8">
      {/* HEADER ARTESANÍAS */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-orange-500/20 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-orange-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-bold mb-1">
                <Sparkles className="w-3 h-3" /> Comercio & Artesanía Campesina
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0">
                Artesanías & Recuerdos de Cajamarca Tolima
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                Apoya a las familias artesanas y llévate un pedacito de la Despensa Agrícola de Colombia.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* GRID DE PRODUCTOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden shadow-xl hover:border-orange-400/50 transition-all duration-300 flex flex-col justify-between group"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[var(--text-primary)] my-0 group-hover:text-orange-400 transition">
                  {item.title}
                </h3>
                <p className="text-xs text-orange-300 font-semibold">{item.artisan}</p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
              </div>

              <div className="pt-3 border-t border-[var(--border-light)] space-y-3">
                <p className="text-sm font-extrabold text-[var(--color-primary-light)]">{item.price}</p>
                <button
                  onClick={() => handleBuyWhatsApp(item.title)}
                  className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Comprar por WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtesaniasPage;

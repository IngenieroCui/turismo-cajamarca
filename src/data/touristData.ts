export interface Attraction {
  id: string;
  name: string;
  category: 'Ecoturismo' | 'Agroturismo' | 'Aventura' | 'Cultura' | 'Relax';
  shortDesc: string;
  fullDesc: string;
  location: string;
  image: string;
  rating: number;
  reviewsCount: number;
  duration: string;
  difficulty?: 'Fácil' | 'Moderado' | 'Exigente';
  highlights: string[];
  contactWhatsApp?: string;
  coordinates?: { lat: number; lng: number };
}

export interface Dish {
  id: string;
  name: string;
  category: 'Plato Fuerte' | 'Bebidas' | 'Postres' | 'Mecatos';
  description: string;
  image: string;
  popularIn: string;
  priceRange: string;
  rating: number;
}

export interface Accommodation {
  id: string;
  name: string;
  type: 'Finca Agroturística' | 'Hotel' | 'Posada Rural' | 'Glamping';
  location: string;
  image: string;
  pricePerNight: string;
  rating: number;
  amenities: string[];
  contactWhatsApp: string;
}

export interface TourPackage {
  id: string;
  title: string;
  operator: string;
  duration: string;
  price: string;
  image: string;
  rating: number;
  category: 'Ecoturismo' | 'Agroturismo' | 'Ciclomontañismo' | 'Trekking';
  includes: string[];
  contactWhatsApp: string;
}

export interface LocalEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  image: string;
  category: 'Festividad' | 'Deporte' | 'Feria Agrícola' | 'Cultura';
}

export const ATRACTIVOS_DATA: Attraction[] = [
  {
    id: 'canon-anaime',
    name: 'Cañón del Anaime & Bosques de Palma de Cera',
    category: 'Ecoturismo',
    shortDesc: 'Majestuoso cañón con valles verdes y colosales palmas de cera autóctonas.',
    fullDesc: 'Ubicado en el corregimiento de Anaime, este santuario natural alberga imponentes bosques de la palma nacional de Colombia. Ideal para avistamiento de aves, fotografía y caminatas de montaña.',
    location: 'Corregimiento de Anaime, Cajamarca - Tolima',
    image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewsCount: 128,
    duration: '4 - 6 horas',
    difficulty: 'Moderado',
    highlights: ['Bosque nativo de Palma de Cera', 'Avistamiento de Aves y Loros Orejiamarillos', 'Miradores fotográficos de la cordillera'],
    contactWhatsApp: '573025091063',
  },
  {
    id: 'finca-la-aurora',
    name: 'Finca Agroturística La Aurora',
    category: 'Agroturismo',
    shortDesc: 'Experiencia campesina interactiva: recorrido del café, huertas agrícolas y catación.',
    fullDesc: 'Siente el orgullo de la "Despensa Agrícola de Colombia". Recorre cultivos de café de altura, hortalizas y fruta fresca, guiado por familias campesinas tradicionales de la región.',
    location: 'Vereda La Aurora, Cajamarca - Tolima',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewsCount: 95,
    duration: '3 - 5 horas',
    difficulty: 'Fácil',
    highlights: ['Taller de café especial', 'Almuerzo típico de campo', 'Caminata senderos florales'],
    contactWhatsApp: '573025091063',
  },
  {
    id: 'volcan-machin-termales',
    name: 'Volcán Machín & Termales Naturales',
    category: 'Aventura',
    shortDesc: 'Aventura geológica hasta el cráter del volcán y pozos de aguas termales curativas.',
    fullDesc: 'Una de las maravillas geológicas de la Cordillera Central. Conoce el domo volcánico del Machín rodeado de vegetación exuberante y sumérgete en fuentes termales ricas en minerales.',
    location: 'Vereda Toche / Machín, Cajamarca - Tolima',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewsCount: 110,
    duration: 'Día completo (7-8 h)',
    difficulty: 'Exigente',
    highlights: ['Caminata a cráter volcánico', 'Aguas termales medicinales', 'Paisaje volcánico andino'],
    contactWhatsApp: '573025091063',
  },
  {
    id: 'ruta-hormas-downhill',
    name: 'Ruta Ciclomontañista Las Hormas',
    category: 'Aventura',
    shortDesc: 'Ruta extrema de MTB y senderismo por senderos de alta montaña y bosques nublados.',
    fullDesc: 'El destino favorito para amantes del ciclomontañismo y downhill en el Tolima. Descenso con vistas panorámicas increíbles del cañón y la Cordillera de los Andes.',
    location: 'Vereda Las Hormas, Cajamarca - Tolima',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    reviewsCount: 76,
    duration: '3 - 4 horas',
    difficulty: 'Exigente',
    highlights: ['Pistas trazadas de Downhill', 'Puntos de hidratación campestre', 'Vistas de la cuenca del Anaime'],
    contactWhatsApp: '573025091063',
  },
  {
    id: 'parador-del-parque',
    name: 'Parque Principal & Parador Gastronómico',
    category: 'Cultura',
    shortDesc: 'Corazón cultural del municipio, famoso por sus puestos de dulces, arracacha y artesanías.',
    fullDesc: 'El centro neurálgico de Cajamarca. Disfruta de la hospitalidad de su gente, el icónico monumento agrícola, cafeterías tradicionales y la mejor muestra del folclor campesino.',
    location: 'Centro de Cajamarca, Tolima',
    image: 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewsCount: 210,
    duration: '1 - 2 horas',
    difficulty: 'Fácil',
    highlights: ['Monumento a la Despensa Agrícola', 'Venta de amasijos y productos locales', 'Arquitectura tradicional'],
    contactWhatsApp: '573025091063',
  },
  {
    id: 'chorreras-del-anaime',
    name: 'Chorreras y Cascadas del Río Anaime',
    category: 'Relax',
    shortDesc: 'Imponentes caídas de agua helada y cristalina rodeadas de fauna y flora andina.',
    fullDesc: 'Río de aguas limpias que desciende de los páramos andinos. Espacio ideal para picnic ecológico, baño en pozos naturales y desconexión total en la naturaleza.',
    location: 'Alto Anaime, Cajamarca - Tolima',
    image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewsCount: 84,
    duration: '3 - 5 horas',
    difficulty: 'Moderado',
    highlights: ['Cascada natural de 25m', 'Zonas de camping y descanso', 'Aire puro de montaña'],
    contactWhatsApp: '573025091063',
  },
];

export const GASTRONOMIA_DATA: Dish[] = [
  {
    id: 'tamal-tolimense',
    name: 'Tamal Tolimense Auténtico',
    category: 'Plato Fuerte',
    description: 'Preparado con masa de maíz, pollo, carne de cerdo, huevo cocido, zanahoria y arveja, envuelto tradicionalmente en hoja de plátano.',
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
    popularIn: 'Restaurantes y Paradores del Parque',
    priceRange: '$12.000 - $18.000 COP',
    rating: 4.9,
  },
  {
    id: 'lechona-tolimense',
    name: 'Lechona Tolimense Tradicional',
    category: 'Plato Fuerte',
    description: 'Cerdo crujiente horneado con arveja amarilla sazonada y especias naturales, servida con arepa de maíz blanco.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    popularIn: 'El Carnaval del Cerdo & La Bodega de Amar',
    priceRange: '$18.000 - $25.000 COP',
    rating: 4.9,
  },
  {
    id: 'sancocho-gallina',
    name: 'Sancocho de Gallina Criolla',
    category: 'Plato Fuerte',
    description: 'Caldos espesos preparados en fogón de leña con yuca, plátano, arracacha fresca de Cajamarca y gallina de campo.',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
    popularIn: 'El Fogón de Doña Antonia & Restaurantes de Anaime',
    priceRange: '$20.000 - $28.000 COP',
    rating: 4.8,
  },
  {
    id: 'platos-arracacha',
    name: 'Especiales de Arracacha Cajamarcuna',
    category: 'Plato Fuerte',
    description: 'Cremas, purés, chips crujientes y tortas dulces preparadas con la mejor arracacha de Colombia, cultivada en las laderas del municipio.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    popularIn: 'Donde Jairo & Restaurante Mirador Gourmet',
    priceRange: '$14.000 - $22.000 COP',
    rating: 4.8,
  },
  {
    id: 'trucha-campestre',
    name: 'Trucha Arcoíris Frita o al Ajillo',
    category: 'Plato Fuerte',
    description: 'Trucha fresca cosechada en estanques de aguas frías de montaña, acompañada de patacón gigante y ensalada campestre.',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
    popularIn: 'Finca Truchera El Arcoíris & Donde Jairo',
    priceRange: '$25.000 - $35.000 COP',
    rating: 4.9,
  },
  {
    id: 'cholado-dulces',
    name: 'Cholados y Dulce de Papayuela',
    category: 'Postres',
    description: 'Refrescantes raspados con fruta fresca, leche condensada, maracuyá y mermelada artesanal de papayuela y brevas.',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    popularIn: 'La Casa del Cholado & Heladerías del Centro',
    priceRange: '$6.000 - $12.000 COP',
    rating: 4.7,
  },
];

export const ALOJAMIENTOS_DATA: Accommodation[] = [
  {
    id: 'hospedaje-finca-la-aurora',
    name: 'Finca Agroturística La Aurora',
    type: 'Finca Agroturística',
    location: 'Vereda La Aurora, Anaime',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
    pricePerNight: '$120.000 COP / noche',
    rating: 4.9,
    amenities: ['Desayuno Campesino', 'Wi-Fi', 'Tours de Café', 'Parqueadero', 'Zona de Hamacas'],
    contactWhatsApp: '573025091063',
  },
  {
    id: 'hotel-anaima',
    name: 'Hotel Campestre Anaima Plaza',
    type: 'Hotel',
    location: 'Calle Principal Anaime, Cajamarca',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
    pricePerNight: '$95.000 COP / noche',
    rating: 4.8,
    amenities: ['Agua Caliente', 'Wi-Fi Alta Velocidad', 'Restaurante', 'Recepción 24/7'],
    contactWhatsApp: '573025091063',
  },
  {
    id: 'glamping-bosque-palmas',
    name: 'Glamping & Eco-Lodge Palmas del Machín',
    type: 'Glamping',
    location: 'Vereda Toche, Vía al Machín',
    image: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=600&q=80',
    pricePerNight: '$220.000 COP / noche',
    rating: 4.9,
    amenities: ['Domo Cristalino', 'Fogata Nocturna', 'Tours Guiados', 'Jacuzzi Exterior'],
    contactWhatsApp: '573025091063',
  },
  {
    id: 'hotel-lena-verde',
    name: 'Hotel Leña Verde Urbano',
    type: 'Posada Rural',
    location: 'Centro Histórico de Cajamarca',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
    pricePerNight: '$75.000 COP / noche',
    rating: 4.6,
    amenities: ['Ubicación Central', 'TV Cable', 'Agua Caliente', 'Información Turística'],
    contactWhatsApp: '573025091063',
  },
];

export const TOURS_DATA: TourPackage[] = [
  {
    id: 'tour-palmas-anaime',
    title: 'Expedición Bosque de Palmas & Cañón del Anaime',
    operator: 'Guías Ecológicos del Tolima',
    duration: '1 Día Completo (8:00 AM - 4:00 PM)',
    price: '$85.000 COP / persona',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    category: 'Ecoturismo',
    includes: ['Transporte 4x4', 'Guía Profesional RNT', 'Almuerzo Típico', 'Seguro de Asistencia'],
    contactWhatsApp: '573025091063',
  },
  {
    id: 'tour-senderismo-machin',
    title: 'Trekking Volcán Machín & Pozos Termales',
    operator: 'Aventura Andes Cajamarca',
    duration: '1 Día Completo',
    price: '$110.000 COP / persona',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    category: 'Trekking',
    includes: ['Ingreso a Termales', 'Refrigerio de Arracacha', 'Paseo Guiado', 'Kit de Hidratación'],
    contactWhatsApp: '573025091063',
  },
  {
    id: 'tour-ruta-cafe-agricola',
    title: 'Ruta Agrícola del Café y la Arracacha',
    operator: 'Asociación Agroturística de Anaime',
    duration: 'Medio Día (4 Horas)',
    price: '$60.000 COP / persona',
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80',
    rating: 4.8,
    category: 'Agroturismo',
    includes: ['Taller Interactivo', 'Catación de Café', 'Degustación Gastronómica'],
    contactWhatsApp: '573025091063',
  },
];

export const EVENTOS_DATA: LocalEvent[] = [
  {
    id: 'carnaval-cerdo',
    title: 'Carnaval del Cerdo Cajamarcuno',
    date: '12 - 14 de Noviembre',
    location: 'Plaza Principal de Cajamarca, Tolima',
    description: 'Festividad gastronómica y cultural con juzgamiento de lechona tradicional, música en vivo, comparsas y platos típicos de la región.',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    category: 'Festividad',
  },
  {
    id: 'encuentro-motero',
    title: 'Gran Encuentro Motero en Cajamarca',
    date: '18 - 20 de Agosto',
    location: 'Parque de los Urapanes / Vía Panamericana',
    description: 'Reunión nacional de clubes moteros con caravana por el Cañón del Anaime, exhibiciones acrobáticas y conciertos al aire libre.',
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',
    category: 'Deporte',
  },
  {
    id: 'feria-despensa-agricola',
    title: 'Feria Nacional de la Arracacha y el Agro',
    date: '28 - 30 de Junio',
    location: 'Centro de Acopio Agrícola',
    description: 'Muestra comercial y campesina donde se exhiben los mejores productos agrícolas del Tolima, mercado directo con productores y rueda de negocios.',
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=600&q=80',
    category: 'Feria Agrícola',
  },
];

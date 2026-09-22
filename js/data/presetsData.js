/**
 * CrochetCalc (PuntoPerfecto) - Presets Data
 * Medidas estándar para prendas, gorros, mantas y factores de holgura.
 */

export const GARMENT_CATEGORIES = [
  {
    id: 'tops',
    name: 'Tops, Jerseys y Cárdigans',
    icon: 'fa-shirt',
    description: 'Prendas de vestir para el torso con medidas de contorno de pecho y largo.',
    presets: [
      { id: 'top_xs', name: 'Talla XS (Extra Pequeña)', chestCm: 82, lengthCm: 52, armholeCm: 18, easeRecommended: 5 },
      { id: 'top_s', name: 'Talla S (Pequeña)', chestCm: 90, lengthCm: 55, armholeCm: 19.5, easeRecommended: 5 },
      { id: 'top_m', name: 'Talla M (Mediana)', chestCm: 98, lengthCm: 58, armholeCm: 21, easeRecommended: 6 },
      { id: 'top_l', name: 'Talla L (Grande)', chestCm: 106, lengthCm: 60, armholeCm: 22.5, easeRecommended: 8 },
      { id: 'top_xl', name: 'Talla XL (Extra Grande)', chestCm: 116, lengthCm: 62, armholeCm: 24, easeRecommended: 8 },
      { id: 'top_2xl', name: 'Talla 2XL', chestCm: 126, lengthCm: 64, armholeCm: 25.5, easeRecommended: 10 },
      { id: 'top_3xl', name: 'Talla 3XL', chestCm: 136, lengthCm: 66, armholeCm: 27, easeRecommended: 10 }
    ]
  },
  {
    id: 'hats',
    name: 'Gorros y Beanies',
    icon: 'fa-hat-wizard',
    description: 'Gorros circulares o rectangulares. Incluye cálculo automático del diámetro de corona (Circunferencia ÷ π).',
    presets: [
      { id: 'hat_preemie', name: 'Prematuro (30-33 cm)', headCircCm: 32, heightCm: 12, easeRecommended: -2 },
      { id: 'hat_newborn', name: 'Recién Nacido 0-3M (35-38 cm)', headCircCm: 36, heightCm: 14, easeRecommended: -3 },
      { id: 'hat_baby', name: 'Bebé 6-12M (40-44 cm)', headCircCm: 42, heightCm: 16.5, easeRecommended: -3 },
      { id: 'hat_toddler', name: 'Infantil 1-3 Años (45-48 cm)', headCircCm: 47, heightCm: 18.5, easeRecommended: -3 },
      { id: 'hat_child', name: 'Niño 4-10 Años (49-52 cm)', headCircCm: 50, heightCm: 20, easeRecommended: -3 },
      { id: 'hat_adult_s', name: 'Adulto S / Juvenil (53-55 cm)', headCircCm: 54, heightCm: 21.5, easeRecommended: -4 },
      { id: 'hat_adult_m', name: 'Adulto M Estándar (56-58 cm)', headCircCm: 57, heightCm: 22.5, easeRecommended: -4 },
      { id: 'hat_adult_l', name: 'Adulto L / Holgado (59-62 cm)', headCircCm: 60, heightCm: 24, easeRecommended: -4 }
    ]
  },
  {
    id: 'scarves',
    name: 'Bufandas, Cuellos y Chales',
    icon: 'fa-ribbon',
    description: 'Accesorios para el cuello y hombros en varias longitudes clásicas.',
    presets: [
      { id: 'scarf_child', name: 'Bufanda Infantil', widthCm: 13, lengthCm: 110, easeRecommended: 0 },
      { id: 'scarf_standard', name: 'Bufanda Adulto Estándar', widthCm: 18, lengthCm: 160, easeRecommended: 0 },
      { id: 'scarf_wide', name: 'Bufanda Extra Ancha / Manta', widthCm: 28, lengthCm: 190, easeRecommended: 0 },
      { id: 'cowl_single', name: 'Cuello Simple (1 vuelta)', widthCm: 22, lengthCm: 60, easeRecommended: 0 },
      { id: 'cowl_infinity', name: 'Cuello Infinito (2 vueltas)', widthCm: 25, lengthCm: 140, easeRecommended: 0 },
      { id: 'shawl_triangle', name: 'Chal Triangular', widthCm: 160, lengthCm: 75, easeRecommended: 0 }
    ]
  },
  {
    id: 'blankets',
    name: 'Mantas y Colchas',
    icon: 'fa-bed',
    description: 'Mantas desde apego para bebés hasta cubrecamas King Size.',
    presets: [
      { id: 'blanket_lovey', name: 'Mantita de Apego / Doudou', widthCm: 30, lengthCm: 30, easeRecommended: 0 },
      { id: 'blanket_stroller', name: 'Manta de Cochecito / Cuna Bebé', widthCm: 75, lengthCm: 90, easeRecommended: 0 },
      { id: 'blanket_crib', name: 'Cuna Estándar', widthCm: 90, lengthCm: 120, easeRecommended: 0 },
      { id: 'blanket_throw', name: 'Pie de Cama / Sofá Throw', widthCm: 125, lengthCm: 155, easeRecommended: 0 },
      { id: 'blanket_single', name: 'Cama Individual (Twin)', widthCm: 140, lengthCm: 200, easeRecommended: 0 },
      { id: 'blanket_double', name: 'Cama Matrimonio / Doble', widthCm: 180, lengthCm: 210, easeRecommended: 0 },
      { id: 'blanket_queen', name: 'Cama Queen Size', widthCm: 200, lengthCm: 225, easeRecommended: 0 },
      { id: 'blanket_king', name: 'Cama King Size', widthCm: 230, lengthCm: 240, easeRecommended: 0 }
    ]
  },
  {
    id: 'bags',
    name: 'Bolsos, Carteras y Cestas',
    icon: 'fa-bag-shopping',
    description: 'Accesorios y contenedores para el día a día o almacenamiento.',
    presets: [
      { id: 'bag_clutch', name: 'Monedero / Clutch de Mano', widthCm: 20, lengthCm: 13, easeRecommended: 0 },
      { id: 'bag_tote_s', name: 'Bolsa de Red / Mini Tote', widthCm: 30, lengthCm: 32, easeRecommended: 0 },
      { id: 'bag_tote_m', name: 'Tote Bag Clásico Mercado', widthCm: 38, lengthCm: 42, easeRecommended: 0 },
      { id: 'bag_backpack', name: 'Mochila Saco', widthCm: 32, lengthCm: 38, easeRecommended: 0 },
      { id: 'basket_small', name: 'Cesta Organizadora Pequeña', widthCm: 16, lengthCm: 16, easeRecommended: 0 }
    ]
  }
];

export const EASE_OPTIONS = [
  { id: 'neg_tight', name: 'Muy Ajustada / Elástica (-8 cm)', value: -8, desc: 'Para prendas elásticas que deben ceñirse al cuerpo o gorros firmes.' },
  { id: 'neg_mild', name: 'Ceñida (-4 cm)', value: -4, desc: 'Ligeramente estirada para marcar figura.' },
  { id: 'zero', name: 'A la Medida Exacta (0 cm)', value: 0, desc: 'Cae justo sobre el cuerpo sin apretar ni sobrar.' },
  { id: 'pos_classic', name: 'Holgura Clásica Cómoda (+5 cm)', value: 5, desc: 'El ajuste estándar recomendado para la mayoría de jerséis y chaquetas.' },
  { id: 'pos_relaxed', name: 'Holgura Relajada (+10 cm)', value: 10, desc: 'Cómodo y suelto, ideal para looks casuales.' },
  { id: 'pos_oversized', name: 'Oversized / Maxi (+18 cm)', value: 18, desc: 'Caída amplia, moderna y muy abrigada.' }
];

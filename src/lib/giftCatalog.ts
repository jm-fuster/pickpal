// Catálogos cerrados de las ideas de regalo. Viven aparte de gifts.ts para que
// el panel de ideas no arrastre zod al bundle del cliente; gifts.ts los
// reexporta, así que importarlos desde allí sigue funcionando.

export const GIFT_TYPES = [
  { value: "fisica", label: "Producto físico", icon: "ShoppingBag", description: "Algo que comprar y envolver" },
  { value: "experiencia", label: "Experiencia", icon: "Ticket", description: "Cena, taller, escapada…" },
  { value: "tiempo-juntos", label: "Tiempo juntos", icon: "Heart", description: "Planes sin coste o caseros" },
  { value: "sorprendeme", label: "Sorpréndeme", icon: "Shuffle", description: "Mezcla de los tres tipos" },
] as const;

export type GiftType = (typeof GIFT_TYPES)[number]["value"];

// Catálogo cerrado de claves visuales para la cabecera de las cards de ideas.
// La IA elige una por idea (enum en el schema de generación); el mapeo
// clave → icono lucide + tinte vive en src/lib/giftImages.ts. Espejado en
// ALLOWED_IMAGE_KEYS de convex/validators.ts — si añades una clave,
// actualiza ambos sitios y el mapa de giftImages.ts.
export const GIFT_IMAGE_KEYS = [
  "tecnologia",
  "audio",
  "gaming",
  "fotografia",
  "libros",
  "musica",
  "arte-manualidades",
  "juegos-mesa",
  "papeleria",
  "bricolaje",
  "joyeria-relojes",
  "moda",
  "belleza",
  "cocina",
  "gourmet",
  "vino-bebidas",
  "cafe-te",
  "hogar-decoracion",
  "plantas",
  "mascotas",
  "deporte",
  "aire-libre",
  "viajes",
  "experiencia-gastronomica",
  "experiencia-cultural",
  "experiencia-aventura",
  "experiencia-bienestar",
  "taller-curso",
  "plan-casero",
  "regalo-generico",
] as const;

export type GiftImageKey = (typeof GIFT_IMAGE_KEYS)[number];

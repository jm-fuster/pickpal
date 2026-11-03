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

/**
 * Lo que es cada idea: se compra, se vive o se hace juntos. Es el filtro de
 * encima de las ideas y decide los botones de la tarjeta. Desde el 3-nov-2026
 * cada ocasión tiene una sola tanda mezclada y el tipo ya no se elige antes de
 * generar: elegirlo era decidir justo lo que el usuario venía a resolver, y
 * cada tipo era otra tanda y otra generación del día.
 */
export const IDEA_KINDS = [
  { value: "fisica", label: "Para comprar" },
  { value: "experiencia", label: "Experiencias" },
  { value: "tiempo-juntos", label: "Planes" },
] as const;

export type IdeaKind = (typeof IDEA_KINDS)[number]["value"];

/** La tanda de cada ocasión se guarda con la clave de «Sorpréndeme», que ya era la mezcla. */
export const MIXED_GIFT_TYPE: GiftType = "sorprendeme";

/**
 * Qué es una idea. Las anteriores al 3-nov-2026 no lo dicen: en una tanda de
 * un solo tipo es ese tipo; en «Sorpréndeme», las que traen tiendas se
 * compran y las demás cuentan como experiencia (las dos van a Google).
 */
export function ideaKindOf(
  idea: { giftType?: string; suggestedStores?: readonly string[] },
  batchType: GiftType,
): IdeaKind {
  const known = IDEA_KINDS.find((k) => k.value === idea.giftType);
  if (known) return known.value;
  if (batchType !== "sorprendeme") return batchType;
  return idea.suggestedStores !== undefined ? "fisica" : "experiencia";
}

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

// Límites espejados de src/lib/schemas.ts y src/lib/gifts.ts. La validación
// cliente es UX; estas comprobaciones son la frontera de confianza del servidor.

import { ConvexError } from "convex/values";

const MAX_NAME = 80;
const MAX_NOTES = 1000;
const MAX_INTEREST = 80;
const MAX_INTERESTS = 20;
const MAX_BRAND = 40;
const MAX_BRANDS = 10;
const MAX_LABEL = 40;
const MAX_RELATIONSHIP = 32;
// Convex almacena el presupuesto en céntimos; el form lo expone en euros (0–100.000€).
const MAX_BUDGET_CENTS = 100_000 * 100;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const MAX_SIZE = 20;
const MAX_QUIRK = 200;
const MAX_AVATAR_URL = 512;
const DICEBEAR_PREFIX = "https://api.dicebear.com/";
// El prefijo acota el origen, pero no el resto de la URL, y `avatarUrl` se
// vuelve a pintar dentro de `url('…')` en el correo de avisos (`avatarHtml`
// en convex/emails.ts). Allí `escapeHtml` no basta: convierte `'` en `&#39;`
// y el parser HTML del cliente de correo lo decodifica de vuelta ANTES de que
// el CSS se interprete, así que la comilla reaparece y cierra el `url()`.
// El picker actual no puede generar ninguno: la URL se arma con hexadecimales
// e ids de un catálogo cerrado. El antiguo sí podía —era
// `?seed=${encodeURIComponent(nombre)}`, y `encodeURIComponent` deja pasar
// `'`, `(`, `)`, `!` y `*`—, así que un ser querido llamado «O'Brien» o
// «Ana (mamá)» habría guardado una URL que esta regla rechaza. Comprobado el
// 20-sep-2026 contra producción: ninguna de las 25 fichas. Y aunque apareciera
// una, `people.update` valida solo el parche, no el documento fusionado, así
// que un avatar guardado antes no bloquea las ediciones de esa ficha.
// Defensa en profundidad: `emails.ts` además percent-encodea.
const AVATAR_FORBIDDEN = /['"()<>;\\`\s]|[\u0000-\u001f]/;

// Recomendaciones IA. Espejados de giftRecommendationSchema en src/lib/gifts.ts.
const MAX_IDEA_TITLE = 80;
const MAX_IDEA_DESCRIPTION = 280;
const MAX_IDEA_CATEGORY = 40;
const MAX_IDEA_QUERY = 120;
const MAX_IDEA_PRICE_EUROS = 100_000;
const IDEAS_PER_GENERATION = 9;
// Lista de tiendas soportadas. Fuente de verdad para validación server-side
// tanto en `validateRecommendationIdeas` como en `setMine` (favoritas).
// Espejada en `STORE_IDS` de `src/lib/stores.ts` (cliente) — si añades una
// nueva tienda, actualiza ambos sitios.
export const ALLOWED_STORES = [
  "amazon",
  "elcorteingles",
  "aliexpress",
  "temu",
  "miravia",
  "decathlon",
  "ikea",
  "pccomponentes",
  "mediamarkt",
  "zalando",
  "druni",
] as const;

export type AllowedStore = (typeof ALLOWED_STORES)[number];

const MAX_SUGGESTED_STORES = ALLOWED_STORES.length;

// Foto de stock adjuntada a una idea (Pexels). Solo aceptamos URLs del CDN
// de Pexels — mismo patrón de allowlist por prefijo que DICEBEAR_PREFIX.
const PEXELS_IMAGE_PREFIX = "https://images.pexels.com/";
const PEXELS_PROFILE_PREFIX = "https://www.pexels.com/";
const MAX_IMAGE_URL = 512;
const MAX_PHOTOGRAPHER = 120;

// Tienda oficial de marca resuelta vía Brandfetch. El logo se acota al CDN de
// Brandfetch (allowlist por prefijo, como Pexels/DiceBear) y el dominio se
// valida como hostname. Espejo de `normalizeBrandDomain` en src/lib/brands.ts.
const BRANDFETCH_LOGO_PREFIX = "https://cdn.brandfetch.io/";
const MAX_DOMAIN = 253;
const BRAND_DOMAIN_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/i;
// Espejo de `RESERVED_TLDS` en src/lib/brands.ts — si cambia allí, cambiar
// aquí. La regex de arriba descarta IPs y `localhost`, pero no los sufijos
// internos (`.internal`, `.local`, `.lan`), que sí llegarían a resolverse.
const BRAND_RESERVED_TLDS = new Set([
  "local",
  "localhost",
  "internal",
  "intranet",
  "private",
  "corp",
  "home",
  "lan",
  "alt",
  "onion",
  "test",
  "example",
  "invalid",
]);

type MatchedBrandStore = {
  brand: string;
  domain: string;
  logoUrl?: string;
  // Bool sin riesgo de tamaño/contenido: Convex ya valida el tipo en el
  // ideaValidator; no necesita comprobación adicional aquí.
  supportsSearch?: boolean;
};

function validateMatchedBrandStores(
  stores: MatchedBrandStore[] | undefined,
) {
  if (stores == null || stores.length === 0) return;
  if (stores.length > MAX_BRANDS) {
    throw new ConvexError("Demasiadas tiendas de marca.");
  }
  for (const store of stores) {
    if (store.brand.trim().length === 0 || store.brand.length > MAX_BRAND) {
      throw new ConvexError("Marca de tienda inválida.");
    }
    const domain = store.domain.toLowerCase();
    if (
      domain.length > MAX_DOMAIN ||
      !BRAND_DOMAIN_RE.test(domain) ||
      BRAND_RESERVED_TLDS.has(domain.slice(domain.lastIndexOf(".") + 1))
    ) {
      throw new ConvexError("Dominio de marca inválido.");
    }
    if (
      store.logoUrl !== undefined &&
      (store.logoUrl.length > MAX_IMAGE_URL ||
        !store.logoUrl.startsWith(BRANDFETCH_LOGO_PREFIX))
    ) {
      throw new ConvexError("Logo de marca inválido.");
    }
  }
}

type IdeaImage = {
  url: string;
  photographer?: string;
  photographerUrl?: string;
};

function validateIdeaImage(image: IdeaImage | undefined) {
  if (image === undefined) return;
  if (
    image.url.length > MAX_IMAGE_URL ||
    !image.url.startsWith(PEXELS_IMAGE_PREFIX)
  ) {
    throw new ConvexError("URL de imagen inválida.");
  }
  if (
    image.photographer !== undefined &&
    image.photographer.length > MAX_PHOTOGRAPHER
  ) {
    throw new ConvexError("Atribución de imagen inválida.");
  }
  if (
    image.photographerUrl !== undefined &&
    (image.photographerUrl.length > MAX_IMAGE_URL ||
      !image.photographerUrl.startsWith(PEXELS_PROFILE_PREFIX))
  ) {
    throw new ConvexError("Atribución de imagen inválida.");
  }
}

// Claves del catálogo visual de las cards de ideas. Espejadas de
// GIFT_IMAGE_KEYS en src/lib/gifts.ts (cliente) — si añades una clave,
// actualiza ambos sitios.
export const ALLOWED_IMAGE_KEYS = [
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

const ALLOWED_RELATIONSHIPS = [
  "friend",
  "family",
  "partner",
  "colleague",
  "other",
];

// Espejo de GIFT_TYPES en src/lib/gifts.ts (cliente).
export const ALLOWED_GIFT_TYPES = [
  "fisica",
  "experiencia",
  "tiempo-juntos",
  "sorprendeme",
] as const;

/**
 * Valida la clave (ocasión, tipo) bajo la que se indexan las recomendaciones.
 * Sin esto un cliente que llame directamente a `api.recommendations.upsert`
 * puede crear filas con claves arbitrarias de cualquier tamaño.
 */
export function validateRecommendationKey(
  occasionLabel: string,
  giftType: string,
) {
  const label = occasionLabel.trim();
  if (label.length === 0 || occasionLabel.length > MAX_LABEL) {
    throw new ConvexError("Ocasión inválida.");
  }
  if (!(ALLOWED_GIFT_TYPES as readonly string[]).includes(giftType)) {
    throw new ConvexError("Tipo de regalo inválido.");
  }
}

export function validatePersonInput(input: {
  name?: string;
  relationship?: string;
  interests?: string[];
  favoriteBrands?: string[];
  notes?: string;
  shoeSize?: string;
  clothingSize?: string;
  allergies?: string;
  dislikes?: string;
  avatarUrl?: string;
}) {
  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (trimmed.length === 0) throw new ConvexError("El nombre es obligatorio.");
    if (trimmed.length > MAX_NAME) throw new ConvexError("Nombre demasiado largo.");
  }
  if (input.relationship !== undefined) {
    if (!ALLOWED_RELATIONSHIPS.includes(input.relationship)) {
      throw new ConvexError("Relación inválida.");
    }
    if (input.relationship.length > MAX_RELATIONSHIP) {
      throw new ConvexError("Relación inválida.");
    }
  }
  if (input.notes !== undefined && input.notes.length > MAX_NOTES) {
    throw new ConvexError("Notas demasiado largas.");
  }
  if (input.interests !== undefined) {
    if (input.interests.length > MAX_INTERESTS) {
      throw new ConvexError("Demasiados intereses.");
    }
    for (const interest of input.interests) {
      if (interest.length > MAX_INTEREST) {
        throw new ConvexError("Interés demasiado largo.");
      }
    }
  }
  if (input.favoriteBrands !== undefined) {
    if (input.favoriteBrands.length > MAX_BRANDS) {
      throw new ConvexError("Demasiadas marcas favoritas.");
    }
    for (const brand of input.favoriteBrands) {
      if (brand.trim().length === 0 || brand.length > MAX_BRAND) {
        throw new ConvexError("Marca favorita inválida.");
      }
    }
  }
  if (input.shoeSize !== undefined && input.shoeSize.length > MAX_SIZE) {
    throw new ConvexError("Talla de zapato demasiado larga.");
  }
  if (input.clothingSize !== undefined && input.clothingSize.length > MAX_SIZE) {
    throw new ConvexError("Talla de ropa demasiado larga.");
  }
  if (input.allergies !== undefined && input.allergies.length > MAX_QUIRK) {
    throw new ConvexError("Campo alergias demasiado largo.");
  }
  if (input.dislikes !== undefined && input.dislikes.length > MAX_QUIRK) {
    throw new ConvexError("Campo no le gusta demasiado largo.");
  }
  if (input.avatarUrl !== undefined) {
    if (
      input.avatarUrl.length > MAX_AVATAR_URL ||
      !input.avatarUrl.startsWith(DICEBEAR_PREFIX) ||
      AVATAR_FORBIDDEN.test(input.avatarUrl)
    ) {
      throw new ConvexError("URL de avatar inválida.");
    }
  }
}

export function validateBudget(min?: number, max?: number) {
  for (const [name, value] of [
    ["budgetMin", min],
    ["budgetMax", max],
  ] as const) {
    if (value === undefined) continue;
    if (!Number.isFinite(value) || value < 0 || value > MAX_BUDGET_CENTS) {
      throw new ConvexError(`Presupuesto inválido (${name}).`);
    }
  }
  if (min !== undefined && max !== undefined && min > max) {
    throw new ConvexError("Presupuesto mínimo mayor que el máximo.");
  }
}

type RecommendationIdea = {
  title: string;
  description: string;
  priceMinEuros: number;
  priceMaxEuros: number;
  category: string | string[];
  amazonQuery: string;
  suggestedStores?: string[];
  imageKey?: string;
  image?: IdeaImage;
  matchedBrandStores?: MatchedBrandStore[];
};

/**
 * Valida un lote de ideas devuelto por la IA antes de persistirlo.
 * Cap de tamaños y allowlist de tiendas — protege contra clientes que llamen
 * directamente a `api.recommendations.upsert` saltándose la API route.
 */
export function validateRecommendationIdeas(
  ideas: ReadonlyArray<RecommendationIdea>,
) {
  // 1..9: la generación produce 9 ideas, pero la API descarta títulos
  // duplicados de Gemini antes de persistir (la UI usa el título como clave).
  if (ideas.length === 0 || ideas.length > IDEAS_PER_GENERATION) {
    throw new ConvexError(
      `Una recomendación debe contener entre 1 y ${IDEAS_PER_GENERATION} ideas.`,
    );
  }
  for (const idea of ideas) {
    const title = idea.title.trim();
    if (title.length === 0 || idea.title.length > MAX_IDEA_TITLE) {
      throw new ConvexError("Título de idea inválido.");
    }
    const description = idea.description.trim();
    if (
      description.length === 0 ||
      idea.description.length > MAX_IDEA_DESCRIPTION
    ) {
      throw new ConvexError("Descripción de idea inválida.");
    }
    const categories = Array.isArray(idea.category) ? idea.category : [idea.category];
    if (categories.length === 0 || categories.length > 3 ||
        categories.some(c => c.trim().length === 0 || c.length > MAX_IDEA_CATEGORY)) {
      throw new ConvexError("Categoría de idea inválida.");
    }
    const query = idea.amazonQuery.trim();
    if (query.length === 0 || idea.amazonQuery.length > MAX_IDEA_QUERY) {
      throw new ConvexError("Query de búsqueda inválida.");
    }
    for (const value of [idea.priceMinEuros, idea.priceMaxEuros]) {
      if (
        !Number.isFinite(value) ||
        value < 0 ||
        value > MAX_IDEA_PRICE_EUROS
      ) {
        throw new ConvexError("Precio de idea fuera de rango.");
      }
    }
    if (idea.suggestedStores != null && idea.suggestedStores.length > 0) {
      if (idea.suggestedStores.length > MAX_SUGGESTED_STORES) {
        throw new ConvexError("Cantidad de tiendas sugeridas inválida.");
      }
      const seen = new Set<string>();
      for (const store of idea.suggestedStores) {
        if (!(ALLOWED_STORES as readonly string[]).includes(store)) {
          throw new ConvexError("Tienda sugerida inválida.");
        }
        if (seen.has(store)) {
          throw new ConvexError("Tiendas sugeridas duplicadas.");
        }
        seen.add(store);
      }
    }
    if (
      idea.imageKey !== undefined &&
      !(ALLOWED_IMAGE_KEYS as readonly string[]).includes(idea.imageKey)
    ) {
      throw new ConvexError("Clave de imagen inválida.");
    }
    validateIdeaImage(idea.image);
    validateMatchedBrandStores(idea.matchedBrandStores);
  }
}

export function validateSavedIdeaInput(input: {
  occasionLabel: string;
  title: string;
  description: string;
  priceMinEuros: number;
  priceMaxEuros: number;
  category: string | string[];
  amazonQuery: string;
  suggestedStores?: string[];
  imageKey?: string;
  image?: IdeaImage;
  matchedBrandStores?: MatchedBrandStore[];
}) {
  const title = input.title.trim();
  if (title.length === 0 || input.title.length > MAX_IDEA_TITLE) {
    throw new ConvexError("Título de idea inválido.");
  }
  const description = input.description.trim();
  if (description.length === 0 || input.description.length > MAX_IDEA_DESCRIPTION) {
    throw new ConvexError("Descripción de idea inválida.");
  }
  const label = input.occasionLabel.trim();
  if (label.length === 0 || input.occasionLabel.length > MAX_LABEL) {
    throw new ConvexError("Ocasión inválida.");
  }
  const categories = Array.isArray(input.category) ? input.category : [input.category];
  if (
    categories.length === 0 ||
    categories.length > 3 ||
    categories.some((c) => c.trim().length === 0 || c.length > MAX_IDEA_CATEGORY)
  ) {
    throw new ConvexError("Categoría de idea inválida.");
  }
  const query = input.amazonQuery.trim();
  if (query.length === 0 || input.amazonQuery.length > MAX_IDEA_QUERY) {
    throw new ConvexError("Query de búsqueda inválida.");
  }
  for (const value of [input.priceMinEuros, input.priceMaxEuros]) {
    if (!Number.isFinite(value) || value < 0 || value > MAX_IDEA_PRICE_EUROS) {
      throw new ConvexError("Precio de idea fuera de rango.");
    }
  }
  if (input.suggestedStores != null && input.suggestedStores.length > 0) {
    if (input.suggestedStores.length > MAX_SUGGESTED_STORES) {
      throw new ConvexError("Cantidad de tiendas sugeridas inválida.");
    }
    for (const store of input.suggestedStores) {
      if (!(ALLOWED_STORES as readonly string[]).includes(store)) {
        throw new ConvexError("Tienda sugerida inválida.");
      }
    }
  }
  if (
    input.imageKey !== undefined &&
    !(ALLOWED_IMAGE_KEYS as readonly string[]).includes(input.imageKey)
  ) {
    throw new ConvexError("Clave de imagen inválida.");
  }
  validateIdeaImage(input.image);
  validateMatchedBrandStores(input.matchedBrandStores);
}

export function validateDateInput(input: {
  label?: string;
  year?: number;
  recurring?: boolean;
  budgetMin?: number;
  budgetMax?: number;
}) {
  if (input.label !== undefined) {
    const trimmed = input.label.trim();
    if (trimmed.length === 0) throw new ConvexError("La etiqueta es obligatoria.");
    if (trimmed.length > MAX_LABEL) throw new ConvexError("Etiqueta demasiado larga.");
  }
  if (input.recurring === false && input.year === undefined) {
    throw new ConvexError("Las fechas únicas requieren un año.");
  }
  if (input.year !== undefined) {
    if (
      !Number.isInteger(input.year) ||
      input.year < MIN_YEAR ||
      input.year > MAX_YEAR
    ) {
      throw new ConvexError("Año inválido.");
    }
  }
  validateBudget(input.budgetMin, input.budgetMax);
}

// «Mi lista». Espejados de `listItemSchema` en src/lib/schemas.ts. El título
// comparte tope con `giftName` del historial: «Ya se lo he regalado» lo copia
// tal cual a una entrada nueva.
const MAX_LIST_ITEM_TITLE = 120;
const MAX_LIST_ITEM_NOTE = 500;
const MAX_LIST_ITEM_URL = 2048;

/**
 * El enlace de un elemento de la lista. Lo escribe el usuario y se pinta en el
 * `href` de otro, así que solo pasan `http:` y `https:`: un `javascript:`
 * sería XSS en la cuenta de quien lo abre. El servidor nunca abre la URL
 * (decisión 3 de docs/encargo-lista.md), solo la guarda.
 */
export function isAllowedListItemUrl(url: string): boolean {
  if (url.length === 0 || url.length > MAX_LIST_ITEM_URL) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
    parsed.hostname.length > 0
  );
}

export function validateListItemInput(input: {
  title: string;
  url?: string;
  note?: string;
}) {
  const title = input.title.trim();
  if (title.length === 0) throw new ConvexError("El título es obligatorio.");
  if (title.length > MAX_LIST_ITEM_TITLE) throw new ConvexError("Título demasiado largo.");
  if (input.url !== undefined && !isAllowedListItemUrl(input.url)) {
    throw new ConvexError("El enlace tiene que empezar por http:// o https://.");
  }
  if (input.note !== undefined && input.note.length > MAX_LIST_ITEM_NOTE) {
    throw new ConvexError("Nota demasiado larga.");
  }
}

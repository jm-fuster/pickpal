import { linkHostname } from "./links";

export const STORE_IDS = [
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

export type StoreId = (typeof STORE_IDS)[number];

export const ALL_STORES: readonly StoreId[] = STORE_IDS;

export const STORE_LABELS: Record<StoreId, string> = {
  amazon: "Amazon",
  elcorteingles: "El Corte Inglés",
  aliexpress: "AliExpress",
  temu: "Temu",
  miravia: "Miravia",
  decathlon: "Decathlon",
  ikea: "IKEA",
  pccomponentes: "PcComponentes",
  mediamarkt: "MediaMarkt",
  zalando: "Zalando",
  druni: "Druni",
};

export const STORE_ICONS: Record<StoreId, string> = {
  amazon: "/stores/amazon.png",
  elcorteingles: "/stores/elcorteingles.png",
  aliexpress: "/stores/aliexpress.png",
  temu: "/stores/temu.png",
  miravia: "/stores/miravia.png",
  decathlon: "/stores/decathlon.png",
  ikea: "/stores/ikea.svg",
  pccomponentes: "/stores/pccomponentes.png",
  mediamarkt: "/stores/mediamarkt.png",
  zalando: "/stores/zalando.png",
  druni: "/stores/druni.png",
};

export interface PriceRange {
  /** Precio mínimo en euros (incluido). Recibido tal cual de la idea de la IA. */
  minEuros: number;
  /** Precio máximo en euros (incluido). Recibido tal cual de la idea de la IA. */
  maxEuros: number;
}

/**
 * Ensancha la franja de precio que devuelve la IA antes de pasarla al filtro
 * de la tienda. La IA estima los precios — si la franja real del catálogo
 * está un poco fuera, un filtro estricto deja la página vacía y eso es peor
 * UX que ver resultados ligeramente fuera del rango.
 *
 * Padding: -20% en el mínimo, +30% en el máximo. El bias hacia arriba viene
 * de que es más frecuente que la IA subestime precios reales (modelos
 * conocidos suelen costar más de lo que la IA "recuerda").
 */
export function padPriceRange(
  minEuros: number,
  maxEuros: number,
): { lowEuros: number; highEuros: number } {
  if (
    !Number.isFinite(minEuros) ||
    !Number.isFinite(maxEuros) ||
    minEuros < 0 ||
    maxEuros < minEuros
  ) {
    return { lowEuros: 0, highEuros: 0 };
  }
  const low = Math.max(0, Math.floor(minEuros * 0.8));
  const high = Math.max(low + 1, Math.ceil(maxEuros * 1.3));
  return { lowEuros: low, highEuros: high };
}

/**
 * Lista de tiendas donde el filtro de precio en la URL es fiable. Solo
 * estas reciben los parámetros `low/high-price` o `minPrice/maxPrice` —
 * el resto se quedan con la query sin filtro porque su sintaxis es
 * inestable (Decathlon redirige a home, Miravia/IKEA filtran vía JS,
 * El Corte Inglés usa filtros en el path).
 */
export const STORES_WITH_PRICE_FILTER: readonly StoreId[] = [
  "amazon",
  "aliexpress",
];

export function generateStoreSearchUrl(
  store: StoreId,
  query: string,
  priceRange?: PriceRange,
): string {
  const q = encodeURIComponent(query);
  const padded =
    priceRange && STORES_WITH_PRICE_FILTER.includes(store)
      ? padPriceRange(priceRange.minEuros, priceRange.maxEuros)
      : null;

  switch (store) {
    case "amazon": {
      const base = `https://www.amazon.es/s?k=${q}`;
      if (!padded) return base;
      return `${base}&low-price=${padded.lowEuros}&high-price=${padded.highEuros}`;
    }
    case "elcorteingles":
      return `https://www.elcorteingles.es/search/?s=${q}`;
    case "aliexpress": {
      const base = `https://es.aliexpress.com/w/wholesale-${q}.html`;
      if (!padded) return base;
      return `${base}?minPrice=${padded.lowEuros}&maxPrice=${padded.highEuros}`;
    }
    case "miravia":
      return `https://www.miravia.es/search?q=${q}`;
    case "temu":
      // Temu usa `search_key` y la URL termina en `.html`. Con `q` redirige a home.
      return `https://www.temu.com/search_result.html?search_key=${q}`;
    case "decathlon":
      // Decathlon usa Endeca/ATG: el parámetro de búsqueda es `Ntt`, no `q`.
      // Con `q` el sitio redirige a la home porque no reconoce el parámetro.
      return `https://www.decathlon.es/es/search?Ntt=${q}`;
    case "ikea":
      return `https://www.ikea.com/es/es/search/?q=${q}`;
    case "pccomponentes":
      return `https://www.pccomponentes.com/search/?query=${q}`;
    case "mediamarkt":
      return `https://www.mediamarkt.es/es/search.html?query=${q}`;
    case "zalando":
      return `https://www.zalando.es/catalog/?q=${q}`;
    case "druni":
      // Druni usa Magento (catalogsearch/result/?q=).
      return `https://www.druni.es/catalogsearch/result/?q=${q}`;
  }
}

export function isStoreId(s: string): s is StoreId {
  return (ALL_STORES as readonly string[]).includes(s);
}

export function sanitizeFavoriteStores(stores: readonly string[]): StoreId[] {
  const seen = new Set<StoreId>();
  for (const s of stores) {
    if (isStoreId(s)) seen.add(s);
  }
  return ALL_STORES.filter((s) => seen.has(s));
}

/**
 * Decide qué tiendas mostrar en una tarjeta de regalo físico, dada la lista
 * de tiendas favoritas del usuario y las tiendas sugeridas por la IA.
 *
 * - Si la IA no sugiere nada (campo ausente o vacío), mostramos todas las
 *   favoritas (comportamiento previo a v2).
 * - Si la IA sugiere algo y hay intersección con las favoritas, mostramos
 *   solo esa intersección.
 * - Si la IA sugiere algo pero ninguna favorita encaja, hacemos fallback
 *   a todas las favoritas y marcamos `isFallback: true` para que la UI
 *   pueda indicar que es una búsqueda genérica.
 */
export function pickEffectiveStores(
  favoriteStores: readonly StoreId[],
  suggestedStores: readonly string[] | undefined,
): { stores: StoreId[]; isFallback: boolean } {
  const sanitizedSuggested = suggestedStores
    ? sanitizeFavoriteStores(suggestedStores)
    : [];
  if (sanitizedSuggested.length === 0) {
    return { stores: [...favoriteStores], isFallback: false };
  }
  const intersection = favoriteStores.filter((s) =>
    sanitizedSuggested.includes(s),
  );
  if (intersection.length > 0) {
    return { stores: intersection, isFallback: false };
  }
  return { stores: [...favoriteStores], isFallback: true };
}

/**
 * Dominios de cada tienda, para reconocer el enlace de un elemento de «Mi
 * lista» y enseñar su logo (decisión 3 de docs/encargo-lista.md). Se resuelve
 * en el navegador, sin pedir nada a la tienda. Cuenta el dominio exacto y sus
 * subdominios (`es.aliexpress.com`), no un dominio que solo lo contiene
 * (`amazon.es.otra-cosa.com`).
 */
export const STORE_DOMAINS: Record<StoreId, readonly string[]> = {
  amazon: [
    "amazon.es",
    "amazon.com",
    "amazon.de",
    "amazon.fr",
    "amazon.it",
    "amazon.co.uk",
    // Enlaces cortos que genera el botón «Compartir» de Amazon.
    "amzn.eu",
    "amzn.to",
  ],
  elcorteingles: ["elcorteingles.es"],
  aliexpress: ["aliexpress.com", "aliexpress.es"],
  temu: ["temu.com"],
  miravia: ["miravia.es"],
  decathlon: ["decathlon.es", "decathlon.com"],
  ikea: ["ikea.com", "ikea.es"],
  pccomponentes: ["pccomponentes.com"],
  mediamarkt: ["mediamarkt.es"],
  zalando: ["zalando.es"],
  druni: ["druni.es"],
};

export function storeIdForUrl(url: string): StoreId | null {
  const host = linkHostname(url);
  if (!host) return null;
  for (const id of STORE_IDS) {
    if (STORE_DOMAINS[id].some((d) => host === d || host.endsWith(`.${d}`))) {
      return id;
    }
  }
  return null;
}

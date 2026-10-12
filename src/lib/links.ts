import { STORE_DOMAINS } from "./stores";

/**
 * Enlaces que escribe el usuario en «Mi lista» (docs/encargo-lista.md). Nada
 * de aquí hace peticiones: el servidor nunca abre estas URLs (decisión 3) y el
 * navegador solo las lee para enseñar el dominio y, si es una tienda conocida,
 * su logo. La comprobación de `http:`/`https:` se repite en el servidor
 * (`isAllowedListItemUrl` en convex/validators.ts), que es la que cuenta.
 */

const MAX_LINK_LENGTH = 2048;

/**
 * Lo que se escribe en el campo «Enlace», listo para guardar. Si llega sin
 * protocolo («amazon.es/dp/…», que es como se copia de muchas barras de
 * direcciones) se le pone `https://`. Vacío → `undefined`.
 */
export function normalizeLinkInput(raw: string | undefined): string | undefined {
  const s = raw?.trim() ?? "";
  if (s.length === 0) return undefined;
  return /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
}

/** ¿Es un enlace `http:` o `https:` con dominio? Espejo del servidor. */
export function isHttpUrl(url: string): boolean {
  if (url.length === 0 || url.length > MAX_LINK_LENGTH) return false;
  try {
    const u = new URL(url);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * El dominio que se enseña junto al enlace, en minúsculas y sin `www.`.
 * `null` si no es un enlace http(s). Un dominio con caracteres que imitan a
 * otros sale en punycode (`xn--…`), que es justo lo que conviene ver antes de
 * abrirlo.
 */
export function linkHostname(url: string): string | null {
  if (!isHttpUrl(url)) return null;
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

// ─── Limpieza de lo que se pega (fase 1 de «Pega tu lista») ─────────────────
//
// Desenvolver, sugerir un título y recortar el rastreo, todo leyendo la
// cadena: ni se abre el enlace ni se resuelven los cortos (`amzn.to` se queda
// como está, porque expandirlo sería abrirlo). Es una cortesía del navegador;
// el servidor sigue validando con `validateListItemInput`.

export type PreparedLink = {
  /** El enlace limpio, o `undefined` si no es http(s) o lleva a wishlist.com. */
  url?: string;
  /** Sacado de la ruta ya desenvuelta y antes de recortarla. */
  suggestedTitle?: string;
  /** El enlace limpio no es lo que se pegó: se quitó rastreo o un envoltorio. */
  shortened: boolean;
  /** Lleva a wishlist.com y no a la tienda: no se guarda. */
  wishlistCom?: "item" | "list";
  /** Amazon de otro país; `amzn.to` y `amzn.eu` no cuentan, no se sabe adónde van. */
  foreignAmazon: boolean;
};

const MAX_UNWRAP_ROUNDS = 3;
const MAX_SUGGESTED_TITLE = 119;

// Los enlaces cortos de Amazon no se tocan: no llevan rastreo en la cadena y
// su destino solo se sabe abriéndolos.
const AMAZON_SHORT_DOMAINS = new Set(["amzn.to", "amzn.eu"]);

// Rastreo que se quita en cualquier tienda. `tag` no está: fuera de Amazon
// puede ser parte de la dirección (una etiqueta de la tienda, no de afiliado).
const TRACKING_KEYS = new Set(["gclid", "fbclid", "msclkid", "mc_cid", "mc_eid"]);

// Solo en Amazon: afiliado (`tag`, `linkCode`, `ascsubtag`…), de dónde se
// pulsó (`ref`, `pd_rd_*`, `pf_rd_*`) y la búsqueda que llevó hasta allí.
const AMAZON_TRACKING_KEYS = new Set([
  "tag",
  "ref",
  "ref_",
  "psc",
  "th",
  "linkcode",
  "linkid",
  "camp",
  "ascsubtag",
  "smid",
  "qid",
  "sr",
  "keywords",
  "crid",
  "sprefix",
  "dib",
  "dib_tag",
  "content-id",
]);

const AMAZON_ASIN = /\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})(?=\/|$)/i;

// Dominios de nivel superior que se aceptan en un enlace pegado sin protocolo
// («tienda.es», «amzn.to/…»). Sin esta lista, «Node.js» o «Dr.House/T1» en
// «Qué es» pasarían a «Enlace». Con `https://` delante vale cualquiera.
const COMMON_TLDS = new Set([
  "com", "es", "net", "org", "eu", "info", "io", "co", "uk", "de", "fr", "it",
  "pt", "nl", "be", "ch", "at", "us", "ca", "mx", "ar", "cl", "pe", "uy", "br",
  "shop", "store", "app", "dev", "me", "tv", "cat", "gal", "eus", "online",
  "site", "biz", "xyz", "ai", "club", "art", "to",
]);

function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function parseHttp(url: string): URL | null {
  return isHttpUrl(url) ? new URL(url) : null;
}

function isWishlistComHost(host: string): boolean {
  return hostIs(host, "wishlist.com");
}

/**
 * Amazon como tienda: los dominios de `STORE_DOMAINS.amazon` menos los cortos.
 * Se lee dentro de la función y no al cargar el módulo porque stores.ts
 * importa este archivo: si se carga antes, `STORE_DOMAINS` aún no existe.
 */
function isAmazonStoreHost(host: string): boolean {
  return STORE_DOMAINS.amazon.some((d) => !AMAZON_SHORT_DOMAINS.has(d) && hostIs(host, d));
}

/** Un parámetro de la consulta, sin distinguir mayúsculas en la clave. */
function queryParam(u: URL, key: string): string | null {
  for (const [k, value] of u.searchParams) {
    if (k.toLowerCase() === key) return value;
  }
  return null;
}

function unwrapOnce(url: string): string | null {
  const u = parseHttp(url);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  let target: string | null = null;
  if (isWishlistComHost(host) && /^\/extrd(?:\/|$)/i.test(u.pathname)) {
    target = queryParam(u, "wlexurl");
  } else if (host === "rd.bizrate.com") {
    target = queryParam(u, "url");
  }
  if (!target) return null;
  // Algunos redirectores codifican el destino dos veces.
  if (/^https?%3a/i.test(target)) {
    try {
      target = decodeURIComponent(target);
    } catch {
      return null;
    }
  }
  const next = normalizeLinkInput(target);
  // Un `javascript:` dentro de `wlexurl` sería XSS en la cuenta de quien lo
  // abra: si el destino no es http(s), el envoltorio se queda como estaba.
  return next !== undefined && isHttpUrl(next) ? next : null;
}

/**
 * El destino real de un enlace envuelto: `/extrd?wlexurl=…` de wishlist.com
 * (lo que se copia con el botón derecho de un elemento de su lista) y
 * `rd.bizrate.com?url=…`, el redirector al que lleva. Hasta tres vueltas, por
 * si un envoltorio lleva a otro. Lo que no es un envoltorio sale igual, y
 * nunca sale algo que no sea http(s) si no lo era ya lo que entró.
 */
export function unwrapLink(url: string): string {
  let current = url;
  for (let round = 0; round < MAX_UNWRAP_ROUNDS; round++) {
    const inner = unwrapOnce(current);
    if (inner === null) break;
    current = inner;
  }
  return current;
}

function paramKey(part: string): string {
  const raw = part.split("=", 1)[0].replace(/\+/g, " ");
  try {
    return decodeURIComponent(raw).toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

/**
 * Quita de la consulta las claves que `drop` señala y deja el resto con su
 * codificación original (`URLSearchParams` la reescribiría). ¿Ha cambiado algo?
 */
function removeParams(u: URL, drop: (key: string) => boolean): boolean {
  if (u.search.length <= 1) return false;
  const parts = u.search.slice(1).split("&");
  const kept = parts.filter((part) => part.length > 0 && !drop(paramKey(part)));
  if (kept.length === parts.length) return false;
  u.search = kept.length > 0 ? `?${kept.join("&")}` : "";
  return true;
}

function isTrackingKey(key: string): boolean {
  return key.startsWith("utm_") || TRACKING_KEYS.has(key);
}

function isAmazonTrackingKey(key: string): boolean {
  return (
    isTrackingKey(key) ||
    AMAZON_TRACKING_KEYS.has(key) ||
    key.startsWith("creative") ||
    key.startsWith("pd_rd_") ||
    key.startsWith("pf_rd_")
  );
}

/**
 * El enlace sin rastreo. En Amazon queda `https://{host}/dp/{ASIN}` si se
 * encuentra el producto; si no, se le quitan el afiliado, el «de dónde vienes»
 * y el fragmento. En cualquier otra tienda solo se quitan `utm_*`, `gclid`,
 * `fbclid`, `msclkid` y los de Mailchimp. PickPal no añade ninguna etiqueta.
 * Si no hay nada que quitar, sale la misma cadena.
 */
export function canonicalizeLink(url: string): string {
  const u = parseHttp(url);
  if (!u) return url;
  const host = u.hostname.toLowerCase();
  const amazon = isAmazonStoreHost(host);
  if (amazon) {
    const asin = AMAZON_ASIN.exec(u.pathname)?.[1];
    if (asin) return `https://${host}/dp/${asin.toUpperCase()}`;
  }
  let changed = removeParams(u, amazon ? isAmazonTrackingKey : isTrackingKey);
  if (amazon && u.hash.length > 0) {
    u.hash = "";
    changed = true;
  }
  return changed ? u.toString() : url;
}

// Tramos de la ruta que nunca son un nombre de producto.
const NOISE_SEGMENTS = new Set([
  "p", "product", "products", "producto", "productos", "item", "items", "dp",
  "gp", "d", "aw", "shop", "tienda", "store", "catalog", "catalogo", "catálogo",
  "articulo", "artículo", "articulos", "artículos", "art", "ref", "buy",
  "comprar", "detail", "details", "detalle", "view", "ver", "index", "home",
  "inicio", "s", "search", "buscar", "w", "wish", "l", "ls", "list", "lista",
  "amp", "m", "mobile",
]);

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Un identificador, no una palabra: «123456», «wh1000xm5», «80275887». */
function isIdToken(token: string): boolean {
  if (/^\d+$/.test(token)) return true;
  if (!/^[a-z0-9]+$/i.test(token) || !/[a-z]/i.test(token)) return false;
  return (token.match(/\d/g)?.length ?? 0) >= 2;
}

/**
 * Las palabras de un tramo de la ruta, sin extensión ni identificadores al
 * principio o al final: «zapatilla-trail-xt6-123456.html» → zapatilla, trail,
 * xt6. Vacío si el tramo no es un nombre.
 */
function slugWords(segment: string): string[] {
  const lower = segment.toLowerCase();
  if (segment.includes("=") || NOISE_SEGMENTS.has(lower)) return [];
  // Idioma y país: «es», «es-es», «en_GB».
  if (/^[a-z]{2}(?:[-_][a-z]{2})?$/i.test(segment)) return [];
  const base = segment.replace(/\.(?:html?|php|aspx?|jsp)$/i, "");
  const words = base.split(/[\s_+-]+/).filter((w) => w.length > 0);
  while (words.length > 0 && isIdToken(words[words.length - 1])) words.pop();
  while (words.length > 0 && /^\d+$/.test(words[0])) words.shift();
  return words.some((w) => /\p{L}/u.test(w)) ? words : [];
}

/** Recorta por unidades UTF-16 (lo que cuenta el servidor) sin partir un emoji. */
function cutToLength(text: string, max: number): string {
  if (text.length <= max) return text;
  let out = "";
  for (const char of graphemes(text)) {
    if (out.length + char.length > max) break;
    out += char;
  }
  return out.trimEnd();
}

function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    return Array.from(new Intl.Segmenter("es", { granularity: "grapheme" }).segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

function finishTitle(words: string[]): string | undefined {
  const joined = words.join(" ").replace(/\s+/g, " ").trim();
  if (joined.length === 0) return undefined;
  const [first, ...rest] = Array.from(joined);
  return cutToLength(first.toLocaleUpperCase("es") + rest.join(""), MAX_SUGGESTED_TITLE);
}

/**
 * Un título sacado de la dirección, para proponerlo si «Qué es» está vacío.
 * En Amazon es el tramo antes de `/dp/` («Zapatillas-Running-Hombre-Negro»);
 * en el resto, el último tramo que no es ruido, si tiene al menos dos
 * palabras. `undefined` si solo hay identificadores.
 */
export function suggestTitleFromUrl(url: string): string | undefined {
  const u = parseHttp(url);
  if (!u) return undefined;
  const host = u.hostname.toLowerCase();
  const segments = u.pathname
    .split("/")
    .map(decodeSegment)
    .filter((s) => s.trim().length > 0);

  if (isAmazonStoreHost(host)) {
    const at = segments.findIndex(
      (s, i) =>
        s.toLowerCase() === "dp" ||
        (s.toLowerCase() === "gp" && segments[i + 1]?.toLowerCase() === "product"),
    );
    return at > 0 ? finishTitle(slugWords(segments[at - 1])) : undefined;
  }

  for (let i = segments.length - 1; i >= 0; i--) {
    const words = slugWords(segments[i]);
    // Un tramo que es solo ruido se salta; el primero que no lo es decide.
    if (words.length === 0) continue;
    return words.length >= 2 ? finishTitle(words) : undefined;
  }
  return undefined;
}

// Rutas de un elemento de wishlist.com. `/extrd` es su salida hacia la tienda:
// si llega aquí es porque no se pudo desenvolver, y sigue siendo un elemento.
const WISHLIST_COM_ITEM_PATH = /^\/(?:w|ws|wish|extrd)(?:\/|$)|^\/shop\/products?(?:\/|$)/i;

/**
 * ¿Lleva a wishlist.com? `"item"` para un elemento (`/w/`, `/ws/`, `/wish/`,
 * `/shop/product`), `"list"` para todo lo demás de ese dominio (listas,
 * perfiles, `/@usuario`, URL propias en la raíz) y `null` si es otro dominio.
 */
export function wishlistComLinkKind(url: string): "item" | "list" | null {
  const u = parseHttp(normalizeLinkInput(url) ?? "");
  if (!u || !isWishlistComHost(u.hostname.toLowerCase())) return null;
  return WISHLIST_COM_ITEM_PATH.test(u.pathname) ? "item" : "list";
}

/**
 * ¿Es un enlace, y no una palabra con un punto? Para mover a «Enlace» lo que
 * se pega en «Qué es». Una sola palabra, con dominio de varios tramos que
 * acaba en letras; sin protocolo, además, tiene que empezar por `www.` o
 * acabar en un dominio común («tienda.es» sí, «Node.js» no).
 */
export function looksLikeUrl(text: string): boolean {
  const s = text.trim();
  if (s.length === 0 || /\s/.test(s)) return false;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(s);
  // Una arroba antes de la ruta es un correo; después («/@usuario») no.
  if (!hasScheme && /^[^/?#]*@/.test(s)) return false;
  const link = normalizeLinkInput(s);
  if (link === undefined || !isHttpUrl(link)) return false;
  const labels = new URL(link).hostname.toLowerCase().split(".");
  if (labels.length < 2 || labels.some((l) => l.length === 0)) return false;
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/.test(tld)) return false;
  return hasScheme || /^www\./i.test(s) || COMMON_TLDS.has(tld);
}

/**
 * Lo que se pega en «Enlace» o en una lista, listo para guardar: se
 * desenvuelve, se saca el título de la ruta, se recorta el rastreo y se
 * vuelve a comprobar que es http(s). Lo que no pasa se queda sin enlace.
 */
export function prepareListLink(raw: string): PreparedLink {
  const normalized = normalizeLinkInput(raw);
  if (normalized === undefined) return { shortened: false, foreignAmazon: false };
  const unwrapped = unwrapLink(normalized);
  const wishlistCom = wishlistComLinkKind(unwrapped);
  if (wishlistCom) return { wishlistCom, shortened: false, foreignAmazon: false };
  if (!isHttpUrl(unwrapped)) return { shortened: false, foreignAmazon: false };

  const suggestedTitle = suggestTitleFromUrl(unwrapped);
  const canonical = canonicalizeLink(unwrapped);
  if (!isHttpUrl(canonical)) return { shortened: false, foreignAmazon: false };

  const host = new URL(canonical).hostname.toLowerCase();
  const prepared: PreparedLink = {
    url: canonical,
    shortened: canonical !== normalized,
    foreignAmazon: isAmazonStoreHost(host) && !hostIs(host, "amazon.es"),
  };
  if (suggestedTitle !== undefined) prepared.suggestedTitle = suggestedTitle;
  return prepared;
}

import { isHttpUrl, prepareListLink } from "./links";
import { clampTitle } from "./importers/pastedList";
import { parsePriceCents } from "./price";

export { parsePriceCents };

/**
 * «Apuntar en PickPal»: un marcador del navegador que, en la ficha de un
 * producto, abre el formulario de «Mi lista» ya relleno. No se guarda nada
 * hasta que la dueña pulsa «Apuntar».
 *
 * El servidor de PickPal nunca abre la URL de la tienda (decisión 3, y es una
 * promesa pública), así que todo se lee en el navegador de quien lo usa, en la
 * página que ya está mirando. El marcador lee tres cosas de esa página (título,
 * enlace y precio) y las manda en el fragmento (`#t=…&u=…&p=…`), que el
 * navegador no envía a ningún servidor. La página de PickPal las vuelve a leer
 * con `readBookmarkletFragment` como lo que son: texto que cualquiera puede
 * escribir a mano en una dirección.
 */

/**
 * El código del marcador, una función ES2017 sin dependencias:
 * `function (d, l, o) { … return url; }`, con `d` el documento, `l` la
 * dirección y `o` el origen de PickPal. Va escrito para meterse en un
 * `javascript:`: punto y coma explícitos, sin comentarios dentro, sin «%» y en
 * una sola línea. Del DOM usa solo `querySelector`, `querySelectorAll`,
 * `getAttribute`, `textContent` y `title`, para que los tests puedan fingirlo.
 *
 * - Título: el `name` del Product del JSON-LD; si no, `og:title`,
 *   `twitter:title` o el título de la pestaña. Hasta 300 caracteres; el
 *   recorte de verdad lo hace `readBookmarkletFragment`.
 * - Enlace: el canónico, si no `og:url`, si no la dirección de la pestaña.
 *   Solo http(s).
 * - Precio: del JSON-LD (Product o ProductGroup, sus `offers` y sus
 *   variantes) solo si la moneda es EUR; si no, de `product:price:amount`
 *   cuando `product:price:currency` es EUR, o falta y la tienda es `.es`.
 *   Nunca se adivina del texto de la página: mejor sin precio que con uno mal.
 */
const SOURCE_LINES = String.raw`function (d, l, o) {
  var A = Array.isArray, P = /(^|[\/:#])Product(Group)?$/, g = [], q, i, j, s, x, t = "", p = "", u = "";
  function c(v) { return typeof v == "string" ? v.replace(/\s+/g, " ").trim() : ""; }
  function m(k) {
    var e = d.querySelector('meta[property="' + k + '"],meta[name="' + k + '"]');
    return e ? c(e.getAttribute("content")) : "";
  }
  function n(v) {
    if (typeof v == "number") return v > 0 && v < 1e7 ? v.toFixed(2) : "";
    v = c(v).replace(/\s/g, "");
    return /^\d[\d.,]{0,14}$/.test(v) ? v : "";
  }
  function eur(v) { return c(v).toUpperCase() == "EUR"; }
  function f(v) {
    var k, r, z;
    if (A(v)) {
      for (k = 0; k < v.length; k++) { r = f(v[k]); if (r) return r; }
      return "";
    }
    if (!v || typeof v != "object") return "";
    z = A(v.priceSpecification) ? v.priceSpecification[0] : v.priceSpecification;
    z = z && typeof z == "object" ? z : {};
    r = v.lowPrice != null ? v.lowPrice : v.price != null ? v.price : z.price;
    if (eur(v.priceCurrency || z.priceCurrency)) { r = n(r); if (r) return r; }
    return v.offers ? f(v.offers) : "";
  }
  function y(v) {
    var k = A(v["@type"]) ? v["@type"] : [v["@type"]];
    for (var b = 0; b < k.length; b++) if (typeof k[b] == "string" && P.test(k[b])) return true;
    return false;
  }
  function w(v, h) {
    var k;
    if (h > 9 || !v || typeof v != "object") return;
    if (A(v)) { for (k = 0; k < v.length; k++) w(v[k], h + 1); return; }
    if (y(v)) g.push(v);
    if (v["@graph"]) w(v["@graph"], h + 1);
  }
  function h(v) {
    v = c(v);
    if (!v) return "";
    try { v = new URL(v, l.href); return /^https?:$/.test(v.protocol) ? v.href : ""; } catch (e) { return ""; }
  }
  q = d.querySelectorAll('script[type="application/ld+json"]');
  for (i = 0; i < q.length; i++) { try { w(JSON.parse(q[i].textContent), 0); } catch (e) { } }
  for (i = 0; i < g.length; i++) if (c(g[i].name)) { x = g[i]; break; }
  x = x || g[0];
  if (x) {
    t = c(x.name);
    p = f(x.offers);
    s = A(x.hasVariant) ? x.hasVariant : x.hasVariant ? [x.hasVariant] : [];
    for (j = 0; j < s.length && !p; j++) p = (s[j] && f(s[j].offers)) || "";
  }
  t = (t || m("og:title") || m("twitter:title") || c(d.title)).slice(0, 300);
  if (!p) {
    s = m("product:price:currency");
    if (eur(s) || (!s && /\.es$/i.test(l.hostname))) p = n(m("product:price:amount"));
  }
  x = d.querySelector('link[rel="canonical"]');
  u = (x && h(x.getAttribute("href"))) || h(m("og:url")) || l.href;
  s = new URLSearchParams();
  if (t) s.set("t", t);
  s.set("u", u);
  if (p) s.set("p", p);
  return o + "/mi-lista/apuntar#" + s.toString();
}`;

/** En una línea: un marcador con saltos de línea no funciona en todos los navegadores. */
export const BOOKMARKLET_SOURCE: string = SOURCE_LINES.replace(/\s*\n\s*/g, " ");

/**
 * El `href` del enlace que se arrastra a la barra de marcadores. El origen se
 * pasa al pintar la página (hay despliegues de vista previa), nunca va fijo.
 * Todo va codificado: el navegador descodifica el `javascript:` antes de
 * ejecutarlo, y así ni «#» ni las comillas ni los espacios rompen el marcador.
 */
export function bookmarkletHref(origin: string): string {
  const url = new URL(origin);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("El origen del marcador tiene que ser http(s).");
  }
  const code = `(function(){location.href=(${BOOKMARKLET_SOURCE})(document,location,${JSON.stringify(url.origin)});})();`;
  return `javascript:${encodeURIComponent(code)}`;
}

// ─── Lo que llega a /mi-lista/apuntar ───────────────────────────────────────

export type BookmarkletFragment = {
  /** Limpio y recortado como lo recorta el analizador de listas. */
  title?: string;
  /** Solo http(s), desenvuelto y sin rastreo (`prepareListLink`). */
  url?: string;
  /** Céntimos de euro, entre 1 y 1.000.000. */
  priceCents?: number;
};

// Un fragmento legítimo no pasa de unos pocos miles de caracteres (300 de
// título y 2048 de enlace, codificados). Lo que es mucho más largo no se lee.
const MAX_FRAGMENT = 16_000;


/**
 * Lee `#t=…&u=…&p=…` sin fiarse de nada: cualquiera puede escribir esa
 * dirección. El título se limpia y se recorta a 120 unidades UTF-16 sin
 * partir un emoji; el enlace solo vale si es http(s) y cabe en 2048, y pasa
 * por `prepareListLink`; el precio, si `parsePriceCents` lo entiende. Lo que
 * no vale se omite y los parámetros desconocidos se ignoran.
 */
export function readBookmarkletFragment(hash: string): BookmarkletFragment {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (raw.length === 0 || raw.length > MAX_FRAGMENT) return {};
  const params = new URLSearchParams(raw);
  const out: BookmarkletFragment = {};

  const title = clampTitle(params.get("t") ?? "").title;
  if (title.length > 0) out.title = title;

  const link = (params.get("u") ?? "").trim();
  if (isHttpUrl(link)) {
    const url = prepareListLink(link).url;
    if (url !== undefined) out.url = url;
  }

  const price = params.get("p");
  if (price !== null) {
    const cents = parsePriceCents(price);
    if (cents !== undefined) out.priceCents = cents;
  }
  return out;
}

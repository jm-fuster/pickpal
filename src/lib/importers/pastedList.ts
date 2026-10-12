import { looksLikeUrl, prepareListLink, type PreparedLink } from "../links";
import { storeIdForUrl } from "../stores";

/**
 * «Pegar una lista» (fase 1 de «Pega tu lista»): convierte el texto que la
 * dueña pega (una nota, un chat de WhatsApp, la copia de una web o de otra
 * app de listas) en filas para la vista previa. Todo pasa en el navegador:
 * nada de red, nada de IA. Lo que sale de aquí no es de fiar para el servidor,
 * que vuelve a validar cada fila con `validateListItemInput`.
 *
 * La regla que manda sobre todas: el estado de reserva de la otra app nunca
 * cambia el resultado (decisión 7). Una palabra como «Reservado» o «3
 * received» se quita y la fila se queda igual que sin ella; si filtrásemos lo
 * reservado, la dueña sabría qué le han comprado. El test diferencial de
 * pastedList.test.ts lo comprueba con cada formato.
 */

export const MAX_PASTE_CHARS = 200_000;
export const MAX_PASTE_LINES = 1_000;
/** Tope del título en el servidor, en unidades UTF-16 (`string.length`). */
export const MAX_TITLE = 120;
const MAX_NOTE = 500;

export type PastedRow = {
  /** Limpio y recortado; vacío solo con `hint: "needs-name"`. */
  title: string;
  url?: string;
  /** Solo de las columnas de texto de más de una hoja de cálculo. */
  note?: string;
  truncated: boolean;
  /** Había un enlace a un elemento de wishlist.com y no se ha guardado. */
  droppedWishlistLink: boolean;
  /** Quién lo escribió, si lo pegado es un chat de WhatsApp. */
  author?: string;
  hint?: "looks-like-text" | "other-author" | "needs-name";
};

export type PastedList = {
  rows: PastedRow[];
  kind: "list" | "empty" | "noisy" | "whole-list-link" | "too-large";
  /** Había algún enlace a wishlist.com (sin contar los de estado). */
  fromWishlistCom: boolean;
};

// ─── Texto ───────────────────────────────────────────────────────────────────

// Marcas de dirección (WhatsApp las mete delante de cada adjunto), espacios de
// ancho cero y el BOM.
const INVISIBLE = /[​‌‎‏‪-‮⁦-⁩﻿]/g;
// U+200D también, salvo cuando une dos emojis («👩‍👧»): ahí es parte del emoji.
const STRAY_ZWJ =
  /(?<!\p{Extended_Pictographic}[️\u{1F3FB}-\u{1F3FF}]?)‍|‍(?!\p{Extended_Pictographic})/gu;

/**
 * Saltos de línea de Windows y de Mac antiguo, caracteres invisibles, espacios
 * duros (WhatsApp pone U+202F entre la hora y «a. m.») y forma NFC.
 */
export function normalizePastedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLE, "")
    .replace(STRAY_ZWJ, "")
    .replace(/[  ]/g, " ")
    .normalize("NFC");
}

function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    return Array.from(new Intl.Segmenter("es", { granularity: "grapheme" }).segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/**
 * Recorta a `max` unidades UTF-16, que es lo que cuenta el servidor
 * (`title.length`), con «…» al final. Corta entre caracteres completos, así que
 * nunca parte un emoji ni deja medio par sustituto.
 */
function clampLength(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  let out = "";
  for (const piece of graphemes(text)) {
    if (out.length + piece.length > max - 1) break;
    out += piece;
  }
  return { text: `${out.trimEnd()}…`, truncated: true };
}

/** El título tal como lo deja el analizador; la vista previa lo usa al renombrar. */
export function clampTitle(text: string): { title: string; truncated: boolean } {
  const { text: title, truncated } = clampLength(text.replace(/\s+/g, " ").trim(), MAX_TITLE);
  return { title, truncated };
}

/**
 * Quita de los bordes los caracteres de `chars`. Con un bucle y no con
 * `/[…]+$/`, que en una línea larga con muchos separadores seguidos tarda un
 * tiempo cuadrático y colgaría la pestaña.
 */
function trimEdges(text: string, chars: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && chars.includes(text[start])) start++;
  while (end > start && chars.includes(text[end - 1])) end--;
  return text.slice(start, end);
}

// Lo que sobra en los bordes de un título: separadores de «Título - enlace».
const EDGE_SEPARATORS = " -–—:|·,;";
// Paréntesis y comillas que se quedan vacíos al quitar un enlace o un estado.
const EMPTY_BRACKETS = /\(\s*\)|\[\s*\]|\{\s*\}|«\s*»|“\s*”|"\s*"/g;

function tidy(text: string): string {
  let s = text.replace(/\s+/g, " ");
  // Unas pocas vueltas bastan para «( ( ) )»; más anidado no aparece en una lista.
  for (let round = 0, prev = ""; round < 4 && prev !== s; round++) {
    prev = s;
    s = s.replace(EMPTY_BRACKETS, " ");
  }
  s = trimEdges(s.replace(/\s+/g, " "), EDGE_SEPARATORS);
  const bold = /^(\*\*|__)(.+)\1$/.exec(s);
  return bold ? bold[2].trim() : s;
}

// Viñetas, numeración y casillas al principio de la línea. Los emojis no: si
// la dueña puso «🎁» delante, es parte del título.
const BULLET =
  /^\s*(?:[-*–—]\s+|[-–—](?=\p{L})|[•·▪○◦‣⁃►▸➤→]\s*)?(?:\[[ xX✓✔]?\]\s*|[☐☑✔✓]️?\s*)?(?:\(\d{1,3}\)\s*|\d{1,3}[.)](?=\s|$)\s*)?/u;

function stripBullet(text: string): string {
  return text.replace(BULLET, "");
}

// ─── Estado de reserva (decisión 7) ─────────────────────────────────────────

const WORD_CHAR = String.raw`[\p{L}\p{N}]`;
const statusPattern = (body: string) =>
  new RegExp(String.raw`(?<!${WORD_CHAR})(?:${body})(?!${WORD_CHAR})`, "giu");
const STATE_EN = String.raw`received|reserved|purchased|bought|granted|gifted|claimed`;
const STATE_ES = String.raw`recibid[oa]s?|reservad[oa]s?|comprad[oa]s?|regalad[oa]s?`;
const STATE = String.raw`(?:${STATE_EN}|${STATE_ES})`;
const COUNT = String.raw`\d+(?:\s*(?:of|de|\/)\s*\d+)?`;

// De la más larga a la más corta, para que «not received» no deje un «not».
const STATUS_PATTERNS = [
  statusPattern(String.raw`reserved\s+by\s+(?:wishlist\.com|someone|a\s+friend|another\s+user)`),
  statusPattern(String.raw`reserve\s*(?:&|and|\+|y)\s*buy`),
  statusPattern(String.raw`(?:mark(?:ed)?\s+as|marcad[oa]\s+como|marcar\s+como)\s+${STATE}`),
  statusPattern(String.raw`(?:undo|cancel)\s+(?:reservation|reserve)|(?:deshacer|cancelar)\s+(?:la\s+)?reserva`),
  statusPattern(String.raw`(?:not|no)\s+(?:yet\s+)?${STATE}|sin\s+reservar|unreserved`),
  statusPattern(String.raw`ya\s+(?:${STATE_ES})`),
  statusPattern(String.raw`open\s+gift|wish\s+granted`),
  statusPattern(String.raw`${COUNT}\s+${STATE}`),
  statusPattern(String.raw`${STATE}\s*:\s*${COUNT}`),
  statusPattern(STATE),
];

// Botones de estado que solo cuentan cuando son la línea entera: «Reserve» a
// secas puede ser parte de un título.
const STATUS_WHOLE = /^(?:reserve(?:\s+(?:it|this|now))?|reservar|available|unclaimed|still\s+wanted)$/i;

// Enlaces de reservar o deshacer una reserva. Nunca se guardan, nunca dan
// título y no cuentan como enlace de wishlist.com.
const STATUS_LINK = /[?&#;](?:resid|undo_res|res_qty|guest)(?:[=&#;]|$)/i;

function isStatusLink(url: string): boolean {
  if (STATUS_LINK.test(url)) return true;
  try {
    return STATUS_LINK.test(decodeURIComponent(url));
  } catch {
    return false;
  }
}

function removeStatus(text: string): string {
  let s = text;
  for (const pattern of STATUS_PATTERNS) s = s.replace(pattern, " ");
  return s;
}

// ─── Enlaces dentro de una línea ────────────────────────────────────────────

const HOLD = "";
// El texto del enlace va acotado: sin tope, una línea con muchos «[» sin
// cerrar tardaría un tiempo cuadrático.
const MD_LINK = /\[([^\]\n]{0,300})\]\(\s*([^)\s]+)\s*\)/g;
const SCHEME_URL = /https?:\/\/[^\s<>"«»]+/gi;
// Sin protocolo: «www.…» o dominio con ruta («amazon.es/dp/…», «amzn.to/…»).
const BARE_URL =
  /(?<![\p{L}\p{N}@./:_-])(?:www\.[^\s<>"«»]+|(?:[a-z0-9-]+\.)+[a-z]{2,}[/?#][^\s<>"«»]*)/giu;

function count(text: string, char: string): number {
  return text.split(char).length - 1;
}

/**
 * Quita la puntuación que se pega al final de un enlace dentro de una frase.
 * Un «)» final solo se quita si no tiene pareja dentro del enlace.
 */
function trimUrlEnd(url: string): string {
  let end = url.length;
  const open = count(url, "(");
  let close = count(url, ")");
  const openSquare = count(url, "[");
  let closeSquare = count(url, "]");
  while (end > 0) {
    const last = url[end - 1];
    if (".,;:!?'\"»…".includes(last)) {
      end--;
    } else if (last === ")" && open < close) {
      end--;
      close--;
    } else if (last === "]" && openSquare < closeSquare) {
      end--;
      closeSquare--;
    } else {
      break;
    }
  }
  return url.slice(0, end);
}

type Cell = { text: string; links: string[] };

/**
 * Una celda (o una línea entera, si no es una hoja de cálculo): los enlaces
 * aparte, el estado fuera y el texto limpio. Los enlaces se apartan antes de
 * quitar el estado para no mutilar una ruta que contenga «received».
 */
function scrubCell(raw: string): Cell {
  const links: string[] = [];
  const hold = (match: string): string => {
    const url = trimUrlEnd(match);
    // De lo que se pegaba al final del enlace solo se quedan los paréntesis y
    // las comillas, para que «(enlace)» se vacíe entero; el punto de la frase, no.
    const tail = match.slice(url.length).replace(/[.,;:!?…]/g, "");
    if (isStatusLink(url)) return ` ${tail}`;
    if (!looksLikeUrl(url)) return match;
    links.push(url);
    return ` ${HOLD} ${tail}`;
  };
  let s = stripBullet(raw);
  s = s.replace(MD_LINK, (match, label: string, url: string) =>
    isStatusLink(url) || looksLikeUrl(url) ? `${label} ${hold(url)}` : match,
  );
  s = s.replace(SCHEME_URL, hold).replace(BARE_URL, hold);
  s = removeStatus(s).replaceAll(HOLD, " ");
  s = tidy(stripBullet(tidy(s)));
  if (STATUS_WHOLE.test(s)) s = "";
  // «tienda.es» a secas solo es un enlace si es lo único que hay.
  if (links.length === 0 && looksLikeUrl(s)) return { text: "", links: [s] };
  return { text: s, links };
}

type LinkInfo = PreparedLink & { isList: boolean };

const AMAZON_LIST_PATH = /\/(?:hz\/wishlist|wishlist|registry|baby-reg)(?:\/|$)/i;

function analyzeLink(raw: string): LinkInfo {
  const prepared = prepareListLink(raw);
  const amazonList =
    prepared.url !== undefined &&
    storeIdForUrl(prepared.url) === "amazon" &&
    AMAZON_LIST_PATH.test(new URL(prepared.url).pathname);
  return { ...prepared, isList: prepared.wishlistCom === "list" || amazonList };
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────

const WA_DATE = String.raw`\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}`;
const WA_TIME = String.raw`\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]\.?\s?m\.?)?`;
// iOS: «[11/10/26, 10:15:32] Laura: texto».
const WA_IOS = new RegExp(String.raw`^\s*\[${WA_DATE},?\s+${WA_TIME}\]\s*(.*)$`, "i");
// Android: «11/10/26, 10:15 - Laura: texto».
const WA_ANDROID = new RegExp(String.raw`^\s*${WA_DATE},?\s+${WA_TIME}\s+[-–]\s+(.*)$`, "i");
const WA_AUTHOR = /^([^:]{1,60}?):\s+(.*)$/;
const WA_EDITED = /<\s*(?:se editó este mensaje|this message was edited)\.?\s*>/gi;
const WA_SYSTEM = [
  /cifrad[oa]s? de extremo a extremo|end-to-end encrypted/i,
  /^<?\s*(?:multimedia|media|imagen|image|v[íi]deo|audio|sticker|gif|documento|document)\s+(?:omitid[oa]|omitted)\s*>?$/i,
  /^<\s*(?:adjunto|attached)\s*:/i,
  /^(?:se eliminó este mensaje|este mensaje fue eliminado|eliminaste este mensaje|this message was deleted|you deleted this message)\.?$/i,
  /^(?:llamada|videollamada)(?: de voz| de v[íi]deo)? perdida|^missed (?:voice|video) call/i,
  /^.{0,80}(?:creó (?:el|este) grupo|te añadió|añadió a |salió del grupo|se unió usando|cambió (?:el asunto|la descripción|el icono|la foto)|mensajes temporales|created group|added you)/i,
];

/** Se mira sobre el texto ya limpio de estado y de enlaces de reserva. */
function isWhatsAppSystem(text: string): boolean {
  return WA_SYSTEM.some((re) => re.test(text));
}

// ─── Líneas que no son filas ────────────────────────────────────────────────

const CURRENCY = String.raw`(?:€|eur(?:os)?|us\$|\$|usd|£|gbp)`;
const AMOUNT = String.raw`(?:\d{1,3}(?:[.,\s]\d{3})+|\d+)(?:[.,]\d{1,2})?`;
const MONEY = String.raw`(?:${CURRENCY}\s?${AMOUNT}|${AMOUNT}\s?${CURRENCY})`;
const PRICE = new RegExp(
  String.raw`^(?:(?:desde|from|precio|price|pvp|pvpr|precio recomendado|antes|was|now|ahora)\s*:?\s*)?${MONEY}(?:\s*[-–]\s*${MONEY})?(?:\s*(?:iva incl(?:uido|\.)?|impuestos incluidos))?$`,
  "i",
);

const RATINGS = [
  /^\d(?:[.,]\d)?\s*(?:de|out of|\/)\s*5(?:\s*(?:estrellas|stars))?$/i,
  /^\(\s*\d{1,3}(?:[.,]\d{3})*\s*\)$/,
  /^\d{1,3}(?:[.,]\d{3})*\s*(?:valoraciones|opiniones|reseñas|calificaciones|ratings|reviews)$/i,
  /^[★☆✩⭐]+$/u,
];

// Botones y rótulos de tiendas y de apps de listas, comparados en minúsculas
// y sin la puntuación final.
const UI_NOISE = new Set([
  "añadir a la cesta", "añadir al carrito", "añadir a la lista", "añadir a mi lista",
  "añadir a la lista de deseos", "comprar ahora", "comprar ya", "ver producto", "ver más",
  "ver menos", "ver detalles", "ver opciones", "ver oferta", "ver todas las opciones de compra",
  "disponible", "no disponible", "en stock", "agotado", "sin stock", "envío gratis",
  "envío gratuito", "entrega gratis", "prime", "eliminar", "borrar", "mover", "mover a la cesta",
  "editar", "compartir", "comentario", "añadir comentario", "cantidad", "prioridad", "oferta",
  "oferta flash", "patrocinado", "más vendido", "elección de amazon", "mis listas", "tu lista",
  "filtrar", "buscar", "imprimir", "copiar", "copiar enlace", "seleccionar todo",
  "add to cart", "add to basket", "add to wishlist", "add to list", "buy now", "buy it now",
  "see more", "see all", "show more", "more", "view", "view item", "view product", "edit",
  "delete", "remove", "move", "share", "copy", "copy link", "copy all wishes", "copy selected",
  "print", "email", "in stock", "out of stock", "free shipping", "free delivery", "quantity",
  "priority", "comment", "comments", "add comment", "filter", "search", "sponsored",
  "best seller", "deal", "details", "select all", "deselect all",
]);

const UI_NOISE_PATTERNS = [
  /^(?:sort by|ordenar por)\b/i,
  /^(?:lista de deseos|wish ?list|my wish ?list|mi lista de)\b/i,
  /^(?:añadido|agregado) (?:el|en)\b/i,
  /^(?:date )?added on\b/i,
  /^(?:solo )?queda(?:n)? \d+/i,
  /^only \d+ left/i,
  /^(?:vendido|enviado|distribuido) por\b/i,
  /^(?:sold|ships|shipped|dispatched) (?:by|from)\b/i,
  /^(?:cantidad|quantity|qty|prioridad|priority|necesita|needs|has|tiene)\s*:\s*\S*$/i,
  /^ahorra\b/i,
  /^-\s?\d{1,2}\s?%$/,
  /^ver (?:las )?\d+ opciones/i,
  /^\d+ (?:ofertas?|opciones|nuevos?|usados?)\b/i,
  // La firma de la marca bajo el título de Amazon: «de Sony», «by Lego».
  /^(?:de|by|por) \S+(?: \S+){0,3}$/,
];

function isNoise(text: string): boolean {
  const key = trimEdges(text.toLowerCase(), " .…:›>»");
  return (
    UI_NOISE.has(key) ||
    UI_NOISE_PATTERNS.some((re) => re.test(text)) ||
    PRICE.test(text) ||
    /^\d+[.,]\d{2}$/.test(text) ||
    RATINGS.some((re) => re.test(text))
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^(?:(?:tel[ée]fono|tel|m[óo]vil|phone|mobile)\.?\s*:?\s*)?\+?[\d\s().-]{7,}$/i;
const DATES = [
  /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/,
  /^\d{4}-\d{2}-\d{2}$/,
  /^(?:(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo),?\s+)?\d{1,2}\s+(?:de\s+)?(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:t(?:iembre)?)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\.?(?:\s+(?:de\s+)?\d{2,4})?$/i,
  /^(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?,?(?:\s+\d{4})?$/i,
];
// «Paseo», «camino» y «ronda» no están: «Paseo en globo para 2» es un deseo.
const STREET = String.raw`(?:calle|c\/|c\.|avda\.?|avenida|av\.|plaza|pza\.?|carretera|ctra\.?|traves[íi]a|glorieta|urbanizaci[óo]n|urb\.)`;
const POSTCODE = String.raw`(?:0[1-9]|[1-4]\d|5[0-2])\d{3}`;
const ADDRESSES = [
  new RegExp(
    String.raw`^${STREET}\s*\p{L}.*?\d+\s*(?:,|º|ª|°|$|\s+\d|\s*[-–]\s*\d|\s+(?:bajo|piso|puerta|esc|portal|bis|izq|dcha)\b)`,
    "iu",
  ),
  new RegExp(String.raw`^${POSTCODE}\s+\p{Lu}[\p{L}.'-]*(?:\s+[\p{L}.'-]+){0,2}(?:\s*\([\p{L}\s.'-]+\))?(?:,\s*(?:españa|spain))?$`, "u"),
  new RegExp(String.raw`^\p{Lu}[\p{L}.'-]*(?:\s+[\p{L}.'-]+){0,2},?\s+${POSTCODE}$`, "u"),
  new RegExp(String.raw`^${STREET}\s*\p{L}.*\b${POSTCODE}\b`, "iu"),
];

/** Datos sueltos que no son algo que pedir: no son filas ni cuentan como ruido. */
function isNotARow(text: string): boolean {
  if (EMAIL.test(text)) return true;
  if (PHONE.test(text) && (text.match(/\d/g)?.length ?? 0) >= 9) return true;
  if (DATES.some((re) => re.test(text)) || ADDRESSES.some((re) => re.test(text))) return true;
  // Sin letras ni un número de tres cifras («3», «—», «🎁») no hay título.
  return !/\p{L}/u.test(text) && !/\d{3}/.test(text);
}

function classify(text: string): "noise" | "skip" | "keep" {
  if (isNoise(text)) return "noise";
  return isNotARow(text) ? "skip" : "keep";
}

/** Más de ~14 palabras, o una frase acabada en punto: parece texto, no un deseo. */
function looksLikeProse(title: string): boolean {
  const words = title.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return words > 14 || (title.endsWith(".") && words > 8);
}

// ─── Hojas de cálculo ───────────────────────────────────────────────────────

const HEADER_WORDS = new Set([
  "titulo", "title", "nombre", "name", "producto", "product", "item", "articulo", "que",
  "cosa", "deseo", "deseos", "wish", "regalo", "enlace", "link", "url", "web", "nota",
  "notas", "note", "notes", "comentario", "comentarios", "comment", "comments", "descripcion",
  "description", "precio", "price", "cantidad", "quantity", "tienda", "store", "estado",
  "status", "prioridad", "priority",
]);

function headerKey(text: string): string {
  return text.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[¿?:.]/g, "").trim();
}

function isHeaderRow(cells: Cell[]): boolean {
  const texts = cells.map((c) => c.text).filter((t) => t.length > 0);
  return (
    texts.length > 0 &&
    cells.every((c) => c.links.length === 0) &&
    texts.every((t) => HEADER_WORDS.has(headerKey(t)))
  );
}

// ─── Análisis ────────────────────────────────────────────────────────────────

type Line = {
  /** Autor de WhatsApp: el del prefijo o, en una línea de continuación, el anterior. */
  author?: string;
  /** Lleva el prefijo «[fecha, hora] Autor:». */
  whatsApp: boolean;
  /** Parece una línea de sistema de WhatsApp: fuera si lo pegado es un chat. */
  system: boolean;
  /** En blanco, o solo tenía estado, viñetas o un enlace de reserva. No cuenta para nada. */
  skip: boolean;
  hasTab: boolean;
  cells: Cell[];
};

type Draft = {
  title: string;
  url?: string;
  note?: string;
  author?: string;
  droppedWishlistLink: boolean;
  hadLink: boolean;
};

const SYSTEM_LINE: Line = { whatsApp: false, system: true, skip: true, hasTab: false, cells: [] };

function readLine(raw: string): Line {
  const prefixed = WA_IOS.exec(raw) ?? WA_ANDROID.exec(raw);
  let body = raw;
  let author: string | undefined;
  if (prefixed) {
    const message = WA_AUTHOR.exec(prefixed[1]);
    // Sin «Autor:» es un aviso del propio WhatsApp («… cifrados de extremo a
    // extremo»); con dos puntos dentro del aviso («cambió el asunto a: …»)
    // también lo es, aunque parezca tener autor.
    if (!message || isWhatsAppSystem(scrubCell(prefixed[1]).text)) return { ...SYSTEM_LINE };
    author = message[1].trim();
    body = message[2];
  }
  body = body.replace(WA_EDITED, " ");
  const cells = body.split("\t").map(scrubCell);
  const system = isWhatsAppSystem(tidy(cells.map((c) => c.text).join(" ")));
  if (prefixed && system) return { ...SYSTEM_LINE };
  const empty = cells.every((c) => c.text.length === 0 && c.links.length === 0);
  return { author, whatsApp: prefixed !== null, system, skip: empty, hasTab: body.includes("\t"), cells };
}

function finishRow(draft: Draft, otherAuthor: boolean, fromWishlistCom: boolean): PastedRow {
  const { title, truncated } = clampTitle(draft.title);
  const row: PastedRow = { title, truncated, droppedWishlistLink: draft.droppedWishlistLink };
  if (draft.url !== undefined) row.url = draft.url;
  if (draft.note !== undefined) row.note = draft.note;
  if (draft.author !== undefined) row.author = draft.author;
  if (title.length === 0) row.hint = "needs-name";
  else if (otherAuthor) row.hint = "other-author";
  // De wishlist.com, lo que no trae enlace suele ser su bloque de «Thank you»
  // con la dirección: llega sin casilla.
  else if ((fromWishlistCom && !draft.hadLink) || looksLikeProse(title)) row.hint = "looks-like-text";
  return row;
}

/**
 * Lo pegado, en filas. Puro y determinista: el mismo texto da siempre el mismo
 * resultado, y el mismo texto con palabras de estado añadidas también.
 */
export function parsePastedList(text: string): PastedList {
  const tooLarge: PastedList = { rows: [], kind: "too-large", fromWishlistCom: false };
  if (text.length > MAX_PASTE_CHARS) return tooLarge;
  const rawLines = normalizePastedText(text).trimEnd().split("\n");
  if (rawLines.length > MAX_PASTE_LINES) return tooLarge;

  const lines = rawLines.map(readLine);

  // Es un chat si alguna línea con contenido lleva el prefijo. Las líneas sin
  // prefijo son la continuación del mensaje anterior. Una línea que solo tenía
  // estado no cuenta ni cambia de autor: así inyectarla no altera nada.
  const isChat = lines.some((l) => l.whatsApp && !l.skip);
  const authorLines = new Map<string, number>();
  let lastAuthor: string | undefined;
  for (const line of lines) {
    if (isChat && line.system) line.skip = true;
    if (line.skip) continue;
    if (line.whatsApp) lastAuthor = line.author;
    else if (isChat) line.author = lastAuthor;
    if (line.author !== undefined) authorLines.set(line.author, (authorLines.get(line.author) ?? 0) + 1);
  }
  let primaryAuthor: string | undefined;
  for (const [author, n] of authorLines) {
    if (primaryAuthor === undefined || n > (authorLines.get(primaryAuthor) ?? 0)) primaryAuthor = author;
  }

  const live = lines.filter((l) => !l.skip);

  // El enlace de una lista entera, solo: no se abre (decisión 3).
  if (live.length === 1 && live[0].cells.every((c) => c.text.length === 0)) {
    const links = live[0].cells.flatMap((c) => c.links).map(analyzeLink);
    if (links.length === 1 && links[0].isList) {
      return { rows: [], kind: "whole-list-link", fromWishlistCom: links[0].wishlistCom !== undefined };
    }
  }

  const isSheet = !isChat && live.filter((l) => l.hasTab).length * 2 > live.length;
  const drafts: Draft[] = [];
  let fromWishlistCom = false;
  let counted = 0;
  let noise = 0;
  // Un título sin enlace espera al enlace de la línea siguiente.
  let pending: Draft | null = null;

  live.forEach((line, i) => {
    if (isSheet && i === 0 && isHeaderRow(line.cells)) return;
    counted++;
    const links = line.cells.flatMap((c) => c.links).map(analyzeLink);
    if (links.some((l) => l.wishlistCom !== undefined)) fromWishlistCom = true;
    const kept = links.find((l) => l.url !== undefined);
    const droppedWishlistLink = links.some((l) => l.wishlistCom === "item");
    const listLink = links.some((l) => l.isList);

    if (isSheet) {
      const verdicts = line.cells.filter((c) => c.text.length > 0).map((c) => ({ text: c.text, kind: classify(c.text) }));
      const texts = verdicts.filter((v) => v.kind === "keep").map((v) => v.text);
      if (links.length === 0 && texts.length === 0) {
        if (verdicts.some((v) => v.kind === "noise")) noise++;
        return;
      }
      const title = texts[0] ?? kept?.suggestedTitle ?? "";
      if (title.length === 0 && kept === undefined) return;
      const draft: Draft = { title, url: kept?.url, droppedWishlistLink, hadLink: links.length > 0 };
      if (texts[1] !== undefined) draft.note = clampLength(texts[1], MAX_NOTE).text;
      drafts.push(draft);
      return;
    }

    const text = tidy(line.cells.map((c) => c.text).join(" "));
    const verdict = text.length > 0 ? classify(text) : "skip";
    if (links.length === 0) {
      if (verdict === "noise") noise++;
      if (verdict !== "keep") return;
      pending = { title: text, author: line.author, droppedWishlistLink: false, hadLink: false };
      drafts.push(pending);
      return;
    }
    // «Lista de Marta https://wishlist.com/l/…» es una cabecera, no una fila.
    if (listLink && kept === undefined) {
      pending = null;
      return;
    }
    if (verdict === "keep") {
      drafts.push({ title: text, url: kept?.url, author: line.author, droppedWishlistLink, hadLink: true });
      pending = null;
      return;
    }
    // Solo enlace: completa el título de la línea anterior, si lo hay.
    const waiting: Draft | null = pending;
    pending = null;
    if (waiting !== null && links.length === 1 && waiting.author === line.author) {
      waiting.url = kept?.url;
      waiting.droppedWishlistLink = droppedWishlistLink;
      waiting.hadLink = true;
      return;
    }
    for (const link of links) {
      if (link.url === undefined) continue;
      drafts.push({
        title: link.suggestedTitle ?? "",
        url: link.url,
        author: line.author,
        droppedWishlistLink: false,
        hadLink: true,
      });
    }
  });

  const manyAuthors = authorLines.size > 1;
  const rows = drafts.map((d) =>
    finishRow(d, manyAuthors && d.author !== undefined && d.author !== primaryAuthor, fromWishlistCom),
  );
  const noisy = counted >= 5 && noise / counted >= 0.4;
  return { rows, kind: noisy ? "noisy" : rows.length === 0 ? "empty" : "list", fromWishlistCom };
}

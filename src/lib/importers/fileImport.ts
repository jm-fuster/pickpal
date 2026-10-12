import { looksLikeUrl } from "../links";

/**
 * «Subir un archivo» en /mi-lista/traer: un CSV, un TSV o un TXT exportado de
 * otra app o de una hoja de cálculo. Todo pasa en el navegador, sin red: el
 * archivo se lee, se descodifica y se convierte en el mismo texto que se
 * habría pegado, y a partir de ahí manda `parsePastedList` (que ya entiende
 * filas separadas por tabuladores con una cabecera de título, enlace y nota).
 *
 * La regla del analizador vale también aquí: el estado de reserva de la otra
 * app nunca cambia el resultado (decisión 7). Una columna «Estado»,
 * «Reservado» o «Comprado» se tira entera, valga lo que valga cada celda, y
 * una celda «Estado: …» se vacía.
 */

export const MAX_FILE_BYTES = 200_000;

/** Para el `accept` del `<input type="file">`. */
export const ACCEPTED_FILE_TYPES = ".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain";

const EXTENSIONS = new Set(["csv", "tsv", "txt"]);

function extensionOf(fileName: string): string {
  return /\.([a-z0-9]+)$/i.exec(fileName.trim())?.[1].toLowerCase() ?? "";
}

// ─── Bytes → texto ──────────────────────────────────────────────────────────

/**
 * Con BOM, lo que diga el BOM (UTF-8, UTF-16 LE o BE). Sin BOM, UTF-8 si lo
 * es de verdad y, si no, Windows-1252, que es lo que guarda Excel en español
 * con «CSV (delimitado por punto y coma)»: «Muñeca» llega con un 0xF1 suelto.
 */
export function decodeFileBytes(bytes: Uint8Array): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

type Delimiter = ";" | "\t" | ",";

/**
 * El separador de la primera línea con contenido, contando solo lo que está
 * fuera de comillas. Se prefiere «;» (Excel en español), luego el tabulador y
 * luego la coma. `clear` dice si se ve a las claras que es una tabla: un «;»,
 * un tabulador o al menos dos comas.
 */
function detectDelimiter(text: string): { delimiter: Delimiter; clear: boolean } {
  const counts = { ";": 0, "\t": 0, ",": 0 };
  let quoted = false;
  let seen = false;
  for (const ch of text) {
    if (ch === '"') {
      quoted = !quoted;
    } else if (!quoted && (ch === "\n" || ch === "\r")) {
      if (seen) break;
      continue;
    } else if (!quoted && (ch === ";" || ch === "\t" || ch === ",")) {
      counts[ch]++;
    }
    if (ch.trim().length > 0 || ch === "\t") seen = true;
  }
  const delimiter: Delimiter = counts[";"] > 0 ? ";" : counts["\t"] > 0 ? "\t" : ",";
  return { delimiter, clear: counts[";"] > 0 || counts["\t"] > 0 || counts[","] >= 2 };
}

/**
 * RFC 4180: campos entre comillas con el separador o saltos de línea dentro,
 * `""` para una comilla y CRLF, LF o CR como fin de fila. Es tolerante con lo
 * que no cumple: una comilla en mitad de un campo sin comillas es literal, lo
 * que sigue a la comilla de cierre se pega al campo y unas comillas sin cerrar
 * se llevan el resto del archivo.
 */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let fieldStart = true;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
      } else {
        if (ch === '"') quoted = false;
        else field += ch;
        i++;
      }
      continue;
    }
    if (ch === '"' && fieldStart) {
      quoted = true;
      fieldStart = false;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
      fieldStart = true;
    } else if (ch === "\r" || ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      fieldStart = true;
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      field += ch;
      fieldStart = false;
    }
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ─── Cabecera ───────────────────────────────────────────────────────────────

type Column = "title" | "link" | "note" | "drop";

const TITLE_WORDS = new Set([
  "titulo", "title", "nombre", "name", "producto", "productos", "product", "deseo", "deseos",
  "regalo", "regalos", "que", "item", "articulo", "cosa", "wish",
]);
const LINK_WORDS = new Set(["enlace", "enlaces", "link", "links", "url", "web"]);
const NOTE_WORDS = new Set([
  "nota", "notas", "note", "notes", "comentario", "comentarios", "comment", "comments",
  "descripcion", "description", "observaciones",
]);
// Columnas que se reconocen como cabecera y se tiran. El estado de reserva va
// aquí a propósito: «Estado», «Reservado», «Comprado»… nunca llegan a la vista
// previa, ni como nota.
const DROP_WORDS = new Set([
  "precio", "price", "pvp", "importe", "coste", "cantidad", "quantity", "qty", "unidades",
  "estado", "status", "tienda", "store", "shop", "fecha", "date", "prioridad", "priority",
  "reservado", "reservada", "reserved", "comprado", "comprada", "purchased", "bought",
  "recibido", "recibida", "received", "categoria", "category", "marca", "brand", "talla",
  "size", "color", "id",
]);
// Lo que puede seguir a la palabra clave: «Nombre del producto», «Enlace a la
// tienda», «URL del regalo».
const HEADER_OBJECT = /^(?:(?:del?|de la|al|a la|of|the|to|for)\s+)?(?:producto|product|regalo|gift|articulo|item|deseo|tienda|store|web)$/;
// Al revés, en inglés: «Product name», «Item URL».
const ENGLISH_HEADER = /^(?:product|item|gift|wish)\s+(\S+)$/;
const STATUS_CELL = /^(?:estado|status)\s*:/;

/** Sin mayúsculas, sin tildes y sin la puntuación que suele adornar una cabecera. */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[¿?¡!:.()"'*#_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordColumn(word: string): Column | undefined {
  if (LINK_WORDS.has(word)) return "link";
  if (DROP_WORDS.has(word)) return "drop";
  if (NOTE_WORDS.has(word)) return "note";
  if (TITLE_WORDS.has(word)) return "title";
  return undefined;
}

/**
 * Qué es una celda de la cabecera, o `undefined` si no se parece a una. Se
 * mira la celda entera, no cualquier palabra suelta: «Regalo sorpresa» es un
 * deseo, no una cabecera. «Nombre de la tienda» o «Precio del producto» se
 * tiran: lo que dice qué columna es, es la tienda o el precio.
 */
function headerColumn(cell: string): Column | undefined {
  const key = fold(cell);
  if (key === "que es" || key === "que quiero") return "title";
  const english = ENGLISH_HEADER.exec(key);
  if (english) {
    const column = wordColumn(english[1]);
    return column === "title" || column === "link" || column === "note" ? column : undefined;
  }
  const [first, ...rest] = key.split(" ");
  const column = wordColumn(first);
  if (column === undefined || rest.length === 0) return column;
  const tail = rest.join(" ");
  if (!HEADER_OBJECT.test(tail)) return undefined;
  return column === "title" && /(?:tienda|store)$/.test(tail) ? "drop" : column;
}

/**
 * ¿Es cabecera la primera fila? Ninguna celda es un enlace, al menos una dice
 * título o enlace, y las que no se reconocen son cortas y sin cifras (las de
 * otra app: «Talla», «Añadido el»), que se tiran con las demás.
 */
function readHeader(cells: string[]): Column[] | null {
  const columns: Column[] = [];
  let named = false;
  for (const cell of cells) {
    const text = cell.trim();
    if (text.length === 0) {
      columns.push("drop");
      continue;
    }
    if (/:\/\/|^www\./i.test(text) || looksLikeUrl(text)) return null;
    const column = headerColumn(text);
    if (column === undefined) {
      if (text.length > 30 || /\d/.test(text) || text.split(/\s+/).length > 3) return null;
      columns.push("drop");
      continue;
    }
    if (column === "title" || column === "link") named = true;
    columns.push(column);
  }
  return named ? columns : null;
}

// ─── Archivo → texto pegado ─────────────────────────────────────────────────

function cleanCell(cell: string): string {
  const text = cell.replace(/\s*[\t\r\n]+\s*/g, " ").trim();
  return STATUS_CELL.test(text.toLowerCase()) ? "" : text;
}

function tableToPasteText(rows: string[][]): string {
  const clean = rows.map((row) => row.map(cleanCell)).filter((row) => row.some((c) => c.length > 0));
  if (clean.length === 0) return "";
  const columns = readHeader(clean[0]);
  if (columns === null) return clean.map((row) => row.join("\t")).join("\n");

  // La primera columna de cada clase manda; las repetidas se tiran.
  const at = (kind: Column) => columns.indexOf(kind);
  const titleAt = at("title");
  const linkAt = at("link");
  const noteAt = at("note");
  const lines = ["título\tenlace\tnota"];
  for (const row of clean.slice(1)) {
    const title = titleAt === -1 ? "" : (row[titleAt] ?? "");
    let link = linkAt === -1 ? "" : (row[linkAt] ?? "");
    let note = noteAt === -1 ? "" : (row[noteAt] ?? "");
    // «Amazon» en la columna del enlace no es un enlace: sin esto acabaría de nota.
    if (link.length > 0 && !looksLikeUrl(link) && !/^https?:\/\//i.test(link)) link = "";
    // Sin título, el analizador tomaría la nota por título; mejor el que sale
    // del enlace.
    if (title.length === 0 && link.length > 0) note = "";
    if (title.length === 0 && link.length === 0 && note.length === 0) continue;
    lines.push(`${title}\t${link}\t${note}`);
  }
  return lines.join("\n");
}

/**
 * El contenido del archivo como texto para `parsePastedList`. Un `.txt` sale
 * igual. Un `.csv` o un `.tsv` (o un archivo sin esas extensiones que a las
 * claras es una tabla) se lee como tabla y sale con tabuladores; si la
 * primera fila es una cabecera, solo quedan título, enlace y nota, en ese
 * orden y con la cabecera «título\tenlace\tnota». Una primera línea
 * `sep=;` (la que añade Excel) fija el separador y no cuenta como fila.
 */
export function fileTextToPasteText(text: string, fileName: string): string {
  const ext = extensionOf(fileName);
  if (ext === "txt") return text;
  let body = text.replace(/^﻿/, "");
  let delimiter: string | undefined;
  const sep = /^\s*sep=(.)[ \t]*(?:\r\n|\r|\n|$)/i.exec(body);
  if (sep) {
    delimiter = sep[1];
    body = body.slice(sep[0].length);
  } else if (ext === "tsv") {
    delimiter = "\t";
  } else {
    const detected = detectDelimiter(body);
    if (ext === "csv" || detected.clear) delimiter = detected.delimiter;
  }
  if (delimiter === undefined) return text;
  return tableToPasteText(parseDelimited(body, delimiter));
}

export type ListFile = { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };

/**
 * Lee el archivo que se sube. Solo `.csv`, `.tsv` y `.txt`, sin distinguir
 * mayúsculas, y de hasta `MAX_FILE_BYTES`; el tamaño se mira antes de leerlo.
 */
export async function readListFile(
  file: ListFile,
): Promise<{ text: string } | { error: "too-large" | "unsupported" }> {
  if (!EXTENSIONS.has(extensionOf(file.name))) return { error: "unsupported" };
  if (file.size > MAX_FILE_BYTES) return { error: "too-large" };
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_FILE_BYTES) return { error: "too-large" };
  return { text: fileTextToPasteText(decodeFileBytes(new Uint8Array(buffer)), file.name) };
}

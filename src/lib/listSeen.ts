/**
 * «Nuevo» en la lista que te comparten: lo que la dueña apuntó desde la última
 * vez que la miraste. Se guarda solo en tu navegador (`localStorage`) y no
 * llega a ningún servidor ni a la dueña: así ella no sabe cuándo miras su
 * lista (decisión 7 de docs/encargo-lista.md, la misma idea que las marcas).
 *
 * Lo guardado es la fecha de alta, en hora del servidor, de lo último que viste
 * (no la hora de tu dispositivo, que puede ir adelantada). La clave lleva un
 * resumen de tu id de usuario, no el id: en un ordenador compartido, otra
 * cuenta no hereda tu marca ni ve tu identificador en el almacenamiento.
 */

/** Desde aquí, una sola línea en vez de una etiqueta por fila. */
export const MAX_NEW_BADGES = 5;

/** FNV-1a de 32 bits en hexadecimal: basta para no guardar el id en claro. */
function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function seenKey(userId: string, shareId: string): string {
  return `pickpal:lista-vista:${shortHash(userId)}:${shareId}`;
}

/** Lo guardado, o `null` si no hay nada válido (primera visita). */
export function parseSeen(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** La fecha de alta más reciente de la lista, o 0 si está vacía. */
export function latestAddedAt(items: ReadonlyArray<{ addedAt: number }>): number {
  return items.reduce((max, i) => Math.max(max, i.addedAt), 0);
}

/**
 * Lo nuevo desde `seen`. En la primera visita (`null`) nada es nuevo: todo lo
 * es, y una lista entera marcada «Nuevo» no dice nada.
 */
export function newSince<T extends { _id: string; addedAt: number }>(
  items: ReadonlyArray<T>,
  seen: number | null,
): Set<string> {
  if (seen === null) return new Set();
  return new Set(items.filter((i) => i.addedAt > seen).map((i) => i._id));
}

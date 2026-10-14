/** Un dato vacío de la ficha, dicho como se nombra en la frase: «su talla de ropa», «sus alergias». */
export type MissingField = { text: string; plural: boolean };

/**
 * La línea de lo que falta en un bloque de la ficha: «Falta su talla de
 * ropa.», «Faltan sus alergias.», «Faltan su talla de zapato, sus alergias y
 * lo que no le gusta.». «Faltan» si hay más de uno o si el único es plural.
 */
export function missingSentence(items: MissingField[]): string {
  if (items.length === 0) return "";
  const texts = items.map((i) => i.text);
  const list = texts.length === 1 ? texts[0] : `${texts.slice(0, -1).join(", ")} y ${texts[texts.length - 1]}`;
  return `${items.length === 1 && !items[0].plural ? "Falta" : "Faltan"} ${list}.`;
}

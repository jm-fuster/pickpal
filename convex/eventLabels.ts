import { Id } from "./_generated/dataModel";

// Comparación tolerante a mayúsculas/espacios para los nombres de evento. La
// usan la unicidad de etiquetas de `importantDates` y el emparejamiento de las
// ideas guardadas con su evento.
export const normalizeLabel = (label: string) => label.trim().toLowerCase();

export type EventLabelMatch =
  | { kind: "match"; id: Id<"importantDates"> }
  | { kind: "none" }
  | { kind: "ambiguous" };

/**
 * Busca, entre los eventos de una persona, el que se llama como `label`. Puede
 * haber dos con el mismo nombre normalizado si son anteriores a la regla de
 * unicidad: en ese caso no se elige ninguno.
 */
export function findEventByLabel(
  dates: ReadonlyArray<{ _id: Id<"importantDates">; label: string }>,
  label: string,
): EventLabelMatch {
  const norm = normalizeLabel(label);
  const matches = dates.filter((d) => normalizeLabel(d.label) === norm);
  if (matches.length === 1) return { kind: "match", id: matches[0]._id };
  return matches.length === 0 ? { kind: "none" } : { kind: "ambiguous" };
}

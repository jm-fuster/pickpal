const normalize = (name: string) =>
  name.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * La ficha que probablemente es de quien te comparte una lista, para ponerla
 * la primera en el selector de la tarjeta de lista recibida: la que se llama
 * igual, o la que se llama como su nombre de pila («Julián» para «Julián
 * Vega»). Sin tildes ni mayúsculas. Solo si hay una: con dos candidatas no se
 * sugiere ninguna, porque elegir mal mete la lista en la ficha de otra persona.
 */
export function suggestedPerson<P extends { name: string }>(
  people: P[],
  name: string | null | undefined,
): P | null {
  if (!name?.trim()) return null;
  const target = normalize(name);
  const exact = people.filter((p) => normalize(p.name) === target);
  if (exact.length > 0) return exact.length === 1 ? exact[0] : null;
  const firstName = target.split(" ")[0];
  const byFirstName = people.filter((p) => normalize(p.name) === firstName);
  return byFirstName.length === 1 ? byFirstName[0] : null;
}

// Reconocer un nacimiento en un evento, y decidir dónde se ofrece hacerle su
// ficha al bebé (21-nov-2026, aprobado en `Playground · Baby profile offer`;
// ver docs/design-system.md · «Ficha del bebé»).
//
// Funciones puras, sin nada del servidor de Convex: las usan las queries y
// mutations de `birthOffers.ts` y también el cliente (la agenda y la ficha),
// para que la regla sea una sola.

/** Lo que se hizo con la oferta. Sin valor: aún no se ha respondido. */
export type BirthOffer =
  /** «Ahora no» en la agenda: deja de salir allí, sigue en la ficha. */
  | "hidden"
  /** «Ahora no» en la ficha: no vuelve a salir en ningún sitio. */
  | "dismissed"
  /** Ya tiene su ficha. */
  | "created";

/** Días que el aviso sigue en la agenda después del nacimiento. */
export const BIRTH_AGENDA_DAYS = 60;

type EventLike = {
  label: string;
  month: number;
  day: number;
  year?: number;
  recurring?: boolean;
  birthOffer?: BirthOffer;
};

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// La etiqueta es texto libre. «Baby shower» no entra: es antes del parto, y
// cuando pasa su fecha el bebé puede no haber nacido.
const BIRTH_WORDS = /\b(nacimiento|bebe|parto|llegada de)\b/;

/** «Nacimiento de Leo», «Llega el bebé», «Parto de Ana»… */
export function isBirthLabel(label: string): boolean {
  return BIRTH_WORDS.test(fold(label));
}

/**
 * Un nacimiento que se puede ofrecer: etiqueta de nacimiento y fecha única
 * con año, que es como se apunta algo que pasa una vez.
 */
export function isBirthEvent(e: EventLike): boolean {
  return isBirthLabel(e.label) && e.recurring === false && e.year !== undefined;
}

/**
 * El nombre del bebé, si la etiqueta lo dice: «Nacimiento de Leo» o «Llegada
 * de Leo» → «Leo». «Parto de Ana» o «Bebé de Marta» nombran a la madre, así
 * que no se usan. Vacío si no se sabe: el usuario lo escribe.
 */
export function babyNameFromLabel(label: string): string {
  const m = /^\s*(?:nacimiento|llegada)\s+de\s+(.+?)\s*$/i.exec(label);
  if (!m) return "";
  const name = m[1].trim();
  if (/^(el|la|los|las|un|una|su|mi|tu)\b/i.test(name)) return "";
  return name.slice(0, 40);
}

/** Días enteros desde la fecha del evento hasta `now` (negativo si aún no ha llegado). */
export function daysSinceBirth(e: EventLike, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const born = new Date(e.year ?? now.getFullYear(), e.month - 1, e.day);
  return Math.round((today.getTime() - born.getTime()) / 86_400_000);
}

/** El aviso de la agenda: sin responder, ya pasado y hace como mucho 60 días. */
export function showsInAgenda(e: EventLike, now: Date = new Date()): boolean {
  if (!isBirthEvent(e) || e.birthOffer !== undefined) return false;
  const days = daysSinceBirth(e, now);
  return days > 0 && days <= BIRTH_AGENDA_DAYS;
}

/** La oferta en la ficha: ya pasado, sin ficha creada y sin descartar en la ficha. */
export function showsInProfile(e: EventLike, now: Date = new Date()): boolean {
  if (!isBirthEvent(e)) return false;
  if (e.birthOffer === "dismissed" || e.birthOffer === "created") return false;
  return daysSinceBirth(e, now) > 0;
}

// Franja de edad que se manda a Gemini con la ficha de un menor (decisión del
// 21-nov-2026; ver docs/ia-regalos.md · «Franja de edad» y docs/privacy.md
// §4.1). Sin ella, las ideas para la ficha de un bebé o de un niño salían de
// adulto: Gemini no sabía su edad.
//
// Lo mínimo que sirve: solo menores, solo una franja (nunca la edad exacta, el
// año ni la fecha), y solo si su cumpleaños en la ficha tiene año. De un adulto
// no sale nada nuevo.
import { nextOccurrenceDate } from "./dates";

/**
 * Desde cuándo se manda (00:00 UTC). Es un dato nuevo que sale hacia Google,
 * así que es un cambio sustancial de la política (privacy.md §11): se publica y
 * se avisa por correo al menos 15 días antes. El código puede desplegarse
 * antes; hasta este día la franja no sale.
 */
export const AGE_BAND_FROM = "2026-12-08";

type EventLike = {
  label: string;
  month: number;
  day: number;
  year?: number;
  recurring?: boolean;
};

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * El cumpleaños de la propia persona de la ficha, si tiene año. Solo vale una
 * etiqueta que sea «Cumpleaños» o «Cumple», sola o seguida de «de» y su nombre
 * de pila: «Cumpleaños de Leo» en la ficha de Ana es el de Leo, y su año no
 * dice nada de la edad de Ana.
 */
export function ownBirthday<E extends EventLike>(events: readonly E[], firstName: string): E | null {
  const name = fold(firstName);
  for (const e of events) {
    if (e.year === undefined || e.recurring === false) continue;
    const label = fold(e.label).replace(new RegExp(`\\s+de\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
    if (label === "cumpleanos" || label === "cumple") return e;
  }
  return null;
}

/** Años cumplidos en `on` por quien nació el día `birth`. */
export function ageOn(birth: { year: number; month: number; day: number }, on: Date): number {
  const y = on.getFullYear();
  const beforeBirthday =
    on.getMonth() + 1 < birth.month || (on.getMonth() + 1 === birth.month && on.getDate() < birth.day);
  return y - birth.year - (beforeBirthday ? 1 : 0);
}

/** La franja de una edad, o null si es adulta o la edad no tiene sentido. */
export function bandFor(age: number): string | null {
  if (age < 0 || age >= 18) return null;
  if (age < 1) return "menos de 1 año";
  if (age <= 2) return "de 1 a 2 años";
  if (age <= 5) return "de 3 a 5 años";
  if (age <= 8) return "de 6 a 8 años";
  if (age <= 12) return "de 9 a 12 años";
  return "de 13 a 17 años";
}

/**
 * La franja que va en el prompt: la edad que tendrá en la fecha de la ocasión
 * elegida (la próxima, si se repite). null si aún no ha llegado
 * `AGE_BAND_FROM`, si no hay cumpleaños con año o si es adulta.
 */
export function ageBandForPrompt({
  events,
  occasion,
  firstName,
  now = new Date(),
}: {
  events: readonly EventLike[];
  occasion: EventLike;
  firstName: string;
  now?: Date;
}): string | null {
  const [fy, fm, fd] = AGE_BAND_FROM.split("-").map(Number);
  if (now.getTime() < Date.UTC(fy, fm - 1, fd)) return null;
  const birthday = ownBirthday(events, firstName);
  if (!birthday || birthday.year === undefined) return null;
  const on =
    occasion.recurring === false && occasion.year !== undefined
      ? new Date(occasion.year, occasion.month - 1, occasion.day)
      : nextOccurrenceDate(occasion.month, occasion.day, now);
  return bandFor(ageOn({ year: birthday.year, month: birthday.month, day: birthday.day }, on));
}

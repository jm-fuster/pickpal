const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/**
 * Construye una Date para month+day en `year`. Si es 29-feb y `year` no es
 * bisiesto, hace fallback a 28-feb (la convención más común; ver dudas.md).
 */
function occurrenceInYear(year: number, month: number, day: number): Date {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return new Date(year, 1, 28);
  }
  return new Date(year, month - 1, day);
}

/**
 * Fecha (00:00 local) de la próxima ocurrencia anual de month/day desde
 * `from`, con el fallback 29-feb→28-feb en años no bisiestos. Es la misma
 * fecha a la que apunta la cuenta atrás: cualquier etiqueta visible debe
 * derivarse de aquí, no de `new Date(year, month-1, day)` naive.
 */
export function nextOccurrenceDate(
  month: number,
  day: number,
  from: Date = new Date(),
): Date {
  const today = startOfDay(from);
  let next = occurrenceInYear(today.getFullYear(), month, day);
  if (next.getTime() < today.getTime()) {
    next = occurrenceInYear(today.getFullYear() + 1, month, day);
  }
  return next;
}

/**
 * Días enteros desde `from` (00:00 local) hasta la próxima ocurrencia anual
 * de month/day. Devuelve 0 si la fecha es hoy.
 */
export function computeDaysUntilNextOccurrence(
  month: number,
  day: number,
  from: Date = new Date(),
): number {
  const today = startOfDay(from);
  const next = nextOccurrenceDate(month, day, from);
  return Math.round((next.getTime() - today.getTime()) / MS_PER_DAY);
}

/**
 * Días hasta la fecha. Para fechas únicas (recurring=false) devuelve null si
 * ya pasaron. Para recurrentes, siempre devuelve la próxima ocurrencia anual.
 */
export function computeDaysUntil(
  date: { month: number; day: number; year?: number; recurring?: boolean },
  from: Date = new Date(),
): number | null {
  if (date.recurring === false) {
    if (date.year === undefined) return null;
    // occurrenceInYear aplica el fallback 29-feb→28-feb también aquí: una
    // fecha única guardada como 29-feb de un año no bisiesto no debe dar NaN
    // ni saltar al 1 de marzo.
    const target = occurrenceInYear(date.year, date.month, date.day);
    const today = startOfDay(from);
    const diff = Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
    return diff >= 0 ? diff : null;
  }
  return computeDaysUntilNextOccurrence(date.month, date.day, from);
}

/**
 * Días enteros desde `from` (00:00 local) hasta la misma fecha `months` meses
 * después. Es el ancho real de una ventana "los próximos N meses": 4 meses
 * naturales son 120–123 días según los meses que se crucen, así que comparar
 * la cuenta atrás contra un 120 fijo deja fuera fechas que sí caen dentro de
 * la ventana (p. ej. un cumpleaños justo a 4 meses vista).
 */
export function monthsWindowDays(
  months: number,
  from: Date = new Date(),
): number {
  const today = startOfDay(from);
  const end = new Date(
    today.getFullYear(),
    today.getMonth() + months,
    today.getDate(),
  );
  return Math.round((end.getTime() - today.getTime()) / MS_PER_DAY);
}

export function formatDayMonth(month: number, day: number): string {
  return `${day} de ${MONTHS_ES[month - 1]}`;
}

export function formatDaysUntil(days: number): string {
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

/**
 * La etiqueta de la fecha de la ficha más cercana a hoy, hacia delante o hacia
 * atrás. Es la ocasión que propone «Ya se lo he regalado» en «Mi lista»
 * (decisión 16 de docs/encargo-lista.md): casi siempre se marca justo después
 * del cumpleaños o de Navidad, así que la de hace una semana gana a la de
 * dentro de un mes. Vacío si la ficha no tiene fechas.
 */
export function closestOccasionLabel(
  dates: ReadonlyArray<{
    label: string;
    month: number;
    day: number;
    year?: number;
    recurring?: boolean;
  }>,
  from: Date = new Date(),
): string {
  const today = startOfDay(from);
  const daysBetween = (a: Date, b: Date) =>
    Math.abs(Math.round((a.getTime() - b.getTime()) / MS_PER_DAY));

  let best: { label: string; distance: number } | null = null;
  for (const d of dates) {
    let distance: number;
    if (d.recurring === false) {
      if (d.year === undefined) continue;
      distance = daysBetween(occurrenceInYear(d.year, d.month, d.day), today);
    } else {
      // La anterior es la de este año si ya llegó; si no, la del año pasado.
      let previous = occurrenceInYear(today.getFullYear(), d.month, d.day);
      if (previous.getTime() > today.getTime()) {
        previous = occurrenceInYear(today.getFullYear() - 1, d.month, d.day);
      }
      distance = Math.min(
        computeDaysUntilNextOccurrence(d.month, d.day, from),
        daysBetween(today, previous),
      );
    }
    if (!best || distance < best.distance) best = { label: d.label, distance };
  }
  return best?.label ?? "";
}

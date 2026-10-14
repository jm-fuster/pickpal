import { computeDaysUntil } from "@/lib/dates";

type EventLike = {
  label: string;
  month: number;
  day: number;
  year?: number;
  recurring?: boolean;
};

/**
 * A partir de cuántos días la próxima ocasión deja de ser urgente. Es la misma
 * regla que la tarjeta de urgencia de la Agenda (`UpcomingDateCard`): la
 * cabecera de la ficha solo se tiñe cuando la fecha está a una semana o menos.
 */
export const URGENT_DAYS = 7;

/**
 * La fecha de la ficha que viene antes, con los días que faltan. Las únicas
 * que ya pasaron no cuentan. Empate: por nombre, como el resto de la ficha.
 * `null` si no hay ninguna por delante.
 */
export function nextOccasion<E extends EventLike>(
  events: readonly E[],
  from: Date = new Date(),
): { event: E; days: number } | null {
  let best: { event: E; days: number } | null = null;
  for (const event of events) {
    const days = computeDaysUntil(event, from);
    if (days === null) continue;
    if (
      !best ||
      days < best.days ||
      (days === best.days && event.label.localeCompare(best.event.label, "es") < 0)
    ) {
      best = { event, days };
    }
  }
  return best;
}

/**
 * Cuánto falta, dicho como lo diría una persona: «Hoy», «Mañana», «En 12
 * días» hasta un mes, y después en meses («Falta un mes», «Faltan 9 meses»).
 */
export function occasionWhen(days: number): string {
  if (days <= 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days <= 31) return `En ${days} días`;
  const months = Math.round(days / 30.44);
  return months <= 1 ? "Falta un mes" : `Faltan ${months} meses`;
}

/** Presupuesto en céntimos como lo escribe la Agenda: «40 – 80 €». */
export function formatBudget(min?: number, max?: number): string | null {
  const eur = (v: number) => Math.round(v / 100);
  if (min != null && max != null) return `${eur(min)} – ${eur(max)} €`;
  if (min != null) return `Desde ${eur(min)} €`;
  if (max != null) return `Hasta ${eur(max)} €`;
  return null;
}

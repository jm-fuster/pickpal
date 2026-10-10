import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { countUnclaimedForReader } from "./lists";

/**
 * Días enteros entre hoy (UTC, hora 0) y la fecha objetivo (UTC, hora 0).
 * Devuelve negativo si la fecha ya pasó.
 */
function daysFromTodayUTC(target: Date): number {
  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const t = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate(),
  );
  return Math.round((t - today) / 86_400_000);
}

const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/**
 * Date (UTC, hora 0) de month/day en `year`, con el mismo fallback
 * 29-feb→28-feb en años no bisiestos que `src/lib/dates.ts`. Sin él,
 * `Date.UTC(year, 1, 29)` rueda al 1-mar y el recordatorio de un cumpleaños
 * 29-feb se programaría/etiquetaría un día tarde respecto a la cuenta atrás
 * que ve el usuario en la app.
 */
function occurrenceInYearUTC(year: number, month: number, day: number): Date {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return new Date(Date.UTC(year, 1, 28));
  }
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Para una fecha importante, calcula `{ daysUntil, occurrenceYear }` de la
 * próxima ocurrencia. Devuelve null si no hay (no recurrente y ya pasó).
 *
 * - No recurrente: usa `year` literal. Si no hay year o ya pasó → null.
 * - Recurrente (default): usa el próximo aniversario futuro de (mes/día).
 *   Si el aniversario de este año ya pasó, salta al siguiente.
 */
function nextOccurrence(
  date: Doc<"importantDates">,
): { daysUntil: number; occurrenceYear: number } | null {
  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  if (date.recurring === false) {
    if (date.year === undefined) return null;
    const target = occurrenceInYearUTC(date.year, date.month, date.day);
    const daysUntil = daysFromTodayUTC(target);
    if (daysUntil < 0) return null;
    return { daysUntil, occurrenceYear: date.year };
  }

  const thisYear = todayUTC.getUTCFullYear();
  let target = occurrenceInYearUTC(thisYear, date.month, date.day);
  let occurrenceYear = thisYear;
  if (daysFromTodayUTC(target) < 0) {
    occurrenceYear = thisYear + 1;
    target = occurrenceInYearUTC(occurrenceYear, date.month, date.day);
  }
  return { daysUntil: daysFromTodayUTC(target), occurrenceYear };
}

export type EventToNotify = {
  dateId: Id<"importantDates">;
  personId: Id<"people">;
  occurrenceYear: number;
  label: string;
  personName: string;
  personAvatarUrl?: string;
  month: number;
  day: number;
  daysUntil: number;
  /** Elementos sin marcar en las listas que el destinatario asoció a esta
   * persona («Mi lista», decisión 18). Ausente si no hay ninguno. */
  listUnclaimed?: number;
};

export type UserToNotify = {
  clerkUserId: string;
  email: string;
  events: EventToNotify[];
};

export const findEventsNeedingEmail = internalQuery({
  args: {},
  handler: async (ctx): Promise<UserToNotify[]> => {
    const allSettings = await ctx.db.query("userSettings").collect();
    const targets = allSettings.filter(
      (s) =>
        s.emailNotificationsEnabled === true &&
        typeof s.email === "string" &&
        s.email.length > 0 &&
        s.emailNotifyDaysBefore !== undefined,
    );

    const result: UserToNotify[] = [];

    for (const s of targets) {
      // Backward-compat: docs antiguos guardan número, nuevos array.
      const raw = s.emailNotifyDaysBefore as number | number[];
      const leadDays = typeof raw === "number" ? [raw] : raw;
      if (leadDays.length === 0) continue;
      const people = await ctx.db
        .query("people")
        .withIndex("by_user", (q) => q.eq("clerkUserId", s.clerkUserId))
        .collect();

      const events: EventToNotify[] = [];
      for (const person of people) {
        const dates = await ctx.db
          .query("importantDates")
          .withIndex("by_person", (q) => q.eq("personId", person._id))
          .collect();
        for (const date of dates) {
          const next = nextOccurrence(date);
          if (next === null) continue;
          if (!leadDays.includes(next.daysUntil)) continue;

          // Dedupe por (dateId, year, leadDays). Un aviso a 14 días no debe
          // bloquear el de 7 días para la misma ocurrencia.
          const already = await ctx.db
            .query("emailNotifications")
            .withIndex("by_date_year_lead", (q) =>
              q
                .eq("importantDateId", date._id)
                .eq("occurrenceYear", next.occurrenceYear)
                .eq("leadDays", next.daysUntil),
            )
            .unique();
          if (already) continue;

          // Solo la cifra, y solo de las listas que este usuario asoció a la
          // persona: el correo nunca lleva títulos de la lista de nadie.
          const listUnclaimed = await countUnclaimedForReader(
            ctx,
            person._id,
            s.clerkUserId,
          );

          events.push({
            dateId: date._id,
            personId: person._id,
            occurrenceYear: next.occurrenceYear,
            label: date.label,
            personName: person.name,
            personAvatarUrl: person.avatarUrl,
            month: date.month,
            day: date.day,
            daysUntil: next.daysUntil,
            ...(listUnclaimed > 0 ? { listUnclaimed } : {}),
          });
        }
      }

      if (events.length > 0) {
        result.push({
          clerkUserId: s.clerkUserId,
          email: s.email as string,
          events,
        });
      }
    }

    return result;
  },
});

export const markEmailsSent = internalMutation({
  args: {
    clerkUserId: v.string(),
    items: v.array(
      v.object({
        dateId: v.id("importantDates"),
        occurrenceYear: v.number(),
        leadDays: v.number(),
      }),
    ),
  },
  handler: async (ctx, { clerkUserId, items }) => {
    const sentAt = Date.now();
    for (const item of items) {
      await ctx.db.insert("emailNotifications", {
        clerkUserId,
        importantDateId: item.dateId,
        occurrenceYear: item.occurrenceYear,
        leadDays: item.leadDays,
        sentAt,
      });
    }
  },
});

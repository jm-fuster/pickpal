import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { ActionCtx, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import {
  countMarkedByManager,
  countMarkedByReader,
  countUnclaimedForManager,
  countUnclaimedForReader,
} from "./lists";
import { peopleWithAccess } from "./personShares";

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
  /** El día en que cae esta vez: un 29-feb en un año que no es bisiesto, el 28,
   * como la cuenta atrás de la app. */
  month: number;
  day: number;
  daysUntil: number;
  /** Elementos sin marcar en las listas que el destinatario asoció a esta
   * persona («Mi lista», decisión 18). Ausente si no hay ninguno. */
  listUnclaimed?: number;
  /** Elementos de esas mismas listas que el destinatario tiene marcados con
   * «Lo regalo yo» y aún no ha dado por regalados. Solo los suyos, nunca los
   * de otros lectores. Ausente si no hay ninguno. */
  listMine?: number;
};

export type UserToNotify = {
  clerkUserId: string;
  email: string;
  events: EventToNotify[];
};

/** Quien tiene los avisos encendidos, con su correo y con cuántos días antes. */
type NotificationTarget = { clerkUserId: string; email: string; leadDays: number[] };

// Ajustes leídos por consulta. Cada consulta de Convex tiene un tope de
// lecturas; hasta el 4-nov-2026 el cron lo hacía todo en una sola, para todos
// los usuarios a la vez, y con unos 300 con avisos y una docena de fichas cada
// uno la pasaba: fallaba entera y no salía ningún correo, ningún día.
const TARGETS_PAGE = 200;

/** Una página de `userSettings`, ya filtrada a quien tiene los avisos encendidos. */
export const notificationTargetsPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("userSettings").paginate(paginationOpts);
    const targets: NotificationTarget[] = [];
    for (const s of page.page) {
      if (
        s.emailNotificationsEnabled !== true ||
        typeof s.email !== "string" ||
        s.email.length === 0 ||
        s.emailNotifyDaysBefore === undefined
      ) {
        continue;
      }
      // Backward-compat: docs antiguos guardan número, nuevos array.
      const raw = s.emailNotifyDaysBefore as number | number[];
      const leadDays = typeof raw === "number" ? [raw] : raw;
      if (leadDays.length === 0) continue;
      targets.push({ clerkUserId: s.clerkUserId, email: s.email, leadDays });
    }
    return { targets, isDone: page.isDone, continueCursor: page.continueCursor };
  },
});

/**
 * A quién hay que avisar hoy y de qué: una consulta por página de ajustes y
 * otra por usuario, cada una con su propio tope de lecturas. Si la de un
 * usuario falla, se apunta y se sigue con los demás.
 */
export async function forEachUserToNotify(
  ctx: ActionCtx,
  fn: (user: UserToNotify) => Promise<void>,
) {
  let cursor: string | null = null;
  for (;;) {
    const page: { targets: NotificationTarget[]; isDone: boolean; continueCursor: string } =
      await ctx.runQuery(internal.notifications.notificationTargetsPage, {
        paginationOpts: { numItems: TARGETS_PAGE, cursor },
      });
    for (const target of page.targets) {
      let user: UserToNotify | null;
      try {
        user = await ctx.runQuery(internal.notifications.findEventsForUser, target);
      } catch (err) {
        console.error(`[emails] No se pudieron calcular los avisos de ${target.clerkUserId}:`, err);
        continue;
      }
      if (user) await fn(user);
    }
    if (page.isDone) return;
    cursor = page.continueCursor;
  }
}

/** Todo lo que saldría hoy, junto. Para los tests y para mirarlo a mano. */
export const findEventsNeedingEmail = internalAction({
  args: {},
  handler: async (ctx): Promise<UserToNotify[]> => {
    const users: UserToNotify[] = [];
    await forEachUserToNotify(ctx, async (user) => {
      users.push(user);
    });
    return users;
  },
});

export const findEventsForUser = internalQuery({
  args: { clerkUserId: v.string(), email: v.string(), leadDays: v.array(v.number()) },
  handler: async (ctx, s): Promise<UserToNotify | null> => {
    const { leadDays } = s;
    // Sus fichas y las que le han compartido: quien tiene acceso a una ficha
    // recibe los avisos de sus fechas con sus propios ajustes, en el mismo
    // correo del día que los de las suyas (docs/email-notifications.md,
    // «Fichas compartidas»).
    const people = await peopleWithAccess(ctx, s.clerkUserId);

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

        // Dedupe por destinatario y (dateId, year, leadDays). El aviso que
        // recibió la dueña no tapa el del invitado, y uno a 14 días no
        // bloquea el de 7 para la misma ocurrencia. `first` y no `unique`:
        // una fila repetida no debe tumbar el cron de todos.
        const already = await ctx.db
          .query("emailNotifications")
          .withIndex("by_user_date_year_lead", (q) =>
            q
              .eq("clerkUserId", s.clerkUserId)
              .eq("importantDateId", date._id)
              .eq("occurrenceYear", next.occurrenceYear)
              .eq("leadDays", next.daysUntil),
          )
          .first();
        if (already) continue;

        // Solo las cifras, y solo de las listas que este usuario asoció a la
        // persona, cada una por su permiso: si la abuela guarda en la ficha
        // de Lucía la lista de Lucía, cuenta esa y no la propia de Marta.
        // Quien lleva una lista a cargo suma además la suya, la que asoció a
        // esa ficha (`managedLists.personId`). El correo nunca lleva títulos
        // de la lista de nadie.
        const listUnclaimed =
          (await countUnclaimedForReader(ctx, person._id, s.clerkUserId)) +
          (await countUnclaimedForManager(ctx, person._id, s.clerkUserId));
        const listMine =
          (await countMarkedByReader(ctx, person._id, s.clerkUserId)) +
          (await countMarkedByManager(ctx, person._id, s.clerkUserId));

        const on = occurrenceInYearUTC(next.occurrenceYear, date.month, date.day);
        events.push({
          dateId: date._id,
          personId: person._id,
          occurrenceYear: next.occurrenceYear,
          label: date.label,
          personName: person.name,
          personAvatarUrl: person.avatarUrl,
          month: on.getUTCMonth() + 1,
          day: on.getUTCDate(),
          daysUntil: next.daysUntil,
          ...(listUnclaimed > 0 ? { listUnclaimed } : {}),
          ...(listMine > 0 ? { listMine } : {}),
        });
      }
    }

    if (events.length === 0) return null;
    return { clerkUserId: s.clerkUserId, email: s.email, events };
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

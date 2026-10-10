import { computeDaysUntil } from "./dates";

/**
 * Agrupar las ideas guardadas de una ficha por ocasión, y la lista de destinos
 * de «Mover a otra ocasión» (docs/encargo-ocasiones.md, decisiones 7–11). Una
 * ocasión es un evento de la ficha; la idea apunta a él por `importantDateId`
 * y, sin evento, está en «Sin ocasión».
 */

export type EventLike<Id extends string = string> = {
  _id: Id;
  label: string;
  month: number;
  day: number;
  year?: number;
  recurring?: boolean;
};

export type IdeaLike<DateId extends string = string> = {
  _creationTime: number;
  importantDateId?: DateId;
};

export type SavedIdeaGroup<I, E> =
  | { kind: "event"; event: E; past: boolean; ideas: I[] }
  | { kind: "none"; ideas: I[] };

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «25 dic»; los eventos únicos llevan el año: «26 sep 2026». */
export function formatEventDate(event: Pick<EventLike, "month" | "day" | "year" | "recurring">): string {
  const base = `${event.day} ${MONTHS_SHORT[event.month - 1]}`;
  return event.recurring === false && event.year !== undefined ? `${base} ${event.year}` : base;
}

/** Los eventos que aún van a llegar, del más cercano al más lejano; empates por nombre. */
function upcoming<E extends EventLike>(events: readonly E[], from: Date): E[] {
  return events
    .map((event) => ({ event, days: computeDaysUntil(event, from) }))
    .filter((e): e is { event: E; days: number } => e.days !== null)
    .sort((a, b) => a.days - b.days || a.event.label.localeCompare(b.event.label, "es"))
    .map((e) => e.event);
}

/** Fecha real de un evento único, para ordenar los que ya pasaron. */
function onceTime(event: EventLike): number {
  return new Date(event.year ?? 0, event.month - 1, event.day).getTime();
}

/**
 * Grupos de la tarjeta «Ideas guardadas»: solo las ocasiones que tienen ideas.
 * Primero los eventos que vienen, por cercanía; después los únicos que ya
 * pasaron, del más reciente al más antiguo; «Sin ocasión», al final. Dentro de
 * cada grupo, la idea más nueva primero. Una idea que apunta a un evento que
 * ya no está en la ficha cae en «Sin ocasión».
 */
export function groupSavedIdeas<I extends IdeaLike<E["_id"]>, E extends EventLike>(
  ideas: readonly I[],
  events: readonly E[],
  from: Date = new Date(),
): SavedIdeaGroup<I, E>[] {
  const byEvent = new Map<E["_id"], I[]>();
  const none: I[] = [];
  const known = new Set(events.map((e) => e._id));
  for (const idea of ideas) {
    const id = idea.importantDateId;
    if (id !== undefined && known.has(id)) {
      const list = byEvent.get(id) ?? [];
      list.push(idea);
      byEvent.set(id, list);
    } else {
      none.push(idea);
    }
  }
  const newestFirst = (list: I[]) => [...list].sort((a, b) => b._creationTime - a._creationTime);

  const withIdeas = events.filter((e) => byEvent.has(e._id));
  const next = upcoming(withIdeas, from);
  const nextIds = new Set(next.map((e) => e._id));
  const past = withIdeas
    .filter((e) => !nextIds.has(e._id))
    .sort((a, b) => onceTime(b) - onceTime(a));

  const groups: SavedIdeaGroup<I, E>[] = [
    ...next.map((event) => ({ kind: "event" as const, event, past: false, ideas: newestFirst(byEvent.get(event._id)!) })),
    ...past.map((event) => ({ kind: "event" as const, event, past: true, ideas: newestFirst(byEvent.get(event._id)!) })),
  ];
  if (none.length > 0) groups.push({ kind: "none", ideas: newestFirst(none) });
  return groups;
}

export type MoveDestination<E> = { kind: "event"; event: E } | { kind: "none" };

/**
 * Destinos de «Mover a otra ocasión»: los eventos que aún van a llegar, en el
 * orden de la tarjeta, y «Sin ocasión». Nunca el sitio donde ya está la idea,
 * ni los eventos únicos que ya pasaron (decidido el 10-oct-2026).
 */
export function moveDestinations<E extends EventLike>(
  events: readonly E[],
  current: E["_id"] | undefined,
  from: Date = new Date(),
): MoveDestination<E>[] {
  const list: MoveDestination<E>[] = upcoming(events, from)
    .filter((e) => e._id !== current)
    .map((event) => ({ kind: "event", event }));
  const inKnownEvent = current !== undefined && events.some((e) => e._id === current);
  if (inKnownEvent) list.push({ kind: "none" });
  return list;
}

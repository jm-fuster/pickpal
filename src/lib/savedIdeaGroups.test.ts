import { describe, expect, it } from "vitest";
import { formatEventDate, groupSavedIdeas, moveDestinations } from "./savedIdeaGroups";

const TODAY = new Date(2026, 9, 10); // 10 oct 2026

const navidad = { _id: "navidad", label: "Navidad", month: 12, day: 25 };
const cumple = { _id: "cumple", label: "Cumpleaños", month: 6, day: 24 };
const aniversario = { _id: "aniv", label: "Nuestro aniversario", month: 9, day: 10 };
const graduacion = { _id: "grad", label: "Graduación del máster", month: 9, day: 26, year: 2026, recurring: false };
const boda = { _id: "boda", label: "Boda de Lucía", month: 5, day: 2, year: 2026, recurring: false };
const events = [aniversario, cumple, graduacion, navidad, boda];

const idea = (id: string, t: number, importantDateId?: string) => ({ id, _creationTime: t, importantDateId });

describe("groupSavedIdeas", () => {
  it("ordena por la próxima fecha, con los únicos pasados y «Sin ocasión» al final", () => {
    const groups = groupSavedIdeas(
      [idea("a", 1, "cumple"), idea("b", 2, "navidad"), idea("c", 3), idea("d", 4, "grad")],
      events,
      TODAY,
    );
    expect(groups.map((g) => (g.kind === "none" ? "Sin ocasión" : g.event.label))).toEqual([
      "Navidad",
      "Cumpleaños",
      "Graduación del máster",
      "Sin ocasión",
    ]);
    expect(groups.map((g) => g.kind === "event" && g.past)).toEqual([false, false, true, false]);
  });

  it("solo saca las ocasiones que tienen ideas", () => {
    const groups = groupSavedIdeas([idea("a", 1, "navidad")], events, TODAY);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: "event", event: navidad });
  });

  it("dentro de cada grupo, la idea más nueva primero", () => {
    const [g] = groupSavedIdeas(
      [idea("vieja", 1, "navidad"), idea("nueva", 9, "navidad"), idea("media", 5, "navidad")],
      events,
      TODAY,
    );
    expect(g.ideas.map((i) => i.id)).toEqual(["nueva", "media", "vieja"]);
  });

  it("desempata por nombre los eventos del mismo día", () => {
    const reyes = { _id: "r", label: "Aniversario", month: 12, day: 25 };
    const groups = groupSavedIdeas([idea("a", 1, "navidad"), idea("b", 2, "r")], [navidad, reyes], TODAY);
    expect(groups.map((g) => g.kind === "event" && g.event.label)).toEqual(["Aniversario", "Navidad"]);
  });

  it("ordena los únicos pasados del más reciente al más antiguo", () => {
    const groups = groupSavedIdeas([idea("a", 1, "boda"), idea("b", 2, "grad")], events, TODAY);
    expect(groups.map((g) => g.kind === "event" && g.event.label)).toEqual(["Graduación del máster", "Boda de Lucía"]);
  });

  it("manda a «Sin ocasión» una idea cuyo evento ya no está en la ficha", () => {
    const groups = groupSavedIdeas([idea("a", 1, "borrado")], events, TODAY);
    expect(groups).toEqual([{ kind: "none", ideas: [idea("a", 1, "borrado")] }]);
  });

  it("hoy cuenta como fecha que viene, no como pasada", () => {
    const hoy = { _id: "hoy", label: "Santo", month: 10, day: 10, year: 2026, recurring: false };
    const [g] = groupSavedIdeas([idea("a", 1, "hoy")], [hoy], TODAY);
    expect(g).toMatchObject({ kind: "event", past: false });
  });
});

describe("moveDestinations", () => {
  const label = (d: ReturnType<typeof moveDestinations>[number]) =>
    d.kind === "none" ? "Sin ocasión" : d.event.label;

  it("ofrece los eventos que vienen y «Sin ocasión», sin el actual ni los únicos pasados", () => {
    expect(moveDestinations(events, "navidad", TODAY).map(label)).toEqual([
      "Cumpleaños",
      "Nuestro aniversario",
      "Sin ocasión",
    ]);
  });

  it("desde «Sin ocasión» no se ofrece «Sin ocasión»", () => {
    expect(moveDestinations(events, undefined, TODAY).map(label)).toEqual([
      "Navidad",
      "Cumpleaños",
      "Nuestro aniversario",
    ]);
  });

  it("desde un evento único pasado se puede salir a cualquiera y a «Sin ocasión»", () => {
    expect(moveDestinations(events, "grad", TODAY).map(label)).toEqual([
      "Navidad",
      "Cumpleaños",
      "Nuestro aniversario",
      "Sin ocasión",
    ]);
  });
});

describe("formatEventDate", () => {
  it("da día y mes, y el año solo en los únicos", () => {
    expect(formatEventDate(navidad)).toBe("25 dic");
    expect(formatEventDate(graduacion)).toBe("26 sep 2026");
  });
});

/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// Ideas guardadas agrupadas por ocasión (docs/encargo-ocasiones.md). La idea
// apunta al evento por id; estos tests cubren lo que toca datos: la migración
// que vincula las ideas viejas por nombre, mover entre eventos (sobre todo que
// el destino sea de la misma persona), guardar sin duplicar entre ocasiones y
// borrar un evento.

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const ALICE = { subject: "user_alice", issuer: "https://test.clerk.dev" };
const BOB = { subject: "user_bob", issuer: "https://test.clerk.dev" };
const CAROL = { subject: "user_carol", issuer: "https://test.clerk.dev" };

const IDEA = {
  title: "Rodillo de cerámica",
  description: "Para su taller",
  priceMinEuros: 30,
  priceMaxEuros: 45,
  category: "ceramica",
  amazonQuery: "rodillo ceramica",
};

type T = ReturnType<typeof convexTest>;

async function persona(t: T, who = ALICE, name = "Marta") {
  return t.withIdentity(who).mutation(api.people.create, {
    name,
    relationship: "family",
    interests: ["cerámica"],
  });
}

async function evento(t: T, personId: Id<"people">, label: string, who = ALICE) {
  return t.withIdentity(who).mutation(api.importantDates.create, {
    personId,
    label,
    month: 12,
    day: 25,
  });
}

/** Una idea guardada como las de antes del vínculo: solo con el nombre. */
async function ideaVieja(t: T, personId: Id<"people">, occasionLabel: string, title = IDEA.title) {
  return t.run((ctx) =>
    ctx.db.insert("savedIdeas", { clerkUserId: ALICE.subject, personId, occasionLabel, ...IDEA, title }),
  );
}

const leer = (t: T, id: Id<"savedIdeas">) => t.run((ctx) => ctx.db.get(id));

describe("migración: vincular ideas viejas con su evento", () => {
  test("vincula por nombre exacto y por nombre con otras mayúsculas o espacios", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const navidad = await evento(t, personId, "Navidad");
    const exacta = await ideaVieja(t, personId, "Navidad", "Uno");
    const normalizada = await ideaVieja(t, personId, "  navidad ", "Dos");

    const res = await t.mutation(internal.migrations.linkSavedIdeasToEvents, { dryRun: false });

    expect(res).toMatchObject({ total: 2, linked: 2, noEvent: 0, ambiguous: 0 });
    expect((await leer(t, exacta))?.importantDateId).toBe(navidad);
    expect((await leer(t, normalizada))?.importantDateId).toBe(navidad);
  });

  test("deja en «Sin ocasión» las que no encuentran evento y las ambiguas", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    await evento(t, personId, "Cumpleaños");
    // Dos eventos con el mismo nombre normalizado, de antes de la regla de
    // unicidad: se insertan a mano porque `create` ya no lo permite.
    await t.run(async (ctx) => {
      await ctx.db.insert("importantDates", { personId, label: "Boda", month: 6, day: 1 });
      await ctx.db.insert("importantDates", { personId, label: "boda", month: 6, day: 2 });
    });
    const renombrada = await ideaVieja(t, personId, "Cumple", "Uno");
    const ambigua = await ideaVieja(t, personId, "Boda", "Dos");

    const res = await t.mutation(internal.migrations.linkSavedIdeasToEvents, { dryRun: false });

    expect(res).toMatchObject({ linked: 0, noEvent: 1, ambiguous: 1 });
    expect((await leer(t, renombrada))?.importantDateId).toBeUndefined();
    expect((await leer(t, ambigua))?.importantDateId).toBeUndefined();
  });

  test("ejecutarla dos veces no cambia nada, y el dry run no escribe", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    await evento(t, personId, "Navidad");
    const id = await ideaVieja(t, personId, "Navidad");

    const seco = await t.mutation(internal.migrations.linkSavedIdeasToEvents, { dryRun: true });
    expect(seco).toMatchObject({ linked: 1 });
    expect((await leer(t, id))?.importantDateId).toBeUndefined();

    await t.mutation(internal.migrations.linkSavedIdeasToEvents, { dryRun: false });
    const segunda = await t.mutation(internal.migrations.linkSavedIdeasToEvents, { dryRun: false });
    expect(segunda).toMatchObject({ linked: 0, alreadyLinked: 1 });
  });

  test("cuenta las ideas repetidas por persona y título, sin fusionarlas", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    await evento(t, personId, "Navidad");
    await evento(t, personId, "Cumpleaños");
    await ideaVieja(t, personId, "Navidad");
    await ideaVieja(t, personId, "Cumpleaños");

    const res = await t.mutation(internal.migrations.linkSavedIdeasToEvents, { dryRun: false });
    expect(res).toMatchObject({ total: 2, linked: 2, duplicatePairs: 1 });
  });
});

describe("mover una idea", () => {
  async function montar(t: T) {
    const personId = await persona(t);
    const navidad = await evento(t, personId, "Navidad");
    const cumple = await evento(t, personId, "Cumpleaños");
    const id = await t.withIdentity(ALICE).mutation(api.savedIdeas.save, {
      personId,
      occasionLabel: "Navidad",
      importantDateId: navidad,
      ...IDEA,
    });
    return { personId, navidad, cumple, id };
  }

  test("el dueño la mueve a otro evento y a «Sin ocasión»", async () => {
    const t = convexTest(schema, modules);
    const { cumple, id } = await montar(t);

    await t.withIdentity(ALICE).mutation(api.savedIdeas.move, { id, importantDateId: cumple });
    expect((await leer(t, id))?.importantDateId).toBe(cumple);

    await t.withIdentity(ALICE).mutation(api.savedIdeas.move, { id, importantDateId: null });
    expect((await leer(t, id))?.importantDateId).toBeUndefined();
  });

  test("un invitado de la ficha también puede moverla", async () => {
    const t = convexTest(schema, modules);
    const { personId, cumple, id } = await montar(t);
    await t.withIdentity(ALICE).mutation(api.personShares.invite, { personId, clerkUserId: BOB.subject });

    await t.withIdentity(BOB).mutation(api.savedIdeas.move, { id, importantDateId: cumple });
    expect((await leer(t, id))?.importantDateId).toBe(cumple);
  });

  test("un tercero no puede", async () => {
    const t = convexTest(schema, modules);
    const { navidad, cumple, id } = await montar(t);

    await expect(
      t.withIdentity(CAROL).mutation(api.savedIdeas.move, { id, importantDateId: cumple }),
    ).rejects.toThrow("No autorizado");
    expect((await leer(t, id))?.importantDateId).toBe(navidad);
  });

  test("un evento de otra persona se rechaza aunque quien mueve tenga las dos fichas", async () => {
    const t = convexTest(schema, modules);
    const { navidad, id } = await montar(t);
    const padre = await persona(t, ALICE, "Luis");
    const cumpleDelPadre = await evento(t, padre, "Cumpleaños");

    await expect(
      t.withIdentity(ALICE).mutation(api.savedIdeas.move, { id, importantDateId: cumpleDelPadre }),
    ).rejects.toThrow("No autorizado");
    expect((await leer(t, id))?.importantDateId).toBe(navidad);
  });
});

describe("guardar desde el generador", () => {
  test("vincula la idea al evento y guarda su nombre como foto", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const navidad = await evento(t, personId, "Navidad");

    const id = await t.withIdentity(ALICE).mutation(api.savedIdeas.save, {
      personId,
      occasionLabel: "Navidad",
      importantDateId: navidad,
      ...IDEA,
    });
    expect(await leer(t, id)).toMatchObject({ importantDateId: navidad, occasionLabel: "Navidad" });
  });

  test("la misma idea desde otra ocasión no crea fila, no la mueve ni consume cuota", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const navidad = await evento(t, personId, "Navidad");
    const cumple = await evento(t, personId, "Cumpleaños");
    const alice = t.withIdentity(ALICE);

    const primera = await alice.mutation(api.savedIdeas.save, {
      personId,
      occasionLabel: "Navidad",
      importantDateId: navidad,
      ...IDEA,
    });
    const segunda = await alice.mutation(api.savedIdeas.save, {
      personId,
      occasionLabel: "Cumpleaños",
      importantDateId: cumple,
      ...IDEA,
    });

    expect(segunda).toBe(primera);
    const ideas = await alice.query(api.savedIdeas.getByPerson, { personId });
    expect(ideas).toHaveLength(1);
    expect(ideas[0].importantDateId).toBe(navidad);
    const cubo = await t.run((ctx) =>
      ctx.db
        .query("rateLimitBuckets")
        .filter((q) => q.eq(q.field("bucket"), "save_idea"))
        .first(),
    );
    expect(cubo?.count).toBe(1);
  });

  test("un evento de otra persona se rechaza", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const padre = await persona(t, ALICE, "Luis");
    const cumpleDelPadre = await evento(t, padre, "Cumpleaños");

    await expect(
      t.withIdentity(ALICE).mutation(api.savedIdeas.save, {
        personId,
        occasionLabel: "Cumpleaños",
        importantDateId: cumpleDelPadre,
        ...IDEA,
      }),
    ).rejects.toThrow("No autorizado");
  });

  test("sin id de evento (un cliente anterior) lo busca por nombre", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const navidad = await evento(t, personId, "Navidad");

    const id = await t.withIdentity(ALICE).mutation(api.savedIdeas.save, {
      personId,
      occasionLabel: "navidad",
      ...IDEA,
    });
    expect(await leer(t, id)).toMatchObject({ importantDateId: navidad, occasionLabel: "Navidad" });
  });
});

describe("borrar un evento", () => {
  test("sus ideas pasan a «Sin ocasión» y las de otros eventos no se tocan", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const navidad = await evento(t, personId, "Navidad");
    const cumple = await evento(t, personId, "Cumpleaños");
    const alice = t.withIdentity(ALICE);
    const deNavidad = await alice.mutation(api.savedIdeas.save, {
      personId,
      occasionLabel: "Navidad",
      importantDateId: navidad,
      ...IDEA,
    });
    const deCumple = await alice.mutation(api.savedIdeas.save, {
      personId,
      occasionLabel: "Cumpleaños",
      importantDateId: cumple,
      ...IDEA,
      title: "Otra idea",
    });

    await alice.mutation(api.importantDates.remove, { id: navidad });

    expect(await leer(t, deNavidad)).toMatchObject({ title: IDEA.title });
    expect((await leer(t, deNavidad))?.importantDateId).toBeUndefined();
    expect((await leer(t, deCumple))?.importantDateId).toBe(cumple);
  });
});

describe("exportar los datos", () => {
  test("cada idea guardada sale con el nombre actual de su ocasión, o «Sin ocasión»", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const navidad = await evento(t, personId, "Navidad");
    const alice = t.withIdentity(ALICE);
    await alice.mutation(api.savedIdeas.save, {
      personId,
      occasionLabel: "Navidad",
      importantDateId: navidad,
      ...IDEA,
    });
    const suelta = await alice.mutation(api.savedIdeas.save, {
      personId,
      occasionLabel: "Navidad",
      importantDateId: navidad,
      ...IDEA,
      title: "Otra idea",
    });
    await alice.mutation(api.savedIdeas.move, { id: suelta, importantDateId: null });
    await alice.mutation(api.importantDates.update, { id: navidad, label: "Navidad en casa" });

    const exportacion = await alice.query(api.exportData.mine, {});
    const ideas = exportacion.seresQueridos[0].ideasGuardadas;
    expect(ideas.map((i) => [i.title, i.ocasion]).sort()).toEqual([
      ["Otra idea", "Sin ocasión"],
      ["Rodillo de cerámica", "Navidad en casa"],
    ]);
    expect(ideas.every((i) => !("importantDateId" in i))).toBe(true);
  });
});

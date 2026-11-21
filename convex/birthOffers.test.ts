/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// La ficha del bebé (convex/birthOffers.ts): qué nacimientos están pendientes,
// «Ahora no» en la agenda y en la ficha, y crear la ficha. Sobre todo, que
// solo el dueño de la ficha del nacimiento puede responder.

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const ALICE = { subject: "user_alice", issuer: "https://test.clerk.dev" };
const BOB = { subject: "user_bob", issuer: "https://test.clerk.dev" };

type T = ReturnType<typeof convexTest>;

async function julian(t: T) {
  const personId = await t.withIdentity(ALICE).mutation(api.people.create, {
    name: "Julián Vega",
    relationship: "family",
    interests: ["cine"],
  });
  const add = (label: string, recurring?: boolean, year?: number) =>
    t.withIdentity(ALICE).mutation(api.importantDates.create, { personId, label, month: 9, day: 2, year, recurring });
  const birth = await add("Nacimiento de Leo", false, 2026);
  await add("Cumpleaños");
  await add("Boda", false, 2026);
  return { personId, birth };
}

const read = (t: T, id: Id<"importantDates">) => t.run((ctx) => ctx.db.get(id));

describe("pending", () => {
  test("solo los nacimientos sin responder de tus fichas, con el nombre del bebé", async () => {
    const t = convexTest(schema, modules);
    const { birth } = await julian(t);
    const res = await t.withIdentity(ALICE).query(api.birthOffers.pending, {});
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ importantDateId: birth, personName: "Julián Vega", relationship: "family", babyName: "Leo" });
  });

  test("no los ve quien tiene la ficha compartida", async () => {
    const t = convexTest(schema, modules);
    const { personId } = await julian(t);
    await t.run((ctx) => ctx.db.insert("personShares", { personId, clerkUserId: BOB.subject, role: "invitee" }));
    expect(await t.withIdentity(BOB).query(api.birthOffers.pending, {})).toEqual([]);
  });
});

describe("answer", () => {
  test("«Ahora no» en la agenda la saca de pendientes; en la ficha, para siempre", async () => {
    const t = convexTest(schema, modules);
    const { birth } = await julian(t);
    await t.withIdentity(ALICE).mutation(api.birthOffers.answer, { importantDateId: birth, answer: "hidden" });
    expect((await read(t, birth))?.birthOffer).toBe("hidden");
    expect(await t.withIdentity(ALICE).query(api.birthOffers.pending, {})).toEqual([]);
    await t.withIdentity(ALICE).mutation(api.birthOffers.answer, { importantDateId: birth, answer: "dismissed" });
    await t.withIdentity(ALICE).mutation(api.birthOffers.answer, { importantDateId: birth, answer: "hidden" });
    expect((await read(t, birth))?.birthOffer).toBe("dismissed");
  });

  test("ni un invitado ni otro usuario pueden responder", async () => {
    const t = convexTest(schema, modules);
    const { personId, birth } = await julian(t);
    await t.run((ctx) => ctx.db.insert("personShares", { personId, clerkUserId: BOB.subject, role: "invitee" }));
    await expect(
      t.withIdentity(BOB).mutation(api.birthOffers.answer, { importantDateId: birth, answer: "dismissed" }),
    ).rejects.toThrow(/Evento no encontrado/);
  });

  test("no vale en un evento que no es un nacimiento", async () => {
    const t = convexTest(schema, modules);
    const { personId } = await julian(t);
    const dates = await t.run((ctx) =>
      ctx.db.query("importantDates").withIndex("by_person", (q) => q.eq("personId", personId)).collect(),
    );
    const boda = dates.find((d) => d.label === "Boda")!;
    await expect(
      t.withIdentity(ALICE).mutation(api.birthOffers.answer, { importantDateId: boda._id, answer: "hidden" }),
    ).rejects.toThrow(/no es un nacimiento/);
  });
});

describe("createProfile", () => {
  const leo = { name: " Leo ", relationship: "family", month: 9, day: 3, year: 2026 };

  test("crea la ficha con su cumpleaños anual y cierra la oferta", async () => {
    const t = convexTest(schema, modules);
    const { birth } = await julian(t);
    const id = await t.withIdentity(ALICE).mutation(api.birthOffers.createProfile, { importantDateId: birth, ...leo });
    const person = await t.run((ctx) => ctx.db.get(id));
    expect(person).toMatchObject({ name: "Leo", relationship: "family", interests: [], clerkUserId: ALICE.subject });
    const dates = await t.withIdentity(ALICE).query(api.importantDates.getByPerson, { personId: id });
    expect(dates).toHaveLength(1);
    expect(dates[0]).toMatchObject({ label: "Cumpleaños", month: 9, day: 3, year: 2026, recurring: true });
    expect((await read(t, birth))?.birthOffer).toBe("created");
  });

  test("no crea dos fichas", async () => {
    const t = convexTest(schema, modules);
    const { birth } = await julian(t);
    await t.withIdentity(ALICE).mutation(api.birthOffers.createProfile, { importantDateId: birth, ...leo });
    await expect(
      t.withIdentity(ALICE).mutation(api.birthOffers.createProfile, { importantDateId: birth, ...leo }),
    ).rejects.toThrow(/Ya le hiciste su ficha/);
  });

  test("valida nombre, relación y fecha en el servidor", async () => {
    const t = convexTest(schema, modules);
    const { birth } = await julian(t);
    const as = t.withIdentity(ALICE);
    await expect(as.mutation(api.birthOffers.createProfile, { importantDateId: birth, ...leo, name: "  " })).rejects.toThrow();
    await expect(as.mutation(api.birthOffers.createProfile, { importantDateId: birth, ...leo, relationship: "boss" })).rejects.toThrow(/Relación inválida/);
    await expect(as.mutation(api.birthOffers.createProfile, { importantDateId: birth, ...leo, month: 2, day: 30 })).rejects.toThrow();
    await expect(as.mutation(api.birthOffers.createProfile, { importantDateId: birth, ...leo, year: 2999 })).rejects.toThrow();
    expect((await read(t, birth))?.birthOffer).toBeUndefined();
  });

  test("solo el dueño de la ficha del nacimiento", async () => {
    const t = convexTest(schema, modules);
    const { personId, birth } = await julian(t);
    await t.run((ctx) => ctx.db.insert("personShares", { personId, clerkUserId: BOB.subject, role: "invitee" }));
    await expect(
      t.withIdentity(BOB).mutation(api.birthOffers.createProfile, { importantDateId: birth, ...leo }),
    ).rejects.toThrow(/Evento no encontrado/);
  });
});

/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// Vaciar un campo opcional al editar. El cliente de Convex quita las claves con
// `undefined` antes de mandar los argumentos (convex-test hace lo mismo), así
// que «bórralo» tiene que viajar como otra cosa: un texto vacío en la ficha,
// `null` en el año y el presupuesto de un evento, y la entrada entera en el
// historial. Antes la app decía «Guardado» y el dato seguía ahí, también en el
// prompt de la IA.

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const ALICE = { subject: "user_alice", issuer: "https://test.clerk.dev" };

type T = ReturnType<typeof convexTest>;

async function marta(t: T) {
  return t.withIdentity(ALICE).mutation(api.people.create, {
    name: "Marta",
    relationship: "family",
    interests: ["cerámica"],
    notes: "Le encanta el mar",
    shoeSize: "38",
    clothingSize: "M",
    allergies: "Frutos secos",
    dislikes: "El amarillo",
  });
}

const leer = <Tabla extends "people" | "importantDates" | "giftHistory">(t: T, id: Id<Tabla>) =>
  t.run((ctx) => ctx.db.get(id));

describe("people.update", () => {
  test("un texto vacío o en blanco borra el campo", async () => {
    const t = convexTest(schema, modules);
    const id = await marta(t);

    await t.withIdentity(ALICE).mutation(api.people.update, {
      id,
      notes: "",
      shoeSize: "",
      clothingSize: "   ",
      allergies: "",
      dislikes: "",
    });

    const ficha = await leer(t, id);
    for (const campo of ["notes", "shoeSize", "clothingSize", "allergies", "dislikes"]) {
      expect(ficha).not.toHaveProperty(campo);
    }
  });

  test("lo que no se manda no se toca", async () => {
    const t = convexTest(schema, modules);
    const id = await marta(t);

    await t.withIdentity(ALICE).mutation(api.people.update, { id, allergies: "" });

    expect(await leer(t, id)).toMatchObject({ notes: "Le encanta el mar", shoeSize: "38" });
    expect(await leer(t, id)).not.toHaveProperty("allergies");
  });

  test("`undefined` no llega al servidor: por eso el cliente no puede usarlo para vaciar", async () => {
    const t = convexTest(schema, modules);
    const id = await marta(t);

    await t.withIdentity(ALICE).mutation(api.people.update, { id, allergies: undefined });

    expect((await leer(t, id))?.allergies).toBe("Frutos secos");
  });
});

describe("importantDates.update", () => {
  test("null quita el año y el presupuesto", async () => {
    const t = convexTest(schema, modules);
    const personId = await marta(t);
    const id = await t.withIdentity(ALICE).mutation(api.importantDates.create, {
      personId,
      label: "Cumpleaños",
      month: 9,
      day: 10,
      year: 1960,
      recurring: true,
      budgetMin: 5000,
      budgetMax: 8000,
    });

    await t.withIdentity(ALICE).mutation(api.importantDates.update, {
      id,
      year: null,
      budgetMin: null,
      budgetMax: null,
    });

    const fecha = await leer(t, id);
    expect(fecha).toMatchObject({ label: "Cumpleaños", month: 9, day: 10 });
    for (const campo of ["year", "budgetMin", "budgetMax"]) {
      expect(fecha).not.toHaveProperty(campo);
    }
  });

  test("vaciar el mínimo y bajar el máximo valida contra lo que queda, no contra lo viejo", async () => {
    const t = convexTest(schema, modules);
    const personId = await marta(t);
    const id = await t.withIdentity(ALICE).mutation(api.importantDates.create, {
      personId,
      label: "Cumpleaños",
      month: 9,
      day: 10,
      budgetMin: 5000,
      budgetMax: 8000,
    });

    await t.withIdentity(ALICE).mutation(api.importantDates.update, {
      id,
      budgetMin: null,
      budgetMax: 3000,
    });

    const fecha = await leer(t, id);
    expect(fecha?.budgetMax).toBe(3000);
    expect(fecha).not.toHaveProperty("budgetMin");
  });

  test("una fecha única no puede quedarse sin año", async () => {
    const t = convexTest(schema, modules);
    const personId = await marta(t);
    const id = await t.withIdentity(ALICE).mutation(api.importantDates.create, {
      personId,
      label: "Boda",
      month: 6,
      day: 14,
      year: 2027,
      recurring: false,
    });

    await expect(
      t.withIdentity(ALICE).mutation(api.importantDates.update, { id, year: null }),
    ).rejects.toThrow(/requieren un año/);
    expect((await leer(t, id))?.year).toBe(2027);
  });

  test("sin año, un 29 de febrero vale; con un año no bisiesto, no", async () => {
    const t = convexTest(schema, modules);
    const personId = await marta(t);
    const id = await t.withIdentity(ALICE).mutation(api.importantDates.create, {
      personId,
      label: "Cumpleaños",
      month: 2,
      day: 29,
      year: 2024,
    });

    await t.withIdentity(ALICE).mutation(api.importantDates.update, { id, year: null });
    expect(await leer(t, id)).not.toHaveProperty("year");
    await expect(
      t.withIdentity(ALICE).mutation(api.importantDates.update, { id, year: 2023 }),
    ).rejects.toThrow(/Día inválido/);
  });
});

describe("giftHistory.update", () => {
  test("un año o unas notas que no llegan se borran", async () => {
    const t = convexTest(schema, modules);
    const personId = await marta(t);
    await t.withIdentity(ALICE).mutation(api.giftHistory.create, {
      personId,
      giftName: "Libro de setas",
      occasionLabel: "Cumpleaños",
      year: 2025,
      reaction: "loved",
      notes: "Le encantó",
    });
    const [{ _id: id }] = await t.withIdentity(ALICE).query(api.giftHistory.getByPerson, { personId });

    await t.withIdentity(ALICE).mutation(api.giftHistory.update, {
      id,
      giftName: "Libro de setas",
      occasionLabel: "Cumpleaños",
      reaction: "ok",
    });

    const entrada = await leer(t, id);
    expect(entrada).toMatchObject({ giftName: "Libro de setas", reaction: "ok" });
    expect(entrada).not.toHaveProperty("year");
    expect(entrada).not.toHaveProperty("notes");
  });
});

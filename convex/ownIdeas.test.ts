/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// «Apuntar una idea» en la ficha: ideas propias, sin la IA, en la misma tabla
// que las sugerencias guardadas (`source: "own"`). Lo que importa aquí: que el
// evento sea de la misma ficha, que el enlace no pueda ser `javascript:`, que
// no se dupliquen por título y que solo pueda apuntar quien tiene la ficha.

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const ALICE = { subject: "user_alice", issuer: "https://test.clerk.dev" };
const BOB = { subject: "user_bob", issuer: "https://test.clerk.dev" };

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
    month: 9,
    day: 10,
  });
}

/** Como en lists.test.ts: convex-test no guarda el tipo de la subida, así que se apunta a mano. */
async function subir(t: T, contentType: string, size: number, relleno: number) {
  return t.run(async (ctx) => {
    const id = await ctx.storage.store(new Blob([new Uint8Array(size).fill(relleno)]));
    await ctx.db.patch(id as unknown as Id<"listItems">, { contentType } as never);
    return id;
  });
}

describe("savedIdeas.addOwn", () => {
  test("guarda una idea propia en su ocasión, con nota, enlace y precio", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const aniversario = await evento(t, personId, "Nuestro aniversario");

    const id = await t.withIdentity(ALICE).mutation(api.savedIdeas.addOwn, {
      personId,
      importantDateId: aniversario,
      title: "  Cena en el japonés de Ponzano ",
      note: "Reservar con una semana",
      url: "https://example.com/japones",
      priceCents: 7000,
    });

    const idea = await t.run((ctx) => ctx.db.get(id));
    expect(idea).toMatchObject({
      source: "own",
      title: "Cena en el japonés de Ponzano",
      description: "Reservar con una semana",
      url: "https://example.com/japones",
      priceMinEuros: 70,
      priceMaxEuros: 70,
      importantDateId: aniversario,
      occasionLabel: "Nuestro aniversario",
      category: [],
      amazonQuery: "",
    });
  });

  test("sin ocasión y sin precio", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const id = await t.withIdentity(ALICE).mutation(api.savedIdeas.addOwn, {
      personId,
      importantDateId: null,
      title: "Un plan de domingo",
    });
    const idea = await t.run((ctx) => ctx.db.get(id));
    expect(idea?.importantDateId).toBeUndefined();
    expect(idea?.priceMaxEuros).toBe(0);
    expect(idea?.description).toBe("");
  });

  test("rechaza un evento de otra ficha", async () => {
    const t = convexTest(schema, modules);
    const marta = await persona(t);
    const padre = await persona(t, ALICE, "Papá");
    const deOtra = await evento(t, padre, "Cumpleaños");
    await expect(
      t.withIdentity(ALICE).mutation(api.savedIdeas.addOwn, {
        personId: marta,
        importantDateId: deOtra,
        title: "Algo",
      }),
    ).rejects.toThrow(/No autorizado/);
  });

  test("rechaza enlaces que no son http(s)", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    await expect(
      t.withIdentity(ALICE).mutation(api.savedIdeas.addOwn, {
        personId,
        importantDateId: null,
        title: "Algo",
        url: "javascript:alert(1)",
      }),
    ).rejects.toThrow(/http/);
  });

  test("no duplica por título", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const args = { personId, importantDateId: null, title: "Vela de higo" };
    await t.withIdentity(ALICE).mutation(api.savedIdeas.addOwn, args);
    await expect(t.withIdentity(ALICE).mutation(api.savedIdeas.addOwn, args)).rejects.toThrow(
      /Ya tienes una idea/,
    );
  });

  test("con foto: se guarda, sale su dirección y se borra con la idea", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const storageId = await subir(t, "image/png", 2000, 1);
    const id = await t.withIdentity(ALICE).mutation(api.savedIdeas.addOwn, {
      personId,
      importantDateId: null,
      title: "Vela de higo",
      photoStorageId: storageId,
    });
    const [idea] = await t.withIdentity(ALICE).query(api.savedIdeas.getByPerson, { personId });
    expect(idea.photoUrl).toEqual(expect.any(String));

    await t.withIdentity(ALICE).mutation(api.savedIdeas.remove, { id });
    expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).toBeNull();
  });

  test("rechaza un archivo que no es una foto o que ya usa otra idea", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const texto = await subir(t, "text/plain", 2000, 2);
    await expect(
      t.withIdentity(ALICE).mutation(api.savedIdeas.addOwn, {
        personId,
        importantDateId: null,
        title: "Algo",
        photoStorageId: texto,
      }),
    ).rejects.toThrow(/foto no vale/);

    const foto = await subir(t, "image/jpeg", 2000, 3);
    await t.withIdentity(ALICE).mutation(api.savedIdeas.addOwn, {
      personId,
      importantDateId: null,
      title: "Una",
      photoStorageId: foto,
    });
    await expect(
      t.withIdentity(ALICE).mutation(api.savedIdeas.addOwn, {
        personId,
        importantDateId: null,
        title: "Otra",
        photoStorageId: foto,
      }),
    ).rejects.toThrow(/foto no vale/);
  });

  test("borrar la ficha borra también la foto de sus ideas", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    const foto = await subir(t, "image/webp", 2000, 4);
    await t.withIdentity(ALICE).mutation(api.savedIdeas.addOwn, {
      personId,
      importantDateId: null,
      title: "Una",
      photoStorageId: foto,
    });
    await t.withIdentity(ALICE).mutation(api.people.remove, { id: personId });
    expect(await t.run((ctx) => ctx.db.system.get("_storage", foto))).toBeNull();
  });

  test("quien no tiene la ficha no puede apuntar en ella", async () => {
    const t = convexTest(schema, modules);
    const personId = await persona(t);
    await expect(
      t.withIdentity(BOB).mutation(api.savedIdeas.addOwn, {
        personId,
        importantDateId: null,
        title: "Algo",
      }),
    ).rejects.toThrow(/No autorizado/);
  });
});

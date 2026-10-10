/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// La exportación cumple el derecho de portabilidad (RGPD art. 20), así que lo
// que se comprueba aquí no es una funcionalidad sino una promesa legal: que
// salga todo, que no salga lo de otro, y que nadie exporte una cuenta ajena.
//
// El test que más trabaja es el último: la exportación y el borrado tienen que
// recorrer las mismas tablas. Si alguien añade una tabla al borrado y se olvida
// de la exportación, o al revés, ese test falla.

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import fs from "node:fs";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const ALICE = { subject: "user_alice", issuer: "https://test.clerk.dev" };
const BOB = { subject: "user_bob", issuer: "https://test.clerk.dev" };

async function sembrar(t: ReturnType<typeof convexTest>, quien: typeof ALICE, nombre: string) {
  const u = t.withIdentity(quien);
  const personId = await u.mutation(api.people.create, {
    name: nombre,
    relationship: "family",
    interests: ["cerámica"],
    notes: "Odia los regalos con prisa",
    allergies: "Frutos secos",
  });
  await u.mutation(api.importantDates.create, {
    personId,
    label: "Cumpleaños",
    month: 3,
    day: 24,
    recurring: true,
    budgetMin: 3000,
    budgetMax: 6000,
  });
  await u.mutation(api.savedIdeas.save, {
    personId,
    occasionLabel: "Cumpleaños",
    title: "Rodillo de cerámica",
    description: "Para su taller",
    priceMinEuros: 30,
    priceMaxEuros: 45,
    category: ["ceramica"],
    amazonQuery: "rodillo ceramica",
  });
  await u.mutation(api.giftHistory.create, {
    personId,
    giftName: "Libro",
    occasionLabel: "Cumpleaños",
    year: 2025,
    reaction: "loved",
  });
  await u.mutation(api.settings.setMine, { notifyDaysBefore: 15 });
  return personId;
}

describe("qué sale en la exportación", () => {
  test("los seres queridos, con todo lo que cuelga de ellos", async () => {
    const t = convexTest(schema, modules);
    await sembrar(t, ALICE, "Marta");

    const datos = await t.withIdentity(ALICE).query(api.exportData.mine, {});

    expect(datos.seresQueridos).toHaveLength(1);
    const marta = datos.seresQueridos[0];
    expect(marta.name).toBe("Marta");
    // Los datos sensibles que el usuario escribió tienen que salir: si no,
    // la copia no sirve para llevársela a otro sitio.
    expect(marta.notes).toBe("Odia los regalos con prisa");
    expect(marta.allergies).toBe("Frutos secos");
    expect(marta.fechas).toHaveLength(1);
    expect(marta.fechas[0]).toMatchObject({ label: "Cumpleaños", month: 3, day: 24 });
    expect(marta.historialDeRegalos).toHaveLength(1);
    expect(marta.ideasGuardadas).toHaveLength(1);
  });

  test("con quién compartes, y quién te comparte a ti", async () => {
    const t = convexTest(schema, modules);
    const personId = await sembrar(t, ALICE, "Marta");
    await t.withIdentity(ALICE).mutation(api.personShares.invite, {
      personId,
      clerkUserId: BOB.subject,
    });

    const deAlice = await t.withIdentity(ALICE).query(api.exportData.mine, {});
    expect(deAlice.seresQueridos[0].compartidoCon).toMatchObject([
      { clerkUserId: BOB.subject },
    ]);
    expect(deAlice.fichasQueTeComparten).toEqual([]);

    const deBob = await t.withIdentity(BOB).query(api.exportData.mine, {});
    // Bob no es dueño: no sale en su `seresQueridos`, solo en el resumen —
    // sin volcar la ficha completa de Alice.
    expect(deBob.seresQueridos).toEqual([]);
    expect(deBob.fichasQueTeComparten).toMatchObject([{ nombre: "Marta" }]);
  });

  test("los ajustes, con el valor guardado y no el default", async () => {
    const t = convexTest(schema, modules);
    await sembrar(t, ALICE, "Marta");
    const datos = await t.withIdentity(ALICE).query(api.exportData.mine, {});
    expect(datos.ajustes).toHaveLength(1);
    expect(datos.ajustes[0].notifyDaysBefore).toBe(15);
  });

  test("una cuenta vacía devuelve una estructura vacía, no un error", async () => {
    const t = convexTest(schema, modules);
    const datos = await t.withIdentity(ALICE).query(api.exportData.mine, {});
    expect(datos.seresQueridos).toEqual([]);
    expect(datos.usuario.clerkUserId).toBe(ALICE.subject);
  });

  test("no se cuelan identificadores internos en las filas", async () => {
    const t = convexTest(schema, modules);
    await sembrar(t, ALICE, "Marta");
    const datos = await t.withIdentity(ALICE).query(api.exportData.mine, {});
    const marta = datos.seresQueridos[0] as Record<string, unknown>;
    expect(marta._id).toBeUndefined();
    expect(marta.clerkUserId).toBeUndefined();
    // Pero cuándo se creó sí es información útil y se queda.
    expect(typeof marta._creationTime).toBe("number");
  });
});

describe("de quién son los datos", () => {
  test("cada uno exporta lo suyo y nada de lo ajeno", async () => {
    const t = convexTest(schema, modules);
    await sembrar(t, ALICE, "Marta");
    await sembrar(t, BOB, "Nerea");

    const deAlice = await t.withIdentity(ALICE).query(api.exportData.mine, {});
    const deBob = await t.withIdentity(BOB).query(api.exportData.mine, {});

    expect(deAlice.seresQueridos.map((p) => p.name)).toEqual(["Marta"]);
    expect(deBob.seresQueridos.map((p) => p.name)).toEqual(["Nerea"]);
    // La prueba fuerte: el nombre del otro no aparece en ninguna parte del JSON.
    expect(JSON.stringify(deAlice)).not.toContain("Nerea");
    expect(JSON.stringify(deBob)).not.toContain("Marta");
  });

  test("sin sesión no se exporta nada", async () => {
    const t = convexTest(schema, modules);
    await sembrar(t, ALICE, "Marta");
    await expect(t.query(api.exportData.mine, {})).rejects.toThrow(
      /Sesión no encontrada/,
    );
  });
});

describe("no desincronizarse del borrado", () => {
  // account.deleteMyAccount define qué tablas son "del usuario". La
  // exportación tiene que cubrir exactamente esas. Comparar el código de los
  // dos archivos es tosco, pero detecta el olvido que importa: añadir una
  // tabla al borrado y no a la exportación deja al usuario con una copia
  // incompleta y sin que falle nada más.
  test("recorre las mismas tablas que deleteMyAccount", () => {
    const tablas = (src: string) =>
      new Set([...src.matchAll(/\.query\("(\w+)"\)/g)].map((m) => m[1]));

    const borrado = tablas(fs.readFileSync("convex/account.ts", "utf8"));
    // El borrado delega parte en deletePersonCascade, que vive en people.ts.
    const cascada = fs.readFileSync("convex/people.ts", "utf8");
    const bloqueCascada = cascada.slice(cascada.indexOf("deletePersonCascade"));
    for (const t of tablas(bloqueCascada)) borrado.add(t);
    // Y otra parte en personShares.ts (transferencia de propiedad al borrar
    // la cuenta del creador, y desligarse en bloque de fichas ajenas).
    for (const t of tablas(fs.readFileSync("convex/personShares.ts", "utf8"))) {
      borrado.add(t);
    }
    // Y «Mi lista» en lists.ts, desde `deleteListDataForUser` hasta el final.
    const listas = fs.readFileSync("convex/lists.ts", "utf8");
    const bloqueListas = listas.slice(listas.indexOf("export async function deleteListDataForUser"));
    expect(bloqueListas, "deleteListDataForUser no está en convex/lists.ts").not.toBe(listas);
    for (const t of tablas(bloqueListas)) borrado.add(t);

    const exportadas = tablas(fs.readFileSync("convex/exportData.ts", "utf8"));

    const faltan = [...borrado].filter((x) => !exportadas.has(x));
    expect(faltan, "tablas que se borran pero no se exportan").toEqual([]);
  });
});

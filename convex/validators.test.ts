/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// `recommendations.upsert` recibe lo que ha producido un modelo de lenguaje,
// pasado por una API route. Ni una cosa ni la otra son de fiar: el esquema Zod
// de `src/lib/gifts.ts` solo es una pista para el modelo, y la route podría
// estar comprometida. Quien manda es este validador.
//
// Importa especialmente el tope de `suggestedStores`: el 20-sep-2026 se quitó
// del esquema de generación porque Gemini 3 rechaza los arrays de enum con
// minItems/maxItems, y la justificación fue "Convex lo sigue acotando". Estos
// tests son esa justificación.

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { ALLOWED_STORES, ALLOWED_IMAGE_KEYS, validateListItemPrice } from "./validators";

const modules = import.meta.glob("./**/*.ts");

const ALICE = { subject: "user_alice", issuer: "https://test.clerk.dev" };

const idea = (over: Record<string, unknown> = {}) => ({
  title: "Rodillo de cerámica",
  description: "Para su taller nuevo",
  priceMinEuros: 30,
  priceMaxEuros: 45,
  category: ["ceramica"],
  amazonQuery: "rodillo ceramica",
  ...over,
});

async function conPersona(t: ReturnType<typeof convexTest>) {
  const alice = t.withIdentity(ALICE);
  const personId = await alice.mutation(api.people.create, {
    name: "Marta",
    relationship: "family",
    interests: ["cerámica"],
  });
  return { alice, personId };
}

const upsert = (
  alice: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  personId: string,
  ideas: unknown[],
) =>
  alice.mutation(api.recommendations.upsert, {
    personId: personId as never,
    occasionLabel: "Cumpleaños",
    giftType: "fisica",
    ideas: ideas as never,
  });

describe("cuántas ideas se aceptan", () => {
  test("una tanda normal entra", async () => {
    const t = convexTest(schema, modules);
    const { alice, personId } = await conPersona(t);
    await expect(
      upsert(alice, personId, Array.from({ length: 9 }, (_, i) => idea({ title: "Idea " + i }))),
    ).resolves.toBeDefined();
  });

  test("una tanda corta entra: el dedupe de títulos puede dejar menos de nueve", async () => {
    const t = convexTest(schema, modules);
    const { alice, personId } = await conPersona(t);
    await expect(upsert(alice, personId, [idea()])).resolves.toBeDefined();
  });

  test("cero ideas se rechaza", async () => {
    const t = convexTest(schema, modules);
    const { alice, personId } = await conPersona(t);
    await expect(upsert(alice, personId, [])).rejects.toThrow();
  });

  test("más de nueve se rechaza", async () => {
    const t = convexTest(schema, modules);
    const { alice, personId } = await conPersona(t);
    await expect(
      upsert(alice, personId, Array.from({ length: 10 }, (_, i) => idea({ title: "Idea " + i }))),
    ).rejects.toThrow();
  });
});

describe("suggestedStores: el tope que ya no está en el esquema de generación", () => {
  test("una lista válida entra", async () => {
    const t = convexTest(schema, modules);
    const { alice, personId } = await conPersona(t);
    await expect(
      upsert(alice, personId, [idea({ suggestedStores: ["amazon", "decathlon"] })]),
    ).resolves.toBeDefined();
  });

  test("una tienda inventada se rechaza", async () => {
    const t = convexTest(schema, modules);
    const { alice, personId } = await conPersona(t);
    await expect(
      upsert(alice, personId, [idea({ suggestedStores: ["tienda-que-no-existe"] })]),
    ).rejects.toThrow();
  });

  test("más tiendas que la allowlist se rechaza, aunque todas sean válidas", async () => {
    const t = convexTest(schema, modules);
    const { alice, personId } = await conPersona(t);
    // Repetidas para pasarse del tope sin usar ningún id inválido: esto es lo
    // que el esquema Zod ya no puede frenar.
    const demasiadas = [...ALLOWED_STORES, ...ALLOWED_STORES];
    await expect(
      upsert(alice, personId, [idea({ suggestedStores: demasiadas })]),
    ).rejects.toThrow();
  });
});

describe("otros campos que vienen del modelo", () => {
  test("una imageKey fuera del catálogo se rechaza", async () => {
    const t = convexTest(schema, modules);
    const { alice, personId } = await conPersona(t);
    await expect(
      upsert(alice, personId, [idea({ imageKey: "no-existe" })]),
    ).rejects.toThrow();
  });

  test("una imageKey del catálogo entra", async () => {
    const t = convexTest(schema, modules);
    const { alice, personId } = await conPersona(t);
    await expect(
      upsert(alice, personId, [idea({ imageKey: ALLOWED_IMAGE_KEYS[0] })]),
    ).resolves.toBeDefined();
  });

  test("un logo de marca fuera del CDN de Brandfetch se rechaza", async () => {
    const t = convexTest(schema, modules);
    const { alice, personId } = await conPersona(t);
    await expect(
      upsert(alice, personId, [
        idea({
          matchedBrandStores: [
            {
              brand: "Decathlon",
              domain: "decathlon.es",
              logoUrl: "https://evil.example.com/logo.png",
            },
          ],
        }),
      ]),
    ).rejects.toThrow();
  });

  test("un título desmesurado se rechaza", async () => {
    const t = convexTest(schema, modules);
    const { alice, personId } = await conPersona(t);
    await expect(
      upsert(alice, personId, [idea({ title: "x".repeat(5000) })]),
    ).rejects.toThrow();
  });
});

describe("propiedad", () => {
  test("no se pueden escribir recomendaciones sobre la persona de otro", async () => {
    const t = convexTest(schema, modules);
    const { personId } = await conPersona(t);
    const bob = t.withIdentity({ subject: "user_bob", issuer: "https://test.clerk.dev" });
    await expect(upsert(bob, personId, [idea()])).rejects.toThrow();
  });
});

describe("avatarUrl: el prefijo no acota el resto de la URL", () => {
  const conAvatar = (t: ReturnType<typeof convexTest>, avatarUrl: string) =>
    t.withIdentity(ALICE).mutation(api.people.create, {
      name: "Marta",
      relationship: "family",
      interests: [],
      avatarUrl,
    });

  test("la URL que genera el picker entra", async () => {
    const t = convexTest(schema, modules);
    await expect(
      conAvatar(
        t,
        "https://api.dicebear.com/9.x/dylan/svg?seed=pickpal&skinColor[]=ffcd94" +
          "&hair[]=plain&hairColor[]=0e0e0e&mood[]=happy&backgroundColor[]=4dabf7" +
          "&facialHairProbability=0",
      ),
    ).resolves.toBeDefined();
  });

  test("las URLs antiguas, con la semilla percent-encodeada, siguen entrando", async () => {
    const t = convexTest(schema, modules);
    await expect(
      conAvatar(t, "https://api.dicebear.com/9.x/dylan/svg?seed=Marta%20I%C3%B1igo"),
    ).resolves.toBeDefined();
  });

  test("una comilla se rechaza: rompería el url('…') del correo de avisos", async () => {
    const t = convexTest(schema, modules);
    await expect(
      conAvatar(
        t,
        "https://api.dicebear.com/9.x/dylan/svg?seed=x')}/**/;background-image:url('https://atacante.example/p.png",
      ),
    ).rejects.toThrow();
  });

  test("otro origen se sigue rechazando", async () => {
    const t = convexTest(schema, modules);
    await expect(
      conAvatar(t, "https://atacante.example/9.x/dylan/svg?seed=x"),
    ).rejects.toThrow();
  });
});

describe("dominio de marca: sufijos internos", () => {
  const conDominio = (t: ReturnType<typeof convexTest>, domain: string) =>
    conPersona(t).then(({ alice, personId }) =>
      upsert(alice, personId, [
        idea({ matchedBrandStores: [{ brand: "Nike", domain }] }),
      ]),
    );

  test("un dominio público entra", async () => {
    const t = convexTest(schema, modules);
    await expect(conDominio(t, "nike.com")).resolves.toBeNull();
  });

  test("un sufijo interno se rechaza", async () => {
    const t = convexTest(schema, modules);
    await expect(conDominio(t, "metadata.google.internal")).rejects.toThrow();
  });

  test(".local y .lan también", async () => {
    const t = convexTest(schema, modules);
    await expect(conDominio(t, "impresora.local")).rejects.toThrow();
    const t2 = convexTest(schema, modules);
    await expect(conDominio(t2, "db.lan")).rejects.toThrow();
  });
});

describe("update valida el parche, no lo ya guardado", () => {
  // El avatar legacy se armaba con `?seed=${encodeURIComponent(nombre)}`, y
  // `encodeURIComponent` no escapa el apóstrofo. Una ficha así es anterior a
  // `AVATAR_FORBIDDEN` y no se puede crear por la API, de ahí el insert
  // directo. Lo que se fija aquí es que siga siendo editable.
  const LEGACY =
    "https://api.dicebear.com/9.x/dylan/svg?seed=O'Brien";

  const conAvatarLegacy = async (t: ReturnType<typeof convexTest>) =>
    await t.run(async (ctx) =>
      ctx.db.insert("people", {
        clerkUserId: ALICE.subject,
        name: "Marta",
        relationship: "family",
        interests: [],
        avatarUrl: LEGACY,
      }),
    );

  test("una ficha con avatar antiguo se sigue pudiendo editar", async () => {
    const t = convexTest(schema, modules);
    const personId = await conAvatarLegacy(t);
    await expect(
      t.withIdentity(ALICE).mutation(api.people.update, {
        id: personId,
        notes: "Le gusta el té",
      }),
    ).resolves.toBeNull();
  });

  test("pero volver a enviar esa URL a mano se rechaza", async () => {
    const t = convexTest(schema, modules);
    const personId = await conAvatarLegacy(t);
    await expect(
      t.withIdentity(ALICE).mutation(api.people.update, {
        id: personId,
        avatarUrl: LEGACY,
      }),
    ).rejects.toThrow();
  });
});

// «Unos 40 €» de «Mi lista»: céntimos enteros entre 1 céntimo y 10.000 €. El
// cliente manda lo que quiera, así que aquí entran los valores que un
// `parseFloat` o una llamada directa a la API pueden dejar pasar.
describe("validateListItemPrice", () => {
  test("acepta céntimos enteros dentro del rango", () => {
    for (const c of [1, 1999, 4000, 1_000_000]) {
      expect(() => validateListItemPrice(c), String(c)).not.toThrow();
    }
  });

  test("rechaza cero, negativos, decimales, NaN, Infinity y más de 10.000 €", () => {
    for (const c of [0, -100, 39.5, Number.NaN, Number.POSITIVE_INFINITY, 1_000_001]) {
      expect(() => validateListItemPrice(c), String(c)).toThrow("Precio inválido.");
    }
  });
});

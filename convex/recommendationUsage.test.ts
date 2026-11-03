/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// `reserve` y `refund` son públicas porque la API route las llama con
// `fetchMutation`, que no alcanza funciones `internal*`. Lo único que separa a
// un usuario autenticado de decrementarse la cuota a mano es el secreto
// compartido, así que estos tests van sobre todo a esa puerta: que rechace sin
// secreto, con uno equivocado, y —lo que más cuesta acertar— cuando no hay
// ninguno configurado en el entorno.

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const ALICE = { subject: "user_alice", issuer: "https://test.clerk.dev" };
const BOB = { subject: "user_bob", issuer: "https://test.clerk.dev" };
const SECRET = "secreto-de-prueba";
const LIMIT = 10;

let previo: string | undefined;

beforeEach(() => {
  previo = process.env.CONVEX_SERVER_SECRET;
  process.env.CONVEX_SERVER_SECRET = SECRET;
});

afterEach(() => {
  if (previo === undefined) delete process.env.CONVEX_SERVER_SECRET;
  else process.env.CONVEX_SERVER_SECRET = previo;
});

describe("el secreto de servidor", () => {
  test("rechaza un secreto equivocado", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(ALICE).mutation(api.recommendationUsage.reserve, {
        secret: "me-lo-invento",
      }),
    ).rejects.toThrow(/No autorizado/);
  });

  test("rechaza el secreto vacío", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(ALICE).mutation(api.recommendationUsage.reserve, { secret: "" }),
    ).rejects.toThrow(/No autorizado/);
  });

  test("falla cerrado: sin variable configurada no vale ningún secreto", async () => {
    delete process.env.CONVEX_SERVER_SECRET;
    const t = convexTest(schema, modules);
    // Ni siquiera la cadena vacía, que es lo que valdría con una comparación
    // ingenua contra `undefined`.
    await expect(
      t.withIdentity(ALICE).mutation(api.recommendationUsage.reserve, { secret: "" }),
    ).rejects.toThrow(/No autorizado/);
    await expect(
      t.withIdentity(ALICE).mutation(api.recommendationUsage.reserve, { secret: SECRET }),
    ).rejects.toThrow(/No autorizado/);
  });

  test("un reserve rechazado no consume cuota", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(ALICE);
    await expect(
      alice.mutation(api.recommendationUsage.reserve, { secret: "no" }),
    ).rejects.toThrow();
    const estado = await alice.query(api.recommendationUsage.check, {});
    expect(estado.remaining).toBe(LIMIT);
  });

  test("refund también exige el secreto", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(ALICE);
    await alice.mutation(api.recommendationUsage.reserve, { secret: SECRET });

    // Este es el ataque que justifica todo el diseño: devolverse la cuota.
    await expect(
      alice.mutation(api.recommendationUsage.refund, { secret: "no" }),
    ).rejects.toThrow(/No autorizado/);

    const estado = await alice.query(api.recommendationUsage.check, {});
    expect(estado.count).toBe(1);
  });

  test("sin sesión no se reserva aunque el secreto sea correcto", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.recommendationUsage.reserve, { secret: SECRET }),
    ).rejects.toThrow(/Sesión no encontrada/);
  });
});

describe("la cuota diaria", () => {
  test("cuenta hacia arriba y descuenta lo que queda", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(ALICE);

    const primera = await alice.mutation(api.recommendationUsage.reserve, {
      secret: SECRET,
    });
    expect(primera.count).toBe(1);
    expect(primera.remaining).toBe(LIMIT - 1);

    const segunda = await alice.mutation(api.recommendationUsage.reserve, {
      secret: SECRET,
    });
    expect(segunda.count).toBe(2);
    expect(segunda.remaining).toBe(LIMIT - 2);
  });

  test("corta exactamente en la décima y la undécima falla", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(ALICE);

    for (let i = 0; i < LIMIT; i++) {
      await alice.mutation(api.recommendationUsage.reserve, { secret: SECRET });
    }

    await expect(
      alice.mutation(api.recommendationUsage.reserve, { secret: SECRET }),
    ).rejects.toThrow(/límite diario/i);

    // `check` también debe cerrar la puerta, no solo `reserve`.
    await expect(alice.query(api.recommendationUsage.check, {})).rejects.toThrow(
      /límite diario/i,
    );
  });

  test("la cuota es de cada usuario, no compartida", async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < LIMIT; i++) {
      await t
        .withIdentity(ALICE)
        .mutation(api.recommendationUsage.reserve, { secret: SECRET });
    }
    // Alice agotó la suya; Bob no debería notarlo.
    const bob = await t
      .withIdentity(BOB)
      .mutation(api.recommendationUsage.reserve, { secret: SECRET });
    expect(bob.count).toBe(1);
  });

  test("refund devuelve la unidad al bucket que dijo reserve", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(ALICE);

    const { day } = await alice.mutation(api.recommendationUsage.reserve, {
      secret: SECRET,
    });
    await alice.mutation(api.recommendationUsage.refund, { day, secret: SECRET });

    const estado = await alice.query(api.recommendationUsage.check, {});
    expect(estado.count).toBe(0);
    expect(estado.remaining).toBe(LIMIT);
  });

  test("refund no deja el contador en negativo", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(ALICE);

    await alice.mutation(api.recommendationUsage.reserve, { secret: SECRET });
    for (let i = 0; i < 3; i++) {
      await alice.mutation(api.recommendationUsage.refund, { secret: SECRET });
    }

    const estado = await alice.query(api.recommendationUsage.check, {});
    expect(estado.count).toBe(0);
    expect(estado.remaining).toBe(LIMIT);
  });

  test("agotar y devolver una deja hueco para exactamente una más", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(ALICE);

    for (let i = 0; i < LIMIT; i++) {
      await alice.mutation(api.recommendationUsage.reserve, { secret: SECRET });
    }
    await alice.mutation(api.recommendationUsage.refund, { secret: SECRET });

    await alice.mutation(api.recommendationUsage.reserve, { secret: SECRET });
    await expect(
      alice.mutation(api.recommendationUsage.reserve, { secret: SECRET }),
    ).rejects.toThrow(/límite diario/i);
  });

  test("los intentos devueltos también se acaban: 30 al día aunque fallen todos", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(ALICE);

    // Una generación que falla siempre (algo en la ficha que hace que Gemini
    // no valide) devuelve la unidad cada vez; sin este tope saldría gratis.
    for (let i = 0; i < 30; i++) {
      await alice.mutation(api.recommendationUsage.reserve, { secret: SECRET });
      await alice.mutation(api.recommendationUsage.refund, { secret: SECRET });
    }
    expect((await alice.query(api.recommendationUsage.check, {})).count).toBe(0);
    await expect(
      alice.mutation(api.recommendationUsage.reserve, { secret: SECRET }),
    ).rejects.toThrow(/límite diario/i);
    // Y el de Bob no se ha tocado.
    await t.withIdentity(BOB).mutation(api.recommendationUsage.reserve, { secret: SECRET });
  });

  test("un reserve con la cuota agotada no gasta intento", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(ALICE);

    for (let i = 0; i < LIMIT; i++) {
      await alice.mutation(api.recommendationUsage.reserve, { secret: SECRET });
    }
    for (let i = 0; i < 5; i++) {
      await expect(
        alice.mutation(api.recommendationUsage.reserve, { secret: SECRET }),
      ).rejects.toThrow(/límite diario/i);
    }
    const intentos = await t.run(async (ctx) =>
      (await ctx.db.query("rateLimitBuckets").collect()).find(
        (b) => b.clerkUserId === ALICE.subject && b.bucket === "generate_ideas_attempt",
      ),
    );
    expect(intentos?.count).toBe(LIMIT);
  });
});

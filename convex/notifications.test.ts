/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// Avisos por correo de una ficha compartida (convex/notifications.ts). Quien
// tiene acceso a una ficha como invitado recibe los avisos de sus fechas según
// sus propios ajustes, en el mismo correo del día que los de sus fichas, y la
// dueña sigue recibiendo los suyos: un aviso no tapa al otro.

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type T = ReturnType<typeof convexTest>;

const ISSUER = "https://test.clerk.dev";
const ALICE = { subject: "user_alice", issuer: ISSUER, email: "alice@example.com" };
const BOB = { subject: "user_bob", issuer: ISSUER, email: "bob@example.com" };
const CAROL = { subject: "user_carol", issuer: ISSUER, email: "carol@example.com" };

beforeEach(() => {
  // El 17-oct cae a 7 días.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T08:00:00Z"));
  vi.stubEnv("RESEND_API_KEY", "re_test");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Alice crea la ficha de Marta, con su cumpleaños a 7 días, y la comparte
 * con Bob. Nadie tiene los avisos encendidos todavía. */
async function fichaCompartida(t: T) {
  const alice = t.withIdentity(ALICE);
  const marta = await alice.mutation(api.people.create, {
    name: "Marta",
    relationship: "family",
    interests: ["cerámica"],
  });
  await alice.mutation(api.importantDates.create, {
    personId: marta,
    label: "Cumpleaños",
    month: 10,
    day: 17,
    recurring: true,
  });
  await alice.mutation(api.personShares.invite, {
    personId: marta,
    clerkUserId: BOB.subject,
  });
  return { alice, bob: t.withIdentity(BOB), marta };
}

const avisos = (t: T) =>
  t.query(internal.notifications.findEventsNeedingEmail, {});

const avisosDe = async (t: T, clerkUserId: string) =>
  (await avisos(t)).find((u) => u.clerkUserId === clerkUserId);

function mockResend() {
  const calls: { to: string; subject: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      calls.push({ to: body.to, subject: body.subject });
      return new Response("{}", { status: 200 });
    }),
  );
  return calls;
}

describe("quién recibe el aviso de una ficha compartida", () => {
  test("el invitado con los avisos activados recibe los de sus fechas", async () => {
    const t = convexTest(schema, modules);
    const { bob, marta } = await fichaCompartida(t);
    await bob.mutation(api.settings.setMine, {
      emailNotificationsEnabled: true,
      emailNotifyDaysBefore: [7],
    });

    const deBob = await avisosDe(t, BOB.subject);
    expect(deBob?.email).toBe(BOB.email);
    expect(deBob?.events).toEqual([
      expect.objectContaining({
        personId: marta,
        personName: "Marta",
        label: "Cumpleaños",
        daysUntil: 7,
      }),
    ]);
    // La dueña tiene los avisos apagados: a ella no le llega nada.
    expect(await avisosDe(t, ALICE.subject)).toBeUndefined();
  });

  test("cuentan las antelaciones del invitado, no las de la dueña", async () => {
    const t = convexTest(schema, modules);
    const { alice, bob } = await fichaCompartida(t);
    await alice.mutation(api.settings.setMine, {
      emailNotificationsEnabled: true,
      emailNotifyDaysBefore: [7],
    });
    await bob.mutation(api.settings.setMine, {
      emailNotificationsEnabled: true,
      emailNotifyDaysBefore: [14, 2],
    });

    expect(await avisosDe(t, ALICE.subject)).toBeDefined();
    expect(await avisosDe(t, BOB.subject)).toBeUndefined();
  });

  test("con los avisos apagados, el invitado no recibe nada", async () => {
    const t = convexTest(schema, modules);
    const { alice, bob } = await fichaCompartida(t);
    await alice.mutation(api.settings.setMine, {
      emailNotificationsEnabled: true,
      emailNotifyDaysBefore: [7],
    });
    await bob.mutation(api.settings.setMine, {
      emailNotificationsEnabled: false,
      emailNotifyDaysBefore: [7],
    });

    expect((await avisos(t)).map((u) => u.clerkUserId)).toEqual([ALICE.subject]);
  });

  test("quien se desliga de la ficha deja de recibirlos", async () => {
    const t = convexTest(schema, modules);
    const { bob, marta } = await fichaCompartida(t);
    await bob.mutation(api.settings.setMine, {
      emailNotificationsEnabled: true,
      emailNotifyDaysBefore: [7],
    });
    expect(await avisosDe(t, BOB.subject)).toBeDefined();

    await bob.mutation(api.personShares.leave, { personId: marta });
    expect(await avisosDe(t, BOB.subject)).toBeUndefined();
  });

  test("a quien no está invitado no le llega nada de esa ficha", async () => {
    const t = convexTest(schema, modules);
    await fichaCompartida(t);
    await t.withIdentity(CAROL).mutation(api.settings.setMine, {
      emailNotificationsEnabled: true,
      emailNotifyDaysBefore: [7],
    });

    expect(await avisosDe(t, CAROL.subject)).toBeUndefined();
  });
});

describe("el correo del día", () => {
  test("va en un único correo con las fechas de sus fichas y las compartidas", async () => {
    const t = convexTest(schema, modules);
    const { bob } = await fichaCompartida(t);
    const pedro: Id<"people"> = await bob.mutation(api.people.create, {
      name: "Pedro",
      relationship: "friend",
      interests: [],
    });
    await bob.mutation(api.importantDates.create, {
      personId: pedro,
      label: "Cumpleaños",
      month: 10,
      day: 17,
      recurring: true,
    });
    await bob.mutation(api.settings.setMine, {
      emailNotificationsEnabled: true,
      emailNotifyDaysBefore: [7],
    });
    const calls = mockResend();

    await t.action(internal.emails.runDailyEmailNotifications, {});

    expect(calls).toEqual([
      { to: BOB.email, subject: "PickPal · 2 eventos próximos" },
    ]);
    const deBob = await t.run((ctx) =>
      ctx.db
        .query("emailNotifications")
        .withIndex("by_user", (q) => q.eq("clerkUserId", BOB.subject))
        .collect(),
    );
    expect(deBob).toHaveLength(2);
    expect(await avisosDe(t, BOB.subject)).toBeUndefined();
  });

  test("la dueña y el invitado reciben cada uno el suyo, una sola vez", async () => {
    const t = convexTest(schema, modules);
    const { alice, bob } = await fichaCompartida(t);
    for (const user of [alice, bob]) {
      await user.mutation(api.settings.setMine, {
        emailNotificationsEnabled: true,
        emailNotifyDaysBefore: [7],
      });
    }
    const calls = mockResend();

    await t.action(internal.emails.runDailyEmailNotifications, {});
    expect(calls.map((c) => c.to).sort()).toEqual([ALICE.email, BOB.email]);

    // Si el cron vuelve a correr el mismo día, no repite a ninguno.
    await t.action(internal.emails.runDailyEmailNotifications, {});
    expect(calls).toHaveLength(2);
  });

  test("el aviso que ya recibió la dueña no tapa el del invitado", async () => {
    const t = convexTest(schema, modules);
    const { alice, bob } = await fichaCompartida(t);
    await alice.mutation(api.settings.setMine, {
      emailNotificationsEnabled: true,
      emailNotifyDaysBefore: [7],
    });
    const calls = mockResend();
    await t.action(internal.emails.runDailyEmailNotifications, {});
    expect(calls.map((c) => c.to)).toEqual([ALICE.email]);

    // Bob activa los avisos después: el registro de Alice para esa misma
    // ocurrencia y antelación no le cuenta como enviado a él.
    await bob.mutation(api.settings.setMine, {
      emailNotificationsEnabled: true,
      emailNotifyDaysBefore: [7],
    });
    await t.action(internal.emails.runDailyEmailNotifications, {});
    expect(calls.map((c) => c.to)).toEqual([ALICE.email, BOB.email]);
  });
});

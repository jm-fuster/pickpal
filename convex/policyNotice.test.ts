/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// Aviso de cambios en la política (convex/policyNotice.ts). Lo que importa:
// que no se pueda mandar con menos de 15 días de antelación, que por defecto
// no mande nada, que no repita a quien ya lo tiene y que no dependa del
// interruptor de recordatorios.

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import {
  NOTICES,
  assertEffectiveDate,
  buildPolicyNoticeEmail,
  formatEffectiveDate,
} from "./policyNotice";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const NOTICE = "2026-10-mi-lista";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("assertEffectiveDate", () => {
  const now = Date.UTC(2026, 9, 12, 10, 0, 0); // 12-oct-2026 10:00 UTC

  test("acepta una fecha con 15 días o más de antelación", () => {
    expect(assertEffectiveDate("2026-10-28", now)).toBe(Date.UTC(2026, 9, 28));
    expect(assertEffectiveDate("2026-11-03", now)).toBe(Date.UTC(2026, 10, 3));
  });

  test("rechaza lo que no llega a 15 días, hasta por unas horas", () => {
    // 27-oct 00:00 UTC son 14 días y 14 horas después de now.
    expect(() => assertEffectiveDate("2026-10-27", now)).toThrow(/menos de 15 días/);
    expect(() => assertEffectiveDate("2026-10-12", now)).toThrow(/menos de 15 días/);
    expect(() => assertEffectiveDate("2025-01-01", now)).toThrow(/menos de 15 días/);
  });

  test("rechaza lo que no es una fecha", () => {
    expect(() => assertEffectiveDate("3 de noviembre", now)).toThrow(/AAAA-MM-DD/);
    expect(() => assertEffectiveDate("2026-11-3", now)).toThrow(/AAAA-MM-DD/);
    expect(() => assertEffectiveDate("2026-02-30", now)).toThrow(/no es una fecha real/);
    expect(() => assertEffectiveDate("2026-13-01", now)).toThrow(/no es una fecha real/);
  });
});

describe("el correo", () => {
  test("dice cuándo entra en vigor y cada cambio, y enlaza a la política", () => {
    const { subject, html } = buildPolicyNoticeEmail(NOTICES[NOTICE], "2026-11-03");
    expect(formatEffectiveDate("2026-11-03")).toBe("3 de noviembre de 2026");
    expect(subject).toContain("3 de noviembre de 2026");
    expect(html).toContain("3 de noviembre de 2026");
    for (const change of NOTICES[NOTICE].changes) {
      expect(html).toContain(change.replace(/&/g, "&amp;").split("«")[0].trim().slice(0, 12));
    }
    expect(html).toContain("https://pickpal.jorgemolinafuster.com/privacidad");
    expect(html).toContain("no depende del interruptor de recordatorios");
  });

  test("escapa el HTML de los textos", () => {
    const { html } = buildPolicyNoticeEmail({ id: "x", changes: ["<script>alert(1)</script>"] }, "2026-11-03");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("send", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
    vi.stubEnv("RESEND_API_KEY", "re_test");
  });

  async function usuarios(t: ReturnType<typeof convexTest>) {
    await t.run(async (ctx) => {
      // Con recordatorios apagados y encendidos: el aviso llega a los dos.
      await ctx.db.insert("userSettings", { clerkUserId: "u1", notifyDaysBefore: 30, email: "uno@example.com", emailNotificationsEnabled: false });
      await ctx.db.insert("userSettings", { clerkUserId: "u2", notifyDaysBefore: 30, email: "dos@example.com", emailNotificationsEnabled: true });
      await ctx.db.insert("userSettings", { clerkUserId: "u3", notifyDaysBefore: 30, email: "tres@example.com" });
      // Sin email: no se puede avisar y se cuenta aparte.
      await ctx.db.insert("userSettings", { clerkUserId: "u4", notifyDaysBefore: 30 });
    });
  }

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

  test("por defecto solo cuenta: no manda ni apunta nada", async () => {
    const t = convexTest(schema, modules);
    await usuarios(t);
    const calls = mockResend();
    const r = await t.action(internal.policyNotice.send, { noticeId: NOTICE, effectiveDate: "2026-11-03" });
    expect(r).toMatchObject({ dryRun: true, users: 4, withoutEmail: 1, alreadySent: 0, remaining: 3, sent: 0 });
    expect(calls).toHaveLength(0);
  });

  test("se niega a mandar con menos de 15 días, aunque pidan dryRun: false", async () => {
    const t = convexTest(schema, modules);
    await usuarios(t);
    const calls = mockResend();
    await expect(
      t.action(internal.policyNotice.send, { noticeId: NOTICE, effectiveDate: "2026-10-20", dryRun: false }),
    ).rejects.toThrow(/menos de 15 días/);
    expect(calls).toHaveLength(0);
  });

  test("un aviso que no existe no se manda", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(internal.policyNotice.send, { noticeId: "inventado", effectiveDate: "2026-11-03", dryRun: false }),
    ).rejects.toThrow(/No existe el aviso/);
  });

  test("manda a todos los que tienen email, apunta el envío y no repite", async () => {
    const t = convexTest(schema, modules);
    await usuarios(t);
    const calls = mockResend();
    const run = () =>
      t.action(internal.policyNotice.send, { noticeId: NOTICE, effectiveDate: "2026-11-03", dryRun: false });

    const first = await run();
    expect(first).toMatchObject({ dryRun: false, sent: 3, failed: 0, remaining: 0 });
    expect(calls.map((c) => c.to).sort()).toEqual(["dos@example.com", "tres@example.com", "uno@example.com"]);
    expect(calls[0].subject).toContain("3 de noviembre de 2026");

    const second = await run();
    expect(second).toMatchObject({ sent: 0, alreadySent: 3, remaining: 0 });
    expect(calls).toHaveLength(3);

    const rows = await t.run((ctx) => ctx.db.query("userSettings").collect());
    expect(rows.filter((r) => r.policyNoticesSent?.includes(NOTICE))).toHaveLength(3);
    expect(rows.find((r) => r.clerkUserId === "u4")?.policyNoticesSent).toBeUndefined();
  });

  test("respeta `max` y se puede reanudar", async () => {
    const t = convexTest(schema, modules);
    await usuarios(t);
    const calls = mockResend();
    vi.useFakeTimers({ toFake: ["Date"] });
    const run = () =>
      t.action(internal.policyNotice.send, { noticeId: NOTICE, effectiveDate: "2026-11-03", dryRun: false, max: 2 });
    expect(await run()).toMatchObject({ sent: 2, remaining: 1 });
    expect(await run()).toMatchObject({ sent: 1, remaining: 0 });
    expect(await run()).toMatchObject({ sent: 0, alreadySent: 3 });
    expect(new Set(calls.map((c) => c.to)).size).toBe(3);
  });

  test("un fallo de Resend no apunta el envío y se reintenta en el siguiente lanzamiento", async () => {
    const t = convexTest(schema, modules);
    await usuarios(t);
    let fail = true;
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const to = JSON.parse(String(init.body)).to as string;
        if (fail && to === "dos@example.com") return new Response("boom", { status: 500 });
        calls.push(to);
        return new Response("{}", { status: 200 });
      }),
    );
    const run = () =>
      t.action(internal.policyNotice.send, { noticeId: NOTICE, effectiveDate: "2026-11-03", dryRun: false });
    expect(await run()).toMatchObject({ sent: 2, failed: 1 });
    fail = false;
    expect(await run()).toMatchObject({ sent: 1, failed: 0, remaining: 0 });
    expect(calls.filter((c) => c === "dos@example.com")).toHaveLength(1);
  });
});


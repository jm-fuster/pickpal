import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { APP_BASE_URL, ctaHtml, emailShell, escapeHtml, sendEmail } from "./emails";

/**
 * Aviso por correo de un cambio sustancial en la política de privacidad.
 *
 * `/privacidad` (§11) promete «notificar por email a los usuarios registrados
 * con al menos 15 días de antelación». Esto es lo que lo cumple, y está hecho
 * para que no se pueda cumplir a medias por error:
 *
 * - **Es solo `internal`**: se lanza a mano (`npx convex run`), nunca desde el
 *   navegador. Mandar un correo a todos los usuarios no es algo que deba tener
 *   un botón.
 * - **Por defecto no manda nada** (`dryRun`): cuenta a quién llegaría.
 * - **Se niega a mandar** si la fecha de entrada en vigor no está al menos
 *   15 días por delante de hoy (`assertEffectiveDate`): la promesa la protege
 *   el código, no la memoria de quien lo lanza.
 * - **Se puede reanudar**: cada envío correcto se apunta en
 *   `userSettings.policyNoticesSent` y un segundo lanzamiento salta a quien ya
 *   lo tiene. Manda como mucho `max` por lanzamiento, a ritmo suave.
 * - **No depende del interruptor de recordatorios** de Ajustes: ese es el
 *   consentimiento para los avisos de fechas; esto es información obligada por
 *   la propia política, y por eso lo dice la política (§11).
 *
 * Cómo se usa, paso a paso: docs/privacy.md §11.
 */

/** Los días de antelación que promete la política. */
export const POLICY_NOTICE_LEAD_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PolicyNotice = {
  /** Lo que se apunta en cada fila de `userSettings` al enviarlo. */
  id: string;
  /** Cada cambio, en una frase que se entienda sin haber leído la política. */
  changes: readonly string[];
};

/**
 * Los avisos que existen. Uno por cambio sustancial: añade uno nuevo en vez de
 * editar uno ya enviado, o quien lo recibió no volverá a recibirlo.
 */
export const NOTICES: Record<string, PolicyNotice> = {
  "2026-10-mi-lista": {
    id: "2026-10-mi-lista",
    changes: [
      "«Mi lista»: puedes apuntar lo que te haría ilusión recibir, con enlace, nota, precio aproximado y una foto de cada cosa, y compartirla con otros usuarios de PickPal. Quien la lee puede marcar lo que va a regalarte, pero tú nunca ves esas marcas. Las fotos se reducen en tu navegador antes de subirlas y pierden sus datos de ubicación.",
      "Tu cumpleaños (solo día y mes) y una nota para quien te regala los ven quienes tienen acceso a tu lista, si decides añadirlos.",
      "Listas para otra persona: un adulto puede llevar la lista de alguien que no tiene cuenta, por ejemplo un niño. Solo se guarda su nombre de pila, nunca su edad, y quien la lleva ve qué está cogido pero no quién lo regala.",
      "Bloqueos: si no quieres recibir las listas de alguien, PickPal guarda a quién (su nombre y su correo) para no mostrártelas, sin avisarle.",
      "Si un lector pasa una cosa de tu lista a su historial con «Ya se lo he regalado», su título puede viajar a la IA de Google al generar ideas para esa persona, como el resto de ese historial.",
    ],
  },
};

/**
 * La fecha de entrada en vigor, en `YYYY-MM-DD`, ya validada: existe de verdad
 * y su primer instante (00:00 UTC) llega al menos 15 días después de `now`.
 * Devuelve el instante en milisegundos.
 */
export function assertEffectiveDate(effectiveDate: string, now: number): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(effectiveDate);
  if (!m) throw new ConvexError("La fecha de entrada en vigor tiene que ser AAAA-MM-DD.");
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const at = Date.UTC(y, mo - 1, d);
  const back = new Date(at);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
    throw new ConvexError(`${effectiveDate} no es una fecha real.`);
  }
  if (at < now + POLICY_NOTICE_LEAD_DAYS * DAY_MS) {
    throw new ConvexError(
      `Faltan menos de ${POLICY_NOTICE_LEAD_DAYS} días para ${effectiveDate}: la política promete avisar con al menos ${POLICY_NOTICE_LEAD_DAYS} días de antelación.`,
    );
  }
  return at;
}

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** «3 de noviembre de 2026», a partir de `YYYY-MM-DD` ya validado. */
export function formatEffectiveDate(effectiveDate: string): string {
  const [y, mo, d] = effectiveDate.split("-").map(Number);
  return `${d} de ${MONTHS[mo - 1]} de ${y}`;
}

export function buildPolicyNoticeEmail(
  notice: PolicyNotice,
  effectiveDate: string,
): { subject: string; html: string } {
  const when = formatEffectiveDate(effectiveDate);
  const items = notice.changes
    .map(
      (c) =>
        `<li style="margin:0 0 10px;font-size:14px;color:#FBF7EE;line-height:1.5;">${escapeHtml(c)}</li>`,
    )
    .join("");
  return {
    subject: `PickPal · Cambios en la política de privacidad, en vigor el ${when}`,
    html: emailShell({
      subtitle: "Aviso de privacidad",
      body: `<p style="margin:0 0 12px;font-size:15px;color:#FBF7EE;line-height:1.5;">Hemos actualizado la política de privacidad de PickPal y te avisamos con antelación, como prometemos en ella.</p>
              <p style="margin:0 0 16px;font-size:15px;color:#a8c0a0;line-height:1.5;">Lo que cambia entra en vigor el <strong style="color:#FBF7EE;">${escapeHtml(when)}</strong>:</p>
              <ul style="margin:0 0 16px;padding-left:20px;">${items}</ul>
              <p style="margin:0 0 20px;font-size:14px;color:#a8c0a0;line-height:1.5;">El texto completo está en la política. Si no estás de acuerdo, puedes eliminar tu cuenta cuando quieras desde Ajustes: se borra todo al momento.</p>
              ${ctaHtml(`${APP_BASE_URL}/privacidad`, "Leer la política", false)}`,
      footer:
        "Te escribimos porque tienes una cuenta en PickPal. Es un aviso del servicio, no publicidad, y no depende del interruptor de recordatorios de Ajustes.",
    }),
  };
}

type PendingSummary = {
  total: number;
  withoutEmail: number;
  alreadySent: number;
  remaining: number;
  batch: { settingsId: Id<"userSettings">; to: string }[];
};

type SendReport = {
  noticeId: string;
  effectiveDate: string;
  users: number;
  withoutEmail: number;
  alreadySent: number;
  remaining: number;
  dryRun: boolean;
  sent: number;
  failed: number;
};

/** A quién le falta el aviso. Solo cuenta y devuelve lo imprescindible. */
export const pending = internalQuery({
  args: { noticeId: v.string(), limit: v.number() },
  handler: async (ctx, { noticeId, limit }): Promise<PendingSummary> => {
    const rows = await ctx.db.query("userSettings").collect();
    const withEmail = rows.filter((r) => typeof r.email === "string" && r.email.includes("@"));
    const todo = withEmail.filter((r) => !(r.policyNoticesSent ?? []).includes(noticeId));
    return {
      total: rows.length,
      withoutEmail: rows.length - withEmail.length,
      alreadySent: withEmail.length - todo.length,
      remaining: todo.length,
      batch: todo.slice(0, limit).map((r) => ({ settingsId: r._id, to: r.email as string })),
    };
  },
});

export const markSent = internalMutation({
  args: { settingsId: v.id("userSettings"), noticeId: v.string() },
  handler: async (ctx, { settingsId, noticeId }): Promise<void> => {
    const row = await ctx.db.get(settingsId);
    if (!row) return;
    const sent = row.policyNoticesSent ?? [];
    if (!sent.includes(noticeId)) await ctx.db.patch(settingsId, { policyNoticesSent: [...sent, noticeId] });
  },
});

/**
 * `npx convex run policyNotice:send '{"noticeId":"2026-10-mi-lista","effectiveDate":"2026-11-03"}'`
 * cuenta a quién llegaría y no manda nada. Con `"dryRun":false` manda, hasta
 * `max` (por defecto 50) por lanzamiento; vuelve a lanzarlo hasta que
 * `remaining` sea 0.
 */
export const send = internalAction({
  args: {
    noticeId: v.string(),
    effectiveDate: v.string(),
    dryRun: v.optional(v.boolean()),
    max: v.optional(v.number()),
  },
  handler: async (ctx, { noticeId, effectiveDate, dryRun, max }): Promise<SendReport> => {
    const notice = NOTICES[noticeId];
    if (!notice) throw new ConvexError(`No existe el aviso «${noticeId}».`);
    assertEffectiveDate(effectiveDate, Date.now());
    const limit = Math.min(Math.max(Math.floor(max ?? 50), 1), 200);
    const summary: PendingSummary = await ctx.runQuery(internal.policyNotice.pending, { noticeId, limit });
    const report = {
      noticeId,
      effectiveDate,
      users: summary.total,
      withoutEmail: summary.withoutEmail,
      alreadySent: summary.alreadySent,
      remaining: summary.remaining,
    };
    if (dryRun !== false) return { ...report, dryRun: true, sent: 0, failed: 0 };

    const { subject, html } = buildPolicyNoticeEmail(notice, effectiveDate);
    let sent = 0;
    let failed = 0;
    for (const target of summary.batch) {
      try {
        await sendEmail(target.to, subject, html);
        await ctx.runMutation(internal.policyNotice.markSent, { settingsId: target.settingsId, noticeId });
        sent++;
      } catch (err) {
        failed++;
        console.error("[policyNotice] Falló un envío:", err);
      }
      // Resend admite pocas peticiones por segundo: un ritmo suave evita 429.
      await new Promise((r) => setTimeout(r, 600));
    }
    return { ...report, dryRun: false, sent, failed, remaining: summary.remaining - sent };
  },
});

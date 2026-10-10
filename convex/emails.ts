import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { UserToNotify, EventToNotify } from "./notifications";
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "PickPal <hola@pickpal.jorgemolinafuster.com>";
// El remitente no recibe correo (su subdominio es un CNAME a Vercel), así que
// las respuestas van al buzón de contacto que publican /privacidad y /terminos.
const REPLY_TO = "pickpal@jorgemolinafuster.com";
const APP_BASE_URL = "https://pickpal.jorgemolinafuster.com";
const LOGO_DATA_URI = `${APP_BASE_URL}/logo-mark-email.png`;
const GIFT_ICON_DATA_URI = `${APP_BASE_URL}/gift-icon-email.png`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Codifica una URL para incrustarla en `url('…')` dentro de un atributo
 * `style`. `escapeHtml` NO sirve para este contexto: convierte `'` en `&#39;`,
 * y el parser HTML del cliente de correo lo decodifica de vuelta a `'` ANTES
 * de que el CSS se interprete, así que la comilla reaparece, cierra el `url()`
 * y lo que venga detrás se lee como más declaraciones CSS. El percent-encoding
 * sí sobrevive al viaje: es válido dentro de una URL e inerte en CSS.
 *
 * `convex/validators.ts` ya rechaza estos caracteres en `avatarUrl` al
 * guardarlo; esto es la segunda capa, y la que protege a los documentos que se
 * guardaron antes de que existiera la primera.
 */
export function encodeCssUrl(url: string): string {
  return url.replace(
    /['"()\\\s]/g,
    (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase()}`,
  );
}

function avatarHtml(name: string, avatarUrl?: string): string {
  if (avatarUrl) {
    // Use background-image instead of <img> so Gmail dark mode doesn't apply image filters
    return `<div role="img" aria-label="${escapeHtml(name)}"
      style="width:44px;height:44px;border-radius:50%;overflow:hidden;
      background-image:url('${escapeHtml(encodeCssUrl(avatarUrl))}');background-size:cover;
      background-position:center;border:2px solid #3D5040;box-sizing:border-box;
      display:block;"></div>`;
  }
  const initial = escapeHtml(name.trim().charAt(0).toUpperCase());
  return `<table cellpadding="0" cellspacing="0" width="44" height="44"
    style="width:44px;height:44px;border-radius:50%;overflow:hidden;">
    <tr>
      <td width="44" height="44" bgcolor="#3D5040" align="center" valign="middle"
        style="background-color:#3D5040;width:44px;height:44px;border-radius:50%;
        font-size:18px;font-weight:700;color:#FBF7EE;text-align:center;
        font-family:system-ui,-apple-system,sans-serif;">${initial}</td>
    </tr>
  </table>`;
}

/**
 * «Laura tiene 3 cosas en su lista que nadie ha marcado todavía», enlazado a
 * la sección de la lista en su ficha (decisión 18 de docs/encargo-lista.md).
 * Solo la cifra: el correo pasa por Resend y no lleva títulos de la lista.
 * Vacío si no hay lista asociada o si ya está todo marcado.
 */
export function listLineHtml(
  e: Pick<EventToNotify, "personId" | "personName" | "listUnclaimed">,
): string {
  const n = e.listUnclaimed ?? 0;
  if (n <= 0) return "";
  const cosas = n === 1 ? "1 cosa" : `${n} cosas`;
  const href = `${APP_BASE_URL}/seres-queridos/${encodeURIComponent(e.personId)}#lista`;
  return `<div style="font-size:12px;margin-top:6px;">
                  <a href="${href}" style="color:#FBF7EE;text-decoration:underline;">${escapeHtml(e.personName)} tiene ${cosas} en su lista que nadie ha marcado todavía</a>
                </div>`;
}

function formatEventCard(e: EventToNotify): string {
  const dd = String(e.day).padStart(2, "0");
  const mm = String(e.month).padStart(2, "0");
  const daysText =
    e.daysUntil === 0
      ? "hoy"
      : e.daysUntil === 1
        ? "mañana"
        : `en ${e.daysUntil} días`;

  return `
    <table cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#2D4033;border-radius:10px;margin-bottom:10px;">
      <tr>
        <td bgcolor="#2D4033"
          style="padding:14px 18px;background-color:#2D4033;border-radius:10px;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width:44px;vertical-align:middle;padding-right:14px;">
                ${avatarHtml(e.personName, e.personAvatarUrl)}
              </td>
              <td style="vertical-align:middle;">
                <div style="font-size:15px;font-weight:600;color:#FBF7EE;">${escapeHtml(e.personName)}</div>
                <div style="font-size:13px;color:#a8c0a0;margin-top:2px;">${escapeHtml(e.label)} &middot; ${dd}/${mm}</div>
                <div style="font-size:12px;font-weight:600;color:#F1704B;margin-top:2px;">${daysText}</div>
                ${listLineHtml(e)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function buildSubject(events: EventToNotify[]): string {
  if (events.length === 1) {
    const e = events[0];
    const when =
      e.daysUntil === 0
        ? "hoy"
        : e.daysUntil === 1
          ? "mañana"
          : `en ${e.daysUntil} días`;
    return `PickPal · ${e.label} de ${e.personName} ${when}`;
  }
  return `PickPal · ${events.length} eventos próximos`;
}

function ctaHtml(href: string, label: string, withGiftIcon: boolean): string {
  const icon = withGiftIcon
    ? `<span aria-hidden="true"
          style="display:inline-block;width:16px;height:16px;background-image:url('${GIFT_ICON_DATA_URI}');
          background-size:16px 16px;background-repeat:no-repeat;background-position:center;
          vertical-align:middle;margin-right:7px;position:relative;top:-1px;"></span
        >`
    : "";
  return `
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${href}"
         style="display:inline-block;background-color:#F1704B;color:#ffffff;text-decoration:none;
                font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;
                letter-spacing:0.01em;white-space:nowrap;">
        ${icon}<span style="vertical-align:middle;">${label}</span>
      </a>
    </div>`;
}

function buildCta(events: EventToNotify[]): string {
  const href =
    events.length === 1
      ? `${APP_BASE_URL}/seres-queridos/${events[0].personId}/gifts?occasion=${encodeURIComponent(events[0].label)}`
      : `${APP_BASE_URL}/agenda`;
  const label =
    events.length === 1
      ? `Ideas para ${escapeHtml(events[0].personName)}`
      : "Ver próximos eventos";
  return ctaHtml(href, label, true);
}

/**
 * La carcasa común de los correos: página oscura, cabecera con el logo y un
 * subtítulo, cuerpo y pie. `body` y `footer` llegan ya escapados.
 */
function emailShell({
  subtitle,
  body,
  footer,
}: {
  subtitle: string;
  body: string;
  footer: string;
}): string {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background-color:#141e17;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#141e17"
    style="background-color:#141e17;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td bgcolor="#2D4033"
              style="background-color:#2D4033;border-radius:12px 12px 0 0;padding:24px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <div role="img" aria-label="PickPal"
                      style="width:36px;height:36px;background-image:url('${LOGO_DATA_URI}');
                      background-size:36px 36px;background-repeat:no-repeat;
                      background-position:center;display:block;"></div>
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:20px;font-weight:700;color:#FBF7EE;letter-spacing:-0.01em;">PickPal</div>
                    <div style="font-size:12px;color:#a8c0a0;margin-top:2px;">${subtitle}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td bgcolor="#1E2D24"
              style="background-color:#1E2D24;padding:24px 24px 8px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#1E2D24"
              style="background-color:#1E2D24;border-radius:0 0 12px 12px;padding:12px 24px 24px;">
              <p style="margin:0;font-size:12px;color:#5a7a5e;line-height:1.6;">
                ${footer}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildHtml(events: EventToNotify[]): string {
  const cards = events.map(formatEventCard).join("");
  const intro =
    events.length === 1
      ? "Tienes un evento próximo:"
      : "Tienes varios eventos próximos:";
  return emailShell({
    subtitle: "Recordatorio de evento",
    body: `<p style="margin:0 0 16px;font-size:15px;color:#a8c0a0;">${intro}</p>
              ${cards}
              ${buildCta(events)}`,
    footer: `Si no quieres seguir recibiendo estos recordatorios, desactívalos en tus
                <a href="${APP_BASE_URL}/settings" style="color:#5a7a5e;text-decoration:underline;">ajustes</a>
                de PickPal.`,
  });
}

/**
 * Aviso de que alguien te ha compartido su lista (docs/encargo-lista.md,
 * decisión 9, cambiada el 10-oct-2026). El nombre lo elige cada usuario en
 * Clerk, así que no prueba nada: el correo enseña también el email, que está
 * verificado. No lleva nada de la lista, porque sus elementos los escribe
 * otra persona y no deben viajar por correo.
 */
export function buildListInviteEmail({
  ownerName,
  ownerEmail,
}: {
  ownerName?: string;
  ownerEmail?: string;
}): { subject: string; html: string } {
  const display = ownerName?.trim() || ownerEmail?.trim() || "Alguien";
  const oneLine = display.replace(/[\r\n]+/g, " ");
  const name = escapeHtml(oneLine);
  const emailLine =
    ownerName?.trim() && ownerEmail
      ? `<div style="font-size:13px;color:#a8c0a0;margin-top:2px;">${escapeHtml(ownerEmail)}</div>`
      : "";
  const who = ownerEmail ? escapeHtml(ownerEmail) : "otra cuenta de PickPal";
  const card = `
    <table cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#2D4033;border-radius:10px;margin-bottom:10px;">
      <tr>
        <td bgcolor="#2D4033"
          style="padding:16px 18px;background-color:#2D4033;border-radius:10px;">
          <div style="font-size:15px;font-weight:600;color:#FBF7EE;">${name} te ha compartido su lista</div>
          ${emailLine}
          <div style="font-size:13px;color:#a8c0a0;margin-top:10px;line-height:1.5;">Son cosas que le haría ilusión recibir. Guárdala en su ficha y podrás marcar lo que vas a regalarle: no verá lo que marcas.</div>
        </td>
      </tr>
    </table>`;
  return {
    subject: `PickPal · ${oneLine} te ha compartido su lista`,
    html: emailShell({
      subtitle: "Lista compartida",
      body: `<p style="margin:0 0 16px;font-size:15px;color:#a8c0a0;">Tienes una lista nueva:</p>
              ${card}
              ${ctaHtml(`${APP_BASE_URL}/agenda`, "Ver su lista", false)}`,
      footer: `Te llega porque ${who} te ha dado acceso a su lista en PickPal. Si no te
                interesa, pulsa «No me interesa» en la tarjeta de la app. Como mucho
                recibirás un aviso cada 30 días por cada persona.`,
    }),
  };
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no configurada en Convex.");
  }
  const from = process.env.EMAIL_FROM ?? DEFAULT_FROM;

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, reply_to: REPLY_TO, subject, html }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend respondió ${res.status}: ${detail.slice(0, 200)}`);
  }
}

async function sendViaResend(
  to: string,
  events: EventToNotify[],
): Promise<void> {
  await sendEmail(to, buildSubject(events), buildHtml(events));
}

/**
 * La programa `lists.grantAccess` al conceder un acceso nuevo. Es
 * `internalAction`: el destinatario sale de `userSettings.email` del lector,
 * nunca de un argumento del cliente.
 */
export const sendListInviteEmail = internalAction({
  args: {
    to: v.string(),
    ownerName: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
  },
  handler: async (_ctx, { to, ownerName, ownerEmail }) => {
    const { subject, html } = buildListInviteEmail({ ownerName, ownerEmail });
    try {
      await sendEmail(to, subject, html);
    } catch (err) {
      console.error("[emails] Falló el aviso de lista compartida:", err);
    }
  },
});

export const sendBatchedReminderEmail = internalAction({
  args: {
    to: v.string(),
    events: v.array(
      v.object({
        dateId: v.id("importantDates"),
        personId: v.id("people"),
        occurrenceYear: v.number(),
        label: v.string(),
        personName: v.string(),
        personAvatarUrl: v.optional(v.string()),
        month: v.number(),
        day: v.number(),
        daysUntil: v.number(),
        listUnclaimed: v.optional(v.number()),
      }),
    ),
  },
  handler: async (_ctx, { to, events }) => {
    await sendViaResend(to, events);
  },
});

/**
 * Envío de prueba manual, con datos de muestra.
 *
 * Es `internalAction`: no aparece en `api.*`, así que solo se invoca desde
 * el dashboard de Convex, `npx convex run` u otra función del backend —
 * nunca desde el navegador. Por eso no lleva rate limit; el bucket
 * `email_test` que sugiere `docs/security.md` aplicará el día que se
 * exponga un botón "enviar prueba" en Ajustes, que sí sería superficie
 * pública.
 *
 * Sirve para verificar la cadena completa (API key, remitente, dominio
 * verificado y DNS) sin esperar al cron ni depender de que hoy haya
 * eventos dentro de la ventana de antelación.
 *
 * Sin argumentos manda dos tarjetas y el CTA apunta a /agenda. Pasando
 * `personId` + `dateId` reales manda una sola tarjeta con el CTA a la ficha
 * de esa persona, que es la variante que reciben los usuarios cuando solo
 * tienen un evento próximo.
 */
export const sendTestEmail = internalAction({
  args: {
    to: v.string(),
    personId: v.optional(v.id("people")),
    dateId: v.optional(v.id("importantDates")),
  },
  handler: async (_ctx, { to, personId, dateId }): Promise<string> => {
    const single = personId !== undefined && dateId !== undefined;

    // `buildCta` solo lee los ids en la variante de un evento único; con dos
    // tarjetas enlaza a /agenda y no los dereferencia. Estos placeholders,
    // por tanto, nunca llegan a viajar a una URL.
    const SAMPLE_PERSON = "muestra" as unknown as Id<"people">;
    const SAMPLE_DATE = "muestra" as unknown as Id<"importantDates">;

    const primary: EventToNotify = {
      dateId: dateId ?? SAMPLE_DATE,
      personId: personId ?? SAMPLE_PERSON,
      occurrenceYear: 2026,
      label: "Cumpleaños",
      personName: "Marta",
      month: 8,
      day: 3,
      daysUntil: 0,
      // La línea de «Mi lista» solo sale en esta tarjeta, para ver las dos
      // variantes en el mismo correo.
      listUnclaimed: 3,
    };

    const secondary: EventToNotify = {
      dateId: SAMPLE_DATE,
      personId: SAMPLE_PERSON,
      occurrenceYear: 2026,
      label: "Aniversario",
      personName: "Luis",
      // Ejercita la rama de avatar con imagen (`background-image`, el
      // workaround del modo oscuro de Gmail) frente a la inicial de Marta.
      personAvatarUrl: `${APP_BASE_URL}/logo-mark-email.png`,
      month: 8,
      day: 12,
      daysUntil: 5,
    };

    // `daysUntil` 0 y 5 cubren dos de las tres redacciones de `daysText`
    // ("hoy" y "en N días"); "mañana" es `daysUntil === 1`.
    const events = single ? [primary] : [primary, secondary];
    await sendViaResend(to, events);

    const from = process.env.EMAIL_FROM ?? DEFAULT_FROM;
    return `Enviado a ${to} desde "${from}" — ${events.length} tarjeta(s), CTA a ${single ? "la ficha de la persona" : "/agenda"}.`;
  },
});

export const runDailyEmailNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    const users: UserToNotify[] = await ctx.runQuery(
      internal.notifications.findEventsNeedingEmail,
      {},
    );

    let sentUsers = 0;
    let failedUsers = 0;
    for (const user of users) {
      try {
        await ctx.runAction(internal.emails.sendBatchedReminderEmail, {
          to: user.email,
          events: user.events,
        });
        await ctx.runMutation(internal.notifications.markEmailsSent, {
          clerkUserId: user.clerkUserId,
          items: user.events.map((e) => ({
            dateId: e.dateId,
            occurrenceYear: e.occurrenceYear,
            leadDays: e.daysUntil,
          })),
        });
        sentUsers++;
      } catch (err) {
        failedUsers++;
        console.error(
          `[emails] Falló envío a usuario ${user.clerkUserId}:`,
          err,
        );
      }
    }
    console.log(
      `[emails] Cron diario: ${sentUsers} usuario(s) notificados, ${failedUsers} fallo(s).`,
    );
  },
});

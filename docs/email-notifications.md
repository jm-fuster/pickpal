# Notificaciones por correo

Documento vivo. Captura cómo funciona el envío automático de emails de recordatorio de fechas importantes y todas sus implicaciones operativas. Cuando una decisión cambie, se actualiza este archivo en el mismo commit que toca el código.

---

## Qué hace

Un cron diario de Convex revisa los `userSettings` de todos los usuarios. Para cada usuario que tenga las notificaciones por correo activadas, busca las `importantDates` cuya próxima ocurrencia coincida con **alguna** de las antelaciones marcadas por el usuario (`emailNotifyDaysBefore`, array — opciones: 0 / 2 / 7 / 14 días) y le envía **un único email agrupado** con esos eventos. Cada disparo concreto se identifica por `(importantDateId, occurrenceYear, leadDays)` y se registra en una tabla aparte para no duplicar.

La activación y la antelación son configurables desde `/settings`.

---

## Modelo mental

| Concepto | Significado |
|---|---|
| `userSettings.notifyDaysBefore` | **Ventana visual** de la app (campanita y dashboard). "Muéstrame todo lo que ocurra en los próximos 30 días". |
| `userSettings.emailNotifyDaysBefore` | **Gatillos** del email (array). "Avísame cuando falten 14, 7, 2 días o el mismo día". Opciones permitidas: `[0, 2, 7, 14]`. Default `[14]`. Cada antelación marcada produce un email independiente cuando se alcanza. |
| `userSettings.emailNotificationsEnabled` | Toggle on/off. **Desactivado por defecto** — opt-in explícito (ver "Defaults para nuevos usuarios"). |
| `userSettings.email` | Copia local del email del usuario (vino del JWT de Clerk al guardar ajustes). El cron lo lee de aquí, sin volver a pedírselo a Clerk. |
| `emailNotifications` (tabla) | Registro de envíos para deduplicar. Una fila = una ocurrencia notificada. |

**Por qué dos campos de "días"** y no uno solo: la ventana de la campanita es ancha por diseño (muestra muchos eventos por adelantado, scroll cómodo). El email es push y solo dispara una vez por evento. Si compartieran valor, un usuario con `notifyDaysBefore = 60` recibiría correos 60 días antes, lo cual es ruido.

---

## Flujo end-to-end

```
[cron diario 08:00 UTC]
        │
        ▼
internal.emails.runDailyEmailNotifications  (action)
        │
        ├─► internal.notifications.findEventsNeedingEmail  (query)
        │     ├─ recorre userSettings con emailNotificationsEnabled=true
        │     ├─ para cada user, calcula daysUntil de cada importantDate
        │     ├─ filtra eventos cuyo daysUntil ∈ emailNotifyDaysBefore
        │     └─ descarta los ya presentes en emailNotifications(date, year, lead)
        │
        ├─► internal.emails.sendBatchedReminderEmail  (action, una por usuario)
        │     └─ POST https://api.resend.com/emails
        │
        └─► internal.notifications.markEmailsSent  (mutation, si el envío OK)
              └─ inserta filas en emailNotifications
```

Si el envío a un usuario falla (Resend devuelve 4xx/5xx, red caída, etc.), el orquestador **no** marca ese envío como hecho y continúa con el siguiente usuario. Como la ocurrencia sigue sin estar marcada, el cron del día siguiente lo vuelve a intentar — pero ese día ya `daysUntil` no coincidirá con esa antelación concreta y el filtro no matcheará, así que se pierde ese aviso (los demás disparos de la misma fecha siguen funcionando). Asumido conscientemente: simplificar > reintentar (una recuperación robusta requeriría una tabla de "pendientes").

---

## Defaults para nuevos usuarios

Al entrar por primera vez a la app (cualquier ruta autenticada), el componente `UserInitializer` llama a `settings.ensureDefaults`. Esta mutación crea la fila de `userSettings` si no existe, con:

| Campo | Valor por defecto | Condición |
|---|---|---|
| `emailNotificationsEnabled` | `false` | Siempre. Opt-in: el usuario lo activa en `/settings`. |
| `emailNotifyDaysBefore` | `[14]` | Siempre. Array — el usuario puede marcar varias antelaciones (0/2/7/14) en `/settings`. |
| `notifyDaysBefore` | `30` | Siempre (ventana visual de campanita) |
| `email` | Del JWT de Clerk | Si está disponible |

`ensureDefaults` es idempotente: si la fila ya existe, no hace nada. Los usuarios que ya han guardado ajustes manualmente no se ven afectados.

### Por qué el toggle nace apagado (opt-in)

Hasta julio de 2026 el default era `true` (activado si Clerk daba email). Era un **opt-out**: quien nunca pasaba por `/settings` recibía correos sin haberlos pedido, mientras `/privacidad` prometía que los avisos solo salen "si activas las notificaciones" y `docs/privacy.md` §3 declaraba **consentimiento** (RGPD art. 6.1.a) como base legal. Tres piezas que no podían ser ciertas a la vez.

La constante es `DEFAULT_EMAIL_NOTIFICATIONS_ENABLED` en [`convex/settings.ts`](../convex/settings.ts). **No volver a `true`** sin cambiar antes la base legal declarada y las dos páginas legales: el default es la diferencia entre tener consentimiento y no tenerlo.

Los usuarios creados con el default viejo se corrigieron con `migrations:resetEmailNotificationsToOptIn` ([`convex/migrations.ts`](../convex/migrations.ts)), que pone el flag en `false` en todos los docs que lo tuvieran en `true`. No se puede distinguir "activado por el default" de "activado a mano" (no guardamos esa señal), así que resetea a todos: volver a pedir el opt-in es recuperable, seguir enviando sin consentimiento no. Correr **una sola vez** — repetirla después de que alguien reactive sus avisos se los volvería a apagar.

---

## Archivos

| Archivo | Rol |
|---|---|
| [`convex/schema.ts`](../convex/schema.ts) | Campos nuevos en `userSettings` y tabla `emailNotifications` con sus índices. |
| [`convex/settings.ts`](../convex/settings.ts) | `getMine` devuelve los nuevos campos + email del JWT. `setMine` valida y los persiste. `ensureDefaults` inicializa la fila al primer acceso. Si se activa el toggle sin email en JWT, lanza error. |
| [`src/components/layout/UserInitializer.tsx`](../src/components/layout/UserInitializer.tsx) | Componente cliente (renderizado en el app layout). Llama a `ensureDefaults` al montar, una vez por sesión autenticada. |
| [`convex/notifications.ts`](../convex/notifications.ts) | Cálculo de próxima ocurrencia (recurrente / no recurrente), matching contra antelación, dedup vs. `emailNotifications`. Exporta el tipo `EventToNotify` (incluye `personId` para el CTA y `personAvatarUrl` para el avatar en la tarjeta). |
| [`convex/emails.ts`](../convex/emails.ts) | Llama a Resend (vía `fetch`, sin SDK) y orquesta el cron diario. Construye HTML inline en español con diseño visual propio (ver sección "Plantilla de email"). |
| [`convex/crons.ts`](../convex/crons.ts) | `crons.cron("0 8 * * *", ...)` — diario a las 08:00 UTC. |
| [`src/app/(app)/settings/page.tsx`](../src/app/%28app%29/settings/page.tsx) | UI: toggle + grid de checkboxes con las antelaciones (0/2/7/14) + email destino visible. |

---

## Plantilla de email

El HTML se genera en `convex/emails.ts` (`buildHtml()`). No usa React Email ni ninguna librería externa — es una cadena de template literal con tabla HTML para compatibilidad con clientes de correo.

### Estructura visual

La plantilla es **oscura por diseño** (verde profundo + coral), en los dos modos del cliente — el email no tiene tema claro.

```
┌─────────────────────────────────────────┐
│  Página #141e17                         │
│  Header #2D4033                         │
│  [logo 36px] PickPal (#FBF7EE)          │
│              "Recordatorio de evento"   │
├─────────────────────────────────────────┤
│  Body #1E2D24                           │
│  "Tienes un evento próximo:" (#a8c0a0)  │
│  ┌─ card por evento (#2D4033) ───────┐  │
│  │  [avatar 44px]  Nombre (#FBF7EE)  │  │
│  │                 Etiqueta · dd/mm  │  │
│  │                 "en X días" coral │  │
│  │                 [N cosas en su    │  │
│  │                  lista…] (enlace) │  │
│  └───────────────────────────────────┘  │
│  [ 🎁 Ideas para {nombre} ] (#F1704B)   │
├─────────────────────────────────────────┤
│  Footer #1E2D24 · opt-out (#5a7a5e)     │
└─────────────────────────────────────────┘
```

### Paleta

Hex fijos porque los clientes de correo no soportan CSS variables ni `oklch`. Es una paleta **propia del email** (verdes oscuros + el coral del logo), no una traducción 1:1 de los tokens de la app — contrastada con el código el 28-ago-2026.

| Hex | Uso |
|---|---|
| `#141e17` | Fondo de página |
| `#1E2D24` | Fondo de body y footer |
| `#2D4033` | Header y cards |
| `#3D5040` | Borde del avatar y fondo del círculo de inicial |
| `#FBF7EE` | Texto principal (nombre, wordmark) |
| `#a8c0a0` | Texto secundario (intro, etiqueta · fecha, subtítulo) |
| `#F1704B` | Countdown "en X días" y fondo del CTA (el coral del logo) |
| `#5a7a5e` | Footer y su enlace |

### Logo en cabecera

`logo-mark-email.png` servido desde `APP_BASE_URL` (Next.js public folder). Se renderiza a 36 × 36 px como `background-image` de un `<div role="img">` — no como `<img>`, ver «Modo oscuro» abajo. Los clientes que bloqueen imágenes remotas muestran solo el texto "PickPal".

### Avatar de la persona

Cada tarjeta incluye el avatar circular de la persona (44 × 44 px):
- Si `personAvatarUrl` está disponible: `<div role="img">` con la foto como `background-image`, `border-radius:50%` y borde de 2 px `#3D5040`.
- Si no hay URL: tabla de 44 × 44 con fondo `#3D5040` y la inicial del nombre en `#FBF7EE` centrada.

El campo `personAvatarUrl` se propaga desde `person.avatarUrl` en `convex/notifications.ts` (`findEventsNeedingEmail`) y se declara como `v.optional(v.string())` en el validator de `sendBatchedReminderEmail`.

### Línea de «Mi lista» (10-oct-2026)

Si el destinatario guardó en la ficha de esa persona la lista que ella le compartió, la tarjeta añade debajo de la cuenta atrás «{nombre} tiene N cosas en su lista que nadie ha marcado todavía» (en singular con N = 1), enlazada a `/seres-queridos/{personId}#lista`, en `#FBF7EE` y subrayada a 12 px. Solo la cifra, nunca títulos: el correo pasa por Resend (decisión 18 de [`encargo-lista.md`](encargo-lista.md)). La cuenta la hace `lists.countUnclaimedForReader` dentro de `findEventsNeedingEmail`, solo para los eventos que van a enviarse, y viaja en `listUnclaimed`, opcional y ausente si es 0. El HTML lo pinta `listLineHtml`, con sus tests en `convex/emails.test.ts`. Como el aviso solo llega a quien es dueño de la ficha, quien la tiene compartida como invitado no ve esta línea, igual que no recibe el aviso.

### Modo oscuro en clientes de correo (resuelto 28-ago-2026)

Gmail en móvil "ayuda" invirtiendo los colores de los emails cuando el sistema está en oscuro, y **aplica filtros a los `<img>` ignorando `filter:none` y el meta `color-scheme`**. Como esta plantilla ya es oscura, la inversión la destrozaba: logo, icono de regalo y avatar salían alterados.

La defensa aplicada, de más a menos peso:
1. **Toda imagen va como `background-image`** de un `<div>`/`<span>` (logo, icono del CTA, avatar) — los filtros de Gmail atacan elementos `<img>`, no fondos.
2. `<meta name="color-scheme" content="light">` + `supported-color-schemes` para que los clientes que sí lo respetan no re-tematicen.

**Verificado el 28-ago-2026** con `emails:sendTestEmail` en la app de Gmail en móvil con el modo oscuro del sistema activo: logo, icono y avatar intactos. Si algún cliente vuelve a distorsionar, el siguiente escalón es servir las imágenes con el fondo oscuro horneado en el propio PNG.

### Botón CTA

- **1 evento** → `🎁 Ideas para {personName}` → `…/seres-queridos/{personId}/gifts?occasion={label}`
- **N eventos** → `🎁 Ver próximos eventos` → `…/agenda`

`white-space:nowrap` garantiza que el botón nunca parte en dos líneas en móvil.

La URL base está hardcodeada como constante `APP_BASE_URL = "https://pickpal.jorgemolinafuster.com"` en `emails.ts`. Si el dominio cambia, actualizar ahí. Alimenta tanto los links (CTA y footer) como las imágenes del email (logo e icono de regalo, servidos desde `/public`), así que un valor obsoleto rompe las dos cosas a la vez.

### Sender avatar (foto de perfil del emisor)

El avatar que aparece junto al remitente en clientes como Gmail **no** lo controla el HTML del email — lo decide el cliente (Gravatar, sus propios índices, o BIMI). Para configurarlo en Gmail es necesario verificar dominio en Resend y publicar un registro DNS BIMI con un logo SVG. Fuera del alcance actual.

### Footer

> Si no quieres seguir recibiendo estos recordatorios, desactívalos en tus [ajustes](https://pickpal.jorgemolinafuster.com/settings) de PickPal.

"ajustes" enlaza a `/settings`. Texto en minúsculas deliberadamente — registro conversacional.

---

## Cálculo de próxima ocurrencia

Misma lógica que `importantDates.getUpcoming`, replicada en [`convex/notifications.ts`](../convex/notifications.ts):

- **No recurrente** (`recurring === false`): si tiene `year` y aún no ha pasado, `daysUntil` desde hoy. Si no hay `year` o ya pasó → la fecha no entra al cálculo.
- **Recurrente** (default): se prueba con el aniversario de este año. Si ya pasó, salta al del año siguiente. `occurrenceYear` es el año real de la ocurrencia (clave para deduplicar).

El cálculo se hace **siempre en UTC** (`Date.UTC(...)`) para que el cron, que corre en horario UTC, no se desfase por DST.

---

## Variables de entorno

Viven en el **deployment de Convex**, no en Next.js, porque solo las consume el backend.

```bash
npx convex env set RESEND_API_KEY re_xxxxxxxxxxxxx
npx convex env set EMAIL_FROM "PickPal <hola@pickpal.jorgemolinafuster.com>"   # opcional
```

Para el deployment de producción se añade `--prod` a cada comando. En PowerShell las comillas del valor de `EMAIL_FROM` son obligatorias: sin ellas, `<` y `>` se interpretan como redirección.

| Variable | Obligatoria | Default | Notas |
|---|---|---|---|
| `RESEND_API_KEY` | **sí** | — | API key de Resend. Sin ella, `sendBatchedReminderEmail` lanza error. |
| `EMAIL_FROM` | no | `PickPal <hola@pickpal.jorgemolinafuster.com>` | Remitente, en formato `Nombre <dirección>`. El dominio debe estar verificado en Resend; la parte local no necesita buzón real. |

**Las respuestas van a otro sitio.** El subdominio del remitente es un CNAME a Vercel y no puede recibir correo, así que quien contestaba a un aviso escribía a un buzón que no existe. Desde el 27-sep-2026, `sendViaResend` manda `reply_to: pickpal@jorgemolinafuster.com`, la misma dirección de contacto que publican `/privacidad` y `/terminos`. Es una constante (`REPLY_TO` en `convex/emails.ts`), no una variable de entorno: es la vía para ejercer derechos RGPD y no debe poder divergir entre entornos.

### Dominio de envío

El dominio verificado en Resend es **`pickpal.jorgemolinafuster.com`**, el mismo que sirve la app (`APP_BASE_URL` en [`convex/emails.ts`](../convex/emails.ts)). El `.vercel.app` original queda como alias de Vercel.

Los registros DNS (SPF/DKIM) viven en la zona de `jorgemolinafuster.com` bajo `send.pickpal` y `resend._domainkey.pickpal`, mientras que el propio `pickpal` apunta a Vercel. Conviven sin problema porque son nombres distintos, pero **hay que tenerlo presente al tocar DNS**: borrar o reemplazar los registros de `pickpal` pensando solo en el hosting puede tumbar el envío de emails, y al revés.

Si el estado en Resend → Domains no es *Verified*, todo envío falla con 403 aunque las variables de entorno estén bien puestas.

---

## Requisitos en Clerk

El JWT template `convex` debe incluir el claim `email`. Sin él:

- `setMine` lanza `"No encontramos tu email..."` cuando se activa el toggle.
- El cron no puede determinar el destinatario del usuario.

Configuración en Clerk Dashboard → Configure → JWT Templates → convex:

```json
{
  "email": "{{user.primary_email_address}}",
  "email_verified": "{{user.email_verified}}"
}
```

> Si más adelante se quiere exigir solo emails verificados, el filtro se haría en `setMine` leyendo `identity.emailVerified`.

---

## Cadencia y modelo de envíos

- **Una ejecución diaria** del cron a las **08:00 UTC** (10:00 verano / 09:00 invierno en España peninsular). Hora elegida para que el correo llegue en horario de mañana sin invadir madrugadas.
- **Un email por usuario** que tenga eventos disparando ese día. Si un usuario tiene 3 cumples a 7 días vista, recibe 1 correo con los 3, no 3 correos.
- **Sin reintentos automáticos** (ver "Flujo end-to-end").
- **Recordatorios escalonados (multi-trigger)**: el usuario puede marcar varias antelaciones (0/2/7/14) en `/settings`. Cada antelación marcada genera un email independiente cuando se alcanza. La dedupe es por `(importantDateId, occurrenceYear, leadDays)`, así que los avisos a 14 y a 7 días para la misma ocurrencia coexisten sin bloquearse.

---

## Seguridad

Resumen — el detalle vive en [`docs/security.md`](security.md).

- Funciones de envío y query de eventos son **`internal*`** — nunca expuestas en `api.*`. Solo el cron las puede invocar.
- El email destino se lee del JWT de Clerk en `setMine`. **Nunca** se acepta como argumento del cliente; eso permitiría a un usuario malicioso enviar correos a cuentas ajenas con plantilla de PickPal.
- `emailNotifications` lleva `clerkUserId` en todas sus filas. Cualquier query futura sobre la tabla debe filtrar por usuario (`by_user`) — no exponer índices que crucen usuarios.
- El cron corre 1 vez/día y la dedup `(importantDateId, occurrenceYear)` impide duplicados, así que no necesita rate limit. Si en algún momento se añade un endpoint manual "enviar email de prueba", aplicar `checkAndIncrement` con bucket `email_test` (sugerido: 5/día).
- `RESEND_API_KEY` es secret server-only; vive en el entorno de Convex, **no** en `NEXT_PUBLIC_*`.

---

## Privacidad

- El email del usuario se almacena en `userSettings.email` por dos razones: (1) evitar que el cron tenga que llamar a la API de Clerk en cada ejecución, (2) tener un valor estable aunque cambie el JWT.
- Si el usuario desactiva el toggle, el campo `email` **se conserva** (no se borra en `setMine`). Esto permite reactivar sin volver a forzar Save desde un cliente con JWT fresco. Si en el futuro hay tema de RGPD que exija borrarlo, hay que añadir lógica explícita.
- El cuerpo del email contiene nombres de personas y etiquetas de eventos del usuario — son datos del propio usuario y van a su email, no se filtran a terceros. La única excepción es la línea de «Mi lista»: una cifra sobre la lista de otro usuario, que la ha compartido con el destinatario. Por eso es solo una cifra. Resend almacena los emails enviados durante un tiempo en su panel; revisar [política de Resend](https://resend.com/legal/privacy-policy) si la app crece.

---

## Costes y límites

- **Resend free tier**: 3.000 emails/mes, 100/día. Con un usuario y la mayoría de eventos siendo cumpleaños anuales, el consumo real es bajísimo (≤ N personas × 1 email/año por persona).
- **Cron de Convex**: incluido en el plan free. Una ejecución/día.
- **Crecimiento**: el límite duro lo marca Resend. Con 100 usuarios y 5 eventos/usuario, sigue cabiendo holgadamente. Si se acerca, paso lógico es plan de pago de Resend o cambiar a Postmark/SES.

---

## Operativa

### Probar manualmente sin esperar al cron

**Opción A — disparo real del cron** (requiere que haya eventos con `daysUntil === emailNotifyDaysBefore` hoy):

```bash
# dev
npx convex run emails:runDailyEmailNotifications

# prod
npx convex run emails:runDailyEmailNotifications --prod
```

**Opción B — `emails:sendTestEmail`** (envía datos de muestra a cualquier dirección, sin condición de días y sin tocar la base de datos):

```bash
npx convex run emails:sendTestEmail '{"to":"tu@email.com"}' --prod
```

Es la vía recomendada para comprobar la cadena completa —API key, remitente, dominio verificado, DNS— porque no depende de que hoy haya eventos dentro de la ventana de antelación. Devuelve un resumen con el remitente real usado, útil para confirmar que `EMAIL_FROM` está donde crees.

Sin argumentos extra manda **dos tarjetas** y el CTA apunta a `/agenda`. Una tarjeta usa avatar con imagen y la otra la inicial, para ejercitar las dos ramas de `avatarHtml`; los `daysUntil` de muestra (0 y 5) cubren las redacciones "hoy" y "en N días". La primera tarjeta lleva además la línea de «Mi lista» (`listUnclaimed: 3`) y la segunda no, para ver las dos variantes.

Para revisar la variante de **un solo evento**, que es la que enlaza a la ficha de la persona, pásale un `personId` y un `dateId` reales del mismo deployment:

```bash
npx convex run emails:sendTestEmail '{"to":"tu@email.com","personId":"...","dateId":"..."}' --prod
```

Sin esos dos argumentos los ids internos son placeholders que nunca llegan a una URL, así que el CTA de `/agenda` funciona igual. Ojo con mezclar deployments: ids de dev no existen en prod, y el CTA daría una pantalla de error (esperado, no es un bug).

No lleva rate limit porque es `internalAction` y no hay forma de invocarla desde el navegador. Si algún día se expone un botón "enviar prueba" en Ajustes, ahí sí aplica el bucket `email_test` que indica [`docs/security.md`](security.md).

### Logs

```bash
npx convex logs           # dev
npx convex logs --prod    # prod
```

El orquestador imprime al final un resumen `[emails] Cron diario: X usuario(s) notificados, Y fallo(s).` y un `console.error` por cada usuario que falló.

### Inspeccionar qué eventos disparan hoy

```bash
npx convex run notifications:findEventsNeedingEmail
```

Devuelve la lista que el orquestador tomaría como entrada, **sin enviar** nada. Útil para depurar por qué no llega un correo (¿falta el toggle? ¿falta email en JWT? ¿la fecha no matchea la antelación? ¿ya estaba en `emailNotifications`?).

### Forzar un reenvío

Si por alguna razón hay que reenviar un aviso ya marcado como enviado, hay que borrar la fila correspondiente de `emailNotifications` desde el dashboard de Convex (Tables → emailNotifications → eliminar fila por `(importantDateId, occurrenceYear)`) y luego relanzar `emails:runDailyEmailNotifications`.

---

## Limitaciones conocidas y decisiones "ahora no"

- **Sin reintentos**: ver "Flujo end-to-end".
- **Sin email de prueba desde Ajustes**: existe `emails:sendTestEmail`, pero solo por CLI/dashboard. Exponerlo en la UI requiere el bucket de rate limit `email_test`. Ver "Opción B" en la sección de operativa.
- **Sin localización**: el correo va siempre en español, igual que el resto de la app.
- **Sin opciones por evento**: el toggle es global. No se puede silenciar el recordatorio de una persona o evento concreto.
- **Sin verificación de email**: si el JWT trae `email_verified=false`, hoy no se rechaza. Aceptable mientras Clerk no permita registros sin verificar; revisar si cambia.
- **Sin BIMI**: el avatar del remitente en Gmail requiere un registro DNS BIMI con logo SVG. Ver "Sender avatar". Fuera del alcance actual.
- **Sin DMARC** (decidido el 2026-07-29; **la condición de revisarlo ya se ha cumplido**): SPF y DKIM sí están; falta la política que dice al receptor qué hacer cuando fallan. Su valor real es impedir que suplanten el dominio, y se dejó fuera mientras el dominio escribía a un puñado de direcciones conocidas: nadie tenía incentivo para suplantarlo, y el correo ya entregaba a bandeja, no a spam. La decisión decía «se retoma cuando el dominio pase a ser público», y eso ya ha pasado, así que toca ponerlo. No acumula deuda: es un registro DNS de un minuto:

  ```
  _dmarc.pickpal  TXT  "v=DMARC1; p=quarantine"
  ```

  Se puede ir directo a `p=quarantine` en vez de pasar por `p=none`: solo hay un remitente (Resend) y el DKIM alinea con el dominio del `From`, así que el riesgo de tumbar correo legítimo es mínimo. El escalón `p=none` tiene sentido cuando envías desde varios sitios y necesitas los informes `rua` para descubrir cuáles fallan.

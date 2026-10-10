# Política de privacidad · PickPal

**Publicado el 20-sep-2026, revisado el 27-sep-2026 y ampliado el 10-oct-2026 con «Mi lista» (§2.6).** El contenido vivo es [`/privacidad`](../src/app/privacidad/page.tsx); este documento es la versión larga de trabajo y tiene que moverse con ella. El NIF y la dirección postal se han retirado a propósito (ver §1). Las secciones marcadas con _Revisar_ requieren decisión consciente.

> **Revisión del 27-sep-2026.** La página publicada no nombraba al responsable ni daba las bases legales (§3) ni las transferencias (§5): solo estaban aquí, y el art. 13 pide que las vea el usuario. Ahora las tres cosas están en `/privacidad`. En la misma pasada se corrigieron el régimen de Gemini (§4.1: desde el EEE, Google aplica sus reglas de datos de pago, así que no entrena con los datos), la edad mínima (§10: 18, no 14) y el papel de PickPal frente a los datos de terceros (§7: responsable, no encargado).

> **Bloqueo resuelto (20-sep-2026):** `pickpal@jorgemolinafuster.com` ya entrega, vía Cloudflare Email Routing sobre el apex `jorgemolinafuster.com` (3 MX de Cloudflare + `v=spf1 include:_spf.mx.cloudflare.net ~all`, reenvío a buzón personal). Comprobado con un envío real desde fuera del dominio. El subdominio `pickpal.jorgemolinafuster.com` sigue siendo un CNAME a Vercel y **no puede** recibir correo; no intentes ponerle MX.

Última actualización: `10 de octubre de 2026`

> Cuando se publique la app, este contenido debe servirse en `/privacy` (p. ej. `src/app/(legal)/privacy/page.tsx`) y enlazarse desde el footer y desde la pantalla de registro.

---

## 1. Responsable del tratamiento

- **Titular:** Jorge Molina Fuster
- **Email de contacto:** [pickpal@jorgemolinafuster.com](mailto:pickpal@jorgemolinafuster.com)
- **Delegado de protección de datos (DPO):** _No aplica_ (no se cumplen los supuestos del art. 37 RGPD para PickPal mientras sea operación a pequeña escala).

> **El NIF y la dirección postal no figuran a propósito.** El art. 13 del RGPD pide la identidad del responsable y unos datos de contacto, **no su número fiscal**. Quien exigía esos dos campos era el art. 10 de la LSSI, que hoy no aplica a PickPal; el razonamiento completo y el disparador que obliga a revisarlo están en [`legal.md`](legal.md) §1.

---

## 2. Datos que tratamos

### 2.1 Datos del usuario registrado

Recogidos a través de [Clerk](https://clerk.com) cuando el usuario se registra:

- Email
- Nombre (si lo proporciona)
- Identificador único de usuario
- Datos de sesión (IP, user-agent, timestamps de login) — gestionados por Clerk

### 2.2 Datos introducidos por el usuario sobre terceros

El usuario introduce información sobre personas de su entorno (amigos, familia, etc.):

- Nombre
- Tipo de relación
- Intereses
- Notas libres
- Rango de presupuesto
- Fechas señaladas (cumpleaños, aniversarios)

**Importante:** estos datos **no son del usuario, son de terceros**. Ver sección 7.

### 2.3 Datos de uso

- Contadores de cuota diaria de recomendaciones (anti-abuso)
- Logs de errores en servidor (sin contenido personal)

### 2.4 Cookies

- **Clerk** instala cookies técnicas de sesión (1ª parte). No requieren consentimiento bajo LSSI art. 22.2.
- **Cloudflare Turnstile** (subencargado de Clerk) se carga en las pantallas de acceso como verificación anti-bot — está en el `script-src`/`frame-src` de la CSP. Ve la IP del visitante. Es medida de seguridad necesaria para prestar el servicio, no seguimiento, pero se menciona en `/privacidad` para no afirmar que Clerk es el único tercero presente en el login.
- **No usamos cookies analíticas, publicitarias ni de terceros.** La analítica de uso se hace con **Vercel Web Analytics**, sin cookies y con métricas agregadas.
- **Que no use cookies no la saca del art. 22.2 LSSI.** Según las Directrices 2/2023 del CEPD, también cuenta un script que lee información del dispositivo y la envía, y el de Vercel manda cada visita. Lo que la hace defendible sin banner es el criterio de la [guía de cookies de la AEPD](https://www.aepd.es/sites/default/files/2020-07/guia-cookies.pdf) (2023) para la medición propia, agregada y con fines estadísticos: bajo riesgo si se informa y se deja negarse. Se informa en `/privacidad` («Cookies»). Para negarse hay dos vías desde el 27-sep-2026: el interruptor «Contar mis visitas» de esa misma sección ([`AnalyticsOptOut`](../src/components/analytics-opt-out.tsx)) y las señales Global Privacy Control y Do Not Track del navegador. En cualquiera de los dos casos, `beforeSend` en [`src/components/analytics.tsx`](../src/components/analytics.tsx) descarta la visita. Antes, este punto decía que la analítica «no almacena ni accede a información en el dispositivo» y que por eso no necesitaba nada; era la conclusión equivocada.
- **El interruptor guarda su estado en `localStorage`** (clave `pickpal-analytics-opt-out`), solo en ese navegador. Guardarlo no requiere consentimiento: es estrictamente necesario para un servicio que el usuario pide expresamente, que es que no se le cuente.
- Si en el futuro se añade analítica basada en cookies (Plausible con cookies, GA, etc.) o publicidad, habrá que añadir banner de consentimiento y actualizar este documento.

### 2.5 Compartir fichas entre usuarios de PickPal

Desde el 20-sep-2026, un usuario puede compartir la ficha de un ser querido
con **otro usuario de PickPal** (`convex/personShares.ts`). Es un flujo
distinto del de la sección 7: allí el tercero no usa PickPal; aquí quien
recibe el acceso es una cuenta autenticada que va a ver y editar datos dentro
de la propia app, no un tercero pasivo.

- **Qué se comparte:** la ficha entera —incluidas las alergias/restricciones,
  dato de salud (art. 9 RGPD)— más su historial de regalos e ideas guardadas
  (con autoría de quien añadió cada entrada). **No** se comparten las tandas
  de recomendaciones generadas por la IA: cada usuario genera y ve las suyas,
  vía el índice `by_user_person_occasion_type` de `recommendations`.
- **Disclosure antes de compartir:** la pantalla de invitar enumera qué se va
  a compartir, con mención explícita a las alergias, antes de confirmar — no
  basta con que esté en esta página (ver `AiNotesNotice` para el mismo
  principio aplicado a las notas).
- **Quién puede qué:** solo quien creó la ficha puede compartirla o borrarla
  para todos. Quien recibe el acceso puede desligarse cuando quiera
  (`personShares.leave`) sin que la ficha desaparezca para el resto.
- **Al cerrar la cuenta de quien creó la ficha:** no se borra si tiene
  invitados — la propiedad pasa al invitado más antiguo (`personShares.
  transferToOldestInviteeOrNull`), para no borrarle sus datos por una
  decisión que no tomó él. Ver §6.
- **Base legal:** ejecución de contrato — es una funcionalidad que el usuario
  activa explícitamente, no un tratamiento por defecto.

### 2.6 «Mi lista»

Desde el 10-oct-2026 cada usuario tiene una lista de lo que le haría ilusión
recibir y puede compartirla con otros usuarios de PickPal
(`convex/lists.ts`; el diseño completo está en
[`encargo-lista.md`](encargo-lista.md)). A diferencia de §2.5, aquí los datos
son **del propio usuario**, no de un tercero.

- **Qué se guarda:** por elemento, un título, un enlace y una nota opcionales
  (`listItems`); a quién se le ha dado acceso, con el nombre de pila y el email
  del dueño copiados de su JWT al compartir (`listShares`); y las marcas de
  «Lo regalo yo» de cada lector (`listClaims`).
- **Quién ve qué:** el lector ve los elementos y el nombre y email del dueño,
  pero no quién más la lee ni quién ha marcado cada cosa. El dueño ve sus
  elementos y a quién la ha compartido, nunca las marcas. El acceso se
  comprueba contra el permiso del dueño, nunca contra el acceso a la ficha en
  la que el lector la guarda (ver `security.md` §11).
- **Las marcas no salen en la exportación del dueño.** Una marca dice algo del
  dueño (qué le van a regalar), pero es un dato de quien la hace y entregársela
  al dueño frustraría la sorpresa de un tercero. Se apoya en el art. 15.4 RGPD:
  el derecho a obtener copia no puede perjudicar los derechos de otros. Cada
  marca sí sale en la exportación de quien la hizo.
- **Enlaces:** el servidor nunca abre las URLs que apunta el usuario; solo las
  guarda. No hay vista previa ni petición a la tienda: el logo se resuelve en el
  navegador contra una tabla fija de dominios.
- **Gemini no recibe la lista.** `buildPrompt` no la lee.
- **Correo de aviso:** si quien recibe el aviso ha guardado la lista en la
  ficha de esa persona, la tarjeta lleva cuántos elementos no ha marcado nadie.
  Solo la cifra, nunca títulos (§4).
- **Correo de invitación (desde el 10-oct-2026):** al conceder un acceso nuevo,
  el lector recibe un correo con el nombre y el email del dueño y un enlace a
  la app; nada de la lista. Como mucho uno cada 30 días por pareja de dueño y
  lector, registrado en `listInviteEmails` (que se borra con la cuenta y sale
  en la exportación). No depende del interruptor de avisos de Ajustes: ese
  interruptor es el consentimiento para los recordatorios de las fechas
  propias, y este correo es parte del servicio de listas que el dueño activa
  al compartir, así que va con la misma base que el resto de la lista.
- **Al borrar un elemento ya marcado,** quien lo marcó conserva una copia
  (título, enlace y nota) hasta que quita su marca. Si ya lo había dado por
  regalado, la marca desaparece.
- **Base legal:** ejecución de contrato — es una funcionalidad que el usuario
  activa explícitamente, igual que compartir fichas.

---

## 3. Finalidades y bases legales

| Finalidad | Datos | Base legal (RGPD art. 6) |
|---|---|---|
| Permitir el uso de la app (cuenta, login) | Datos de Clerk | Ejecución de contrato (b) |
| Almacenar la libreta personal del usuario | Datos del propio usuario | Ejecución de contrato (b) |
| Almacenar y usar los datos de sus seres queridos (libreta, recomendaciones con IA, avisos, compartir) | Datos sobre terceros, fechas | Interés legítimo (f) — del usuario, en organizar fechas y regalos, y de PickPal, en prestarle el servicio. La (b) no les cubre: el tercero no es parte del contrato. Ver §7. |
| Generar recomendaciones de regalo con IA | Ficha de la persona seleccionada | Ejecución de contrato (b) frente al usuario; (f) frente al tercero, como la fila anterior |
| Enviar avisos de fechas próximas | Email + fechas + nombre del ser querido | Consentimiento (a) — opt-in explícito: el toggle nace **apagado** (`DEFAULT_EMAIL_NOTIFICATIONS_ENABLED = false`) y solo se activa desde `/settings`. Se retira apagándolo allí, y cada correo enlaza a esa pantalla (art. 13.2.c). Ver [`email-notifications.md`](email-notifications.md) · "Por qué el toggle nace apagado". |
| Compartir la ficha de un ser querido con otro usuario | Ficha completa (incl. alergias), historial e ideas guardadas | Ejecución de contrato (b) — el usuario activa la función explícitamente, con disclosure previa (ver §2.5) |
| «Mi lista»: guardarla, compartirla, avisar por correo al lector y marcar en listas ajenas | Elementos de la lista, nombre y email del dueño, email del lector, marcas | Ejecución de contrato (b) — el usuario activa la función explícitamente (ver §2.6) |
| Prevenir abuso (rate limit, logs) | Identificador de usuario, contadores | Interés legítimo (f) |
| Analítica de uso agregada (Vercel Web Analytics, sin cookies) | Páginas vistas | Interés legítimo (f) |

Desde el 27-sep-2026 estas bases están resumidas en `/privacidad` («Para qué los usamos y con qué base legal»), que es donde las pide el art. 13.1.c y d. Antes solo vivían en esta tabla.

---

## 4. Encargados del tratamiento

Compartimos datos con los siguientes proveedores que actúan como encargados:

| Proveedor | Para qué | Ubicación | Garantías |
|---|---|---|---|
| [Clerk](https://clerk.com) | Autenticación y gestión de cuentas | EE. UU. | DPA incorporado a sus términos, sin firma aparte. Transfiere por el EU-US DPF (está adherida) y deja las SCCs de respaldo |
| [Convex](https://convex.dev) | Base de datos y backend | EE. UU. (el deployment de producción está en la región por defecto; el de desarrollo, en `eu-west-1`) | DPA incorporado a sus términos, con las SCCs incorporadas por referencia |
| [Google (Gemini API)](https://ai.google.dev) | Generación de recomendaciones | EE. UU. | DPA de Google como encargado («Data Processing Addendum for Products Where Google is a Data Processor»), que Google aplica a quien usa la API desde el EEE (§4.1). Google LLC está adherida al EU-US DPF |
| [Vercel](https://vercel.com) | Hosting de la web y analítica de uso *cookieless* (Vercel Web Analytics) | EE. UU. | Adherida al EU-US DPF, así que la transferencia está cubierta |
| [Resend](https://resend.com) | Envío de los correos de aviso | EE. UU. | DPA vinculante al aceptar sus términos, con las SCCs incorporadas; además, adherida al EU-US DPF. Recibe el email del usuario, el **nombre del ser querido**, el evento, la fecha y la URL del avatar (ver 4.3) y, si el usuario guardó en esa ficha la lista que le compartió esa persona, cuántos elementos no ha marcado nadie (§2.6). Para el aviso de lista compartida, el email del lector y el nombre y el email del dueño (§2.6) |
| [Pexels](https://www.pexels.com) | Fotos de stock que ilustran las ideas de regalo | EE. UU. | Solo recibe búsquedas genéricas en inglés (server-side) y la IP del navegador al cargar las fotos (ver 4.2) |
| [Brandfetch](https://brandfetch.com) | Resolver la web oficial de las marcas favoritas + servir sus logos | EE. UU. | Solo recibe el **nombre de la marca** (server-side) y la IP del navegador al cargar el logo (ver 4.2) |
| [DiceBear](https://www.dicebear.com) | Avatares ilustrados de los seres queridos | UE | Recibe los rasgos elegidos para el dibujo (en el query string) y la IP del navegador (ver 4.2) |

**Comprobado el 27-sep-2026** en el DPA publicado por cada proveedor: Clerk, Convex y Resend lo incorporan a sus términos sin firma aparte, y Google aplica el suyo a quien usa la Gemini API desde el EEE. Hay que volver a comprobarlo si cambia algún proveedor.

### 4.1 Datos enviados a Google Gemini

Cuando el usuario pide recomendaciones, `buildPrompt` ([`src/app/api/recommendations/route.ts`](../src/app/api/recommendations/route.ts)) envía a Gemini **toda la ficha** de la persona seleccionada:

| Campo | ¿Se envía? |
|---|---|
| Nombre | **Solo el nombre de pila** (`name.trim().split(/\s+/)[0]`) — los apellidos nunca salen |
| Relación (etiqueta legible), intereses, marcas favoritas | Sí |
| Notas | Sí, **texto libre íntegro** |
| Tallas (zapato, ropa), alergias / restricciones, cosas que no le gustan | Sí |
| Presupuesto (min/max), ocasión | Sí |
| Historial de regalos (hasta 10: nombre, ocasión, año, reacción) | Sí — las `notes` de cada entrada del historial **no** |
| Categorías de ideas descartadas (`dislikedCategories`, las que el usuario ha ido rechazando) | Sí |
| Fecha de nacimiento / edad | **No** (solo la etiqueta de la ocasión) |

Mantener esta tabla sincronizada con `buildPrompt` y con el párrafo de Gemini en [`/privacidad`](../src/app/privacidad/page.tsx). El texto publicado decía "solo su nombre de pila y la ocasión", lo que dejaba fuera notas y alergias — precisamente los dos campos que más importa contar, porque son texto libre y datos de salud que salen de PickPal.

Nótese que **`alergias / restricciones` puede contener datos de salud** (art. 9 RGPD) y se envía. El campo existe porque una alergia alimentaria es lo que evita un regalo inservible; los términos piden anotar solo lo imprescindible, no un historial médico, y el aviso in-app junto a notas advierte del destino.

**Régimen de Google, verificado el 27-sep-2026** contra los [términos adicionales de la Gemini API](https://ai.google.dev/gemini-api/terms) (en vigor desde el 23-mar-2026):

- **Sin entrenamiento.** La sección *How Google Uses Your Data* aplica las reglas de datos de pago a quien usa la API desde el EEE, sea cual sea la capa. Google no usa las entradas ni las salidas para mejorar sus productos y las trata como encargado según su DPA. Este documento y `/privacidad` afirmaban lo contrario («Google puede entrenar con ellos») porque se escribieron sobre la cláusula genérica de la capa gratuita, sin leer esta excepción.
- **Conservación:** Google registra las entradas y salidas **55 días**, solo para detectar abusos de su política de uso ([usage policies](https://ai.google.dev/gemini-api/docs/usage-policies)). Personal autorizado de Google solo las revisa si sus sistemas marcan un posible abuso.
- **Edad:** la sección *Age Requirements* prohíbe usar la API en apps dirigidas a menores de 18 o que probablemente usen. Por eso la edad mínima es 18 (§10).

Aunque Google no entrena con ellas, las notas salen de PickPal. Por eso se avisa al usuario de no escribir en ellas nada que no quiera compartir con Google, en tres sitios:

1. **En la app**, junto a los dos campos de notas (alta y ficha): componente [`AiNotesNotice`](../src/components/people/AiNotesNotice.tsx). Es el aviso que de verdad se lee, porque está donde se escribe.
2. En `/privacidad` (párrafo de Google) y en `/terminos` (sección de IA).
3. En la sección 7 de este documento.

Durante un tiempo este párrafo afirmaba que el aviso existía "en la app" cuando no existía en ninguna pantalla. Si se toca el flujo de notas, comprobar que el componente sigue montado en **ambos** sitios.

> **Todo lo que `/privacidad` dice de Google descansa en estas secciones de sus términos.** Si Google publica una versión nueva, o si se cambia de proveedor de IA, releerlas antes que nada y actualizar en el mismo commit esta sección, `/privacidad`, `/terminos` y el comentario de `AiNotesNotice`.

### 4.2 Imágenes de terceros (Pexels, Brandfetch y DiceBear)

**Créditos.** El estilo «dylan» de DiceBear es una adaptación de una obra de Natalia Spivak con licencia CC BY 4.0, que exige atribución: está en `/terminos` («Créditos») desde el 27-sep-2026, con autora, obra, licencia y enlaces. Antes solo figuraba en el README, que no ve quien usa la app. Las pautas de la API de Pexels piden un enlace visible a Pexels y dar crédito al fotógrafo cuando sea posible. El enlace está en esos mismos créditos y, desde el 27-sep-2026, también bajo la rejilla de ideas cuando alguna trae foto («Fotos de Pexels»). Va fuera de las cards porque el crédito en la cabecera visual se descartó por diseño (ver `design-system.md` · Cards). El nombre del fotógrafo no se muestra, porque las pautas lo piden «cuando sea posible»; se sigue guardando con cada foto por si se reintroduce.

Las fotos de las ideas, los logos de marca y los avatares se cargan por *hotlink* directo desde los CDNs de Pexels, Brandfetch y DiceBear: el navegador del usuario se conecta a esos dominios, que ven su **dirección IP**, user-agent y el dominio de origen (solo el origen, no la ruta, por la `Referrer-Policy` del sitio — `strict-origin-when-cross-origin`). Los tres dominios están en el `img-src` de la CSP.

En el lado servidor:

- A **Pexels** se le envía únicamente la búsqueda genérica en inglés que genera la IA por cada idea (p. ej. "wireless headphones") — **nunca** nombres, intereses en bruto ni ningún dato del perfil. Ojo: esa cadena es *output del modelo*, no una allowlist; la garantía de "genérica en inglés" se apoya en la instrucción del prompt, así que un payload dentro de `notes` podría en teoría influirla. Impacto bajo, pero la garantía es blanda.
- A **Brandfetch** se le envía solo el **nombre de la marca** que el usuario anotó en `favoriteBrands` (p. ej. "Nike"). Nunca datos del ser querido. Tras resolver el dominio, el servidor sondea `https://{dominio}/products.json` para decidir si enlazar a la búsqueda interna de la tienda (ver `security.md` §8: petición saliente a un tercero derivada de datos externos, sin reflejar la respuesta).
- A **DiceBear** no se le envía el nombre ni ningún campo de la ficha. La semilla es un literal fijo (`SEED = "pickpal"` en [`AvatarPicker.tsx`](../src/components/people/AvatarPicker.tsx)), no una semilla aleatoria como decía antes este documento. Lo que sí viaja en el query string son los **rasgos elegidos** para el dibujo: `skinColor`, `hair`, `hairColor`, `mood`, `backgroundColor`, `facialHairProbability`. Se eligen para parecerse a la persona real, así que el tono de piel es un dato que podría considerarse revelador de origen étnico (art. 9 RGPD) — por eso `/privacidad` ya no afirma que el avatar "no lleva asociado ningún dato de la persona".

### 4.3 Avatares dentro de los correos

Los correos de aviso incrustan el avatar como `background-image` ([`convex/emails.ts`](../convex/emails.ts)), así que el **gestor de correo del destinatario** (o el proxy de imágenes de Gmail) también hace la petición a DiceBear. Disclosado en `/privacidad`.

> Alternativa evaluada y descartada por ahora: proxear las imágenes a través del propio servidor (ocultaría la IP del usuario a cambio de tráfico, latencia y complejidad en el hosting). Pendiente de reevaluar: el disparador que se anotó era que la app dejase de estar restringida a un grupo pequeño, y eso ya ha ocurrido.

---

## 5. Transferencias internacionales

Los cinco encargados que reciben datos personales desde PickPal (Clerk, Convex, Google, Vercel y Resend) son empresas de EE. UU. Cada uno tiene al menos una garantía válida, comprobada en su DPA el 27-sep-2026; el detalle por proveedor está en la tabla de §4.

- **Adhesión al EU-US Data Privacy Framework** (decisión de adecuación de la Comisión de 10-jul-2023): Clerk, Google, Vercel y Resend.
- **Cláusulas contractuales tipo** de la Comisión (Decisión 2021/914) incorporadas a su DPA: Clerk (como respaldo), Convex y Resend.

`/privacidad` lo resume en «Transferencias fuera de la Unión Europea» (art. 13.1.f) y ofrece una copia de las cláusulas a quien la pida. Pexels, Brandfetch y DiceBear no reciben datos personales desde el servidor: solo ven la IP del navegador al cargar imágenes (§4.2). DiceBear opera en la UE.

---

## 6. Conservación

| Dato | Plazo |
|---|---|
| Cuenta de usuario y datos asociados | Mientras la cuenta esté activa. Al eliminar la cuenta, el purgado es **inmediato y transaccional** (`api.account.deleteMyAccount` recorre las 14 tablas del esquema y después se borra el usuario en Clerk) — no hay periodo de gracia ni papelera. **Excepción:** una ficha que hubieras compartido con otro usuario no se borra si tiene invitados — la propiedad pasa al más antiguo, ver §2.5. **Segunda excepción:** las entradas de historial y las ideas guardadas que el usuario añadió a fichas ajenas se quedan en ellas, porque son parte de una ficha que sigue siendo de otros (`deleteMyAccount` solo borra las `savedIdeas` cuya persona ya no existe). No llevan nombre ni email, solo el `clerkUserId` de una cuenta que ya no existe en Clerk. `/privacidad`, `/terminos` y el texto de Ajustes lo dicen desde el 27-sep-2026; antes prometían borrar «todos tus datos». **«Mi lista» no tiene excepción** (§2.6): se borra entera, con sus accesos, sus marcas y las copias de elementos borrados, y no pasa a nadie. Lo único que sobrevive son las entradas que un lector apuntó en el historial de su propia ficha a partir de la lista. Las copias de seguridad de los proveedores se reciclan según sus propios plazos. |
| Logs de seguridad (errores, rate limit) | Los contadores de rate limit viven en `rateLimitBuckets` / `recommendationUsage` con clave por día UTC y se borran con la cuenta. Los logs de ejecución los retiene el proveedor (Convex / Vercel) según su plan. |
| Datos enviados a Gemini | No los conservamos tras la respuesta. Google los registra 55 días, solo para detectar abusos, y no entrena con ellos (§4.1). |

El plazo está publicado en `/privacidad` ("Cuánto lo conservamos") — art. 13.2.a RGPD. El flujo de borrado ya está implementado (ver `security.md` §7).

---

## 7. Datos sobre terceros (importante)

PickPal permite al usuario guardar información sobre personas de su entorno que **no han prestado consentimiento directamente** (su pareja, familia, amigos).

- **Quién responde de qué.** Para el usuario, apuntar los gustos y las fechas de su entorno suele ser una actividad personal o doméstica, y eso queda fuera del RGPD (art. 2.2.c). PickPal, que pone los medios, sí está sujeto (considerando 18). Como no hay un responsable por encima para el que pueda actuar de encargado, **PickPal se trata a sí mismo como responsable** de estos datos, con base en el interés legítimo (art. 6.1.f, ver §3). Esta sección decía antes que PickPal era «encargado» del usuario, y por eso mismo no se sostenía.
- Por los términos de uso, al usuario le toca tener una relación personal legítima con esa persona y no introducir datos sensibles innecesarios.
- Cualquier tercero puede solicitar el borrado o información sobre los datos que se guardan sobre él escribiendo a [pickpal@jorgemolinafuster.com](mailto:pickpal@jorgemolinafuster.com). Daremos curso a la petición localizando los registros que le mencionen y eliminándolos en un plazo máximo de un mes (art. 12.3). Desde el 27-sep-2026, `/privacidad` se lo dice directamente al tercero («Si alguien te ha añadido a PickPal…»). Antes solo le hablaba al usuario.
- **Información a los terceros (art. 14).** Estas personas no dan sus datos a PickPal, y PickPal no tiene forma de contactarlas: no guarda su email ni su teléfono. Eso encaja en la excepción de esfuerzo desproporcionado del art. 14.5.b, cuya medida de acompañamiento es hacer pública la información. `/privacidad` es pública (`isPublicRoute` en [`src/proxy.ts`](../src/proxy.ts)) y tiene un párrafo dirigido a ellas.
- **Datos sensibles** (salud, ideología, orientación sexual, etc., art. 9 RGPD): el usuario **no debe** introducirlos en notas. Si se detecta su uso sistemático, podemos suspender la cuenta.

---

## 8. Derechos del usuario

Como interesado, tienes derecho a:

- **Acceso** a tus datos
- **Rectificación**
- **Supresión** ("derecho al olvido")
- **Oposición** al tratamiento
- **Limitación** del tratamiento
- **Portabilidad** (recibir tus datos en formato estructurado)

Puedes ejercerlos:

1. **Desde la app**: edición, borrado y **portabilidad** están disponibles en la propia interfaz. Ajustes → «Descargar mis datos» devuelve un JSON con las catorce tablas que guardan algo del usuario, incluida `personShares` (con quién compartes y quién te comparte a ti) y las cuatro de «Mi lista» (también cuándo se avisó por correo), salvo las marcas que otros han hecho en la tuya (§2.6) — el mismo recorrido que hace el borrado de cuenta, para que no puedan desincronizarse (`convex/exportData.ts`, con un test que lo comprueba).
2. **Por email** a [pickpal@jorgemolinafuster.com](mailto:pickpal@jorgemolinafuster.com), indicando qué derecho quieres ejercer.

Si consideras que tus derechos no se han atendido correctamente, puedes presentar una reclamación ante la **Agencia Española de Protección de Datos** (https://www.aepd.es).

---

## 9. Seguridad

Las medidas técnicas y organizativas se documentan en [`security.md`](security.md). En resumen: cifrado en tránsito (HTTPS), autenticación obligatoria, control de propiedad por usuario, validación server-side, rate limiting y headers de seguridad HTTP.

---

## 10. Menores

PickPal es solo para mayores de 18 años. Si detectamos la cuenta de un menor, se elimina.

Hasta el 27-sep-2026 el mínimo era 14 (RGPD art. 8 + LOPDGDD art. 7). Se subió porque los términos de la Gemini API prohíben usarla en apps dirigidas a menores de 18 o que probablemente usen (§4.1), y eso no lo arregla el consentimiento de los tutores.

---

## 11. Cambios en esta política

Publicaremos cualquier cambio sustancial en esta misma página y notificaremos por email a los usuarios registrados con al menos 15 días de antelación.

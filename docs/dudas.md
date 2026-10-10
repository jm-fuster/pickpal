# Dudas y decisiones pendientes

Preguntas abiertas del proyecto, y el registro de las que se cerraron.

> Repasado contra el código el 20-sep-2026. Cinco de las siete que figuraban como
> abiertas ya las había respondido la implementación — entre ellas «cero tests»,
> cuando hay 176 — y se han movido abajo con lo que se hizo de verdad.

---

## Abiertas

_Ninguna ahora mismo._

---

## Decididas, no pendientes

- **Internacionalización: no, por ahora.** La app es solo en español, sin capa de
  i18n, y está pensada para España (euros, tiendas españolas, prompts en
  español). No es un descuido: añadir i18n obligaría a traducir también los
  prompts y el catálogo de intereses, y a decidir mercado por mercado qué tiendas
  tienen sentido. Si algún día se abre, el sitio por donde empezar es
  `src/lib/stores.ts` y `src/lib/interests.ts`.

---

## Resueltas

- [x] **«Mi lista»: la lista compartida.** Construida el 10-oct-2026 sobre las
  31 decisiones de `docs/encargo-lista.md`, que es la especificación. Lo que se
  construyó de verdad:

  - Tres tablas en `convex/schema.ts`: `listItems` (por dueño), `listShares`
    (dueño, lector, nombre y email del dueño, ficha asociada) y `listClaims`
    (marcas, con copia del elemento si el dueño lo borra). Todo el backend en
    [`convex/lists.ts`](../convex/lists.ts), con 27 tests en
    `convex/lists.test.ts` que empiezan por que el dueño nunca vea las marcas.
  - Ruta `src/app/api/lista/share/route.ts` (GET: emails de quién la ve; POST:
    invitar por email), copiada del flujo de compartir fichas.
  - Página `/mi-lista` (entrada nueva en la navegación, icono `BookHeart`),
    tarjeta de lista recibida en `/agenda` y `/seres-queridos`
    (`IncomingListsCard`) y sección «La lista de {nombre}» en la ficha
    (`PersonListSection`), justo antes de «Ideas guardadas».
  - El diálogo de pasar al historial salió de la ficha a
    `src/components/people/AddToHistoryDialog.tsx`, que usan las ideas guardadas
    («Lo regalé», ocasión fija) y la lista («Ya se lo he regalado», ocasión
    propuesta con `closestOccasionLabel`).
  - Logo por dominio con `storeIdForUrl` y `STORE_DOMAINS` en
    `src/lib/stores.ts`; utilidades de enlace en `src/lib/links.ts`.
  - Línea de la lista en el email de recordatorio (`listLineHtml` en
    `convex/emails.ts`, con la cuenta en `lists.countUnclaimedForReader`).
  - Borrado de cuenta (`lists.deleteListDataForUser`) y exportación
    (`miLista`, `listasQueTeComparten`, `marcasEnListasDeOtros`), con el test
    de tablas de `exportData.test.ts` ampliado a `lists.ts`.
  - `/privacidad` (sección «Tu lista», Resend, conservación), `/terminos` (baja
    del servicio), `docs/privacy.md` §2.6 y `docs/security.md` §11.

  **Decisiones de implementación que el encargo no fijaba**, para no
  rediscutirlas a ciegas:

  - **El nombre que ve el lector sale del JWT del dueño** (`givenName`, o la
    primera palabra de `name`) y se copia en `listShares` al compartir, con su
    email. No se acepta del cliente. Como el nombre lo elige cada uno en Clerk,
    la tarjeta enseña también el email, que está verificado. Sin nombre en el
    JWT, la tarjeta usa el email. **Comprobado el 10-oct-2026:** la plantilla
    `convex` y el token de sesión (integración de Convex) llevan `given_name` y
    `name` en las dos instancias. Si alguno lo perdiera, las tarjetas saldrían con
    el email.
  - **Cupos:** `create_list_item` y `claim_list_item` a 100/día, `invite_list`
    a 20/día (también para compartir de vuelta) e `invite_lookup` compartido con
    las fichas. Topes de 100 elementos y 20 lectores comprobados antes que el
    cupo, como en `personShares.invite`.
  - **Una marca por elemento; la primera gana.** La segunda recibe «Ya lo regala
    otra persona».
  - **Guardar sin cambiar nada no es una edición:** no actualiza `editedAt` y no
    dispara el aviso de la decisión 15.
  - **«Ya se lo he regalado» sobre un elemento que el dueño ya borró** crea la
    entrada de historial y borra la marca, porque no queda nada que bloquear.
  - **La pregunta de compartir de vuelta solo vive en esa visita.** Una lista
    asociada deja de estar pendiente; si se pulsa «Ahora no» o se cambia de
    página, no se vuelve a preguntar.
  - **«Crear ficha de {nombre}» pide la relación sin valor por defecto.**
    Proponer «Pareja» habría acertado casi siempre, pero una madre guardada
    como pareja es peor que un clic más.
  - **Confirmación al quitar un acceso y al dejar una lista**, porque no se
    pueden deshacer sin una invitación nueva. «No me interesa» no la pide: la
    lista ni siquiera se ha llegado a ver.
  - **La sección de la ficha se llama como la ficha** («La lista de Laura» con el
    nombre que tú le pusiste). Si dos listas se guardan en la misma ficha, cada
    una lleva el nombre de su dueño.
  - **Enlaces cortos de Amazon** (`amzn.eu`, `amzn.to`) cuentan como Amazon:
    es lo que genera su botón «Compartir».
  - **Correo de aviso al lector (añadido el mismo día, tras revisar la
    decisión 9).** El encargo decía «sin email», y el argumento estaba mal
    apoyado: Q14 descartaba escribir a gente sin cuenta, no a usuarios. Sin
    correo, quien abre la app dos veces al año no se enteraría nunca. Va a
    todas las cuentas, sin interruptor, con el nombre y el email del dueño y
    nada de la lista; como mucho uno cada 30 días por pareja de dueño y lector
    (tabla `listInviteEmails`), y la pantalla solo dice «Le avisamos por
    correo» si de verdad se programó (`invite` y `shareBack` devuelven
    `{ shareId, emailed }`).
  - **Sin verificar en el navegador con sesión:** las pantallas que exigen
    cuenta (`/mi-lista`, la tarjeta y la sección de la ficha) se probaron con
    tests, typecheck y lint, no con un inicio de sesión real.

- [x] **Compartir personas entre usuarios.** Construido el 20-sep-2026 sobre
  las diez decisiones ya cerradas (ver `docs/encargo-compartir.md`, que era el
  encargo autosuficiente). Lo que se construyó de verdad:

  - Tabla de enlace `personShares(personId, clerkUserId, role)`
    ([`convex/personShares.ts`](../convex/personShares.ts)), con índices
    `by_person`, `by_person_and_user` y `by_user`. `role` es literal
    (`"invitee"`) por ahora — un único nivel de permiso — pero queda como
    columna propia por si algún día hace falta diferenciarlos.
  - Las 15 comprobaciones de propiedad (`x.clerkUserId !== clerkUserId`) se
    reescribieron para aceptar dueño **o** invitado, vía
    `assertPersonAccess`/`personHasAccess`. Dos quedaron deliberadamente sin
    ampliar: `people.remove` (borrar para todos) y `personShares.invite`
    (repartir la capacidad de compartir) — decisión 1: eso sigue siendo solo
    de quien creó la ficha.
  - `people.getAll` e `importantDates.getUpcoming` se ampliaron para incluir
    las fichas que otros han compartido contigo. No estaba en la lista
    original de "15 comprobaciones", pero sin esto un invitado no tenía forma
    de encontrar la ficha ni de ver sus fechas en la agenda salvo que le
    pasaran el id a mano — necesario para que el caso de uso (tres hermanos)
    funcione de verdad.
  - `account.deleteMyAccount` transfiere la propiedad al invitado más antiguo
    en vez de cascada-borrar cuando la persona tiene invitados (decisión 6), y
    desliga en bloque al usuario de toda ficha ajena que le hubieran
    compartido.
  - `AiNotesNotice` avisa de que, si se comparte la ficha, las notas también
    las ve quien tenga acceso (decisión 8).
  - Pantalla de compartir (`ShareDialog`, en la ficha de la persona) que
    enumera qué se comparte —con mención explícita a alergias, dato de salud—
    **antes** del formulario de invitar (decisión 9), y permite desligarse.
  - `/privacidad` y `docs/privacy.md` actualizados en el mismo cambio.
  - Tests nuevos en `convex/sharing.test.ts` y `convex/account.test.ts`: un
    invitado ve la ficha y la edita, un tercero no; el invitado no puede
    borrarla; desligarse funciona; la propiedad se transfiere al cerrar la
    cuenta del creador (con y sin invitados); las tandas generadas siguen
    siendo privadas; el historial y las ideas guardadas se comparten con
    autoría.

  **Decisiones de implementación que el encargo no fijaba**, para que quien
  siga no las rediscuta a ciegas:

  - **Invitar es por email, resuelto contra Clerk**, no por link de invitación
    ni por buscador de usuarios. `src/app/api/people/[personId]/share/route.ts`
    resuelve el email a un `clerkUserId` con `clerkClient().users.getUserList`
    y entonces llama a la mutation — Convex no tiene acceso al backend de
    Clerk. Si el email no corresponde a una cuenta de PickPal, se pide que esa
    persona se registre primero: no hay invitación "en frío" a alguien sin
    cuenta.
  - **El acceso se concede al instante**, sin paso de aceptación por parte del
    invitado. Aceptable para el caso de uso (ya has hablado con tu hermana
    antes de escribir su email); si se abriera a compartir con desconocidos,
    revisar.
  - **El dueño no puede revocar a un invitado**, solo el invitado puede
    desligarse. Añadir un `personShares.revoke` es barato con la tabla actual,
    pero no lo pedía el encargo y no había caso de uso claro que lo motivara.
  - **Tope de 20 invitados por ficha** y rate limit `invite_person` (20/día)
    — ninguno de los dos estaba en el encargo; se añadieron siguiendo el
    patrón ya establecido en `docs/security.md` §4 para cualquier mutation que
    crea filas.
  - **Editar la ficha compartida (nombre, notas, tallas…) es de cualquiera con
    acceso, no solo del dueño** — igual que el historial y las ideas
    guardadas: es lo que hace útil mantener una sola ficha entre varios en vez
    de que cada uno lleve la suya.

- [x] **Exportación de datos.** Hecha el 20-sep-2026. Era una obligación legal
  (RGPD art. 20) que `/privacidad` cumplía prometiendo enviarla a mano, con un
  mes de plazo y todo el trabajo recayendo en una persona. Ahora Ajustes →
  «Descargar mis datos» da un JSON al momento. `convex/exportData.ts` recorre
  las mismas tablas que `account.deleteMyAccount` (diez desde que existe
  `personShares`), con los datos anidados bajo cada ser querido, y un test
  compara los dos recorridos: añadir una tabla al borrado sin añadirla a la
  exportación hace fallar la suite.

- [x] **La ventana de la campana ya se puede cambiar.** `notifyDaysBefore` llevaba
  desde el principio en `userSettings`, validado de 1 a 365 en el servidor, y
  hasta el 20-sep-2026 **ninguna pantalla lo exponía**: solo se podía tocar por
  API. Se resolvió exponiéndolo, no quitándolo: el backend estaba entero y
  borrar el campo habría pedido una migración de schema para eliminar una
  capacidad que funcionaba. `/settings` ofrece cinco presets (7, 15, 30, 60 y 90
  días) en lugar de un campo numérico libre, así que no hay estado inválido
  posible aunque el servidor acepte todo el rango. (Distinto de la antelación del
  **email**, que es un selector múltiple de 0, 2, 7 y 14 días.)

- [x] **¿Se guardan las recomendaciones o se regeneran cada vez?** Se guardan. La
  tabla `recommendations` las cachea por `(usuario, persona, ocasión, tipo de
  regalo)` — índice `by_user_person_occasion_type` —, así que volver a abrir una
  tanda ya generada no gasta cuota. Regenerar es una acción explícita, y la propia
  UI avisa de que consume cuota.

- [x] **¿Avisos por email además del badge?** Sí, implementados y **apagados de
  fábrica**, porque la base legal declarada es el consentimiento. Cron diario a
  las 08:00 UTC, envío por la API REST de Resend, un único correo agrupado por
  usuario y deduplicación por `(fecha, año, antelación)`. Detalle en
  [`email-notifications.md`](email-notifications.md).

- [x] **¿Presupuesto por persona o por fecha?** Por fecha. `budgetMin` y
  `budgetMax` viven en `importantDates`, no en `people`, que es lo que permite
  gastar distinto en un cumpleaños que en un detalle de Navidad. Se guarda en
  céntimos.

- [x] **¿Testing automatizado?** Sí: 176 tests con Vitest en 13 archivos, y desde
  el 20-sep-2026 cubren también `convex/` con `convex-test` — propiedad entre
  usuarios, los cuatro cubos de límite, el secreto compartido de la cuota, el
  borrado en cascada y la revalidación de lo que devuelve el modelo. Los de
  `convex/` piden `environment: "edge-runtime"` con una directiva por archivo;
  el resto sigue en `node`. CI los corre en cada push y PR junto a dos
  typechecks (`tsc --noEmit` y el de `convex/tsconfig.json`, que tiene el suyo).

- [x] **Nombre de la app:** PickPal. Repo: `jm-fuster/PickPal`. Proyectos en Clerk
  y Convex también `pickpal`. _Renombrado desde «Giftly» el 2026-05-04 por
  colisión con apps existentes._

- [x] **Modo oscuro.** `next-themes` con estrategia de clase, claro por defecto.

- [x] **Landing page pública.** Tres pasos numerados y CTA dual (registro /
  login). Si ya tienes sesión, redirige a `/agenda`.

- [x] **Rate limiting en `/api/recommendations`.** 10 generaciones por usuario y
  día UTC en `recommendationUsage`, con reserva atómica antes de llamar al modelo
  y devolución si algo falla. Hay además tres cubos genéricos en
  `rateLimitBuckets`: 50 personas, 100 fechas y 50 ideas guardadas al día.

- [x] **Manejo del 29 de febrero.** En años no bisiestos cae al 28 (`src/lib/dates.ts`).

- [x] **Hosting / despliegue.** Vercel con auto-deploy desde `main`, más Convex.
  Dominio `pickpal.jorgemolinafuster.com`, que es también el dominio de envío
  verificado en Resend. Alias previos: `pickpal-app.vercel.app`,
  `giftly-blond.vercel.app`. El correo **entrante** va por otro lado: Cloudflare
  Email Routing sobre el apex `jorgemolinafuster.com`, porque el subdominio es un
  CNAME a Vercel y un CNAME excluye los MX.

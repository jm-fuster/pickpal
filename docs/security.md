# Seguridad · PickPal

Documento vivo. Captura los principios y checklists que mantienen seguro el backend y las APIs. Cuando una decisión cambie o se introduzca un patrón nuevo, se actualiza este archivo en el mismo commit que toca el código.

El objetivo: que ningún usuario autenticado pueda ver datos de otros, agotar recursos, ni explotar errores informativos.

---

## Modelo de confianza

| Capa | ¿Confianza? | Implicación |
|---|---|---|
| Cliente (navegador, formularios, args en `useMutation`) | **No confiable** | Validación cliente = UX. **Nunca** es seguridad. |
| Endpoints API en `src/app/api/**` | **Frontera** | Validar token Clerk + body con zod antes de tocar nada. |
| Funciones Convex (`convex/**`) | **Frontera** | Validar identidad + ownership + tamaños en cada handler. |
| Datos en Convex / Clerk / Gemini | Confiables | Han pasado las fronteras anteriores. |

**Regla básica:** el `userId` siempre se lee de `ctx.auth.getUserIdentity()` o `auth()` de Clerk. **Nunca** se acepta como argumento del cliente.

---

## Patrones obligatorios

### 1. Toda Convex query/mutation pública empieza con `requireUser()`

```ts
import { requireUser } from "./auth";

export const algo = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const clerkUserId = await requireUser(ctx);
    // resto
  },
});
```

Si una función necesita ser invocada solo internamente, márcala como `internalMutation` / `internalQuery` y no la expongas en `api.*`.

### 2. Toda operación sobre un recurso verifica ownership

Patrón actual (desde que `people` puede compartirse, 20-sep-2026): usar
`assertPersonAccess(ctx, personId, clerkUserId)` o su variante sin throw,
`personHasAccess(ctx, person, clerkUserId)` — ambas en
[`convex/personShares.ts`](../convex/personShares.ts). Aceptan **dueño**
(`people.clerkUserId`) **o invitado** (fila en la tabla de enlace
`personShares`). Es el reemplazo directo del viejo
`existing.clerkUserId === clerkUserId`: los 15 call sites que hacían esa
comparación a mano (`giftHistory.ts`, `people.ts`, `recommendations.ts`,
`savedIdeas.ts`, `importantDates.ts`) pasan ahora por aquí. Para un recurso
anidado bajo `giftHistory`/`savedIdeas` (no bajo `people` directamente), el
acceso se resuelve vía `entry.personId`, no comparando el `clerkUserId` de la
propia fila — esas filas guardan **autoría** (quién la creó), no propiedad.

**Excepción deliberada:** borrar una persona entera (`people.remove`) e
invitar a alguien más (`personShares.invite`) siguen siendo **solo del
dueño** — usan `assertIsOwner`, que sí es la comparación estricta de toda la
vida. Compartir amplía casi todos los permisos, pero no estos dos: ver
`docs/dudas.md` → "Compartir personas entre usuarios", decisión 1.

**«Mi lista» no usa este patrón, a propósito.** Una lista la lee quien tiene
una fila en `listShares` con el dueño de la lista, y eso es lo único que se
comprueba: aunque el lector la guarde en una ficha, tener acceso a esa ficha
(como dueño o como invitado) no da acceso a la lista. Si se comprobara por la
ficha, compartir una ficha enseñaría la lista a gente que su dueño no eligió.
Ver §11.

**Enlazar dos filas que cuelgan de `people`: misma persona, no solo acceso.**
Cuando una mutation apunta una fila a otra, las dos tienen que ser de la misma
persona; tener acceso a las dos fichas no basta. El caso es una idea guardada y
su evento (`savedIdeas.importantDateId`, desde el 10-oct-2026): `savedIdeas.save`
y `savedIdeas.move` comprueban `date.personId === idea.personId` además de
`assertPersonAccess`, con el mismo error si el evento no existe que si es de
otra ficha. Sin esa comparación, quien tenga la ficha de su madre y la de su
padre podría colgar una idea de ella en un evento de él. Ver
[`docs/encargo-ocasiones.md`](encargo-ocasiones.md).

Si añades una tabla nueva con dueño, replica el patrón que corresponda. Si no
es posible identificar el dueño, **no se puede exponer la operación**.

### 3. Validar tamaños y rangos en el servidor

Los validators viven en [`convex/validators.ts`](../convex/validators.ts) y espejan los límites de [`src/lib/schemas.ts`](../src/lib/schemas.ts) y [`src/lib/gifts.ts`](../src/lib/gifts.ts). Si añades un campo a una tabla:

1. Define su límite en el zod schema cliente (UX).
2. Replica el límite en `validators.ts`.
3. Llama al validator desde `create` y `update`.

En `update`, **valida el parche, no el documento fusionado**. Las comprobaciones son campo a campo e independientes, así que revalidar lo ya guardado no protege de nada y sí tiene un coste: una regla nueva más estricta deja ineditables las fichas antiguas que no la cumplen, aunque la edición ni toque ese campo. Estuvo a punto de pasar al añadir `AVATAR_FORBIDDEN` (ver §8). Si algún día una regla necesita mirar dos campos a la vez, esa sí tendrá que leer el documento guardado — y entonces conviene pensar qué pasa con las filas anteriores.

Por qué importa: sin esto un usuario autenticado puede insertar `notes` de 100 MB, presupuestos negativos, o 10.000 intereses. Aparte de coste de almacenamiento, los campos de texto se concatenan al prompt de Gemini → amplifica prompt injection.

**Validators actuales:**

- `validatePersonInput` — campos de `people` (nombre, intereses, marcas favoritas — máx. 10 × 40 chars —, notas, tallas, alergias, dislikes, avatar).
- `validateBudget` — `budgetMin`/`budgetMax` en `importantDates` (cap 100.000€, min ≤ max).
- `validateDateInput` — campos de `importantDates` (label, año, recurring + budget).
- `validateRecommendationIdeas` — el array `ideas` que `api.recommendations.upsert` persiste tras una llamada a Gemini. Aplica:
  - Entre 1 y 9 ideas (la generación produce 9, pero la API route descarta títulos duplicados de Gemini antes de persistir; 0 o más de 9 se rechazan).
  - Caps por idea: title ≤ 80, description ≤ 280, category ≤ 40, amazonQuery ≤ 120 chars; precios finitos en [0, 100.000€].
  - `suggestedStores` (opcional): allowlist contra `ALLOWED_STORES`, sin duplicados, máximo 4 elementos.
  - `matchedBrandStores` (opcional, resuelto vía Brandfetch): por entrada, `brand` ≤ 40 chars no vacío, `domain` validado como hostname (regex + ≤ 253 chars), `logoUrl` (opcional) por prefijo del CDN de Brandfetch. Cierra el gap de que un cliente directo inyecte un dominio/URL arbitrarios en el botón de marca. El mismo helper (`validateMatchedBrandStores`) valida el snapshot `matchedBrandStores` que persiste `api.savedIdeas.save` (vía `validateSavedIdeaInput`).

  Cierra el gap de que un atacante autenticado llamara directamente a `api.recommendations.upsert` saltándose la API route con un payload masivo.
- `validateListItemInput` — elementos de «Mi lista»: título ≤ 120 (el mismo tope que `giftName`, porque «Ya se lo he regalado» lo copia al historial), nota ≤ 500 y enlace ≤ 2048 que tiene que ser `http:` o `https:` (`isAllowedListItemUrl`). Ver §11.
- `validateListItemPrice` — precio aproximado de un elemento de «Mi lista», en céntimos de euro: entero entre 1 y 1.000.000 (10.000 €). Rechaza `NaN`, `Infinity`, decimales de céntimo y 0 («sin precio» se guarda sin el campo). Lo aplican `lists.addItem` y `lists.updateItem`. Ver §11.
- «Una nota para quien te regala» (`lists.setAbout`): ≤ 300 caracteres después de quitar los espacios de los bordes. Ver §11.
- `isAllowedListPhoto` — la foto de un elemento de «Mi lista», mirando solo los metadatos de `_storage` (una mutation no puede leer el archivo): `contentType` exactamente `image/jpeg`, `image/png` o `image/webp` (sin tipo no pasa) y tamaño real entre 1 byte y 1.500.000. La aplica `lists.setItemPhoto`. Ver §11.
- `validateBirthday` — el cumpleaños del dueño de una lista: mes entero 1–12 y un día que exista en ese mes, medido contra 2024 para que el 29 de febrero valga. La aplica `lists.setBirthday`. Ver §11.

**Salida de Gemini = input no confiable.** El JSON que devuelve la IA pasa por `generateObject` con un schema Zod (`giftRecommendationSchema`), pero antes de tocar la BD vuelve a validarse en `validateRecommendationIdeas`. Defensa en profundidad: el schema Zod podría aflojar sus restricciones por error, o un cliente malicioso podría llamar a `upsert` directamente con datos que nunca pasaron por Gemini.

### 4. Rate limit en mutations que crean recursos

Helper genérico en [`convex/rateLimit.ts`](../convex/rateLimit.ts):

```ts
await checkAndIncrement(ctx, clerkUserId, "create_foo", 50);
```

Aplícalo a cualquier mutation que:
- Cree filas (DoS de almacenamiento).
- Llame a APIs externas de pago (cuota).
- Envíe notificaciones / emails.

Buckets actuales: `create_person` (50/día), `create_date` (100/día), `save_idea` (50/día), `invite_person` (20/día — compartir una ficha, ver §9), `invite_lookup` (30/día — comprobar un email antes de invitar, ver §9; lo comparten las fichas y «Mi lista»), `create_list_item` (100/día), `import_list` (5/día — «Pegar una lista»: una unidad por importación, no por fila, porque fila a fila una lista de 100 gastaría el cupo entero de `create_list_item`; `lists.importItems` valida todas las filas antes de insertar ninguna, con el número de fila en el error, y comprueba el tope de 100 elementos antes que el cupo, así que ni una fila inválida ni una lista que no cabe gastan la unidad; ver §11), `claim_list_item` (100/día — marcar «Lo regalo yo»), `invite_list` (20/día — compartir tu lista, por email o de vuelta; ver §11; también se gasta cuando quien recibe te tiene bloqueado, ver §11), `list_photo_upload` (30/día — direcciones de subida de fotos de «Mi lista»; se gasta en `lists.generatePhotoUploadUrl`, antes de que el navegador suba nada, porque lo que ocupa almacenamiento es la subida y no el apunte), `create_managed_list` (10/día — empezar una lista a cargo, ver §11; `lists.createManagedList` comprueba antes el tope de 5 listas por adulto, así que llegar a él no gasta la unidad, y como borrar una lista no devuelve nada, crear y borrar en bucle se para en 10), `recommendationUsage` (10/día, tabla aparte por motivos históricos).

Los cubos de «Mi lista» son **por persona, no por lista**: quien lleva listas a cargo comparte `create_list_item`, `import_list`, `invite_list`, `claim_list_item` y `list_photo_upload` entre la suya y las de sus hijos. Decidido así (docs/encargo-listas-ninos.md §5): con los topes de hoy no molesta, y un cubo por lista multiplicaría por seis lo que una cuenta puede crear al día.

**Sin cubo, a propósito:** `lists.setAbout` («Una nota para quien te regala») no gasta cupo. Reescribe o borra siempre la misma fila de `listAbout` (como mucho una por usuario, con tope de 300 caracteres), así que repetirla no llena nada ni manda nada a nadie: no es superficie de DoS de almacenamiento. Si algún día avisara a los lectores al cambiarla, necesitaría cubo. Por lo mismo tampoco gastan cupo `lists.setBirthday` (la misma fila), `lists.moveItem` (reescribe `position` en dos filas que ya existen), `lists.setItemPhoto` y `lists.removeItemPhoto` (apuntan o quitan un archivo ya pagado con `list_photo_upload`), `lists.setClaimOccasion` (un campo de una marca propia), `lists.leaveAndBlock` y `lists.unblock` (como mucho una fila de `listBlocks` por pareja, y solo con un permiso recibido de por medio), y `lists.renameManagedList`, `lists.linkManagedListPerson` y `lists.deleteManagedList` (reescriben o borran filas que ya existen; no crean nada).

**Cuota de recomendaciones = reserva atómica.** `api.recommendationUsage.reserve` (mutation) incrementa el contador **antes** de llamar a Gemini y lanza `ConvexError` si está agotado; al ser una transacción Convex, dos peticiones concurrentes en el límite no pueden superar las 10/día. Si la generación falla (saturación, timeout o validación del schema de Gemini), la API route llama a `refund` para devolver la unidad: como el `return` de éxito va tras el `upsert`, llegar al `catch` garantiza que no se persistió ninguna idea, así que un fallo de formato del proveedor no cuesta una generación. `refund` recibe el `day` UTC que devolvió `reserve` para devolver la unidad al bucket correcto aunque el fallo cruce la medianoche UTC. No existe un `consume` posterior al guardado: el patrón check-luego-consume tenía una carrera de coste y un caso "ideas guardadas pero el usuario ve error".

**`reserve`/`refund` son server-only vía secreto compartido.** Modifican la cuota, así que solo deben invocarse desde la API route (`/api/recommendations`), nunca desde el navegador: sin protección, un usuario autenticado podría llamar a `api.recommendationUsage.refund` directamente y decrementar su propio contador, anulando el límite de 10/día (el único tope que impide que una sola cuenta agote la cuota diaria del proyecto en Google AI Studio). Siguen siendo mutations **públicas** porque la route las invoca con `fetchMutation`, que no alcanza funciones `internal*`; pero exigen `process.env.CONVEX_SERVER_SECRET` como argumento y lo verifican con `assertServerCaller` (fail-closed si no está configurado). El secreto debe valer lo mismo en el entorno de Convex y en el de Next (ver §8). **Patrón general:** una mutation que deba invocarse solo desde el servidor Next —no desde el navegador ni desde otra función Convex— se protege con este secreto compartido; `internalMutation` no sirve aquí porque `fetchMutation` solo alcanza el `api.*` público. `check` (query read-only de cuota restante) no necesita el secreto: leer el propio contador no es superficie de abuso.

No hace falta en `update`/`remove` (no son superficie de abuso de almacenamiento).

**Notificaciones por correo**: el cron `internal.emails.runDailyEmailNotifications` corre 1 vez/día y la dedup por `(importantDateId, occurrenceYear)` impide repetir envíos para una misma ocurrencia, así que no necesita rate limit. Si más adelante se añade un endpoint manual tipo "enviar email de prueba", aplicar `checkAndIncrement` con bucket `email_test` (p.ej. 5/día). El email destino se lee de `ctx.auth.getUserIdentity().email` (claim del JWT de Clerk) — **nunca** se acepta como argumento del cliente. Las funciones de envío (`internal.emails.*`, `internal.notifications.*`) son `internal*` y no se exponen en `api.*`.

### 5. Endpoints API: validar token, validar body, sanitizar errores

Plantilla mental para `src/app/api/**/route.ts`:

```ts
const { getToken } = await auth();
const token = await getToken({ template: "convex" });
if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

const parsed = requestSchema.safeParse(await req.json());
if (!parsed.success) return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

try {
  // trabajo
} catch (err) {
  console.error("[ruta]", err);
  return NextResponse.json({ error: "Error genérico." }, { status: 500 });
}
```

**Nunca** propagar `err.message` al cliente: filtra estructura interna (Convex, Gemini, env vars) que ayuda a un atacante a mapear el sistema. Tampoco se devuelven los `issues` de zod en los 400 (exponen la forma interna del schema): basta `{ error: "Parámetros inválidos" }`. Los IDs malformados o de otro usuario devuelven el mismo `404` que los inexistentes — el cliente no puede distinguir "no existe" de "no es tuyo".

**Un endpoint que contesta distinto según exista o no un dato ajeno es un oráculo.** Por ejemplo, uno que dice si un email tiene cuenta. Hay que autorizar y limitar cada **pregunta**, no solo la escritura que viene detrás: si el rate limit solo cuenta los aciertos, los fallos salen gratis. Caso real y arreglo en §9.

**Errores en `convex/**` → `ConvexError` + `userErrorMessage`.** Todo error pensado para que lo lea el usuario (validación, rate limit, ownership) se lanza como `throw new ConvexError("<mensaje en español>")` (import de `convex/values`). Motivo: en prod Convex redacta los `Error` planos a `[CONVEX M(modulo:funcion)] Server Error` — el mensaje nunca llega y el toast filtra identificadores internos. Solo los `ConvexError` conservan su `data` en el cliente. Los errores puramente internos (p. ej. `convex/emails.ts`) siguen siendo `Error`.

En el cliente, los catch con toast usan el helper [`src/lib/errors.ts`](../src/lib/errors.ts):

```ts
import { userErrorMessage } from "@/lib/errors";
toast.error(userErrorMessage(err, "No se pudo guardar"));
```

Nunca se renderiza `err.message` crudo en la UI.

### 6. Proxy default-deny

[`src/proxy.ts`](../src/proxy.ts) protege **todo** salvo lo que esté en `isPublicRoute`. Si añades una página o endpoint:

**CSRF en profundidad:** además del `SameSite=Lax` de las cookies de Clerk, el proxy rechaza con `403` cualquier petición **no-GET** a `/api/*` cuya cabecera `Sec-Fetch-Site` exista y no sea `same-origin`. Los navegadores la añaden automáticamente y un sitio cruzado no puede falsificarla; las peticiones sin la cabecera (clientes antiguos) no se bloquean. Si algún día un endpoint debe aceptar POSTs cross-site legítimos (webhooks), exceptúalo explícitamente y verifica la firma del proveedor.

- Si requiere sesión (caso por defecto): no toques nada, ya está protegido.
- Si debe ser público: añádelo explícitamente a `isPublicRoute`. **Justifica por qué en el commit.**

**Páginas estáticas detrás del proxy.** Las páginas de `(app)` se pintan en el cliente con los datos de Convex, así que su HTML no lleva nada del usuario y se sirve desde la caché (las que no llevan parámetros en la URL). El proxy corre **antes** de esa caché y exige sesión igual. Si una página de `(app)` empieza a leer datos en el servidor, deja de poder cachearse así: tiene que pasar a dinámica.

Rutas públicas actuales:
- `/` — landing. Quien tiene sesión no llega a verla: el proxy le redirige a `/agenda` antes de servirla, para que la página pueda ser estática.
- `/sign-in(.*)`, `/sign-up(.*)` — flujo Clerk.
- `/privacidad` — aviso de privacidad. Debe ser legible antes de crear cuenta y por terceros que aparezcan como "ser querido" en la cuenta de un usuario.
- `/compartir` — destino del «Compartir» de Android (`share_target`). **Pública desde el 12-oct-2026, a propósito:** llega por POST con lo compartido en el cuerpo, y un POST que el proxy mandara a iniciar sesión lo perdería. No lee nada del usuario, no escribe ni abre nada: redirige con 303 a `/mi-lista/apuntar` con los datos recortados en el fragmento, y esa página sí exige sesión (el fragmento llega hasta `/sign-in`, que lo guarda en `sessionStorage`; ver §11). Su única entrada es el cuerpo del formulario, recortado a 4.000 caracteres por campo, y todo lo que sale pasa por `readBookmarkletFragment` antes de usarse.
- `/terminos` — términos y condiciones. Mismo motivo: la página dice "al registrarte aceptas estos términos", así que tienen que poder leerse antes de registrarse. Estuvo protegida por omisión (el default-deny la capturó) y los enlaces del footer y del sign-up llevaban a sign-in — **al añadir una página legal nueva, acordarse de esta lista**.

**Envío masivo por correo: solo `internal` (12-oct-2026).** `convex/policyNotice.ts` manda el aviso de cambios en la política (§11 de `privacy.md`) a todos los usuarios con email. Por eso no tiene botón ni ruta: son `internalAction`, `internalQuery` e `internalMutation`, que `api.*` no expone, y se lanzan con `npx convex run` desde una cuenta con acceso al deployment. Tres guardas en el código: no manda nada por defecto (`dryRun`), se niega a mandar si la fecha de entrada en vigor no está a 15 días o más (`assertEffectiveDate`) y es reanudable sin repetir a nadie (`userSettings.policyNoticesSent`). **Patrón general:** cualquier envío a todos los usuarios nace como `internal`, con una cuenta previa en seco y un tope por lanzamiento.

### 7. Borrado de cuenta (autoservicio)

Toda cuenta de PickPal se puede borrar desde [`/settings`](../src/app/(app)/settings/page.tsx) con un diálogo de confirmación ("escribe ELIMINAR").

Flujo:
1. UI llama `POST /api/account/delete` ([`src/app/api/account/delete/route.ts`](../src/app/api/account/delete/route.ts)).
2. La ruta valida el token Clerk y llama a `api.account.deleteMyAccount` ([`convex/account.ts`](../convex/account.ts)), que con `requireUser(ctx)` purga en cascada todo lo del usuario en Convex: `people` (con sus `importantDates`, `giftHistory`, `recommendations`, `savedIdeas`), `userSettings`, `emailNotifications`, `recommendationUsage`, `rateLimitBuckets`. Además barre `savedIdeas` huérfanas vía el índice `by_user` (filas cuya persona ya no existe).
3. Solo si el purge en Convex sale bien, se llama `clerkClient().users.deleteUser(userId)`.
4. UI hace `signOut` y redirige a `/`.

**Cascada de borrado de persona:** el helper `deletePersonCascade(ctx, personId)` ([`convex/people.ts`](../convex/people.ts)) borra `importantDates`, `giftHistory`, `recommendations`, `savedIdeas` y `personShares` de una persona y después la persona. Es el **único** camino válido para borrar una persona: lo usan `people.remove` y `account.deleteMyAccount` (cuando la persona no tiene invitados — ver §9). Si añades una tabla anidada bajo `people`, añádela al helper (no a los call sites).

**Reglas al añadir tablas nuevas:** si guardas datos vinculados a un usuario, añade su limpieza a `deleteMyAccount`. La regla aplica también si la tabla no tiene un campo `clerkUserId` directo: el borrado debe alcanzarla por relación (ej. `importantDates` se borra siguiendo `people` → `by_person`). Si una tabla nueva no se puede asociar a un usuario, no se puede exponer.

Y añádela también a `exportData.mine`, con su propia aserción en los tests. El test de paridad de `exportData.test.ts` no basta: solo comprueba que lo que se borra también se exporta (no al revés), y solo por el nombre de la tabla en un `.query("…")` del código, sin mirar qué campos salen. Una tabla de «Mi lista» tiene que borrarse dentro de `deleteListDataForUser`, escrita tal cual, porque el test solo lee `lists.ts` desde esa función hasta el final.

El `clerkUserId` siempre se lee de la sesión vía `requireUser` — la mutation no acepta argumentos. No existe forma de que un usuario borre los datos de otro.

**El borrado propio de Clerk está desactivado, y tiene que seguir así.** Clerk Dashboard → User & authentication → «Allow users to delete their account» está en **off**, aplicado también a los usuarios existentes (27-sep-2026). Si se activa, el perfil de Clerk (`UserButton` → Administrar cuenta) enseña su propio botón de borrar cuenta. Ese botón borra el usuario en Clerk pero no toca Convex, porque no hay webhook. Las fichas, fechas, alergias y ajustes se quedarían huérfanos, justo lo contrario de lo que promete `/privacidad`. El único camino de borrado es este flujo. «Allow users to change their email address» sí sigue activo: es rectificación, y los avisos leen el email del JWT de cada sesión.

**Excepción desde que existe compartir (§9):** `deleteMyAccount` ya no borra incondicionalmente cada `people` del usuario. Si la persona tiene invitados, la propiedad se transfiere al más antiguo (`personShares.transferToOldestInviteeOrNull`) en lugar de borrarla — bloquear el borrado violaría el derecho RGPD a irse, y cascada la castigaría a un tercero por una decisión ajena. Solo se cascada-borra si no queda nadie más con acceso. Además, `deleteMyAccount` llama a `personShares.deleteSharesForUser` para desligar al usuario de toda ficha ajena que le hubieran compartido — la versión en bloque de `personShares.leave`.

**«Mi lista» no tiene esa excepción (§11):** `lists.deleteListDataForUser` borra la lista entera del usuario (elementos con sus fotos en `_storage`, su «nota para quien te regala» y su cumpleaños en `listAbout`, accesos, también los ocultos, y las marcas que otros hicieron en ella) sin transferirla, y lo mismo con cada lista que lleva para otra persona, más su fila de `managedLists` (por el prefijo del dueño en los índices de lista, sin fijar la lista: es la única lectura de «todo lo del dueño» que queda), sus accesos y marcas en listas ajenas, y los bloqueos de `listBlocks` de los dos lados: los que puso como lector y los que otros le pusieron como dueño. Estos últimos se borran pero **no se exportan**: son el único caso en que «se borra, luego se exporta» no se cumple, porque exportarle a alguien quién le ha bloqueado es justo lo que el bloqueo promete no decir. El test de paridad no lo nota porque la tabla sí sale en la exportación del lado del lector. Las entradas de historial que un lector creó a partir de la lista son de su ficha y se quedan.

`managedLists` sale en la exportación de quien las lleva como `listasQueLlevas`: para quién es, la ficha de su libreta donde la ve (solo si todavía la ve), elementos, lectores, nota y cumpleaños, y ninguna marca de nadie. Su aserción propia está en `convex/lists.test.ts` («listas a cargo: exportación»). `miLista` sigue siendo solo la lista propia.

### 8. Variables de entorno

- `NEXT_PUBLIC_*` se inyecta en el bundle cliente. **Nunca** poner secrets ahí.
- Secrets server-only: `CLERK_SECRET_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `PEXELS_API_KEY`, `CONVEX_DEPLOYMENT`, `RESEND_API_KEY`, `CONVEX_SERVER_SECRET`. `RESEND_API_KEY` y `EMAIL_FROM` viven en el entorno de **Convex** (`npx convex env set ...`), no en Next.js, porque solo los consume el cron del backend.
- `CONVEX_SERVER_SECRET` autoriza las mutations de cuota (`reserve`/`refund`, ver §4) como llamadas server-side. Es el **único** secret que debe existir en **ambos** entornos con el **mismo valor**: en Next (lo pasa la API route) y en Convex (`npx convex env set CONVEX_SERVER_SECRET ...`, lo verifica la mutation). Genera el valor con `openssl rand -hex 32`. Sin él configurado, `/api/recommendations` devuelve 503 (fail-closed) — es un requisito de despliegue, no opcional. Se compara en **tiempo constante** (`timingSafeEqual` en `convex/recommendationUsage.ts`), no con `===`, para no filtrar por temporización cuántos caracteres acierta un intento. **Pendiente de decidir:** el secreto viaja como *argumento* de una mutation pública, así que queda registrado entre los argumentos que muestra el dashboard de Convex; pasar `reserve`/`refund` a `internalMutation` invocadas desde una action lo sacaría de ahí, a cambio de un salto más. No se ha hecho aquí porque cambia el contrato de despliegue y conviene decidirlo con el dashboard delante.
- `PEXELS_API_KEY` (fotos de stock en `/api/recommendations`) es **opcional**: sin ella la feature degrada a la cabecera de icono. Las URLs de imagen que devuelve Pexels se validan por prefijo (`https://images.pexels.com/`) en `convex/validators.ts` antes de persistir — mismo patrón de allowlist que el avatar de DiceBear. El volumen de llamadas a Pexels queda acotado por la cuota existente de generaciones (10/usuario/día × 9 fotos por tirada).
- `BRANDFETCH_CLIENT_ID` (tienda oficial de marca en `/api/recommendations`) es **opcional**, mismo modelo que Pexels: sin él la card cae al botón de búsqueda de marca en Google. Server-only, en el entorno de **Next** (lo consume la API route, no Convex). La respuesta de Brandfetch es input no confiable: el `domain` se valida como hostname y el `logoUrl` por prefijo del CDN (`https://cdn.brandfetch.io/`) en `convex/validators.ts` antes de persistir — mismo patrón de allowlist que Pexels/DiceBear. `cdn.brandfetch.io` está en el `img-src` de la CSP: los logos se cargan por hotlink desde el navegador, así que sin esa entrada se romperían al pasar la CSP a enforcing (faltaba, corregido). **Sin caché propia**: la resolución se hace en la tanda de generación y el volumen queda acotado por la cuota de 10 generaciones/día × las pocas marcas que matchea una tanda (muy por debajo del free tier de Brandfetch). Si el volumen creciera, una tabla de caché global —metadato público de marca, no dato de usuario; por eso no entraría en `deleteMyAccount`— sería el siguiente paso.
- **Sonda de tienda (Shopify)**: tras resolver el dominio, la route hace un `GET https://{dominio}/products.json` (best-effort, timeout 2.5s, `redirect: "manual"`) para decidir si enlazar a la búsqueda interna `/search?q=` o a la home. Es una petición saliente a un dominio derivado de datos externos (SSRF-adjacent), pero de bajo riesgo: el dominio procede de la base de marcas de Brandfetch (no de input libre del usuario, que solo escribe el *nombre*), está validado como hostname público (la regex de `normalizeBrandDomain` rechaza IPs y `localhost`, y una lista de sufijos reservados rechaza además `.internal`, `.local`, `.lan`, `.corp` y compañía — la regex sola los aceptaba, porque sí terminan en un sufijo alfabético), solo se hace `GET` a esa ruta fija, y la respuesta no se refleja al cliente — solo decide un booleano. La lista vive en `RESERVED_TLDS` (`src/lib/brands.ts`) y espejada en `BRAND_RESERVED_TLDS` (`convex/validators.ts`). Si en el futuro el dominio pudiera venir de input libre, revisar (allowlist de TLDs / bloqueo de rangos privados).
- Nuevo secret → añádelo a `.env.example` como placeholder vacío y documenta dónde se obtiene.

### 9. Compartir personas entre usuarios

`convex/personShares.ts` guarda quién más tiene acceso a una `people` — el
dueño sigue siendo `people.clerkUserId`; esta tabla solo añade invitados.
Índices: `by_person` (listar/borrar en cascada), `by_person_and_user`
(comprobar acceso de uno concreto) y `by_user` (fichas que te han
compartido, usado por `people.getAll` e `importantDates.getUpcoming`).

- **Resolución de email → `clerkUserId` fuera de Convex.** Convex no tiene
  acceso al backend de Clerk, así que `personShares.invite` recibe ya un
  `clerkUserId`, resuelto en
  [`src/app/api/people/[personId]/share/route.ts`](../src/app/api/people/[personId]/share/route.ts)
  con `clerkClient().users.getUserList({ emailAddress: [...] })`. La mutation
  vuelve a comprobar que quien llama es el dueño — la ruta es una comodidad
  de resolución, no la frontera de autorización real.
- **Antes de consultar Clerk, la ruta llama a
  `personShares.reserveInviteLookup`**, que exige ser el dueño de la ficha y
  gasta una unidad de `invite_lookup` (30/día). La ruta contesta «No hay
  ninguna cuenta de PickPal con ese email» cuando no la hay. Hasta el
  27-sep-2026 la consulta a Clerk iba antes que cualquier comprobación, y el
  límite de `invite_person` solo lo gastaban las invitaciones que salían bien.
  Así, cualquier usuario podía preguntar sin límite, con cualquier `personId`,
  si un email estaba registrado. Es el oráculo de §5.
- **Invitar es solo del dueño**, con `assertIsOwner` (no reparte la
  capacidad de compartir), rate-limited (`invite_person`, 20/día) y con un
  tope de 20 invitados por ficha — evita que una cuenta comprometida reparta
  acceso sin límite ni infle la ficha de gente.
- **Desligarse (`personShares.leave`) es de cualquier invitado sobre su
  propia fila.** No hay forma de que el dueño expulse a un invitado sin que
  el invitado se vaya solo — ver "Lo que NO está implementado todavía".
- **Ownership check ampliado, no nuevo:** ver §2 (`assertPersonAccess`).

### 10. La app no se indexa en buscadores

El caso de estudio que debe posicionar vive en otro sitio
(jorgemolinafuster.com/work/pickpal); esta app es accesible por enlace pero no
debe salir en Google. Dos capas, ambas necesarias:

- `robots: { index: false, follow: false }` en `metadata` de
  [`src/app/layout.tsx`](../src/app/layout.tsx). Next sobrescribe el objeto
  `robots` entero por segmento, así que ninguna página o layout hijo debe
  definir el suyo.
- Cabecera `X-Robots-Tag: noindex, nofollow` en todas las rutas
  ([`next.config.ts`](../next.config.ts)), que cubre también fuentes, imágenes
  y demás ficheros que no son HTML.
- **No poner `Disallow` en `robots.txt`** (hoy no existe): si Google no puede
  rastrear la página, no llega a ver el `noindex` y puede mantenerla indexada.

### 11. «Mi lista»

Diseño completo en [`docs/encargo-lista.md`](encargo-lista.md); código en
[`convex/lists.ts`](../convex/lists.ts). Hay tres públicos y cada función sirve
a uno solo:

- **Toda lectura por dueño lleva la lista.** Desde las listas a cargo
  (docs/encargo-listas-ninos.md, opción A) un dueño tiene su lista propia
  (`managedListId` vacío) y hasta 5 que lleva para otros (`managedLists`), y
  sus filas de `listItems`, `listShares`, `listClaims` y `listAbout` cuelgan
  todas de su `ownerClerkUserId`. Ya no hay índices solo por dueño: se lee por
  `by_owner_and_list` o `by_owner_list_reader` con
  `.eq("managedListId", listId)`, que con `undefined` es la propia. Los
  helpers (`ownerItems`, `findShare`, `visibleShare`, `aboutOf`,
  `listReaders`, `deleteClaimsBetween`) piden la lista como argumento
  obligatorio. Las funciones del dueño reciben `listId` opcional y lo
  comprueban con `assertManagedList` (la de otro o una que no existe:
  «Lista no encontrada.»); las que reciben un elemento trabajan en la lista
  del elemento, así que el tope de favoritas y los vecinos de «Subir» son de
  esa lista. Los topes (100 elementos, 20 lectores, 5 favoritas) son por
  lista. La única lectura de «todo lo del dueño» que queda es el borrado de
  la cuenta (§7), y un test de `lists.test.ts` falla si otra lectura por
  dueño se queda sin la lista. Si se olvida una, lo de Lucía sale en la lista
  de Marta y ningún otro test lo nota: los de aislamiento llenan las tres
  listas antes de mirar una.
- **El dueño nunca ve las marcas de su lista propia.** `myItems`, `myAbout`, `myBirthday` y `myReaders` leen solo
  `listItems` (y `_storage` para la foto), `listAbout` y `listShares`; ninguna query del dueño cruza con `listClaims`, ni
  para un contador, y la exportación del dueño tampoco las lleva (§2.6 de
  `privacy.md` explica la base). Es la propiedad que sostiene la función y la
  primera que prueba `convex/lists.test.ts`. Si una query nueva del dueño
  necesita mirar `listClaims`, está mal planteada, con una sola excepción
  (la siguiente).
- **Listas a cargo: quien la lleva ve «Cogido», nunca quién.** Es la única
  excepción a la regla anterior (decisión 2 del encargo de listas para
  niños), y tiene límites estrictos: solo `lists.managedItems`, solo para una
  lista a cargo que lleva quien llama, y solo el estado (`free`, `taken`, y
  `mine` o `given` en sus propias marcas). `claimId` sale solo en las suyas,
  y nada de lo que devuelve lleva la cuenta, el nombre o el id de la marca
  de otro (hay un test que lo mira campo a campo). `myItems` con `listId`
  sigue sin marcas, `myManagedLists` cuenta elementos y lectores, nunca
  marcas, y su exportación (`listasQueLlevas`) tampoco las lleva. Quien la
  lleva puede marcar (`claim` lo deja si el elemento es de una lista a cargo
  que lleva él; en su lista propia sigue sin poder), y su marca bloquea el
  elemento para los lectores como cualquier otra, sin decir de quién es. Si
  la lee una sola persona, quien la lleva sabe quién ha sido: lo dicen la
  pantalla del lector y `/privacidad`. Sus marcas salen en su «Lo que vas a
  regalar» y en su exportación (`marcasEnListasDeOtros`, con `lista`), como
  las de cualquier lector. Si quita un elemento que había marcado él, su
  marca se va sin copia.
- **La lista a cargo es de quien la lleva, y su ficha no da acceso.**
  `managedLists.personId` es la ficha de la libreta de quien la lleva donde
  la ve; `linkManagedListPerson` exige que la vea (`personHasAccess`) y se
  vuelve a validar al leer, como `validPersonId`. Compartir esa ficha con
  alguien no le da la lista: el lector entra siempre por `listShares`
  (decisión 12). Una sola persona lleva cada lista. Se borra entera con
  `deleteManagedList` (elementos, fotos, accesos, todas las marcas y copias,
  nota) o con la cuenta de quien la lleva (§7), sin transferirse. El nombre
  (`forName`) es texto libre de 1 a 40 caracteres, sin caracteres de control
  (`normalizeManagedListName`); no se guarda edad ni ocasión.
- **«Ya lo tengo» y «Lo que más ilusión te haría» van solo del dueño al
  lector.** `removeItem({ reason: "got" })` guarda el motivo en la copia de las
  marcas `marked` y no devuelve nada: el dueño recibe lo mismo haya marcas o
  no, con motivo o sin él, y hay un test que lo compara. `setFavorite` no pone
  `editedAt`, así que a nadie le salta «lo ha cambiado», y su tope de 5 solo
  cuenta `listItems`.
- **El lector entra por el permiso del dueño.** `forPerson` y `claim` buscan la
  fila de `listShares` (dueño, lista, lector), nunca el acceso a la ficha
  donde el lector guardó la lista (§2). Ve que un elemento está cogido, pero
  no quién lo cogió (`state: "taken"` sin `claimId`) ni quién más lee la
  lista. Un permiso es de una lista: leer la de Lucía no deja ver ni marcar
  la de Pablo ni la propia de Marta.
- **«Una nota para quien te regala» es del dueño y la leen sus lectores.** Vive
  en `listAbout`, como mucho una fila por dueño, y solo la escribe él
  (`setAbout`, que saca el dueño de la sesión) y la lee él (`myAbout`). Al
  lector le llega dentro de `forPerson` (`about`), por la misma fila de
  `listShares` que el resto de la lista: un invitado de la ficha asociada no la
  ve. Cambiarla no pone `editedAt`, así que a nadie le salta «lo ha cambiado».
  Se borra con la cuenta (en `deleteListDataForUser`) y sale en la exportación
  del dueño (`miLista.notaParaQuienTeRegala`), no en la de quien la lee. El
  cupo está en §4.
- **El precio tiene tres estados al editar.** `updateItem` recibe `priceCents`
  como ausente (se queda el guardado), `null` (se quita) o un número (se pone).
  Ausente no puede significar «quitar»: tras un despliegue, una pestaña con el
  código anterior manda los otros campos sin precio, y lo borraría. El precio
  solo entra en la comparación de «no ha cambiado nada» si llega; cambiarlo de
  verdad pone `editedAt`, como cualquier edición. Lo escribe el dueño a mano o
  lo trae el marcador «Apuntar en PickPal» en el navegador: el servidor nunca
  lo saca del enlace. Sale en la exportación del dueño en euros
  (`precioAproximadoEuros`).
- **«Lo que vas a regalar» (`myGifts`) es solo de quien lee.** Lee las marcas
  propias por `by_reader`, nunca las de otros, y solo las `marked`. Cada una
  vuelve a comprobar que sigue existiendo la fila de `listShares` (dueño,
  lector) aunque perder el acceso ya borre las marcas, y la ficha sale por
  `validPersonId`, igual que en `sharedWithMe`. No dice quién más lee cada
  lista. El dueño que la llama recibe sus propias marcas en listas ajenas y
  en las que lleva para otros (con `forName`), nunca marcas en su lista
  propia, porque no puede marcar la suya.
- **«Nuevo» (`addedAt`) solo llega a quien lee.** Es el `_creationTime` de cada
  elemento dentro de `forPerson`; `myItems` no lo cambia. Cuándo miró la lista
  por última vez se guarda solo en el navegador del lector: el servidor no
  apunta visitas, así que el dueño no puede saber cuándo la miran.
- **La asociación a una ficha se valida al leer.** Un lector pierde el acceso a
  una ficha por varios caminos (`people.remove`, `personShares.leave`, la
  transferencia al borrar una cuenta). En vez de engancharse a cada uno,
  `validPersonId` comprueba `personHasAccess` en cada lectura y, si falla, la
  lista vuelve a quedar pendiente.
- **Invitar es como en las fichas** (§9): `/api/lista/share` gasta
  `invite_lookup` antes de preguntar a Clerk y `lists.invite` aplica el tope de
  20 lectores y el cubo `invite_list`. `lists.shareBack` comparte tu lista con
  quien te compartió la suya sin email: la cuenta sale de la fila de
  `listShares` del lector, nunca de un argumento, y lo que comparte es
  siempre tu lista propia, aunque te llegara una lista a cargo. Para una
  lista a cargo, la ruta recibe `listId` (zod, como mucho 64 caracteres) y,
  antes de gastar cupo o preguntar a Clerk, comprueba con
  `lists.managedList` que la lleva quien llama; el GET recibe `?lista=`. Un
  id malformado, ajeno o borrado da el mismo 404 (§5). `lists.invite` lo
  vuelve a comprobar: la ruta no es la frontera.
- **El nombre que ve el lector lo pone el dueño.** `ownerName` y `ownerEmail` se
  copian del JWT del dueño al conceder el acceso, no del cliente. El nombre de
  pila lo elige cada usuario en Clerk, así que no prueba nada; el email está
  verificado, y por eso la tarjeta de lista recibida enseña los dos. Si el JWT
  no trae `given_name` (porque los claims del token de sesión o la plantilla
  `convex` de Clerk no lo incluyan, o porque el usuario no haya puesto nombre),
  la tarjeta usa el email.
- **Los enlaces vienen de otro usuario.** El servidor nunca los abre: no hay
  vista previa, así que no hay superficie de SSRF. Solo se aceptan `http:` y
  `https:` (`isAllowedListItemUrl`), porque un `javascript:` en el `href` sería
  XSS en la cuenta de quien lo abre. Se pintan con `target="_blank"
  rel="noopener noreferrer nofollow"` y siempre con el dominio visible
  (`ListItemLink`); un dominio que imita a otro sale en punycode.
- **Compartir desde Android (`share_target` del manifiesto) llega por POST a
  `/compartir`** (`src/app/compartir/route.ts`), fuera de `/api` porque el
  proxy rechaza los POST a `/api` que no son del mismo origen y «Compartir»
  llega con `Sec-Fetch-Site: none`. No es un hueco CSRF: la ruta no cambia
  nada, solo lee lo compartido (recortado a 4.000 caracteres por campo) y
  redirige con 303 a `/mi-lista/apuntar` con los datos en el fragmento, que
  pasa por la misma validación que el del marcador. POST y no GET para que el
  enlace no quede en los registros de peticiones. **Es pública** (§6): quien la
  usa con la sesión caducada no pierde lo compartido. La sesión la exige
  `/mi-lista/apuntar`.
- **Sin sesión, lo del marcador y de «Compartir» se conserva en el navegador.**
  El proxy lleva a `/sign-in` de la propia app (`signInUrl` en `clerkMiddleware`;
  antes, sin la variable de entorno puesta, iba a la página alojada por Clerk,
  otro dominio). El navegador mantiene el fragmento en esa redirección y
  `StashPendingShare` lo guarda 30 minutos en `sessionStorage` solo si
  `readBookmarkletFragment` lo acepta (los fragmentos internos de Clerk no se
  tocan); `/mi-lista/apuntar` lo recoge al volver y lo borra. Nunca sale del
  navegador ni se guarda en servidor, y la analítica sigue quitando los
  fragmentos en `beforeSend`.
- **Las fotos se sirven desde el almacenamiento de Convex**, así que la CSP
  (Report-Only) admite `https://*.convex.cloud` en `img-src`.
- **El botón «Apuntar en PickPal» (`src/lib/bookmarklet.ts`) corre en la página
  de la tienda, no en PickPal.** Es una cadena fija, sin scripts remotos: no
  carga nada de PickPal ni de nadie, así que no hay nada que un tercero pueda
  cambiar. Lee el título, la dirección canónica y, solo si la tienda lo publica
  en euros, el precio de sus datos estructurados, y abre `/mi-lista/apuntar`
  con los datos en el fragmento (`#t=…&u=…&p=…`), que no llega al servidor; la
  analítica lo quita en `beforeSend` y la página lo borra de la barra al
  leerlo. `readBookmarkletFragment` trata ese fragmento como entrada de
  cualquiera (cualquiera puede escribir esa dirección): título recortado,
  enlace solo `http(s)` y pasado por `prepareListLink`, precio con su tope, y
  nada se guarda sin pulsar «Apuntar», que pasa por `addItem` y sus
  validaciones. El `href` del botón (`javascript:`) se pone con
  `setAttribute`, porque React no lo pinta, y se construye con el origen de la
  página en ese momento, nunca escrito a mano.
- **Lo que se pega para traer una lista tampoco es de fiar.** Se analiza solo
  en el navegador, con funciones puras sin red ni IA, y nunca se pinta tal
  cual: pasa directamente a la vista previa de filas. El portapapeles solo se
  lee con un gesto de la dueña (el evento de pegar o el botón «Pegar»), nunca
  al cargar la página, y lo pegado tiene tope de tamaño. A Convex solo llega lo
  que ella elige apuntar, y `lists.importItems` vuelve a validar cada fila con
  `validateListItemInput` como si nadie la hubiera mirado. Los enlaces siguen
  la regla anterior: solo `http:` y `https:`, y el servidor no los abre.
  Lo importado nunca trae estado de reserva, ni leído del texto ni guardado:
  llega libre para todos los lectores, como lo que se apunta a mano. El cupo y
  el orden de las comprobaciones están en §4.
- **El correo de aviso al lector no lleva nada de la lista.** Solo el nombre
  y el email del dueño (sacados de su JWT, igual que en la tarjeta) y un enlace
  a la app: los elementos los escribe otra persona y no deben viajar por
  correo. La dirección sale de `userSettings.email` del lector, nunca de un
  argumento. Se programa desde `grantAccess` con `ctx.scheduler`, así que solo
  sale si la transacción que concede el acceso se confirma, y como mucho una
  vez cada 30 días por pareja (`listInviteEmails`). El plazo se apunta al
  programarlo, no al enviarlo: si Resend falla no se reintenta, pero nadie
  puede encadenar invitar y «Descartar» para mandar correos. El nombre va
  escapado en el HTML y sin saltos de línea en el asunto. El plazo es por
  pareja, no por lista: la segunda lista que Marta comparte con la abuela en
  el mismo mes no escribe, y `emailed` lo dice tal cual.
- **El aviso de una lista a cargo no dice para quién es.** Sale «Marta te ha
  compartido una lista en PickPal» (`buildListInviteEmail` con `managed`): el
  nombre de un niño no pasa por Resend, se ve al entrar. Tampoco promete que
  quien la lleva no vea lo que se marca, porque en esas listas ve lo cogido.
- **El correo de la fecha lleva dos cifras y ningún título.** La tarjeta del
  evento puede llevar cuántas cosas de las listas que el destinatario asoció a
  esa persona no ha marcado nadie (`countUnclaimedForReader`) y cuántas tiene
  marcadas él mismo sin dar por regaladas (`countMarkedByReader`). La segunda
  solo cuenta sus propias marcas, nunca las de otros lectores; las de
  elementos que el dueño quitó no cuentan. Si las dos son 0 no sale nada.
  Cada lista cuenta por su permiso (dueño, lista, lector): la ficha de Lucía
  de la abuela cuenta la lista de Lucía, no la propia de Marta. Quien lleva
  una lista no tiene permiso sobre ella, así que su correo no la cuenta
  («nada en la Agenda ni en la campana»).
- **Quitar el acceso borra las marcas.** `revoke` y `leave` borran las marcas de
  ese lector en esa lista (`by_owner_list_reader`), y solo en esa: dejar la de
  Lucía no toca las que tiene en la de Marta. Si no se borraran, bloquearían
  elementos para siempre.
- **La foto de cada cosa la sube el dueño, y solo él.** El servidor nunca la
  saca de la tienda (no abre enlaces, ver arriba). Son tres pasos:
  `generatePhotoUploadUrl` gasta `list_photo_upload` (30/día, §4) y devuelve
  una dirección de subida de un solo uso; el navegador sube el archivo;
  `setItemPhoto` lo apunta al elemento tras `assertOwnItem`. Como una mutation
  no puede leer el archivo, la comprobación es sobre lo que Convex apuntó al
  recibirlo en `_storage` (`ctx.db.system.get`): tipo declarado JPG, PNG o
  WebP y tamaño real de como mucho 1,5 MB (`isAllowedListPhoto`, §3). El tipo
  lo declara quien sube, así que no prueba que el contenido sea una imagen;
  lo que lo acota es que la foto solo se pinta en un `<img>`, nunca se abre
  como documento, y que el archivo no puede pasar de 1,5 MB. **Los EXIF (y con
  ellos el GPS) los quita el navegador** al volver a codificar la imagen antes
  de subirla. El servidor no puede comprobarlo: un cliente modificado puede
  subir un JPG con su ubicación, pero solo la del propio dueño y solo en su
  lista. Un archivo que ya es la foto de otro elemento no vale (índice
  `by_photo`): si alguien llegara a conocer el id de un archivo ajeno (no se
  devuelve a nadie, pero la dirección de la foto la ven los lectores y no
  conviene fiarlo a que no se pueda sacar de ahí), podría apuntárselo a una
  cosa suya y, al quitarlo, borrar la foto del otro. Cambiar la foto, quitarla
  (`removeItemPhoto`), borrar el elemento o la cuenta borran el archivo; la
  copia que guarda una marca al borrar un elemento nunca lleva foto. Ni poner
  ni quitar la foto ponen `editedAt`. La dirección (`photoUrl`) llega al dueño
  en `myItems` y al lector en `forPerson`, por el mismo permiso que el resto,
  y a la exportación del dueño como `fotoUrl`; funciona mientras exista la
  cuenta.
- **Lo subido que no acaba en ningún elemento se borra solo.** Si
  `setItemPhoto` rechaza el archivo, el error deshace la mutation entera,
  también un borrado del archivo que intentara, así que no puede borrarlo
  ella. Tampoco se apunta lo que se sube y no se llega a apuntar (la página
  se cierra, el elemento se borra entre medias). Lo recoge
  `lists.sweepOrphanPhotos`, una `internalMutation` que corre a diario desde
  `convex/crons.ts`: mira los archivos de `_storage` subidos entre hace 3 días
  y hace 1 y borra los que no use ningún elemento (`by_photo`). El día de
  margen es para no quitarle el archivo a una subida a medias. **Supone que
  «Mi lista» es lo único que guarda archivos en `_storage`:** si otra función
  empieza a usarlo, el barrido tiene que saber de ella o le borrará los
  archivos.
- **El orden a mano no es una edición.** `moveItem` intercambia el sitio
  (`position ?? -_creationTime`) con el vecino del mismo grupo y no pone
  `editedAt`, así que a nadie le salta «lo ha cambiado». Solo lo hace el dueño
  (`assertOwnItem`), solo lee `listItems` y no gasta cupo (§4). El lector ve la
  lista en ese orden; no ve `position`.
- **El cumpleaños del dueño va por el permiso de la lista.** `setBirthday`
  guarda día y mes (sin año, así que no dice la edad) en la misma fila de
  `listAbout` que la nota, con `validateBirthday` (§3), y lo lee él con
  `myBirthday`. Al lector le llega dentro de `forPerson` (`birthday`) por la
  fila de `listShares`, como la nota: un invitado de la ficha asociada no lo
  ve. No llega a Gemini ni se copia a la ficha del lector. Sale en la
  exportación del dueño (`miLista.miCumpleanos`), no en la de quien lo lee, y
  se va con su cuenta.
- **Bloquear a quien te comparte su lista no se nota desde fuera.**
  `leaveAndBlock` hace lo mismo que `leave` (permiso y marcas fuera) y apunta
  una fila en `listBlocks` con el nombre y el email del permiso. Si el dueño
  vuelve a compartirla (`invite` o `shareBack`), `grantAccess` sigue
  exactamente el mismo camino que sin bloqueo: misma comprobación de tope (la
  fila cuenta para los 20), mismo cupo `invite_list`, mismos errores, y el
  mismo `emailed`, que se calcula igual (el lector tiene email y no hay aviso
  en los últimos 30 días) y apunta el plazo en `listInviteEmails` como si el
  correo hubiera salido. Lo único distinto es que la fila nace con
  `hidden: true` y el correo no se programa. El dueño la ve en `myReaders` y en
  su exportación como un lector más; no hay ningún campo, error ni contador que
  dependa de `hidden` en lo que le llega, y un test compara todo lo que ve con
  y sin bloqueo. Para el lector, una fila oculta no existe: `sharedWithMe`,
  `forPerson`, `claim`, `myGifts`, los contadores del correo de la fecha y su
  exportación la saltan, y `associate`, `leave`, `leaveAndBlock` y `shareBack`
  contestan «Lista no encontrada.», como con un id ajeno. Sus bloqueos los ve
  solo él (`myBlocks`) y solo él los quita (`unblock`, que destapa la fila
  oculta si la hay, sin correo: el plazo ya contó). En su exportación salen
  como `listasQueNoQuieres`, y en `avisosDeListaPorCorreo.recibidos` no sale
  un aviso que no salió (`suppressed`; `deliveredAt` guarda el anterior que sí
  salió). Cómo se borra con la cuenta está en §7. **El bloqueo es por dueño,
  no por lista:** bloquear a Marta desde la lista de Lucía deja ocultas todas
  las que Marta comparta después, la suya y las que lleva, también las que
  empiece más adelante. Las que ya le había compartido y no ha dejado siguen
  como están (se dejan una a una), y `unblock` destapa todas las ocultas de
  ese dueño.
- **«Lo regalo yo · para…» es un dato de quien marca.** `setClaimOccasion`
  exige que la marca sea suya (`assertOwnClaim`) y siga sin dar por regalada,
  y que la fecha sea de la ficha a la que asoció esa lista y que todavía ve
  (`validPersonId` sobre su permiso visible): tener acceso a otra ficha no
  basta, como en «misma persona, no solo acceso» de §2, y el error es el mismo
  si la fecha no existe que si es de otra ficha. La etiqueta se resuelve al
  leer: si la fecha se borra o el lector deja de ver la ficha, sale sin
  ocasión. Solo vuelve a quien marcó (`occasionLabel` en sus propias filas de
  `forPerson`, y `myGifts`); al dueño y al resto de lectores no les llega nada.
  Sale en la exportación de quien marcó (`paraOcasion`).

---

## Checklist de PR

Antes de mergear, verifica que el cambio no rompe ninguno de estos:

### Si tocas `convex/**`:
- [ ] Cada query/mutation expuesta llama a `requireUser()`.
- [ ] Cada operación sobre un recurso del usuario verifica ownership.
- [ ] Args nuevos están validados (tamaño, rango, allowlist).
- [ ] Si la mutation crea filas o llama a APIs externas, tiene rate limit.
- [ ] Si la mutation accede a datos cruzados (entre usuarios), está justificado y auditado.

### Si tocas `src/app/api/**`:
- [ ] Token Clerk validado al inicio.
- [ ] Body parseado con zod.
- [ ] Errores genéricos al cliente; detalles a `console.error`.
- [ ] Sin nombres de env vars en mensajes de error visibles al cliente.

### Si tocas `src/proxy.ts`:
- [ ] Si añades a `isPublicRoute`, el commit explica por qué la ruta es legítimamente pública.

### Si tocas `next.config.ts`:
- [ ] No relajas headers existentes sin alternativa equivalente.

### Si tocas `.env*` o `process.env.*`:
- [ ] Nuevos secrets no llevan prefijo `NEXT_PUBLIC_`.
- [ ] `.env.example` actualizado con placeholder.

### Si tocas `package.json` o el lockfile:
- [ ] Ningún aviso nuevo sin resolver ni justificar (`npm audit`); si se acepta uno, va a la tabla de avisos aceptados.
- [ ] No se ha ejecutado `npm audit fix --force`.
- [ ] `npm run lint`, `tsc` y `npm run build` pasan (los majors de tooling rompen el build sin que el CI lo note — el CI solo corre vitest).

### Si tocas `.github/workflows/`:
- [ ] Ningún bloque `permissions` a nivel de workflow — cada job declara el suyo.
- [ ] El job que corre `npm ci` sigue con `contents: read` y `persist-credentials: false`.
- [ ] Un job nuevo con permisos de escritura está justificado en el propio fichero.

### Si tocas el schema de Convex:
- [ ] Índices nuevos no exponen datos cruzados (ej. un índice solo por `personId` sin `clerkUserId` en la query).
- [ ] En las tablas de «Mi lista», toda lectura por dueño fija también la lista (`managedListId`, §11), salvo el borrado de la cuenta.
- [ ] Campos sensibles nuevos están listados aquí.
- [ ] Si el campo viene del cliente o de Gemini y es de tamaño/contenido variable, hay un validator en `convex/validators.ts` que se llama desde la mutation que escribe.

---

## Integración continua (`.github/workflows/ci.yml`)

El `GITHUB_TOKEN` del workflow es una credencial más, y el job `test` ejecuta
`npm ci`, que corre los scripts de instalación de cada dependencia del árbol.
Todo lo que ese job pueda hacer, puede hacerlo un paquete comprometido.

- **Nada de `permissions` a nivel de workflow.** Lo que se declara ahí lo
  heredan todos los jobs. Cada job declara lo suyo: `test` va con
  `contents: read`, y los permisos de escritura viven solo en
  `dependabot-automerge`, que es el único que mergea.
- **`persist-credentials: false`** en el `actions/checkout` de `test`: sin eso
  el token queda en `.git/config` del runner, legible por cualquier script de
  instalación. Ese job no empuja nada.
- Si algún día un job necesita escribir, **dáselo a ese job**, no al workflow.

### Riesgo asumido: auto-merge de Dependabot

Los PRs de Dependabot `patch`/`minor` se mergean solos si los tests pasan, y
`main` despliega solo. La cadena completa —versión nueva de un paquete →
merge → producción— no pasa por ojos humanos. El gate es la suite de tests,
que no está pensada para detectar un paquete malicioso.

Es un equilibrio consciente para un proyecto de una persona: el coste de
revisar a mano cada bump de parche es real, y quedarse desactualizado también
es un riesgo. Pero la app guarda datos de terceros, así que **si esto se
revisa alguna vez, el cambio es exigir aprobación manual para el auto-merge**,
o acotarlo a un allowlist de paquetes. Anotado aquí para que sea una decisión
y no un descuido.

---

## Lo que NO está implementado todavía

Decisiones explícitas de "ahora no":

- **CSP enforcing**: la CSP vive en `Content-Security-Policy-Report-Only` ([`next.config.ts`](../next.config.ts)): registra violaciones en la consola del navegador sin bloquear nada. Motivo: Next.js 16 + Clerk requiere `'unsafe-inline'` en scripts (o nonces), y una CSP enforcing mal ajustada rompe la app silenciosamente. Antes de pasar a enforcing: ajustar el host de Clerk (`*.clerk.accounts.dev`) al dominio de producción y revisar los reports en staging. También se envía `Cross-Origin-Opener-Policy: same-origin-allow-popups` (aísla la ventana sin romper los popups OAuth de Clerk) y `poweredByHeader: false` (no anunciar Next.js).
- **Rate limit por IP**: solo hay rate limit por usuario autenticado. Suficiente mientras no haya endpoints anónimos.
- **Webhooks**: no existen. Cuando se añadan (Clerk, Stripe, etc.), **siempre verificar firma con el secret del proveedor antes de procesar**.
- **Auditoría de acceso**: no se loguea quién leyó qué. Aceptable para una app personal; revisar si pasa a multi-tenant.
- **El dueño no puede revocar a un invitado.** Solo existe `personShares.leave` (el invitado se va solo). Añadir un `personShares.revoke` (dueño quita a un invitado concreto) es sencillo con la tabla actual, pero no lo pedía el encargo y no hay un caso de uso claro que lo motive todavía — revisar si aparece.
- **Compartir concede acceso al momento, sin que el invitado acepte.** `personShares.invite` resuelve el email y da acceso en la misma llamada; no hay un estado "pendiente" ni una notificación al invitado de que ahora tiene acceso a una ficha con datos de salud. Aceptable para el caso de uso (hermanos que ya han hablado de compartir antes de escribir el email), pero si se abre a compartir con desconocidos, esto necesita revisarse.
- **El email tiene que coincidir con una cuenta existente.** No hay invitación por email a alguien sin cuenta todavía (sin flujo de "cuando se registre, dale acceso"). Quien invita ve "No hay ninguna cuenta de PickPal con ese email" y tiene que pedirle a esa persona que se registre primero. Vale igual para compartir «Mi lista» (§11): invitar a quien aún no tiene cuenta quedó fuera de la primera versión porque obliga a escribir a alguien que no es usuario.
- **El servidor no comprueba que la foto de un elemento venga sin EXIF.** Lo quita el navegador al volver a codificarla (§11); una mutation no puede leer el archivo, y comprobarlo exigiría una action que lo descargue y lo analice. El riesgo se limita a que un cliente modificado publique la ubicación de su propio dueño en su propia lista. Revisar si las fotos llegan a venir de otro sitio que no sea la cámara o la galería del dueño.
- **El tipo de una foto es el que declara la subida.** No se miran los bytes del archivo (mismo motivo). Lo acotan el tope de 1,5 MB y que solo se pinta en `<img>`.

---

## Avisos de dependencias (Dependabot / `npm audit`)

Dependabot abre PRs para las dependencias **directas** ([`.github/dependabot.yml`](../.github/dependabot.yml)). Las vulnerabilidades **transitivas** no las puede PR-ear: esas se cierran subiendo la versión dentro del rango semver existente o, si no cabe, con `overrides` en `package.json`.

**Nunca ejecutar `npm audit fix --force`.** Instala majors fuera de rango: hoy metería `eslint@10`, que rompe `eslint-config-next` (y por tanto `next build` y `npm run lint`). El coste supera siempre al de un aviso *dev-only*.

Antes de declarar un aviso "no arreglable", tres comprobaciones:
1. **¿Cabe el parche en el rango semver que ya existe?** Comparar `npm view <pkg>@<rango> version --prefer-online` con lo que pide el padre en el lockfile. Si cabe, `npm update <pkg> --prefer-online` lo cierra sin `overrides` ni majors, y entonces no hay nada que aceptar. Es el caso más común y el que primero hay que descartar.
2. **Verificar el código instalado, no los metadatos.** Un backport de mantenimiento puede contener el fix sin que GitHub acote el rango del aviso. Buscar el guard que describe el CVE en `node_modules/<pkg>/`.
3. **`npm update` puede mentir por caché de metadatos** — dice "up to date" habiendo versiones nuevas. Forzar re-resolución con `--prefer-online`.

### Avisos aceptados

| Aviso | Paquete | Por qué se acepta | Cuándo se revisa |
|---|---|---|---|
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) / CVE-2026-93687 (high, DoS: unas llaves muy anidadas desbordan la pila y tumban el proceso). Alerta de Dependabot n.º 85, abierta el 05-10-2026 | `braces` ≤ 3.0.3 | **No hay versión corregida.** `braces@3.0.3` es la última publicada (sin cambios desde septiembre de 2024), y también lo son `micromatch@4.0.8` y `fast-glob@3.3.3`, que lo traen. Llega por dos caminos: `shadcn → fast-glob → micromatch → braces` (la CLI, clasificada como *runtime* por el accidente que explica la última lección de abajo) y `eslint-config-next → @next/eslint-plugin-next → fast-glob → …` (el lint). Ninguno se ejecuta en la app, y los patrones que expanden son los de la propia herramienta, sin entrada de nadie. `npm audit` lo cuenta 9 veces porque repite el aviso por cada paquete de la cadena, y propone bajar `shadcn` a la 1.0.0 y `eslint-config-next` a la 14: no aplicarlo. Se deja **abierto** en Dependabot, no descartado: descartado, Dependabot no abriría el PR cuando salga el parche. Aceptado el 10-10-2026. | Cuando se publique `braces` > 3.0.3 (`npm view braces dist-tags --prefer-online`). Si cabe en el `^3.0.3` de `micromatch`, `npm update braces --prefer-online` lo cierra. |

El 10-10-2026 `npm audit fix` (sin `--force`) cerró a la vez los otros cinco avisos abiertos, todos dentro de los rangos ya permitidos: `proxy-addr` 2.0.8 (crítico, vía el servidor MCP de `shadcn`), `@modelcontextprotocol/sdk` 1.32.1, `sharp` 0.35.5, `source-map-js` 1.2.2 y `postcss-selector-parser` 7.1.6. Ninguno llegaba a la app en producción; se arreglaron igual porque el parche cabía.

### Historial: lo que se aceptó y por qué dejó de aceptarse

| Aviso | Paquete | Qué pasó |
|---|---|---|
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) / CVE-2026-14257 (high, DoS por expansión sin límite) | `brace-expansion` | Aceptado el 30-07-2026 como *inaccurate*: el árbol tenía `1.1.17`, backport v1 que sí contiene el guard `EXPANSION_MAX_LENGTH`. **La aceptación se cayó el 19-08-2026** con [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895), que es el bypass de esa misma mitigación: el `maxLength` se aplicaba en `combine()` pero no en los arrays intermedios que lo alimentan, así que ~25 KB de input seguían tumbando el proceso con un OOM **no capturable**. Resuelto subiendo a `1.1.18` (dev) y `5.0.9` (prod), ambos dentro del rango semver que ya existía. |
| [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) (high, bucle infinito en `customAlphabet`/`customRandom` con `size` 0) | `nanoid` | Nunca se aceptó. Exposición real nula —llega por `postcss`, no se importa en `src/` ni en `convex/`, y postcss no le pasa un tamaño ajeno—, pero el parche `3.3.18` cabía en el `^3.3.16` de postcss: se arregló en vez de documentar una excepción permanente. |

**Tres lecciones de ese episodio:**

- **«Ya parcheado» no es una razón duradera** cuando el parche es justo lo que el aviso siguiente pone en duda. Si se acepta un aviso porque una mitigación lo cubre, hay que revisarlo en cuanto aparezca cualquier advisory nuevo sobre el mismo paquete.
- **No forzar `overrides` de `brace-expansion` a la v5.** La v5 cambió el export CJS a `exports.expand`, y `minimatch@3` hace `require(...)` y lo llama como función → `TypeError` que rompe `npm run lint`. Cuando hay parche en la línea v1, usarlo: satisface el `^1.1.7` de minimatch sin cambiar la forma del export.
- **Un aviso *runtime* puede serlo por accidente de clasificación.** `brace-expansion` 5.x aparece como prod porque `shadcn` vive en `dependencies` (`shadcn → ts-morph → @ts-morph/common → minimatch@^5`). Es una CLI de codegen: lo único que se le consume es el `@import "shadcn/tailwind.css"` de `globals.css`, que se resuelve en build, donde Vercel también instala devDependencies. Moverla a `devDependencies` reclasificaría el aviso y adelgazaría el árbol de producción — pendiente de comprobar que no rompe el build.

Descartar un aviso en Dependabot requiere motivo; usar el que sea **cierto** (`inaccurate` cuando el rango del aviso está mal, `not_used` cuando el código no se ejecuta, `tolerable_risk` cuando se asume el riesgo) y añadirlo a esta tabla en el mismo commit.

---

## Cuándo actualizar este documento

- Añades un nuevo patrón de seguridad (helper, validator, middleware).
- Decides explícitamente *no* implementar algo (añádelo a "Lo que NO está implementado todavía").
- Encuentras un gap durante una revisión y lo cierras: documenta el principio, no el incidente.
- Cambias los límites de validación o rate limit (los números viven aquí y en código, mantener sincronizados).
- Descartas o aceptas un aviso de Dependabot (añádelo a la tabla de avisos aceptados con el motivo y la condición de revisión).

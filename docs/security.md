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

Buckets actuales: `create_person` (50/día), `create_date` (100/día), `save_idea` (50/día), `invite_person` (20/día — compartir una ficha, ver §9), `invite_lookup` (30/día — comprobar un email antes de invitar, ver §9; lo comparten las fichas y «Mi lista»), `create_list_item` (100/día), `claim_list_item` (100/día — marcar «Lo regalo yo»), `invite_list` (20/día — compartir tu lista, por email o de vuelta; ver §11), `recommendationUsage` (10/día, tabla aparte por motivos históricos).

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

Rutas públicas actuales:
- `/` — landing.
- `/sign-in(.*)`, `/sign-up(.*)` — flujo Clerk.
- `/privacidad` — aviso de privacidad. Debe ser legible antes de crear cuenta y por terceros que aparezcan como "ser querido" en la cuenta de un usuario.
- `/terminos` — términos y condiciones. Mismo motivo: la página dice "al registrarte aceptas estos términos", así que tienen que poder leerse antes de registrarse. Estuvo protegida por omisión (el default-deny la capturó) y los enlaces del footer y del sign-up llevaban a sign-in — **al añadir una página legal nueva, acordarse de esta lista**.

### 7. Borrado de cuenta (autoservicio)

Toda cuenta de PickPal se puede borrar desde [`/settings`](../src/app/(app)/settings/page.tsx) con un diálogo de confirmación ("escribe ELIMINAR").

Flujo:
1. UI llama `POST /api/account/delete` ([`src/app/api/account/delete/route.ts`](../src/app/api/account/delete/route.ts)).
2. La ruta valida el token Clerk y llama a `api.account.deleteMyAccount` ([`convex/account.ts`](../convex/account.ts)), que con `requireUser(ctx)` purga en cascada todo lo del usuario en Convex: `people` (con sus `importantDates`, `giftHistory`, `recommendations`, `savedIdeas`), `userSettings`, `emailNotifications`, `recommendationUsage`, `rateLimitBuckets`. Además barre `savedIdeas` huérfanas vía el índice `by_user` (filas cuya persona ya no existe).
3. Solo si el purge en Convex sale bien, se llama `clerkClient().users.deleteUser(userId)`.
4. UI hace `signOut` y redirige a `/`.

**Cascada de borrado de persona:** el helper `deletePersonCascade(ctx, personId)` ([`convex/people.ts`](../convex/people.ts)) borra `importantDates`, `giftHistory`, `recommendations`, `savedIdeas` y `personShares` de una persona y después la persona. Es el **único** camino válido para borrar una persona: lo usan `people.remove` y `account.deleteMyAccount` (cuando la persona no tiene invitados — ver §9). Si añades una tabla anidada bajo `people`, añádela al helper (no a los call sites).

**Reglas al añadir tablas nuevas:** si guardas datos vinculados a un usuario, añade su limpieza a `deleteMyAccount`. La regla aplica también si la tabla no tiene un campo `clerkUserId` directo: el borrado debe alcanzarla por relación (ej. `importantDates` se borra siguiendo `people` → `by_person`). Si una tabla nueva no se puede asociar a un usuario, no se puede exponer.

El `clerkUserId` siempre se lee de la sesión vía `requireUser` — la mutation no acepta argumentos. No existe forma de que un usuario borre los datos de otro.

**El borrado propio de Clerk está desactivado, y tiene que seguir así.** Clerk Dashboard → User & authentication → «Allow users to delete their account» está en **off**, aplicado también a los usuarios existentes (27-sep-2026). Si se activa, el perfil de Clerk (`UserButton` → Administrar cuenta) enseña su propio botón de borrar cuenta. Ese botón borra el usuario en Clerk pero no toca Convex, porque no hay webhook. Las fichas, fechas, alergias y ajustes se quedarían huérfanos, justo lo contrario de lo que promete `/privacidad`. El único camino de borrado es este flujo. «Allow users to change their email address» sí sigue activo: es rectificación, y los avisos leen el email del JWT de cada sesión.

**Excepción desde que existe compartir (§9):** `deleteMyAccount` ya no borra incondicionalmente cada `people` del usuario. Si la persona tiene invitados, la propiedad se transfiere al más antiguo (`personShares.transferToOldestInviteeOrNull`) en lugar de borrarla — bloquear el borrado violaría el derecho RGPD a irse, y cascada la castigaría a un tercero por una decisión ajena. Solo se cascada-borra si no queda nadie más con acceso. Además, `deleteMyAccount` llama a `personShares.deleteSharesForUser` para desligar al usuario de toda ficha ajena que le hubieran compartido — la versión en bloque de `personShares.leave`.

**«Mi lista» no tiene esa excepción (§11):** `lists.deleteListDataForUser` borra la lista entera del usuario (elementos, accesos y las marcas que otros hicieron en ella) sin transferirla, y sus accesos y marcas en listas ajenas. Las entradas de historial que un lector creó a partir de la lista son de su ficha y se quedan.

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

- **El dueño nunca ve las marcas.** `myItems` y `myReaders` leen solo
  `listItems` y `listShares`; ninguna query del dueño cruza con `listClaims`, ni
  para un contador, y la exportación del dueño tampoco las lleva (§2.6 de
  `privacy.md` explica la base). Es la propiedad que sostiene la función y la
  primera que prueba `convex/lists.test.ts`. Si una query nueva del dueño
  necesita mirar `listClaims`, está mal planteada.
- **El lector entra por el permiso del dueño.** `forPerson` y `claim` buscan la
  fila de `listShares` (dueño, lector), nunca el acceso a la ficha donde el
  lector guardó la lista (§2). Ve que un elemento está cogido, pero no quién lo
  cogió (`state: "taken"` sin `claimId`) ni quién más lee la lista.
- **La asociación a una ficha se valida al leer.** Un lector pierde el acceso a
  una ficha por varios caminos (`people.remove`, `personShares.leave`, la
  transferencia al borrar una cuenta). En vez de engancharse a cada uno,
  `validPersonId` comprueba `personHasAccess` en cada lectura y, si falla, la
  lista vuelve a quedar pendiente.
- **Invitar es como en las fichas** (§9): `/api/lista/share` gasta
  `invite_lookup` antes de preguntar a Clerk y `lists.invite` aplica el tope de
  20 lectores y el cubo `invite_list`. `lists.shareBack` comparte tu lista con
  quien te compartió la suya sin email: la cuenta sale de la fila de
  `listShares` del lector, nunca de un argumento.
- **El nombre que ve el lector lo pone el dueño.** `ownerName` y `ownerEmail` se
  copian del JWT del dueño al conceder el acceso, no del cliente. El nombre de
  pila lo elige cada usuario en Clerk, así que no prueba nada; el email está
  verificado, y por eso la tarjeta de lista recibida enseña los dos. Si el JWT
  no trae `given_name` (porque la plantilla `convex` de Clerk no lo incluya o
  porque el usuario no haya puesto nombre), la tarjeta usa el email.
- **Los enlaces vienen de otro usuario.** El servidor nunca los abre: no hay
  vista previa, así que no hay superficie de SSRF. Solo se aceptan `http:` y
  `https:` (`isAllowedListItemUrl`), porque un `javascript:` en el `href` sería
  XSS en la cuenta de quien lo abre. Se pintan con `target="_blank"
  rel="noopener noreferrer nofollow"` y siempre con el dominio visible
  (`ListItemLink`); un dominio que imita a otro sale en punycode.
- **Quitar el acceso borra las marcas.** `revoke` y `leave` borran las marcas de
  ese lector en esa lista; si no, bloquearían elementos para siempre.

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
- **No se puede bloquear a quien te comparte listas.** «No me interesa» deja la lista, pero la misma persona puede volver a compartirla y la tarjeta reaparece. Lo acotan el cubo `invite_list` (20/día por quien comparte) y que hace falta conocer el email de la cuenta. Revisar si aparece abuso.

---

## Avisos de dependencias (Dependabot / `npm audit`)

Dependabot abre PRs para las dependencias **directas** ([`.github/dependabot.yml`](../.github/dependabot.yml)). Las vulnerabilidades **transitivas** no las puede PR-ear: esas se cierran subiendo la versión dentro del rango semver existente o, si no cabe, con `overrides` en `package.json`.

**Nunca ejecutar `npm audit fix --force`.** Instala majors fuera de rango: hoy metería `eslint@10`, que rompe `eslint-config-next` (y por tanto `next build` y `npm run lint`). El coste supera siempre al de un aviso *dev-only*.

Antes de declarar un aviso "no arreglable", tres comprobaciones:
1. **¿Cabe el parche en el rango semver que ya existe?** Comparar `npm view <pkg>@<rango> version --prefer-online` con lo que pide el padre en el lockfile. Si cabe, `npm update <pkg> --prefer-online` lo cierra sin `overrides` ni majors, y entonces no hay nada que aceptar. Es el caso más común y el que primero hay que descartar.
2. **Verificar el código instalado, no los metadatos.** Un backport de mantenimiento puede contener el fix sin que GitHub acote el rango del aviso. Buscar el guard que describe el CVE en `node_modules/<pkg>/`.
3. **`npm update` puede mentir por caché de metadatos** — dice "up to date" habiendo versiones nuevas. Forzar re-resolución con `--prefer-online`.

### Avisos aceptados

**Ninguno ahora mismo** — `npm audit` está a cero (19-08-2026).

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

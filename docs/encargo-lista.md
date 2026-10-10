# Encargo: «Mi lista», la lista compartida

Pásale esto a quien vaya a implementarlo. Es autosuficiente: no hace falta la
conversación en la que se decidió (10-oct-2026).

---

Implementa **«Mi lista»** en PickPal (Next 16 + Convex + Clerk). El diseño ya está
decidido; no lo rediscutas. Si algo de aquí choca con el código, para y pregunta
antes de inventar una tercera vía.

**Lee primero, en este orden:**

1. `AGENTS.md`: reglas del proyecto. Las que más te van a afectar son leer
   `convex/_generated/ai/guidelines.md` antes de tocar Convex y `docs/security.md`
   antes de añadir mutations, rutas o variables de entorno.
2. `docs/security.md`, sobre todo §2 (comprobar el acceso), §4 (rate limit) y §9
   (compartir).
3. `docs/dudas.md` → entrada **«Compartir personas entre usuarios»**. El flujo de
   invitación que vas a copiar está explicado ahí, con sus porqués.
4. `docs/design-system.md` antes de tocar la interfaz.

**El caso de uso:** Laura apunta en PickPal lo que le haría ilusión que le regalaran
y se lo comparte a su pareja. Su pareja lo ve dentro de la ficha que ya tenía de
Laura, junto a sus fechas, sus gustos y el historial de regalos, y marca lo que va a
regalarle sin que Laura se entere. La lista existe para dar ideas a quien regala. No
es una lista de deseos pública: sin enlaces abiertos, sin eventos, sin botón de
compra.

## Decisiones

### Lo que ve el dueño

1. **Una lista por usuario**, con hasta 100 elementos. Sin ocasiones ni listas
   múltiples.
2. **Cada elemento tiene título obligatorio, enlace opcional y nota opcional.** No
   hay precio, ni prioridad, ni orden manual: se muestran del más nuevo al más
   antiguo.
3. **El servidor nunca abre el enlace.** No hay vista previa con imagen o precio,
   porque pedir URLs que escribe un usuario abre la puerta a SSRF. Si el dominio es
   de una de las 11 tiendas de `src/lib/stores.ts`, se muestra su logo; si no, el
   dominio en texto. El dominio se ve siempre, para saber adónde lleva el enlace
   antes de abrirlo.
4. **Se comparte con hasta 20 personas que ya tengan cuenta.** La invitación es por
   email resuelto contra Clerk, igual que en las fichas. No hay invitaciones a gente
   sin cuenta.
5. **El dueño puede quitar el acceso a cualquiera en cualquier momento.** En las
   fichas compartidas eso no existe; aquí es imprescindible, porque las parejas se
   rompen.
6. **Compartir va en un solo sentido.** Que Laura te comparta su lista no comparte
   la tuya con ella.
7. **El dueño no ve las marcas**: ni qué está marcado, ni quién lo marcó, ni si un
   lector ha asociado la lista a una ficha. La pantalla lo dice con un texto fijo,
   porque una marca invisible no es lo que nadie espera y sin aviso parecerá un
   fallo.

### Lo que ve quien la lee

8. **Los dos necesitan cuenta.** No hay enlaces públicos.
9. **Aviso de lista recibida:** una tarjeta arriba en `/agenda` y en
   `/seres-queridos` hasta que el lector la resuelve. Tiene tres salidas:
   - elegir una ficha a la que ya tenga acceso, propia o compartida con él;
   - «Crear ficha de {nombre}», con el nombre ya puesto;
   - «No me interesa», que equivale a dejar la lista.

   No se usa la campana, que es «Próximas fechas» y no debe cambiar de sentido.

   **Cambiado el 10-oct-2026:** además de la tarjeta, al lector le llega un
   correo de aviso con el nombre y el email del dueño y un enlace a la app, sin
   nada de la lista. Va a todas las cuentas, sin interruptor en Ajustes, porque
   es parte del servicio de listas y no un recordatorio de fechas propias. Como
   mucho uno cada 30 días por pareja de dueño y lector, para que invitar, que
   pulsen «No me interesa» y volver a invitar no sirva para mandar correos. La
   versión original decía «no se manda email» apoyándose en Q14, pero Q14
   descartaba escribir a gente **sin cuenta**; quien ya la tiene es otro caso.
10. **Compartir la tuya de vuelta:** después de asociar, la tarjeta pregunta
    «¿Compartes tu lista con {nombre}?». Un toque basta, sin escribir email, porque
    la cuenta ya se conoce por el permiso recibido. Cuenta contra los mismos límites
    diarios que una invitación normal. Si tu lista está vacía se comparte igual, y la
    otra persona ve «Todavía no ha apuntado nada».
11. **La lista vive en la ficha asociada**, en una sección «La lista de {nombre}».
    Desde ahí se puede cambiar a qué ficha está asociada y dejar la lista. Si esa
    ficha se borra o el lector pierde el acceso a ella, la lista vuelve a quedar sin
    asociar y la tarjeta reaparece.
12. **El acceso se comprueba siempre contra el permiso que dio la dueña, nunca contra
    el acceso a la ficha.** Si la ficha de Laura está compartida con tu hermana, tu
    hermana no ve la lista ni sabe que existe, salvo que Laura se la comparta
    también a ella.
13. **Marcas.** «Lo regalo yo» marca un elemento; ya marcado, se lee «Lo regalas tú»
    y se puede quitar. Los demás lectores ven «Ya lo regala otra persona», sin
    nombre. Ningún lector sabe quién más lee la lista.
14. **Elemento borrado después de marcarlo:** quien lo marcó lo sigue viendo como
    «Ya no está en su lista» hasta que quita la marca. Al resto de lectores les
    desaparece. Al dueño no se le avisa de nada.
15. **Elemento editado después de marcarlo:** quien lo marcó ve «{Nombre} lo ha
    cambiado después de que lo marcaras», con un botón «Entendido» que lo quita.
16. **Del elemento marcado al historial:** «Ya se lo he regalado» abre el diálogo de
    pasar al historial que ya usan las ideas guardadas (reacción, año, notas). Como
    ocasión propone la fecha de la ficha más cercana a hoy, y se puede cambiar. A
    diferencia de las ideas guardadas, la marca no se borra: queda como «regalado»
    para que los demás lectores sigan viendo el elemento cogido. Cuando la dueña
    borra ese elemento, la marca de regalado desaparece sin mostrar «Ya no está en
    su lista».
17. **Al perder el acceso, las marcas se borran.** Da igual si el lector deja la
    lista o la dueña le quita el acceso: sus marcas desaparecen y esos elementos
    quedan libres para el resto. Lo que ya pasó a su historial se queda.
18. **Email de recordatorio:** en la tarjeta del cumpleaños de Laura se añade «Laura
    tiene N cosas en su lista que nadie ha marcado todavía», con enlace a su ficha.
    Solo aparece si N es mayor que 0. Lleva la cifra, nunca títulos. Los invitados de
    una ficha siguen sin recibir emails de ella; eso no cambia.

### Datos

19. **Tablas nuevas.** `personShares` no se toca: da permiso de edición sobre la
    ficha entera, y aquí el lector solo ve y marca.
20. **Gemini no recibe la lista.** `buildPrompt` en
    `src/app/api/recommendations/route.ts` se queda como está.
21. **Exportación de datos:** la del dueño incluye sus elementos y quién tiene
    acceso, pero ninguna marca; si las incluyera, bastaría descargarla para saber
    qué le van a regalar. La del lector incluye sus marcas y las listas que le han
    compartido.
22. **Borrar la cuenta:** si la borra el dueño, desaparece todo lo de su lista
    (elementos, accesos, marcas y las copias de la decisión 14). No se transfiere a
    nadie, a diferencia de las fichas. Si la borra un lector, se borran sus accesos y
    sus marcas, y sus fichas siguen las reglas de siempre.
23. **Topes:** 100 elementos por lista y 20 lectores por lista. Al llegar a cualquiera
    de los dos, se dice en pantalla.

### Textos de interfaz

| Dónde | Texto |
| --- | --- |
| Navegación (barra lateral y `MobileNav`) | Mi lista |
| Sección en la ficha del lector | La lista de {nombre} |
| Botón para marcar | Lo regalo yo |
| Elemento marcado por ti | Lo regalas tú |
| Elemento marcado por otro lector | Ya lo regala otra persona |
| Elemento borrado después de marcarlo | Ya no está en su lista |
| Elemento editado después de marcarlo | {Nombre} lo ha cambiado después de que lo marcaras · Entendido |
| Acción sobre un elemento marcado | Ya se lo he regalado |
| Tarjeta de lista recibida | {Nombre} te ha compartido su lista. ¿Quién es en tu libreta? · Crear ficha de {nombre} · No me interesa |
| Tarjeta, después de asociar | ¿Compartes tu lista con {nombre}? |
| Lista vacía, vista del lector | Todavía no ha apuntado nada |
| Texto fijo en «Mi lista» | Quien la lee puede marcar lo que va a regalarte. Tú no lo verás. |
| Invitar a un email sin cuenta | No hay ninguna cuenta de PickPal con ese email. Cuando esa persona se la cree, vuelve a invitarla. |
| Email de recordatorio | {Nombre} tiene N cosas en su lista que nadie ha marcado todavía (con singular para N = 1) |

El estado vacío de «Mi lista» explica para qué sirve la lista. El texto está por
redactar, en el registro de libreta de `docs/design-system.md` y sin tono de
campaña.

### Fuera de esta versión

- Invitar a quien todavía no tiene cuenta.
- Varias listas u ocasiones.
- Precio y prioridad.
- Vista previa de enlaces.
- Enviar la lista a Gemini.
- Bloquear a alguien que te comparte listas que no quieres.
- Quitar el acceso en las fichas compartidas, que sigue sin existir. Es otro
  cambio; no lo mezcles con este.

## Qué hay que construir

1. **Tres tablas.** Los nombres y campos son orientativos; las decisiones de arriba
   no lo son.
   - `listItems`: `ownerClerkUserId`, `title`, `url?`, `note?` y `editedAt` (para la
     decisión 15; la fecha de alta ya la da `_creationTime`). Índice `by_owner`.
   - `listShares`: `ownerClerkUserId`, `readerClerkUserId`, `ownerName` (ver
     trampas) y `personId?`, que es la ficha del lector a la que la ha asociado.
     Índices `by_owner`, `by_reader` y `by_owner_and_reader`.
   - `listClaims`: `ownerClerkUserId`, `readerClerkUserId`, `itemId?`,
     `status: "marked" | "given"`, `ackAt` (para la decisión 15) y `snapshot?` con
     título, enlace y nota, que se rellena cuando la dueña borra el elemento
     (decisión 14). Índices `by_item`, `by_reader` y `by_owner_and_reader`.
2. **Funciones de Convex**, con un helper de acceso propio (del estilo de
   `assertListReader`) que compruebe el permiso de `listShares` y nada más:
   - Para el dueño: crear, editar y borrar elementos, ver quién tiene acceso y
     quitarlo.
   - Para el lector: listas pendientes de asociar, asociar o cambiar de ficha, leer
     la lista de una ficha, marcar y desmarcar, «Entendido», marcar como regalado,
     dejar la lista y compartir la suya de vuelta.
3. **Ruta de invitación por email**, copiada de
   `src/app/api/people/[personId]/share/route.ts`: token de Clerk, zod, búsqueda del
   email en Clerk y errores sin revelar si algo existe. Reutiliza el bucket
   `invite_lookup` (30/día) y crea `invite_list` (20/día) en la mutation, que también
   cuenta para compartir de vuelta.
4. **Rate limit** con `checkAndIncrement` en todo lo que crea filas:
   `create_list_item` y `claim_list_item`, a 100/día cada uno, en línea con
   `create_date`.
5. **Validación** en `convex/validators.ts`, con su espejo zod en
   `src/lib/schemas.ts`: longitudes de título, enlace y nota, y enlaces solo
   `http:` o `https:`.
6. **Interfaz:**
   - Página `/mi-lista` y su entrada en `src/app/(app)/layout.tsx` y
     `src/components/layout/MobileNav.tsx`.
   - La tarjeta de lista recibida en `/agenda` y `/seres-queridos`.
   - La sección «La lista de {nombre}» en
     `src/app/(app)/seres-queridos/[personId]/page.tsx`.
   - Saca a un componente el diálogo de pasar al historial, que hoy vive dentro de
     esa página (`handleConvertToHistory`), y úsalo en los dos sitios.
7. **Logo por dominio:** una tabla de dominio → `StoreId` en `src/lib/stores.ts`
   (`amazon.es` → Amazon, etc.), que se resuelve en el cliente.
8. **Email de recordatorio:** la línea de la decisión 18 en la tarjeta de evento de
   `convex/emails.ts`.
9. **`account.deleteMyAccount` y `convex/exportData.ts`**, con las reglas de las
   decisiones 21 y 22.
10. **Legal y documentación, en el mismo cambio que el código:**
    - Apartado nuevo «Tu lista» en `/privacidad` (`src/app/privacidad/page.tsx`) y en
      `docs/privacy.md`. Tiene que contar quién la ve; que los lectores no ven quién
      más la lee; que hay marcas y el dueño no las ve, ni en la app ni en la
      exportación; que puede quitar el acceso; que si borra un elemento ya marcado,
      quien lo marcó conserva una copia hasta que quita la marca; que lo que alguien
      pasó a su historial es suyo y no se borra con tu cuenta; que no se envía a
      Gemini; y qué pasa al borrar la cuenta. La base legal es la misma que la de
      compartir fichas (contrato, art. 6.1.b).
    - `docs/security.md`: el patrón de acceso por permiso de la dueña, los datos que
      el dueño no puede ver y el tratamiento de los enlaces.
    - `docs/design-system.md`, si sale algún componente nuevo.

## Empieza por la invisibilidad de las marcas

La función se sostiene sobre una sola propiedad: el dueño nunca ve las marcas. Si
eso falla, falla sin que nadie lo note hasta que alguien descubre su regalo. Antes
de escribir ninguna pantalla, escribe los tests que lo prueban:

- ninguna query que devuelve elementos al dueño lleva rastro de marcas, ni siquiera
  un contador;
- la exportación del dueño tampoco;
- un lector no puede saber quién más tiene acceso.

Construye las queries del dueño leyendo solo `listItems`, sin cruzar nunca con
`listClaims`.

## Trampas de este repo que te ahorran una tarde

- **CI no corre el linter ni `next build`.** Antes de dar nada por bueno:
  `npm test`, `npx tsc --noEmit`, **`npx tsc -p convex/tsconfig.json --noEmit`** y
  `npm run lint`. El segundo typecheck no es redundante: Convex tiene su propio
  tsconfig y hay errores que pasan vitest y rompen el deploy en Vercel.
- **Los tests de Convex necesitan el runtime de edge.** Cada archivo abre con:
  ```ts
  /// <reference types="vite/client" />
  // @vitest-environment edge-runtime
  ```
  `convex/sharing.test.ts` es el modelo más cercano a lo que vas a probar.
- **Antes de cualquier cambio de schema, `npx convex dev --once`.**
- **`convex/exportData.ts` recorre las mismas tablas que `deleteMyAccount`**, y
  `exportData.test.ts` falla si añades una tabla a uno y no al otro. Aquí además
  cada tabla nueva tiene dos dueños posibles (el de la lista y el lector), y la
  exportación del dueño no puede incluir `listClaims`. Lee la decisión 21 antes de
  copiar el patrón.
- **Convex no guarda nombres de usuario.** `requireUser` devuelve solo
  `identity.subject` y `settings.ts` lee `identity.email`; nadie lee el nombre. La
  tarjeta «{Nombre} te ha compartido su lista» lo necesita. Comprueba si el JWT de
  Clerk para Convex trae `givenName`. Si no lo trae, guarda el nombre en
  `listShares.ownerName` desde la ruta de invitación, que sí tiene acceso a Clerk.
  Compartir de vuelta tiene el mismo problema y no pasa por esa ruta.
- **Un lector pierde el acceso a una ficha por varios caminos:** `people.remove`,
  `personShares.leave` y la transferencia al borrar una cuenta. No los enganches uno
  a uno. Trata la asociación como inválida en lectura si `personHasAccess` falla
  para esa ficha, y la decisión 11 se cumple sola.
- **Los enlaces vienen del usuario.** Rechaza en el servidor todo lo que no sea
  `http:` o `https:` (un `javascript:` en un `href` es XSS) y ábrelos con
  `target="_blank" rel="noopener noreferrer nofollow"`.
- **Las páginas legales se verifican contra el código, no se redactan sueltas.** En
  una auditoría anterior las discrepancias graves eran textos perfectamente
  plausibles que el código contradecía. Comprueba cada afirmación del apartado
  nuevo contra lo que has construido, sobre todo la copia de la decisión 14 y las
  entradas de historial que sobreviven a la cuenta del dueño.
- **Los mensajes de commit van en inglés.**

## Hecho significa

- Los cuatro comandos de arriba en verde.
- Tests nuevos, como mínimo, para:
  - **El dueño:** sin rastro de marcas en ninguna query ni en la exportación.
  - **Lectores y terceros:**
    - un lector ve la lista y un tercero no;
    - un invitado de la ficha asociada que no tiene permiso de la dueña no la ve;
    - un lector no sabe quién más la lee;
    - la marca de otro lector aparece sin identidad.
  - **Perder el acceso:**
    - quitar el acceso borra el permiso y las marcas;
    - dejar la lista hace lo mismo.
  - **Marcas en elementos que cambian:**
    - un elemento marcado y luego borrado solo lo sigue viendo quien lo marcó;
    - el aviso de edición sale tras editar y se va con «Entendido»;
    - una marca de regalado sigue bloqueando el elemento para los demás.
  - **Los topes:** 100 elementos y 20 lectores.
  - **Borrar la cuenta:** la del dueño se lleva todo lo de su lista; la del lector,
    sus permisos y marcas.
- `docs/dudas.md` con una entrada nueva en «Resueltas» que cuente lo que se
  construyó de verdad y las decisiones de implementación que este encargo no fijaba.
- `/privacidad` y `docs/privacy.md` movidos en el mismo cambio que el código.

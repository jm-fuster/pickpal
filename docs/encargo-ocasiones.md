# Encargo: ordenar las ideas guardadas por ocasión

Pásale esto a quien vaya a implementarlo. Es autosuficiente: no hace falta la
conversación en la que se decidió (10-oct-2026).

---

Implementa **ideas guardadas agrupadas por ocasión** en la ficha de cada persona
(Next 16 + Convex + Clerk). El diseño ya está decidido; no lo rediscutas. Si algo
de aquí choca con el código, para y pregunta antes de inventar una tercera vía.

**Lee primero, en este orden:**

1. `AGENTS.md`: reglas del proyecto. Antes de tocar Convex, lee
   `convex/_generated/ai/guidelines.md`.
2. `docs/security.md`, sobre todo §2 (comprobar el acceso), §3 (validación) y §4
   (rate limit).
3. `docs/ia-regalos.md`, el flujo de guardar y descartar ideas desde el
   generador. Está entre las líneas 105 y 165.
4. `docs/design-system.md` antes de tocar la interfaz, en especial la «Variante
   en lista (Ideas guardadas)» y `AddToHistoryDialog`.

**El caso de uso:** tienes 14 ideas guardadas para tu madre. Unas salieron al
generar para su cumpleaños y otras para Navidad, pero la tarjeta «Ideas
guardadas» las enseña todas en una sola lista, la más nueva arriba, con la
ocasión en letra pequeña. Quieres ver de un vistazo qué tienes para cada momento
y pasar a Navidad la que encaja mejor allí.

## Lo que ya hay

- **Las ocasiones ya existen: son los eventos de la ficha** (`importantDates`).
  Cada evento tiene nombre libre, día y mes, puede ser anual o único y lleva
  presupuesto. Para generar ideas hay que elegir uno.
- **Cada idea guardada ya sabe para qué evento se generó**, pero solo como copia
  de su nombre (`savedIdeas.occasionLabel`). No hay ningún vínculo con el evento.
- **Por eso renombrar un evento rompe sus ideas.** `importantDates.update`
  migra las tandas generadas del usuario que renombra, pero no toca
  `savedIdeas`. Las ideas se quedan con el nombre viejo. Borrar un evento
  tampoco las toca.
- **La tarjeta «Ideas guardadas»** está en
  `src/app/(app)/seres-queridos/[personId]/page.tsx`. Muestra una rejilla plana
  (más nueva primero, tope de 200) y cada idea lleva «{ocasión} · {precio}», el
  botón «Lo regalé» y una X para quitarla. No hay menú de acciones.
- **«Lo regalé»** crea la entrada del historial y borra la idea guardada.
- **El generador** (`src/components/gifts/GiftsPanel.tsx`) considera que una
  idea está duplicada si coinciden persona, ocasión y título, tanto en el
  servidor (`savedIdeas.save`) como en el pulgar relleno (`persistedSavedTitles`).
  Descartar con el pulgar abajo una idea ya guardada también la borra de la
  ficha (`discardSavedIdea`).

## Decisiones

### Qué es una ocasión

1. **Una ocasión es un evento de la ficha.** No hay concepto nuevo ni carpetas
   sin fecha. Para tener una ocasión nueva, se añade un evento con «Añadir
   evento».
2. **Las ocasiones son de cada persona.** La Navidad de tu madre y la de tu
   padre son dos eventos distintos, como ya ocurre hoy.
3. **Cada idea está en un solo sitio:** en un evento o en «Sin ocasión».
   Clasificarla es moverla.
4. **La idea apunta al evento, no a una copia de su nombre.** Renombrar un
   evento deja de romper nada. `occasionLabel` se queda en la tabla como foto
   del nombre en el momento de guardar: se sigue escribiendo al guardar, pero
   ninguna pantalla lo lee y mover una idea no lo actualiza.
5. **Los eventos anuales se repiten y nada caduca.** Las ideas que no regalas
   este año siguen en su ocasión el año que viene.
6. **En una ficha compartida, mover una idea la mueve para todos.** La ocasión
   es una propiedad de la idea, y las ideas guardadas ya se comparten con los
   invitados de la ficha, que pueden verlas y borrarlas.

### La tarjeta «Ideas guardadas»

7. **Solo aparecen las ocasiones que tienen ideas.** Los eventos sin ideas
   siguen donde están, en la sección «Eventos». La ficha no lista los mismos
   eventos dos veces.
8. **Orden de los grupos:**
   - Primero los eventos que aún van a llegar, del más cercano al más lejano,
     según `computeDaysUntil` de `src/lib/dates.ts`. Si dos caen el mismo día,
     se ordenan por nombre.
   - Después los eventos únicos que ya pasaron (decisión 11).
   - Por último, «Sin ocasión».

   Dentro de cada grupo, la idea más nueva primero, como hoy.
9. **Cabecera de cada grupo:** nombre del evento y fecha. La línea de cada idea
   pasa de «{ocasión} · {precio}» a solo el precio, porque la ocasión ya está
   en la cabecera.
10. **Mover una idea:** cada idea tiene un menú de acciones con «Mover a otra
    ocasión». Abre la lista de los eventos de esa persona, con su fecha, más
    «Sin ocasión». El sitio donde ya está la idea no se ofrece. Se mueve de una
    en una: sin selección múltiple, sin arrastrar y sin crear eventos desde el
    menú. Si la persona solo tiene un evento, el menú ofrece ese evento o «Sin
    ocasión», según dónde esté la idea.

    La X de quitar entra en ese mismo menú. Un menú con una sola opción no tiene
    sentido, y quitar es la acción destructiva, así que conviene que quede un
    paso más lejos que «Lo regalé».
11. **Eventos únicos que ya pasaron:** el grupo se queda, después de los
    próximos y antes de «Sin ocasión», con la marca «Ya pasó». Nada se mueve
    solo; quien usa la ficha decide si mueve o quita esas ideas.
12. **Borrar un evento con ideas las pasa a «Sin ocasión».** Hoy «Quitar
    evento» borra sin confirmar. Si el evento tiene ideas, ahora pide
    confirmación y dice cuántas pasarán a «Sin ocasión». Sin ideas, se queda
    como está.
13. **«Lo regalé» en una idea sin ocasión** pregunta la ocasión, igual que la
    lista: `AddToHistoryDialog` sin `fixedOccasion` y con
    `defaultOccasion={closestOccasionLabel(dates)}`. En una idea con ocasión,
    la ocasión fija es el nombre **actual** del evento, no `occasionLabel`.

### El generador

14. **La misma persona y el mismo título son la misma idea, sea cual sea la
    ocasión.**
    - El pulgar arriba sobre una idea ya guardada en otra ocasión no la duplica
      ni la mueve. La idea aparece como «Ya guardada en {ocasión}».
    - El pulgar abajo sobre esa idea la descarta de la tanda y no toca la
      guardada. Solo borra la idea guardada si está en la ocasión que tienes
      seleccionada, que es lo que ya hace hoy.
    - El generador nunca mueve ni borra lo guardado en otra ocasión. Mover solo
      se hace desde la tarjeta.
15. **Guardar desde el generador** mete la idea en el evento elegido en «¿Para
    qué ocasión?», como hoy.

### Palabras

16. **«Ocasión» en la tarjeta de ideas y en el generador; «evento» en la sección
    «Eventos».** Es como ya habla la portada: «sus eventos, cada ocasión con su
    presupuesto». El evento es la fecha y la ocasión es lo que esa fecha
    significa a la hora de regalar.

### Textos de interfaz

| Dónde | Texto |
| --- | --- |
| Cabecera de grupo | {Evento} · {d mmm}, con el año si es único: «Cumpleaños · 14 mar», «Boda · 8 oct 2026» |
| Marca de evento único pasado | Ya pasó |
| Grupo sin evento | Sin ocasión |
| Acción del menú de la idea | Mover a otra ocasión |
| Destino sin evento | Sin ocasión |
| Aviso tras mover | Idea movida a {ocasión} |
| Pulgar sobre una idea guardada en otra ocasión | Ya guardada en {ocasión} (o «Ya guardada» si está en «Sin ocasión») |
| Confirmar «Quitar evento» con ideas | ¿Quitar {evento}? · Sus N ideas guardadas pasarán a «Sin ocasión». (en singular si N = 1) · Quitar evento · Cancelar |

### Fuera de esta versión

- **La vista de una ocasión para toda la familia** («Navidad: para quién tengo
  idea y para quién no»). Es el siguiente paso natural. Funcionará agrupando
  eventos con el mismo nombre en distintas fichas, con la misma normalización
  que ya usa `importantDates` (mayúsculas y espacios).
- **Las cosas de «Mi lista» dentro de las ocasiones.** No son de quien lee:
  la dueña las edita y las borra en directo, y solo las ve el lector que asoció
  la lista. Colocarlas exigiría una capa privada por lector. La lista sigue en
  su bloque «La lista de {nombre}».
- **Una línea en el email de recordatorio** («Tienes 3 ideas guardadas para su
  cumple»). Sería la primera mejora después de esta.
- Carpetas u ocasiones sin fecha.
- Selección múltiple y arrastrar.
- Crear eventos desde el menú de mover.

## Qué hay que construir

Los nombres de campos y funciones son orientativos; las decisiones de arriba no
lo son.

1. **Esquema.** `savedIdeas.importantDateId: v.optional(v.id("importantDates"))`,
   donde vacío significa «Sin ocasión». Añade el índice `by_important_date` para
   que borrar un evento encuentre sus ideas sin recorrer la ficha.
   `occasionLabel` sigue obligatorio; actualiza el comentario del schema para
   decir que es una foto y que nadie lo lee (decisión 4).
2. **Migración**, como `internalMutation` en `convex/migrations.ts` y siguiendo
   el estilo de las que ya hay. Para cada idea sin `importantDateId`, busca entre
   los eventos de su persona el que tenga el mismo nombre normalizado
   (`trim().toLowerCase()`, la misma regla que `normalizeLabel` en
   `convex/importantDates.ts`):
   - si coincide uno, lo vincula;
   - si no coincide ninguno, la deja en «Sin ocasión»;
   - si coinciden dos (puede haber duplicados heredados de antes de la regla de
     unicidad), la deja en «Sin ocasión» y la cuenta aparte.

   Tiene que ser idempotente y devolver los contadores: vinculadas, sin evento,
   ambiguas, y cuántas parejas de persona y título están repetidas. Las
   repetidas no se fusionan; si en producción aparece alguna, se decide con el
   número delante. Se ejecuta primero en dev y luego con `--prod`.
3. **`savedIdeas.save`** recibe `importantDateId`, porque el selector del
   generador ya tiene los eventos. Comprueba que el evento es de la misma
   persona (punto 4) y sigue escribiendo `occasionLabel` con el nombre del
   evento. La comprobación de duplicados pasa a ser persona y título; si ya
   existe, devuelve la que hay y no consume cuota, como ahora.
4. **`savedIdeas.move({ id, importantDateId })`**, donde `null` significa «Sin
   ocasión». `requireUser`, después `assertPersonAccess` sobre `entry.personId`
   y después comprobar que `date.personId === entry.personId`. Si la idea o el
   evento no existen, o son de otra persona, el error es el mismo `ConvexError`.
   Tener acceso a las dos fichas no basta: si no se compara la persona, una
   idea de tu madre podría acabar en un evento de tu padre. No lleva rate limit
   (§4: las actualizaciones están exentas).
5. **`importantDates.remove`** quita el `importantDateId` de las ideas del
   evento antes de borrarlo. Renombrar no necesita nada nuevo para las ideas, y
   `migrateRecommendationLabel` se queda como está.
6. **Una función pura que agrupa y ordena** (`savedIdeas` + `importantDates` +
   hoy → grupos en el orden de la decisión 8), en `src/lib/` y con tests al lado,
   como `dates.test.ts`. La tarjeta solo pinta lo que devuelve.
7. **Ficha** (`src/app/(app)/seres-queridos/[personId]/page.tsx`):
   - la tarjeta agrupada (decisiones 7, 8, 9 y 11);
   - el menú de cada idea (decisión 10). En `src/components/ui/` no hay
     `dropdown-menu`, pero sí `popover` y `sheet`. Elige con
     `docs/design-system.md` delante y piensa en móvil;
   - la confirmación de «Quitar evento» (decisión 12);
   - `AddToHistoryDialog` según la decisión 13.
8. **Generador** (`GiftsPanel.tsx`): `persistedSavedTitles` deja de filtrar por
   ocasión y pasa a saber dónde está guardada cada idea, para pintar «Ya guardada
   en {ocasión}». `discardSavedIdea` solo borra si la idea está en la ocasión
   seleccionada. El descarte sigue diferido al cierre del aviso, como ahora.
9. **Documentación, en el mismo commit que el código:**
   - `docs/design-system.md`: la variante en lista de «Ideas guardadas» (grupos,
     cabecera, menú y «Ya pasó»), más su entrada en el registro.
   - `docs/ia-regalos.md`: el descarte (hacia la línea 112), la sección de la
     ficha (hacia la 158) y la lista de pruebas manuales (474-482).
   - `docs/security.md` §2: la regla del punto 4. Cuando una mutation enlaza dos
     filas que cuelgan de `people`, comprueba que son de la misma persona; el
     acceso a las dos fichas no basta.
   - `docs/dudas.md`: entrada en «Resueltas» con lo que se construyó de verdad,
     los contadores de la migración en producción y las decisiones de
     implementación que este encargo no fijaba.
10. **Legal:** no hay datos nuevos ni destinatarios nuevos, así que en principio
    `/privacidad` no cambia. Compruébalo de todos modos: busca lo que dice de
    las ideas guardadas y confirma que nada lo contradice.

`deleteMyAccount` y `deletePersonCascade` no cambian, porque no hay tablas
nuevas. La exportación (`convex/exportData.ts`) sí cambia un poco. `limpiar`
quita el `_id` de los eventos, así que un `importantDateId` exportado sería un
identificador que no lleva a ninguna parte. Cambia ese campo por el nombre
actual del evento, o «Sin ocasión», en `ideasGuardadas`. `occasionLabel` puede
salir tal cual, como foto del nombre al guardar. El test de paridad entre
exportación y borrado tiene que seguir en verde.

## Empieza por el vínculo y la migración

Es lo único que toca datos que ya existen en producción. Si el emparejamiento
por nombre falla, las ideas de la gente aparecen en «Sin ocasión» y nadie sabe
por qué. Antes de escribir ninguna pantalla:

1. Escribe los tests del emparejamiento: coincidencia exacta, distinta en
   mayúsculas o espacios, sin evento y ambigua.
2. Escribe los tests de `move`, empezando por el evento de otra persona.
3. Ejecuta la migración en dev y mira los contadores.

**Orden de despliegue.** Se trabaja sobre `main` y cada push despliega, así que
hacen falta dos:

1. Primer push: el campo opcional, el índice, `save` escribiendo el vínculo y la
   migración. La tarjeta sigue como hoy.
2. Ejecuta la migración con `--prod` y apunta los contadores.
3. Segundo push: la tarjeta agrupada, `move`, el borrado de eventos y el
   generador.

Si se hace en un solo push, entre el despliegue y la migración todas las ideas
viejas aparecen en «Sin ocasión».

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
  `convex/sharing.test.ts` es el modelo más cercano: ya prueba ideas guardadas
  en fichas compartidas.
- **Antes de cualquier cambio de schema, `npx convex dev --once`.**
- **Las tandas generadas siguen indexadas por nombre del evento**
  (`by_user_person_occasion_type`). No las pases a id en este cambio. El
  generador sigue eligiendo la ocasión por nombre; lo único nuevo es que, al
  guardar, resuelve el id del evento elegido.
- **El conjunto local `savedTitles` del generador** se vacía al cambiar de
  ocasión (comentario hacia la línea 395 de `GiftsPanel.tsx`). Con la decisión
  14 la clave pasa a ser solo el título; revisa si ese vaciado sigue haciendo
  falta antes de quitarlo.
- **`importantDates.getByPersonAndLabel` compara el nombre exacto**, sin
  normalizar. No lo reutilices para la migración.
- **Los mensajes de commit van en inglés.**

## Hecho significa

- Los cuatro comandos de arriba en verde.
- Tests nuevos, como mínimo, para:
  - **La migración:** vincula por nombre exacto y por nombre normalizado; deja en
    «Sin ocasión» las ideas sin evento y las ambiguas; ejecutarla dos veces no
    cambia nada.
  - **Mover:**
    - el dueño y un invitado pueden mover;
    - un tercero no;
    - un evento de otra persona se rechaza, aunque quien mueve tenga acceso a
      las dos fichas;
    - `null` deja la idea en «Sin ocasión».
  - **Guardar:** la misma idea guardada desde otra ocasión no crea una fila
    nueva ni consume cuota.
  - **Borrar un evento:** sus ideas quedan en «Sin ocasión» y las de otros
    eventos no se tocan.
  - **Agrupar:** orden por próxima fecha, empates por nombre, únicos pasados
    después de los próximos, «Sin ocasión» al final y la más nueva primero
    dentro de cada grupo.
  - **Exportar:** cada idea guardada sale con el nombre actual de su ocasión, o
    «Sin ocasión».
- La migración ejecutada en producción y sus contadores en `docs/dudas.md`.
- La documentación del punto 9 movida en el mismo commit que el código.

La pantalla de la ficha en Figma se actualiza después, en una pasada aparte. No
forma parte de este cambio.

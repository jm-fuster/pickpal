# Encargo: listas que lleva un adulto para un niño

Propuesta del 12-oct-2026. **Decidida el mismo día:** Jorge eligió la opción
A con las respuestas recomendadas a las decisiones 2 a 9 (ver «Decisiones que
solo puede tomar Jorge»). Lo que se construyó de verdad está en
[`dudas.md`](dudas.md); los textos legales, en `/privacidad` («Listas que llevas
para otra persona» y «Menores»), `/terminos` y `privacy.md` §2.6, §3 y §10.

La decisión 8 pedía releer la sección de edad de los términos de la Gemini API.
Hecho el 12-oct-2026 a petición de Jorge: no pide cambiar nada, con una condición
de comunicación (no presentar PickPal como una app para niños). El detalle está
en `privacy.md` §4.1.

**Lee antes:** `encargo-lista.md` entero, con los anexos; `privacy.md` §2.6, §7
y §10; `security.md` §7 y §11; y `listItems`, `listShares`, `listClaims` y
`listAbout` en `convex/schema.ts`.

## El caso de uso

Marta tiene dos hijos, Lucía (7) y Pablo (4). En noviembre empieza a apuntar lo
que piden para Reyes: lo que dicen en la cena, lo que señalan en el catálogo.
Quiere una lista por niño y compartir cada una con los abuelos y con los tíos,
que tienen cuenta en PickPal. Cada uno marca lo que va a regalar. Los niños no
ven nada, porque no tienen cuenta. Marta tampoco necesita saber quién regala qué,
pero sí lo que ya está cogido, porque ella también compra: los Reyes son ella.

Lo mismo sirve para el cumpleaños de Lucía en mayo y para la Primera Comunión de
Pablo dentro de unos años. La lista es de Lucía; la ocasión cambia.

**En el mercado.** En la App Store española, Wishbob ofrece listas por ocasión,
con Reyes y cumpleaños infantiles entre ellas, y sus reseñas citan las Primeras
Comuniones y valoran tener una lista por ocasión. wishlist.com deja tener varios
perfiles en una cuenta, por ejemplo uno por hijo, cada uno con sus listas. Son
dos maneras de resolverlo: por ocasión o por persona.

## Con qué choca

### 1. Una lista por usuario: el dueño es la lista

Decisión 1. En el schema no hay tabla de listas: `listItems`, `listShares`,
`listClaims` y `listAbout` cuelgan de `ownerClerkUserId`, y `listShares` tiene
como mucho una fila por pareja dueño-lector (`by_owner_and_reader`). Marta no
puede tener tres listas, ni la abuela puede leer la de Marta y la de Lucía por
separado. `listInviteEmails` limita el correo a uno cada 30 días por pareja, así
que la invitación a la segunda lista no avisaría.

### 2. La edad mínima es 18

PickPal es solo para mayores de 18 (`privacy.md` §10), por los términos de la
Gemini API. Lucía no tendrá cuenta nunca, y no hay que buscar la forma de que la
tenga. Eso convierte su lista en algo distinto de «Mi lista»:

- **Los datos son de un tercero, no del usuario.** `privacy.md` §2.6 dice que en
  «Mi lista» los datos son del propio usuario y que la base es el contrato
  (art. 6.1.b). La lista de Lucía guarda datos de Lucía que mete Marta. Encaja en
  §7: para Marta es actividad doméstica (art. 2.2.c) y PickPal es responsable,
  con base en el interés legítimo (art. 6.1.f). Ese artículo pide pesar más los
  intereses del interesado «en particular cuando el interesado sea un niño», y el
  considerando 38 da a los niños protección específica. Hay que justificarlo por
  escrito, no solo nombrarlo.
- **No es consentimiento del menor.** El art. 8 RGPD y el art. 7 LOPDGDD
  regulan el consentimiento de un menor a un servicio que usa él. Lucía ni usa
  PickPal ni da consentimiento a nada. No se aplican, y `/privacidad` no debe
  dar a entender que sí.
- **Sus derechos los ejerce quien la representa.** Los padres con patria
  potestad tienen la representación legal de los hijos menores (art. 162 del
  Código Civil). Pero quien lleva la lista puede no ser madre ni padre: una tía
  puede llevar la de su sobrino. PickPal no lo comprueba, igual que no comprueba
  la relación con nadie de quien se hace una ficha (términos §5).
- **Información (art. 14).** A Lucía no se le puede informar. `/privacidad`
  necesita un párrafo para madres, padres y tutores: qué se guarda, quién lo ve,
  con qué base, y cómo pedir el borrado escribiendo a la dirección de contacto.
- **Una ocasión puede ser un dato del art. 9.** «Primera Comunión de Pablo»
  revela convicciones religiosas de un menor. Si la lista tiene un campo de
  ocasión, PickPal guarda ese dato de forma estructurada. Un título libre puede
  decirlo igual, pero ya no es un campo que hayamos pedido.

### 3. Quién es «el dueño» que no ve las marcas

Decisión 7: el dueño no ve las marcas, ni un contador. Sirve para que Laura no
descubra su regalo. En la lista de Lucía la sorpresa es para Lucía, que no entra
en la app, y quien gestiona la lista es también quien más regala. Aplicada tal
cual, la regla deja a Marta a ciegas: puede comprar lo mismo que la abuela y no
tiene forma de evitarlo, porque hoy el dueño no puede marcar su propia lista.

El riesgo que sí existe es la pantalla de Marta: Lucía mira el móvil de su
madre. «Ya lo regala la abuela» rompería los Reyes; «Cogido» casi nunca.

Hay un segundo efecto: si Marta ve qué está cogido y la lista la lee una sola
persona, sabe quién lo ha cogido. Para una lista de un niño eso no es grave,
pero los lectores tienen que saberlo antes de marcar.

### 4. Gemini

La lista no va a Gemini (decisión 20) y eso no cambia. Lo que sí puede ir es la
ficha de Lucía: si la abuela crea en su libreta la ficha de Lucía y pide ideas,
`buildPrompt` envía la ficha entera, con notas, alergias e historial, incluidos
los títulos que pasó a su historial con «Ya se lo he regalado». Eso ya es
posible hoy con cualquier ficha de un niño; la función lo hace más frecuente.

Dos cosas que hay que mirar antes de construir:

- La edad mínima de PickPal descansa en la sección de edad de los términos de
  la Gemini API (`privacy.md` §4.1). Quien la relea con esta función delante es
  Jorge; este documento no la interpreta.
- Gemini no recibe la edad (`privacy.md` §4.1). Para un niño la edad es casi
  todo, y lo previsible es que la gente la escriba en las notas, que sí se
  envían. Mandar la edad es otra decisión, que no entra aquí.

### 5. Topes

20 lectores y 100 elementos por lista bastan para un niño. Lo que falta es un
tope de cuántas listas lleva un adulto. Los cubos diarios (`create_list_item`,
`invite_list`, `import_list`) son por usuario: Marta los compartiría entre su
lista y las de sus hijos. Con los números de hoy no molesta.

### 6. Exportación y borrado de cuenta

¿De quién es la lista de Lucía? Los datos son de Lucía; la cuenta, de Marta.

- **Exportación.** Marta la pide para sí y para ejercer los derechos de Lucía,
  así que su exportación lleva las listas que lleva, con elementos y lectores.
  Las marcas no, por el mismo motivo que hoy (art. 15.4): son de quien marca.
- **Borrado.** Decisión 22: la lista se borra entera y no pasa a nadie. Si Marta
  borra su cuenta en diciembre, los abuelos pierden la lista de Lucía antes de
  Reyes. Transferirla al otro progenitor obligaría a saber quién es, y PickPal
  no lo sabe.
- **Petición de un tercero.** Si el padre de Lucía escribe pidiendo que se
  borre, hay que poder encontrarla. El nombre que puso Marta es texto libre; se
  localiza por la cuenta de Marta y el nombre, como hoy se localiza una ficha.

### 7. Los correos

- **Invitación.** Hoy dice que {dueño} te ha compartido su lista. Para Lucía
  diría «la lista de Lucía», y eso manda a Resend el nombre de un menor. Con una
  invitación por pareja cada 30 días, la segunda lista ni siquiera avisa.
- **Recordatorio de la fecha** (decisión 18). Funciona solo: si la abuela guarda
  la lista de Lucía en su ficha de Lucía, la tarjeta de los Reyes de Lucía lleva
  las dos cifras, sin títulos. No hay que tocarlo, salvo que cada ficha pueda
  tener más de una lista.

### 8. La fase 3 de «Mi lista»

La fase 3 (12-oct-2026, anexo en `docs/encargo-lista.md`) añadió foto por
elemento (`listItems.photoStorageId`), cumpleaños del dueño en `listAbout` (día
y mes, sin año) y bloqueos de lector a dueño (`listBlocks`). En una lista a
cargo:

- la foto tiene que ser de la cosa, no del niño, y la pantalla de subirla lo
  dice;
- el cumpleaños sería el del niño, sin año, y va en la fila de `listAbout` de
  esa lista, no en la de quien la lleva;
- un bloqueo es por dueño, así que bloquear a Marta bloquea también las listas
  que lleva. Es lo esperable.

## Opciones

### A. Listas a cargo

Marta lleva, además de la suya, listas para quien no tiene cuenta. Cada una
tiene un «para quién» (nombre de pila) y se comparte por separado.

**Datos.**

- Tabla nueva `managedLists`: `managerClerkUserId`, `forName` (nombre de pila,
  corto) y `personId?`, la ficha de Marta en la que la ve, si la tiene. Esa
  ficha solo sirve para mostrarla allí; nunca da acceso a nadie.
- Campo opcional `managedListId?` en `listItems`, `listShares`, `listClaims` y
  `listAbout`. Vacío significa la lista propia del dueño, así que los datos de
  hoy no se migran. `ownerClerkUserId` sigue siendo Marta, para que borrar y
  exportar sigan yendo por el mismo índice.
- Índices compuestos (dueño + lista) en las cuatro tablas. **Toda lectura que
  hoy va por `by_owner` tiene que pasar a ellos.** Si se olvida una, los
  elementos de Lucía salen en la lista de Marta o al revés, y ningún test actual
  lo detecta.

**Quién ve qué.**

| Quién | Qué ve |
| --- | --- |
| Marta (lleva la lista) | Los elementos y los lectores de cada lista. Si se decide así (decisión 2), qué está cogido, como «Cogido», nunca quién, y puede marcar ella. Nada en la Agenda ni en la campana. |
| Abuela, tíos | La tarjeta «Marta te ha compartido la lista de Lucía», con «Crear ficha de Lucía». Dentro, la lista como hoy, con una línea fija si Marta ve lo cogido. |
| Un invitado de la ficha de Lucía | Nada, como hoy (decisión 12). |
| Lucía | Nada. No tiene cuenta. |

**Invariantes en riesgo.**

- «Ninguna query del dueño cruza con `listClaims`» (`security.md` §11) pasa a
  tener una excepción, solo para listas a cargo y solo con el estado cogido o
  libre. La lista propia sigue igual, y su test sigue intacto.
- El aislamiento entre listas del mismo dueño: es nuevo y hay que probarlo.
- El correo por pareja: decide si la segunda lista avisa.

**Esfuerzo: L.** `convex/lists.ts` entero pasa a recibir una lista, también
«Pegar una lista» y el botón de la tienda, que preguntan a qué lista apuntar.
Además: una página por lista, la tarjeta de lista recibida, exportación,
borrado, correos y páginas legales.

**Páginas legales.**

- Un apartado nuevo en `/privacidad` y `privacy.md` §2.6, «Listas que llevas
  para otra persona», que diga: que son datos de esa persona; la base (6.1.f),
  con la ponderación a favor del niño; que el niño no tiene cuenta ni entra;
  quién ve qué, incluido lo que ve quien la lleva; que no va a Gemini; qué pasa
  al borrar la cuenta; y cómo pide el borrado un tutor.
- Una fila en la tabla de bases de `privacy.md` §3.
- Una frase en «Menores»: PickPal sigue siendo solo para mayores de 18, aunque
  se pueda llevar la lista de un niño.
- En `/terminos` §5, que solo se lleve la lista de alguien con quien se tiene
  relación personal y, si es menor, con quien lo cuida.

### B. La lista cuelga de una ficha

La lista de Lucía es una sección de la ficha de Lucía en la libreta de Marta.

**Datos.** `personId?` en `listItems` (la ficha de origen) y un segundo campo en
`listShares`, porque `personId` ya significa la ficha del lector. Quien gestiona
la lista es quien tiene acceso a la ficha: Marta y los invitados de
`personShares`.

**Quién ve qué.** Como en A para los lectores. Lo distinto es la gestión: si
Marta compartió la ficha de Lucía con el padre, él también la gestiona. Si la
compartió con la abuela, que es lo habitual en una familia, la abuela pasa a ser
gestora y no lectora.

**Invariantes en riesgo.**

- La decisión 12 se invierte: el acceso para gestionar sale de la ficha.
- Quien gestiona no puede marcar, así que la abuela con la ficha compartida no
  podría decir qué regala.
- La decisión 22 se rompe: al borrar la cuenta la ficha pasa al invitado más
  antiguo (`privacy.md` §2.5), y la lista con ella.
- La decisión 20 queda a un paso: la lista vive en la misma ficha que
  `buildPrompt` envía entera. Basta que alguien la añada al prompt «porque está
  en la ficha».
- La vista del lector tiene que esconder todos los campos de la ficha de
  origen: notas, alergias, tallas.

**Esfuerzo: L,** con más superficie de error que A, porque mezcla dos modelos de
acceso.

**Páginas legales.** Lo de A, más explicar que compartir la ficha de un niño
comparte también la gestión de su lista, y que la lista pasa con la ficha si
se borra la cuenta.

### C. No hacer nada

No hay listas para otros. Si alguien pregunta, se le dice que la lleve fuera,
en un chat de familia o en una nota del móvil.

La alternativa dentro de PickPal sería apuntar la lista en las notas de la
ficha de Lucía y compartir la ficha. No hay que recomendarla:

- las notas se envían íntegras a Gemini (`privacy.md` §4.1), así que la lista de
  un niño acabaría en el prompt;
- no hay marcas, así que no evita los regalos repetidos, que es para lo que
  sirve la lista;
- compartir una ficha da acceso de edición a todo, alergias incluidas.

Las ideas guardadas tampoco sirven: solo se crean desde el generador.

**Quién ve qué.** Nada cambia. **Invariantes en riesgo:** ninguno. **Esfuerzo:
S,** una entrada en «Decididas, no pendientes» de `docs/dudas.md`. **Páginas
legales:** nada.

## Recomendación

**A, con quien lleva la lista viendo lo cogido sin saber quién.** B invierte la
decisión 12, rompe la 22 y deja la 20 a un paso, para ahorrarse una tabla. C deja a la
gente con un apaño que no evita lo único que la lista promete, que es no
regalar lo mismo dos veces.

A no pregunta la edad ni se limita a niños: sirve para cualquiera sin cuenta,
como un abuelo sin móvil. Así no hay que guardar ningún dato de edad. Los
textos legales hablan de menores porque serán el caso principal.

Calendario: los Reyes son el 6 de enero y la gente empieza las listas en
noviembre. Si A no puede estar probada a primeros de diciembre, mejor C estas
Navidades y A para los cumpleaños y las Comuniones de primavera, que una
versión a medias con la invisibilidad de las marcas sin probar.

## Decisiones que solo puede tomar Jorge

1. **¿Se construye?** Recomendado: A. Coste: tamaño L, y el modelo de «Mi lista»
   deja de ser «el dueño es la lista». Toda función futura de listas tendrá que
   decir a qué lista se refiere.
2. **¿Quien lleva la lista ve lo cogido?** Recomendado: sí, como «Cogido», sin
   quién, y puede marcar. Los lectores lo leen en una línea fija: «Marta lleva
   esta lista. Ve qué está cogido, no quién lo regala». Coste: la primera
   excepción a «el dueño no toca `listClaims`», con sus propios tests, y con un
   solo lector Marta sabe quién ha sido.
3. **¿Una lista por persona o por ocasión?** Recomendado: por persona, sin campo
   de ocasión. Coste: no hay «Reyes de Lucía» y «Cumpleaños de Lucía» por
   separado, se limpia con «Ya lo tengo». A cambio no se guarda «Comunión» como
   campo (art. 9) y no se multiplican las listas.
4. **¿Cuántas listas a cargo por adulto?** Recomendado: 5, con el aviso de tope
   como en la decisión 23. Coste: una familia numerosa con sobrinos se queda
   corta.
5. **¿Pueden llevarla dos adultos?** Recomendado: no. Una persona la lleva; el
   otro progenitor es lector, marca y le dice a quien la lleva lo que hay que
   apuntar. Coste: el otro no puede añadir nada, y si cada progenitor hace la
   suya, los abuelos reciben dos listas de Lucía.
6. **Al borrar la cuenta de quien la lleva, ¿se borra?** Recomendado: sí, sin
   transferir, como la decisión 22. Coste: los lectores la pierden sin aviso,
   aunque lo que pasaron a su historial se queda.
7. **¿Qué dice el correo de invitación?** Recomendado: «Marta te ha compartido
   una lista en PickPal», sin el nombre del niño, con el límite de uno cada 30
   días por pareja tal cual, aunque sean varias listas. Coste: el correo dice
   menos; el nombre se ve al entrar.
8. **¿Cambia algo en el generador de ideas para la ficha de un niño?**
   Recomendado: no, si la relectura de la sección de edad de los términos de la
   Gemini API no dice otra cosa. Coste: hacer esa relectura antes de construir y
   anotar el resultado en `privacy.md` §4.1.
9. **¿Siguen fuera quienes no tienen cuenta?** Recomendado: sí (decisión 4).
   Coste: en esta función se nota más que en ninguna, porque los abuelos son
   quienes menos cuenta tienen.

## Fuera de esta propuesta

- Cuentas para niños, de cualquier edad, y cualquier forma de que entren.
- Guardar la edad o la fecha de nacimiento en la lista.
- Fotos o avatar del niño.
- Campo de ocasión y varias listas por persona.
- Dos adultos gestionando la misma lista.
- Pasar la lista a la cuenta del niño cuando cumpla 18.
- Invitar a quien no tiene cuenta.
- Enviar la lista a Gemini o mandarle la edad.
- Un bloqueo en el dispositivo para que el niño no vea la pantalla.
- Regalo conjunto, bote o amigo invisible.

## Hecho significa (si se construye A)

- Los cuatro comandos de `encargo-lista.md` en verde, y `npx convex dev --once`
  antes de tocar el schema.
- Tests nuevos, como mínimo:
  - **Aislamiento:**
    - las queries de la lista propia no devuelven nada de una lista a cargo, ni
      al revés, con las dos llenas;
    - el lector de la lista de Lucía no ve la de Pablo ni la de Marta, y el de
      la de Marta no ve la de Lucía;
    - un invitado de la ficha de Lucía, propia o ajena, no ve la lista.
  - **Marcas:**
    - el test de hoy sigue pasando: la lista propia del dueño, sin rastro de
      marcas;
    - en una lista a cargo, quien la lleva ve cogido o libre y nunca el id ni la
      cuenta de quien marcó;
    - quien la lleva puede marcar y su marca bloquea el elemento para los demás.
  - **Perder el acceso:** quitar el acceso o dejar una lista borra solo las
    marcas de esa lista, no las de otras del mismo dueño.
  - **Topes:** 100 elementos y 20 lectores por lista, y el tope de listas por
    adulto. «Pegar una lista» respeta el tope de la lista elegida.
  - **Exportación:** la de quien la lleva incluye sus listas a cargo con
    elementos y lectores, y ninguna marca; la del lector, sus marcas en ellas.
    La tabla nueva tiene su propia aserción (`security.md` §7).
  - **Borrado de cuenta:** la de quien la lleva se lleva las listas a cargo con
    accesos, marcas y copias, dentro de `deleteListDataForUser`; la del lector,
    sus accesos y marcas en todas; el historial del lector se queda.
  - **Correos:** la invitación no lleva el nombre del niño ni nada de la lista,
    y sale como mucho una por pareja cada 30 días; el de la fecha lleva solo
    cifras.
  - **Gemini:** `buildPrompt` no lee nada de una lista a cargo.
- `/privacidad`, `/terminos`, `privacy.md`, `legal.md` y `security.md` §11
  movidos en el mismo cambio, y cada afirmación nueva comprobada contra el
  código.
- `docs/design-system.md` con las pantallas nuevas y `docs/dudas.md` con lo que
  se construyó de verdad.

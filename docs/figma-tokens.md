# Tokens en Figma · normas

Normas de manipulación de variables y estilos en el archivo [PickPal — Design System](https://www.figma.com/design/4hQt4BnsEluKsYk5qbKkCz/PickPal---Design-System). **Se leen antes de crear, renombrar, reasignar o borrar cualquier variable o estilo**, y también antes de crear un estilo de texto o de efecto.

Tres documentos, tres papeles — no duplicar contenido entre ellos:

| Documento | Qué guarda |
|---|---|
| **Este** | El modelo canónico de las 4 capas y las reglas de manipulación. Es normativo: dice cómo debe hacerse. |
| [`docs/design-system.md`](design-system.md) § «Figma — arquitectura de variables» | Qué es el archivo **hoy**, decisión a decisión, y por qué divergió del modelo. Es descriptivo. |
| [`docs/token-map.md`](token-map.md) | Las cifras y las divergencias con el código. **Generado** (`npm run token-map`) — no se edita a mano. |

**Desempate con el código**: si Figma contradice `globals.css`, gana el código. Esa regla está en revisión desde el 27-ago-2026 (la intención es invertirla) pero no está decidida ni aplicada; mientras no lo esté, sigue en pie.

---

## Las reglas que no se saltan

1. **Toda variable y todo estilo nuevo nace con descripción**, en el mismo movimiento que lo crea. Sin descripción, el token no está terminado. Ver «La descripción obligatoria».
2. **Por encima del primitivo no hay valores directos**: un semántico, un token de marca y un token de componente son siempre un **alias**. La única excepción viva es `z-index/*`, y está justificada por escrito.
3. **Un alias no salta eslabones**: componente → semántico → primitivo. Un token de componente que aliasa directo a un primitivo pierde la conexión con la lógica de marca y hay que arreglarlo, no imitarlo.
4. **Un token de color de marca aliasa el hub `brand/*`, nunca el primitivo.** Si el paso que necesitas no existe en el hub, se crea ahí primero. El hub es el único punto de contacto con la paleta de identidad (`Green/*`, `Terracotta/*`).
5. **Antes de crear, buscar.** Si ya existe un semántico que describe ese uso, se usa. Un token nuevo se justifica solo si ningún nombre existente describe la pieza (§4 de la guía).
6. **Los primitivos van con scope vacío y `hiddenFromPublishing`**, para que nadie aplique `spacing/4` donde toca `space/inset/md`. La excepción es la colección `Typography` — ver «Divergencias asumidas».
7. **Renombrar es barato; mover de colección no se puede.** Un rename puro conserva id, valores, alias, bindings y `codeSyntax` (0 bindings tocados). Figma **no** permite mover una variable entre colecciones: hay que recrearla y repuntar cada referencia. Antes de dar por caro o barato un movimiento, **contar los bindings de las variables implicadas**, no del archivo entero.
8. **Lo que un rename sí rompe es el texto que lo cita**: descripciones de otras variables, rótulos de swatch en las páginas de Foundations (son TEXT, no siguen a la variable) y la prosa de las páginas de componente. Repasarlos en el mismo pase.
9. **El archivo está publicado como librería**: los nombres y valores nuevos llegan a los archivos consumidores en la siguiente publicación, no al instante.
10. **Verificar después de escribir.** `figma_execute` tiene un techo de 30 s que **no revierte lo ya escrito**: tras un timeout, leer el estado real antes de reintentar y escribir los bucles idempotentes por nombre. Y tras un cambio visible, captura de pantalla — no fiarse del valor de retorno.
11. **La descripción y el `.md` se actualizan en el mismo cambio que el token.** Si una descripción cita un valor o un alias concreto, comprobarlo antes de fiarse: envejecen en silencio.

12. **Todo componente publicable lleva descripción, igual que una variable.** Los 28 component sets, los 9 componentes sueltos y los 66 iconos del archivo son lo que un consumidor ve en el panel de Assets y en cada instancia que coloca, así que la regla 1 se aplica igual a ellos. La fórmula es la misma; el sitio del producto donde aparece el componente es obligatorio, y la advertencia solo si evita un error (que los tamaños icon-only viven en otro set, que un estado se decide en tiempo de ejecución y no es una prop, que un set es una reconstrucción y no una API real). **Desde el 11-sep-2026 la descripción no nombra el archivo fuente ni ningún identificador de código**: el archivo es una pieza de portfolio y el puente con el código vive en `codeSyntax`.
13. **Toda la documentación del archivo va en inglés** (descripciones, cabeceras, prosa, rótulos y nombres de capa de documentación). El copy del producto que aparece en especímenes, pantallas y prototipo se queda en español a propósito, porque es lo que el producto enseña; About PickPal lo explica al visitante.

---

## La descripción obligatoria

Toda variable y todo estilo llevan descripción, y todas responden a la misma pregunta: **¿cómo o dónde se usa esto?** — no a cómo se generó ni cuándo.

**Fórmula**, en 1–2 frases (máximo 250 caracteres; la media del archivo es 95 en variables y 61 en estilos):

> «[Qué es y dónde se usa en el producto]. [Advertencia breve, solo si evita un error].»

En inglés (regla 13). Hasta el 11-sep-2026 la fórmula terminaba en «Espeja `utilidad-de-código`»; esa coletilla se retiró en la pasada de portfolio y **no vuelve**: el puente con el código es `codeSyntax`, que es el campo que Figma tiene para eso y el que enseña Dev Mode, y la descripción tiene que leerse sin el repositorio.

**Lo que sí va**:

- El sitio concreto del producto donde se aplica (Person Card, primary button, the Agenda).
- «No use in the product yet» cuando el rol está adelantado al producto.
- La advertencia, **solo si evita romper algo**: el par obligatorio `on-*-solid` de cada relleno sólido, la escala 0–100 de `opacity/*`, que `line-height/*` y `letter-spacing/*` no se vinculan nunca, o que `spacing/14` es el único paso fuera de la rejilla de 4 px.

**Lo que no va**: nada del código (utilidades, custom properties, rutas, nombres de archivo, versiones de paquete) — su sitio es `codeSyntax` y [`docs/token-map.md`](token-map.md); y nada de historia — fechas, «desde el 28-ago», «se perdió y se recreó», metodología de generación (splines, OKLCH, anclas), recuentos de bindings, justificaciones de arquitectura y ratios de contraste que no sean la advertencia en sí — cuyo sitio es [`docs/design-system.md`](design-system.md).

**Dos reglas de recorte, que son las que mantienen esto legible**:

1. **No repetir el dato que Figma ya enseña al lado.** El panel muestra el valor de la variable y, en un estilo de texto, su tamaño, interlineado y tracking. Abrir con «20 px de la rampa…» o con una ficha `72 px / 1,1 / -0,02em` gasta la primera línea en algo que el ojo ya tiene.
2. **Cada descripción explica lo suyo, no lo de al lado.** La advertencia de no vincular interlineado ni tracking vive en `line-height/*` y `letter-spacing/*`, no repetida en los 22 estilos de texto que las rozan.

**En un componente**, la primera frase dice qué es y en qué pantalla del producto aparece, y la última, si hace falta, qué no cubre el set (una variante sin consumidor, un estado que se decide en tiempo de ejecución). No nombra archivos ni identificadores de código. Lo que el panel de variantes ya enseña al lado —los ejes Type, Size y State— no se enumera en la descripción: gasta la primera línea en algo que el ojo ya tiene. **En un icono**, la plantilla es «Lucide «slug» · 24 × 24, 2 px stroke, round caps. Scales to 16, 20 and 24 px through sizing/icon/*; the stroke is bound to color/icon.»

**Familias uniformes**: las rampas de color y `spacing/N`, `opacity/N` usan una plantilla con el paso interpolado. Al añadir un paso a una familia se copia la plantilla de sus vecinos, y solo se añade frase propia si el paso tiene un rol propio (ancla de marca, alimenta un semántico concreto).

---

## Divergencias asumidas en este archivo

La guía canónica de abajo describe un sistema de referencia con paletas Radix. **El archivo de PickPal espeja shadcn/Tailwind**, así que hay divergencias deliberadas. No son deuda: están decididas por escrito. Antes de «corregir» una de ellas, leer su sección en [`docs/design-system.md`](design-system.md).

| La guía dice | El archivo hace | Por qué |
|---|---|---|
| `color-bg-brand` (guiones) | `brand/primary`, `color/fill/component` (barras) | Las `/` agrupan en carpetas en el panel de Figma. Los segmentos de la fórmula son los mismos; cambia el separador. |
| `element` = `bg` · `text` · `border` · `icon` · `overlay` | `bg` y `fill` separados | El fondo de una página o superficie no es el relleno de un control. Ver § «`bg` y `fill`: el `element` se partió en dos». |
| Los modos son solo de tema (la guía no contempla otro eje) | Colección `Pointer` con modos `Fine` y `Coarse` para los tamaños que crecen en táctil | El código cambia esos tamaños con `pointer-coarse:`, que es un eje independiente del tema. Un eje de variante habría duplicado los sets. Sus variables son semánticos de tamaño (alias de `spacing/*`); el marco elige el modo, como con Light y Dark. Ver § «Colección `Pointer`». |
| Colección `Component` aparte (opcional) | Los tokens de componente viven en `Semantic` | Figma no permite mover una variable de colección y ahí están los bindings caros. Decidido y documentado. |
| Rampas Radix de 12 pasos, con rol fijo por paso | Rampas propias de 11 pasos `50…950` (`Cream` llega a 500; `Terracotta` añade un escalón `1000` y un color fuera de rampa, `vivid`) | El producto espeja Tailwind. **La tabla «paso según uso» de la guía no se aplica**: aquí no hay paso 9 ni paso 11. |
| Todo en minúsculas | Familias de color con mayúscula inicial (`Cream/500`) | Única excepción de capitalización del archivo; el panel ordena por creación y así se leen mejor. No aplica a nada más. |
| Token de marca → alias al primitivo | Token de marca → alias al hub `brand/*` | Regla más estricta a propósito (regla 4 de arriba). |
| El semántico es siempre un alias | `z-index/*` lleva valor literal | Es una propuesta, no un espejo del código: ni un valor entre 1000 y 1700 existe hoy en la app. El desajuste está a la vista en cada descripción. |
| Los primitivos se ocultan y no tienen scope | `Typography` está publicada y con scope | En tipografía el text style hace de capa semántica y consume el primitivo directamente. Con excepción dentro de la excepción: `line-height/*` y `letter-spacing/*` van con **scope vacío**, porque Figma resuelve esas dos propiedades en píxeles y vincularlas rompe el texto. |
| `radius-tag` es el radio de badges y tags | `radius/tag` existe sin consumidor real | Los badges del producto son pill. Su descripción lo dice para que nadie lo tome por el radio de los badges. |
| Rol `interactive` (`radius-interactive`, `size-interactive-*`) | `radius/control`, `sizing/control/*` | La guía nombra ese rol pero no cubre el padding, el gap, el icono interior ni un radio pequeño del mismo objeto, que el archivo ya llamaba `control` en 14 tokens. Un objeto, una palabra. La caja de checkbox y radio, que antes ocupaba ese nombre, es `sizing/selection/*`. |
| `emphasis` se omite cuando vale *default* — y la tabla 2.1 lo deja *default* en `color-bg-brand` (sólido) y *subtle* en `color-bg-success` (pálido) | Todo relleno con dos pesos lo escribe: `color/fill/brand-solid` · `brand-subtle`, `destructive-subtle` · `destructive-solid` | El hueco vacío significaba cosas opuestas según el rol, y el propio cuadro de la guía lo documenta. Solo se omite donde el rol tiene un único peso (`fill/component`, `fill/field-disabled`). Ver § «El énfasis deja de ser implícito en los rellenos». |
| Rol `danger` (`color-bg-danger`, `color-text-danger`, `color-border-danger`, `color-icon-danger`) | `destructive` en los 9 tokens del rol rojo | El código no dice `danger` **ni una vez**: `destructive` aparece 45 veces y la custom property es `--destructive`. Manda el código (regla de desempate de arriba), y el archivo ya decía `Destructive` en el eje Type de Button. El **estado** de un campo sigue llamándose `Error`, que es otra cosa: el nombre del estado, no el del color. Ver § «`danger` pasa a `destructive`». |

### El único sitio donde el archivo no sigue al código, a propósito

La regla de desempate manda seguir al código, y la API de los componentes lo hace al pie de la letra. Comprobado el 18-sep-2026 contra `src/components/ui/`: los ejes `Size` de Button (`Xs · Sm · Default · Lg`, con `Xs` desde el 13-oct-2026) y Button Icon (`Icon · Icon-Sm`) espejan los valores de `buttonVariants`, y los de Switch, Avatar y Select Trigger coinciden **exactamente** con el `size` de su componente (`sm | default`, `default | sm | lg`, `sm | default`).

**La única excepción es `Type=Primary`**, en Button y en Badge, que el código llama `variant: "default"` en los dos. Se mantiene `Primary` por una razón concreta: `Default` ya ocupa otros dos ejes del mismo componente —`Size=Default` y `State=Default`—, así que adoptarlo dejaría a Button con **tres ejes llamados igual** en el mismo panel de variantes. `default` es término tóxico justo por esto: significa a la vez «en reposo», «paso por omisión de una escala» y «variante base». `Primary` no es ambiguo y los dos componentes usan el mismo vocabulario.

Al leer una instancia, `Type=Primary` es `variant="default"`. Es la única equivalencia que hay que traducir de memoria; cualquier otra diferencia entre un nombre de Figma y uno de código es un error, no una decisión.

---

## Guía canónica · las 4 capas

Lo que sigue es la guía de referencia **tal cual se recibió** (transcripción literal, sin su portada ni su pie): el modelo al que el archivo aspira. Donde este archivo se aparta de él a propósito, lo dice «Divergencias asumidas» arriba.

### 1. TOKENS PRIMITIVOS

#### Que son

Valores crudos sin significado de uso. Un primitivo no dice "para que sirve", solo dice "cuanto vale". Son el deposito de materia prima del sistema.

#### Por que existen asi

Si aplicaras hex directos en cada componente (`#5B5BD6` en 40 sitios distintos), cambiar el color de marca implicaria editar 40 sitios. Con primitivos, ese valor vive en un solo lugar y todo lo demas apunta ahi.

#### Naming

| Formato | Ejemplo | Cuando se usa |
|---------|---------|----------------|
| `{paleta}-{paso}` | `iris-9`, `sand-3` | Color (escalas Radix, 12 pasos) |
| `{tipo}-{escala}` | `space-4`, `radius-md` | Numeros (spacing, radius, tamano) |

#### Coleccion en Figma

| Propiedad | Valor |
|-----------|-------|
| Nombre coleccion | `Primitives` |
| Modos | Light + Dark (color) / Value unico (numeros) |
| Scope | Vacio `[ ]` — no aparece en ningun picker |
| Publicada como libreria | No |

**Por que scope vacio**: si un primitivo tuviera scope, apareceria en el picker de Fill junto a los semanticos, y un disenador podria aplicar `iris-9` directamente a un boton sin pasar por `color-bg-brand`. Eso rompe la cadena de alias — si luego cambias `iris-9`, ese boton concreto no reacciona porque no esta enlazado via alias, esta con un valor "congelado" en el momento en que se aplico.

#### Ejemplos — Color (paleta Radix, 12 pasos)

| Token | Light | Dark | Rol del paso (fijo, no cambia) |
|-------|-------|------|-------------------------------|
| `iris-1` | #fdfdff | #13131e | Fondo de pagina |
| `iris-2` | #f8f8ff | #171625 | Fondo secundario |
| `iris-3` | #f0f1fe | #202248 | Fondo componente reposo |
| `iris-4` | #e6e7ff | #262a65 | Fondo componente hover |
| `iris-5` | #dadcff | #2f3476 | Fondo componente pressed |
| `iris-6` | #cbcdff | #3a4086 | Borde sutil |
| `iris-7` | #b8bcf5 | #474e9a | Borde estandar |
| `iris-8` | #9b9ef0 | #5b62b3 | Borde hover / focus ring |
| `iris-9` | #5b5bd6 | #5b5bd6 | Fondo solido (boton, badge) |
| `iris-10` | #5151cd | #6e6ade | Fondo solido hover |
| `iris-11` | #5753c6 | #b1a9ff | Texto / icono |
| `iris-12` | #272962 | #e0dffe | Texto alto contraste |

Esta tabla se repite igual para cada paleta que uses (sand, tomato, grass, amber, sky, etc.). El paso siempre cumple el mismo rol, independientemente de la paleta.

#### Ejemplos — Numeros

| Token | Valor | Uso tipico |
|-------|-------|-----------|
| `space-0` | 0px | Reset |
| `space-1` | 4px | Gap minimo |
| `space-2` | 8px | Gap entre items pequenos |
| `space-4` | 16px | Padding / gap estandar |
| `space-6` | 24px | Padding amplio |
| `space-8` | 32px | Separacion de secciones |
| `radius-none` | 0px | Rectangulos estrictos |
| `radius-sm` | 4px | Badges, tags |
| `radius-md` | 8px | Botones, inputs |
| `radius-lg` | 12px | Cards, modales |
| `radius-full` | 9999px | Pills, avatares |
| `font-size-14` | 14px | Texto secundario |
| `font-size-16` | 16px | Texto body |
| `font-size-24` | 24px | Titulo H3 |
| `font-weight-400` | 400 | Regular |
| `font-weight-600` | 600 | Semibold |
| `size-20` | 20px | Icono estandar |
| `size-40` | 40px | Avatar estandar |

#### Como se ven en Figma (panel Variables)

```
Coleccion: Primitives          Modos: [Light] [Dark]
├── iris-1        #fdfdff | #13131e
├── iris-2        #f8f8ff | #171625
├── ...
├── sand-1        #fdfdfc | #111110
├── ...
├── space-4       16 | 16
├── radius-md     8 | 8
└── font-size-16  16 | 16
```

---

### 2. TOKENS SEMANTICOS

#### Que son

Tokens con significado de uso. No dicen cuanto valen, dicen para que sirven. Son la capa que un disenador consulta y aplica — la API visible del sistema.

#### Por que existen asi

Si un disenador tuviera que recordar "el fondo de las cards es `sand-2` en dark y `white` en light", tendria que memorizar reglas. Con un semantico como `color-bg-surface`, el disenador solo aplica ese nombre y Figma resuelve el valor correcto segun el modo activo.

#### La formula del naming

```
{type} - {element} - {role} - {emphasis} - {state}
```

| Segmento | Pregunta que responde | Obligatorio | Se omite si... |
|----------|----------------------|-------------|-----------------|
| **type** | ¿Que propiedad controla? | Si | Nunca se omite |
| **element** | ¿A que parte de la UI se aplica? | Si | Nunca se omite |
| **role** | ¿Que proposito funcional tiene? | Si | Nunca se omite |
| **emphasis** | ¿Que intensidad visual? | No | Es "default" (intensidad estandar) |
| **state** | ¿En que estado de interaccion? | No | Es "default" (reposo, sin interaccion) |

#### Ejemplo de lectura completa

```
color   -  bg   -  brand  -  subtle  -  hover
  │         │        │         │         │
 type    element    role    emphasis   state

Traduccion: "el color de fondo (bg), de rol marca (brand),
en su version sutil (subtle), cuando esta en hover"
```

#### Ejemplo de omision

| Nombre teorico | Nombre real en Figma |
|-----------------|----------------------|
| `color-bg-brand-default-default` | `color-bg-brand` |
| `color-bg-brand-default-hover` | `color-bg-brand-hover` |
| `color-bg-brand-subtle-default` | `color-bg-brand-subtle` |

#### Valores posibles de cada segmento

| Segmento | Valores tipicos |
|----------|-----------------|
| `type` | `color`, `space`, `radius`, `size`, `border-width`, `opacity` |
| `element` (para color) | `bg`, `text`, `border`, `icon`, `overlay` |
| `element` (para spacing) | `inset` (padding), `stack` (gap vertical), `inline` (gap horizontal) |
| `role` | `brand`, `accent`, `neutral`, `surface`, `component`, `success`, `warning`, `danger`, `info` |
| `emphasis` | `subtle`, `bold` |
| `state` | `hover`, `pressed`, `focus`, `selected`, `disabled` |

#### Coleccion en Figma

| Propiedad | Valor |
|-----------|-------|
| Nombre coleccion | `Semantic` |
| Modos | Light + Dark |
| Valor de cada variable | Alias a un primitivo (nunca hex directo) |
| Scope | Especifico segun el `element` (ver tabla siguiente) |
| Publicada como libreria | Si |

#### Tabla de scope por element

| element | Scope en Figma | Donde aparece el picker |
|---------|-----------------|--------------------------|
| `bg` | Frame fill, Shape fill | Al aplicar Fill a un frame o forma |
| `text` | Text fill | Al aplicar color a un texto |
| `border` | Stroke | Al aplicar Stroke |
| `icon` | Shape fill, Stroke | Al aplicar Fill o Stroke a un icono |
| `inset` / `stack` / `inline` | Gap | Al aplicar padding o gap en Auto Layout |
| (radius) | Corner radius | Al aplicar border-radius |
| (size) | Width and height | Al aplicar ancho/alto |

**Por que este scope y no otro**: si `color-text-secondary` no tuviera scope `Text fill`, apareceria tambien en el picker de Fill de un rectangulo, y un disenador podria confundirlo con un token de fondo. El scope hace que Figma filtre automaticamente que token mostrar segun donde estas trabajando.

---

#### 2.1 Semanticos de COLOR — Fondos (bg)

| Token | Alias (ejemplo) | Emphasis | State | Uso |
|-------|-----------------|----------|-------|-----|
| `color-bg` | neutral-1 | default | default | Fondo de pagina (canvas) |
| `color-bg-subtle` | neutral-2 | subtle | default | Fondo de zona secundaria |
| `color-bg-surface` | white / neutral-2 | default | default | Fondo de card, modal |
| `color-bg-surface-raised` | white / neutral-3 | default | default | Fondo de dropdown, popover |
| `color-bg-sunken` | neutral-2 / neutral-1 | default | default | Sidebar, input |
| `color-bg-component` | neutral-3 | default | default | Fondo de boton secundario, chip |
| `color-bg-component-hover` | neutral-4 | default | hover | Hover del anterior |
| `color-bg-component-active` | neutral-5 | default | pressed | Pressed del anterior |
| `color-bg-disabled` | neutral-3 | default | disabled | Fondo deshabilitado |
| `color-bg-success` | success-3 | subtle | default | Alert de exito |
| `color-bg-success-solid` | success-9 | bold | default | Badge de exito solido |
| `color-bg-warning` | warning-3 | subtle | default | Alert de advertencia |
| `color-bg-danger` | danger-3 | subtle | default | Alert de error |
| `color-bg-info` | info-3 | subtle | default | Alert informativo |

#### 2.2 Semanticos de COLOR — Textos (text)

| Token | Alias (ejemplo) | Uso |
|-------|-----------------|-----|
| `color-text` | neutral-12 | Texto principal |
| `color-text-secondary` | neutral-11 | Texto de apoyo, descripciones |
| `color-text-tertiary` | neutral-10 | Hints, placeholders, captions |
| `color-text-disabled` | neutral-8 | Texto deshabilitado |
| `color-text-inverse` | neutral-1 | Texto sobre fondo oscuro invertido |
| `color-text-on-solid` | white | Texto sobre un fondo solido (paso 9) |
| `color-text-success` | success-11 | Texto de confirmacion |
| `color-text-warning` | warning-11 | Texto de advertencia |
| `color-text-danger` | danger-11 | Texto de error |

#### 2.3 Semanticos de COLOR — Bordes (border)

| Token | Alias (ejemplo) | Uso |
|-------|-----------------|-----|
| `color-border-subtle` | neutral-6 | Separadores, dividers |
| `color-border` | neutral-7 | Borde estandar de inputs/cards |
| `color-border-hover` | neutral-8 | Borde en hover |
| `color-border-disabled` | neutral-5 | Borde deshabilitado |
| `color-border-success` | success-7 | Campo valido |
| `color-border-danger` | danger-7 | Campo con error |

#### 2.4 Semanticos de COLOR — Iconos (icon)

| Token | Alias (ejemplo) | Uso |
|-------|-----------------|-----|
| `color-icon` | neutral-11 | Icono por defecto |
| `color-icon-strong` | neutral-12 | Icono enfatizado |
| `color-icon-subtle` | neutral-10 | Icono decorativo |
| `color-icon-disabled` | neutral-8 | Icono deshabilitado |
| `color-icon-on-solid` | white | Icono sobre fondo solido |
| `color-icon-success` | success-11 | Icono de check |
| `color-icon-danger` | danger-11 | Icono de error |

#### 2.5 Semanticos de ESPACIADO (space)

| Token | Element | Alias | Uso |
|-------|---------|-------|-----|
| `space-inset-sm` | inset (padding) | space-2 (8px) | Padding compacto |
| `space-inset-md` | inset (padding) | space-4 (16px) | Padding estandar de card |
| `space-inset-lg` | inset (padding) | space-6 (24px) | Padding amplio |
| `space-stack-sm` | stack (gap vertical) | space-2 (8px) | Gap entre items de lista |
| `space-stack-md` | stack (gap vertical) | space-4 (16px) | Gap vertical estandar |
| `space-inline-xs` | inline (gap horizontal) | space-1 (4px) | Gap entre icono y texto |
| `space-inline-sm` | inline (gap horizontal) | space-2 (8px) | Gap entre botones |

**Por que 3 variantes de "element" en spacing**: `inset` es interior (padding), `stack` es entre elementos apilados verticalmente, `inline` es entre elementos en fila horizontal. Un mismo valor numerico (16px) puede necesitar 3 tokens distintos porque cada uno tiene un scope y proposito de aplicacion diferente en Figma.

#### 2.6 Semanticos de TAMANO (size)

| Token | Alias | Uso |
|-------|-------|-----|
| `size-interactive-sm` | 32px | Altura de boton/input pequeno |
| `size-interactive-md` | 36px | Altura de boton/input estandar |
| `size-interactive-lg` | 44px | Touch target minimo (accesibilidad) |
| `size-icon-sm` | 16px | Icono pequeno |
| `size-icon-md` | 20px | Icono estandar |
| `size-icon-lg` | 24px | Icono grande |
| `size-avatar-sm` | 32px | Avatar pequeno |
| `size-avatar-md` | 40px | Avatar estandar |
| `size-avatar-lg` | 48px | Avatar grande |

**Por que un token de sizing y no solo padding**: la altura de un boton (36px) no es lo mismo que su padding horizontal (16px). Si solo usaras spacing, no podrias fijar una altura constante independientemente del contenido. El sizing controla dimension; el spacing controla separacion.

#### 2.7 Semanticos de RADIO (radius)

| Token | Alias | Uso |
|-------|-------|-----|
| `radius-interactive` | radius-md (8px) | Botones, inputs, selects |
| `radius-surface` | radius-lg (12px) | Cards, modales, paneles |
| `radius-tag` | radius-sm (4px) | Badges, tags pequenos |
| `radius-pill` | radius-full (9999px) | Avatares circulares, toggles |

---

### 3. TOKENS DE MARCA

#### Que son

Un subconjunto de tokens semanticos donde el `role` es especificamente de identidad de marca (`brand`, `accent`). Viven dentro de la misma coleccion `Semantic` — no necesitan una coleccion aparte.

#### Por que se vinculan dentro de Semantic y no aparte

Un token de marca sigue siendo un token semantico: `color-bg-brand` responde exactamente a la misma formula `type-element-role-emphasis-state`. La unica diferencia es que su `role` (`brand`) representa la identidad visual en vez de un estado funcional (`success`, `danger`). Separarlos en otra coleccion romperia la coherencia de naming y obligaria a duplicar la logica de scoping.

#### Como se vincula un token de marca

El proceso en Figma es identico al de cualquier semantico — se crea la variable y su valor es un **alias** a un paso de la paleta primitiva que el equipo elige como marca:

```
color-bg-brand   →  alias  →  iris-9   (si la marca eligio "iris")
color-bg-brand   →  alias  →  jade-9   (si la marca eligio "jade")
```

**Por que importa esto**: si manana cambias de paleta de marca, solo cambias el alias de estos tokens (unos 10-12 variables). El resto del sistema — que consume `color-bg-brand` y no `iris-9` directamente — no se entera del cambio. Sigue funcionando igual.

#### Tabla de tokens de marca — Brand

| Token | Alias (paso Radix de la paleta marca) | Emphasis | State | Uso |
|-------|----------------------------------------|----------|-------|-----|
| `color-bg-brand` | paso 9 | default | default | Boton primario, CTA |
| `color-bg-brand-hover` | paso 10 | default | hover | Hover del CTA |
| `color-bg-brand-active` | paso 11 | default | pressed | Pressed del CTA |
| `color-bg-brand-subtle` | paso 3 | subtle | default | Highlight, tag activo |
| `color-bg-brand-subtle-hover` | paso 4 | subtle | hover | Hover del highlight |
| `color-text-brand` | paso 11 | default | default | Links, texto de marca |
| `color-text-brand-hover` | paso 12 | default | hover | Link en hover |
| `color-border-brand` | paso 7 | default | default | Elemento seleccionado |
| `color-border-focus` | paso 8 | default | focus | Focus ring (foco de teclado) |
| `color-icon-brand` | paso 11 | default | default | Icono con color de marca |

#### Tabla de tokens de marca — Accent (color secundario, opcional)

| Token | Alias (paso Radix de la paleta accent) | Uso |
|-------|-------------------------------------------|-----|
| `color-bg-accent` | paso 9 | Destacados secundarios, no CTA principal |
| `color-bg-accent-subtle` | paso 3 | Highlights decorativos |
| `color-text-accent` | paso 11 | Texto con color accent |
| `color-icon-accent` | paso 11 | Iconos decorativos con color accent |

#### Regla de asignacion de paso segun el uso

Esta tabla es la que convierte "cualquier paleta" en un sistema de marca coherente, sea cual sea la paleta elegida:

| Uso del token | Paso de la paleta asignada a marca |
|----------------|--------------------------------------|
| Fondo sutil / highlight | 3 |
| Fondo sutil hover | 4 |
| Fondo solido (CTA) | 9 |
| Fondo solido hover | 10 |
| Texto / icono | 11 |
| Texto alto contraste | 12 |
| Borde | 7 |
| Borde hover / focus ring | 8 |

---

### 4. TOKENS DE COMPONENTE

#### Que son

Tokens que existen unicamente cuando un componente concreto necesita un valor que ningun token semantico (ni de marca) resuelve. Son la excepcion, no la norma.

#### Por que existen asi

La mayoria de componentes se construyen SOLO con semanticos. Un token de componente aparece cuando el nombre semantico generico no describe bien la pieza especifica del componente — por ejemplo, "el track de un toggle cuando esta encendido" no tiene un equivalente semantico natural como "fondo de superficie" o "fondo de marca".

#### Naming

```
{componente} - {variante} - {propiedad} - {estado}
```

| Segmento | Pregunta | Ejemplo |
|----------|----------|---------|
| **componente** | ¿Que componente? | `button`, `toggle`, `tooltip`, `input` |
| **variante** | ¿Que variante (si aplica)? | `primary`, `secondary` |
| **propiedad** | ¿Que parte visual? | `bg`, `track`, `thumb`, `placeholder` |
| **estado** | ¿En que estado? | `on`, `off`, `hover`, `focus` |

#### Como decidir si necesitas un token de componente

| Pregunta | Si la respuesta es SI |
|----------|------------------------|
| ¿Existe ya un semantico que describe este uso? | Usa el semantico. No crees nada nuevo. |
| ¿Es una pieza exclusiva de un solo componente (track, thumb)? | Crea un token de componente. |
| ¿El valor cambiaria si cambias la marca? | Aliasealo a un token de marca, no a un primitivo. |

#### Ejemplos de tokens de componente

| Token | Alias a (semantico o marca) | Uso |
|-------|------------------------------|-----|
| `toggle-track-bg` | `color-bg-component` | Fondo del track apagado |
| `toggle-track-bg-on` | `color-bg-brand` | Fondo del track encendido |
| `toggle-thumb-bg` | (blanco fijo, no alias) | Circulo movil del toggle |
| `input-placeholder` | `color-text-tertiary` | Color del texto placeholder |
| `tooltip-bg` | neutral-12 (invertido) | Fondo oscuro del tooltip |
| `tooltip-text` | neutral-1 (invertido) | Texto claro del tooltip |
| `card-shadow-hover` | (Effect Style especifico) | Sombra al hacer hover sobre una card interactiva |

#### Coleccion en Figma

| Propiedad | Valor |
|-----------|-------|
| Nombre coleccion | `Component` (opcional, separada de Semantic) |
| Modos | Hereda de Semantic — no necesita modos propios |
| Valor de cada variable | Alias a un semantico o a un token de marca (nunca a un primitivo) |
| Scope | Especifico segun la propiedad que controla |
| Publicada como libreria | Opcional |

**Por que alias a semantico y no a primitivo**: si `toggle-track-bg-on` aliasa directamente a `iris-9` (primitivo), pierdes la conexion con la logica de marca. Si aliasa a `color-bg-brand` (semantico de marca), y manana cambias de marca, el toggle se actualiza automaticamente sin tocar nada.

---

### 5. RESUMEN — LAS 4 CAPAS EN FIGMA

| Capa | Coleccion Figma | Formula de naming | Valor | Scope | Se publica |
|------|-------------------|---------------------|-------|-------|-------------|
| **Primitivo** | Primitives | `{paleta}-{paso}` / `{tipo}-{escala}` | Directo (hex o numero) | Vacio | No |
| **Semantico** | Semantic | `type-element-role-emphasis-state` | Alias a primitivo | Especifico por element | Si |
| **Marca** | Semantic (mismo) | `type-element-brand/accent-emphasis-state` | Alias a primitivo (paso segun tabla) | Especifico por element | Si |
| **Componente** | Component | `componente-variante-propiedad-estado` | Alias a semantico o marca | Especifico por propiedad | Opcional |

#### Arbol de decision rapido

```
¿Estoy definiendo un VALOR CRUDO sin uso especifico?
  → PRIMITIVO

¿Estoy definiendo un USO GENERICO (fondo, texto, borde, espaciado)?
  → SEMANTICO

¿El token representa la IDENTIDAD DE MARCA (color principal o accent)?
  → MARCA (dentro de Semantic, role = brand/accent)

¿Es una pieza EXCLUSIVA de un componente que ningun semantico cubre?
  → COMPONENTE (alias a semantico, nunca a primitivo)
```

---

*Transcripción de `guia-tokens-figma-completa.md`, recibida el 27-ago-2026.*

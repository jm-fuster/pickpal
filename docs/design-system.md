# Sistema de diseño · PickPal

Documento vivo. Captura las decisiones visuales del producto y el porqué de cada una. Cuando una decisión cambie, se actualiza este archivo en el mismo commit que toca el código.

---

## Intención

PickPal es una app sobre **personas queridas y ocasiones que importan**. El registro visual es el de una libreta de papel cálido, no el de un dashboard SaaS.

- **Sí somos**: Things 3 con calor, Notion personal, papelería de calidad, una agenda de regalos hecha con mimo.
- **No somos**: Linear, Material, Stripe Dashboard, Vercel admin. Nada de gris frío ni gradientes corporativos.

La calidez es diferenciación: casi todo el SaaS B2C parece enterprise. Si el usuario se siente como abriendo una libreta de notas, ya hemos ganado.

---

## Logo y marca

El logo-mark de PickPal son dos figuras entrelazadas que forman las letras "PP". Archivo fuente: [`public/logo-mark.svg`](../public/logo-mark.svg).

### Colores del logo

| Path | Color | Token equivalente |
|---|---|---|
| Figura izquierda (p) + cabeza izquierda | `currentColor` | hereda `--foreground` del contexto |
| Figura derecha (P) + cabeza derecha | `#F1704B` | ~`--secondary` (terracota) |

Los paths del verde oscuro usan `fill="currentColor"` en el componente React, no un color fijo. Esto permite que el logo se adapte automáticamente: sobre fondo oscuro (dark mode) hereda el color crema del texto; sobre fondo claro hereda el marrón cálido del texto. El coral se queda fijo porque es el acento de marca.

### Componente

```tsx
import { LogoMark } from "@/components/ui/LogoMark";
<LogoMark className="size-7" />
```

Acepta `className` para controlar tamaño. Incluye `aria-hidden` — el contexto de texto adjunto ya nombra la marca.

### Dónde aparece

| Ubicación | Tamaño | Archivo |
|---|---|---|
| Sidebar desktop | `size-7` | `src/app/(app)/layout.tsx` |
| Header móvil | `size-6` | `src/app/(app)/layout.tsx` |
| Auth layout (sign-in / sign-up) | `size-7` | `src/app/(auth)/layout.tsx` |
| Landing page header | `size-7` | `src/app/page.tsx` |
| Favicon e iconos de app | — | ver [Iconos de app y favicon](#iconos-de-app-y-favicon) |

### Iconos de app y favicon

Cada superficie recorta el icono de forma distinta, así que cada archivo lleva su propio margen. Ninguno debe llevar el logo a sangre.

| Archivo | Tamaño | Dónde se usa | Fondo | Logo ocupa |
|---|---|---|---|---|
| `src/app/icon.svg` | 32 (viewBox `-2 -2 36 36`) | Pestaña del navegador (Chrome, Edge, Firefox) | Transparente | ~89 % |
| `public/favicon.ico` | 16 · 32 · 48 | Pestaña en Safari y navegadores sin SVG | Transparente | ~89 % |
| `public/apple-touch-icon.png` | 180×180 | Pantalla de inicio iOS (`metadata.icons.apple`) | `#FBF7EE` opaco | ~70 % |
| `public/icon-192.png` · `icon-512.png` | 192 · 512 | Manifest, `purpose: "any"` | Transparente | 100 % |
| `public/icon-maskable-512.png` | 512 | Manifest, `purpose: "maskable"` (Android) | `#FBF7EE` | 56 % |

- **Maskable (Android)**: Android recorta con su propia máscara (círculo, squircle…) y solo garantiza visible el círculo central del 80 %. El logo, casi cuadrado, cabe entero en ese círculo al 56 % (0,8 / √2). Nunca marcar como `maskable` un PNG sin margen: es lo que dejaba el icono cortado.
- **iOS**: no admite transparencia (la rellena de negro) ni SVG. Solo redondea las esquinas, por eso basta con menos margen que en Android. No volver a poner `src/app/apple-icon.svg`: Next lo publicaría como un segundo apple-touch-icon.
- **Modo oscuro del favicon**: `icon.svg` lleva un `@media (prefers-color-scheme: dark)` que cambia el verde `#2F3B29` a crema `#FBF7EE`; el coral no cambia. Safari y el `.ico` ignoran la regla y muestran siempre el verde.
- **Regenerar**: todos salen de `icon-512.png` (PNG) o de `icon.svg` (`.ico`) con `sharp`, que ya está en `node_modules`. Tras cambiarlos, desinstalar y volver a añadir la app para ver el icono nuevo; iOS y Android lo guardan en caché.

### Pendiente de logo

- **Email**: los clientes de correo no soportan SVG. Necesita un PNG alojado en URL pública para poder meterlo en el header de `convex/emails.ts`. Diferido hasta tener deploy o CDN.

---

## Tokens

Definidos en [`src/app/globals.css`](../src/app/globals.css). Todos los colores en `oklch` para mantener consistencia perceptual entre claro y oscuro.

### Colores · light

| Token | Valor | Por qué |
|---|---|---|
| `--background` | `oklch(0.9748 0.0079 73.74)` (`#FAF6F1`) | Crema cálida. Evoca papel ligeramente envejecido, no blanco quirófano. Es `Cream/100` de la rampa. |
| `--foreground` | `oklch(0.2784 0.0176 48.07)` (`#302621`) | Marrón cálido oscuro, no negro puro. Acompaña al fondo crema sin chocar. Es `Neutral/800`. 13.70:1 sobre el fondo. |
| `--primary` | `oklch(0.25 0.055 148)` (~`#0C2912`) | Verde bosque. Arraigado, cálido-natural, sin ser "eco startup". **Solo relleno**, nunca color de texto (ver Accesibilidad · Contraste). |
| `--brand` | `oklch(0.25 0.055 148)` (~`#0C2912`) | El mismo verde, pero como **primer plano**: texto e iconos de marca. En claro coincide con `--primary`; existe porque en oscuro no puede coincidir. |
| `--secondary` | `oklch(0.62 0.13 45)` (~`#C56A3E`) | Terracota. Acento cálido para badges de relación y elementos de énfasis. **Solo relleno**: como texto se queda a 3.7:1. |
| `--brand-secondary` | `oklch(0.52 0.13 45.3)` (`#A44C1D`) | La terracota como **primer plano**: etiquetas de marca favorita, `BrandStoreLink` y glifo de categoría. Es `Terracotta/1000` del hub: 5.4–5.6:1. Partida de `--secondary` el 28-ago-2026, igual que `--brand` del verde. |
| `--muted` / `--accent` | `oklch(0.93 0.03 78)` los dos (`#F3E6D2`) | Beige/ámbar sutil — fondos de hover, badges neutros. **Mismo valor a propósito**: en Figma los dos aliasan a `Cream/300`. |
| `--muted-foreground` | `oklch(0.4014 0.0404 51.47)` (`#5A4234`) | Texto secundario: descripciones, metadatos, rótulos de sección, reposo de lo clicable. Es `Neutral/700`. 8.62:1 sobre el fondo. |
| `--subtle-foreground` | `oklch(0.4992 0.0249 60.35)` (`#6E6055`) | **Tercer nivel**, más débil que el anterior: placeholders y decoración. Es `Umber/900`. 5.63:1 — suficiente porque nunca lleva contenido que haya que leer. |
| `--border` | `oklch(0.88 0.025 75)` | Tostado discreto. Define sin gritar. Decorativo: WCAG 1.4.11 no lo cubre. |
| `--input` | `oklch(0.597 0.035 51)` (`#917A6D`) | **Borde de control**: campos, checkbox, `Button` outline y track del `Switch` apagado. Es el único límite visual de esos controles, así que 1.4.11 le exige 3:1 — da **3.75:1**. Es `Neutral/500`, vía `color/field/border`. Sincronizado desde Figma el 28-ago-2026. |
| `--chart-3` | `oklch(0.77 0.12 72)` (~`#E8B059`) | Ámbar dorado — acento terciario para gráficas y datos. |

### Colores · dark

Mantenemos calidez también en oscuro. Nada de marrón griseado.

| Token | Valor | Por qué |
|---|---|---|
| `--background` | `oklch(0.18 0.012 50)` | Marrón profundo, no negro. Sigue evocando papel a baja luz. |
| `--foreground` | `oklch(0.94 0.012 80)` | Crema clara con un toque cálido. |
| `--primary` | `oklch(0.539 0.065 148)` (`#547959`) | Es `Green/600`: el único paso de la rampa con ≥3:1 sobre el fondo (**3.82:1**, WCAG 1.4.11) que mantiene 4.59:1 con `--primary-foreground` encima. Como **relleno** funciona; como texto sigue sin llegar a 4.5:1 — por eso existe `--brand`. Sincronizado desde Figma el 28-ago-2026. |
| `--brand` | `oklch(0.71 0.047 148)` (`#8EAA91`) | Verde claro para texto e iconos de marca: **7.46:1** sobre el fondo. Es `Green/400` de la rampa, no un valor inventado. Aquí es donde se separa de `--primary`. |
| `--secondary` | `oklch(0.70 0.12 45)` | Terracota más luminosa para badges sobre fondo oscuro. |
| `--brand-secondary` | `oklch(0.70 0.12 45)` | En oscuro coincide con `--secondary`: la terracota luminosa ya da 6.2–6.8:1 como texto. La prop existe por el modo claro. |
| `--input` | `oklch(1 0 0 / 36%)` | Borde de control en oscuro: **3.32:1** sobre el fondo (antes blanco/12 %, 1.39:1 — invisible). Aclara de paso los rellenos `bg-input/30·50` de campos y outline, asumido en la sincronización a11y. |

### Radii

`--radius` base: `1rem` (16px, era `0.875rem`/14px — subido el 24-ago-2026, ver más abajo). Escalado en `@theme inline` a `xs/sm/md/lg/xl/2xl/3xl/4xl`, ahora en incrementos limpios de 4px: `xs` 4, `sm` 8, `md` 12, `lg` 16 (=`--radius`), `xl` 20, `2xl` 24, `3xl` 28, `4xl` 32. Antes eran multiplicadores del base (`base * 0.6`, `* 0.8`, `* 1.4`…) que daban valores como 8.4 o 30.8 — sin significado propio, solo el resultado de una fórmula. `rounded-full` (avatares, switches, sliders, badges) sigue siendo la utilidad nativa de Tailwind, sin variable propia — no depende de esta escala. Curvas generosas — coherentes con el registro suave.

### Sombras

- **Default**: `shadow-sm` para cards y elementos elevados ligeros.
- **Hover de cards interactivas**: aún por consolidar (ver Pendientes).
- **No usar**: `shadow-lg`, `shadow-xl`, `shadow-2xl`. Rompen la sensación de papel y suenan a Material.

### Primera sincronización de color desde Figma (27-ago-2026)

Seis tokens de modo claro pasan a los valores de Figma. Los encontró [`docs/token-map.md`](token-map.md) al cruzar las variables con las custom properties reales: no estaban a la vista porque el código los tenía escritos a mano en oklch y Figma en pasos de rampa, y nadie había comparado los dos lados.

| Token | Antes | Ahora | Paso de rampa | Contraste |
|---|---|---|---|---|
| `--muted-foreground` | `#6E6055` | `#5A4234` | `Neutral/700` | **5.63 → 8.62:1** |
| `--accent-foreground` | `#48362D` | `#5A4234` | `Neutral/700` | 9.27 → 7.54:1 |
| `--chart-5` | `#6C4D3C` | `#775E50` | `Neutral/600` | sin uso |
| `--muted` | `#F1E6D8` | `#F3E6D2` | `Cream/300` | fondo |
| `--background` | `#FBF6EE` | `#FAF6F1` | `Cream/100` | fondo |
| `--foreground` | `#2F241E` | `#302621` | `Neutral/800` | 14.02 → 13.70:1 |

**El cambio que importa es `--muted-foreground`**, con 151 usos: el texto secundario sube de 5.63:1 a 8.62:1, de AA raspado a AAA, y sigue a 8.62 frente a los 13.70 del texto normal, así que la jerarquía se mantiene legible. Los demás son de coherencia de rampa: deltas de 3 a 20 por canal que nadie habría visto a ojo.

**Dos concesiones, dichas en voz alta.** `--accent-foreground` **pierde** contraste (9.27 → 7.54:1, sigue en AAA) a cambio de caer en un paso de rampa en vez de un oklch suelto; son 2 usos, los dos el ítem resaltado de un select. Y `--card-foreground` y `--popover-foreground` se movieron con `--foreground` sin que Figma lo pidiera: eran idénticos a él y dejarlos atrás habría creado una diferencia entre el texto de la página y el de las tarjetas que antes no existía. Figma no tiene variable para ninguno de los dos — un relleno sin su primer plano, contra su propia regla de parejas.

**Y una que se resolvió partiendo el token**: en oscuro `--muted-foreground` estaba en `Cream/500`, no en el `Cream/400` de Figma. La primera lectura fue «gana el código, hay que bajar Figma a `Cream/500`», y era falsa — ver la sección siguiente.

#### El código tenía dos niveles de texto donde Figma tiene tres (27-ago-2026)

Al ir a aplicar ese cambio en Figma se vio que **`Cream/500` no está libre: es el escalón de `color/text/tertiary`**. Moverle `secondary` encima habría colapsado los dos niveles, y arrastrado también los iconos, porque `color/icon/secondary` comparte el primitivo a propósito para que icono y texto casen.

| Nivel | Claro | ratio | Oscuro | ratio |
|---|---|---|---|---|
| `color/text` | `Neutral/800` `#302621` | 13.70:1 | `Cream/200` `#EFEAE2` | 15.74:1 |
| `color/text/secondary` | `Neutral/700` `#5A4234` | 8.62:1 | `Cream/400` `#E1D6C6` | 13.14:1 |
| `color/text/tertiary` | `Umber/900` `#6E6055` | 5.63:1 | `Cream/500` `#A99C8E` | 7.03:1 |

**El diagnóstico real es otro.** Antes de esta pasada, `--muted-foreground` valía `#6E6055` en claro y `#A99C8E` en oscuro: estaba exactamente sobre el nivel **terciario** en los dos modos. El `codeSyntax var(--muted-foreground)` lo lleva `color/text/secondary`, así que el mapa comparaba contra el nivel equivocado — **no era deriva de valor, era un mapeo mal puesto**. Tras la pasada el código quedó en secundario en claro y terciario en oscuro: visualmente correcto (8.62:1 y 7.03:1, los dos AAA) pero cruzando niveles.

**Se eligió la salida de fondo: el código crece el tercer nivel.** Nace `--subtle-foreground`, que espeja `color/text/tertiary` y `color/icon/tertiary` (`Umber/900` en claro, `Cream/500` en oscuro), y `--muted-foreground` sube en oscuro a `Cream/400` para ocupar de verdad el escalón secundario. Los otros dos caminos —dejar el código en secundario cruzando niveles, o devolverlo entero a terciario— arreglaban la coherencia perdiendo el escalón que faltaba.

**Por qué esto invierte el argumento anterior sin contradecirlo**: la objeción a `Cream/400` era que, con solo dos niveles, el secundario se comía el papel del apagado. En cuanto existe el tercero, `Cream/500` se queda haciendo ese trabajo y la objeción cae.

#### Reparto de los 151 usos de `--muted-foreground` (27-ago-2026)

El inventario reveló que dentro de un solo token convivían **ocho papeles distintos**, no dos niveles mal repartidos. El reparto se hizo por papel, no por contraste.

| Rol | Usos | Destino | Por qué |
|---|---|---|---|
| Cuerpo de páginas legales | **27** | `--foreground` | `/terminos` y `/privacidad` renderizaban **todo** su contenido de lectura en el token de apoyo. No había ni un `text-foreground` en el cuerpo. Ahora esos párrafos y listas están a 13.70:1 en vez de 5.63:1. |
| Apoyo, rótulos, interactivos, iconos | **110** | `--muted-foreground` | El caso central: descripciones, metadatos, helper text, rótulos de sección, estado de reposo de lo clicable. Incluye los 4 de metadato de las páginas legales («Última actualización» y footer), que **sí** deben quedarse atenuados. |
| Placeholders y decoración | **10** | `--subtle-foreground` | 8 placeholders (`input`, `textarea`, `select` y los 5 botones de fecha sin elegir) y 2 decorativos (puntos del spinner, borde de hover del selector de avatar). Un placeholder que pesa igual que un valor real hace que el campo vacío parezca relleno. |
| Destino de hover | **4** | sin tocar | `badge.tsx` (2 variantes) y los 2 enlaces legales de `/settings` usan `hover:text-muted-foreground`: el texto **se apaga** al señalarlo, al revés que los otros 11 interactivos. Puede ser deliberado en el badge; queda en Pendientes. |

El inventario completo, uso por uso y agrupado por pantalla, se generó con un clasificador reproducible sobre `grep`; el recuento por rol y pantalla está en el commit que introdujo el reparto.

**Y un hallazgo estructural que sigue abierto**: la escalera de oscuro queda desequilibrada (2.60 de hueco entre normal y secundario, 6.11 entre secundario y terciario) y **no se puede equilibrar solo con `Cream`**, porque la rampa no tiene ningún paso entre `400` y `500` — un salto de L de 0.1806, el mayor de toda la familia, mientras que `200`→`300` es de 0.0087. De hecho `Cream/300` no es un escalón de luminosidad sino un tinte cálido de superficie con número de rampa (+0.0181 de croma a igual L). `Cream` se diseñó para vivir en la mitad clara (ver Rampas de color) y aquí se le pide cubrir primer plano sobre fondo oscuro, que es justo el tramo que no tiene. `Neutral` sí está bien espaciada —pasos regulares de ~0.085, y su `300` da los 9.06:1 que faltan— pero es más griseada y choca con «mantenemos calidez también en oscuro». Ver Pendientes.

Verificado en el navegador midiendo con canvas, no parseando `getComputedStyle` — devuelve `lab()` y parsear la cadena da contrastes falsos sin lanzar error.

### Segunda sincronización: la auditoría a11y llega al código (28-ago-2026)

La auditoría WCAG 2.2 AA del 26-ago se corrigió en Figma y quedó en `design/token-divergences.json` como «pendiente · gana figma». Hoy el código la alcanza y esas tres entradas salen del registro (queda `--secondary`, que es otra decisión):

| Token | Antes | Ahora | Paso | Contraste |
|---|---|---|---|---|
| `--input` light | `#E1D6C6` | `#917A6D` | `Neutral/500` vía `border/strong` | 1.33 → **3.75:1** |
| `--input` dark | blanco/12 % | blanco/36 % | `white-alpha/36` | 1.39 → **3.32:1** |
| `--primary` dark | `#315837` | `#547959` | `Green/600` | 2.99 → **3.82:1** |
| `--ring` dark | `#315837` | `#547959` | `Green/600` | sigue a `--primary` |
| `--chart-1` dark | `#315837` | `#547959` | `Green/600` | arrastrado, no decisión propia |

Y las clases que la auditoría pedía: `button.tsx` outline pasa de `border-border` a `border-input` (y cae `dark:border-input`, ya redundante), `switch.tsx` pierde `dark:data-unchecked:bg-input/80` (la pista apagada va con `bg-input` a secas en los dos modos) y los dos checkbox nativos de `/settings` pasan a `border-input`. Los oklch de tres decimales hacen ida y vuelta exacta al hex de Figma, verificados con la conversión del propio `token-map.mjs`.

**El puente de `--input` cambió de dueño.** Lo llevaba `color/border/component` (`#E1D6C6`, blanco/12); lo que el código pinta ahora es `color/field/border` (≥3:1), así que el `codeSyntax` se movió a él, los 5 especímenes de `Preview Dark` de Input, Select y Textarea que aún lo usaban se repuntaron, y `border/component` queda a **cero bindings** — candidato a retirarse, dicho también en su descripción. `color/fill/sunken` pierde a su vez la contraparte: los rellenos oscuros `bg-input/30·50` parten ahora del blanco al 36 % (10,8 % y 18 % efectivos, antes 3,6 % y 6 %), así que **campos y outline en oscuro se aclaran un punto**. Asumido: es la misma custom property que el borde; si algún día duele, se parte en dos props como se hizo con `--brand` — la forma exacta del conflicto abierto de `--secondary`.

De la pasada salió una leyenda mentirosa: `card/field/border` en `Foundations - Color` decía «L/D border/component» cuando el alias real es `color/border/strong` desde el 27-ago — reescrita. Las leyendas del swatch son texto estático y no siguen a la variable; ya pasó con `brand/primary-text` (ver Contraste).

### El préstamo de `--category-amber` se devuelve (28-ago-2026)

`color/icon/category/3` se perdió al reducir `color/` a grupos de rol (27-ago) mientras su custom property seguía viva en `giftImages.ts` — y el mapa no lo delató porque `color/icon/warning`, que resuelve a los mismos primitivos siendo otro rol, se quedó con su `codeSyntax var(--category-amber)`: verde en la tabla, mentira en el rol. Recreado tal como el pendiente prescribía — alias a `Amber/800` (claro) y `Amber/500` (oscuro), scope de icono, descripción con sus consumidores — y el puente devuelto a su dueño: `icon/warning` queda sin `codeSyntax`, que es lo que le corresponde (la campana hereda el color del texto; no hay ningún icono de aviso con clase propia en el código). Tarjeta nueva `card/icon/category-amber` en `Foundations - Color` para mantener el 1:1 tarjeta↔token, y las descripciones de `Amber/800` y `Amber/500` nombran ahora a sus dos consumidores.

De la pasada salió el hueco real del snapshot: llevaba **una variable de menos desde el 27-ago** — `color/border/strong`, creada ese mismo día minutos después del volcado. Un diff de nombres Figma↔snapshot lo cazó; añadida, y el mapa vuelve a contar las 373.

Moraleja doble para la próxima reducción de grupos: antes de retirar un token con `codeSyntax`, comprobar que su custom property muere con él — aparcar el puente en un token vecino del mismo valor deja el mapa en verde diciendo el rol equivocado. Y tras crear variables, regenerar el snapshot **aunque la pasada parezca cerrada**: `border/strong` estuvo un día entero sin existir para el mapa.

### El apagado de los campos deja el alfa (28-ago-2026)

`Input` y `Textarea` eran los dos únicos componentes donde deshabilitar pinta color, y lo hacían con alfa sobre `--input` (`disabled:bg-input/50` y `dark:disabled:bg-input/80`). La sincronización a11y los dejó en evidencia: con `--input` en `Neutral/500`, el 50 % en claro pasó de velo crema a **marrón medio**, y el 80 % en oscuro de blanco/9,6 % a blanco/28,8 % — el compuesto dependía de un token cuyo trabajo ahora es otro (ser borde a 3:1). Es el caso contra el alfa de la regla del 25-ago con una vuelta más: el contraste del compuesto no solo depende de lo que haya detrás, también de lo que el token base decida ser mañana.

Nace `--field-disabled` (`Cream/200` `#EFEAE2` en claro, `Neutral/800` `#302621` en oscuro — los pasos sólidos que `color/fill/field-disabled` prescribía desde el 25-ago), los dos componentes lo adoptan con un único `disabled:bg-field-disabled` para ambos modos, y el token recibe su `codeSyntax`. El puente va en el semántico `color/fill/field-disabled`, como su asiento prescribía — no en la capa de componente `color/field/fill-disabled`, al revés que el borde (`var(--input)` lo lleva `field/border`): la asimetría es deliberada, cada puente vive donde su asiento lo dejó escrito, y unificarla es parte de la revisión pendiente de `color/field/*`.

### La terracota se parte como el verde: nace `--brand-secondary` (28-ago-2026)

La última divergencia declarada del registro era también el único conflicto del mapa: `color/fill/brand-secondary` (`#C56A3E`) y `color/text/brand-secondary` (`#A44C1D`) reclamaban los dos `var(--secondary)`, que solo podía darle la razón a uno. Es la misma enfermedad que el verde curó el 26-ago con `--brand`, y se cura igual: `--secondary` queda como **relleno** — sus 11 usos (badges, botón secondary, ilustraciones de la landing, tinte de categoría) no cambian ni un bit — y nace `--brand-secondary` como **primer plano**: `oklch(0.52 0.13 45.3)` = `Terracotta/1000` `#A44C1D` en claro, y en oscuro coincide con `--secondary` (la prop existe por el modo claro).

Los cuatro usos migrados de `text-secondary` a `text-brand-secondary`: la etiqueta de `BrandStoreLink`, el badge de marca favorita en la card de generación y en ideas guardadas, y el glifo de la categoría terracota de `giftImages.ts`. Los tres primeros eran **faltas de AA reales en claro** — 3.55–3.70:1 con 4.5 exigidos, las mismas que la auditoría del Store Link Chip ya había corregido en Figma — y pasan a 5.38–5.61:1. El glifo (decorativo, exento) sube de 3.11 a 4.72:1 y de paso alinea las tres categorías: verde→`--brand`, ámbar→`--category-amber`, terracota→`--brand-secondary`. Los bordes `border-secondary/40` se quedan: decorativos, 1.61:1, visualmente idénticos al `border/brand-secondary` de Figma (1.63:1).

Con el `codeSyntax` de `color/text/brand-secondary` movido a `var(--brand-secondary)`, **el registro de divergencias queda vacío y el mapa sin conflictos por primera vez**. Lo que salga en rojo a partir de aquí es nuevo de verdad.

### El grupo de campo se monta: página `Field Group` (28-ago-2026)

Input, Textarea y Label eran especímenes sueltos, así que los dos tokens del patrón de formulario no tenían destino. La página nueva `Field Group` (la 30ª de componente, con la anatomía completa: Header con `meta/fuente` a `PersonForm.tsx:111`, `nota/divergencia`, vlabels y validación claro/oscuro) los resuelve a la vez: el set `Field Group` (State=Default/Error) consume `space/field/gap` (el `space-y-2` entre label, campo y error) y el especimen `Formulario` de dos grupos consume `space/field-group/gap` (el `space-y-5` entre campos).

Todo verificado contra el código, no inventado: el label baja a 12px porque los formularios usan `Label` con `text-xs`, el placeholder es el real de `PersonForm.tsx:115` («Cumpleaños, Aniversario…»), el mensaje de error es el literal de `schemas.ts:33` («Etiqueta obligatoria») en `text-xs` `color/text/danger`, y el campo en error es la variante `State=Error` que Input ya tenía. La `nota/divergencia` deja claro que **en código no existe un componente FieldGroup**: es un `div space-y-2` repetido en los formularios con `aria-invalid` + `aria-describedby`, y el set es una reconstrucción — el mismo estatus que Sidebar Link.

### Preparación para Figma Community (10-sep-2026)

El archivo pasa de librería interna a archivo publicable. Lo que cambió, y las decisiones que lo sostienen.

**Estructura: 40 → 47 páginas, en cinco bloques.** `Cover`, `Start here`, `About PickPal`, divisor, `FOUNDATIONS` con `01 · Color`, `02 · Typography`, `03 · Space, Radius & Elevation` y `04 · Iconography`, divisor, `COMPONENTS · ATOMS` con sus 10, `COMPONENTS · MOLECULES` con sus 20, divisor, `APPENDIX` con `Design decisions` y `Changelog`. Antes las 30 páginas de componente iban en una sola tirada alfabética con átomos y moléculas entremezclados: el índice los separaba y el orden de páginas no. **Renombrar y reordenar una página no toca ningún enlace del índice**, porque los 37 son `hyperlink` de tipo `NODE` a un id de página; lo que no se actualiza solo es el rótulo, que es texto aparte.

**Separador `·` y no `-` en los nombres de página.** Es la convención que el propio archivo ya usaba en su prosa (`Fuente: … · Revisado: …`) y la de los otros archivos del autor.

**`Field Group` es una molécula, así que son 10 átomos y 20.** Envuelve un `Label`, un control y un mensaje de error, y los tres son átomos con página propia. Lo decide esa composición, no que no tenga componente detrás: `Checkbox` y `Spinner` tampoco espejan un archivo dedicado y son átomos.

**Las 33 descripciones de componente que faltaban, escritas.** 26 de los 27 sets y los 6 sueltos estaban vacíos, que es justo lo que Figma enseña en el panel de Assets y en cada instancia que coloca un consumidor. Se redactaron con la fórmula de `figma-tokens.md`, verificando cada afirmación contra el archivo fuente del componente. El archivo pasa de 67 a 99 componentes con descripción, y la regla se extiende de variables a componentes en `figma-tokens.md`.

**Pase de acentos: 89 nodos de texto.** El archivo escribía `codigo`, `pagina`, `atomo`, `explicito` y otras 78 palabras sin tilde, 219 apariciones. Se corrigieron con una lista de 82 palabras aplicada por palabra completa, más tres correcciones de contexto (`Como usar` → `Cómo usar`, `se creo` → `se creó`, `no cambio` → `no cambió`). **Dos trampas que costaron intentos**: `indexOf('')` devuelve 0, así que el guardado contra rutas tomaba por barra el inicio y el fin de cadena y saltaba seis nodos legítimos; y una palabra en mayúsculas (`CORRECCION`) se convertía en capitalizada en vez de en mayúsculas. Las dos protecciones que sí hacen falta: no acentuar dentro de un slug (`space/menu/padding-x` no es prosa) y dejar el `menu` de la página de iconos, que es el nombre de un glifo de Lucide. El plural de `-ón` sale gratis con el límite de palabra: `excepcion` lleva tilde y `excepciones` no.

**Higiene.** Se borró el frame duplicado `Preview Light` que la página `Select` tenía como quinto hijo de primer nivel, donde ninguna otra página tiene nada. El especimen `jorge@email.com` del `Sheet` pasa a `ana@example.com` (dominio reservado por la RFC 2606, no puede resolver a un buzón real) y las iniciales `JM` del `Avatar` a `AR`. Las 41 secciones del archivo tenían cuatro combinaciones distintas de bindings y ocho llevaban el `#444444` por defecto de Figma; ahora las 41 vinculan `fills` a `color/bg` y `strokeWeight` a `border-width/default`. Los nombres de sección se uniforman a `Foundations · …` y `Appendix · …`.

**Portada a 1920 × 1080, que es lo que Figma pide para una miniatura.** Antes medía 900 × 560 y llevaba el logo como dos vectores crudos, no como instancia de `LogoMark`. Ahora: rejilla de 8 columnas (96 + 8×188 + 7×32 + 96 = 1920 exacto), relleno vinculado a `color/fill/brand` con la sección forzada a modo Light, wordmark en Fraunces SemiBold 192, seis chips de métrica con padding, radio y trazo vinculados a la capa semántica, y un panel de app partido en mitad Light y mitad Dark con instancias reales de `Upcoming Date Card`, `Person Card` y `Toast`. **El modo importa más que el binding**: con la sección en Dark, `color/fill/brand` resuelve a `Green/600` y el wordmark cae de 14,55:1 a 4,59:1. **Y el `currentColor` del logo necesita override**: sobre el verde de marca hereda un verde oscuro y desaparece, así que en la portada va a `color/icon/on-brand`.

**La portada se ambienta en regalos con lo que hace la app, incluidas las imágenes.** El primer intento fue una fila de 13 fichas de categoría con glifos de Lucide sobre tinte, y se descartó: a 56 px sobre una portada de 1920 los glifos no se entienden y la fila se leía como una barra de herramientas. El panel tampoco ayudaba, porque enseñaba dos tarjetas de fecha y un aviso de guardado, o sea nada del producto. Ahora cada mitad es **una pantalla de verdad**: la ficha de Ana Ruiz arriba y dos ideas de regalo debajo, que es el flujo de `/seres-queridos/[personId]/gifts`. La ficha se estira a los 548 px del interior y las dos tarjetas caben a 266 px cada una; la pila mide 615 px sobre los 624 disponibles. Las dos ideas llevan título, etiquetas, precio y foto distintos: dos tarjetas idénticas en una portada se leen como un fallo de duplicado, no como un espécimen.

**Las imágenes son el nivel bueno de cada componente, no el respaldo.** La cabecera de una idea tiene dos niveles (`docs/ia-regalos.md` · «Cabecera visual por idea»): foto de Pexels si la búsqueda devuelve algo, y si no el glifo de categoría sobre tinte. El avatar es igual: en el producto es una URL de DiceBear construida al renderizar, y el archivo solo tenía las iniciales de reserva. El espejo enseñaba el peor caso de los dos. Ahora la portada lleva las dos fotos de Pexels, traídas con la misma llamada que hace `attachStockImages`, y un avatar real de DiceBear 9.x en estilo `dylan` con los rasgos fijados igual que en `AvatarPicker.tsx`. **El avatar va como relleno de imagen del círculo, no como vector**, porque Figma no deja añadir hijos dentro de una `INSTANCE` y tanto `Avatar` como `Person Card` lo son; el producto también lo pinta como `<img>`, así que el espejo es fiel.

**Atribución obligatoria, descubierta en los metadatos del PNG.** El estilo `dylan` de DiceBear es un remix de un archivo de Figma Community de **Natalia Spivak** con licencia **CC BY 4.0**, que exige crédito. Las fotos son de **Harvey Tan Villarino** y **Gosia K** en Pexels, cuya licencia no lo exige. El bloque «Credits» de `Start here` nombra a los tres, y ese crédito no se puede quitar mientras el avatar siga en la portada.

**Meter un bitmap en este archivo tiene dos obstáculos, y el segundo es silencioso.** `figma.createImageAsync` solo acepta los dominios de la `allowedDomains` del plugin, que son sus puertos locales y su relay: ni `images.pexels.com` ni un servidor propio en `http://localhost:9225` funcionan, porque el plugin cargado no reconoció ese puerto pese a estar en el manifiesto en disco. Queda pasar los bytes a `figma.createImage`. Y ahí está el problema: **una carga de base64 de ~20.000 caracteres llega alterada por el canal de la herramienta**. Con 8 caracteres de más el JPEG ni se crea y el error es «Image type is unsupported»; peor aún, una corrupción más adelante en el archivo **sí crea la imagen** y el fallo solo se ve al mirar el render, como una banda de píxeles rotos a media foto. Fue exactamente lo que pasó con la primera foto de auriculares. La forma que funciona es **hexadecimal con tres guardas dentro del plugin**: longitud esperada, suma de comprobación de los bytes y marcadores de formato (`ffd8`/`ffd9` en JPEG, la firma de 8 bytes en PNG) antes de llamar a `createImage`. Y después, **captura de pantalla**: las guardas cazan el transporte, no la calidad de lo que se ve.

**Deja de ser cierto que el archivo no tiene ningún relleno de imagen**: lo afirmaban «Start here» y «About PickPal», y las dos frases ya se corrigieron. Con la fila de categorías fuera, el panel crece a 692 px y su borde superior alinea con el del logo en y 96.

**`opsz` no se puede escribir por API.** El eje óptico de Fraunces se queda en 9 en todo el archivo, incluido el wordmark de 192 px de la portada y `Display/Display 1` a 72 px. `setRangeFontVariations` y `fontVariations` fallan con «object is not extensible». Es un defecto conocido y sin arreglo desde el plugin. *(Corregido el 26-sep-2026: el 9 es solo el valor que se lee; Figma aplica el tamaño óptico según el cuerpo, así que el wordmark de 192 px sí se pinta con el corte de cartel. Ver «Portada «Marta would love ___» y logos de tienda».)*

**Cifras corregidas en este documento.** La capa semántica son 137, no 136, y el archivo 373, no 372. Y **`color/Green/850` ya no existe**: la rampa Green tiene 11 pasos, 50–950, no los 12 que este documento describía. Tres pasajes lo siguen citando (la nota sobre consolidar pasos no estándar y dos filas de la tabla de `-solid`); son prosa histórica correcta en su fecha, pero las dos filas de tabla afirman un valor presente y hay que remedirlas.

**Lo que queda fuera de esta pasada, y por qué.** La página `Screens & prototype` **no se creó**: una página vacía con ese nombre promete pantallas que el archivo no tiene, y montarlas es un trabajo de diseño, no de documentación. Los 308 rectángulos `Icon Left`/`Icon Right` siguen siendo rectángulos y no instancias, que es un pendiente ya abierto con su propia decisión. **`Theme Toggle` deja de ser la excepción**: se le construyó su component set (propiedad `Icon = Moon | Sun`, montado sobre `Button Icon` Ghost/Icon-Sm como hace el cierre del `Sheet`) y su frame de validación en claro y oscuro. Las 30 páginas de componente tienen ya componente y validación, y el archivo pasa a 28 sets y 34 componentes publicables. Al crear un set con `combineAsVariants` las variantes quedan una encima de otra y el set mide lo que una sola: hay que colocarlas y **redimensionar el set**, que recorta lo que se sale sin avisar. Los 21 asientos de `Design decisions` conservan su voz de cuaderno de trabajo, con fechas y notas de corrección; su título y su entradilla sí se reescribieron. Y **la licencia del archivo no está decidida**: no se escribió ninguna en la portada ni en `Start here`. El desajuste de nombre que lo frenaba ya no existe — el 19-sep-2026 el repositorio pasó a acreditar «Jorge Molina Fuster» en `LICENSE` y en el README, la forma completa de lo que el archivo abrevia como «Jorge Molina»—, así que queda solo elegir la licencia del archivo antes de publicar.

### La página de pantallas y prototipo (11-sep-2026)

El archivo deja de ser solo una librería. La página `Screens & prototype` monta pantallas del producto con instancias de estos mismos componentes, que es lo único que demuestra que el sistema compone y no solo cataloga. Va después de `About PickPal` y antes del primer divisor.

**La especificación de montaje existía y era de fiar, pero no estaba verificada.** La escribió un agente leyendo el código; el que debía comprobarla murió al alcanzarse el límite de uso, así que entró sin criba mientras las otras siete sí la pasaron. Se comprobó a mano antes de construir y sus tres afirmaciones bloqueantes eran ciertas: `Button` tiene `Size=Md` y `Size=Lg` idénticos a 36 px, los huecos `Icon Left`/`Icon Right` son booleanos con un `RECTANGLE` dentro en vez de una propiedad de intercambio, y `Sidebar Link` no expone el icono.

**Lo que NO se hizo, y por qué.** La especificación pedía seis cambios de librería antes del primer marco. Se rechazaron los dos más caros. Reestructurar el eje de tamaños de `Button` cambia la API pública de un set de 54 variantes con instancias por todo el archivo, y es una decisión abierta del usuario; los botones se dibujan a 36 px y la divergencia de 4 px queda anotada en la cabecera de la página. Añadir propiedades de intercambio de icono a `Button` y `Badge` obliga a sustituir 108 rectángulos por instancias, que es el pendiente de huecos de icono, también sin decidir; los CTA van sin icono y también queda anotado.

**Y lo que sí hizo falta, que resultó ser mucho menos.** Los tres iconos distintos del sidebar no necesitan propiedad ninguna: basta con `swapComponent` sobre la instancia anidada de cada `Sidebar Link`, que es un override de instancia y no toca el máster. Es la misma técnica del `Theme Toggle`. Tres piezas sin componente —las fichas de tipo de regalo, las filas de ajustes y la hoja de navegación móvil— se dibujan como geometría local, que es lo que la propia especificación permite para chrome sin componente.

**Nace `space/section/gap-hero` = 64**, aliasando `spacing/64`, con scope `GAP`. El ritmo vertical de la landing (`py-16`, `gap-16`) aparece tres veces en un solo marco y la tríada semántica se detiene en 32; un primitivo no sirve porque están ocultos al publicar y sin scope. Es la única variable que esta página añade.

**Los tres pictogramas de la landing nacen como componentes**, generados desde el SVG en línea de `landing/StepIllustrations.tsx` igual que los 66 iconos se generaron desde `node_modules`: `illustration/loved-ones`, `illustration/reminders` e `illustration/gift-ideas`, en una sección propia de `04 · Iconography`. Los rellenos se vinculan por color marcador: `fill-accent` a `color/fill/component`, `fill-primary` a `color/fill/brand`, `fill-secondary` a `color/text/brand-secondary` y **`fill-chart-3` a `color/icon/category/3`**, que es una decisión, no una equivalencia: en Semantic no hay familia `chart/*`.

**Trampa de API que costó una pasada.** El objeto que devuelve `figma.variables.setBoundVariableForPaint` **no admite asignación de propiedades**: `paint.opacity = 0.15` se pierde en silencio y el relleno queda al 100 %, que es lo que convirtió el tinte suave de las cabeceras de idea en bloques de color sólido. Hay que construir el paint entero, `Object.assign({}, bound, { opacity })`. Es la misma familia de fallo que los ejes de fuente variable.

**Estado: treinta marcos en tres anchos, quince claros y quince oscuros.** Siete pantallas de escritorio a 1440 —landing, acceso, agenda, seres queridos, ficha de persona, ideas de regalo y ajustes—, cuatro de tableta a 1024, y tres de móvil a 390 más la hoja de navegación como overlay. **Cada sección se lee en dos filas: la clara arriba y su gemela oscura justo debajo, cada marco alineado en la misma columna que el suyo** (relleno 40, separación 120, la misma que ya separaba los marcos en horizontal). El recorrido de escritorio pasa por las siete y vuelve a la agenda; el de móvil repite el mismo camino y añade la hoja de navegación. **Y cada recorrido tiene su gemelo oscuro**, `· oscuro`, que visita las mismas pantallas sin saltar al tema contrario.

#### Las filas oscuras se completan y el tema deja de saltar (13-sep-2026)

Hasta aquí los oscuros eran seis, estaban **al final de la misma fila** que los claros —no debajo— y tres de ellos no existían: la tableta no tenía ni una pantalla oscura. Se montaron los nueve que faltaban clonando la clara y fijándole `Semantic` en modo Dark con `setExplicitVariableModeForCollection`, que es el mismo mecanismo que ya usaban los seis anteriores.

**`clone()` se lleva también las reacciones, y ahí está el destrozo silencioso.** Los nueve clones nacieron apuntando a las pantallas **claras**: siete enlaces que sacaban del recorrido oscuro al primer clic. Y duplicó los dos puntos de inicio conservando el nombre, así que el archivo tenía dos «PickPal · recorrido principal» y dos «PickPal · móvil · menú». Lo primero se reenlazó al gemelo oscuro; lo segundo se resolvió renombrando los dos nuevos con el sufijo `· oscuro`.

**Una reacción tiene `action` y `actions`, y la que manda es la plural.** Reescribir solo `action` —la singular, obsoleta, que es la que se lee cómodamente— hace que `setReactionsAsync` **resuelva sin error y no cambie nada**. Los siete primeros reenlaces se dieron por hechos porque el script registraba la intención, no el resultado; la segunda pasada construyó `{trigger, actions}` y **comprobó leyendo de vuelta**, que es la única forma de saberlo. El setter síncrono no es alternativa: con `documentAccess: dynamic-page` lanza y remite a la versión asíncrona.

**Los cinco oscuros de escritorio que ya existían nunca tuvieron reacciones**, así que el recorrido oscuro moría en la agenda. Se espejaron las del claro localizando el nodo gemelo **por ruta de índices de hijo**, no por nombre —hay tres `Sidebar Link` distintos en la misma pantalla—, y cinco de los seis casaron. El sexto, `hotspot/agenda-marta`, no existía en el marco oscuro: su capa `Hotspots` entera se clonó desde el claro. El tinte de las cabeceras de idea, que es el fallo clásico de `clone()` en este archivo, aquí no aparece: desde que llevan foto son rellenos `IMAGE` a opacidad 1 y sobreviven a la copia. Lo que sí se perdió fueron opacidades de trazo —31 en seres queridos de tableta, 36 en la ficha de persona—, repuestas comparando el árbol clonado con el original nodo a nodo.

**La tableta no estaba en la especificación y resultó ser un layout de verdad.** A 1024 la barra lateral ya está —`hidden lg:flex`, y `lg` es 1024— pero el panel de regalos no, porque pide `xl` (1280); y la lista de fechas deja de estar limitada a 480 por la misma razón. Las rejillas cuentan columnas distintas en cada ancho: seres queridos 4 y 3, ideas de regalo 3, 3 y 1, ideas guardadas 3, 2 y 1. Los marcos de tableta se derivan clonando el de escritorio y aplicando esas reglas, no redibujando.

**La tableta pasa a ser una propuesta, y es la primera vez que este archivo propone en vez de espejar.** Los cuatro marcos de 1024 ya no dibujan lo que el código hace hoy: quitan la barra lateral y ponen la cabecera con menú de hamburguesa, la misma de móvil. El argumento del ancho es el menor —el contenido pasa de 784 a 1024 px y con eso las tarjetas de idea dejan de recortar «El Corte Inglés» en un botón de 90 px—. El de fondo es que **la franja 1024–1279 es hoy el único sitio donde hay barra lateral pero no panel de regalos**, porque el panel pide `xl` (1280) y la barra sólo `lg` (1024): la barra sin el layout maestro-detalle para el que existe. Con el cambio, cada franja tiene un patrón de navegación entero en vez de uno a medias.

En el código son tres intercambios de clase, ninguno estructural: `app/(app)/layout.tsx:29` `hidden lg:flex` → `hidden xl:flex`, `layout.tsx:61` `lg:hidden` → `xl:hidden`, y `components/gifts/GiftsPanel.tsx:633` `lg:hidden` → `xl:hidden` para la barra fija que aparece al hacer scroll. **Mientras no se hagan, esos cuatro marcos van por delante del código.** El descargo se decía dos veces —una nota ámbar sobre la propia sección y la nota de breakpoints de la cabecera— y **el 13-sep-2026 se retiró**: la ámbar se borró y los cuatro marcos volvieron a `y = 40`, que es donde arrancan las secciones de escritorio y de móvil, con la sección ajustada de 1682 a 1446 px y la de móvil subida para conservar los 40 px de separación; la de la cabecera se reescribió para explicar los tres anchos y las columnas de cada rejilla **sin** presentarlos como provisionales. El pendiente sigue dicho donde le toca, en la lista «What is open» de `07 · What shipped, what is next`.

**Y un defecto de componente que sólo asoma al ensanchar.** El badge de relación de `Person Card` está posicionado en absoluto con constraints `MIN/MIN` y era el primer hijo, así que ni seguía el borde derecho ni se pintaba por encima del avatar. En el código es `absolute top-3 right-3 z-10`. Corregido en el componente —constraints `MAX/MIN` y último en la pila—, y las doce instancias de las dos pantallas de seres queridos se recolocaron solas a 12 px del borde. A 272 px de tarjeta el error no se veía; a 309 el badge se metía debajo del avatar. Las posiciones de un hijo absoluto **no se pueden sobrescribir en la instancia** (`relative-transform` está bloqueado), así que el arreglo tenía que ser en el máster de todas formas.

**`clone()` pierde los overrides de relleno de las instancias.** Los títulos, los textos de insignia y los de precio sobreviven a la copia; el `opacity` sobre un paint vinculado a variable, no. Las nueve cabeceras de idea del marco de tableta volvieron al 100 % al clonarse desde el de escritorio, y el fallo es mudo: hay que volver a aplicar el tinte y **comprobarlo con una captura**, porque leer `fills[0].opacity` es lo único que lo delata.

**Tres correcciones de librería que salieron de componer.** `Sidebar Link` centraba el contenido en sus cuatro variantes mientras el código alinea a la izquierda, y su separación era 8 y 10 px donde el código usa 8 en escritorio y 12 en móvil. Y la variante `Platform=Mobile, State=Active` pintaba la fila activa con `color/fill/brand` sólido y texto `on-brand`, cuando `MobileNav.tsx` usa `bg-primary/10 text-brand`: ahora es `color/fill/brand-subtle` con `color/text/brand` y `color/icon/brand`. Las tres se arreglaron en el componente, no en las instancias.

**Seis gemelos en oscuro, no quince, y el criterio importa.** El oscuro ya está cubierto pieza a pieza: las 30 páginas de componente llevan cada una su marco de validación. Lo que un gemelo de pantalla añade es si los tokens aguantan cuando se apilan muchas piezas, así que se eligen los sitios donde esa pregunta tiene respuesta propia. Los tres primeros: la Agenda, única composición maestro-detalle; Ajustes, que contiene el interruptor de tema y por tanto se documenta a sí mismo; y la hoja de navegación, superficie elevada sobre velo con desenfoque, que es donde falla la rampa —de ahí salió el 1,11:1—. Los tres añadidos el 11-sep: Ideas de regalo, porque nueve fotografías sobre página oscura no lo responde ninguna página de componente; Seres queridos, por los fondos saturados de los avatares; y la ficha de persona, la mayor superficie de tokens del archivo en un solo marco. Fuera quedan los cuatro de tableta —muestrario de layout, no de color— y el de acceso, cuyo interior es de Clerk.

**Y el gemelo encontró un fallo, pero era mío, no del oscuro.** La ficha de tipo de regalo seleccionada no se distinguía de las otras tres. Medido: `color/fill/component` sobre `color/bg/surface` da **1,19:1 en claro y 1,17:1 en oscuro** — igual de flojo en los dos modos, así que no era un problema de la rampa oscura. Era que yo había dibujado **una sola** de las tres señales que el código da al estado seleccionado: `GiftsPanel.tsx:459` pinta `bg-muted` **más** `border-border` a alfa completo frente a `border-border/50` de las no seleccionadas, **más** `text-foreground` frente a `text-muted-foreground`. Mis fichas tenían las cuatro con borde al 10 % y todo el texto en secundario. Corregido en los seis marcos que llevan rejilla de tipo; en claro también se lee mejor. **La lección es la de siempre: un estado que se apoya en un relleno de 1,2:1 no está a salvo porque «se vea» — se ve por las otras dos señales, y si las omites al dibujarlo el error no aparece hasta que alguien mira el modo contrario.**

**`clone()` sí conserva los rellenos de imagen.** Las 9 fotos y los 7 avatares de los tres marcos nuevos sobrevivieron a la copia intactos, al contrario que la opacidad de un paint vinculado a variable, que se pierde. La diferencia está en que un `IMAGE` no lleva `boundVariables`.

**Un hallazgo de contraste que sólo aparece en oscuro.** En la hoja de navegación, la fila activa pinta `color/fill/brand-subtle` (#0c2912) sobre `color/bg/surface-raised` (#211914): **1,11:1**. El estado activo se distingue casi sólo por el color del texto, que sí cumple AA con 6,19:1. No es un fallo duro —`aria-current` da la pista programática— pero el indicador visual se apoya en el color del texto y en nada más. Decisión pendiente: o el `brand-subtle` de oscuro sube un paso, o la fila activa gana un borde.

**Y un fallo de código que ninguna página de componente podía enseñar.** El CTA de la tarjeta de fecha se lee «Regalar» en móvil mientras su `aria-label` dice «Ideas de regalo». El texto visible no está contenido en el nombre accesible, que es exactamente lo que exige el criterio 2.5.3, *Label in Name*. Se arregla en el código: o el nombre accesible empieza por la palabra visible, o se quita el `aria-label` cuando el span visible está presente.

**Tres formateadores de presupuesto, tres formatos.** La agenda escribe `40 – 80 €`, la cabecera de ideas `40 – 80 €` y las filas de evento de la ficha `40€ – 80€`, con el símbolo pegado a los dos números. Los tres se reproducen tal cual en los marcos; unificarlos es trabajo de código.

**La maqueta de Clerk reproduce geometría medida, no inventada.** Se midió en la página de acceso en producción: tarjeta de 402 × 525, relleno 32/40, contenido de 322, controles de 32 px con radio 6. Los textos salen de `@clerk/localizations` (`esES`), que es la dependencia que los escribe, no de una traducción propia. Se pinta con nuestros tokens y se anota que Clerk no hereda ninguno; la G de Google y el sello de Clerk no se dibujan.

**El prototipo: 16 reacciones y dos puntos de inicio.** El de escritorio recorre las siete pantallas y vuelve a la agenda, así que ninguna queda inalcanzable —`Seres queridos` lo estaba hasta que se cablearon su fila del sidebar y la ficha de Marta—. Todos los saltos son instantáneos: `docs/design-system.md` § Animaciones prohíbe animar navegación, y el App Router cambia de ruta sin transición. El de móvil repite el mismo camino (agenda → ficha → ideas, con los enlaces de vuelta) y carga la única animación del archivo: la hoja entra desde la izquierda en 200 ms con `ease-in-out`, los mismos de `sheet.tsx`. Los marcos de tableta y los tres gemelos en oscuro quedan fuera a propósito: son muestrario y validación, no camino.

**Tres cosas que sólo se ven al probar el prototipo, no al mirarlo.** Un marco cuyo contenido desborda no scrollea si su `overflowDirection` sigue en `NONE`: el de ideas en móvil tenía 2.036 px de contenido en 844 y se quedaba mudo. El fondo del prototipo nace en negro transparente y hay que escribirle el hex a mano —`#FAF6F1`, el valor claro de `color/bg`—, porque ese campo no acepta variable; si algún día el recorrido se pasa a oscuro, hay que volver a editarlo. Y «fijar posición al hacer scroll» no se puede activar por código, aunque a primera vista lo parezca. `scrollBehavior` no existe en el nodo —la asignación falla con «object is not extensible»—, y el único mecanismo que queda, `numberOfFixedChildren`, es de la era anterior al auto-layout: en un marco con `layoutMode` la asignación se acepta y vuelve a leerse como `0`, y en los marcos donde sí funciona fija **los primeros hijos**, que son los de más abajo en la pila de capas. Un pill flotante necesita exactamente lo contrario. Así que el «Guardado» de las tres fichas de persona, que en el producto es `fixed`, scrollea con el contenido hasta que alguien pulse el candado en la UI de Figma — que es lo único que sabe hacerlo sobre un hijo absoluto de un auto-layout. Por el mismo camino se queda fuera la descripción del flujo: `flowStartingPoints` acepta escritura pero su validación rechaza cualquier clave que no sea `nodeId` y `name`.

**Las tarjetas de idea llevan foto, como en el producto.** La cabecera visual tiene dos niveles (`docs/ia-regalos.md` · «Cabecera visual por idea») y el archivo sólo espejaba el de respaldo: tinte plano más glifo. Ahora las nueve ideas llevan su foto de Pexels, traída con la misma llamada que hace `attachStockImages` —consulta en inglés de 2-4 palabras, `per_page=1&orientation=landscape`, `src.medium`— y el punto de categoría se oculta, que es lo que hace el código cuando hay foto. Una imagen por idea, reutilizada en las 29 tarjetas de las cinco pantallas: escritorio, tableta, móvil y los dos gemelos en oscuro.

**Y los seres queridos tienen cara.** Los 33 avatares de las pantallas eran iniciales sobre un círculo, que es el respaldo de `AvatarFallback`; ahora llevan el dibujo de DiceBear que el producto pinta cuando la persona tiene `avatarUrl`. Se construyen con la misma forma de URL que `buildUrl` de `AvatarPicker.tsx` —estilo `dylan`, semilla `pickpal`, cada rasgo pineado a un valor— variando piel, pelo, color de pelo, expresión, barba y fondo para que las seis personas del reparto sean seis personas distintas. Van como **relleno de imagen del círculo**, no como vector, porque Figma no deja meter hijos dentro de una `INSTANCE`; el producto también lo pinta como `<img>`, así que el espejo es fiel. Las iniciales quedan ocultas, no borradas: siguen siendo el respaldo y el componente las conserva.

Pesan poco: el PNG de DiceBear a 256 px se aplana contra su propio color de fondo y sale a JPEG de 128 px con calidad 74, entre 1,9 y 2,6 KB. Los seis entraron a la primera. **El crédito a Natalia Spivak deja de ser una nota de la portada y pasa a ser estructural**: el estilo `dylan` es CC BY 4.0 y ahora hay 33 avatares suyos repartidos por nueve marcos.

**El canal sigue sin admitir la ruta cómoda, y ahora se sabe por qué.** El manifiesto del plugin en disco (`~/.figma-console-mcp/plugin/manifest.json`) **sí** permite `http://localhost:9223-9232`, y sirviendo las fotos ahí `createImageAsync` debería funcionar; no lo hace porque Figma congela la `allowedDomains` al instalar el plugin y el que corre se instaló con un manifiesto anterior. Recargar la UI no lo arregla: haría falta reimportar el plugin. Tampoco sirve `figma_set_image_fill` del MCP para esto: no resuelve los ids de hijo de instancia (`I257:3286;27:182`), que es justo lo que hay que pintar. Queda `figma.createImage` con los bytes en hexadecimal dentro de `figma_execute`.

**Y las guardas se ganaron el sueldo.** Una de las nueve cargas llegó con **406 caracteres de menos** (11.890 de 12.296). La comprobación de longitud la paró antes de crear nada; sin ella habría entrado una imagen truncada que sólo se ve mirando el render. La receta es la de siempre: longitud esperada, suma de comprobación de los bytes y marcadores `ffd8`/`ffd9`, y **recomprimir más pequeño** cuando una carga falla — por debajo de ~10.000 caracteres de hexadecimal el canal aguanta. Las fotos van a 400 × 128 y calidad 62-68, que es tamaño de cabecera y pesa 3,4-6 KB.

**Lo que la API de plugin no deja tocar.** `overlayPositionType`, `overlayBackground` y `overlayBackgroundInteraction` son de sólo lectura: el overlay de la hoja se queda en `CENTER` —que con un marco de 390 × 844 sobre una pantalla de 390 × 844 es idéntico a manual 0,0— y «cerrar al pulsar fuera» no se puede activar por código. Se suple con una reacción `CLOSE` sobre el propio velo, que es lo que el usuario pulsa.

#### Las trece rejillas pasan a auto layout Grid (13-sep-2026)

Los contenedores que disponen tarjetas en columnas —cinco `Ideas grid`, tres `People grid`, dos `Lead grid`, dos `Store grid` y un `Type grid`— estaban en `layoutWrap: 'WRAP'`. Wrap reparte por ancho disponible: acomoda, pero no promete columnas ni iguala las alturas dentro de una fila. Los otros veintinueve contenedores envueltos de la página —`Badges` y `Marketplace chips` ocho cada uno, `Tags`, `Suggestions` y `Brand chips` cuatro, y un `Actions`— se quedan en wrap, que es el flujo correcto para un grupo de chips que no tiene columnas.

**Las columnas no se estimaron, se dedujeron.** El ancho de cada marco cuadra al píxel con `C × ancho_hijo + (C−1) × gap`, así que la migración reproduce la disposición existente en vez de proponer otra: 2×2 el `Type grid` y los dos `Lead`, 2×6 los dos `Store` —once filas de tienda en dos columnas, la última con un solo elemento—, y 3×3, 4×2 y 3×2 las de tarjetas. Ninguno de los trece cambió de tamaño.

**Tres trampas de la API, y las tres son mudas.** `gridColumnAnchorIndex` y `gridRowAnchorIndex` **son de sólo lectura** —asignarlas lanza `no setter for property`—; la colocación va por `setGridChildPosition(fila, columna)`, que se llama **sobre el hijo**, no sobre el marco, y lleva la fila primero. Y hace falta llamarla: al convertir, Figma deja `gridItemsPositioning: 'MANUAL'` con todos los anclajes a −1, o sea los hijos sin colocar y alineados fuera del marco. Además `layoutMode = 'GRID'` **voltea el alto de HUG a FIXED** por su cuenta: el `Type grid` cayó de 204 a 98 px en la misma línea que lo convertía. Lo único que sale bien solo son las pistas: `gridColumnSizes` nace en `FLEX 1` iguales, que es justo lo que reproduce los anchos.

**Y el Grid por sí solo no iguala las alturas, que era el motivo del cambio.** Las filas nacen en HUG y cada hijo conserva su alto. No hay `STRETCH`: `gridChildVerticalAlign` acepta `MIN · CENTER · MAX · AUTO` y ya está en `AUTO`, que significa «lo que diga el hijo». Quien manda es el `layoutSizingVertical` del hijo, así que igualar una fila es poner en `FILL` a los que se quedan cortos.

**Se pone `FILL` sólo a los hijos más bajos que el más alto de su fila, y esto es una decisión.** Ponérselo a todos es tentador —se probó y la fila no colapsa— pero deja a una fila HUG sin ninguna fuente de alto intrínseco, y en las dos `Ideas grid` de 590 las tarjetas están en `FIXED` a 415 px a propósito: convertirlas en `FILL` devolvería el alto de la fila al contenido. Dejando intacta la más alta de cada fila, la fila mantiene su medida y las demás la alcanzan.

**El resultado son dos cambios visibles y ni un píxel en los once restantes.** En el `Type grid` de móvil dos fichas suben de 84 a 98; en la `Ideas grid` de tableta, dos tarjetas de la tercera fila pasan de 391 a 411 —la tercera mide 411 porque su descripción ocupa tres líneas en vez de dos—. En los otros once las alturas de cada fila ya coincidían. El hueco que gana la tarjeta estirada cae **debajo del pie**, no repartido entre los bloques: su layout interno alinea a `MIN` y sus cinco hijos conservan la misma posición que en una tarjeta sin estirar. Que es exactamente lo que hace el código —`Card h-full` sobre una rejilla estirada, y ningún bloque con `flex-grow`—, así que el archivo deja de diferir aquí.

#### «Mi lista» entra en la página (10-oct-2026)

La lista compartida ([`docs/encargo-lista.md`](encargo-lista.md)) se dibuja en los tres anchos y desde los dos lados. Versiones con nombre en el historial: «My list on the Screens page» (escritorio) y «My list at tablet and mobile».

- **La pantalla del dueño**: `Screen · My list · Desktop 1440` y su gemela oscura, entre Ideas de regalo y Ajustes. Ajustes y su gemela se desplazan una columna y la sección pasa de 10.880 a 12.440 px. Se montó clonando Ajustes y rehaciendo el contenido con piezas de la ficha: las dos tarjetas son copias de «Historial de regalos», con sus mismos tokens y estilos de texto, las filas salen de sus filas y el botón punteado de su «Añadir regalo». Las medidas son las del código: `main` a 1024 (`max-w-5xl`) y rejilla de 616 + 320 con 24 de separación.
- **El lado de quien la lee**: en la ficha de Marta, clara y oscura, «La lista de Marta» va antes de «Ideas guardadas», con un elemento en cada estado: libre, marcado por ti con el aviso de edición, cogido por otra persona, ya regalado y uno que ya no está en su lista.
- **Tableta y móvil**: a 1024, «Mi lista» tiene las mismas dos columnas que en escritorio, porque la rejilla del código empieza en `lg` (1024); a 390 las dos tarjetas se apilan con 24 de separación y el contenido crece por debajo del pliegue. En la ficha de Marta a 390 cada fila se apila como en el código (`flex-col` por debajo de 640 px): las acciones pasan debajo del texto y el aviso de edición a dos líneas. **Al cambiar una fila de horizontal a vertical, el bloque de texto conserva el «crecer» del eje anterior y se estira en alto** (una fila llegó a 546 px y otra perdió el título): hay que poner `layoutGrow = 0` y `HUG` en vertical a sus hijos después del cambio.
- **Tarjeta de lista recibida** («Julián te ha compartido su lista»), en Agenda y Seres queridos a los tres anchos y en los dos temas, como marco local `Incoming list card (local)`. Va con el selector vacío y «Guardar en su ficha» deshabilitado, que es como llega. El selector mide 256 donde hay sitio (`sm:w-64`); a 390 la tarjeta se apila y el selector y el botón ocupan el ancho entero. **Dibujarla destapó un fallo del código**: en la Agenda de escritorio, a todo el ancho, la tapaba el panel fijo de ideas. Se dibujó a 480 dentro de un contenedor con 4 px de margen lateral (`xl:px-1`), alineada al píxel con las fechas, y se corrigió en el código. Al bajar la lista, las zonas de clic `hotspot/agenda-marta` de la Agenda de escritorio y de móvil se movieron lo mismo, medido con la posición real de la lista. La Agenda móvil pasa a desplazarse; la de escritorio se queda recortada en la cuarta fecha, porque si se desplazara el panel de ideas se movería con ella y en el código es fijo. Versión: «Incoming list card».
- **Navegación**: «Mi lista» entra en las diez barras laterales de escritorio y en las dos hojas móviles, con `swapComponent` sobre el icono anidado. En la hoja lleva a «Mi lista» de 390, y desde ahí el botón de menú vuelve a abrir la hoja de su tema.
- **Icono nuevo `icon/book-heart`** en `04 · Iconography`, generado desde el SVG de `lucide-react` con la misma anatomía que los demás (24 × 24, trazo de 2 vinculado a `color/icon`, descripción con la misma fórmula). Son 67, y las siete menciones de «66» del archivo ya dicen 67.
- **Prototipo**: 16 reacciones nuevas, todas comprobadas leyendo `actions[0].destinationId` de vuelta. Los diez enlaces «Mi lista» llevan a la pantalla de su tema, y desde ella se vuelve a Agenda, Seres queridos y Ajustes. La cabecera pasa a 36 marcos y ocho pasos. **La hoja móvil oscura no tenía ninguna reacción**: ni el velo, ni la X, ni «Agenda» la cerraban, así que el recorrido móvil oscuro se quedaba atascado en cuanto se abría el menú. Se le copiaron las tres de la clara localizando cada nodo por su ruta de índices.

**Un relleno vinculado a variable ya no guarda opacidad propia.** La receta de más arriba para los tintes, `Object.assign({}, bound, { opacity })`, hoy relee 1 y pinta el color sólido: la `opacity` de un paint vinculado se recalcula con el alfa que la variable tiene en el modo del nodo. Por eso mismo los bordes del gemelo oscuro leen 0,10, que es el alfa de `color/border` en oscuro y no una pérdida de la copia. El tinte del aviso de edición (`bg-secondary/10`) se resolvió con un rectángulo `Tint` en posición absoluta, vinculado a `color/fill/brand-secondary-solid` y con `opacity` 0,1 **en el nodo**, que sí se conserva al clonar.

**Divergencias asumidas.** «Lo regalo yo» va sin el icono `Gift` y «Regalado» sin `Check`, porque los huecos de icono de `Button` y `Badge` siguen siendo rectángulos (el pendiente de siempre). «Entendido» es `Button` Sm: el código usa `xs` y la librería no tiene ese tamaño. Ya no queda ninguna pantalla de la función sin dibujar. Para que nada de esto llegue a la versión de Community hay que publicar una actualización desde Figma.

### Pasada de portfolio para Figma Community (11-sep-2026)

El archivo se auditó con tres criterios del usuario —que no dependa del código, que lo entienda alguien que no conoce el proyecto, y sin datos que sobren ni información plana— y el mismo día se ejecutó la pasada. El diagnóstico, en una frase: el archivo era sólido por dentro pero estaba encuadrado como *espejo de un repositorio privado* y lo decía unas doscientas veces. Versión con nombre guardada antes del primer cambio: «Before the Community pass».

**Tres decisiones, que cambian la tesis del archivo.** (1) **Inglés en toda la documentación**: descripciones, cabeceras, prosa, rótulos y nombres de capa. El copy del producto —especímenes, pantallas, prototipo— se queda en español a propósito, y About PickPal lo dice. (2) **Fuera el aparato de espejo**: sin `Fuente/Revisado` (32 líneas) ni «Divergencia con el código» como categoría (24 avisos borrados, 8 reformulados como «Note»). El puente con el código vive solo en `codeSyntax`; las descripciones no citan utilidades, custom properties, archivos, versiones ni fechas. La verificación contra el producto se cuenta una vez, en Start here, como método. (3) **CC BY 4.0 y un solo nombre**, «Jorge Molina Fuster», en portada y en el bloque Credits de Start here; el repositorio sigue MIT porque es código.

**Lo que cambió en el archivo.** Reescritas en inglés las 374 descripciones de variable (antes: 90 con clases de utilidad, 58 con custom properties, 24 «Espeja», 9 con historial y 48 sin tilde), las 26 de estilo y las 103 de componente (37 acababan en «Espeja `x.tsx`», los 66 iconos citaban JSX). Reescritas las 30 cabeceras de componente (13 llevaban notas de desarrollo: Checkbox tenía un `<input>` literal, Back Link un informe de bug), las 8 notas conservadas y los 8 avisos de accesibilidad sin sus frases de código. Reescritas Start here (fuera «Conventions», «What is not here» y «A note on language»; cifras al día), About PickPal (la columna «It does not cover» tenía dos puntos que ya eran ciertos desde la página de pantallas), las cuatro páginas de Foundations (fuera `globals.css`, `codeSyntax`, Dev Mode, la colección Medidas y el enlace muerto a «Foundations - Excepciones») y la cabecera de Screens (de nueve bloques a cuatro). **Design decisions** pasa de 21 asientos en voz de cuaderno a **19 decisiones** en inglés, con las cifras verificadas del borrador del 10-sep: se retiran los asientos de herramienta (codeSyntax vacío, coste de mover colecciones, mayúscula por el orden del panel, un primitivo borrado) y se parten en dos los que traían dos decisiones (nombres de color / eje `bg`·`fill`; rampa Amber / dos ámbares). **Changelog se borra**: 24 asientos en seis días de agosto sonaban a log interno, y afirmaba «no hay ninguna entrada posterior» siendo falso; el índice pasa a «APPENDIX (1)». **Portada**: tagline sin la tesis del espejo, copy real en las dos tarjetas de idea (llevaban «Descripción breve de la idea de regalo, hasta tres líneas de texto reservadas» en la miniatura de Community), chips «374 variables · 37 components · 25 text styles», y el panel claro/oscuro baja de 1228 a 1148 px con padding 12 en cada mitad: antes sangraba 64 px por el borde y recortaba «Famil[ia]» y «…en gran[o]»; ahora acaba a 16 px del borde sin cortar nada.

**Higiene.** Los 30 marcos de validación se llaman `Light & Dark` y sus 60 rótulos dicen `Light`/`Dark`; 43 capas que tenían el párrafo entero como nombre pasan a `description`/`body`; el divisor de diez guiones pasa a cinco como los otros tres; las 10 elipses sin nombre de 01 · Color se llaman `dot`; los marcos de pantalla usan nombres en inglés (`Loved ones`, `Gift ideas`). **Nacen tres estilos de texto** para la documentación, `Mono/Annotation` (Geist Mono Regular 10, interlineado 14, tracking 2 %), `Mono/Label` (Medium 11) y `Mono/Table` (Regular 11), aplicados a los 431 textos monoespaciados que iban como override local; el archivo pasa a **25 estilos de texto**. Los pasajes anteriores de este documento que dicen «22 estilos» hablan de la escala del producto y siguen siendo ciertos.

**Cifras tras la pasada**: 47 páginas, 374 variables (166 · 178 · 30), 25 estilos de texto, 4 de efecto, 103 componentes (28 sets + 9 sueltos + 66 iconos), 21 pantallas, 2 recorridos. Un barrido final sobre los 2.913 nodos de texto no encuentra rutas, `archivo:línea`, custom properties, fechas ni «Divergencia»; el único vocabulario de stack que queda es la tabla «Stack» de About PickPal, que es dato de portfolio y no explicación de ningún token.

**Dos trampas de escritura que costaron cuatro timeouts, ya en memoria.** Lo lento no es escribir `characters`, son los `await` entre escrituras: cada uno cede el hilo y Figma reflúe todo lo pendiente, 3–16 s por iteración en marcos con instancias. Precargar las fuentes y escribir en un bucle sin awaits deja 76 párrafos en 875 ms. Y dos `figma_execute` de escritura en paralelo se roban el hilo y agotan los 30 s el uno al otro.

**Formulario de Community, listo para pegar** (actualizado la misma tarde, cuando el archivo pasó a caso de producto; ver la sección siguiente). Título: *PickPal · Product case study & design system*. Categoría: *Design systems*. Licencia: *CC BY 4.0*. Etiquetas: `design system`, `case study`, `design tokens`, `light and dark modes`, `wcag 2.2 aa`. Descripción (inglés):

> My phone reminds me of a birthday on the day, when it is too late to give anything good, and I am worse at the second half: a gift that fits the person. PickPal is the notebook I built to fix that. It keeps the people you care about next to their dates and, when one gets close, drafts nine gift ideas from what you know about them, with a budget for that occasion and links to the stores you actually use.
>
> This file is the case, start to finish: the problem, the decisions made before designing, how a date becomes a gift, what a ten-person private beta changed, six paths not taken, and an accessibility pass with its measurements. Behind it sits the design system that made it hold up: 349 variables in four layers with Light and Dark as real modes, 28 component sets documented on six pages, one per family, 67 icons, 25 text styles and 36 product frames, every screen in Light and Dark, with two click-through flows in each theme.
>
> Documentation in English. The product is Spanish and its copy stays that way, as it ships.

Carrusel, nueve imágenes en este orden: portada; Agenda de escritorio en claro; Agenda de escritorio en oscuro; 01 · Colour; 02 · Typography; 04 · Iconography; **la sección `Button` de `01 · Actions`** (`317:11667`, 1.491 × 2.640); los marcos móviles con la hoja de navegación; el prototipo. La miniatura sigue siendo la sección `Cover Art` (`33:849`, 1920 × 1080), estática: una vista previa de prototipo como miniatura bloquea el carrusel.

**Corrección del 19-sep-2026, verificada contra el archivo.** El séptimo destino decía «la página Button», que no existe desde que los componentes se agruparon en seis páginas por familia: hoy es una `SECTION` dentro de `01 · Actions`. Y **los cuatro puntos de inicio del prototipo seguían en español** —«recorrido principal», «móvil · menú», con sus «· oscuro»— pese a que la pasada de portfolio dejó el archivo en inglés; el nombre del flujo lo ve el visitante en el selector de la vista de prototipo, así que pasan a `PickPal · Main flow`, `· Main flow · Dark`, `· Mobile menu` y `· Mobile menu · Dark`, con la misma convención `· Dark` que los marcos. Los cuatro siguen apuntando a su marco (Landing en claro y oscuro, Agenda móvil en claro y oscuro). Las secciones y las páginas sí estaban todas en inglés — pero eso fue exactamente lo que se miró, y concluir de ahí que «el resto del archivo no tenía deuda de idioma» fue afirmar más de lo comprobado: **los nombres de capa no se habían barrido**. Ver la corrección de más abajo.

**Publicado en Figma Community el 19-sep-2026.** Con eso **se cierra la ventana de renombrado barato**: hasta ahora cambiar el nombre de una variable o de un estilo costaba casi nada —los bindings van por id, el puente con el código va por `codeSyntax` y `token-divergences.json` está vacío—, pero a partir de aquí cualquier archivo que alguien duplique de Community se queda con los nombres del día en que lo duplicó, y un rename posterior ya no le llega. Los renombrados dejan de ser gratis y pasan a ser una decisión con coste hacia fuera: de aquí en adelante, agrupar los cambios de nombre y publicarlos juntos, no goteando.

**Los nombres de capa de la documentación estaban en español (19-sep-2026).** El pase de inglés tradujo el texto visible y no las capas, así que convivían un frame `Vista en contexto` cuyo título pintaba «In context», una `nota` cuyo cuerpo empezaba «The ten brand tokens…» y una `Excepción` cuyo contenido era literalmente «Exception». **101 nodos renombrados, 38 nombres distintos**, todos en páginas de documentación y **ninguno dentro de componente o instancia**, así que no propagó a nada: `cabecera`→`header` (11), `Dark (mode override explícito)`→`Dark (explicit mode override)` (30, uno por página de componente), `nota`→`note`, `muestra`→`specimen`, `regla`→`rule`, `Rejilla`→`Grid`, `tamaño/N`→`size/N`, `regla/*`→`rule/*`, `Claro y oscuro`→`Light & Dark`. De paso, dos grafías: la sección de `01 · Colour` se llamaba `Foundations · Color` mientras sus tres hermanas dicen exactamente lo que su página.

**El criterio, que es lo que hay que recordar**: un nodo de texto cuyo nombre **es** su contenido está auto-nombrado por Figma, y si ese contenido es copia del producto **se queda en español** — el producto es en español y ese es el caso de estudio. Se traduce lo que alguien escribió a mano para organizar la documentación. Por eso siguen en español, y bien, `Título de la idea de regalo`, `Cumpleaños · Familia` o `¿Eliminar cuenta?`, y por eso se quedan también `Section: Fondo` y `Section: Expresión`, que nombran una sección del AvatarPicker por su rótulo real, igual que `Card / Quién es` en las pantallas.

**Lo que sigue abierto.** Rellenar el formulario y exportar las nueve imágenes. Los otros cuatro puntos que esta pasada dejó a la vista se cerraron el 18-sep-2026; ver «Cuatro pendientes de Figma se cierran» más abajo.

### El archivo pasa a caso de producto (11-sep-2026, tarde)

La pasada de portfolio dejó un sistema de diseño presentable, y el usuario señaló lo que le faltaba: **el proyecto tiene que vivir en el Figma como proceso, del origen del problema a la solución**, no solo como catálogo. Se acordó un bloque **Story** de siete páginas delante del sistema, que se queda entero como capítulo «cómo lo construí». Los hechos salen de la página del caso en jorgemolinafuster.com/work/pickpal (origen, beta de diez personas de 24 a 58 años desde el 11 de mayo, unas cuarenta observaciones, cuatro cambios, tres aprendizajes) y del repositorio (430 commits del 24 de abril al 11 de septiembre; por mes 2 · 257 · 79 · 29 · 51 · 12). Cada afirmación de producto se comprobó contra el código antes de escribirla: la memoria de categorías descartadas, la cuota que devuelve el fallo, los cuatro tipos de regalo, las once tiendas y los datos mínimos al proveedor de IA existen tal cual.

**Estructura nueva.** `Cover` · `Start here` · divisor · `STORY` · `01 · The problem` · `02 · Decisions before design` · `03 · From a date to a gift` · `04 · What the beta changed` · `05 · Paths not taken` · `06 · Making it hold up` · `07 · What shipped, what is next` · `Screens & prototype` · divisor · `FOUNDATIONS` … El archivo pasa de 47 a **55 páginas**. **About PickPal desaparece como página**: sus bloques se mudan intactos, con sus estilos y sus enlaces, a las páginas nuevas (`Design principles`, `The palette has a reason` y `Type and measure` a la 02; `How it works` a la 03, reescrito como «Four steps»; `Stack` a la 07), y se borran su cabecera y la tabla «What this file covers», cuyo contenido ya vivía en Start here. Las siete páginas usan la geometría de About (sección 1120, marco 1040 con relleno 40, contenido 960, hueco 64) y solo estilos de la escala: `Eyebrow/Section` en terracota, `Heading/Heading 1`, `Body/Body 2` para la entradilla, `Body/Body 3` para la prosa, `Heading/Heading 4` para las secciones, `Label/Label 1` + `Body/Body 4` en las tarjetas, `Mono/Table` en las tablas. Cero textos sin estilo en el bloque.

**Lo que enseña cada página.** 01: díptico «lo que hace mi móvil / lo que hace PickPal» (una notificación de calendario dibujada frente a una instancia real de `Upcoming Date Card`), la tabla de cinco apaños con su nota de «puntuación propia», y la persona. 02: los principios, el «We are / We are not», la voz y la paleta heredados de About. 03: los cuatro pasos, **cuatro capturas de las pantallas de escritorio exportadas desde el propio archivo** (`exportAsync` JPG a 1x → `figma.createImage`, sin pasar por el canal de la herramienta), el bloque «what the model sees / never sees» y las reglas del filtro y la memoria. 04: la banda de commits por mes, y cuatro tarjetas «what I saw / what I changed» con recortes exportados a 2x de los marcos reales (`Tag Input · intereses`, `Card / Quién es`, una `Gift Recommendation Card`, `Controls` del panel de ideas). 05: seis decisiones con la opción obvia y lo que salió, tres de ellas con espécimen (Budget Slider, dos Store Link Chip, y el botón primario con el texto verde en claro y en oscuro mediante `setExplicitVariableModeForCollection`). 06: la tabla de las siete correcciones AA con ratios, la tira de los seis controles en claro y oscuro con modo explícito, privacidad y sistema. 07: lo abierto, los tres aprendizajes, la captura de la agenda móvil y la tabla Stack.

**Start here y portada.** La entradilla presenta el caso; un bloque nuevo «Read the story in five minutes» enlaza las siete páginas (hipervínculo de tipo `NODE` sobre el título de cada línea, en `color/text/brand`); el grupo OVERVIEW del índice pasa a **STORY (8)** con las siete páginas y Screens; el párrafo «What is inside» y la cifra de páginas se actualizan. La portada dice «CASE STUDY & DESIGN SYSTEM», el tagline pasa a primera persona («I forget birthdays and I am worse at gifts…») y los chips a `Apr–Sep 2026 · 10 beta users · 7 screens · 374 variables · WCAG 2.2 AA · Light + Dark`.

**Tres discrepancias entre la web del caso y el producto, avisadas al usuario.** La web da una paleta vieja (#2D4033 / #D97757 / #FBF7EE frente a los tokens reales #0C2912 / #C56A3E / #FAF6F1); cita el filtro de 30/60/90 días que el producto cambió el 5 de mayo por la ventana fija de cuatro meses; y del botón «Cuéntame» de la beta no queda rastro en el código (la página 04 dice que existió «durante la beta»).

**Trampas de construcción, además de las ya anotadas.** (1) Un `figma_execute` que agota los 30 s **sigue ejecutándose en el plugin**: la siguiente llamada espera en cola y también expira, y la comprobación idempotente hecha entretanto puede no ver bloques que aparecen después (así se duplicaron dos bloques de la 03). Tras un timeout, esperar y medir antes de reintentar. (2) Escribir `characters` dentro de una **instancia reescalada** (`rescale`) tarda decenas de segundos por nodo: las tres sobrescrituras de la tarjeta de la 01 se completaron, pero después de que dos llamadas expiraran, y sin más escrituras en ese nodo. (3) Crear texto con estilo es rápido si se fijan `fontName`, `fontSize`, `lineHeight` y `letterSpacing` del estilo de forma síncrona y se aplica `setTextStyleIdAsync` en un bucle final: 13 nodos en 1 s; hacerlo con un `await` por nodo entre escrituras no bajó de los 30 s. (4) `resize()` sobre un marco recién creado con `primaryAxisSizingMode = 'AUTO'` lo pasa a FIXED; fijar `layoutSizingVertical = 'HUG'` después. (5) Un `TEXT` no admite `paddingLeft`: «object is not extensible» a mitad de bucle deja el bloque a medias.

**Lo que sigue abierto.** Todo lo de la sección anterior, más: revisar en Figma el tono de las siete páginas antes de publicar; y decidir si la web del caso se actualiza con la paleta y la agenda actuales.

**Dos remates de la misma tarde.** `color/field/placeholder` aliasaba `color/text/secondary` mientras el producto pinta el placeholder con el terciario, a propósito, para que un campo vacío no parezca relleno; ahora aliasa `color/text/tertiary` en los dos modos (#6e6055 en claro, #a99c8e en oscuro) y su descripción lo dice. Era la única divergencia de valor que quedaba entre Figma y el producto, y no salía en el mapa porque el token no tiene puente de código. El snapshot `design/figma-tokens.snapshot.json` se regeneró desde el plugin (374 variables, volcado del 11-sep) y `npm run token-map` da 71 espejados, 71 de acuerdo, 0 conflictos: la ida y vuelta de `color/border` en oscuro que antes contaba como redondeo ahora coincide exacta. Y la prosa de **Design decisions** y los rótulos de **01 · Color** toman los estilos de la escala: `Heading/Heading 1` en el título, `Body/Body 3` en la entradilla, `Label/Label 1` en los 19 títulos y `Body/Body 4` en los 19 cuerpos, que iban a 15 y 12,5 px sin estilo; en Color, `Label/Label 3` en las 173 etiquetas de swatch, `Heading/Heading 5` en las cabeceras de sección y `Label/Label 2` en los nombres de rampa y grupo. Con esto las siete páginas de documentación van enteras con estilo; el mobiliario de las 30 páginas de componente sigue sin él, que es la decisión de § «Estilos de texto: por qué no se pueden aplicar de golpe».

#### La página 07 cuenta lo que se ha lanzado desde la beta (10-oct-2026)

`07 · What shipped, what is next` gana, justo bajo la cabecera, la sección «Shipped since the beta opened» con dos entradas: las fichas compartidas (20 de septiembre) y «Mi lista» (10 de octubre). La de «Mi lista» cuenta qué es, que quien la recibe la encuentra en la ficha que ya tiene de ti, que el dueño nunca ve las marcas y que el aviso llega por email, y algo del proceso: las 31 decisiones se cerraron en una entrevista de diseño antes de escribir código, y la regla de que el dueño nunca ve una marca se probó antes de que existiera ninguna pantalla. Debajo van dos capturas sacadas del propio archivo con `exportAsync` y `figma.createImage` dentro del plugin, sin pasar por el canal: la pantalla «Mi lista» de escritorio y la tarjeta «La lista de Marta» de la ficha. Para la tarjeta hubo que apagar un momento el recorte de su marco, que si no exporta un PNG en blanco.

**Dos frases de la página iban por detrás del producto, y se corrigieron a la vez.** «What is open» daba las fichas compartidas por imposibles («every person belongs to one account») casi tres semanas después de lanzarlas; el punto pasa a la sección nueva. Y la línea de tecnologías decía «Gemini 2.5 Flash» cuando la app usa `gemini-3.5-flash` desde el 20 de septiembre, porque Google retiró la 2.5 para claves nuevas (`src/app/api/recommendations/route.ts`). Era la única mención en el archivo. Versión con nombre: «My list on page 07». Para que llegue a Community hay que publicar la actualización desde Figma.

#### La librería y el caso se ponen al día con «Mi lista» (10-oct-2026)

Cuatro sitios del archivo seguían describiendo la app de antes de «Mi lista», y se corrigieron a la vez. Versión con nombre: «Library and case catch up with My list».

- **`03 · Navigation`**: el texto de la página y la descripción de `Sidebar Link` decían «The three links of the desktop sidebar: Agenda, Loved ones and Settings»; ahora son cuatro, con My list.
- **`05 · Content`**: el texto y la descripción de `Empty State` añaden My list a los sitios donde se usa. Las descripciones son las que ve en el panel de Assets quien duplica el archivo desde Community, así que se cambiaron junto con el texto de la página.
- **`03 · From a date to a gift`**: las cuatro capturas de escritorio (Agenda, Seres queridos, ficha e ideas) se reexportaron desde las pantallas actuales, con la barra lateral de cuatro entradas. Para la exportación se ocultaron un momento la tarjeta de lista recibida, porque esa historia va de una fecha a un regalo y no de una lista que llega, y la capa `Hotspots`, que al subir la lista se queda donde estaba. **Una sombra tenue en la captura reducida no estaba en la imagen**: copiada a un rectángulo de 1440 × 900, la imagen pesa lo mismo que el marco limpio y se ve limpia. Antes de perseguir un defecto en una miniatura, mirar la imagen a tamaño real.
- **`07 · What shipped, what is next`**: la entrada de «Mi lista» enlaza con `01 · The problem`, que cuenta las listas de deseos entre los apaños que matan la sorpresa. Esta está hecha contra eso: el dueño no ve las marcas y la lista alimenta la libreta de quien regala en lugar de sustituirla. La 01 no se toca, porque cuenta cómo se apañaba la gente antes de PickPal.

**El archivo pasa a v1.1 · October 2026**, la primera versión con una función nueva desde que se publicó en Community. La portada dice «v1.1 · October 2026» y, en su línea de datos, «Apr–Oct 2026» y «8 screens» (eran 7; «Mi lista» es la octava). El chip de versión de la página de pantallas pasa a «V1.1», y el índice de «Start here» resume la 07 con «what shipped since the beta». Los pies históricos (los commits hasta el 11 de septiembre en la 04, la agenda «September 2026» en la 07) se quedan como estaban. Las demás cifras de «Start here» se comprobaron contra el archivo y cuadran: 29 páginas, 349 variables, 25 estilos de texto, 67 iconos y 28 conjuntos de componentes. Versión con nombre: «v1.1 · October 2026».

**Imagen de carrusel para Community: `Carousel · My list`.** Un marco de 1920 × 1080 en una sección nueva, `Community carousel`, a la derecha de la portada en la página `Cover`, con la exportación ya configurada (PNG 1x). Es la pareja de la portada: mismo fondo, misma cabecera y el mismo juego del hueco, solo que la portada dice «She’d love ___.» y esta «I’d love ___.», porque en «Mi lista» el hueco lo rellena el dueño. Encima, «Now, the other side of the notebook.»; debajo, tres líneas que explican la función; y a la derecha, la pantalla «Mi lista» y la tarjeta «La lista de Marta» superpuesta, las dos exportadas del propio archivo con sombra. **Las capturas son imágenes fijas**: si cambian las pantallas, hay que volver a exportarlas. La miniatura del archivo sigue siendo `Cover Art`, la nueva sección no la toca. El plugin no puede dejar en disco un PNG a tamaño real (`figma_take_screenshot` y `figma_capture_screenshot` reducen a 1568 px de ancho), así que el PNG lo saca Jorge desde el panel *Export*. Versión con nombre: «Carousel · My list».

**Exportación configurada en las fuentes del carrusel que cambiaron con la v1.1.** Cinco de las nueve imágenes salían de marcos que «Mi lista» tocó, y ahora cada una tiene su PNG preparado, así que reexportar es seleccionar el nodo y pulsar *Export*: 1 · `Cover Art` (`33:842`, 1x, 1920 × 1080); 2 y 3 · `Screen · Agenda · Desktop 1440` y su `· Dark` (`256:2673`, `259:6849`, a 1920 de ancho, 1920 × 1200); 6 · `Foundations · Iconography` (`154:2796`, 1x, 1360 × 3032, por el icono de «Mi lista»); 8 · `Screens · Mobile 390` (`259:5402`, 1x, 2510 × 1888), la sección entera y no un marco suelto, porque la hoja de navegación vive al lado de la Agenda móvil y no encima. Las 4, 5 y 7 (Colour, Typography y `Button`) no cambiaron, y la 9 es la vista previa del prototipo, que Community genera sola y no admite exportación. Versión con nombre: «Carousel export settings».

**Dos puntos de inicio de prototipo sobrantes, retirados.** Al clonar la Agenda móvil para montar «Mi lista» en móvil, el clon se llevó también su punto de inicio, y el selector de *Present* llegó a mostrar seis recorridos, tres de ellos llamados «PickPal · Mobile menu» (el de «Mi lista» oscuro, además, sin «· Dark»). Se quitan los dos que arrancaban en «Mi lista» (`368:9578`, `368:9756`): a esa pantalla se llega desde la hoja de navegación, como a las demás. Vuelven a ser los cuatro que anuncia la cabecera de la página: `Main flow` y `Mobile menu`, cada uno en claro y en oscuro. **Regla**: después de clonar un marco de pantalla, revisar `flowStartingPoints` de la página, porque el clon hereda el punto de inicio sin avisar. Versión con nombre: «Four prototype flows».

**Descripción de Community al día con la v1.1**: «67 icons» y «36 product frames» (eran 66 y 30), las cifras que ya dan «Start here» y la cabecera de `Screens & prototype`.

**Corrección: «Start here» no cuadraba entero.** La entrada de la v1.1 dio sus cifras por comprobadas, y se miraron las del bloque de datos y la guía de iconos, no la prosa: el párrafo de `What is inside` (`241:1516`) seguía diciendo «The 66 icons». Pasa a 67. **En los créditos** (`241:1561`), los logos de tienda ya quedaban fuera de la CC BY 4.0 por ser marcas, pero de las fotos solo se nombraba a los autores; se añade «The photographs are not covered by it either: they stay under the Pexels licence.», porque no son del autor del archivo y la CC BY 4.0 no puede cederlas. El párrafo crece una línea y la sección `Start here` se alarga para conservar los 32 px bajo su marco, que ya sobresalía 236 px desde antes. Versión con nombre: «Start here: icons and photo licence».

**Una letra que no se pintaba en los créditos.** Geist no trae la «ộ» vietnamita (U+1ED9), así que «Sóc Năng Động», uno de los fotógrafos, salía con un hueco desde que se escribieron los créditos: el texto era correcto y el glifo no existía. Esa letra, y solo esa, pasa a Inter Regular, que sí la tiene y viene con Figma, así que no falta en ninguna copia del archivo; el párrafo conserva su estilo de texto con esa excepción de un carácter. Se barrieron los nodos de texto de las 29 páginas buscando el resto del bloque vietnamita (U+1EA0–U+1EF9) y no hay más. La «ă» y la «Đ» sí están en Geist. **Regla**: al meter un nombre propio con diacríticos fuera del latín extendido, exportar el nodo y mirarlo, porque Figma no avisa del glifo que falta. Versión con nombre: «Credits: Vietnamese glyph».

Siguen sin ser componentes de librería la fila de la lista, la tarjeta de lista recibida y el enlace con logo de tienda: viven como marcos locales en las pantallas, como el resto del cromo sin componente. Hacerlos componentes sería una página nueva y queda sin decidir.

### Figma — arquitectura de variables

El archivo [PickPal — Design System](https://www.figma.com/design/4hQt4BnsEluKsYk5qbKkCz/PickPal---Design-System) espeja este documento y `globals.css`, no al revés: **si Figma contradice el código, gana el código**. Sus 372 variables están organizadas en las cuatro capas del patrón de design tokens, y cada una aliasa a la de abajo sin saltarse eslabones.

> **Esa regla está en revisión (27-ago-2026).** La intención es invertirla —Figma como fuente de verdad de los tokens, el código de estados y comportamiento— pero no está decidida ni aplicada. Mientras no lo esté, el desempate sigue siendo el de arriba. Lo que sí existe ya es la medida del desacuerdo: [`docs/token-map.md`](token-map.md), generado por `npm run token-map`, que cruza las 349 variables con las custom properties reales y lista divergencia por divergencia. **Las cifras de tokens viven allí, no aquí**: este documento guarda intención y reglas, que es lo que no se puede generar.

**Las normas de manipulación viven en [`docs/figma-tokens.md`](figma-tokens.md)**, no aquí: el modelo canónico de las cuatro capas, las reglas de alias, scope y descripción obligatoria, y la tabla de divergencias asumidas de este archivo. Ese documento dice **cómo debe hacerse**; este sigue guardando **qué es el archivo hoy y por qué** — el registro de decisiones. Al crear una variable o un estilo nuevo, la descripción de cómo y dónde se usa es parte del trabajo, no un extra.

| Capa | Nº | Colección | Ejemplos | Aliasa a |
|---|---|---|---|---|
| Primitivo | 171 | `Primitives` (141) · `Typography` (30) | `color/Green/900`, `spacing/4`, `radius/md`, `opacity/50`, `typography/font-size/lg` | valor directo |
| Semántico | 138 | `Semantic` | `color/fill/component`, `color/icon/secondary`, `space/stack/lg` | primitivo, o marca si el token es de identidad |
| Marca | 10 | `Semantic` | `brand/primary`, `brand/primary-hover`, `brand/primary-text`, `brand/logo` | primitivo |
| Componente | 30 | `Semantic` | `color/field/placeholder`, `space/card/padding`, `sizing/checkbox/box` | **semántico**, nunca primitivo |

**La colección `Medidas` se eliminó el 26-ago-2026**: sus 86 variables (spacing/size legacy) tenían 0 bindings de nodo y 0 alias entrantes desde cualquier otra variable del archivo — comprobado escaneando los 4.285 nodos de las 8 páginas antes de borrar. `Semantic` ya cubría el mismo terreno bajo `space/*` (44) y `sizing/*` (34), con las mismas hojas de nombre (`space/inset/md`, `sizing/avatar/sm`…), así que no hubo nada que repuntar. El archivo pasó de 401 a 371 variables y de cuatro colecciones a tres (`Primitives` · `Semantic` · `Typography`), sin ningún nombre en español.

**Cómo recontar esta tabla sin auditar nada**: la capa primitiva son las variables con valor directo (`Primitives` 141 + las 30 de `Typography`); la capa componente son las que aliasan a otra variable **de su misma colección** (`Semantic`); marca son las 10 de `brand/*`; semántico es el resto. Las cuatro suman las 349 del archivo. **Tres puntos ciegos**: (1) un semántico que aliasa al hub de marca apunta a su misma colección y saldría contado como componente — hay que excluir los **13** con destino `brand/*` (43 variables aliasan dentro de `Semantic`: 13 al hub, 30 son componente); (2) los **6 tokens de `z-index/*` de `Semantic` llevan valor literal a propósito** (ver su sección) y parecen primitivos sin serlo — por eso el recuento bruto da 177 valores directos y la tabla dice 171; (3) la heurística mira el alias, no el nombre, así que **al menos 26 tokens que nombran una pieza concreta caen en «semántico» porque aliasan directo a un primitivo**: `sizing/switch/*` (6), `sizing/avatar/*` (6), `space/empty-state/*` (2), `space/card/padding-lg`, `space/field-group/gap`, `space/switch/track-inset`, `sizing/textarea/min-height`, `sizing/slider/track`, `sizing/spinner/dot`, `sizing/card/visual-header`, `sizing/sidebar/width`, `sizing/event-column/width`, `radius/checkbox`, `radius/logo` y `radius/panel`. Todos son numéricos y lo hacen porque su valor no existe en la tríada `space/*`, cosa que su descripción explica; **en color ya no queda ninguno**, desde que `color/field/border` pasó a aliasar `color/border/strong` (ver «Pasada de uso»). Con las dos primeras correcciones el bruto cuadra exacto con la tabla —**171 · 138 · 10 · 30 = 349**—, recontado el 15-sep-2026. Al tocar el archivo, recontar así con `figma_get_variables` y no fiarse de las cifras de este documento, que envejecen a cada cambio.

**Los primitivos tienen scope vacío y están ocultos al publicar** (`hiddenFromPublishing`): no aparecen en ningún picker ni viajan a los archivos que consumen la librería, para que nadie aplique `spacing/4` donde toca `spacing/container/padding`. **La excepción es `Typography`, que está publicada**: sus 20 variables aplicables llevan el scope de su propiedad (`FONT_FAMILY` 3 · `FONT_WEIGHT` 4 · `FONT_SIZE` 13), que es lo que pide la §5 de la guía de tipografía — en tipografía el text style hace de capa semántica y consume el primitivo directamente. **Las 10 de ratio y em (`line-height/*` 5 y `letter-spacing/*` 5) tienen scope vacío a propósito**: son solo referencia de código y **vincularlas rompe el texto**, porque Figma resuelve esas dos propiedades en píxeles (un ratio de 1,4 se aplicaría como 1,4 px). Con el scope vacío ya no aparecen en los pickers de interlineado y tracking; la advertencia vive además en la descripción de cada una.

**Los primitivos viven en su propia colección, `Primitives`, con un solo modo.** Las 166 (92 de color y 74 numéricas: `spacing` 27, `icon` 14, `size` 12, `radius` 10, `opacity` 7, `border-width` 4) son *mode-invariant* —el mismo valor en claro y en oscuro— porque el cambio de modo ocurre en la capa semántica, igual que en `globals.css`. Tener un único modo lo hace explícito y evita el espejismo de dos columnas idénticas.

**Lo que sigue agrupado por tipo de dato es todo lo que está por encima del primitivo**: `Semantic` (176) contiene semántico, marca y componente mezclados — desde el 26-ago-2026 es la única colección de esta capa, tras eliminar `Medidas` por no tener uso. Separar `Semantic` en capas propias (`Semantic` / `Component` / `Brand`) **no se ha hecho y no compensa**: Figma no permite mover una variable de colección, así que hay que recrearla y repuntar cada referencia, y ahí es donde están los bindings caros —solo `radius/interactive` tiene 620 y `radius/pill` 424, y en total hay más de 4.000 fuera de instancias. Sacar los primitivos, en cambio, costó **32 bindings de nodo** (los swatches de `Foundations - Color`; los 40 numéricos tenían 0) y **117 referencias de alias**. Regla general para este archivo: antes de dar por caro un movimiento de colección, **contar los bindings de las variables implicadas**, no del archivo entero.

**El nombre de esa colección ha ido y vuelto: `Semantic` → `Color` (24-ago-2026) → `Semantic` (25-ago-2026).** El paso a `Color` buscaba el paralelo con `Medidas` —agrupar por tipo de dato, que era el modelo elegido mientras existieron dos colecciones por encima del primitivo— porque el nombre `Semantic` afirma una separación de capas que el párrafo anterior niega. La vuelta a `Semantic` la hizo el usuario para alinear el archivo con la guía canónica de tokens, que nombra así a la colección de la capa semántica. **La tensión sigue en pie y conviene tenerla presente**: dentro viven también los 9 tokens de marca y los 46 de componente, así que el nombre promete más pureza de la que hay. Renombrar una colección conserva ids, alias y bindings (0 tocados), pero **el archivo está publicado como librería**, así que el nombre nuevo llega a los archivos consumidores en la siguiente publicación.

`Typography` se queda fuera de `Primitives` por la misma razón por la que conserva scope y publicación: sus variables acumulan **1.036 bindings de nodo** y los text styles consumen el primitivo directamente, sin capa semántica de variables en medio. Desde que se borró `tracking/*` es una colección de **primitivos puros**: sus 30 guardan valor directo, ni un alias, así que aparece en una sola fila de la tabla.

**La capa de marca es el único punto de contacto con la paleta de identidad.** Cambiar el verde o la terracota se hace entero dentro de `brand/*`; ningún semántico ni ningún nodo referencia `Green/*` o `Terracotta/*` directamente, salvo los swatches de documentación. El hub pasó de 3 a 8 tokens el 25-ago-2026: al crear la capa de `emphasis`/`state`, los tokens de marca nuevos aliasaban **directo al primitivo** y se saltaban el hub, dejándolo en una promesa falsa. Se añadieron `brand/primary-hover`, `-subtle`, `-border`, `brand/secondary-hover` y `-border`, y se repuntaron los 5 semánticos con 0 cambios de valor resuelto. **Regla**: al crear un token de color de marca, aliasarlo al hub, nunca al primitivo — si el paso no existe en el hub, se crea ahí primero.

Y pasó de 8 a **10** el 26-ago-2026, aplicando esa misma regla: `brand/primary-text` (`Green/950` claro / `Green/400` oscuro) es el verde de marca cuando va de primer plano, y lo consumen `color/text/brand` y `color/icon/brand`, que antes caían a `color/Cream/200` en oscuro saltándose el hub. El décimo es `brand/secondary-text`, que ya existía. **El par `primary` / `primary-text` es la forma que toma en el hub la distinción entre relleno y primer plano**: son el mismo verde en claro y tienen que dejar de serlo en oscuro (ver Accesibilidad · Contraste).

#### Descripciones de variables y estilos (26-ago-2026)

Las 349 variables y los 29 estilos llevan descripción, y todas responden a la misma pregunta: **¿cómo o dónde se usa esto?** — no a cómo se generó ni cuándo. La fórmula es *«[Qué es y dónde se usa en el producto]. [Advertencia breve, solo si evita un error]. Espeja `utilidad-de-código`.»*, en 1–2 frases (media actual: 95 caracteres en variables y 61 en estilos, máximo 250).

**Dos reglas de recorte, que son las que mantienen esto legible**: (1) **no repetir el dato que Figma ya enseña al lado** — el panel muestra el valor de la variable y, en un estilo de texto, su tamaño, interlineado y tracking; una descripción que abre con «20 px de la rampa…» o con una ficha `72 px / 1,1 / -0,02em` gasta la primera línea en algo que el ojo ya tiene. (2) **Cada descripción explica lo suyo, no lo de al lado**: la advertencia de no vincular interlineado ni tracking vive en `line-height/*` y `letter-spacing/*`, no repetida en los 22 estilos de texto que las rozan.

**Lo que sí va**: el sitio concreto del producto donde se aplica (PersonCard, botón primario, la Agenda), la utilidad de código que espeja (`--primary`, `text-sm`, `p-4`) —que no es visible en Figma y es el puente real hacia el código—, y «sin uso todavía» cuando el rol está adelantado al producto. **Lo que no va, porque su sitio es este documento**: fechas y changelog, metodología de generación (splines, OKLCH, anclas), recuentos de bindings, justificaciones de arquitectura y ratios de contraste que no sean la advertencia en sí.

**Las advertencias que sí se conservan** son las que evitan romper algo, y conviene repetirlas en cada variable afectada aunque canse: el par obligatorio `on-*-solid` de cada relleno sólido, la escala 0–100 de `opacity/*`, que `line-height/*` y `letter-spacing/*` **no se vinculan nunca** en Figma, y que `spacing/14` es el único paso fuera de la rejilla de 4 px.

**Las familias uniformes usan una plantilla con el paso interpolado** (rampas de color, `spacing/N`, `opacity/N`), y solo los pasos con un rol propio —las anclas de marca, los que alimentan un semántico concreto— añaden una frase extra. Así se mantienen las 349 sin reescribirlas una a una: al añadir un paso a una familia, se copia la plantilla de sus vecinos.

Al tocar el archivo, **la descripción se actualiza con el cambio**, igual que este documento. Y al revés: si una descripción cita un valor o un alias concreto, comprobarlo antes de fiarse — el pase de agosto de 2026 corrigió `radius/base`, que seguía diciendo 14 px meses después de subir a 16, y seis radios que aún describían las fórmulas `base * 0.6` del sistema de multiplicadores ya retirado.

#### Pasada de uso: 77 trazos vinculados, 1 fuga de scope y 25 tokens sin destino (27-ago-2026)

Medir el uso real de las variables sobre los **3.232 nodos** del archivo (39 páginas, sin entrar en instancias) obliga a separar tres zonas, porque la cifra global no dice nada: **los especímenes** (lo que vive dentro de un `COMPONENT` o `COMPONENT_SET`), **el mobiliario** de las páginas de componente (cabecera, rótulos, rejillas) y **las páginas de Foundations**. En los especímenes el color y el layout están vinculados casi al 100 % —trazos de color 114/114, padding 561/578, gap 166/172, `fontSize` 168/170—; el mobiliario baja a 79 % en padding y 83 % en gap; y Foundations no vincula ni un padding ni un gap, aunque su color sí (857 de 858 rellenos en `Color`). Las dos últimas son andamiaje: no hay nada que arreglar ahí.

**Y una trampa de conteo antes de creerse cualquier porcentaje de color**: hay **122 pinturas sin variable que son invisibles** (`visible: false`), casi todas el relleno blanco oculto de los 66 componentes `icon/*`. Un recuento que no filtre `visible` las cuenta como color crudo y hunde la cifra sin motivo: descontadas, en los especímenes solo quedan 19 rellenos crudos visibles, y todos son placeholders (la miniatura DiceBear, el logo de tienda) o color de contenido (los tonos de piel y pelo del Avatar Picker), que es exactamente donde **no** debe haber token.

**Cinco arreglos en la misma pasada.**

**1. El grosor de trazo no estaba tokenizado: 3 de 106 en los especímenes.** Los **77 nodos cuyo trazo medía exactamente 1 px** se vincularon a `border-width/default` — 18 páginas, con Button 15, Person Card 10 y Upcoming Date Card 6 a la cabeza —, lo que sube la cobertura a 80/106 sin cambiar un solo valor resuelto. **Los 26 restantes no deben vincularse**: 2,5 (el anillo de selección del Avatar Swatch), 1,2, 1,5, 1,6, 1,3 y 1,1375 son grosores de dentro de vectores de icono y no tienen paso en la escala.

**TRAMPA que costó una verificación en falso**: `setBoundVariable('strokeWeight', v)` guarda el binding en las **cuatro claves por lado** (`strokeTopWeight`, `strokeBottomWeight`, `strokeLeftWeight`, `strokeRightWeight`), no en `strokeWeight`. Los bindings hechos desde la UI sí caen en la clave plana — de ahí que los 3 antiguos aparezcan de otra forma que los 77 nuevos. **Al auditar grosores hay que leer las cinco claves**; leyendo solo `strokeWeight` los 77 salen como sueltos.

**2. `color/white-alpha/36` estaba publicada y con `ALL_SCOPES`**, la única de los 166 primitivos fuera de la regla de scope vacío + `hiddenFromPublishing` — sus tres hermanas (`/8`, `/10`, `/12`) estaban bien. Aparecía en los pickers y viajaba a los archivos consumidores. Corregida.

**3. Veintisiete semánticos no tenían ni un binding de nodo ni un alias entrante.** Dos tenían destino real y se vincularon, con el valor intacto: `space/card/padding-dense` a las dos variantes de Person Card (los 4 lados, 16 px antes y después — su descripción ya nombraba PersonCard, y Upcoming Date Card se queda en `padding-default`), y `sizing/icon/lg` al frame `Gift` de 24×24 del estado vacío de Notification Bell.

**Los otros 25 no se borran, y ahora su descripción dice por qué están sin uso**, porque «0 bindings» significa tres cosas distintas:

- **Figma no puede vincularlos nunca**: los 6 `z-index/*`. No existe la propiedad; son documentación del orden de apilamiento.
- **El destino es una pantalla, y esta librería no tiene pantallas**: `space/page/padding-lg`, `space/container/padding-lg`, `space/panel/gap`, `space/layout/grid-gap`, `space/stack/xl`, `space/inline/xl`, `sizing/sidebar/width`, `sizing/event-column/width`. **CORRECCIÓN (15-sep-2026)**: cinco de los ocho dejaron de estar a cero cuando el archivo creció `Screens & prototype` — `page/padding-lg` 48 bindings, `stack/xl` 23, `event-column/width` 10, `inline/xl` 5 y `panel/gap` 2. Siguen a cero `container/padding-lg`, `layout/grid-gap` y `sizing/sidebar/width`, este último **pese a que el archivo ya dibuja el sidebar de escritorio**: ahí el token existe y nadie lo aplica, que es un caso distinto de los tres.
- **El rol existe pero el archivo no dibuja esa pieza**: `sizing/control/sm·md·lg` (Button e Input ajustan el alto al contenido en vez de fijarlo), `sizing/selection/lg`, `sizing/icon/md`, `radius/tag`, `border-width/focus` (ver el grupo `border-width/*` más abajo), `opacity/hover`, `opacity/skeleton`, `space/field/gap`, `space/field-group/gap`.

**Regla que deja esta pasada: antes de borrar una variable sin uso, decidir en cuál de los tres casos cae.** Solo el tercero es candidato a borrado, y solo si el rol tampoco existe en el producto. Escribir el motivo en la descripción es lo que evita que la siguiente auditoría las vuelva a listar como olvido y repita el análisis entero.

**4. `color/field/border` era el único salto de capa que quedaba en color**: aliasaba `color/Neutral/500` mientras sus cuatro hermanos de `color/field/*` van a un semántico. El destino que parecía obvio, `color/border/component`, **habría sido una regresión de accesibilidad**: los dos tokens no valen lo mismo —`Neutral/500` / blanco 36 % contra `Cream/400` / blanco 12 %— y el contorno de los 100 nodos que lo llevan (Input, Textarea, Select, Checkbox, Switch, Button Outline) habría caído de **3,75:1 sobre `color/bg` y 3,91 sobre `bg/surface` en claro, y 3,32 / 3,33 en oscuro, a 1,33 / 1,39 y 1,39 / 1,44**: por debajo del 3:1 que WCAG 1.4.11 pide para el contorno de un control, que es justo lo que avisaba la descripción del token. **Y ninguna variable de la familia `color/border/*` tenía ese valor**: `border` es `Cream/400` / blanco 10 %, `border/component` es `Cream/400` / blanco 12 % —casi un duplicado del anterior— y `border/subtle` es `Cream/200` / blanco 8 %; el valor accesible solo existía en `Primitives`. Así que se creó el escalón que faltaba, **`color/border/strong` → `Neutral/500` (claro) / `white-alpha/36` (oscuro)**, scope `STROKE_COLOR`, y `color/field/border` pasó a aliasarlo: 0 cambios de valor resuelto, los mismos contrastes medidos después (3,75 / 3,91 y 3,32 / 3,33) y la regla componente→semántico cumplida. Misma jugada que con `border-width/3` y `opacity/80`: **si el escalón no existe en la capa de abajo se crea ahí primero, y nunca se repunta a un vecino que «casi» vale**.

**5. Los huecos de icono: 122 rectángulos y 28 instancias, y los rectángulos están mejor puestos.** Los 122 `Icon Left`/`Icon Right` de Button (108), Badge (12), Empty State y Gift Recommendation Card son rectángulos con esquina de 1,5–2px, y **los 122 tienen el relleno vinculado a su token de icono** (`color/icon`, `on-brand`, `on-brand-secondary`, `on-danger-solid`, `fill/brand`, `icon/secondary`) **y el ancho y el alto vinculados** a `sizing/control/icon-md|sm|xs` o `sizing/icon/xl`. Las 28 instancias de icono de verdad —12 en `Button Icon`, 5 en Select, 4 en Sidebar Link, 4 en Toast, 2 en Back Link, 1 en Tag Input— **no tenían el tamaño vinculado a nada**; las 12 de Button se vincularon en esta pasada a `sizing/control/icon-md`, sin cambiar un píxel. **Cambiar los 122 por instancias no es la limpieza gratis que parecía**: obliga a elegir glifo para un hueco genérico y a **sobrescribir el trazo en unas 74**, porque el icono nace con el trazo en `color/icon` y en un botón primario toca `on-brand` — y una sobrescritura por instancia es justo por donde el color se desalinea. Queda como decisión, no como tarea.

**Verificación**: captura de Person Card y de las 4 variantes de Input después de escribir, más un recuento de bindings leído del archivo. Ni un valor resuelto cambió — era la condición de toda la pasada.

#### Estilos de texto: por qué no se pueden aplicar de golpe, y la ola 1 (27-ago-2026)

Los 22 estilos de texto están bien construidos —los 22 vinculan familia, tamaño, peso e interlineado a variables de `Typography`— pero **no gobernaban ni un texto del producto**: 0 de los 496 de las 29 páginas de componente usaba un estilo, y los 204 que sí lo usan viven en `Foundations - Typography` e `Iconography`. Es decir: cambiar `Body 3` movía la página de documentación y nada más.

**La causa de que no se pueda aplicar en bloque: ninguno de los 496 coincide exacto con un estilo.** Los estilos declaran el interlineado como **ratio** (120 %, 140 %, 150 %) y los nodos lo llevan en **píxeles** (20px, 16px, 24px) o en AUTO. Familia, tamaño, peso y tracking sí coinciden en la mayoría; el interlineado, nunca. Así que **aplicar un estilo siempre cambia la altura del texto** — no existe la aplicación gratis.

**Conviene separar dos poblaciones antes de decidir nada**, porque son cosas distintas: los **170 textos de los especímenes** (el producto) y los **326 del mobiliario** de las páginas (cabeceras, rótulos, la línea `Fuente: … · Revisado: …`). En los especímenes, 142 tienen un estilo de su misma cara —solo falla el interlineado— y 28 no tienen hueco en la escala. En el mobiliario es al revés: 266 de 326 no encajan, y sus huecos describen exactamente lo que es, micro-tipografía de documentación —**125 son Geist Mono 10** (la escala no tiene mono, y `typography/font-family/mono` sigue siendo una variable muerta), **55 son Fraunces 16** (la escala serif baja hasta 18) y **74 son textos de 11px con tracking 0**, que la escala solo cubre con 2 % (`Caption 2`) o 12 % en mayúsculas (`Eyebrow/Micro`)—. **Decisión: el mobiliario se queda fuera de la escala a propósito**; forzarlo dentro obligaría a inventar estilos que el producto no usa.

**La ola 1, aplicada: 36 nodos en 13 páginas**, los únicos cuyo movimiento es de un píxel o menos. Dos estilos: `Body/Body 4` en 24 textos de Geist Regular 14 con interlineado 20px (el estilo pide 19,6 y la caja no se movió: **0px**) y `Body/Body 5` en 12 textos de Geist Regular 12 con 16px o AUTO (el estilo pide 16,8 y la caja pasa de **16 a 17px**). Los 12 que crecen son el mensaje de error de Budget Slider, 5 filas y descripciones del Notification Popover y los 6 metadatos de Upcoming Date Card, cuya `TextColumn` crece 2px y con ella la card. Select quedó **idéntico byte a byte** en la captura antes/después. Ningún relleno se soltó: los 36 conservan su color vinculado.

**Tres nodos quedaron fuera a mano: las iniciales del Avatar** (`JM` en Sm, Default y Lg). La cara encaja, pero el rol no: unas iniciales son etiqueta, y los estilos `Label` son Medium mientras esas iniciales son Regular, así que el único estilo de su misma cara es `Body`. **Aplicar un estilo también es declarar un rol**, y ese habría sido falso. Van a la lista de decisiones con los 28 sin hueco.

**La ola 2 se paró en 13 de 100, y el motivo no es un empate de criterios: es un defecto de la escala.** Los candidatos eran 100 (fuera las 3 iniciales del Avatar y 3 etiquetas de Button subrayadas, que además de interlineado perderían el subrayado). **Cincuenta y uno son etiquetas de Button**, y las 54 variantes son HUG en vertical: su altura sale del texto. Treinta y seis miden 36px (8+8 de padding + 20 de línea) —que es exactamente `sizing/control/md`— y dieciocho miden 28 (4+4+20). Aplicarles `Label 2` las dejaría en **32,8 y 24,8**: fuera de la rejilla de 4px y rompiendo la altura de control que el propio archivo documenta.

**Y el problema es general, no de Button: los ratios de la escala no caen en píxel entero justo en los dos tamaños que el producto más usa.** `Label 2` es 14 × 120 % = **16,8**; `Body 4`, 14 × 140 % = **19,6**; `Label 1`, 16 × 120 % = **19,2**. De los 22 estilos, **13 producen un interlineado fraccionario** (los tres Display salvo el 2, H2·H3·H4·H6, los tres Label, `Body 4`, `Body 5` y los dos Caption); solo 9 dan entero. Y **87 de los 100 candidatos aterrizaban en una fracción**, arrastrando a su contenedor fuera de la rejilla.

Los especímenes, en cambio, ya usan **20px para el texto de 14 y 24px para el de 16**: enteros y múltiplos de 4. Así que la pregunta «¿de quién es la verdad, de la escala o de los especímenes?» se responde sola en esta propiedad concreta: **en interlineado mandan los especímenes, y lo que hay que corregir son los pasos de 14 y 16 de la escala**, no los 87 nodos. Cambiar el ratio de un estilo arregla de golpe a todos sus consumidores; repuntar los nodos deja el defecto dentro del estilo, esperando al siguiente que lo aplique.

**Aplicados los 13 que sí caen en entero**: `Body 2` (18 × 150 % = 27) en los 10 textos de Date Picker Dialog —sus filas miden 48 fijos, así que no se movió nada— y `Body 3` (16 × 150 % = 24) en Avatar Picker Dialog, Dialog y Sheet, donde el contenedor crece 3, 8 y 3px. Los 13 acaban en altura entera, verificado uno a uno, y el Dialog se comprobó con captura.

**Consecuencia de la ola 1 que conviene tener presente**: los 12 nodos que tomaron `Body 5` (12 × 140 % = 16,8) también están en fracción, y por eso Figma los pinta a 17. Se corrigen solos el día que se arregle ese paso de la escala.

**Los 13 pasos, arreglados (27-ago-2026).** El interlineado pasa a píxeles enteros: `Display 1` 80 · `Display 3` 52 · `H2` 40 · `H3` 36 · `H4` 32 · `H6` 24 · `Label 1` 24 · `Label 2` 20 · `Label 3` 16 · `Body 4` 20 · `Body 5` 16 · `Caption 1` 16 · `Caption 2` 14. **Criterio**: el múltiplo de 4 más cercano cuando la desviación es menor de 1,5 px, y el valor que ya usan los especímenes cuando lo tienen decidido — `Label 2` y `Body 4` van a 20 porque es lo que llevan las 55 etiquetas de Button y los 26 textos compactos, y `Label 1` a 24 porque es lo que llevan el título de la card de regalo y el nombre de Person Card. `Caption 2` (11 px) es el único que no cae en múltiplo de 4: 14 px, porque 12 lo ahoga y 16 lo suelta demasiado.

**Resultado medido**: **0 de 22 estilos con interlineado fraccionario** y los **348 nodos con estilo en altura entera**. Los 12 de la ola 1 que Figma pintaba a 17 px vuelven a 16 solos, sin tocarlos. Y los 87 textos que faltan dejan de estar bloqueados: con `Label 2` en 20, las 55 etiquetas de Button se enganchan sin mover el botón de sus 36 px.

**Tres arreglos de arrastre en el mismo pase, todos por lo mismo — el texto que describe un valor no sigue al valor**: las 13 fichas de `Foundations - Typography` seguían anunciando el ratio viejo (`Label 2` decía «14 · 1,2 · 0») y ahora dicen el píxel; el párrafo de cabecera de esa página afirmaba que el interlineado va «como porcentaje literal» en los 22, cuando hoy son 16 en px y 6 en porcentaje; y **los 3 `Eyebrow/` vinculaban su interlineado a una variable borrada** —`line-height/px/*` desapareció y el enlace se quedó colgando—, así que se desvinculó, conservando el literal de 16 px que ya tenían.

**Y un cuarto, que es el de siempre**: al crecer el interlineado, las SECTION no crecen con su frame. Se quedaron cortas cuatro — `Foundations - Typography` (73 px), `Iconography` (13), `Avatar Picker Dialog` (19) y `Popover` (6) —, reajustadas todas a contenido + margen. **Conviene barrer las secciones después de cualquier cambio que mueva alturas**: son veinte líneas de bucle y encuentran lo que el ojo no ve, porque una SECTION corta no recorta nada, solo deja el contenido fuera de su fondo.

**La ola 2, aplicada (27-ago-2026).** Con la escala en píxeles enteros, los 87 entraron sin fricción: **58 se mueven 0 px** —entre ellos las 51 etiquetas de Button, porque `Label 2` ya vale 20— y 29 crecen 2, 4 o 6 px, todos a altura entera. Las **66 variantes de Button conservan su alto exacto** (36, 28 y 32 según tamaño), así que la igualdad con `sizing/control/md` sigue en pie; verificado además con captura del Primary Md, que mide 36×68 con la etiqueta dentro. Ninguna SECTION se quedó corta esta vez.

**Van 136 de los 170 textos de especímenes con estilo (80 %) y 0 de los 326 de mobiliario**, que es la decisión escrita más arriba. Los 34 que faltan son los 28 sin hueco en la escala, las 3 iniciales del Avatar y **3 etiquetas de Button subrayadas**, que al tomar `Label 2` perderían el subrayado además de cambiar de interlineado.

**Un aviso que costó una marcha atrás**: recorrer una página de componente entera se lleva por delante el mobiliario. En Button se colaron dos —el título de la página, que tomó `H4`, y la descripción de anatomía, que tomó `Body 5`— y hubo que desengancharlos con `setTextStyleIdAsync('')`, que conserva los valores. **El filtro no es la página: es estar dentro de un `COMPONENT` o `COMPONENT_SET`.**

#### Auditoría de las páginas de documentación (27-ago-2026)

Las páginas que explican el sistema envejecen peor que el sistema, porque nada las obliga a seguirlo. Barrido completo de las 10 páginas de documentación más las cabeceras de anatomía de las 29 de componente.

**Lo que estaba sano**: las **33 entradas del índice** de `Getting Started` resuelven a una página real, cero enlaces rotos —la trampa del clonado que arrastra el `hyperlink` no ha vuelto—; las **29 rutas `Fuente:`** de las cabeceras existen todas en el repo, incluidas las dos líneas sueltas que cita Checkbox (`settings/page.tsx:266` y `:310`, ambas `<input>`); y en `Foundations - Color`, de los 259 chips con relleno vinculado, los **84 que llevan rótulo hex coinciden exactos** con el valor resuelto de su variable, comprobado resolviendo cada uno en el modo de su propio frame, que es donde podía fallar. El Cover también cuadra: «10 átomos · 19 moléculas» son las 29 páginas de componente.

**Lo que mentía, y ya está corregido:**

- **La colección `Medidas` seguía viva en 8 textos** cinco días después de borrarse, y con ella `Color` como nombre de colección (hoy `Semantic`): tres entradas de Excepciones, dos de Iconography y las cabeceras de anatomía de **Badge, Button e Input** («vía variables semánticas de Color y Medidas»). Cero menciones vivas después del pase; las que dicen que se eliminó se quedan, porque nombrar lo que se borró es correcto.
- **Las cifras de primitivos estaban a mitad de camino**: «75 primitivos (35 de color, 40 numéricos)» y «38 primitivos de Medidas» contra los **166 de `Primitives`** (92 de color, 74 numéricos) de hoy. La misma entrada afirmaba que Typography «no tiene capa semántica ni text styles por encima», falso desde que existen los 22 estilos.
- **Doce nombres de token renombrados que la prosa daba por vigentes**: `spacing/stack|inline|inset/*` → `space/*`, `size/interactive-*` · `size/avatar/*` · `size/control/icon-*` · `size/icon/xl` · `size/textarea/min-height` · `size/sidebar/width` · `size/event-column/width` → `sizing/*`, `spacing/panel/gap` · `spacing/page/padding-lg` → `space/*`, y `color/brand/primary` → `brand/primary`.
- **Texto recortado en la página que avisa de los recortes**: las entradas **13** y **15** de Excepciones medían 607 y 619 px en un contenedor de 600 y se cortaban a media palabra; pasan a FILL y envuelven en dos líneas. Igual los rótulos «Light/Dark (mode override explícito)» de Sidebar Link (239 y 237 px en 232). **Y la SECTION de Excepciones no crecía con su frame**: estaba 120 px corta —desde antes de esto— y se redimensionó a 744×6790, aplicando la regla de frame + 64 que esa misma página documenta.
- **El índice**: 4 de las 33 entradas decían «Foundations - Color», «Foundations - Excepciones»… mientras sus páginas se llaman «Color», «Excepciones». Ahora las 33 coinciden con el nombre de su destino, y el `hyperlink` de las cuatro sobrevivió al cambio de texto.

**Lo que queda abierto**: dos entradas de Excepciones citan en presente `color/chart/3` y `color/chart/5`, y ninguna variable lleva «chart» en el nombre. **CORRECCIÓN (28-ago-2026): no se borraron, se renombraron.** Las cinco series viven hoy en `color/bg/category/{1,2,3,4,5}` y sus descripciones lo dicen — `bg/category/3` es `Amber/600` = `#e3a757`, el hex exacto que la entrada cita para `chart/3`, y `bg/category/5` es `Neutral/600` claro y `Neutral/700` oscuro, justo lo que describe para `chart/5`. Las dos entradas pasan a nombrar el token de entonces y el de hoy, que es lo que salva la historia. **Distinto es `color/icon/category/3`**: ese sí desapareció, se cree que al reducir `color/` a grupos de rol el 27-ago, mientras `--category-amber` sigue en `globals.css` y lo consume `giftImages.ts`. Queda como el único color del producto sin token que lo nombre. Dos frases históricas conservan nombres muertos a propósito (`size/interactive-track`, `size/interactive-2xs`), porque rehacerlas obligaría a reconstruir toda la cadena de renombrados. Y las cifras de Iconography sobre el código —«87 renders, 82 importados y 5 dinámicos», «68 identificadores → 66 glifos»— no se han recontado: piden el mismo método que las produjo.

**Trampa confirmada por segunda vez**: el primer intento de esta corrección murió en el timeout de 29 s de `figma_execute` **con 8 de los 18 textos ya escritos**. Al reintentar hay que leer el estado real antes de nada —lo dice la regla de más arriba y esta vez se cumplió— y trocear: tandas de 2 a 6 nodos, con las fuentes cargadas de una sola vez al principio en vez de por nodo, pasan en 2-3 s.

#### El recorte de Upcoming Date Card lo decidió el código (28-ago-2026)

La `TextColumn` medía 93 px con `clipsContent` y sus tres textos eran HUG de 109, 117 y 129: se cortaban a media palabra, el nombre incluido. El componente real no recorta, **trunca**: `flex-1 min-w-0` en la columna y `truncate` en los tres textos. La traducción a Figma de eso es FILL + `maxLines: 1` + `textTruncation: ENDING`, aplicado a los 9 nodos (3 textos × 3 variantes).

**Y el especimen medía 340 px cuando la columna que lo contiene tiene token propio**: `sizing/event-column/width` = 480. Las tres variantes pasan a 480 **con el ancho vinculado a ese token**, así que la columna de texto sube de 93 a 233 px y los ejemplos se leen enteros sin llegar a truncar — la truncación queda como comportamiento, no como parche. El token deja de ser uno de los que «no tenían dónde aplicarse» y su descripción ya lo dice.

**Dos contenedores no crecieron solos, que es el patrón de esta semana**: el `COMPONENT_SET` seguía a 340 y recortaba sus propias variantes —no es auto-layout, hay que redimensionarlo a mano— y su SECTION pasó de 512 a 644. Barrido posterior: **0 textos recortados en todo el archivo**.

#### Rampas de color: escala 50–950 (23-ago-2026)

Las 8 familias de color de `Primitives` (`Cream`, `Neutral`, `Green`, `Terracotta`, `Umber`, `Red`, `Amber`, `Bronze`) siguen ahora la escala estándar de 11 pasos — `50·100·200·300·400·500·600·700·800·900·950` —, dentro del límite de 12 tonos por rampa. Antes, cada familia cubría solo el tramo que algún componente había necesitado (`Terracotta` tenía 2 pasos, `Bronze` 1); ahora las 8 cubren el rango completo de claro a oscuro, generando los pasos que no existían. **La excepción es `Cream`, que llega hasta el paso 500 (6 pasos: `50`–`500`)**: su rango vive entero en la mitad clara y los pasos oscuros los cubre `Neutral`, así que generarlos habría duplicado esa familia sin consumidor. Las familias llevan mayúscula inicial (`Cream`, no `cream`) — es la única excepción de capitalización en toda la nomenclatura del archivo, y existe solo porque así se lee mejor en el panel de variables de Figma, que ordena por creación y no numéricamente; no aplica a nada más (semánticos, spacing, radius siguen en minúsculas).

**Cómo se generó lo que faltaba.** Cada hex real se convirtió a OKLCH (conversión exacta sRGB↔OKLab de Björn Ottosson, no una aproximación). Para cada familia, los pasos ya existentes se mantuvieron como anclas; donde no había ningún dato por debajo del paso más claro conocido, se añadió un ancla sintética en el paso 50 (`L≈0.985`, croma ≈10 % del pico de esa familia) para que la rampa tuviera un punto de partida razonable. Sobre esas anclas se ajustó un **spline cúbico monótono (Fritsch-Carlson)** —L y C por separado, H constante por familia— y se evaluó en los 11 pasos objetivo. Monótono es la palabra clave: a diferencia de una interpolación ingenua, no puede generar oscilaciones ni un paso más claro que su vecino más oscuro.

**Ningún valor referenciado cambió.** Los pasos que ya caían en la escala nueva (por ejemplo `Cream/500`, `Neutral/900`) se dejaron con su hex exacto — cero deriva. Los que no encajaban en la escala (`Cream/550·650·750·850`, `Neutral/650·750·850`) se consolidaron en el paso canónico más próximo, con una deriva de pocas unidades de RGB, imperceptible; las variables sobrantes se borraron tras repuntar sus alias. Verificado con captura antes/después de la sección `Vista en contexto` y de los 26 swatches semánticos: 0 cambios visibles, 0 alias roto, 0 binding huérfano.

**Dos casos donde consolidar habría sido un error, no solo un desvío cosmético**: `brand/primary` usaba `Green/850` en Light y `Green/750` en Dark — dos verdes *deliberadamente distintos* para el mismo rol según el tema. Consolidar ambos al mismo paso los habría igualado. En vez de eso, `Green/750` se convirtió literalmente en el nuevo `Green/700` (mismo hex, nuevo nombre) y `Green/850` se dejó como un **12.º paso propio** de esa familia — la única que supera los 11 estándar, justificado porque aquí sí hace falta y 12 sigue sin pasarse del límite. Mismo problema con `color/chart/5` (`Neutral/650` Light / `Neutral/700` Dark): en vez de fusionar 650 en 700, se mapeó al nuevo `Neutral/600` generado, manteniendo Light y Dark distintos. **Regla al consolidar un paso no estándar: comprobar primero si su mismo token usa OTRO paso no estándar en el modo contrario — si sí, no fusionar, darle un paso propio.**

**`Amber` rediseñada a mano (23-ago-2026).** `Amber/900` (tono apagado) y `Amber/950` (dorado vivo, sin tocar ninguno de los dos — siguen siendo los mismos hex que usan `color/chart/4` y `color/chart/3`) son dos acentos de carácter distinto, no dos pasos de una misma rampa: casi la misma claridad (`L≈0.78` los dos) pero el croma se duplica de uno a otro. Un spline monótono sobre solo esas dos anclas no puede meter saturación a mitad de camino sin dejar de ser monótono, así que el primer intento (spline) daba una rampa plana del 50 al 800 que solo "aparecía" dorada en el último tramo.

Los 9 pasos intermedios (`50`–`800`) se sustituyeron por valores elegidos a mano en OKLCH, con un pico de croma deliberado en `400`–`600` (`C≈0.12–0.135`, a la altura del pico real de `950`) que decae suavemente hacia el tono apagado de `900`. El resultado: una progresión crema → dorado vivo → ámbar apagado, coherente en todo el rango, en vez de la meseta gris-beige anterior. No es una fórmula reutilizable para otras rampas de 2 anclas —es una decisión de diseño hecha a mano para esta familia en concreto—, aplicar caso por caso según el rol de cada rampa.

**`Umber` también rediseñada a mano (23-ago-2026).** Diagnóstico distinto al de `Amber`: aquí no hay un salto de croma entre anclas (`Umber/900` C≈0.025, `Umber/950` C≈0.022, muy parecidas), el problema era la **hue** — el spline promediaba entre `H=60.3°` (900) y `H=78.9°` (950) dando `H≈69.6°` constante, y con un croma bajo eso se leía como gris lavado, no como el marrón cálido que el nombre «Umber» promete. `Umber/900` y `Umber/950` se dejaron intactos (alimentan `color/text/secondary` en Light y `color/fill/component-focus`). Los 9 pasos intermedios se recalcularon a mano comprometiéndose con `H≈57–60°` (más cerca del matiz de `900`, el más "marrón" de los dos) y un croma algo más alto que el original pero **deliberadamente por debajo del pico de `Amber`** (`C≈0.05` frente a `≈0.135`): el rol de `Umber` es texto secundario y superficies discretas, no un acento de gráfica, así que no debe competir en viveza con `Amber`. Mismo patrón de ejecución que `Amber`: reasignar valor a las variables existentes (mismos IDs, sin recrear) y actualizar a mano las 9 etiquetas de texto del swatch, que no siguen el valor de la variable automáticamente.

#### Rampa de radios: escala limpia de 4px (24-ago-2026)

A diferencia de las rampas numéricas de espaciado/tamaño (que no tienen equivalente en código y nacen sin `codeSyntax`), **los 8 primitivos de `radius` sí tienen una variable CSS real detrás de cada uno** — cambiar su valor cambia lo que la app renderiza de verdad. Antes eran multiplicadores de `--radius` (`* 0.6`, `* 0.8`, `* 1.4`…), lo que daba números sin significado propio (`8.4`, `30.8`). Ahora son valores explícitos en incrementos limpios de 4px: `xs` 4 · `sm` 8 · `md` 12 · `lg`/`base` 16 · `xl` 20 · `2xl` 24 · `3xl` 28 · `4xl` 32. Cambio aplicado en los dos lados a la vez — `src/app/globals.css` y los 8 primitivos de Figma — para que no diverjan, siguiendo la regla del proyecto de que **nunca conviene tocar uno sin el otro** cuando el token tiene `codeSyntax`.

`--radius-xs` no existía en `globals.css` (caía al valor por defecto de Tailwind, `0.125rem`/2px, sin relación con el resto de la escala) aunque Figma ya lo documentaba en 4px desde antes. Añadido explícitamente al `@theme inline` junto con el resto, cerrando una divergencia previa a este cambio que nadie había notado porque ningún componente usa hoy `rounded-xs`.

**`radius/full` (nuevo primitivo, valor `999`, sin `codeSyntax`)** cierra el hueco que ya señalaba el documento de referencia original (`radius-full: 9999px | Avatares, toggles`): `radius/pill` aliasaba a `radius/4xl` (antes 36.4, ahora 32), que solo redondea del todo un elemento de hasta el doble de esa medida — insuficiente si algún avatar o control creciera por encima de 64px. `radius/full` no necesita variable CSS: el código nunca lo usaría vía `--radius-*`, porque `rounded-full` es la utilidad nativa de Tailwind (`border-radius` prácticamente infinito), completamente independiente de esta escala — verificado en runtime: `getComputedStyle` de un nodo `rounded-full` da un valor calculado de ~26.8 millones de px, ajeno a cualquier variable del proyecto.

`--radius` (el base, del que cuelga `lg`) sube de `0.875rem` (14px) a `1rem` (16px) para que `lg` caiga exactamente en un múltiplo de 4. Verificado en el navegador tras el cambio: `rounded-lg` calcula 16px, `rounded-xl` calcula 20px — coincide con Figma. El efecto visible más notorio es un sutil aumento de +2px en botones e inputs (`radius/interactive`, el token más usado de toda la capa numérica, 620 bindings), comprobado en la landing sin distorsión ni aspecto "pill" accidental.

#### Rampa de spacing: múltiplos de 4, 0–96 px (23-ago-2026)

Los 11 primitivos de `spacing/*` en `Primitives` seguían la convención de índice de Tailwind (`spacing/1`=4px, `spacing/2`=8px … `spacing/14`=56px, saltándose 9 y 11 igual que Tailwind), en vez de nombrar por el valor real en px. Se renombraron a valor-en-px (mismos IDs, sin recrear, así que los alias semánticos no se tocaron) y se crearon los pasos que faltaban, para que la rampa cubra **todos** los múltiplos de 4 entre 0 y 96 sin huecos: `spacing/0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96` (25 variables).

Los dos primitivos de tamaño de página (`spacing/60`=240px y `spacing/120`=480px, ver más abajo) usaban esa misma convención de índice y su nombre habría colisionado con el nuevo `spacing/60` (60px) de la rampa. Se renombraron a `spacing/240` y `spacing/480` para quedar consistentes con el resto de la familia: **todo `spacing/N` significa ahora N píxeles, sin excepción.**

#### Rejilla estricta de 4px: fin de los medios pasos (24-ago-2026)

La rampa arrastraba cuatro primitivos fuera de la rejilla: `spacing/0-5`=2px, `spacing/1-5`=6px, `spacing/2-5`=10px (los medios pasos de Tailwind `0.5`/`1.5`/`2.5`) y `spacing/18-4`=18.4px. **Los cuatro se eliminaron y el código se migró a la vez** — la escala de `spacing` es ahora `0 · 4 · 8 · … · 96 · 240 · 480`, sin un solo valor que no sea múltiplo de 4.

**Regla de conversión: redondear siempre hacia arriba** al siguiente múltiplo de 4 (2→4, 6→8, 10→12). Hacia arriba y no hacia abajo porque apretar un espaciado tiende a verse roto, mientras que soltarlo solo respira más. En el código son **125 sustituciones en 25 archivos** (de 509 utilidades de espaciado totales, un 24 % estaba en medio paso): `space-y-1.5`→`space-y-2` ×47, `gap-1.5`→`gap-2` ×28, `gap-0.5`→`gap-1` ×10, `px-2.5`→`px-3` ×5, y 35 más. El efecto visible es que **los grupos label–input–error de todos los formularios pasan de 6 a 8 px** (era el patrón documentado `space-y-1.5`, ver más abajo), y los botones ganan 2px de padding horizontal en tamaño `sm`.

Dos exclusiones deliberadas del barrido:

- **`gemini-2.5-flash`** en `route.ts` y `errors.test.ts` — es el nombre del modelo de IA, no una clase de Tailwind. Un `sed` sobre `-2.5` lo habría corrompido.
- **`hover:-translate-y-0.5`** en `PersonCard` — es la amplitud del "levantar el papel" al hover, una transformación de movimiento, no una medida de layout. Doblarla a 4px cambiaría la sensación de la interacción; la rejilla de espaciado gobierna disposición, no la distancia de una animación.

**Trampa al hacer este barrido**: `gap-1.5` **contiene** la subcadena `p-1.5`, así que un reemplazo literal ingenuo procesa esa clase dos veces. Hay que anclar el inicio de cada clase (que el carácter previo no sea palabra ni guion) — el prefijo de variante (`hover:`, `md:`, `[&::-webkit-scrollbar]:`) sí debe seguir matcheando.

**Consecuencia asumida: la capa semántica colapsa algunos escalones.** Al no existir 2/6/10, pares de tokens semánticos adyacentes resuelven ahora al mismo valor — `spacing/inset/2xs` = `inset/xs` (4px), `inset/sm` = `inset/md` (8px), `inset/lg` = `inset/xl` (12px), `inline/sm` = `inline/md` (8px), `size/interactive-2xs` = `interactive-xs` (8px), `interactive-sm` = `interactive-md` (12px). Es inherente a la rejilla: el nivel semántico tenía más granularidad de la que una rejilla de 4px permite expresar. **No se han fusionado a propósito** — siguen siendo roles distintos que hoy comparten valor, y fusionarlos rompería la completitud de las familias `2xs…4xl` y obligaría a repuntar los tokens de componente. Si algún día molesta la redundancia en el picker, es una decisión aparte.

**`spacing/18-4` (18.4px) eliminado el 24-ago-2026** — a diferencia de los tres anteriores, este no era un paso real de Tailwind, sino el espejo de un valor arbitrario hardcodeado en `switch.tsx`: `data-[size=default]:h-[18.4px] data-[size=default]:w-[32px]`. Su único consumidor en Figma (`size/interactive-track`, la altura del track del Switch por defecto) se repuntó al primitivo ya existente `spacing/20`, y el componente real se corrigió a la vez: `h-[18.4px] w-[32px]` → `h-5 w-8` (utilidades limpias de Tailwind para 20px y 32px — `w-8` ya daba exactamente 32px, solo se limpió la sintaxis de corchete). Mismo criterio que con `radius`: si el valor tiene un reflejo real en código (aunque sea un arbitrario suelto, no una variable), hay que tocar los dos lados a la vez. Verificado: `h-5` calcula 20px en el dev server; `w-8` no se pudo comprobar en directo porque el Switch solo vive detrás de login (Ajustes), pero usa el mismo `--spacing` base de Tailwind (sin sobreescribir en `globals.css`) que `h-5`, ya confirmado.

#### Grupo `size/*` de primitivos: 0–44 px (24-ago-2026, ampliado el 25)

> **Familia retirada el 15-sep-2026**; ver «Una sola rampa de píxeles», justo debajo. Lo que sigue es el registro de por qué se creó, que sigue explicando el archivo aunque la familia ya no exista.

Nueva familia de primitivos en `Primitives`, 12 variables en múltiplos de 4: `size/0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44`. Misma convención que `spacing`: **`size/N` significa N píxeles.** Scope vacío y ocultas al publicar, como el resto de la capa. Nació con 9 pasos (0–32) y el 25-ago-2026 se estiró a 44 al crear `sizing/*`, que necesitaba 36 y 44. **`size/40` se creó sin necesitarlo nadie**, solo para que la rampa no tenga un hueco entre 36 y 44 — el mismo criterio que en `spacing`, donde todos los múltiplos de 4 existen; su consumidor natural es `size/avatar/lg` (40px, hoy sobre `icon/10`).

Existe para cerrar un desajuste de tipo que hasta ahora solo estaba resuelto en la capa semántica: los tokens de dimensión (`size/interactive-*`, `size/avatar/*`, `size/control/icon-*`) aliasan hoy a primitivos de **`spacing/*`** (6 casos) o de **`icon/*`** (15 casos), es decir, una medida de ancho/alto apuntando a un primitivo de separación. Con esta familia esas cadenas pueden apuntar a un primitivo del tipo correcto.

**Ya lo consume `sizing/*`** (6 de los 12 pasos: 16, 20, 24, 32, 36 y 44), pero la familia vieja `size/interactive-*` de `Medidas` sigue apuntando a `icon/*` y `spacing/*`. Repuntar solo lo que cabe en 0–44 dejaría la familia semántica partida en tres convenciones a la vez: `size/*` para los ≤44, `icon/*` para 14/64/96 y `spacing/*` para los 240/480 de nivel de página. Serían 15 tokens migrables —con la rampa hasta 44, `size/icon/xl` (36) y `size/avatar/lg` (40) ya entran— y 6 fuera de rango (`size/control/icon-sm` y `size/interactive-lg` a 14px; `size/interactive-5xl` 64; `size/media-lg` 96; `size/sidebar/width` 240; `size/event-column/width` 480). Antes de migrar hay que decidir si la familia `size` se extiende para cubrir todo ese rango; media migración es peor que ninguna.

**Trampa de nomenclatura, importante**: dentro de la misma colección conviven ahora dos convenciones opuestas para `N`. `spacing/N` y `size/N` significan **N píxeles** (`spacing/12` = 12px), pero **`icon/N` sigue la convención de índice de Tailwind** — `icon/3` = 12px, `icon/4` = 16px, `icon/8` = 32px. Al leer una cadena de alias hay que tener presente cuál de las dos se está usando. La familia `icon` conserva además su medio paso `icon/3-5` = 14px, fuera de la rejilla de 4 (30 usos de `size-3.5` en código; 14px es un tamaño de icono estándar y una rejilla estricta daría 12 o 16, perdiendo ese paso).

#### Una sola rampa de píxeles: se retiran `size/*` e `icon/*` (15-sep-2026)

`Primitives` tenía tres familias numéricas en píxeles a la vez —`spacing/*` (27 pasos), `size/*` (12) e `icon/*` (14)— y dos convenciones opuestas para el número: `spacing/N` y `size/N` significaban N píxeles, `icon/N` era un índice en pasos de 4. Queda solo `spacing/*`, más el medio paso de 14 px que aportaba `icon/3-5`. El archivo baja de 374 a 349 variables y `Primitives` de 166 a 141.

**Lo que decidió el caso**: los 12 valores de `size/*` tenían gemelo exacto en `spacing/*` —los 12, no la mayoría— y 13 de los 14 de `icon/*` también. Ninguna de las dos aportaba un número que no existiera ya, solo un segundo nombre para el mismo número. Y el nombre no era inocuo: **`icon/16` valía 64 px mientras `size/16` valía 16**, así que el mismo número decía dos cosas dentro de la misma colección.

**Esto revierte la decisión del 24-ago-2026** que creó `size/*` (sección de arriba). El argumento de entonces era real —una anchura no debería aliasar un primitivo de separación— pero se resolvió en la capa equivocada. Un primitivo, por la definición que usa este mismo documento, «no dice para qué sirve, solo dice cuánto vale»: partirlo por uso contradice lo que es. Esa distinción ya estaba hecha donde importa, en la capa semántica —`space/*` separa, `sizing/*` dimensiona—, y duplicarla abajo no la reforzaba, obligaba a elegir dos veces. Es además lo que hacen Tailwind y Radix, que este archivo espeja: una sola escala alimenta `p-4`, `gap-4`, `w-4` y `h-4`.

**Sobrevive `spacing/*` y no `size/*`** por ser el superconjunto (27 pasos contra 12) y por ser el nombre que Tailwind da a esa escala unificada. Que «spacing» suene a separación y una anchura no lo sea es el peaje aceptado: renombrar la superviviente a algo neutro añadiría un dialecto más al archivo.

**Cómo se hizo, y por qué no se movió un píxel**: se creó `spacing/14`; se repuntaron los 28 alias semánticos que colgaban de las dos familias (9 de `icon/*`, 19 de `size/*`) al paso de `spacing/*` con el mismo valor; se compararon los 79 tokens de `space/*` y `sizing/*` resueltos antes y después —cero diferencias— y solo entonces se borraron los 26 primitivos. **Cero bindings de nodo directos** a las tres familias en los 12.124 nodos del archivo, y ninguna tenía `codeSyntax`, así que ni el picker de un diseñador ni el puente con el código se enteran del cambio.

**Las descripciones de `spacing/*` se reescribieron enteras**, y no por estética: la plantilla decía «apply spacing through the space/* tokens» y la rampa alimenta ahora también a `sizing/*`. En el mismo pase absorbieron los usos de producto que documentaban las familias borradas —el avatar de 48 px de las tarjetas de lista, el de 80 del perfil, los iconos del catálogo visual a 36— que si no se habrían ido con ellas.

**Lo que queda abierto**, y es de la auditoría de nomenclatura, no de este pase: la caja de la casilla y el glifo de icono siguen compartiendo los mismos tres valores (16 · 20 · 24), separados a propósito desde el 25-ago-2026. La colisión de nombres que había aquí se cerró el 15-sep-2026 — ver «Una palabra por objeto», más abajo.

#### Grupo `opacity/*` de primitivos: escala 0–100 (25-ago-2026)

Nueva familia de primitivos en `Primitives`, hoy 7 variables: `opacity/0, 10, 50, 75, 80, 90, 100` — el 80 se añadió el 25-ago-2026 al crear la capa semántica (ver más abajo). Scope vacío y ocultas al publicar, como el resto de la capa.

**La escala va de 0 a 100, no de 0 a 1, y esto no es cosmético.** Figma resuelve las variables vinculadas a opacidad en **porcentaje**: una variable a `0,5` pinta el nodo al 0,5 %, es decir invisible. Ya se pagó ese peaje con `opacity/disabled` (ver el Switch, más abajo), así que la familia nace en la unidad correcta y **`opacity/N` significa N por ciento** — el nombre y el valor coinciden. Las referencias de fuera (guías de tokens, kits de terceros) suelen listar esta misma rampa como `0 / 0,1 / 0,5 / 0,75 / 0,9 / 1`; copiarla literal aquí rompe todo binding.

**Nació sin consumidores a propósito**, igual que `size/*`; los tiene desde el mismo 25-ago-2026, cuando se creó la capa semántica `opacity/*` (ver más abajo). En el mismo pase se repuntó `opacity/disabled` de `Medidas` —valor literal 50— a un alias de `opacity/50`: 0 cambios de valor resuelto, sus 8 bindings de nodo intactos, y con eso desaparece el último literal que existía *por falta de rampa*, que era el motivo de existir de esta familia. Los 6 de `z-index/*` que se crearon después son literales por decisión razonada, no por carencia — ver su sección.

#### La tríada `space/*`: `inset`, `stack` e `inline` en 5 pasos (25-ago-2026)

15 semánticos nuevos en `Semantic`: tres familias con la misma escala y scope `GAP`, aliasando a la rampa de primitivos —`xs`→`spacing/4` · `sm`→`spacing/8` · `md`→`spacing/16` · `lg`→`spacing/24` · `xl`→`spacing/32`—. `space/inset/*` es padding interior, `space/stack/*` gap vertical y `space/inline/*` gap horizontal: los tres ejes del patrón con un vocabulario de pasos común, para que elegir un espaciado sea elegir eje y tamaño, nada más. Publicadas (los semánticos no se ocultan) y sin `codeSyntax`, como el resto de familias que solo viven en Figma. Cada una lleva su uso en la descripción, aterrizado en el producto: `stack/sm` es el grupo label-input-error (8px), `inline/xs` el icono y el texto de un botón `sm` (4px), `stack/lg` la separación entre secciones de un formulario (24px).

**Van en `Semantic`, no en `Medidas`, y son las primeras familias numéricas que lo hacen.** Con eso el criterio de «agrupar por tipo de dato» deja de describir el archivo: `Semantic` pasa a ser la colección de la capa semántica —el nombre empieza a decir la verdad— y `Medidas` queda como lo que aún no se ha movido, no como el sitio natural de las medidas. El peaje: `Semantic` tiene dos modos, así que un token de spacing, *mode-invariant* por definición, **guarda el mismo alias duplicado en Light y en Dark**. Es el mismo «espejismo de dos columnas idénticas» que motivó darle un solo modo a `Primitives`, aceptado aquí a cambio de tener la capa semántica junta. **Al crear más tokens numéricos ahí, rellenar los dos modos**: una variable nace a 0 en todos los modos, así que si solo se pone el valor en Light, en Dark el espaciado se va a 0 al cambiar de tema.

**Las tres familias existen porque las viejas colapsaron o nacieron incompletas.** `spacing/inset/*` son 8 tokens que resuelven a cuatro valores (`2xs`=`xs`=4px, `sm`=`md`=8px, `lg`=`xl`=12px, y después 40 y 56), sin un solo paso entre 12 y 40; `spacing/stack/*` son 4 (4 · 8 · 12 · 16, sin `sm`) y `spacing/inline/*` solo 3 (8 · 8 · 12, con `sm`=`md`) — ver la rejilla estricta de 4px, más arriba. La escala nueva es idéntica en los tres ejes, sus cinco pasos se distinguen entre sí y llega hasta 32.

**Conviven con las familias viejas de `Medidas`, así que el archivo tiene dos prefijos para la misma propiedad** (`space/` y `spacing/`), lo que contradice la regla de nomenclatura de más abajo. Se han creado aparte porque un nombre no se puede repetir dentro de una colección y porque las viejas tienen consumidores. **El coste de cerrar la duplicidad está medido y es muy distinto según la familia**:

- `spacing/inset/*` (8 tokens): **7 referencias de alias** desde tokens de componente (`empty-state/padding-minimal`→`3xl`, `empty-state/padding-full`→`4xl`, `switch/track-inset`→`2xs`, `badge/padding-x`→`md`, `menu/padding`→`xs`, `menu/item-padding-x`→`sm`, `popover/padding`→`lg`) y solo **3 bindings de nodo**, todos de `inset/xl`.
- `spacing/stack/*` y `spacing/inline/*` (7 tokens): **0 referencias de alias** y **65 bindings de nodo** fuera de instancias, más 30 dentro que siguen a su componente — `stack/lg` 14, `inline/sm` 13, `stack/xl` 12, `inline/lg` 9, `stack/xs` 6, `stack/md` 6, `inline/md` 5. Aquí el trabajo está en los nodos, no en los alias.

**Trampa al migrar: hacerlo por valor, no por nombre.** Los pasos de una generación a otra no se corresponden — el viejo `stack/md` vale 8px y su equivalente nuevo es `stack/sm`; el viejo `stack/xl` vale 16 y es el nuevo `stack/md` —. Repuntar por nombre cambiaría el espaciado de decenas de nodos en silencio. Y hay valores sin destino en la escala nueva: los 12px de `stack/lg`, `inline/lg` e `inset/lg|xl` tienen que elegir entre 8 y 16, y los 40 y 56 de `empty-state/*` se salen del techo de 32 — o se extiende la escala con `2xl`/`3xl`, o esos tokens aliasan al primitivo saltándose el semántico. Lo mismo pasaría con los 20px de `field-group/gap` y `card/padding-lg` si algún día se les hace pasar por la capa semántica en vez de aliasar directo al primitivo. Mientras las dos generaciones existan, **al aplicar espaciado nuevo usar `space/*`**.

#### Grupo `sizing/*`: interactive, control e icon en 3 pasos (25-ago-2026)

> **Dos de las tres familias se renombraron el 15-sep-2026**: `interactive` pasó a `control`, y el `control` de entonces a `selection`. Ver «Una palabra por objeto», más abajo.
>
> **Desde el 15-sep-2026 aliasan a `spacing/*`**, no a `size/*`: esa familia se retiró. Valores idénticos, cero cambios resueltos.

9 semánticos nuevos en `Semantic`, scope `WIDTH_HEIGHT`, aliasando a la rampa `size/*` —el primitivo del tipo correcto, no a `icon/*` ni a `spacing/*`—: `sizing/interactive/{sm,md,lg}` = 32 · 36 · 44 px (altura de botón e input; los 44 son el touch target de WCAG 2.5.5, nivel AAA), `sizing/control/{sm,md,lg}` = 16 · 20 · 24 px (caja de checkbox y radio) y `sizing/icon/{sm,md,lg}` = 16 · 20 · 24 px (glifo). Publicados y sin `codeSyntax`, como el resto de familias que solo viven en Figma. Es la contrapartida de dimensión de la tríada `space/*`: mismo sitio, mismo patrón de tres pasos, y por eso el prefijo es `sizing/` y no `size/`, que ya nombra a los primitivos.

**`control` e `icon` tienen los mismos tres valores (16 · 20 · 24) a propósito.** No se fusionan porque son roles distintos —la caja de un control y el glifo que va dentro escalan por motivos diferentes— y porque el día que el checkbox suba a 20px de base, solo debe moverse una de las dos familias. Es el mismo criterio que se aplicó al no fusionar los pasos colapsados de `spacing/inset/*`.

**Se solapa con `size/interactive-*` de `Medidas`, que es la familia que esto viene a sustituir**, y el solape es más profundo que en `space/*`: la vieja tiene 11 pasos (`2xs`…`5xl` más `track`) que resuelven a 8 · 8 · 12 · 12 · 14 · 16 · 20 · 24 · 32 · 64 y 20, es decir dos parejas repetidas, un valor fuera de la rejilla de 4 (14px) y ningún paso entre 32 y 64. Además **aliasa a primitivos del tipo equivocado** (`icon/*` en 15 casos, `spacing/*` en 6), que es justo el desajuste que motivó crear `size/*`. La nueva no cubre todo ese rango: los 8 y 12 px de los badges de avatar y del thumb del switch, los 14 de `control/icon-sm`, los 64 del textarea y los 96 de `media-lg` se quedan fuera de 32–44 y de 16–24. Migrar implica decidir si `sizing/` crece con `2xs`/`xs`/`xl` o si esos tokens de componente aliasan al primitivo directamente.

#### Una palabra por objeto: `control` es el botón, `selection` la casilla (15-sep-2026)

`control` designaba dos objetos distintos, y la frontera pasaba por dentro de la misma carpeta: `sizing/control/icon-md` era «el icono dentro de un control» —un botón— y su hermano `sizing/control/md`, «checkbox o radio estándar». Sumando el archivo entero, `control` era el botón o el input en 11 tokens con unos 7.500 bindings, y la caja del checkbox en 3 con ninguno. En paralelo, `interactive` nombraba ese mismo botón en otros 4 —`radius/interactive` decía literalmente «Button, Input, Select and Textarea»—, así que el objeto más usado del archivo tenía dos nombres según la categoría: su altura era `interactive` y su padding `control`.

Nueve renombrados puros lo dejan en una palabra por objeto:

| Antes | Ahora | Qué es |
|---|---|---|
| `sizing/control/{sm,md,lg}` | `sizing/selection/{sm,md,lg}` | La caja de checkbox y radio (16 · 20 · 24) |
| `sizing/interactive/{sm,md,lg}` | `sizing/control/{sm,md,lg}` | La altura de botón e input (32 · 36 · 44) |
| `radius/interactive` | `radius/control` | El radio de botón, input, select y textarea |

**Por qué gana `control` y no `interactive`**, que es la pregunta que decide el pase. No por mayoría: porque `interactive` tiene dos defectos nombrables. Es un adjetivo sin objeto —`sizing/interactive/md` no dice *medio qué*, mientras sus vecinos `radius/surface`, `radius/tag` y `radius/pill` son sustantivos— y obligaba a que `radius/interactive` y `radius/control-sm`, que son el mismo radio en dos tamaños, se llamaran con palabras distintas. Unificar al revés, además, habría dado `space/interactive/padding-x` y `sizing/interactive/icon-md` («padding de un interactivo») y habría tocado 3.355 bindings en vez de 2.204.

**Es una divergencia nueva con la guía canónica y está registrada como tal** en la tabla de [`docs/figma-tokens.md`](figma-tokens.md). La guía nombra el rol `interactive` (`radius-interactive`, `size-interactive-*`) y no tiene ningún `control`; pero tampoco tiene token para el padding, el gap, el icono interior ni un radio pequeño de ese mismo objeto, que es justo lo que el archivo tuvo que inventar y bautizó `control`. El vocabulario de la guía cubría 4 tokens y el propio 14: seguirla aquí significaba dejar el objeto con dos nombres para siempre.

**Deshace el renombrado del 23-ago-2026** que llevó `radius/control` a `radius/interactive` (ver «Cómo se nombran las variables»). El criterio de entonces —nombrar por el rol de la guía y no por el componente donde se usó primero— era bueno, pero se aplicó cuando `control` todavía no era la palabra que el archivo usaba para catorce cosas.

**Coste: cero.** Renombrado puro: id, valores, alias, bindings y `codeSyntax` intactos. Verificado token a token —19 valores resueltos sin una sola diferencia, ningún alias roto, y los bindings donde estaban: `radius/control` conserva sus 2.204 y `sizing/control/icon-*` sus 1.664 · 1.054 · 324—. Las seis variables de `sizing/control/*` y `sizing/selection/*` tenían 0 bindings de nodo entre todas; sus consumidores son alias, que van por id.

**Lo que no cambia**: `sizing/selection/*` y `sizing/icon/*` siguen compartiendo los tres valores 16 · 20 · 24 a propósito, por el motivo del 25-ago-2026 —la caja y el glifo escalan por razones distintas—. Y `sizing/slider/thumb` sigue aliasando `sizing/selection/sm` aunque un slider no sea un control de selección: eso es una elección del consumidor, no del nombre de la familia.

#### Grupo `radius/*` en `Semantic`: 4 roles (25-ago-2026)

> **`radius/interactive` pasó a `radius/control` el 15-sep-2026**, para emparejar con `radius/control-sm`. Ver «Una palabra por objeto», justo encima.

4 semánticos nuevos en `Semantic`, scope `CORNER_RADIUS`, aliasando a la rampa de primitivos: `radius/interactive`→`radius/lg` (16px, Button/Input/Select), `radius/surface`→`radius/xl` (20px, Card, modales, popovers), `radius/tag`→`radius/xs` (4px) y `radius/pill`→`radius/full` (999px, avatares, toggles, badges). Publicados y **con los dos modos rellenos** (`Semantic` tiene Light y Dark y una variable nace a 0 en todos los modos), igual que `space/*` y `sizing/*`.

**Los valores salen del código, no de la guía de referencia.** El modelo canónico de tokens pinta este grupo como `interactive` 8px y `surface` 12px; copiarlo literal habría puesto en Figma un botón de 8 y una card de 12 frente a los 16 y 20 que renderiza la app (`rounded-lg` en [`button.tsx`](../src/components/ui/button.tsx) e [`input.tsx`](../src/components/ui/input.tsx), `rounded-xl` en [`card.tsx`](../src/components/ui/card.tsx)). Se ha mapeado cada rol al primitivo que el código usa de verdad — la regla de siempre: si Figma contradice el código, gana el código. Del modelo de referencia se toma la **estructura** (qué roles existen), nunca la escala.

**Es la primera vez que el archivo repite un nombre completo en dos colecciones**: `radius/interactive`, `radius/surface` y `radius/pill` existen ahora en `Medidas` y en `Semantic`, con el mismo valor resuelto. En `space/`↔`spacing/` y `size/`↔`sizing/` la duplicidad se resolvió con un prefijo nuevo; aquí no hay prefijo alternativo honesto —`radius` es el nombre del rol— así que en el picker salen dos veces, desambiguados solo por la colección. **Cerrarlo no es borrar**: los de `Medidas` cargan los bindings caros del archivo (`radius/interactive` 620, `radius/pill` 424) y el `codeSyntax` que lee Dev Mode, así que la migración es repuntar nodos, no eliminar tokens.

**Los nuevos nacen sin `codeSyntax` a propósito**, aunque el rol sí tenga variable CSS detrás (a diferencia de `space/*` y `sizing/*`, que solo viven en Figma). El gemelo de `Medidas` ya reclama `var(--radius-lg)`, `var(--radius-xl)` y compañía, y dos tokens ofreciendo la misma custom property en Dev Mode es peor que uno solo. **Al migrar hay que mover el `codeSyntax` junto con el rol**, no duplicarlo.

**La familia no cubre todavía todo lo que el código redondea.** Fuera quedan los 24px de `rounded-2xl` (8 usos: cards de ideas, empty states, paneles — hoy `radius/panel`), los 12px de `rounded-md` (8 usos más los dos `rounded-[min(var(--radius-md),12px)]` de `button.tsx` — hoy `radius/control-sm`) y los 8px de `rounded-sm` (4 usos, logos de tienda — hoy `radius/logo`). Antes de migrar hay que decidir si `surface` gana un segundo paso y si `interactive` gana uno pequeño, o si esos tres roles se quedan en `Medidas`; media migración es peor que ninguna, igual que en `sizing/*`.

**`radius/tag` es el único rol sin gemelo y también el único sin consumidor real.** El modelo de referencia lo describe como el radio de badges y tags, pero en este producto los badges son pill (`rounded-4xl` en Badge, que resuelve a `radius/pill`) y el único 4px del código es el checkbox de [`/settings`](<../src/app/(app)/settings/page.tsx>) (`className="rounded"`, la utilidad pelada de Tailwind, ajena a la escala `--radius-*`). Se ha creado porque el modelo lo pide y el paso existe, pero hoy nombra un rol que el producto no usa; su descripción en Figma lo dice para que nadie lo tome por el radio de los badges.

#### Grupo `border-width/*` en `Semantic`: 3 roles (25-ago-2026)

3 semánticos nuevos en `Semantic`, scope `STROKE_FLOAT`, con los dos modos rellenos y sin `codeSyntax` (aquí no hay variable CSS detrás: en código son las utilidades nativas `border`, `border-2` y `ring-3` de Tailwind): `border-width/default`→`border-width/1` (1px, Card, Input, Textarea, Select, separadores), `border-width/strong`→`border-width/2` (2px) y `border-width/focus`→`border-width/3` (3px).

**`strong` y `focus` no son el mismo token con dos nombres, y por eso no valen lo mismo.** El modelo de referencia pinta los dos a 2px, lo que los volvía indistinguibles salvo por la descripción. En el código son dos cosas medibles y distintas: `strong` es **selección** —el swatch elegido de [`AvatarPicker`](../src/components/people/AvatarPicker.tsx) (`border-2`) y el subrayado del título editable de la ficha de persona (`border-b-2`)—, y `focus` es el **anillo de foco de teclado**, que en la capa `ui` vale **3px**: `focus-visible:ring-3` en Button, Input, Select, Textarea, Switch y Slider, `focus-visible:ring-[3px]` en Badge (mismo valor, sintaxis de corchete), 5 `aria-invalid:ring-3` y el `focus:ring-3` del enlace de salto de [`layout.tsx`](<../src/app/(app)/layout.tsx>). Gana el código, como siempre: `focus` es 3, no 2.

**Ese 3px obligó a crear el primitivo `border-width/3`**, que no existía — la rampa se quedaba en 0 · 1 · 2. Regla aplicada, la misma que en el hub de marca: si el paso no existe en la capa de abajo, se crea ahí primero; nunca se aliasa a un paso aproximado ni se salta un eslabón con un valor literal.

**Quedan 4 focus a `ring-2` escritos a mano**, fuera de la capa `ui` y por tanto fuera del token: la constante `FOCUS` de `AvatarPicker`, el botón de foto de la ficha de persona, [`UpcomingDateCard`](../src/components/dashboard/UpcomingDateCard.tsx) y [`DatePickerDialog`](../src/components/people/DatePickerDialog.tsx). Son deriva de código, no un rol distinto: lo coherente es subirlos a `ring-3`, no crear un `border-width/focus-sm` que la bendiga. Los otros `ring-2` del código **no son foco y sí encajan en `strong`**: el `SELECTED` de `AvatarPicker` (`ring-2 ring-primary`, selección expresada con anillo en vez de borde) y los 3 anillos de separación de [`avatar.tsx`](../src/components/ui/avatar.tsx) (`ring-2 ring-background`, el recorte del badge y del grupo apilado).

**Los tres primitivos `border-width/0·1·2` estaban publicados y sin descripción**, únicos de toda la colección `Primitives` que se salían de la regla del párrafo de arriba (scope vacío + `hiddenFromPublishing`). Corregido en el mismo pase, sin coste: tenían **0 referencias de alias y 0 bindings de nodo** en las 34 páginas del archivo, comprobado con un recorrido completo antes de tocarlos. `border-width/3` nace ya oculto y descrito.

#### Grupo `opacity/*` en `Semantic`: 4 estados (25-ago-2026)

4 semánticos nuevos en `Semantic`, scope `OPACITY`, dos modos rellenos y sin `codeSyntax`: `opacity/disabled`→`opacity/50` (50 %), `opacity/hover`→`opacity/80` (80 %), `opacity/pressed`→`opacity/75` (75 %) y `opacity/skeleton`→`opacity/10` (10 %). Son los primeros consumidores de la rampa de primitivos creada el mismo día, y **la unidad sigue siendo el porcentaje**: aliasar es seguro porque el primitivo ya está en 0–100, pero cualquier valor literal que se escriba aquí a mano tiene que ser 50, no 0,5.

**`hover` vale 80, no 90.** El modelo de referencia lo pone en 90; el único hover de opacidad que existe en el producto es el `hover:opacity-80` del thumb de [`UpcomingDateCard`](../src/components/dashboard/UpcomingDateCard.tsx), que es exactamente el rol que describe («hover de imágenes, thumbnails»). Gana el código. Eso obligó a **crear el primitivo `opacity/80`**, que no estaba en la rampa — misma regla que con `border-width/3`: el paso se crea abajo antes de aliasar, nunca se redondea al vecino.

**`pressed` y `skeleton` son roles adelantados: hoy no tienen ni un consumidor en código**, y conviene saberlo antes de vincular nada a ellos.

- **`pressed`**: no hay un solo `active:opacity-*` en el producto. Se crea porque el modelo lo pide y el paso ya existía, igual que nacieron `size/*` y la propia rampa de opacidad.
- **`skeleton`**: los 5 loaders reales (agenda, seres queridos, `GiftsPanel`, `GenerationProgress`, `LoadingFallback`) **no usan opacidad de elemento**, sino alfa de color —`border-border/60`, `bg-muted/40`, `bg-muted-foreground/50`— más `animate-pulse`, cuyos keyframes oscilan entre 100 % y 50 %. Es decir: la opacidad más baja que un skeleton alcanza de verdad es 50, no 10. Vincular un skeleton de Figma a este token **no reproduce el loader del producto**; el aviso está en la descripción de la variable.

**`opacity/disabled` duplica nombre con el de `Medidas`**, cuarto caso del archivo tras los tres de `radius/*`. Los dos resuelven ahora a 50 vía el mismo primitivo, pero el de `Medidas` es el que carga los **8 bindings de nodo** (estados `Disabled` de Input, Textarea y compañía), así que sigue siendo el que pinta. Retirarlo es rebindear esos 8 nodos, no borrar la variable.

**Dos opacidades del código se quedan fuera de la familia, a propósito**: los `opacity-0`/`opacity-100` de los overlays que aparecen al hover (9 y 6 usos) son un interruptor de visibilidad, no un estado de énfasis —el rol lo cubriría un token de animación, no éste—, y el `opacity-40` del icono de regalo de [`NotificationBell`](../src/components/layout/NotificationBell.tsx) es un arbitrario suelto de un solo uso: mismo criterio que los `text-[10px]`, o se limpia en código o se promueve a rol, pero no se bendice creando un primitivo `opacity/40` para él.

#### Grupo `z-index/*`: 6 capas de apilamiento (25-ago-2026)

6 semánticos nuevos en `Semantic` —`dropdown` 1000 · `sticky` 1100 · `overlay` 1300 · `modal` 1400 · `popover` 1500 · `toast` 1700—, **con el valor escrito a mano en los dos modos y sin primitivo debajo**. Son la única familia del archivo que no aliasa a nada, y es deliberado: el porqué, más abajo.

**Es el único grupo del archivo que no se puede vincular a nada.** Figma no tiene una propiedad de apilamiento, así que aquí el scope vacío no es la decisión de diseño que sí es en los primitivos: es que no existe picker donde ofrecerlo. Son **documentación pura** —el orden de capas escrito donde se consulta el sistema— y por eso los 6 semánticos van publicados pero sin scope, y sin `codeSyntax`, que hoy no tendría a qué apuntar.

**No es un espejo del código, es una propuesta, y conviene decirlo sin rodeos**: el producto apila con la escala corta de Tailwind —`z-50` en 11 sitios (Dialog, Sheet, Popover, Select, las sugerencias de `InterestTagInput`, los dos botones flotantes de la ficha de persona y de Ajustes, y el enlace de salto), `z-40` en 1 (la barra superior móvil de `GiftsPanel`) y `z-10` en 4 (badge de avatar, `PersonCard`, los botones de scroll de `Select`)—. **Ni un solo valor entre 1000 y 1700 existe hoy en el código.** En los otros tres grupos de este pase la regla «gana el código» decidía un valor concreto; aquí decidiría el grupo entero, así que se documenta la escala propuesta y se deja el desajuste a la vista en la descripción de cada variable.

**El desajuste que más importa: `overlay` y `modal` son hoy la misma capa.** En [`dialog.tsx`](../src/components/ui/dialog.tsx) (líneas 34 y 56) y [`sheet.tsx`](../src/components/ui/sheet.tsx) (31 y 56) el backdrop y el contenido comparten `z-50`; lo que los ordena es el orden del DOM, no el `z-index`. Separarlos en 1300 y 1400 no es renombrar nada: es cambiar cómo apila el producto. Mismo aviso con `popover`, que cubre solo popovers — **no hay componente Tooltip** en el sistema.

**`toast` seguirá siendo documental aunque se migre el resto.** Los toasts los monta Sonner, que apila su propio contenedor fijo en `z-index: 999999999` (con su variable `--z-index`) y no toca ninguna utilidad `z-*` del proyecto. El 1700 describe la intención —los toasts van encima de todo—, no el número que se pinta.

**Por qué van con valor literal y no sobre una rampa de primitivos.** Nacieron con una (`z-index/1000…1700`, 8 pasos) y se descartó el mismo día: **un primitivo se gana el sitio cuando varios roles lo comparten o cuando cambiarlo debe moverlos a todos**, y aquí la correspondencia era 1:1 —6 roles, 6 pasos, dos sin consumidor— así que el eslabón no gobernaba nada. Peor: **dos capas que compartieran valor serían un bug**, porque lo único que aporta un z-index es el orden total; el primitivo no puede llegar a tener un segundo consumidor legítimo. Es el mismo argumento por el que `opacity/disabled` fue literal mientras no hubo rampa («una familia de un solo miembro añade un eslabón sin nada que gobernar»), aquí multiplicado por seis.

**Y hay una diferencia de fondo con las demás rampas**: en color, radio o espaciado el número *es* la decisión de diseño (16px, `#0C2912`) y el rol solo le pone nombre; en z-index el número no significa nada por sí mismo, solo su rango — 1400 no es «más modal» que 1300, es «después». No hay nada debajo del rol que merezca nombre propio. **El precio, asumido**: son los 6 únicos valores directos fuera de la capa primitiva, así que la heurística de recuento de más arriba necesita excluirlos a mano. `1200` y `1600` se quedan libres a propósito, para insertar una capa entre sticky y overlay o entre popover y toast sin renumerar nada.

**Si algún día se migra el código**, el sitio es `globals.css` con `--z-dropdown`, `--z-modal` y compañía consumidas como `z-[var(--z-modal)]`, no arbitrarios sueltos por componente; y entonces estos 6 tokens sí llevarían `codeSyntax`, con la regla de siempre: no tocar un lado sin el otro.

#### Escala de tipografía propia: 13 pasos (24-ago-2026)

El grupo `typography/font-size/*` **ya no es la escala de serie de Tailwind**. Son 13 pasos elegidos a mano, y ni uno más: `2xs` 11 · `xs` 12 · `sm` 14 · `base` 16 · `lg` 18 · `xl` 20 · `2xl` 24 · `3xl` 28 · `4xl` 34 · `5xl` 40 · `6xl` 48 · `7xl` 60 · `8xl` 72. `9xl` (128) se eliminó del tema y de Figma.

Es la primera vez que el proyecto se aparta de Tailwind en **valores**, no solo en nomenclatura, así que la regla de siempre —«si Figma contradice el código, gana el código»— solo se puede cumplir de una forma: **la escala se declara en `globals.css` y Figma la copia**. Está en un bloque `@theme` propio, el segundo del archivo, justo detrás del `@theme inline`, y sobreescribe únicamente los pasos que cambian; `--text-9xl: initial` es la manera de Tailwind de **quitar** un paso del tema, de modo que `text-9xl` deja de generar clase.

**Los seis primeros pasos no se han tocado.** `xs`…`2xl` ya coincidían con Tailwind, así que sus ~233 usos en código (104 `text-xs`, 87 `text-sm`, 22 `text-xl`, 10 `text-lg`, 8 `text-base`, 2 `text-2xl`) calculan exactamente lo mismo que antes, interlineado incluido. Todo el movimiento está en el tramo de display, donde apenas hay uso.

**Tres nombres cambian de valor, y el código se migró para que se vea igual que antes.** `5xl` pasa de 48 a 40, `6xl` de 60 a 48 y `7xl` de 72 a 60, así que el hero de la landing (`text-4xl sm:text-5xl md:text-6xl lg:text-7xl`) habría encogido en tres de sus cuatro breakpoints. Se subió un escalón cada uno → `sm:text-6xl md:text-7xl lg:text-8xl`, que da los mismos 34 → 48 → 60 → 72 px de antes. Regla para la próxima vez: al reasignar valores dentro de una familia de nombres, **migrar las clases para conservar el render** y decidir después si el diseño quiere otro tamaño; haciendo las dos cosas de golpe no se sabe qué causó qué.

**`2xs` (11px) ya es una utilidad de verdad.** `--text-2xs` no existe en Tailwind y ahora se declara aquí, así que los 3 `text-[11px]` que había a mano se migraron a `text-2xs` —mismo valor, cero cambio visible—: el eyebrow de origen de tienda y el hint de fallback de [`GiftRecommendationCard`](../src/components/gifts/GiftRecommendationCard.tsx), y el badge numerado de la landing. Su `codeSyntax` en Figma pasó de vacío a `var(--text-2xs)`.

**Cada tamaño arrastra su interlineado.** Tailwind acopla un `--text-*--line-height` a cada paso, así que los redefinidos necesitan el suyo o el interlineado se sale de la rejilla de 4px: `2xs` → 16px, `3xl` → 36px, `4xl` → 40px (sobre 34px el ratio de serie habría dado 37,8). Se declaran como ratio (`calc(2.25 / 1.75)`), que es como los expresa Tailwind, no como px. `5xl`…`8xl` se quedan con el ratio `1` de serie, que da 40/48/60/72 — todos múltiplos de 4, nada que compensar.

**El override NO puede ir en el bloque `@theme inline`**, y ahí está la trampa del cambio. Dentro de `@theme inline` Tailwind sustituye el valor directamente en la utilidad y **deja de emitir la custom property**: la variable desaparece de `:root` y el `codeSyntax` `var(--text-4xl)` de Figma se queda apuntando a nada. Comprobado en runtime: con el override en `inline`, el `h1` medía 34px correctamente pero `getComputedStyle(document.documentElement)` devolvía vacío para `--text-4xl`. La misma mecánica explica una rareza que ya estaba ahí: de los 8 radios declarados en `@theme inline`, `--radius-md` sí aparece en `:root` y `--radius-xl` no — solo sobrevive la que algo referencia con `var()`, en este caso el `rounded-[min(var(--radius-md),12px)]` de `button.tsx`.

**Quedan tres arbitrarios de tamaño de fuente fuera de la escala**, y no se les ha creado primitivo a propósito: `text-[0.8rem]` en la talla `sm` de [`button.tsx`](../src/components/ui/button.tsx) es 12,8px, un `text-xs` disfrazado a 0,8px de distancia, y debería migrarse en código; los 2 `text-[10px]` de [`NotificationBell`](../src/components/layout/NotificationBell.tsx) y [`PersonCard`](../src/components/people/PersonCard.tsx) son el caso a decidir. Mismo criterio que con `spacing/18-4`: un arbitrario suelto se limpia en código o se promueve a token, pero no se deja a medias.

**El panel de Figma no ordena por valor.** Lista por orden de creación dentro del grupo, así que `2xs` y `3xl` aparecen detrás de `8xl`. No hay API de reordenación y recrear las 10 originales costaría sus 368 bindings de nodo (`sm` sola tiene 266): se convive con ello. Mismo motivo por el que las familias de color llevan mayúscula inicial.

Verificado en el navegador tras el cambio: las 13 `--text-*` se emiten con su valor, `--text-9xl` ya no existe, el `h1` de `/privacidad` calcula 34/40px, `text-2xs` calcula 11/16px, `text-sm` sigue en 14/20px y el hero de la landing da 34 → 48 → 60 → 72 px a 375/700/820/1280 de ancho. `tsc --noEmit` limpio.

#### Interlineado: ratios en código, px en Figma (24-ago-2026)

La escala de interlineado son 5 ratios sin unidad: `tight` 1,1 · `snug` 1,2 · `snug-alt` 1,3 · `normal` 1,4 · `relaxed` 1,5. Se declaran como `--leading-*` en el mismo bloque `@theme` de `globals.css` que los tamaños, sobreescribiendo los de serie de Tailwind (1,25 · 1,375 · 1,5 · 1,625) y quitando `loose` con `--leading-loose: initial`.

**Aprieta el interlineado en 20 sitios**, y es intencionado: `leading-tight` (14 usos: etiquetas de radio/checkbox en `PersonForm` e `ImportantDateForm`, lista de tareas de `GiftsPanel`, nombre en `PersonCard`, `GenerationProgress` y el H1 del panel de ideas) baja de 1,25 a 1,1; `leading-snug` (3: título de `Card`, H3 de `GiftRecommendationCard`, fecha en la ficha de persona) de 1,375 a 1,2; `leading-relaxed` (3 párrafos de cuerpo) de 1,625 a 1,5. `leading-none` (2 usos) no se toca porque en Tailwind es una utilidad estática igual a 1, no una variable de tema, y el `leading-[1.05]` del hero tampoco.

**El límite duro está en Figma: una variable de interlineado se resuelve SIEMPRE en píxeles.** Comprobado con una prueba directa —variable FLOAT de valor 110 vinculada a un nodo de texto puesto en `PERCENT`— y Figma devuelve `{unit: "PIXELS", value: 110}`: la unidad del nodo se ignora al vincular. Es decir, una variable con 1,1 daría un interlineado de **1,1 px**, no de 1,1×, y el porcentaje tampoco es una salida. **Un ratio no es expresable como variable vinculable en Figma**, y por eso el grupo `typography/line-height/*` está partido en dos:

- **Los 5 ratios, en la raíz del grupo.** Llevan scope `LINE_HEIGHT`, como el resto de la colección y como pide la §5 de la guía de tipografía, así que **aparecen en el picker de interlineado — y aplicarlos desde ahí colapsa el texto**: da 1,1 px, no 1,1×. Es una trampa real, no teórica, y lo único que la señala es la descripción de cada variable, que lleva la advertencia y la medición. Su `codeSyntax` apunta a `var(--leading-tight)` y compañía, que en código sí son ratios de verdad; en Figma sirven para documentar la escala y para que Dev Mode la muestre.
- **El subgrupo `px/`**, completo en los 13 tamaños desde el 24-ago-2026 (`2xs` 16 · `xs` 16 · `sm` 20 · `base` 24 · `lg` 28 · `xl` 28 · `2xl` 32 · `3xl` 36 · `4xl` 40 · `5xl` 40 · `6xl` 48 · `7xl` 60 · `8xl` 72), es el único vinculable, y es donde viven los **303 bindings de nodo** del archivo (`sm` 213, `xs` 81, `base` 9). Se renombraron a `px/` en vez de recrearlos, así que los 303 siguen intactos. Su `codeSyntax` sigue apuntando al `--text-*--line-height` emparejado con cada tamaño, que es otra cosa que el ratio: son el interlineado ya resuelto de ese tamaño concreto. Los valores salen de la escala de Tailwind — `5xl`…`8xl` llevan ratio 1, así que su px coincide con el tamaño.

Traducido a la práctica: **al diseñar en Figma se usa `px/`; al implementar se usa la utilidad `leading-*`**. Y si un tamaño necesita un ratio que no está en `px/`, el número correcto se calcula con la tabla de ratios, no se inventa.

**Los ratios se guardan como float32, así que la API los devuelve como 1.100000023841858.** El panel de Figma muestra 1,1 y no es un error: es la misma imprecisión que arrastra cualquier FLOAT del archivo: los 5 pasos de `letter-spacing` también (-0,02 se lee como -0.019999999552965164). No intentar «arreglarlo» redondeando.

Verificado en el navegador tras el cambio: `--leading-tight` resuelve a 1.1, `--leading-snug` a 1.2, `--leading-relaxed` a 1.5, `--leading-loose` ya no existe, y un párrafo `text-sm leading-relaxed` calcula 14/21px (antes 14/22,75). `--leading-snug-alt` y `--leading-normal` aún no se emiten porque ninguna utilidad los usa todavía — Tailwind solo emite las variables de tema en uso.

#### Letter-spacing: grupo nuevo `letter-spacing/*` (24-ago-2026)

Escala de 5 pasos en em: `tighter` -0,02 · `tight` -0,01 · `normal` 0 · `wide` 0,01 · `wider` 0,02. En código son `--tracking-*` en el mismo bloque `@theme`, sobreescribiendo los de serie de Tailwind (-0,05 · -0,025 · 0 · 0,025 · 0,05) y quitando `widest` con `--tracking-widest: initial`. Ojo al leerla: la escala nueva es **la mitad de agresiva** que la de Tailwind en todos sus pasos.

**Afecta a 5 usos**, los de `tracking-tight`: el wordmark de la cabecera (landing, privacidad, términos), el importe de `GiftRecommendationCard` y el título de `DatePickerDialog`. Pasan de -0,025em a -0,01em; medido, sobre 18px van de -0,45px a -0,18px.

**Mismo límite de Figma que el interlineado, y por el mismo motivo**: una variable de `letter-spacing` se resuelve siempre en px, y un valor en em depende del tamaño de fuente, así que no cabe en una sola variable. Los 5 pasos llevan scope `LETTER_SPACING` —como pide la §5 de la guía de tipografía, y como los demás primitivos de la colección—, así que **sí aparecen en el picker de tracking, y aplicarlos desde ahí da -0,01 px en vez de -0,01em**. La protección no es el scope sino la descripción de cada variable, que lleva la advertencia y la medición. Para aplicar tracking en Figma, porcentaje literal: -1 % = -0,01em.

**El grupo antiguo `typography/tracking/*` se eliminó el 24-ago-2026, y con él un fallo que llevaba tiempo.** Era el grupo de letter-spacing anterior a la guía, nombrado por caso de uso (`heading`, `eyebrow-wide`, `eyebrow-narrow`) y con el nombre de la utilidad de Tailwind en vez del de la propiedad CSS. Guardaba valores en em con scope `LETTER_SPACING`, o sea vinculables, y `eyebrow-wide` (0,2) tenía **6 bindings de nodo** que renderizaban `{PIXELS, 0.2}`: 0,2 px de espaciado, prácticamente nada, mientras el código aplicaba `tracking-[0.2em]`, que a 12px son 2,4 px. Los seis textos «INTERESES» de `Person Card` llevaban tiempo pareciendo tokenizados sin espaciar.

Se arreglaron primero y se borró después, en ese orden a propósito: borrar antes habría dejado los 6 nodos desvinculados conservando su 0,2 px inútil y el fallo se habría vuelto invisible. **Solo 2 de los 6 eran nodos reales** (dentro de los componentes `State=Default` y `State=Hover` del set `Person Card`); los otros 4 eran hijos de instancia que los espejan, así que editando 2 se arreglaron los 6 sin crear un solo override. Se desvincularon y se les puso `{PERCENT, 20}`, que es como Figma sí expresa 0,2em: pasaron de 65 a 82 px de ancho, la primera vez que se ven como en producción. Las tres variables se borraron después de comprobar 0 bindings, 0 alias y 0 estilos apuntando a ellas.

Los valores de eyebrow (0,18em · 0,2em · 0,12em) viven ahora en los tres estilos `Eyebrow/`, como 18 % · 20 % · 12 % literales, que es el equivalente exacto. No tienen variable propia y no la necesitan: son el rol de versalitas espaciadas, fuera de la rampa de ±0,02. El grupo borrado además nunca cubrió el 0,12em del rótulo de tienda, así que ya estaba incompleto.

**Cómo aterriza la escala en los titulares, y qué se queda fuera:**

- **Los titulares bajaron a `tight` (-0,01em).** El `letter-spacing` de `h1/h2/h3` del `@layer base` era `-0.015em`, un valor que no existía en ninguna escala y caía justo entre `tight` y `tighter`. Se eligió -0,01 y no -0,02 mirando dónde vive la masa de titulares: de los 29 `h1/h2/h3` del producto, **19 son de 20px** y unos 9 de 34px; solo el hero de la landing pasa de ahí. Un `h2` de 20px no es texto display, y el tracking negativo es una herramienta de tamaño display: a 20px, -0,4px (-0,02em) empieza a cerrar los espacios de un serif de contraste alto como Fraunces, que además **se carga sin eje óptico** (pesos 400-700, sin `opsz`), así que la fuente no compensa nada por su cuenta al crecer. Aflojar es también el lado seguro del error: un serif demasiado apretado en pequeño se lee como defecto de renderizado. Los 28 titulares no-hero pasan de -0,30 a -0,20px (20px) y de -0,51 a -0,34px (34px). Sigue hardcodeado como literal y no como `var(--tracking-tight)`, a propósito: Tailwind solo emite las variables de tema que alguna utilidad usa, así que si los 5 `tracking-tight` del código desaparecieran, la variable dejaría de existir y el base layer se rompería en silencio. En Figma no queda ninguna variable que afirme -0,015: `tracking/heading` fue primero alias de `letter-spacing/tight` y se borró con el resto de su grupo el mismo día.
- **El caso display se aprieta en el elemento, no en el default.** El `h1` del hero lleva ahora `tracking-tighter` explícito: a 72px son -1,44px. Ojo, eso es **más apretado que antes** (-1,08px con el -0,015em global), no una restauración — el valor anterior no es un paso de la escala. Es la estructura correcta de todas formas: default neutro para los 28 titulares normales, apretado explícito para el único que es display.
- **Los 17 arbitrarios de eyebrow** (`tracking-[0.18em]` ×15, `tracking-[0.2em]`, `tracking-[0.12em]`). Están un orden de magnitud por encima del tope de la escala (±0,02), y no es un descuido: el rol «eyebrow» es versalitas muy espaciadas, otra cosa que el ajuste fino de un titular. La escala de ±0,02 no pretende cubrirlo: viven en los tres estilos `Eyebrow/` como porcentaje literal (18 % · 20 % · 12 %), fuera de la rampa y sin variable propia. Si algún día se tokenizan, el sitio es un grupo de uso o un estilo, no un paso más de la rampa.

Verificado en el navegador tras el cambio: `--tracking-tight` resuelve a `-.01em` y `--tracking-tighter` a `-.02em`, `--tracking-widest` ya no existe, el wordmark calcula 18px/-0,18px, los `h2` de la landing 20px/-0,20px, el `h1` de `/privacidad` 34px/-0,34px y el hero 72px/-1,44px. Los pasos `normal`, `wide` y `wider` aún no se emiten porque ninguna clase los usa todavía.

#### Estilos de texto: escala Display→Caption, 22 estilos (24-ago-2026)

El archivo no tenía ni un text style; ahora tiene 22, siguiendo la **escala estándar de comunidad** (Display · Heading · Label · Body · Caption, la misma forma que Material 3, Ant Design o Radix Themes) de la guía externa `guia-tipografia-figma.md`: 19 estilos de la guía más 3 añadidos que se explican abajo. Los nombres llevan `/` para que el panel de Figma los agrupe en carpetas, y la descripción de cada estilo guarda su nombre técnico plano (`text-body-3`, `text-heading-h2`…) más el rol que cubre en el producto.

| Familia | Estilos | px | Fuente | Peso |
|---|---|---|---|---|
| `Display/` | 1 · 2 · 3 | 72 · 60 · 48 | Fraunces | Bold 700 |
| `Heading/` | H1 → H6 | 40 · 34 · 28 · 24 · 20 · 18 | Fraunces | SemiBold 600 |
| `Label/` | 1 · 2 · 3 | 16 · 14 · 12 | Geist | Medium 500 |
| `Body/` | 1 → 5 | 20 · 18 · 16 · 14 · 12 | Geist | Regular 400 |
| `Caption/` | 1 · 2 | 12 · 11 | Geist | Regular 400 |
| `Eyebrow/` **(añadido)** | Section · Hero · Micro | 12 · 12 · 11 | Geist | Medium 500 |

Interlineados y tracking salen tal cual de la guía: Display 110 %, H1-H2 120 %, H3-H5 130 %, H6 140 %, Label 120 %, Body 1-3 150 %, Body 4-5 140 %, Caption 1 130 %, Caption 2 120 %; tracking de -2 % (Display 1-2) a +2 % (Caption 2).

**Los 13 tamaños, los 5 ratios de interlineado y los 5 letter-spacings de la guía ya existían idénticos en `Typography`** — es de donde salieron los tres cambios anteriores de esta sección. Lo que sigue es lo que **no** se pudo adoptar, con el motivo, porque conviene no volver a intentarlo a ciegas:

- **El mecanismo central de la guía se sigue en tres de sus cinco columnas.** Sus tablas de §3 vinculan cinco variables por estilo, incluidas `line-height-*` (ratio sin unidad) y `letter-spacing-*` (em). Se vinculan las cinco. Lo que hay que saber es que **Figma resuelve interlineado y tracking siempre en píxeles**: una variable de valor 1,2 da 1,2 px, no 1,2×. Medido con geometría, y con las variables correctamente scopeadas —el scope no influye, solo decide en qué picker aparece cada una—: 10 caracteres a 20px miden 134 px sin espaciado, 152 con `{PERCENT, 10}` y 224 con `{PIXELS, 10}`; vinculando una variable de valor 10 miden **224**. Igual con interlineado: 3 líneas a 20px miden 120 px al 200 % y 600 px a 200 px; vinculando una variable de valor 200 miden **600**. En ambas pruebas el nodo estaba en `PERCENT` antes de vincular, y vincular lo pasó a píxeles.
- **La nomenclatura plana en `Primitives` (`font-size-16`, `line-height-tight`) no se adopta.** Dos razones: Figma no permite mover una variable de colección, así que sería recrear y repuntar **1.036 bindings de nodo**; y los nombres actuales son portantes — `font-size/base` ↔ `text-base` ↔ `--text-base` es la cadena 1:1 con el código que este documento protege, y `font-size-16` la rompe. Sí coincide con la guía, en cambio, su §5: los primitivos de tipografía conservan scope porque el text style **es** la capa semántica.
- **La guía asume una sola familia para los 19 estilos.** PickPal tiene dos, y el serif es la identidad. `Display/` y `Heading/` van a Fraunces (`font-family/serif`), `Label/`, `Body/` y `Caption/` a Geist (`font-family/sans`).
- **§1.1 y §3 de la guía no dicen lo mismo.** La tabla maestra pide interlineados de 1,15 · 1,25 · 1,35 · 1,45 que los 5 tokens de ratio no pueden expresar; §3, que es la que mapea a variables reales, los ajusta a los 5 disponibles. **Se sigue §3.**
- **No hay hueco para las versalitas espaciadas**, que en el producto son 17 usos y un patrón documentado (`tracking-[0.18em]`, `[0.2em]`, `[0.12em]`). De ahí los 3 `Eyebrow/`, marcados como añadido en su descripción. Son los únicos que vinculan interlineado (a `line-height/px/*`), porque espejan el del código en vez de un ratio de la escala.

**Dos desajustes con el producto que la escala deja a la vista y que no se han tocado:**

- **Los tamaños de titular no coinciden.** La guía pone H1 en 40px y H2 en 34; el producto tiene sus 9 `h1` en 34px y sus 19 `h2` en 20px. Es decir, hoy el título de página es `Heading/Heading 2` y el de sección es `Heading/Heading 5`. O el producto sube (títulos de página a 40px) o se acepta el desfase; documentado, sin cambiar código. **CORRECCIÓN (15-sep-2026)**: el desfase de tamaño sigue, pero ya no es un desfase *de nombre*: `H1…H6` pasó a `Heading 1…6` y la escala dejó de prometer un nivel de documento que no cumplía. Ver «Los titulares dejan de prometer un nivel de HTML».
- **Los pesos.** La guía pide 700 en Display —que encaja con la regla de «`font-bold` solo en el hero de la landing»— y 600 en Heading, lo cual **de paso resuelve** que Fraunces no tenga instancia Medium en Figma. Pero el código sigue usando `font-medium` (500) en los 9 `h1` y en el hero, así que la divergencia de peso sigue abierta: los titulares se ven más pesados en Figma que en producción. Cerrarla es instalar Fraunces variable en Figma o mover el código a `font-semibold`.

**Los 22 estilos vinculan familia, peso y tamaño a variables; interlineado y tracking van como porcentaje literal.** Es 3 de 5 filas con token en 19 estilos y 4 de 5 en los tres `Eyebrow/`, que sí vinculan su interlineado a `line-height/px/xs` y `px/2xs` (16 px, el que `text-xs` trae de serie en Tailwind). Los valores son exactamente los de la guía: `110%` en Display, `120%` en H1-H2, Labels y Caption 2, `130%` en H3-H5 y Caption 1, `140%` en H6 y Body 4-5, `150%` en Body 1-3; tracking de `-2%` a `+2%`, y 18/20/12 % en los eyebrows. **CORRECCIÓN (27-ago-2026)**: ya no es así. Trece pasos pasaron a interlineado en píxeles porque su ratio no caía en píxel entero, así que hoy son 16 en px (esos 13 más los 3 `Eyebrow/`) y 6 en porcentaje. Y los `Eyebrow/` no vinculan su interlineado a `line-height/px/*`: esa familia ya no existe y lo que arrastraban era un enlace a una variable borrada, limpiado el mismo día.

**El porcentaje de Figma es el equivalente exacto del ratio y del em**, no una conversión con pérdida: `110%` sobre 72px da 79,2px igual que `line-height: 1.1`, y `-2%` es «-2 % del tamaño de fuente», que es la definición de `em`. Verificado en render: el hero con `Display/Display 1` mide 158 px a dos líneas (2 × 79,2) y un párrafo con `Body/Body 3` mide 48 (2 × 24).

**La traza al token vive en la descripción de cada estilo**, que dice de dónde sale cada número: «Interlineado 120% = ratio de `line-height/snug` (1,2). Tracking -1% = `letter-spacing/tight` (-0,01em)». Es la misma información que daría un chip de variable, en texto. Los 5 ratios y los 5 pasos en em siguen existiendo en `Typography`, pero conviene saber qué son hoy: **variables sin consumidor**, 0 bindings de nodo, 0 alias y 0 estilos, con un `codeSyntax` que Dev Mode no llega a mostrar porque solo aparece cuando algo está vinculado. Son una tabla de referencia en el panel, no tokens en uso. Se dejan a sabiendas — la escala real vive en `--leading-*` y `--tracking-*` de `globals.css` —, así que **no es un cabo suelto que haya que atar**: o se borran, o se vuelve al modelo de píxel resuelto que sí las usaría, y las dos opciones están descritas arriba. `line-height/px/*` es distinto: esas 13 sí se usan, con 303 bindings de nodo y 3 estilos. **CORRECCIÓN (27-ago-2026)**: ninguna de las 22 descripciones cita hoy ese ratio — el pase de descripciones de agosto las dejó en una frase de rol, sin la traza —, y `line-height/px/*` tampoco existe ya, así que sus 303 bindings son historia, no estado.

**Por qué no se vinculan esas dos, y las cuatro cosas ya probadas que no funcionan.** La razón de fondo: **la unidad no vive en la variable, vive en la propiedad**. Una variable es un número y el binding de interlineado y tracking lo lee siempre en píxeles. De ahí que fallen las cuatro: (1) vincular el token de ratio da 1,2 px y el texto se solapa; (2) guardar el número en notación de porcentaje da 110 px, que es ratio 1,53 a 72px y 10 a 11px — un valor absoluto no puede ser un ratio para trece tamaños; (3) vincular y luego forzar `PERCENT` **borra el binding** (Figma lo pasa a `bound: false`), y al revés vuelve a píxeles; (4) crear una variable por combinación ratio × tamaño sí funciona —se montó y se revirtió— pero son 31 variables casi todas de un solo uso con valores fuera de la rejilla de 4px (79,2 · 52,8 · 40,8 · 36,4 · 31,2 · 25,2 · 19,6 · 19,2 · 16,8 · 15,6 · 14,4 · 13,2). Nada de esto es cuestión de scope: el scope decide en qué picker aparece la variable, no en qué unidad se resuelve.

**Y una quinta vía que se consideró y no se aplicó**: vincular cada estilo al interlineado que su tamaño trae emparejado en `line-height/px/*` (0 variables nuevas, 4 de 5 filas con token, y son los interlineados que el código renderiza de verdad). Se descartó porque mueve los ratios de la guía en la mitad de los estilos: `Display` caería a 1,0 y los `Label` subirían a 1,33-1,5, demasiado aire para una etiqueta de botón. Si algún día se prioriza tener el token en esa fila por encima de los ratios, es la opción a mirar. **CORRECCIÓN (27-ago-2026)**: esa quinta vía se acabó tomando en 13 de los 22, por un motivo que este párrafo no vio: con ratio, `Label 2` daba 16,8 px y `Body 4` 19,6, así que cualquier control que ajuste su alto al texto salía de la rejilla de 4 px — el Button de 36 (= `sizing/control/md`) se habría quedado en 32,8. Y el «demasiado aire» era discutible: los especímenes ya usaban 20 px para el texto de 14, que es exactamente el 1,43 que aquí se rechazaba.

**Por qué no se vinculan los tokens de ratio y em directamente**, que es lo primero que uno intenta: **la unidad no vive en la variable, vive en la propiedad**. Una variable es solo un número y el binding de estas dos propiedades lo lee siempre en píxeles, así que `line-height/snug` (1,2) da 1,2 px y el texto multilínea se solapa. Tampoco arregla nada guardar el número en notación de porcentaje: una variable de valor 110 da 110 px, que es ratio 1,53 a 72px y ratio 10 a 11px — un valor absoluto no puede ser un ratio para trece tamaños a la vez. Y no es cuestión de scope. Las tres combinaciones probadas, para no repetirlas: vincular y luego forzar `PERCENT` **borra el binding** (Figma lo pasa a `bound: false`); poner `PERCENT` y luego vincular vuelve a píxeles; y una variable de valor 150 vinculada da 150 px por línea (450 de alto en 3 líneas, no 90).

**Ojo con el panel al diagnosticar esto**: el campo de line height muestra `1.1` tanto si son 1,1 px como si son 110 %, y el diálogo «Edit text style» previsualiza **una sola línea**, donde los glifos se dibujan perfectos porque lo que se colapsa es la caja de línea. Ninguna de las dos cosas se ve desde ese panel: hay que aplicar el estilo a un texto de dos líneas y mirar el alto.

**La página `Foundations - Typography` es el especimen vivo de los 22**, junto a `Foundations - Color` y `Foundations - Excepciones`. Cada familia lleva su descripción y cada fila muestra el nombre del estilo, su ficha (`34 · 1,2 · -0,01em`) y una frase de ejemplo del producto. Los 81 textos de la página **aplican el estilo de verdad y tienen el color vinculado a `color/text`, `color/text/secondary` y `color/bg`**, así que la página se actualiza sola cuando cambia un estilo y responde al modo claro/oscuro. Si se añade un estilo nuevo, añadir también su fila: hoy están representados los 22 de 22.

**Trampa al montar páginas así**: en un auto-layout, llamar a `resize()` **después** de fijar `primaryAxisSizingMode`/`counterAxisSizingMode` los devuelve a FIXED y el frame deja de crecer con el contenido — la primera versión de esta página se quedó recortada a 128 px de alto con todo dentro. Fijar los modos al final, o volver a aplicarlos después de cada `resize()`.

Los 15 estilos anteriores (`Heading/Page`, `Body/Small`, `UI/Control`…) se borraron al aplicar la guía: tenían 0 usos y estaban sin publicar, así que no rompió nada. Y sigue en pie lo que esto desbloquea: cerrar las 35 variables de `Typography` que aún aparecen en los pickers, decisión aparte.

#### Los titulares dejan de prometer un nivel de HTML (15-sep-2026)

`Heading/H1…H6` era la única familia de la escala que no se nombraba como sus hermanas, y la diferencia no era cosmética: `Hn` promete un nivel de documento y aquí entregaba un rango de tamaño. **El `<h1>` real del producto es `H2`**, y las descripciones de los dos estilos tenían que decirlo para deshacer la promesa — la señal de que el defecto estaba en el nombre y no en el lector.

Los seis pasan a **`Heading/Heading 1…6`**. Con eso las cinco familias numéricas hablan igual (`Display n`, `Heading n`, `Label n`, `Body n`, `Caption n`: 19 estilos con una sola gramática, antes 13 + 6), y el número significa lo único que significaba ya en las otras cuatro: **1 es el mayor**, sin excepción en ninguna familia.

**Lo que no cambia**: los tamaños, los pesos y el desfase con el producto. `Heading 2` sigue siendo el título de página real y `Heading 5` el de sección; se retira la promesa, no el desajuste, que sigue documentado arriba.

**Coste: cero.** Renombrado puro de estilo —Figma referencia por id—: los **122 bindings** siguen donde estaban (14 · 25 · 1 · 52 · 19 · 11, recontados después). Lo que sí hubo que repasar es la prosa, que no sigue a nadie (regla 8 de `figma-tokens.md`): 6 rótulos y 6 marcos del especimen de `Foundations · Typography`, 2 párrafos de `02 · Decisions before design`, la descripción del propio `Heading 1` y la de `typography/font-weight/semibold`, que citaba «H1–H6». Barrido después: **cero `H1`–`H6` sueltos** en las 55 páginas del archivo.

#### Dónde Figma tiene más estructura que el código

Las familias `spacing/stack/*`, `spacing/inline/*`, `spacing/inset/*`, `space/*` (las tres), `sizing/*` (las tres) y `size/interactive-*` (52 variables), más los primitivos `spacing/240` y `spacing/480` (existen solo para que el ancho del sidebar y el de la columna de eventos tengan a qué aliasar), **no existen en `globals.css`**: en el código esos valores son clases utilitarias (`gap-2`, `p-4`), no custom properties. Viven solo en Figma para que la cadena de alias llegue completa hasta el componente. Lo que implica en la práctica:

- Nacen **sin `codeSyntax`**, así que Dev Mode muestra el valor crudo (`12px`) en vez de un `var()` que no compilaría.
- **No añadirlas a `globals.css`** para "cuadrar" los dos lados: ningún componente las consumiría.
- Al implementar desde Figma, traducir a la utilidad de Tailwind equivalente, no a una variable CSS.

Los `codeSyntax` que **sí** apuntan a código real son los semánticos de color (`--primary`, `--muted-foreground`, `--destructive`…), los 8 radios (`--radius-xs` … `--radius-4xl`), los 4 pesos (`--font-weight-*`), los 13 tamaños de fuente (`--text-2xs` … `--text-8xl`, escala propia: 7 sobreescritos en `globals.css`), los 6 interlineados en px (`--text-*--line-height`), los 5 ratios de interlineado (`--leading-*`) y los 5 pasos de letter-spacing (`--tracking-*`). Ahí Figma y código están 1:1, y conviene no romperlo.

#### Cómo se nombran las variables

El primer segmento del nombre dice **qué propiedad controla** el token, y no se omite nunca. En concreto `spacing/*` es separación (padding, gap) y `size/*` es dimensión (ancho, alto). Al crear una variable numérica, mirar su scope: `GAP` → `spacing/`, `WIDTH_HEIGHT` → `size/`. **Desde el 25-ago-2026 esa regla solo describe la capa primitiva**: la generación nueva de semánticos usa `space/*` para `GAP` y `sizing/*` para `WIDTH_HEIGHT`, dejando `spacing/*` y `size/*` como prefijos de primitivo (más los semánticos viejos de `Medidas`, aún sin migrar). Ver la tríada `space/*` y el grupo `sizing/*`, más arriba. Había 16 que mentían (los seis del switch, los seis del avatar, los tres iconos de control y el mínimo del textarea, todas `spacing/*` con scope `WIDTH_HEIGHT`) y se renombraron a `size/*` el 23-ago-2026. La familia `layout/*`, que no tenía segmento de tipo, desapareció en el mismo pase: `size/sidebar/width`, `size/event-column/width`, `spacing/panel/gap` y `spacing/page/padding-lg`.

El `role` sigue el mismo criterio: nombrar por el uso documentado en la tabla 2.7 del patrón canónico, no por el componente donde se usó primero. `radius/control` → `radius/interactive` y `radius/card` → `radius/surface` (23-ago-2026, renombrados puros, `codeSyntax` y los 620 + 138 bindings intactos). **El primero se deshizo el 15-sep-2026** y volvió a `radius/control`, porque para entonces `control` era ya la palabra del botón en las otras dos categorías; ver «Una palabra por objeto». `size/icon-display` → `size/icon/xl`, porque el documento nombra los tamaños de icono por escala (`sm`/`md`/`lg`/`xl`), no por uso.

Los 59 semánticos de color siguen la fórmula `type-element-role-emphasis-state`, con `state` omitido en reposo y `emphasis` omitido solo donde el rol tiene un único peso — todo relleno que exista en sutil y en sólido escribe cuál es (15-sep-2026, ver más abajo). El `element` es `bg`, `fill`, `text`, `border` o `icon` — `bg` y `fill` se separaron el 25-ago-2026, ver más abajo; **el nombre de la variable en Figma ya no coincide con el de la variable CSS**, y el puente entre los dos es el `codeSyntax`, que sigue apuntando a la custom property real. Dev Mode muestra `var(--primary)` aunque el token se llame `color/fill/brand-solid`.

| Figma | CSS | Qué es |
|---|---|---|
| `color/bg` | `--background` | Canvas de página |
| `color/bg/surface` · `color/bg/surface-raised` | `--card` · `--popover` | Card · popover y dropdown |
| `color/fill/sunken` | — | **Superficie de control hundida, sin puente desde el 28-ago-2026**: `--input` pasó a `color/field/border` con la sincronización a11y. `bg-input` sigue en **11 sitios de 5 componentes** — el track del `Switch` apagado (los dos modos) y, en Dark, el fondo en reposo y el hover de `Input`, `Textarea`, `Button` outline y `Select` trigger (`/30`, `/50`) — pero parte del blanco al 36 %, no del 12 % de este token |
| `color/fill/field-disabled` | `--field-disabled` | **Relleno del campo deshabilitado**, `Input` y `Textarea`: los dos únicos sitios del producto donde deshabilitar pinta color. Paso sólido (`Cream/200` · `Neutral/800`), adoptado en código el 28-ago-2026 — ver más abajo |
| `color/fill/component` | `--muted` | **Superficie interactiva neutra**: hover de Button outline y ghost, hover de Badge, link del sidebar, footer de Card, track del Slider |
| `color/fill/component-focus` | `--accent` | **Solo el item de menú resaltado**: `focus:bg-accent` en `SelectItem` y la opción activa del combobox de intereses |
| `color/fill/brand-solid` · `color/fill/brand-secondary-solid` | `--primary` · `--secondary` | Verde de CTA · terracota |
| `color/fill/destructive-solid` | `--destructive` | Rojo sólido |
| `color/fill/destructive-subtle` · `color/fill/destructive-subtle-hover` | — | **El fondo real** del `Button` y el `Badge` destructive (`bg-destructive/10` → `/20` → `/30`). `destructive-solid` no lo pinta nada en el producto |
| `color/fill/brand-subtle` · `color/fill/brand-solid-hover` · `color/fill/brand-secondary-solid-hover` | — | Capa de *emphasis* y *state* de marca (creada 25-ago-2026) |
| `color/border/subtle` · `color/border/brand` · `color/border/brand-secondary` | — | Separador tenue (`border-border/40…/70`, 40 usos) y bordes de marca |
| `color/bg/subtle` · `color/text/tertiary` · `color/icon/strong` | — | Roles del patrón canónico que faltaban. Sin uso en el producto todavía |
| `color/text/success` · `color/icon/success` | — | Éxito en la rampa verde: en PickPal el verde es identidad **y** confirmación, no hay un verde de éxito aparte |
| `color/text/info` · `color/icon/info` | — | Informativo en la rampa **Bronze**: PickPal no tiene azul, y Bronze estaba sin asignar y es lo bastante neutra para no competir con la marca |
| `color/text/warning` | `--warning` | **Único uso**: el contador de `NotificationBell` cuando un evento cae dentro de 7 días. `color/icon/warning` existe pero sin puente: el icono `Bell` hereda el color del texto |
| `color/icon/category/3` | `--category-amber` | Glifo de las ~15 categorías de regalo ámbar de `giftImages.ts`, sobre `bg-chart-3/15`. **Decorativo, no un aviso**: comparte primitivos (`Amber/800`·`500`) con `color/text/warning` pero es otro rol. Se perdió al reducir `color/` a grupos de rol y **se recreó el 28-ago-2026**, recuperando el puente que `color/icon/warning` llevaba prestado |
| `color/fill/success-subtle` · `color/fill/warning-subtle` · `color/fill/destructive-subtle` (+ su `-solid` cada uno) | — | **Fondos de estado**: par sutil + sólido. **No existe un rol `error` aparte**: el rojo es uno y se llama `destructive` desde el 18-sep-2026 — ver «`danger` pasa a `destructive`». El `error` que sigue vivo es el **estado** de un campo (`State=Error`), que no es un color |
| `color/text` · `color/text/secondary` | `--foreground` · `--muted-foreground` | Texto principal · de apoyo |
| `color/text/brand` · `color/text/brand-secondary` | `--brand` · `--brand-secondary` | El primer plano de las dos marcas: verde para links y texto de marca, terracota para etiquetas de marca favorita y `BrandStoreLink`. Cada una partida de su relleno (26 y 28-ago-2026) |
| `color/text/on-*` | `--*-foreground` | El prefijo `on-` significa siempre «encima de esta superficie» |
| `color/border` · `color/field/border` | `--border` · `--input` | Borde estándar decorativo · borde de control a ≥3:1 (campos, checkbox, outline, track del switch). `color/border/component` perdió el puente y los bindings el 28-ago-2026: candidato a retirarse |
| `color/icon` · `/secondary` · `/destructive` · `/brand` · `/on-brand` · `/on-brand-secondary` | — | Fill y stroke de icono. Nacieron el 23-ago-2026 copiando el mismo primitivo que su equivalente de `color/text/*` — no un alias al semántico de texto — porque los iconos ya llevaban 369 bindings a esos tokens y **`color/text/*` solo tiene scope `TEXT_FILL`**, invisible en el picker de Fill de un vector. Son los 6 roles que el uso real demostró necesarios, no los 7 que sugiere el documento (no hay uso de `success` en iconos propios) |

#### El énfasis deja de ser implícito en los rellenos (15-sep-2026)

`color/fill/brand` valía #0c2912 —verde casi negro, luminancia 0,017— y `color/fill/danger` valía #ffe8e3 —rosa casi blanco, 0,845—. Misma gramática, extremos opuestos de la escala: **el nombre pelado significaba *sólido* en los roles de marca y *sutil* en los de estado**. La prueba más corta de que el hueco se leía al revés es que `color/fill/success-solid` y `color/fill/brand` eran el mismo hex.

Doce renombrados puros dejan el énfasis escrito siempre que el rol existe en dos pesos:

| Antes | Ahora |
|---|---|
| `color/fill/brand` · `-hover` | `color/fill/brand-solid` · `-solid-hover` |
| `color/fill/brand-secondary` · `-hover` | `color/fill/brand-secondary-solid` · `-solid-hover` |
| `color/fill/danger` · `-hover` | `color/fill/danger-subtle` · `-subtle-hover` |
| `color/fill/success` · `color/fill/warning` | `color/fill/success-subtle` · `color/fill/warning-subtle` |
| `color/text|icon/on-brand` | `…/on-brand-solid` |
| `color/text|icon/on-brand-secondary` | `…/on-brand-secondary-solid` |

**Por qué explícito y no «pelado = sutil», que era la propuesta inicial de la auditoría.** Unificar hacia el sentido mayoritario obligaba a que `color/fill/danger` pasara de rosa pálido a rojo sólido **conservando el nombre**. Un nombre que cambia de significado en silencio es exactamente el fallo que este pase viene a cerrar, y no hay manera de avisar a quien lleve la referencia vieja en la cabeza. Con el énfasis explícito ningún nombre existente cambia de significado: cada uno se queda igual o gana un sufijo.

**La regla queda así**: el `state` se omite en reposo, y el `emphasis` solo se omite donde el rol tiene un único peso —`color/fill/component`, `color/fill/field-disabled`, `color/fill/sunken`—. Todo relleno que exista en sutil y en sólido escribe cuál es.

**Es divergencia con la guía canónica, y esta vez la guía es el origen del defecto.** Su tabla 2.1 lista `color-bg-success` con *emphasis: subtle* y `color-bg-brand` con *emphasis: default*, los dos sin sufijo: documenta por escrito que el mismo hueco vacío significa dos cosas. Registrada en la tabla de divergencias de [`docs/figma-tokens.md`](figma-tokens.md).

**Coste: cero de valor.** Doce renombrados puros, **22 descripciones** de otras variables que citaban los nombres viejos y **4 nodos de texto** en `Start here`, `Design decisions`, `Switch` y `Store Link Chip` —los rótulos son texto y no siguen a la variable—. Verificado: 14 valores resueltos sin una diferencia, los bindings donde estaban (`brand-solid` 386, `brand-secondary-solid` 442, `on-brand-secondary-solid` 432 + 225), los 5 `codeSyntax` intactos y ni un nombre viejo vivo en el archivo.

#### Las categorías pierden el matiz y la terracota recupera su número (15-sep-2026)

Dos hallazgos distintos de la auditoría con el mismo defecto de fondo: un nombre que dice **de qué color** es algo en la capa donde debería decir **para qué sirve**, o al revés.

**Las cinco series de categoría se numeran.** `color/bg/category/green` y `color/bg/category/terracotta` no guardaban un verde y una terracota: aliasaban a `brand/primary` y `brand/secondary`, o sea al hub de marca. El día que la marca deje de ser verde, un token llamado «green» pintaría lo que fuese. Y `color/bg/category/umber` ya mentía hoy: en oscuro resuelve a `Bronze/950`, no a Umber. Pasan a `color/bg/category/1…5`, que es **exactamente la numeración que el código ya usa** (`--chart-1`…`--chart-5`, y el `codeSyntax` de cada una lo dice). El matiz no se pierde: vivía y sigue viviendo en la descripción, y el panel enseña el color al lado.

En el mismo movimiento `color/icon/category-amber` pasa a `color/icon/category/3`, lo que cierra además una incoherencia menor: `category` era carpeta en la familia `bg` y prefijo con guion en la de `icon`. Ahora `bg/category/3` e `icon/category/3` se emparejan a la vista.

**Lo que el producto hace de verdad con estas cinco**, que conviene saber antes de volver a tocarlas: solo existen tres tintes —ámbar, terracota y verde— y de los tres **únicamente el ámbar consume su token de categoría**. El verde y la terracota se pintan con el relleno de marca directamente, así que `--chart-1` y `--chart-2` no los consume nada en el producto, y `--chart-4` y `--chart-5` tampoco. Son candidatos a retirarse, pero eso toca `globals.css` y es una decisión aparte.

**La terracota: uno era un paso y el otro no.** Medidos en OKLCH, `Terracotta/text` (L 0,521 · C 0,130 · H 45,3) tiene **el mismo croma y el mismo tono que el paso 950** (C 0,130 · H 45,2) y solo baja de claridad: es literalmente el escalón siguiente, así que pasa a `color/Terracotta/1000`. `Terracotta/brand` (L 0,693 · C 0,168 · H 36,8) tiene la claridad del 900 pero **un 40 % más de croma y 8° de tono**: no es un paso de esta rampa, es otro color —el naranja del logotipo— y pasa a `color/Terracotta/vivid`, que describe el color en vez del uso. El rol se queda donde le toca, en `brand/logo` y `brand/secondary-text`.

**Coste: cero de valor.** Ocho renombrados puros, 12 descripciones que citaban los nombres viejos, 3 descripciones afinadas y 2 nodos de texto en `Design decisions`. Verificado: 9 valores resueltos sin diferencia, los bindings donde estaban (`icon/category/3` 33, `brand/logo` 37, las cinco de `bg/category` a 4), los 6 `codeSyntax` intactos y ningún nombre viejo vivo en el archivo.

#### Barrido de consistencia menor, y cuatro hallazgos retirados (15-sep-2026)

Última pasada de la auditoría de nomenclatura, ya sin nada de severidad alta. Quince renombrados puros y —tan importante como ellos— cuatro cosas que la auditoría marcaba y que al mirarlas de cerca no eran defectos.

**Lo que se renombró:**

| Antes | Ahora | Por qué |
|---|---|---|
| `sizing/slider-thumb`, `-thumb-dragging`, `-track`, `sizing/spinner-dot`, `sizing/card-visual-header` | `sizing/slider/thumb`, `/thumb-dragging`, `/track`, `sizing/spinner/dot`, `sizing/card/visual-header` | La anatomía de un componente se escribe con carpeta, como ya hacían `sizing/switch/*` y todo `space/*`. Eran 5 de 34 con guion |
| `color/field/border-invalid` | `color/field/border-danger` | `invalid` era el único de su bloque de vocabulario frente a ocho `danger` |
| `space/card/padding-default` | `space/card/padding` | El nombre pelado es el por defecto, como en `space/container/padding` |
| `typography/font-family/heading` | `typography/font-family/serif` | Sus hermanos son `sans` y `mono`, que son clasificaciones; su propia descripción ya decía «the serif» |
| `color/red-alpha/*`, `color/terracotta-alpha/*`, `color/white-alpha/*` | `color/Red/alpha-*`, `color/Terracotta/alpha-*`, `color/White/alpha-*` | Dos arreglos de una vez: la mayúscula inicial que el resto de familias de color sí tiene, y un número que ya no se confunde con un paso de rampa (`alpha-20` frente a `Red/200`) |

**Lo que se retiró, y por qué conviene dejarlo escrito:**

- **La hoja y la carpeta con el mismo nombre** (`color/bg`, `color/text`, `color/icon`, `color/border`) no es un descuido: la sección «Anidar `color/bg` en subgrupos» lo llama «el patrón que el archivo ya usa» y lo prescribe para el día que se anide `fill/*`. Imponer `color/text/default` habría sido llevarle la contraria a una decisión ya tomada y escrita.
- **`radius/base` = `radius/lg` = 16 px** no es un paso duplicado: `base` es el ancla `--radius` de la que el CSS deriva los demás. Que coincida con `lg` es una consecuencia, no una redundancia.
- **Las seis palabras para el escalón por defecto** (`base`, `normal`, `regular`, `default`, `md` y el nombre pelado) son tres de Tailwind —`font-size/base`, `line-height/normal`, `font-weight/regular`— más la del archivo, que sí es una sola y consistente: `default`. Unificarlas costaría dejar de espejar Tailwind, que es un precio mayor que el defecto.
- **`secondary` con dos sentidos** —prominencia de texto y segundo color de marca— ya lo resuelve una regla escrita: el de marca siempre lleva `brand-` delante. El prefijo es el desambiguador y funciona.

**Lo que queda abierto**, todo de severidad media o baja y ninguno resoluble solo en Figma: `typography/line-height/snug-alt`, que es el quinto escalón de una escala de cinco nombrado con un parche, pero `--leading-snug-alt` existe igual en el código; la gramática del hub `brand/*`, internamente consistente pero distinta de la de la capa semántica; y `component` como rol en `color/fill/component`, que choca con el nombre de la cuarta capa del modelo y para el que no hay palabra mejor —`control` ya es el botón, y este token pinta también el pie de una Card y un enlace del sidebar—.

**Coste: cero de valor.** Quince renombrados puros, ninguna descripción afectada y 3 nodos de texto.

**Y una pasada de reparación detrás, que es la parte que hay que leer.** Las cinco pasadas de la auditoría renombraron 44 variables, y al preguntarse «¿esto rompe algo?» apareció lo que ninguna de ellas había barrido: **unas 68 referencias muertas** repartidas por la superficie documental del propio archivo. Nada de render ni de código —los bindings van por id y el puente es `codeSyntax`—, pero texto que mentía. En concreto: **19 tarjetas de muestra de `01 · Color` y sus 19 rótulos** (el aviso de que «no siguen a la variable» estaba escrito en esta misma página y aun así se pasó por alto), **10 rótulos de alias** del tipo `D  red-alpha/20`, **9 descripciones** de variables, **2 tablas alineadas** de `03 · Space, Radius & Elevation` que además había que volver a rellenar de espacios, y **9 bloques de prosa** —entre ellos la ficha de decisión nº 14 entera, que documentaba la convención `icon/N` que A1 había eliminado—.

**La lección, para la próxima**: buscar el nombre viejo completo (`color/fill/brand`) no basta. Los rótulos lo escriben sin prefijo (`fill/brand`), los alias en minúscula (`red-alpha/20`) y los nombres de nodo con el suyo propio (`card/fill/brand`). Un renombrado no está terminado hasta que un barrido **sin exigir prefijo y sin distinguir mayúsculas** sobre nombres de nodo, contenidos de texto, descripciones de variable y de estilo devuelve cero. En la tabla alineada de `03 · Space, Radius & Elevation` los cuatro cambios son guion por barra, misma longitud, así que la columna no se movió. Verificado: valores y bindings intactos, ningún nombre viejo vivo en el archivo.

#### `-lg` significa dos cosas en `space/*`, y se queda así (15-sep-2026)

La auditoría propuso renombrar `space/page/padding-lg` a `space/page/padding` por «modificador sin base»: no existe `space/page/padding`, así que el sufijo parecía prometer un hermano inexistente. **Al comprobarlo en el código, la propuesta era falsa y se retiró.**

La página del producto es `p-4 sm:p-6 lg:p-8`. El `-lg` del token no es un escalón de tamaño: es **el breakpoint `lg:` de Tailwind**, y los dos escalones de debajo sí existen —16 y 24—, solo que ya están tokenizados como `space/inset/md` y `space/inset/lg` y no necesitan un segundo nombre. Quitar el sufijo habría hecho que un token que el producto solo aplica a partir de 1024 px reclamara ser «el padding de página», y habría borrado información verdadera.

**Lo que sí es cierto es la ambigüedad del slot**: `-lg` es breakpoint en `space/page/padding-lg` y `space/container/padding-lg`, y variante de tamaño en `space/card/padding-lg` (20 px, el `p-5` de `PersonCard` y `GiftRecommendationCard`, sin breakpoint de por medio). Como el archivo espeja Tailwind a propósito y `lg` es literalmente el nombre del breakpoint allí, **renombrar sería imponerle a este sistema un vocabulario que no es el suyo**. Se resuelve donde toca: la descripción de los dos tokens de breakpoint dice ahora que su `-lg` no es un escalón.

**Regla que deja el caso**: antes de llamar «modificador huérfano» a un sufijo, buscar el hermano **en el producto**, no en la lista de variables. Que un valor no esté tokenizado en esa carpeta no significa que no exista.

#### El último slot pelado de `sizing/`, y dos descripciones que no cabían (15-sep-2026)

**`sizing/checkbox` → `sizing/checkbox/box`.** Tras el barrido de consistencia era el único de los 34 tokens de `sizing/` sin carpeta de objeto: los otros 33 son `sizing/<objeto>/<parte>` o `<objeto>/<propiedad>`. El nombre nuevo lo deja calcado a su gemelo exacto, **`sizing/slider/thumb`**, que mide lo mismo y aliasa el mismo escalón (`sizing/selection/sm` → `spacing/16`). No se toca `radius/checkbox`: en `radius/` **todas** las hojas van peladas (`panel`, `surface`, `pill`, `control`, `logo`, `tag`), así que ahí la pelada es la forma consistente.

Coste: 82 bindings intactos, renombrado puro. La prosa repasada en el mismo pase: la descripción de `sizing/selection/lg`, que lo citaba entre paréntesis; el párrafo de las cuatro capas de `Start here`; y la fila de la tabla de `Foundations · Space, Radius & Elevation`, que es texto monoespaciado alineado por columnas y hubo que recomponer para que el valor siguiera cuadrando.

**Y dos descripciones pasaban del tope de 250 caracteres** de la fórmula de [`figma-tokens.md`](figma-tokens.md). Las dos se pasaban por lo mismo: llevaban dentro la justificación de arquitectura, cuyo sitio es este documento.

- **`brand/primary`** (261 → 223): salen los dos ratios entre paréntesis —3,82:1 y 4,59:1—, que ya están en la tabla de `--primary` de «Sincronización a11y». Se queda el hecho (`Green/600` es el único paso que aguanta las dos cosas) y la advertencia (no moverlo sin volver a medir).
- **`space/switch/track-inset`** (322 → 213): sale la evidencia de por qué no son 4 px, que **se aparca aquí para no perderla**: con un inset de 4 px el pulgar solo recorría 4 px en el tamaño `Sm` y 8 px en el `Default`, y a esa distancia el estado del switch no se lee por posición. Se queda lo que evita el error de verdad — que ese 1 px viene de un borde transparente del producto, no de padding, y por eso aliasa `border-width/1` y no la escala de espaciado.

**Lo que esto deja como regla**: cuando una descripción no cabe, lo que sobra casi nunca es la advertencia — es el porqué. El porqué va al `.md` y la descripción se queda con el qué y el aviso.

#### `danger` y `error`: dos rojos con el mismo hex (25-ago-2026)

> **Cerrado el 18-sep-2026, en contra de lo que dice esta sección.** Nada de lo que sigue llegó a existir en Figma: el rename a `color/border/error` se deshizo en algún momento después del 25-ago y nunca hubo una variable con `error` en el nombre. La distinción se abandona a propósito — **hay un solo rojo y se llama `destructive`**, como en el código. Se conserva el texto porque explica por qué se intentó y con qué datos, no porque describa el archivo. Ver «`danger` pasa a `destructive`».

Nacen seis fondos de estado — `color/fill/success`, `fill/warning`, `fill/error` y su `-solid` cada uno — y `color/border/danger` pasa a llamarse **`color/border/error`**. Es el primer sitio donde el sistema distingue **`danger`** (acción destructiva, irreversible: borrar) de **`error`** (algo ha fallado o falta: validación, campo inválido).

**Tabla corregida el 18-sep-2026 contra el archivo real.** La original citaba `color/fill/error` y `fill/error-solid`, que nunca existieron, y **cuatro valores falsos**: `Green/100` como #E8ECE8, `Green/800` #203322 (es `Green/900`), `Green/850` (paso que no existe desde la migración a la escala 50–950, como ya dice «Cifras corregidas en este documento») y `Green/400` como #89968B. Nombres y valores de hoy:

| Token | Light | Dark |
|---|---|---|
| `color/fill/success-subtle` | `Green/100` #E5EEE6 | `Green/900` #1E4024 |
| `color/fill/success-solid` | `Green/950` #0C2912 | `Green/400` #8EAA91 |
| `color/fill/destructive-subtle` | `Red/200` #FFE8E3 | `Red/alpha-20` (#FA6863 al 20 %) |
| `color/fill/destructive-solid` | `Red/950` #CC2823 | `Red/900` #FA6863 |
| `color/fill/warning` | `Amber/200` #FDE2B8 | `Amber/950` #66341C |
| `color/fill/warning-solid` | `Amber/800` #B45309 | `Amber/500` #F3AE51 |

**Por qué `error` no es `danger`, con datos.** El archivo ya lo confesaba en sus propias descripciones: `color/text/danger` decía «mensajes de validación **y** labels destructivos», e `color/icon/danger` «papelera de acciones destructivas **e** iconos dentro de mensajes de validación». Dos significados dentro de un token. El código lo confirma con la proporción invertida respecto al nombre — de los **29 `text-destructive`**:

- **23 son error**: los 21 mensajes de validación de `PersonForm`, `GiftHistoryForm`, `ImportantDateForm` y `BudgetRangeSlider`, más el «No encontramos tu email» de `/settings`.
- **5 son danger**: papelera de persona, Label «Eliminar cuenta», las variantes `destructive` de `Button` y `Badge`, y el hover del «No me interesa».
- **1 no es ninguno de los dos**: [NotificationBell.tsx](../src/components/layout/NotificationBell.tsx) pinta `text-destructive` cuando el evento es **hoy** (`days === 0`), escalando desde `text-warning` a ≤7 días. Ese rojo significa **inminencia**, y sigue sin token propio.

El precedente es el ámbar de este mismo día: `--warning` servía a un aviso real y a glifos decorativos, se partió en dos, y la conclusión fue que **comparten hex hoy y pueden divergir mañana sin arrastrarse**. Aquí igual: `fill/error` y `fill/danger` resuelven al mismo color y son roles distintos a propósito.

**`border/error` es un rename puro**: 9 bindings intactos — los masters `State=Error` de `Input` y `Textarea` (el nombre de la variante ya decía «error»), sus instancias, el `Budget Slider` y los dos swatches — y su capa de componente ya se llamaba `color/field/border-invalid` —hoy `color/field/border-danger`—, así que el nombre nuevo la deja coherente. El `codeSyntax` se queda en `var(--destructive)` porque en código no existe `--error`.

**El grupo nació como `color/feedback/*` y se renombró a `fill/*` el mismo día.** Venía de copiar un modelo externo que agrupa por categoría. No sobrevivió al primer examen: `feedback/*` no tiene eje de elemento, así que **solo puede contener rellenos**, y un alert necesita fondo + texto + borde. Habría dejado `feedback/error` conviviendo con `text/danger` y `border/danger` — dos vocabularios en una sola pieza de UI — más un `fill/danger-hover` huérfano.

**Tres decisiones de valor que no conviene deshacer:**

- **El paso sutil no es el 50, es el 100 o el 200.** El modelo de referencia usaba `50`, pero `color/bg` es crema (#FAF6F1), no blanco: `Green/50` da **1,03:1** y literalmente no se ve. `Green/100` da 1,11:1, el mismo tinte que ya tenía `color/fill/danger` (1,09:1) — esa es la vara. En ámbar hay que llegar al `200` (1,17:1) porque el crema ya es cálido y se come el `Amber/100` (1,03:1). **Regla: el paso sutil se elige por contraste contra `color/bg`, no por número de paso.**
- **Los tres `-solid` invierten entre modos**, igual que `color/fill/danger-solid`: paso oscuro de la rampa en Light, claro en Dark. El verde de marca (`Green/850`) como relleno en Dark sería un cuadrado casi negro sobre fondo negro. Cada `-solid` comparte primitivos con su `color/text/*` equivalente, que ya tenía resuelto el par de modos.
- **Scopes `FRAME_FILL` + `SHAPE_FILL`**, no `ALL_SCOPES` como el modelo de referencia: un token de fondo asomando en el picker de texto y de trazo es ruido, y este archivo mantiene `color/text/*` y `color/icon/*` separados justamente porque los scopes importan.

**Fase 2 del split, pendiente.** Hay que partir `color/text/danger` (20 bindings) e `color/icon/danger` (24) en su hermano `error`. El reparto real en Figma **no es el del código**, y es más pequeño de lo que parece:

| Token | Bindings | Reparto |
|---|---|---|
| `text/danger` | 20 | 11 en `Button` (danger, se quedan) · **4 en `Notification Bell`** (inminencia, ni una cosa ni la otra) · 1 en `Budget Slider` (error) · 4 swatches |
| `icon/danger` | 24 | 22 en `Button` (danger, se quedan) · 2 swatches |

O sea: en Figma los mensajes de validación casi no están construidos, así que el trabajo de verdad son **los 4 bindings de la campana**, que no pertenecen a ninguno de los dos roles. En código sí hace falta el pase grande: solo existe `--destructive` y cubre los tres sentidos en 29 sitios, así que o nace un `--error` en `globals.css` con sus ~23 sustituciones, o se acepta que Figma tenga más estructura que el código (patrón ya documentado más arriba).

**Otros huecos abiertos:**

- **No existen `color/text/on-success-solid` ni `on-warning-solid`** (el de error sí: `color/text/on-danger-solid`). Los contrastes están comprobados y anotados en la descripción de cada token: texto claro (`Cream/600`) en Light, oscuro (`Neutral/950`) en Dark, y los cuatro pasan AA — 14,5:1 y 6,1:1 el verde, 4,7:1 y 9,8:1 el ámbar.
- **Los seis fondos nuevos no tienen tarjeta en `Foundations - Color`**, que documenta todos los demás semánticos.
- Sin uso en el producto todavía, y el archivo está publicado como librería: los seis llegan a los consumidores en la siguiente publicación.

### La rampa Amber estaba rota (25-ago-2026)

`color/text/warning` guardaba un hex crudo en vez de aliasar, y la causa estaba en el primitivo: **la rampa Amber no tenía ningún paso capaz de llevar ese texto**. Su paso más oscuro daba 1,97:1 sobre `color/bg`, cuando hacen falta 4,5:1.

Y estaba defectuosa de base: de 600 a 900 la luminancia no bajaba —se quedaba plana en torno a 0,47— y **subía dos veces**, así que no era monótona. Su mitad oscura no existía: eran cinco nombres para el mismo tono. La causa es que metía dentro dos colores de familias distintas, un ámbar saturado y un arena desaturado que alimentaba `--chart-4`.

Se reescribieron los pasos 600–950 (del 50 al 500 no se tocó nada, ya eran monótonos), con **dos anclajes que evitan cualquier deriva**:

- **600 conserva el hex exacto del antiguo 950** (`#e3a757`), así que `color/chart/3` no se mueve ni un dígito respecto a `--chart-3` y el código no se entera.
- **800 es exactamente `#b45309`**, el `amber-700` de Tailwind que el producto ya pintaba. Al pasar el código al token, **el modo claro no cambió ni un píxel**.

El arena del antiguo 900 se fue a `color/Umber/400`, su vecino más cercano, y `--chart-4` se actualizó en `globals.css` para seguir cuadrando — se pudo mover con libertad porque ningún componente consume `chart/4`.

**Los dos usos del ámbar se separaron el mismo día.** Venían del mismo literal de Tailwind por accidente histórico, no porque compartan significado: el de `NotificationBell` es un aviso real (evento a 7 días o menos) y el de `giftImages.ts` es decorativo. Ahora `--warning` se queda solo con la campana y nace `--category-amber` para los glifos. **Comparten hex hoy y pueden divergir mañana sin arrastrarse**, que es justo lo que un token separado compra.

Para el glifo se reaprovechó `color/icon/warning`, que **no tenía ningún consumidor**: en la campana el ámbar va sobre un `<span>` de texto y el icono `Bell` hereda el color, así que un icono de aviso no existe en el producto. Se renombró a `color/icon/category-amber`, hoy `color/icon/category/3`. Las otras dos categorías no necesitan token propio porque sí tienen marca detrás: la verde usa `color/icon/brand` y la terracota `color/text/brand-secondary`.

**Cambio de código en el mismo pase**: nace `--warning` (en `:root`, `.dark` y el mapeo `--color-warning` de `@theme inline`) y los dos consumidores pasan a `text-warning`: [NotificationBell.tsx](../src/components/layout/NotificationBell.tsx) y [giftImages.ts](../src/lib/giftImages.ts). **Ojo con el segundo**: usa el ámbar como color de glifo para unas 15 categorías de regalo, así que el token llamado `warning` tiene un uso mayoritario que no es de aviso. Verificado en el navegador: `text-warning` resuelve a `#b45309` en claro (idéntico a antes) y `#f3ae51` en oscuro (antes `#f59e0b`; un matiz menos amarillo y algo más contrastado, 9,86:1 frente a 8,78:1).

Con esto **no queda ni un valor literal de color en la colección `Semantic`**, y desde el 25-ago-2026 tampoco ninguno *por carencia* en el resto del archivo: el último era `opacity/disabled` de `Medidas`, que lo era **por falta de familia primitiva de opacidad** —crear una de un solo miembro añadía un eslabón sin nada que gobernar— y ya aliasa a `opacity/50` (0 cambios de valor resuelto, sus 8 bindings intactos). **Los únicos valores directos que quedan fuera de `Primitives` son los 6 de `z-index/*`**, literales por decisión razonada y no por falta de rampa — ver su sección.

### El Switch tenía tres estados y dos tokens (25-ago-2026)

`color/switch/thumb-bg` cubría solo dos de los tres estados del componente. En [switch.tsx](../src/components/ui/switch.tsx) el thumb es `bg-background` en claro, `dark:data-checked:bg-primary-foreground` encendido y `dark:data-unchecked:bg-foreground` apagado — tres valores, no dos. El token guardaba el encendido, así que **en modo oscuro el thumb apagado se pintaba `cream/600` cuando debía ser `cream/700`**.

Se partió en `color/switch/thumb-bg-checked` (renombrado: los bindings van por id, así que no se tocó ninguno) y `color/switch/thumb-bg-unchecked` (nuevo), y se repuntaron las variantes `Unchecked` y `Disabled` de los dos tamaños. El `Disabled` usa el token de apagado porque es exactamente eso: un apagado atenuado.

**Y esa atenuación ya no es un número suelto**: la opacidad de las dos variantes `Disabled` está vinculada a `opacity/disabled`. **Cuidado con la unidad** — Figma resuelve las variables vinculadas a opacidad en **porcentaje (0–100)**, no en 0–1. El token nació con `0,5` y pintó las variantes al 0,5 %, es decir invisibles; el valor correcto es `50`.

### `color/` se reduce a grupos de rol (27-ago-2026)

Decisión: bajo `color/` solo viven grupos de **rol** — `bg`, `text`, `fill`, `feedback`, `border`, `icon`, `field`. Los tres grupos que no lo eran salieron, cada uno por una razón distinta. `color/` pasa de **78 a 66** variables y `Semantic` de **177 a 175**.

**`chart/` (5) → `bg/category/*`. No era una gráfica.** No hay ninguna librería de gráficas instalada y cuatro de los cinco tokens tenían 0 usos en código. El único usado, `chart-3`, se usa como `bg-chart-3/15`: el tinte del contenedor de la categoría ámbar en [giftImages.ts](../src/lib/giftImages.ts). Y sus nodos en Figma lo confirman: los 5 dots están dentro de una card de perfil («Datos del año», «Alérgenos: frutos secos») en una sección titulada **«PALETA EN CONTEXTO»** cuyo pie dice literalmente *«Cálido, de papel, nunca un dashboard»*. Son la paleta de acentos —verde, terracota, ámbar, umber, neutral—, así que se renombraron a `bg/category/<hue>` por su hue resuelto.

**`switch/` (2) → borrados.** Tras el arreglo de la sección anterior los dos aliasaban a `color/icon/on-brand` y resolvían idénticos, así que no aportaban indirección. **Se repuntaron primero los 12 nodos** que los vinculaban —los thumbs de las instancias heredan del componente, de ahí que 12 nodos cubrieran los 22 bindings que el escaneo contaba por duplicado— y solo entonces se borraron. Verificado a posteriori: **0 nodos con variable inexistente** en todo el archivo. Sus dos swatch de documentación se eliminaron del grupo Rellenos, que documentaban tokens que ya no existen.

**`brand/` (10) → `brand/*` de primer nivel. Este no se disuelve.** Tiene **26 alias entrantes, más que ningún otro grupo del archivo**: es la capa de identidad y el único punto de contacto con la paleta de marca, y el propio documento registra que creció 3→8→10 precisamente porque los tokens nuevos aliasaban al primitivo y se saltaban el hub. Disolverlo convertiría «cambiar el verde» de 10 ediciones en 26. Así que salió de `color/` **sin dejar de existir**: sigue en `Semantic`, como grupo hermano de `color/`. Fue un renombrado, así que los 26 alias siguen intactos. Y encaja mejor: el hub no es un rol de color, es la capa de marca.

**La arruga, dicha en voz alta**: `bg/category/*` guarda **acentos sólidos, no tintes claros**. `bg/category/1` es `Green/950`, el verde más oscuro de la rampa; el código lo aplica al 10–15 % de alfa (`bg-primary/10`, `bg-secondary/15`, `bg-chart-3/15`). Es decir, el grupo se llama `bg/` pero sus miembros no son usables como fondo tal cual. **Al definir los 8 miembros finales hay que decidir si `bg/category/*` guarda el hue sólido o el tinte listo para usar**; hoy es lo primero y el alfa se aplica en el sitio de uso.

**Y una colisión que espera en el código**: la categoría ámbar necesita dos colores, contenedor e icono, y hoy los tiene como `--chart-3` y `--category-amber`. Cuando se nombren los 8, `--category-amber` ya está ocupado por el icono, así que el par necesita nombres que distingan superficie de primer plano. Por eso el código **no** se renombró en esta pasada: depende de ese diseño.

**Anotaciones barridas.** El renombrado deja mentiras en el archivo, así que se corrigieron en la misma pasada: la sección de documentación (`group/chart` → `group/bg/category`, cabecera «Datos / gráficas» → «Fondos de categoría», las 5 cards y sus etiquetas), y seis textos en Excepciones, LogoMark, Switch y Slider que citaban `brand/*`, `color/switch/*` o `spacing/switch/*`. De paso salieron dos afirmaciones falsas que no venían de este cambio: Excepciones decía «los 8 tokens» cuando son 10, y afirmaba que `text/brand` aliasa a `brand/primary` solo en Light quedándose en `cream/700` en Dark, cuando desde el 26-ago aliasa a `brand/primary-text` en los dos modos. **Se dejó a propósito la prosa histórica** que cita nombres viejos describiendo estados pasados: es un registro, no una afirmación sobre el presente.

**Lo que falta para llegar a los 7 grupos completos**: no existe `feedback` todavía. Los 7 candidatos naturales son los de retroalimentación que siguen en `fill/` (`danger`, `danger-hover`, `danger-solid`, `success`, `success-solid`, `warning`, `warning-solid`) — moverlos dejaría `fill` en 9, que es el objetivo exacto. Y `bg/disabled` tiene dos candidatos claros que además son un par duplicado: `fill/field-disabled` y `field/fill-disabled`, donde el segundo aliasa al primero y resuelve igual. El resto de los objetivos (`text` 16, `icon` 14, `border` 10, `field` 7) crecen sin que se pueda deducir con qué, así que esperan.

### El thumb del Switch: espejar un error no lo arregla (27-ago-2026)

La sección anterior partió el token en `checked` / `unchecked` **para ser fiel a los tres valores de `switch.tsx`**. Eso era espejar fielmente una implementación que ya estaba mal, y el resultado en Figma no tenía sentido leído solo:

| Token | Light | Dark |
|---|---|---|
| `thumb-bg-checked` | → `color/bg` | → `color/text/on-brand` |
| `thumb-bg-unchecked` | → `color/bg` | → `color/text` |

Dos problemas de capa, no de valor. En claro, el **fondo de la página** haciendo de relleno de una pieza. Y en oscuro, los dos aliasan a tokens con **scope `TEXT_FILL`**: el relleno de una elipse dependiendo de un token que Figma no te dejaría aplicar a una elipse. Además `thumb-bg-checked` resolvía al mismo `#FAF6F1` en los dos modos por dos rutas distintas, así que el baile de modos no compraba nada.

**Los dos aliasan ahora a `color/icon/on-brand-solid` en los dos modos.** Es el único semántico que ya existía con las tres cosas a la vez: scope de forma (`SHAPE_FILL`, `STROKE_COLOR`), el significado correcto —una forma sobre el relleno de marca del track— y el mismo `Cream/100` en claro y en oscuro. La cadena queda `thumb-* → color/icon/on-brand → Cream/100`.

**Y el código se colapsó a un solo token**: el thumb pasa de `bg-background` + `dark:data-checked:bg-primary-foreground` + `dark:data-unchecked:bg-foreground` a **`bg-primary-foreground`** y nada más. Los tres resolvían casi al mismo crema; uno era el fondo de la página y otro el texto del cuerpo, ninguno un relleno. Aquí el arreglo fue del código, y Figma lo sigue.

**Efecto visible: casi ninguno.** Tres de los cuatro estados ya valían `#FAF6F1`; solo el apagado en oscuro se mueve de `Cream/200` a `Cream/100`, un paso de rampa. Los 22 bindings de nodo siguen intactos —repuntar un alias no los toca— y las 14 instancias de thumb del archivo se verificaron a `#FAF6F1` con su vínculo puesto.

**Los dos tokens tienen ahora el mismo valor en todos los modos y se quedan separados a propósito**, igual que `--muted` y `--accent`: el `Disabled` consume el de apagado, y si algún día el disco apagado necesita un crema distinto, el sitio donde separarlo ya existe. Lo que sigue abierto es el nombre: dicen `bg` siendo relleno de una pieza (ver Pendientes).

**La regla que deja esto**: cuando Figma tiene que retorcerse para espejar el código, **mirar si el código es lo que está mal**. Un token de componente que aliasa a tres semánticos distintos según el modo es la señal.

### Los tres tokens que cerraban huecos de pareja

`color/text/on-destructive-solid` y `color/icon/on-destructive-solid` completan el par de `color/fill/destructive-solid`, que existía sin decir de qué color va lo que se pone encima. **Invierten entre modos**, al revés que `on-brand` y `on-brand-secondary`, porque el rojo también invierte: es oscuro en Light (`red/950`) y claro en Dark (`red/900`). Contraste 5,02:1 y 6,52:1, pasan AA. Son Figma-only, como el propio `destructive-solid`: el producto pinta el tinte, no el sólido.

`color/icon/tertiary` es la pareja de `color/text/tertiary`, y hereda su aviso de contraste.

**Lo que NO se creó, y por qué**: `text-on-solid` genérico (aquí hay tres superficies sólidas con primer plano distinto, así que están `on-brand`, `on-brand-secondary` y `on-component-focus` — un token único no podría servir a las tres); `text/inverse` (el único `bg-foreground` del código es el thumb del switch, no una superficie invertida para texto); y cualquier `*-active`/pressed, porque **el pulsado de PickPal es `translate-y-px`, un movimiento, no un color** — no hay ni un estado presionado de color en todo el código. Los `*-hover` de texto y borde que pide el patrón canónico tampoco hacen falta: aquí son **transiciones entre dos tokens que ya existen** (`hover:text-foreground` va de `text/secondary` a `text`; `hover:border-border` va de `border/subtle` a `border`).

### Alfa o paso sólido (25-ago-2026)

La capa de `emphasis` y `state` de color no existía porque **en el código todos los estados se escriben como alfa sobre otro token** (`border-border/60`, `hover:bg-primary/80`, `bg-destructive/10`), y una variable de Figma no puede aliasar «a otro token al 60%». La regla que se adoptó:

- **Paso sólido de la rampa** cuando el color va sobre una superficie opaca y conocida (página o card), que es la inmensa mayoría de los casos. Con alfa el contraste depende de lo que haya detrás, así que no se puede garantizar AA, y dos bordes translúcidos que se cruzan se oscurecen.
- **Alfa** solo donde es la herramienta correcta: overlays, cabeceras con blur y **bordes en modo oscuro** (`color/white-alpha/8|10|12` está bien puesto — un blanco al 8 % funciona sobre cualquier superficie oscura).

Consecuencia práctica: las rampas **Red, Terracotta y Amber no tienen pasos oscuros** (están diseñadas como rampas claras sobre fondo oscuro), así que sus tintes en modo oscuro sí necesitan alfa. Para eso nacieron `color/Red/alpha-20`, `color/Red/alpha-30` y `color/Terracotta/alpha-40`, con el mismo patrón de nombre que las alfas de blanco.

**Los 17 tokens nuevos no existen en `globals.css`**, así que nacen sin `codeSyntax`. Figma va por delante del código a propósito: al adoptarlos hay que sustituir las utilidades con alfa por la custom property nueva, y entonces rellenar el `codeSyntax`. Dos de ellos son además una **corrección**, no un espejo:

- `color/fill/brand-solid-hover` sube un paso de rampa en Dark en vez de diluirse. `hover:bg-primary/80` sobre fondo oscuro **oscurece** el botón al pasar el ratón y el cambio queda casi invisible.
- `color/text/tertiary` da 3,97:1 en Light: **no pasa AA** para texto normal y solo debe usarse en texto no esencial. La rampa Umber está comprimida ahí y el paso siguiente es indistinguible de `secondary`.

**«Deshabilitado» es opacidad en casi todo el sistema, menos en dos componentes.** `Button` (sus 6 tipos), `Button Icon`, `Select`, `Switch`, `Label` y `GiftRecommendationCard` apagan con `disabled:opacity-50` más `cursor-not-allowed`, que atenúa fondo, texto e icono de una vez; para eso está `opacity/disabled` (50) en `Medidas`. Pero **`Input` y `Textarea` sí pintan color**: `disabled:bg-input/50` en Light y `dark:disabled:bg-input/80` en Dark, encima del `opacity-50`. De ahí `color/fill/field-disabled` (ver abajo), y de ahí que **no** exista un `fill/disabled` genérico ni la familia entera (`text/disabled`, `border/disabled`, `icon/disabled`): en todo lo demás el apagado es de verdad solo opacidad. Los `bg/disabled/*` que se crearon y se borraron el 25-ago-2026 eran otra cosa —grises de superficie sin consumidor—, ver más arriba.

### El único disabled con color: `fill/field-disabled` (25-ago-2026)

Hasta este día el sistema afirmaba que deshabilitar nunca pinta, y esa frase fue la que justificó borrar `bg/disabled`. Era falsa para dos componentes: [input.tsx:13](../src/components/ui/input.tsx:13) y [textarea.tsx:10](../src/components/ui/textarea.tsx:10) llevan `disabled:bg-input/50` y `dark:disabled:bg-input/80` desde siempre. La maqueta de Figma tampoco lo pintaba: las variantes `State=Disabled` de `Input` y `Textarea` tenían `fills: []` y un `0,5` suelto de opacidad, así que documentaban un estado que el producto no tiene.

**Tres decisiones metidas en el nombre:**

- **`fill` y no `bg`**, porque un campo es una pieza, no una capa que contiene (el eje de más arriba).
- **`field-` y no `fill/disabled` a secas.** Un nombre genérico promete el gris universal que `Button`, `Select`, `Switch` y `Label` no pintan — exactamente la trampa que se llevó por delante al token anterior. El alcance va en el nombre para que la promesa sea del tamaño del uso real.
- **Paso sólido, no el alfa del código**, aplicando la regla de la sección anterior: el campo se apoya siempre en una superficie opaca y conocida (página o card).

**El valor se calculó componiendo, no a ojo.** `bg-input/50` sobre `--card` (`Cream/500`, `#fffbf6`) da `#f0e9de`, y sobre `--background` (`Cream/600`, `#faf6f1`) da `#eee6dc`; el escalón más próximo a los dos es **`Cream/700`** (`#efeae2`, a 1–6 unidades de RGB). En Dark, `bg-input/80` es blanco al 9,6 % —`color-mix` multiplica el 12 % de `--input` por el 80 %— y compuesto sobre `Neutral/900` da `#362f2b`, sobre `Neutral/950` da `#2c2724`, y el escalón más próximo es **`Neutral/800`** (`#302621`). Ambos se aplican con la opacidad del nodo vinculada a `opacity/disabled`, igual que hace el código al encadenar `opacity-50`.

**En Light comparte valor con `bg/subtle`** (los dos son `Cream/700`): roles distintos que hoy coinciden, como ya pasa entre `bg/surface` y `bg/surface-raised`.

**Pendiente en código**: el token nace sin `codeSyntax`, porque Figma va por delante a propósito. Al adoptarlo hay que sustituir `disabled:bg-input/50` y `dark:disabled:bg-input/80` por una custom property nueva en los dos componentes, y entonces rellenar el `codeSyntax`. **Hecho el 28-ago-2026**: la custom property es `--field-disabled` — ver «El apagado de los campos deja el alfa».

**De paso, dos correcciones en la misma sesión.** `color/fill/sunken` aliasaba a `color/white-alpha/10` en Dark cuando `--input` en `.dark` es `oklch(1 0 0 / 12%)` ([globals.css:123](../src/app/globals.css:123)): repuntado a `white-alpha/12`, que manda el código. Y su descripción decía que `bg-input` «se usa en un único sitio», cuando aparece en **12 sitios de 5 componentes**.

### `color/field/*`: capa de componente creada por si acaso (25-ago-2026)

Cinco tokens de **capa de componente** para los campos de formulario, siguiendo la página *Field Colors* de la guía canónica. Cada uno aliasa 1:1 a un semántico que ya existía, en los dos modos, así que **hoy resuelven idéntico**:

| Token | Aliasa a | Lo que hay detrás en código |
|---|---|---|
| `color/field/border` | `color/border/component` | `border-input` |
| `color/field/border-focus` | `color/border/focus` | `focus-visible:border-ring` |
| `color/field/border-danger` | `color/border/error` | `aria-invalid:border-destructive` |
| `color/field/fill-disabled` | `color/fill/field-disabled` | `disabled:bg-input/50` |
| `color/field/placeholder` | `color/text/secondary` | `placeholder:text-muted-foreground` |

**Se creó como indirección preventiva, no por un uso divergente**, y el coste conviene tenerlo escrito: en este sistema el vocabulario de borde **no es de los campos**. `focus-visible:border-ring` y `aria-invalid:border-destructive` los comparten `Input`, `Textarea`, `Select`, `Button`, `Badge` y `Switch`, así que `field/border-focus` es un segundo nombre para el mismo píxel y abre la puerta a `button/border-focus`, `badge/border-focus` y así hasta duplicar el sistema entero en la capa de componente. **Lo único que puede divergir de verdad es `field/border`**: `--input` lo comparten los campos, `Button` outline y `Select` trigger, y con esta capa separarlos pasa a ser un solo cambio. `field/placeholder` es el miembro mejor justificado — solo los campos tienen placeholder, así que ahí el rol sí es del componente.

**No es una promesa vacía.** Los consumidores se repuntaron el mismo día: los 4 estados de `Input` y `Textarea` y los 4 de `Select Trigger` — 12 strokes, 2 fills y los placeholders. La captura antes/después es idéntica al byte, porque ningún valor resuelto cambia.

**Dos miembros de la guía no se crearon.** `field/bg`, porque no puede tener un valor correcto en ningún modo: en Light el campo va `bg-transparent` (no hay nada que pintar) y en Dark el compuesto de `dark:bg-input/30` —blanco al 3,6 %— cae **entre `Neutral/900` y `Neutral/800`**, sin escalón donde aterrizar; es el mismo obstáculo que ya descartó `fill/component-subtle`. Y `field/border-hover`, porque no hay **ni un** `hover:border-*` en todo `src/`.

**En código no existe esta indirección**: un solo `--input` sirve a los cuatro componentes. Separar el borde del campo de verdad exige una custom property nueva, no solo este token.

**Dos palabras que hay que vigilar al cruzar de un lado al otro:**

- **`accent`.** El patrón canónico llama `accent` al color secundario de identidad; shadcn llama `--accent` al beige del item de menú enfocado. Son cosas opuestas, así que la palabra **no se usa como rol en Figma**: la terracota es `brand-secondary` y el beige es `component-focus`.
- **`secondary`.** En la familia de texto, `color/text/secondary` es el texto de apoyo (el sentido del patrón canónico), mientras `color/text/on-brand-secondary-solid` es el texto que va encima de la terracota. El prefijo `on-` es lo que los distingue.

Al mapear un token de color nuevo, **decidir el rol por cómo lo usa el código, no por cómo se llama la variable CSS**: `--muted` parece "zona secundaria" por el nombre y resultó ser la superficie interactiva de medio sistema, y `--accent` parece un color de identidad y resultó ser un solo estado de foco.

Las desviaciones deliberadas están todas en la página **`Design decisions`** del archivo (hasta el 10-sep-2026, `Excepciones`): 21 entradas, cada una con su motivo y su "no hacer". Si algo en Figma parece un error, mirar ahí antes de tocarlo.

### `bg` y `fill`: el `element` se partió en dos (25-ago-2026)

Hasta este día todo color de relleno vivía en `color/bg/*`: el canvas de página, la card, el botón de marca y el track del Slider en un mismo grupo de 15. Se partió siguiendo la guía canónica de tokens, que separa *Background Colors* de *Fill Colors*:

- **`bg/*` (4)** — la capa que **contiene**: `color/bg` (canvas), `bg/surface` (card), `bg/surface-raised` (popover), `bg/subtle` (zona secundaria, todavía sin uso).
- **`fill/*` (11)** — el **relleno de una pieza**: `fill/brand` · `-hover` · `-subtle`, `fill/brand-secondary` · `-hover`, `fill/component`, `fill/component-focus`, `fill/danger` · `-hover` · `-solid`, `fill/sunken`.

**El eje es contener vs pintar, NO interactivo vs no.** Con el criterio de interactividad `bg/surface` tendría que haberse movido: `PersonCard` es un `<Link>` entero con `hover:bg-muted/40`, así que `--card` es el relleno en reposo de un elemento pulsable. Pero una card **contiene** contenido, así que se queda en `bg`.

**Dos tokens quedan a caballo y están decididos por escrito**, cada uno con el motivo en su descripción de Figma, porque el nombre no lo dice:

- `fill/component` (`--muted`) es `fill` aunque también pinte el **footer de Card** y el track del Slider. Manda su uso mayoritario: hover de Button ghost y outline, hover de Badge, enlace del sidebar.
- `fill/sunken` (`--input`) tenía nombre de superficie siendo relleno de control (track del Switch apagado, campo en Dark). Su propia descripción ya lo decía antes del cambio: «se aplica como relleno».

**Coste real: 0 bindings.** Un rename puro conserva id, valores, alias, bindings y `codeSyntax` — `color/fill/brand` sigue mostrando `var(--primary)` en Dev Mode, igual que pasó con `radius/control` → `radius/interactive` y sus 620 bindings. El trabajo estuvo en otra parte: 11 renames, **12 descripciones** de otras variables que citaban los nombres viejos, **11 rótulos de swatch** en `Foundations - Color` (son texto y **no siguen a la variable**), **6 bloques de prosa** en páginas de componente y en `Foundations - Excepciones`, y esta tabla. El archivo está publicado como librería, así que los nombres nuevos llegan a los archivos consumidores en la siguiente publicación.

**Se adopta el grupo, no el vocabulario de la guía.** Ella llama `fill/primary`, `fill/secondary` y `fill/muted` a lo que aquí es `fill/brand`, `fill/brand-secondary` y `fill/component`: su `secondary` es un sólido neutro, mientras que aquí `--secondary` es la terracota de identidad, y `muted`/`accent` son palabras ya vigiladas (ver más abajo). Sus tres pasos `*-active` tampoco se crearon, por lo de siempre: el pulsado de PickPal es `translate-y-px`.

**Lo que NO se importó de esa página**: el anidado `bg/surface/{subtle, secondary, strong, dark}` —probado y revertido el mismo día, sección siguiente— que además hoy es inexpresable, porque `bg/surface` y `bg/surface-raised` resuelven al **mismo valor en los dos modos** (`Cream/500` en Light, `Neutral/900` en Dark) y `bg/subtle` se les une en Dark: son 2 valores distintos en claro y 1 en oscuro, no 4 pasos. Y `bg/disabled/*`, que aquí se creó y se borró el mismo 25-ago-2026 porque deshabilitado es `opacity/disabled`.

**Pendiente**: `color/switch/thumb-bg-checked` y `-unchecked` siguen diciendo `bg` en el nombre siendo el relleno de una pieza. Sus swatch ya se movieron al grupo *Rellenos*, pero el rename no se hizo: son capa de componente y conviene decidirlo junto al resto de tokens de componente, no a mitad de este pase.

### Anidar `color/bg` en subgrupos: probado y revertido (25-ago-2026)

Se renombraron `bg/surface`, `bg/surface-raised` y `bg/subtle` a un grupo `bg/surface/{strong, secondary, subtle}`, y se crearon `bg/disabled/{subtle, strong}`. **Todo revertido el mismo día**; queda escrito para no repetirlo. Tres motivos:

- **La rampa no era una rampa.** Los tres tokens resuelven a Cream/700, Cream/500 y Cream/500 en Light, y a Neutral/900 los tres en Dark: nombres que prometen intensidad creciente sobre dos valores en un modo y uno solo en el otro. Con los nombres planos ese empate se explica solo —`surface` y `surface-raised` comparten pintura y difieren en elevación, y así lo dice su descripción—; con `secondary`/`strong` no lo explica nada.
- **Dejaba el grupo a medias.** `brand-*` y `danger-*` siguen con sufijo plano, así que dentro de `bg` convivían dos convenciones. Eso es peor que cualquiera de las dos puras.
- **Rompía el puente con el código** —`--card` pasaba a llamarse `surface/strong`— sin ganar navegación a cambio: anidar paga cuando el grupo tiene muchos miembros, y aquí eran tres, uno de ellos sin uso.

`bg/disabled` se borró por lo que ya decide la sección de abajo: sin consumidor, y para un estado que el producto resuelve atenuando.

**Si algún día se anida, hacerlo entero** — y tras el reparto `bg`/`fill` eso significa dentro de `fill/*` (`fill/brand/*`, `fill/danger/*`), porque `bg/*` se ha quedado en cuatro miembros y anidar solo paga con muchos. Con el patrón que el archivo ya usa en `color/bg`, que es a la vez variable y raíz de su grupo. Así cada raíz conserva el nombre de rol y el vínculo con `globals.css`.

**Trampa que causó el error al hacerlo**: el nombre de un token de fondo no dice su rol. `bg/surface` suena a `--background` y es `--card`; `fill/sunken` (entonces `bg/sunken`) suena a "la superficie más profunda" y es relleno de control (`--input`). **Antes de mover un token de fondo, leer su descripción y su `codeSyntax`, no su posición en la rampa.**

### Figma — anatomía de una página de componente (26-ago-2026)

Las 29 páginas de componente comparten la misma estructura, tomada de cómo documenta Atlassian las suyas. De sus tres zonas se adoptó una y se descartaron dos con motivo: *Stickers* (ejemplos listos para pegar) y *Parts* (piezas internas del ensamblaje) existen porque miles de diseñadores externos consumen esa librería, y este archivo no tiene ese consumidor — duplicarían superficie que caduca sola.

**1. Etiquetas de variante alrededor de la rejilla.** Cada `COMPONENT_SET` lleva, fuera del set y dentro de su `SECTION`, etiquetas monoespaciadas `Propiedad=Valor` que nombran cada fila y cada columna: el mismo texto que muestra el panel de Figma. Se generan leyendo la posición de cada variante, no a mano.

- El eje se deduce solo: una propiedad constante a lo largo de una fila se etiqueta a la derecha del set; constante a lo largo de una columna, debajo.
- Si la propiedad cambia en cada paso es **hoja** (Geist Mono Regular 10, `color/text/secondary`) y va pegada al set; si agrupa varios pasos seguidos es **bloque** (Geist Mono Medium 11, `color/text`) y va por fuera, centrada sobre su grupo. `Button`, con `Type × Size × State`, queda con `State=…` fila a fila y `Type=…` centrado sobre cada bloque de tres.
- Si las etiquetas de columna no caben en una línea, cada una baja a la suya en escalera en vez de solaparse — pasa en los sets estrechos (`Button Icon`, `Bell Trigger`).
- Los sets de una sola variante (`Spinner`, `Gift Recommendation Card`) no se etiquetan: la etiqueta no distinguiría nada.

Todas se llaman `vlabel/…`, así que regenerarlas es idempotente: el script las borra por prefijo antes de recrearlas. **No recolocarlas a mano**, el siguiente pase las volverá a mover.

**2. Callouts en el `Header` (estado desde el 11-sep-2026).** Hasta esa fecha el `Header` llevaba una línea monoespaciada `Fuente: <ruta> · Revisado: <fecha>` y un aviso «Divergencia con el código» en las 30 páginas, con `archivo:línea`. Los dos se retiraron en la pasada de portfolio (§ «Pasada de portfolio para Figma Community»), porque un visitante de Community no tiene el repositorio y la fecha de revisión no le dice nada. Hoy el `Header` es título, descripción en inglés y, solo donde hace falta, dos callouts con el mismo bloque `color/bg/subtle` + `color/border/subtle` + `radius/surface`: **«Note»** en ocho páginas (Button, Empty State, Toast, Store Link Chip, Upcoming Date Card, Sheet, Select, Notification Bell), que dice qué no puede enseñar un marco estático —un estado decidido en tiempo de ejecución, un tamaño que el producto tiene y el set no— sin rutas ni líneas; y **«Accessibility · WCAG 2.2 AA»** en siete (Button, Checkbox, Input, Slider, Switch, Back Link, Store Link Chip), con la medida antes y después. Las divergencias con el código siguen midiéndose, pero viven en [`docs/token-map.md`](token-map.md) y aquí, no en el archivo.

**3. Validación en oscuro.** El marco del pie se llamó `Modo oscuro - validacion`, luego `Light & Dark` con dos mitades, y desde el 18-sep-2026 es **`Dark check`**, una sola copia con la colección Semantic fijada a `Dark` y **un solo espécimen**, el mismo que la rejilla enseña arriba, nombrado en una leyenda encima. La mitad clara se retiró y en su lugar **la rejilla lleva `Light` fijado**, en la `SECTION` que envuelve al set y nunca en el set (ver § «Una rejilla y un control en oscuro»).

**Consecuencias de formato, ya aplicadas**: el `Header` se ensancha al mayor de 640 px y el ancho de la sección más ancha de su página, para que el párrafo y el aviso tengan medida legible también en páginas estrechas (`Label` mide 312 px de sección y 640 de cabecera); el párrafo de descripción va siempre en `FILL`, nunca en ancho fijo; y cada página se reapila en vertical con 40 px entre bloques, agrupando en una misma fila los hermanos que comparten `y`.

**Dos defectos preexistentes que salieron al hacerlo.** Los `Header` de `LogoMark` y `Theme Toggle` no eran auto-layout —los otros 27 sí—, así que no podían crecer con su contenido; convertidos a `VERTICAL` con el mismo padding 24/32 y gap 8 que el resto. Y en `Select`, el frame `Preview Light (mode override explicito)` estaba aparcado en (0,0) encima del `Header`: el mismo tipo de nodo huérfano que ya apareció en `Theme Toggle`, movido ahora a su propia fila entre `Select Item` y la validación en oscuro.

### Los placeholders de Button: las variantes ya existían (28-ago-2026)

El archivo llevaba siete marcas «placeholder — falta Button …» (seis nodos y una frase en la descripción de Sheet) esperando variantes que, al ir a crearlas, **ya existían**: `Button` tiene los 6 tipos del código (`Outline`, `Destructive` y `Link` incluidos) y el set aparte `Button Icon` cubre Ghost/Outline × Icon/Icon-Sm, todo bindeado a `color/bg` + `color/field/border` como pide su nota de a11y. Lo desactualizado eran **los textos de la propia página Button**: la prosa del header seguía diciendo «Type (Primary/Secondary/Ghost)». Es el mismo agujero que el de los renames (regla 8 de `figma-tokens.md`): el panel de variantes crece solo, pero **la prosa que lo cita no sigue a nadie** — al ampliar un set, repasar su header y su `nota/divergencia` en el mismo pase.

Con las variantes en pie, lo pendiente real eran las sustituciones. De las siete marcas solo dos eran nodos editables (las otras cuatro, proyecciones de instancia en las previews claro/oscuro que se actualizaron solas):

- **Gift Recommendation Card**: los dos `StoreChip` a mano → dos instancias `Button · Outline/Md/Default` («Amazon», «El Corte Inglés»), y el gap de la fila rebindeado de `space/control/gap-sm` a `space/control/gap` — los 8 px del `gap-2` de la rejilla real (`GiftRecommendationCard.tsx:230`). Van **sin logo de tienda ni `ExternalLink`** (`:252-254`): con las etiquetas reales no caben en los 240 px de esta tarjeta. Anotado como divergencia en la página.
- **Tag Input**: el frame placeholder → instancia `Button Icon · Outline/Icon` con el glifo cambiado a `icon/plus` por instance swap, espejo de `InterestTagInput.tsx:159-160`. Sigue contando entre las pocas instancias de icono reales del archivo (ver el pendiente de huecos de icono).
- **Sheet**: nada que construir — el cierre **ya era** una instancia `Button Icon · Ghost/Icon-Sm` en absoluto (top-3 right-3, `sheet.tsx:66-70`); solo se corrigió la descripción de página que aún decía «falta Button icon-only».

Textos repasados en el mismo pase: la prosa de `Button` lista ahora los 6 tipos y remite a `Button Icon` para los icon-only, y su `nota/divergencia` dice lo que falta de verdad — los tamaños `xs`, `icon-xs` e `icon-lg` (`button.tsx:22-34`), sin consumidor en ningún espejo, y que los icon-only solo existen en Ghost y Outline, los dos pares que el producto usa.

---

## Tipografía

Geist y Fraunces se cargan en [`src/app/layout.tsx`](../src/app/layout.tsx), se precargan en todas las páginas y se exponen como variables CSS. Geist Mono vive aparte, en [`src/app/fonts.ts`](../src/app/fonts.ts), sin precarga.

| Variable | Familia | Uso |
|---|---|---|
| `--font-sans` | Geist | UI, body, formularios, todo lo que no sea titular. |
| `--font-heading` | Fraunces (serif) | `h1`, `h2`, `h3` (aplicado en base layer de `globals.css`). |
| `--font-mono` | Geist Mono | Datos técnicos o literales que hay que teclear tal cual. Hoy solo «ELIMINAR» en el diálogo de borrar cuenta. **`font-mono` no funciona solo**: hay que aplicar `geistMono.variable` en el mismo elemento o en un ancestro que no cruce un portal (los diálogos se pintan en `body`). Así la fuente no se precarga en todas las páginas por una palabra. |

### Reglas

- **Pesos válidos en Fraunces**: 400, 500, 600, 700. Para titulares de página preferir `font-medium` (500) o `font-semibold` (600). `font-bold` (700) solo en hero de la landing.
- **Letter spacing en headings**: `-0.01em` aplicado en base layer (= `letter-spacing/tight`). No añadir `tracking-tight` encima: sería el mismo valor. La excepción sancionada es `tracking-tighter` en titulares display de 60px o más — hoy solo el `h1` del hero de la landing.
- **Body**: tamaños `text-sm` o `text-base`, `leading-relaxed` cuando hay párrafo de varias líneas.
- **Eyebrows / labels**: sans, `text-xs uppercase tracking-[0.2em] text-muted-foreground`. Ejemplo en el hero de la landing.
- **Eyebrows dentro de `<h2>`**: añadir `font-sans` explícito (`className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"`). Sin él, el base layer aplica Fraunces serif a todo `h2` y los headers de sección quedan en serif, visualmente distintos a los mismos labels en `<p>` dentro de formularios.

### Cuándo NO usar serif

- Botones, badges, inputs, navegación: siempre sans.
- Texto largo (>2 líneas seguidas): siempre sans. Fraunces es para impacto, no para legibilidad de párrafo.

---

## Componentes

### Sidebar

Visible a partir de `lg` (1024px). Implementado en `src/app/(app)/layout.tsx`.

- Fondo: `bg-background text-foreground border-r border-border`. **Es un panel claro, no el verde oscuro**: comparte fondo con el contenido y se separa solo por el borde derecho.
- Links activos: `bg-muted text-foreground font-medium` (en `SidebarLink`).
- Links inactivos: `text-muted-foreground hover:bg-muted hover:text-foreground`.
- **Las 13 variables `--sidebar-*` se eliminaron el 25-ago-2026, de `globals.css` y de Figma a la vez.** Eran el set que arrastra shadcn y quedaron huérfanas al pasar el sidebar a panel claro: ningún componente las leía. Se borraron las 8 declaraciones de `:root`, las 8 de `.dark` y los 8 mapeos `--color-sidebar*` de `@theme inline`, más los 7 tokens semánticos de Figma (`color/bg/sidebar*`, `color/text/on-sidebar*`, `color/border/*-sidebar`) y los 2 de marca que solo ellos consumían (`brand/primary-deep` y `brand/primary-muted`). La maqueta «Vista en contexto» de `Foundations - Color` no se borró: se repuntó a los tokens que el sidebar usa de verdad (`color/bg`, `color/text`, `color/text/secondary`, y `color/fill/component` para el enlace activo), así que la documentación describe ahora el sidebar que existe. Si algún día vuelve un sidebar oscuro, se crean tokens nuevos con el rol correcto en vez de resucitar el vocabulario de shadcn.
- El componente `SidebarLink` usa `usePathname()` y compara con `startsWith` para resaltar rutas anidadas.
- El `<aside>` usa `h-screen sticky top-0` para que el pie quede siempre visible sin que el contenido principal lo desplace.
- **Header del sidebar**: `<LogoMark size-7>` + texto "PickPal" (link) a la izquierda + `SafeNotificationBell` a la derecha. `flex items-center justify-between`.
- **Pie del sidebar**: `SidebarUserInfo` — `UserButton` de Clerk + email del usuario truncado (`text-xs text-muted-foreground`).
- **Tema**: `defaultTheme="light"` sin `enableSystem`. El toggle está en `/settings`. No hay ThemeToggle en sidebar ni en el header. Los usuarios existentes conservan su preferencia guardada en `localStorage`.
- En móvil (`< lg`): header compacto con hamburguesa (`MobileNav`) + logo a la izquierda, campana + UserButton a la derecha. La navegación se abre en un `Sheet` lateral (shadcn `sheet.tsx`) desde la izquierda. `MobileNav` es un componente cliente en `src/components/layout/MobileNav.tsx`.

**Campana de notificaciones (`NotificationBell` / `SafeNotificationBell`):**

- Botón con icono `Bell`. Muestra un badge numérico con las fechas próximas dentro de la ventana `notifyDaysBefore` (de `userSettings`).
- Al pulsar abre un **popover** (base-ui) con la lista de fechas próximas, ordenadas por días restantes (ascendente).
- Cada fila muestra: nombre de la persona, etiqueta del evento, y un contador coloreado — rojo si es hoy, ámbar si queda ≤ 7 días, gris el resto. Muestra "Hoy" / "Mañana" en vez de "0d" / "1d".
- Cada fila enlaza a `/seres-queridos/[personId]/gifts` (generación de ideas) para pasar a la acción directamente.
- Estado vacío con icono `Gift` cuando no hay nada en la ventana.
- `SafeNotificationBell` envuelve el componente en un `ErrorBoundary` para que un fallo no rompa el layout.

**Secciones de la navegación:**

| Etiqueta | Ruta | Icono |
|---|---|---|
| Agenda | `/agenda` | `CalendarDays` |
| Seres queridos | `/seres-queridos` | `Users` |
| Mi lista | `/mi-lista` | `BookHeart` |
| Ajustes | `/settings` | `Settings` |

- "Agenda" en vez de "Inicio" porque la sección muestra fechas próximas, no un dashboard genérico.
- "Seres queridos" en vez de "Personas" — voz más cálida y coherente con el registro del producto.
- `CalendarDays` en vez de `Home` — el icono de casita no comunicaba nada sobre fechas.
- "Mi lista" (10-oct-2026) va después de "Seres queridos" y antes de "Ajustes": es la única sección que habla de ti y no de los demás. `BookHeart` y no `Gift` (ya es el de "Ideas de regalo") ni un icono de lista de tareas: es una libreta de lo que te haría ilusión, no una lista de pendientes.

### Cards (shadcn `Card`)

- Default: `rounded` heredado del token, `border border-border/60` para que la línea sea sutil, `shadow-sm`.
- Padding: `p-4` en cards densas (PersonCard), `p-5`–`p-6` en cards informativas (UpcomingDateCard, GiftRecommendationCard, feature cards).
- **Hover · cards completamente clicables** (toda la card es Link): `transition-all hover:bg-muted/40 hover:shadow-md hover:-translate-y-0.5`. Sutilmente "el papel se levanta". Ejemplo: `PersonCard`.
- **PersonCard**: layout vertical. Avatar `size-16` centrado arriba, nombre centrado, badge de relación (`variant="secondary"`) posicionado `absolute top-3 right-3`, sección de intereses con eyebrow label, y CTA "Ver perfil" (`buttonVariants outline sm w-full`) en el pie. Grid responsive: `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`.
- **Filtro de relación en `/seres-queridos`**: encima del grid, fila con `<Label>` eyebrow ("Filtrar") + `<Select>` shadcn. Opciones: "Todas las relaciones" (valor sentinel `"all"`) + las de `RELATIONSHIPS`. El `Select` controlado normaliza `null → "all"` en `onValueChange`. Filtrado client-side en memoria (lista pequeña, no merece pasar por Convex). Cuando el filtro vacía la lista, mostrar empty state propio con el mismo estilo dashed que el original (no reutilizar el de "una libreta en blanco" — distinto motivo).
- **Hover · cards con acción interna** (la card no es link, pero contiene botón): `transition-shadow hover:shadow-md`. Sin translate ni cambio de fondo. Ejemplo: `GiftRecommendationCard`.
- **Cards estáticas** (sin acción): solo `shadow-sm`, sin hover. Ejemplo: step cards de la landing.
- **Card de urgencia** (UpcomingDateCard cuando `daysUntil <= 7`): `border-primary/60 shadow-sm bg-primary/5`. El tinte rosado del primary llama la atención sin chillar.
- **UpcomingDateCard — layout responsive**: avatar `size-12` envuelto en `<Link>` a la ficha del ser querido (`hover:opacity-80` + focus-ring) — entrada redundante con el nombre, pero los usuarios pulsan la foto por instinto. El bloque central apila tres líneas (nombre `font-medium truncate`, etiqueta·relación `text-xs muted truncate`, presupuesto `text-xs muted truncate` si existe) — apilar en lugar de poner nombre y meta en la misma baseline evita que el nombre se trunque a nada cuando el botón come ancho. El botón "Ideas de regalo" muestra solo "Regalar" en mobile (`<span className="sm:hidden">`) y el texto completo a partir de `sm`; siempre lleva `aria-label="Ideas de regalo"`. En desktop con `xl:` aparece la variante `<button>` con `onClick` (panel embebido).
- **Presupuesto en agenda**: `budgetLabel()` en `UpcomingDateCard` divide los valores entre 100 antes de mostrarlos — los presupuestos se almacenan en céntimos en Convex (1000 = 10 €). Cualquier otro componente que muestre presupuestos debe hacer lo mismo.
- **Cards generadas por IA** (GiftRecommendationCard): layout fijo desde arriba para que **el precio quede a la misma altura en todas las cards de la fila** — cabecera visual (ver punto siguiente), título (`text-base font-medium line-clamp-2 min-h-[2.75rem]`, reserva 2 líneas), fila de badges con **altura fija de 2 filas** (`min-h-[2.75rem] content-start`; badge `h-5` × 2 + gap) y **tope total de 3 chips** (marca(s) favorita(s) + categorías; `visibleCategoryTags = categoryTags.slice(0, 3 - matchedBrands.length)`) para que nunca pasen de 2 filas y no desplacen el precio, descripción con altura fija (`min-h-[4.5rem] line-clamp-3`, 3 líneas — la IA escribe 1 frase breve ≤ ~140 car., ver `docs/ia-regalos.md`), separador `border-t border-border/50`, precio prominente (`text-lg font-medium`) y debajo los botones de tienda.
- **Cabecera visual de las cards de ideas**: banda `h-24 rounded-xl` con dos variantes que comparten altura (las filas mixtas quedan alineadas):
  - **Foto de stock (Pexels)** si la generación encontró una: un `<div relative h-24 w-full overflow-hidden rounded-xl bg-muted/40>` que envuelve un `<img w-full h-full object-cover>` (`alt="" aria-hidden` — ilustrativa, el título ya nombra el regalo; `loading="lazy"`). Si la carga falla (`onError`), la card cae en caliente a la variante de icono.
  - **Crédito fuera de la card**: la cabecera no lleva overlay de crédito autor/Pexels (decisión de producto: ensuciaba la cabecera visual). Como las pautas de la API de Pexels piden un enlace visible a Pexels, desde el 27-sep-2026 `GiftsPanel` pone debajo de la rejilla, cuando alguna idea trae foto, un pie `text-2xs text-muted-foreground`: «Fotos de Pexels», con el enlace subrayado (`hover:text-foreground`, `aria-label` «Pexels (abre en una pestaña nueva)»). Es el «pie discreto fuera de la card» que esta línea dejaba previsto. El nombre del fotógrafo no se muestra; `photographer`/`photographerUrl` se siguen guardando por si algún día se reintroduce. El flujo de datos hacia Pexels sigue disclosado en `docs/privacy.md` · 4.2.
  - **Icono por categoría (fallback)**: **tinte plano + icono lucide grande** (`size-9`, `strokeWidth={1.5}` — el stroke 2 default pesa demasiado a ese tamaño, `aria-hidden`). La IA elige una clave de un catálogo cerrado de 30 (`GIFT_IMAGE_KEYS` en `src/lib/giftCatalog.ts`); el mapeo clave → icono + tinte vive en `src/lib/giftImages.ts`. Tres familias de tinte, todas planas (sin gradients): verde `bg-primary/10 text-primary` (naturaleza, deporte, experiencias activas), terracota `bg-secondary/15 text-brand-secondary` (hogar, comida, afecto), ámbar `bg-chart-3/15 text-amber-700 dark:text-amber-500` (creativo, ocio, tech — el glifo usa amber-700 por la misma regla de contraste que el contador de la campana). Ideas antiguas sin `imageKey` caen al icono del tipo de regalo.
  - **Badge de marca favorita**: si la idea menciona una marca favorita de la persona (detectado por `matchFavoriteBrands` en `src/lib/brands.ts` sobre título + `amazonQuery`), antes de los badges de categoría se muestra un `Badge variant="outline"` con icono `Tags` (`size-3`) y el nombre de la marca, tintado en `text-brand-secondary border-secondary/40` para distinguirlo de las categorías (`secondary` filled) sin salir de la paleta. Lleva un `<span className="sr-only">Marca favorita: </span>` para que el lector anuncie el porqué. Cierra el círculo del campo "marcas favoritas" (ver `docs/ia-regalos.md`).
  - **Decisión**: la foto ilustra la **categoría**, no el producto exacto (el matching de un buscador de stock no se verifica). Se descartaron la generación de imágenes con IA (coste + latencia) y las ilustraciones externas tipo unDraw (estética SaaS corporativa, fuera del registro de libreta cálida y del set único lucide). Flujo completo en `docs/ia-regalos.md` · "Cabecera visual por idea". Las cards de una fila mantienen **la misma altura** (`Card h-full` + grid estirado por defecto) y el precio queda **a la misma altura** gracias a las alturas fijas de título, fila de badges (2 filas reservadas) y descripción. Sin la altura fija de los badges, una card con 3 chips (2 filas) bajaba el precio respecto a las de 1 fila. Clave: **ningún bloque usa `flex-grow`** (la descripción NO lleva `flex-1`), así el contenido se apila desde arriba y, cuando una card tiene menos botones, el espacio sobrante queda **debajo de los botones**, nunca encima del precio. Sin icono `Sparkles` (se eliminó — el contexto de la página ya comunica que son sugerencias IA). Stagger animation `animate-in fade-in slide-in-from-bottom-2 duration-500` con `animationDelay: index * 60ms` para que aparezcan en cascada. Los 9 skeletons de carga usan `h-80 rounded-2xl border-dashed bg-muted/40 animate-pulse` (altura acorde a la card con cabecera visual) y siguen la misma rejilla que las cards reales (`sm:grid-cols-2 lg:grid-cols-3` standalone, `grid-cols-1` embebido) para previsualizar el layout.

#### Barra de progreso de generación (`GenerationProgress`)

`src/components/gifts/GenerationProgress.tsx`. Aparece **encima** de los skeletons mientras `loading` es true. Tranquiliza al usuario durante la espera (la generación tarda ~10-20 s y antes "no parecía que estuviera cargando").

- **No hay progreso real que leer**: la POST a `/api/recommendations` es una sola llamada bloqueante (Gemini + Pexels + Brandfetch en serie, sin streaming). El avance es **simulado con easing asintótico** hacia un tope del 93 %: `p + (93 - p) * 0.055` cada 240 ms — corre al principio y se frena cerca del final, así nunca afirma "100 %, terminado" antes de tiempo. La señal real de completado es la aparición de las cards, que desmontan el componente.
- **Mensajes de paso rotatorios**: 5 frases que avanzan cada 3,2 s ("Repasando sus intereses…", "Pensando ideas…", "Ajustando al presupuesto…", "Buscando fotos y tiendas…", "Dando los últimos retoques…"). Son narración, no fases reales del servidor. Se quedan en la última, no hacen loop.
- **Estilo**: card `rounded-2xl border-border/70 bg-card/40 p-6` (mismo registro que los empty states). Icono `Sparkles size-5 text-primary animate-pulse` + título (`Generando 9 ideas…` / `Regenerando ideas…` según `regenerate`) + porcentaje `tabular-nums` a la derecha. Barra: track `h-2 rounded-full bg-primary/15`, relleno `bg-primary` con `transition-[width] duration-300 ease-out`. Pie `text-xs text-muted-foreground` con expectativa de tiempo.
- **A11y**: `aria-hidden` en todo el bloque — el estado de carga ya se anuncia en el `aria-live="polite"` del panel padre. Un `role="progressbar"` con valor simulado induciría a error al lector.

### Buttons

- Variantes shadcn: `default` (verde, `bg-primary`), `secondary` (terracota, `bg-secondary`), `outline`, `ghost`, `destructive` (tintado, `bg-destructive/10`), `link`. Corregido: esta línea decía antes "default (terracota)", que era del `secondary`, no del `default` — confirmado contra `src/components/ui/button.tsx`.
- Tamaños: `sm` para acciones secundarias inline, `default` por defecto, `lg` para CTAs principales.
- **Los botones solo-icono no llevan el glifo más pequeño en `Sm`.** El tamaño del icono lo fija `button.tsx` por clase, y solo tres tamaños bajan del 16 px de la clase base: `xs` y `icon-xs` a 12 (`size-3`) y `sm` —el de texto— a 14 (`size-3.5`). **`icon-sm` no sobrescribe nada**, así que su botón de 28×28 lleva un glifo de 16, igual que el `icon` de 32×32. El Figma lo espeja bien. Comprobado el 28-ago-2026 después de darlo por bug: la inferencia «todo lo `Sm` usa 14» es falsa para los solo-icono, y por eso no se tocó.
- **Links que parecen botón**: usar `<Link className={cn(buttonVariants({ ... }))}>`. El componente Button de esta app **no soporta `asChild`** porque usa `@base-ui/react` en vez de Radix Slot. Dos gotchas al usar `buttonVariants` directamente en un `<a>`/`<Link>` (no en el componente `Button`):
  - **Envuélvelo en `cn(...)`**: `buttonVariants` es `cva` puro y **no aplica tailwind-merge**; sin `cn`, las clases en conflicto coexisten — p. ej. `border-transparent` (base) y `border-border` (variant `outline`) — y el borde puede renderizarse **invisible**. El componente `Button` ya hace el `cn` por dentro; los `<a>` no.
  - **El hover del variant `default` está bajo el selector `[a]:hover`**, así que un `<a>` lo recibe pero un `<button>`/`<Button>` filled queda estático. Para hover en un `<Button>` default, añade `hover:bg-primary/80` explícito en `className`.

### Badges

- `default` (verde): solo para acciones y CTAs. No usar en badges informativos.
- `secondary` (terracota): badges informativos de identidad/relación ("Amigo/a", "Pareja") y énfasis o urgencia (NotificationBell).
- `outline`: tags de atributos (intereses, etiquetas de fecha) y "+N más".

### Chips de tienda (multi-tienda en `GiftRecommendationCard`)

Las tarjetas de regalo físico muestran 1–N chips, uno por tienda relevante. La lista actual de tiendas soportadas (`STORE_IDS` en `src/lib/stores.ts`) son 11: Amazon, El Corte Inglés, AliExpress, Temu, Miravia, Decathlon, IKEA, PcComponentes, MediaMarkt, Zalando, Druni. En la práctica la IA filtra a 1–3 chips por idea según `suggestedStores`, así que el grupo pocas veces es masivo. Reglas:

- **Estilo**: `<a className={cn(buttonVariants({ size: "default", variant: "outline" }), "min-w-0", isLastOdd && "col-span-2")}>` — **outline**: los enlaces de tienda abren una pestaña externa (el icono `ExternalLink` lo refuerza), y el filled verde se reserva para acciones principales internas ("Lo regalé", Regenerar). Tamaño `default` para que sea cómodo de pulsar. Logo de tienda (`<img src={STORE_ICONS[store]} className="size-4 shrink-0 rounded-sm object-contain bg-white p-px">`) antes del texto, nombre en `<span className="truncate">` (se recorta con ellipsis si no cabe en cards estrechas), e icono `ExternalLink` (`size-3.5 shrink-0`) detrás. Siempre `target="_blank"` + `rel="noopener noreferrer"` (evita reverse tabnabbing).
- **Iconos por tienda**: logos oficiales en PNG o SVG almacenados en `public/stores/{storeId}.{ext}`. `STORE_ICONS` en `src/lib/stores.ts` mapea cada `StoreId` a su path público. Todos se renderizan con `bg-white p-px rounded-sm` para garantizar visibilidad en modo oscuro (muchos logos son monócromos o tienen fondo transparente). Las tiendas de `/settings` usan el mismo `STORE_ICONS` con `size-4`.
- **Layout**: rejilla `grid grid-cols-2 gap-2` — dos botones por fila. Cuando el número de tiendas es impar, el último ocupa el ancho completo (`col-span-2`). Botones más grandes y a alturas predecibles (1–2 filas para 1–4 tiendas), en lugar del `flex flex-wrap` anterior que los dejaba pequeños y de altura variable (lo que además desalineaba el precio entre cards).
- **Orden**: canónico de `ALL_STORES` siempre, no el orden en que el usuario los marcó. Predecibilidad > preferencia.
- **Etiqueta**: nombre legible de la tienda (`STORE_LABELS[store]`), no el ID. "El Corte Inglés", no "elcorteingles".
- **Hint de fallback**: cuando la IA sugiere tiendas que no coinciden con las favoritas del usuario, debajo de la fila de chips aparece `<p className="text-2xs text-muted-foreground">Búsqueda genérica — esta idea encaja mejor en otras tiendas.</p>`.
- **Eyebrows de origen (solo cuando hay botón de marca)**: si la idea matchea una marca favorita, los botones de compra se separan en **dos grupos rotulados** con eyebrow `STORE_SECTION_LABEL_CLASS` (`font-sans text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground`): "Tienda de marca" sobre el/los `BrandStoreLink` y "Buscar en tiendas" sobre la rejilla de marketplaces. El porqué: las marcas se añaden en la **ficha de la persona** (`people.favoriteBrands`) y los marketplaces en **Ajustes > Tiendas** (`userSettings.favoriteStores`) — dos entradas distintas que producen botones de aspecto similar, y sin rótulo el usuario no entiende por qué aparece la tienda de una marca que no marcó en Ajustes. **Cuando NO hay marca matcheada no se rotula nada** (caso mayoritario): la rejilla de marketplaces se muestra sola, sin eyebrow, como antes. El eyebrow del marketplace dice "Buscar en tiendas" (neutro, no "tus tiendas") para no contradecir el hint de fallback cuando las tiendas mostradas no son las favoritas del usuario.
- **No mezclar con icon-only buttons**: si en algún momento se quiere reducir el espacio (más de 4 tiendas, móvil pequeño), usar un overflow menu en vez de quitar las labels — los logos de tienda sin texto son fáciles de confundir.
- **Botón de marca favorita** (`BrandStoreLink`, componente compartido en [`src/components/gifts/BrandStoreLink.tsx`](../src/components/gifts/BrandStoreLink.tsx)): cuando la idea matchea una marca favorita (`matchFavoriteBrands`), antes de la rejilla de tiendas se renderiza un botón por marca a **ancho completo** (`col-span-2`), `buttonVariants({ size: "default", variant: "outline" })` tintado en `border-secondary/40 text-brand-secondary hover:text-brand-secondary` (mismo registro que el badge de marca), con nombre de la marca (`<span className="truncate">`) + `ExternalLink` (`size-3.5`). Va **primero, a ancho completo y bajo el eyebrow "Tienda de marca"** (ver punto anterior) porque es la vía que de verdad funciona: muchas marcas favoritas son DTC (Brandy Melville y similares) que no se venden en los marketplaces. El componente recibe los campos sueltos (`brand`, `query`, `title`, `matchedBrandStores`) y un `size` (`default` en la card de generación, `sm` en la lista de guardadas) para servir a ambos contextos. Dos variantes según si la tienda oficial se resolvió (campo `matchedBrandStores` de la idea, vía Brandfetch):
  - **Resuelta**: muestra el **logo de la marca** (`<img>` con `rounded-sm object-contain bg-white p-px` — mismo tratamiento que los logos de tienda para que se vea en modo oscuro; `onError` cae al icono `Tags`) y enlaza **a la web de la marca**: a la búsqueda del producto dentro de la tienda (`generateBrandProductSearchUrl`) si la idea trae `supportsSearch`, o a su home (`generateBrandStoreUrl`) si no. El `aria-label` es "Ir a la tienda de {marca}" cuando va a la home; "Buscar {idea} en {marca}" cuando va a la búsqueda interna.
  - **Sin resolver** (sin `BRANDFETCH_CLIENT_ID`, sin match en Brandfetch, o ideas viejas): icono `Tags` y enlace a `generateBrandSearchUrl` (búsqueda Google acotada a la marca, Capa 0).
  Los chips de tienda se mantienen debajo — algunas marcas (Nike, LEGO) sí están en Amazon. Mismo botón en la card de generación y en la lista de "Ideas guardadas" (ver variante en lista). Lógica en [`src/lib/brands.ts`](../src/lib/brands.ts), flujo completo en [`docs/ia-regalos.md`](ia-regalos.md).
- **Variante en lista (Ideas guardadas)**: la sección "Ideas guardadas" de la ficha de persona muestra las ideas en una **rejilla de mini-cards** (`grid sm:grid-cols-2 xl:grid-cols-3`), todas de igual altura (`h-full` en la card + `mt-auto` en la fila de chips). Cada mini-card lleva título (`line-clamp-2`), ocasión·precio, `description` (`line-clamp-2`), badges de **marca favorita** (`outline` tintado en secondary, igual que la card de generación) + categoría, y los enlaces de compra como chips pequeños **outline** (`buttonVariants({ size: "sm", variant: "outline" })`, no la rejilla grande de las cards de sugerencias — la lista es compacta). El botón **"Lo regalé"** (acción principal interna que abre el diálogo de historial) va en filled (`default`, sin flecha) para destacar sobre los enlaces de tienda. Los enlaces **replican lo que mostró la card al generar**: solo las físicas (e ideas viejas sin `giftType`) muestran chips de tienda; experiencias, planes y sorpréndeme → un chip "Buscar" a Google. Para que coincidan exactamente, al guardar una idea física se persiste el **snapshot de las tiendas efectivas** que se vieron (resultado de `pickEffectiveStores`, no las crudas de la IA) y en la lista se muestran tal cual. Igual que la card de generación, las físicas con marca matcheada muestran el **`BrandStoreLink`** (tamaño `sm`) encima de los chips de marketplace: al guardar también se congela `matchedBrandStores`, así que el botón lleva a la tienda oficial con su logo; las ideas guardadas antes de este cambio (sin ese snapshot) conservan el badge y caen al botón de búsqueda de marca (Capa 0). `giftType` y `matchedBrandStores` son campos opcionales en la tabla `savedIdeas`; las ideas guardadas antes de `giftType` se tratan como físicas y caen al fallback de favoritas.

Ver lógica completa en [`docs/ia-regalos.md`](ia-regalos.md#multi-tienda) y la implementación en [`src/components/gifts/GiftRecommendationCard.tsx`](../src/components/gifts/GiftRecommendationCard.tsx).

### Landing page (`src/app/page.tsx`)

Página de marketing, server component. Estructura:

- **Header**: logo + "PickPal" a la izquierda, `UserButton` de Clerk a la derecha (solo si autenticado).
- **Hero**: H1 serif escalado (`text-4xl → lg:text-8xl`) + subtítulo + CTAs. Sin eyebrow — se eliminó "Para las personas que te importan".
  - Autenticado: un botón "Ir a la agenda" → `/agenda`.
  - No autenticado: "Empezar gratis" (primary) + "Iniciar sesión" (outline).
- **Steps**: grid `grid-cols-1 sm:grid-cols-3`, tres `Card` estáticas (sin hover). Cada card tiene:
  - **Pictograma de marca** arriba: componente SVG de [`src/components/landing/StepIllustrations.tsx`](../src/components/landing/StepIllustrations.tsx), centrado en un contenedor `flex h-24 items-center justify-center`, tamaño `h-20 w-auto`. Flotan directamente sobre la card, sin banda de tinte detrás — los círculos crema del propio pictograma hacen de fondo.
  - Badge de número: `size-6 rounded-full bg-secondary text-secondary-foreground text-2xs font-semibold`.
  - Título `text-xl font-medium` (serif heredado), en fila con el badge (flex row, `gap-3`).
  - Cuerpo `text-sm leading-relaxed text-muted-foreground`.
- **Footer**: una línea centrada `text-xs text-muted-foreground`.

**Pictogramas de marca (`StepIllustrations.tsx`):**

Ilustraciones planas en el mismo lenguaje que el logo-mark: figuras geométricas rellenas (sin stroke), círculos crema de fondo y el dúo verde bosque + terracota. Reglas:

- **Colores solo por token**: `fill-accent` (círculos crema de fondo), `fill-primary` (forma principal), `fill-secondary` (acento terracota), `fill-chart-3` (destello ámbar puntual). Nunca hex fijos — así se adaptan a claro/oscuro solos.
- **Entrada animada**: el contenedor del pictograma lleva `animate-in fade-in zoom-in-95 duration-500 fill-mode-both` con `animationDelay: index * 120ms` — las tres viñetas "aparecen" en cascada al cargar la landing. Zoom sutil (no slide) porque son objetos que *se posan*, no filas de lista. CSS puro (`tw-animate-css`), la página sigue siendo server component y `prefers-reduced-motion` se respeta por defecto.
- **Formas**: círculos, rects redondeados y paths simples. Las figuras humanas son cabeza (círculo) + hombros (rect con `rx` = mitad del ancho), recortadas al círculo de fondo con `clipPath` — mismo esquema que las dos figuras del logo.
- Siempre `aria-hidden` (decorativas). `viewBox="0 0 140 72"` compartido.

| # | Pictograma | Título |
|---|---|---|
| 1 | Trío de figuras — la central terracota, delante y más grande; las laterales verdes | Añade a tus seres queridos |
| 2 | Campana verde sobre círculo crema + badge terracota de aviso | Dile cuándo avisarte |
| 3 | Caja de regalo verde con lazo terracota + destellos ámbar/terracota | Genera ideas perfectas |

**Decisiones:**
- Las step cards no tienen hover — son informativas, no interactivas.
- **Pictogramas propios, no iconos lucide ni sets externos**: se probó una composición de iconos lucide con tintes planos (commit `d7eae86`) y se sustituyó — los iconos de stroke leen como UI, no como ilustración. Los pictogramas rellenos en la paleta de marca extienden el lenguaje del logo (figuras planas verde+terracota) y mantienen el registro de papelería cálida. unDraw y similares siguen descartados (estética SaaS genérica). Esta es la **excepción deliberada a la regla "no SVG inline"** de Iconografía: aplica solo a ilustración de marca (landing, futuros empty states de marketing), nunca a iconos funcionales de la app, que siguen siendo lucide.
- El mapeo semántico de colores se mantiene: terracota = personas/afecto, verde = producto/acción, ámbar = destello puntual.
- Sin emojis en las cards: número + pictograma comunican el paso y mantienen el registro adulto.
- El H1 apunta al pain principal ("regalo perfecto"), no al recordatorio de fechas, que es lo que ya hace el calendario del teléfono.

### Páginas — padding y layout

Padding de página responsive en todos los `<main>`: `p-4 sm:p-6 lg:p-8`. No usar `p-8` fijo.

**Agenda** (`/agenda`): layout master-detail diferente según dispositivo.

- **Móvil (< lg)**: columna única. El botón "Ideas de regalo" de cada `UpcomingDateCard` es un `<Link>` que navega a `/seres-queridos/[personId]/gifts?occasion=...`.
- **Desktop (≥ lg)**: CSS Grid de dos columnas fijas: `lg:grid-cols-[480px_1fr]`. La columna izquierda (480 px) lista los eventos; la derecha (flexible) muestra el `GiftsPanel` embebido al pulsar "Ideas de regalo". El botón "Ideas de regalo" en desktop es un `<button>` con `onClick` que actualiza el estado local `selected`; el `<Link>` tiene clase `lg:hidden` para que solo sea visible en móvil. El `<button>` nativo necesita `hover:bg-primary/80` explícito porque `buttonVariants` default usa el selector `[a]:hover` que solo aplica a `<a>`.
- **Por qué grid fijo (no flex)**: con `flex-1` en la columna de eventos, su ancho cambia al aparecer el panel, deformando las cards. Con `grid-cols-[480px_1fr]` la columna izquierda siempre mide exactamente 480 px, independientemente de si el panel está abierto o no. El padding `lg:px-1 lg:pb-1` del contenedor de la lista también se aplica siempre (no condicionalmente) para que el ancho disponible de las cards no varíe nunca.
- **Botón dual en `UpcomingDateCard`**: siempre usar `cn(buttonVariants({ size: "sm" }), "lg:hidden")` — nunca pasar clases de display dentro del `className` de `buttonVariants`. `buttonVariants` incluye `inline-flex` en su base; si se pasa `hidden` dentro del objeto `className`, `tailwind-merge` no lo procesa y `inline-flex` prevalece, mostrando ambos botones a la vez en móvil.
- **Scroll de eventos vs. panel fijo**: la lista de eventos fluye con el scroll general de la página (sin scroll propio). La card de regalos usa `position: fixed` con coordenadas exactas derivadas del layout: `top-8 bottom-8 right-8 left-[48.5rem]`. El `left` se calcula como sidebar (`w-60` = 15rem) + padding izquierdo del main (`p-8` = 2rem) + columna de eventos (480px = 30rem) + gap (`gap-6` = 1.5rem) = 48.5rem. Si cambia el ancho del sidebar o el padding del main, hay que actualizar este valor. El panel está fuera del flujo del documento (`fixed`), por lo que la lista de eventos no necesita un placeholder en el grid — se usa `lg:max-w-[480px]` directamente. El panel y la lista de eventos son dos elementos hermanos dentro de un Fragment (`<>`).

**Detalle de persona** (`/seres-queridos/[personId]`): `max-w-6xl w-full`. Suficiente para no desbordar en monitores muy anchos, pero sin el desperdicio de `max-w-4xl`.

**Formularios** (`PersonForm`): sin `max-w` propio — se adapta al contenedor padre. En la página de creación (`/seres-queridos/new`) el contenedor ya tiene `max-w-4xl`.

**PersonForm — layout dos columnas en desktop:**
- A partir de `lg`: `grid grid-cols-2 items-start gap-6`.
- **Cada sección va en su propia `Card`** (`border-border/60 shadow-sm`, con `CardContent p-5` y eyebrow `<h2>` `font-sans` + icono lucide `size-3.5`) — mismo registro de cards que la ficha de persona (`/seres-queridos/[personId]`), para que crear y editar se vean como la misma libreta.
  - **Columna izquierda — card "Quién es"** (icono `UserRound`): avatar, nombre, relación, intereses, marcas favoritas, notas. `CardContent` con `space-y-5` (campos altos: avatar con botones, textareas).
  - **Columna derecha — card "Datos prácticos"** (icono `Ruler`: talla zapato, talla ropa, alergias, no le gusta) + card "Eventos" (`EventsSection`, icono `CalendarDays`, solo si `includeDates`). Las dos cards se apilan con `space-y-6` (mismo gap que el grid). `CardContent` con `space-y-4`.
- Dentro de cada card, los grupos usan `space-y-2` label–input–error.
- **Por qué cards, y por qué la identidad también lleva título** (revierte la decisión previa de "sin contenedores"): la sección de identidad (foto, nombre, gustos…) no tenía título; ahora es una card con eyebrow representativo, "Quién es" (cubre identidad + gustos). Envolver **todas** las secciones en cards iguala el formulario de creación con la ficha de persona —donde cada sección ya vivía en una `Card` con eyebrow `<h2>`— y resuelve la antigua objeción de "rompe la simetría": ya no hay una columna con caja y otra sin ella, ambas son cards.
- **Marcas favoritas vive con Intereses** (card "Quién es"), no en "Datos prácticos": es un *gusto* (preferencia positiva que alimenta la IA), no un hecho/restricción como las tallas o las alergias. "Datos prácticos" se reserva para tallas y límites.

**PersonForm — qué es obligatorio:**
- **Solo `name` es obligatorio**; todo lo demás es opcional. No se etiquetan secciones sueltas como "(opcional)" — marcar unas sí y otras no daba a entender que intereses/marcas/notas eran obligatorios. Los headers de sección van limpios ("Datos prácticos", "Eventos").
- La obligatoriedad se comunica **una sola vez**, con un subtítulo `text-sm text-muted-foreground` bajo el `h1` de la página de alta (`/seres-queridos/new`): "Solo el nombre es obligatorio. Lo demás puedes rellenarlo ahora o cuando quieras." Sin asteriscos de "campo requerido" — chocan con el registro de libreta cálida.

**PersonForm — sección Eventos (al crear):**
- `EventsSection` lista los eventos añadidos en memoria (antes de guardar la persona) y ofrece un botón dashed "Añadir evento".
- Al pulsar, aparece `AddEventForm` inline (misma sección, sin dialog ni navegación).
- `AddEventForm` usa `<div>`, NO `<form>` — evita anidamiento de `<form>` HTML prohibido. El botón "Añadir evento" es `type="button"` con `onClick={handleSubmit(onAdd)}`.
- **Enter dentro de `AddEventForm`**: como es un `<div>` dentro del `<form>` de `PersonForm`, pulsar Enter en un input dispararía el submit implícito del form exterior (crearía la persona con la fecha a medias y solo dejaría añadir una fecha al crear). El root del `<div>` lleva un `onKeyDown` que, si `e.key === "Enter"` y el target es un `INPUT`, hace `preventDefault()` y llama a `handleSubmit(onAdd)()` — Enter confirma el evento, igual que en un `<form>` real (`ImportantDateForm`). El guard por `INPUT` deja intactos los Select y el botón del date picker.
- Al confirmar, el evento se añade al array local con `useFieldArray.append` y el subformulario desaparece. El usuario puede añadir varios antes de guardar la persona.
- `BudgetRangeSlider` es un componente compartido (`src/components/people/BudgetRangeSlider.tsx`) usado en `AddEventForm`, `ImportantDateForm` y `EditImportantDateInline`.

### GiftsPanel (generación de regalos)

`src/components/gifts/GiftsPanel.tsx`. Componente único con dos modos:

| Prop | Modo standalone | Modo embebido |
|---|---|---|
| `embedded` | `false` (default) | `true` |
| Wrapper | `<main className="flex flex-1 flex-col gap-8 p-8 max-w-6xl">` | `rounded-2xl` card con scroll interno |
| Cabecera | Título `h1` + back link `← [nombre]` | Avatar + nombre + botón `✕` |
| Grid de ideas | `sm:grid-cols-2 lg:grid-cols-3` | `grid-cols-1` |
| Scroll | Scroll general de página | Scroll interno acotado |

**Modo standalone**: usado por `/seres-queridos/[personId]/gifts/page.tsx`, que es un thin wrapper. La ruta acepta `?occasion=...` para preseleccionar el evento. El back link usa `router.back()` y muestra "Volver" — siempre vuelve al paso anterior real del historial, sin importar desde dónde se llegó.

**Selección de ocasión y botón Generar (sin botón "mudo"):** al entrar desde la ficha (`?from=person`, sin `?occasion`) no hay evento preseleccionado. Dos reglas evitan el botón deshabilitado sin explicación (anti-patrón):
- **Auto-selección con un único evento**: si la persona tiene exactamente un evento, se preselecciona solo (caso más común). Con varios eventos NO se elige por el usuario (presupuestos distintos) — se deja que escoja.
- **Botón activo + validación guiada**: el botón "Generar" se deshabilita solo por `loading` o por **no haber ningún evento** (`!hasEvents`), no por falta de ocasión seleccionada. Si se pulsa con eventos disponibles pero sin ocasión elegida, en vez de generar a ciegas se guía al usuario: `toast.error("Elige primero una ocasión")` + el `SelectTrigger` se marca `aria-invalid` (ring `destructive` que ya trae el componente) y recibe foco + `scrollIntoView`. El estado inválido se limpia al elegir una ocasión. El `SelectTrigger` lleva `id="gift-occasion-trigger"` para el foco. Cuando la persona no tiene eventos, el botón sí queda deshabilitado y el empty state ("Sin eventos todavía") guía a crear uno.

**Header fijo en móvil (standalone)**: cuando el panel de controles sale de la pantalla al hacer scroll, aparece un header `fixed top-0` con fade + slide que muestra el avatar, el nombre de la persona (link a su ficha) y el botón "Regenerar" (solo si ya hay ideas). Solo visible en móvil (`lg:hidden`) — en desktop los controles siempre son visibles. La detección usa un listener `scroll` sobre `window` que comprueba `controlsRef.current.getBoundingClientRect().bottom < 0`. El fondo lleva `bg-background/90 backdrop-blur-sm` para que el contenido detrás quede desenfocado. `aria-hidden` cuando está oculto. El `controlsRef` apunta al mismo div de controles que usa el modo embebido.

**Modo embebido**: usado por el dashboard. La card exterior tiene `overflow-hidden rounded-2xl` — esto recorta el scrollbar nativo a las esquinas redondeadas. La card interior tiene `overflow-y-auto max-h-[calc(100vh-11rem)]` con el scroll real. **Nunca poner `overflow-y-auto` y `rounded-2xl` en el mismo div**: el scrollbar se renderiza fuera de las esquinas redondeadas en Chrome/Windows.

La altura del panel viene determinada por el contenedor `fixed` del dashboard (`top-8 bottom-8`), así que el wrapper embebido usa `h-full` — no hardcodea ningún `calc(100vh-...)`. Si el panel se reutiliza fuera del dashboard (donde no haya un contenedor fixed de altura conocida), habrá que añadir una `max-h` explícita.

**Scrollbar styling** (embebido):
```tsx
[&::-webkit-scrollbar]:w-2
[&::-webkit-scrollbar-track]:bg-transparent
[&::-webkit-scrollbar-thumb]:rounded-full
[&::-webkit-scrollbar-thumb]:bg-border/60
[scrollbar-width:thin]
[scrollbar-color:hsl(var(--border)/0.6)_transparent]
```
Las dos últimas clases son para Firefox. El `overflow-hidden` del div exterior hace que el thumb quede recortado a las esquinas redondeadas de la card.

**Cabecera fija en modo embebido**: el panel tiene dos zonas independientes:
- **Header** (`shrink-0`, fuera del scroll): avatar + nombre + botón Regenerar + botón ✕. Siempre visible sin importar cuánto se haga scroll.
- **Cuerpo** (`flex-1 overflow-y-auto`, ref `scrollContainerRef`): controles de ocasión + tipo + grid de ideas. Scroll interno con scrollbar estilizado.

**Botón Regenerar en la cabecera**: siempre está en el DOM (para que la transición CSS funcione), pero con `opacity-0 pointer-events-none` cuando no debe verse. Cuando el usuario hace scroll y el panel de controles sale del área visible, pasa a `opacity-100` con `transition-opacity duration-200`. Al subir, desaparece con el mismo fade. Usa el botón `default` (verde) porque es una acción principal. **No usar `variant="outline"`** — el Regenerar de la cabecera es acción, no secundaria.

La visibilidad se detecta con un listener de `scroll` en `scrollContainerRef` que compara `controlsRef.current.getBoundingClientRect().bottom` con `scrollContainerRef.current.getBoundingClientRect().top`. Cuando el bottom del panel de controles queda por encima del top del contenedor scroll, el panel ha salido de vista. **No usar `IntersectionObserver` sin `root`**: observa respecto al viewport, no al scroll container interno, y no detecta correctamente el scroll.

**Remount limpio al cambiar de evento**: el dashboard pasa `key={personId + "-" + occasion}` al `GiftsPanel`. Esto fuerza un remount completo cuando cambia el evento seleccionado, reseteando todo el estado interno (ideas, loading, tipo de regalo). Sin el `key`, al cambiar de evento el panel reutiliza el estado del anterior.

### Inputs / Forms

- Siempre con `border` visible. Nada de inputs invisibles a la Material.
- Label arriba (`<Label>`), input debajo, error en rojo (`text-destructive`) inmediatamente después con `text-xs`.
- Espaciado entre campos: `space-y-2` dentro de un grupo (label + input + error), `space-y-5` entre grupos.
- **Selects**: usar siempre el componente shadcn `Select` (`SelectTrigger` + `SelectContent` + `SelectItem`). **Nunca `<select>` nativo** — el aspecto del navegador rompe la consistencia visual con el resto de la UI. En selects controlados con valor inicial, renderizar el label manualmente dentro del `SelectTrigger` con `<span>` (ver patrón en "Select con valor inicial controlado").

### Aviso de datos hacia la IA (`AiNotesNotice`)

[`src/components/people/AiNotesNotice.tsx`](../src/components/people/AiNotesNotice.tsx). Va **bajo el campo de notas**, en los dos sitios donde se editan: alta (`PersonForm`, card "Quién es") y ficha (`/seres-queridos/[personId]`). Un `<p className="text-xs text-muted-foreground">` con enlace subrayado a `/privacidad` — el mismo registro que el resto de hints de formulario, sin caja de alerta ni icono de warning.

**Por qué sin `Alert` ni tinte destructivo**: no es un error ni un peligro inminente, es transparencia. Un banner ámbar junto a un campo opcional rompería el registro de libreta cálida y enseñaría al usuario a ignorarlo. El texto informa y sigue.

**No es decoración, es un requisito legal** (RGPD art. 13: la información va donde se recogen los datos). Las notas se envían a Gemini: Google las trata como encargado y no entrena con ellas, pero salen de PickPal. Si se rediseña el formulario, el componente tiene que seguir montado en **ambas** pantallas — el texto vive en un componente compartido justamente para que no divergan. Contexto en [`docs/privacy.md`](privacy.md) §4.1.

### Interruptor de analítica (`AnalyticsOptOut`, en `/privacidad`)

[`src/components/analytics-opt-out.tsx`](../src/components/analytics-opt-out.tsx). Va en la sección «Cookies» de `/privacidad`, justo debajo del párrafo que explica la analítica. Es la misma fila que «Notificaciones por correo» en `/settings`: `flex items-center justify-between`, `Label` «Contar mis visitas» con un hint `text-xs text-muted-foreground` («Solo afecta a este navegador.») y un `Switch` a la derecha, encendido por defecto.

- **Se monta en cliente y no pinta nada hasta entonces**: la preferencia vive en `localStorage` y la señal del navegador en `navigator`, y ninguna de las dos existe en SSR. Un interruptor que se pinta encendido y se apaga al hidratar confunde más que uno que aparece. Mismo patrón `mounted` que `ThemeToggle`.
- **Con Global Privacy Control o Do Not Track activos no hay interruptor**: se muestra una frase (`text-sm`) que dice que las visitas ya no se cuentan. Enseñar un interruptor que no cambia nada sería mentir.
- **Si el navegador no deja guardar la preferencia**, el interruptor no cambia de estado y sale un `toast.error`.
- Existe por una razón legal (la guía de cookies de la AEPD pide informar y dejar negarse); ver `docs/privacy.md` §2.4.

### Intereses — autocompletado y sugerencias (`InterestTagInput`)

`src/components/people/InterestTagInput.tsx`. Se usa en `PersonForm` (creación) y en la ficha de persona (autosave). Dos capas de ayuda sobre el input libre de tags:

- **Desplegable al escribir**: filtra un catálogo local de intereses (`src/lib/interests.ts`, ~150 items en categorías) ignorando mayúsculas y acentos, priorizando prefijo > inicio de palabra > subcadena. Máximo 7 opciones. **Deliberadamente local, sin IA**: las opciones deben aparecer en cada pulsación — una llamada al LLM por keystroke sería lenta, gastaría la cuota diaria (10/día) y enviaría datos fuera sin necesidad.
- **Chips de sugerencia**: bajo el input, hasta 6 chips con intereses relacionados con los ya añadidos (items de las mismas categorías del catálogo, round-robin entre categorías para variedad; con la ficha vacía, un set de arranque diverso). **Sin etiqueta "Sugerencias:"** — el contexto (chips de interés con icono `Plus` justo bajo el input) ya comunica qué son; el rótulo era ruido. Botón **"Otras"** (`RefreshCw` + texto, `Button variant="outline" size="xs"` con `rounded-full`) rota la ventana sobre el pool completo. Lleva **borde + etiqueta**, no un icono `ghost` suelto: el icono sin borde no se leía como pulsable. Va **al principio de la fila (posición fija), NO al final de los chips**: con `flex-wrap`, los chips cambian de ancho y número en cada refresco, así que un botón al final saltaba de sitio y era incómodo de pulsar de seguido. Anclado al principio (ancho constante), no se mueve. Los chips son `Badge variant="outline"` con icono `Plus` y `render={<button type="button">}` + `aria-label="Añadir X"` (mismo patrón a11y que los chips de eliminar). Hover explícito `hover:bg-muted transition-colors` (regla de chips clicables).
- **Desplegable — estilo y a11y**: panel `absolute` bajo el input (`rounded-lg bg-popover shadow-md ring-1 ring-foreground/10 p-1`, mismo registro que `SelectContent`), entrada `animate-in fade-in-0 slide-in-from-top-2 duration-100`. Patrón ARIA combobox completo: input con `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` y `aria-activedescendant`; lista `role="listbox"` con `role="option"` + `aria-selected`. Teclado: ↑/↓ navegan, Enter añade la opción resaltada (o el texto libre si no hay ninguna resaltada — Enter conserva su comportamiento de siempre), Escape cierra. Las opciones usan `onMouseDown={e => e.preventDefault()}` para que el blur del input no cierre la lista antes de que llegue el click.
- **Dedupe sin acentos**: añadir "futbol" cuando ya existe "Fútbol" no crea duplicado (comparación normalizada).
- **Tope de 20**: al llegar a `MAX_INTERESTS` (espejo del validador del servidor) desaparecen desplegable y sugerencias.

### Marcas favoritas (`BrandTagInput`)

`src/components/people/BrandTagInput.tsx`. Mismo patrón de chips que `InterestTagInput` (Badge `secondary` con `X`, input + botón `Plus`, dedupe normalizado sin acentos, Enter/coma añade, Backspace con input vacío quita la última) pero **sin desplegable ni sugerencias**: las marcas son un vocabulario abierto (LEGO, Nike, Lush…) que no tiene sentido autocompletar con un catálogo local. Tope de 10 (`MAX_BRANDS`, espejo del validador del servidor); al alcanzarlo el input se deshabilita con placeholder "Máximo alcanzado". Se usa en `PersonForm` (creación, bajo Intereses, sin hint) y en la ficha de persona (autosave en cada cambio, eyebrow `Tags`). El campo alimenta el prompt de la IA — ver `docs/ia-regalos.md` · "Marcas favoritas".

### Sección Eventos (detalle de persona)

La sección "Eventos" en `/seres-queridos/[personId]` gestiona fechas importantes de esa persona. Terminología: **evento** (no "fecha importante").

**Collapsed / expanded:**
- Por defecto solo se muestra el botón "Nuevo evento" (borde punteado, `border-dashed`).
- Al pulsarlo, el formulario se expande en la misma card sin navegación ni dialog.
- Al guardar o cancelar, el formulario vuelve a colapsar.

**Entrada de fecha — responsive:**
- **Desktop** (`md+`): tres inputs inline — `Día` (número), `Mes` (shadcn `Select`), `Año (opcional)` (número). Rápido de usar con teclado.
- **Móvil** (`< md`): un botón que abre el `DatePickerDialog` — tres columnas de scroll-snap (día | mes | año opcional) con drag en iOS/Android y mouse drag en Chrome móvil. Overlay de líneas horizontales marca el ítem activo. Implementado en `ImportantDateForm.tsx` como componente local `ScrollColumn` + `DatePickerDialog`.

**Presupuesto:**
- `BudgetRangeSlider`: slider dual de `@base-ui/react/slider` (0–500 €, paso 5) + dos inputs numéricos directos para valores exactos o >500.
- Los thumbs del slider usan `bg-primary` (no `bg-background`) para ser visibles en ambos modos.
- Los `<SliderThumb>` deben ser **hijos de `SliderControl`** (hermanos del `SliderTrack`), no anidados dentro del track. Si están dentro del track, `overflow-hidden` los recorta y no son clicables.

**Fila de evento — modo vista (jerarquía):** la fila usa `flex items-start justify-between` con tres líneas apiladas en el bloque izquierdo:
1. Título `font-medium` + badge de recurrencia (Anual/Única).
2. Fecha (`text-xs text-muted-foreground`) — `15 mayo 1990`.
3. Presupuesto (`text-xs text-muted-foreground`, solo si está definido) — `Presupuesto: 10€ – 50€`.

Las acciones (`PencilLine`, `X`) van pegadas al borde derecho con `shrink-0`. **No** colapsar las tres piezas en una sola línea con `·` — el nombre del evento y la fecha son información de niveles distintos, separarlos en líneas distintas es lo que evita el "todo apelmazado". Mismo patrón en la fila de eventos del `PersonForm` (modo creación), reutilizando los mismos badges.

**Edición inline:**
- Cada evento tiene un botón `PencilLine` que expande `EditImportantDateInline` in situ (no dialog).
- El formulario de edición reutiliza `BudgetRangeSlider` y el mismo patrón de 3 columnas de fecha.
- Al guardar o cancelar, la fila vuelve al modo vista.

**Badges de recurrencia:**
- `Repeat2` + "Anual" — evento recurrente cada año.
- `CalendarX2` + "Única" — evento de una sola vez.
- Ambos con `variant="outline"` y `text-muted-foreground`. El verde primary está reservado para acciones.

### Sección Historial de regalos (detalle de persona)

La sección "Historial de regalos" en `/seres-queridos/[personId]` registra regalos pasados para que la IA pueda aprender qué funciona con esa persona.

**Añadir regalo:**
- Por defecto se muestra el botón "Añadir regalo" (borde punteado, `border-dashed`), igual que "Añadir evento".
- Al pulsarlo, el formulario se expande en la misma card sin dialog ni navegación.
- Al guardar o cancelar, el formulario vuelve a colapsar y los campos se resetean.

**Edición inline:**
- Cada entrada tiene un botón `PencilLine` (editar) + `X` (eliminar), igual que los eventos.
- Al pulsar `PencilLine`, la fila se reemplaza por `EditGiftHistoryInline` in situ.
- Al guardar o cancelar, la fila vuelve al modo vista.
- Implementado en `src/components/people/GiftHistoryForm.tsx` (`GiftHistoryForm` + `EditGiftHistoryInline`).
- Mutación Convex: `api.giftHistory.update` (valida ownership, longitudes y año).

**Campo Reacción — `REACTIONS`:**
- Definido en `src/lib/schemas.ts`. Tres valores: `loved / ok / bad`.
- Labels en español sin emojis: `Le encantó / Le dio igual / No gustó`.
- Sin valor por defecto en ninguna de las dos formas — el usuario debe elegir explícitamente.
- En la lista del historial, la reacción se muestra como texto inline: `Auriculares · Cumpleaños 2024 · Le encantó`.

**Select con valor inicial controlado — fix Radix portal:**
- El `SelectValue` de Radix UI no puede mostrar el label del item seleccionado hasta que `SelectContent` se ha abierto al menos una vez (los items viven en un portal que no se renderiza en cerrado).
- En formularios de edición (valor pre-rellenado), esto provoca que el trigger muestre el `value` raw ("loved") en vez del label.
- Solución: renderizar el label manualmente en el trigger usando `REACTIONS.find(r => r.value === field.value)?.label ?? "Reacción…"` dentro de un `<span>`, sin `SelectValue`. Los items siguen dentro de `SelectContent` para el dropdown.
- Aplicar este patrón en cualquier Select controlado con valor inicial en un formulario de edición.

### «Mi lista» (`/mi-lista`, tarjeta de lista recibida y sección de la ficha)

La función entera está en [`docs/encargo-lista.md`](encargo-lista.md). Aquí, cómo se ve. Todo reutiliza piezas que ya existían: cards con eyebrow, filas como las de eventos e historial, formulario en línea con borde punteado y `EmptyState`.

**`/mi-lista`** ([`src/app/(app)/mi-lista/page.tsx`](../src/app/(app)/mi-lista/page.tsx)): `max-w-5xl`, `h1` «Mi lista» con subtítulo «Lo que te haría ilusión recibir, para quien te regala.». Debajo, rejilla `lg:grid-cols-[minmax(0,1fr)_320px]`: a la izquierda la card «Lo que te haría ilusión» (eyebrow `BookHeart`) y a la derecha la card «Quién la ve» (eyebrow `Users`). En móvil se apilan.

- **Elementos**: botón punteado «Apuntar algo» que despliega `ListItemForm` en el sitio, igual que «Nuevo evento». Cada fila es la de eventos: título `font-medium`, enlace y nota `text-xs text-muted-foreground`, y a la derecha `PencilLine` (editar en línea con el mismo formulario) y `X` (quitar, sin confirmación, como los eventos). Del más nuevo al más antiguo, sin orden manual.
- **Sin elementos**: `EmptyState` con `BookHeart`, «Nada apuntado todavía» y CTA «Apuntar lo primero», en lugar de la card. Al pulsarlo aparece la card con el formulario abierto.
- **«Quién la ve»** (`ListReaders`): primero el texto fijo «Quien la lee puede marcar lo que va a regalarte. Tú no lo verás.» en `text-sm text-muted-foreground`. No es decoración: que el dueño no vea las marcas es lo contrario de lo esperable y, sin el aviso, parecería un fallo. Después, la lista de emails con «Quitar» (`ghost sm`, en `text-destructive`) y un diálogo de confirmación, y debajo el campo de invitar, con el mismo patrón que `ShareDialog` y un hint que añade «Le avisaremos por correo.». El toast solo dice «Le avisamos por correo» si el correo se programó de verdad: no se manda si ya se avisó a esa persona de esta lista en los últimos 30 días.

**Enlace de un elemento** (`ListItemLink`): `text-xs text-muted-foreground`, subrayado al pasar. Siempre enseña el dominio (sin `www.`), y si es una de las 11 tiendas, delante su logo con la misma placa que los chips de tienda (`size-3.5 rounded-sm bg-white p-px`), y detrás `ExternalLink` `size-3`. El dominio no se sustituye por el nombre de la tienda: se ve adónde lleva el enlace antes de abrirlo, y un dominio que imita a otro sale en punycode.

**Tarjeta de lista recibida** (`IncomingListsCard`, arriba en `/agenda` y `/seres-queridos`, bajo el encabezado): card estándar con un círculo `size-10 bg-secondary/15 text-brand-secondary` y `BookHeart` dentro, el mismo tinte terracota que las ideas de hogar y afecto. Texto: «{Nombre} te ha compartido su lista.» en `font-medium`, el email debajo en `text-xs` si hay nombre (el nombre lo elige cada uno; el email está verificado) y «¿Quién es en tu libreta?». Acciones: `Select` de fichas + «Guardar en su ficha», «Crear ficha de {nombre}» (`outline sm`, abre en el sitio nombre + relación, sin relación por defecto) y «No me interesa» (`ghost sm`). Tras guardarla, la misma tarjeta pregunta «¿Compartes tu lista con {nombre}?» con «Compartir mi lista» y «Ahora no». No hay entrada en la campana, que es «Próximas fechas»; el aviso fuera de la app es el correo de lista compartida (ver «Email transaccional»). **En la Agenda, a partir de `xl`, la tarjeta se limita a 480 px con `xl:px-1`, igual que la lista de fechas**, vía la prop `className` del componente (un `div` envolvente vacío ocuparía un hueco del `gap` cuando no hay listas pendientes). El panel de ideas es fijo y empieza en `left-[48.5rem]`: a todo el ancho, la tarjeta quedaba tapada en cuanto se abrían las ideas de una fecha. Lo destapó el dibujo en Figma el 10-oct-2026.

**Sección de la ficha** (`PersonListSection`, en `/seres-queridos/[personId]` justo antes de «Ideas guardadas», con `id="lista"` porque el email enlaza ahí): card con eyebrow `BookHeart` «La lista de {nombre}» y debajo «Lo que {nombre} ha apuntado que le haría ilusión. No ve lo que marcas.». Filas como las de la página del dueño, con la acción a la derecha según el estado:

| Estado | A la derecha |
|---|---|
| Nadie lo ha marcado | `Button outline sm` con `Gift`: «Lo regalo yo» |
| Lo has marcado tú | `Badge secondary` «Lo regalas tú» + `Button sm` «Ya se lo he regalado» + `X` para quitar la marca |
| Ya lo diste por regalado | `Badge outline` con `Check`: «Regalado» + `X` |
| Lo ha marcado otra persona | `text-xs text-muted-foreground` «Ya lo regala otra persona», y el título en `text-muted-foreground` |

- **«Lo regalas tú» es `secondary`** (terracota): es énfasis sobre algo tuyo, la regla de los badges. Las acciones siguen en verde.
- **Aviso de edición**: bajo la fila, una franja `rounded-md bg-secondary/10 text-xs` con «{Nombre} lo ha cambiado después de que lo marcaras.» y un botón `xs outline` «Entendido».
- **Ya no está en su lista**: las marcas de elementos que el dueño borró van al final, en filas con borde punteado, título apagado y `Badge outline` «Ya no está en su lista».
- **Pie**: `Select sm` «Ficha» para mover la lista a otra ficha y «Dejar esta lista» (`ghost sm`, con diálogo de confirmación).

**`AddToHistoryDialog`** ([`src/components/people/AddToHistoryDialog.tsx`](../src/components/people/AddToHistoryDialog.tsx)) es el diálogo que antes vivía dentro de la ficha para «Lo regalé». Lo comparten las ideas guardadas, con la ocasión fija en la descripción, y la lista, que pregunta la ocasión con un `Input` relleno con la fecha de la ficha más cercana a hoy (`closestOccasionLabel`).

### Enlace de retroceso (back link)

Patrón para "volver a la sección anterior", visible en la parte superior de páginas de detalle o subpáginas. Componente compartido: `src/components/layout/BackLink.tsx`.

```tsx
<BackLink />
```

```tsx
// Implementación interna (variante con icono, por defecto)
<button
  onClick={() => router.back()}
  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit"
>
  <ArrowLeft className="size-3.5" aria-hidden />
  Volver
</button>
```

**Props:**
- `fallbackHref?: string` — si se indica y no hay historial dentro de la app (`window.history.length <= 1`, p. ej. URL abierta directamente o desde un enlace externo), navega ahí en vez de `router.back()`. Sin esta prop, siempre `router.back()`. Usado en los pies de página públicos (`/terminos`, `/privacidad`) con `fallbackHref="/"`.
- `icon?: boolean` (default `true`) — variante con `ArrowLeft` + layout en fila (páginas de detalle) o variante de texto plano sin icono (pies de página, donde el contenedor ya centra y da color). `/terminos` y `/privacidad` usan `icon={false}`.
- `label?: string` (default `"Volver"`).
- `className?: string`.

**Reglas:**
- `router.back()` siempre por defecto — navega al paso anterior real del historial del navegador, sin importar desde dónde se llegó a la página. **Nunca hardcodear un `href` fijo** (p. ej. `<Link href="/seres-queridos">`): eso rompe el patrón para cualquier caso en que se llegó a la página desde otro sitio.
- `<button>` con `onClick`, no `<Link>` — `router.back()` no tiene URL.
- Icono `ArrowLeft` de lucide-react, `size-3.5`. `aria-hidden` — el texto del botón ya es descriptivo.
- Color `text-muted-foreground` en reposo, `hover:text-foreground`. No usar `text-primary`.
- `w-fit` para que el área de hover no se extienda a todo el ancho (variante con icono).
- Texto: "Volver" siempre — con navegación dinámica no se sabe el destino en tiempo de render.

### Avatars

- Tamaño default `size-10`–`size-12` en cards, `size-20`–`size-24` en headers de detalle.
- En headers grandes, añadir `ring-1 ring-border` para definir el contorno sin que pese.
- Si no hay foto, fallback con iniciales (2 letras max, mayúsculas).
- **Avatar picker** (personalizador por rasgos): el usuario **construye** el avatar eligiendo cada rasgo con vista previa en vivo, usando la API de [DiceBear](https://api.dicebear.com/9.x/) con el estilo `dylan`. No hay botón "Regenerar". Rasgos: tono de piel (8 tonos, rampa clara→oscura), peinado (**los 12 del schema — es el catálogo completo de dylan, no hay más sin cambiar de estilo**), color de pelo (10), expresión, barba (on/off) y fondo (12 colores vivos y saturados —los pasteles apenas se apreciaban—, sin opción "transparente"; libres, cualquier hex). Botón **«Aleatorio»** (icono `Shuffle`) combina todos los rasgos al azar para quien no quiera decidir; además hay un «Aleatorio» **directo en `PersonForm`** (fuera del diálogo) que usa el helper exportado `randomAvatarUrl()` para generar y aplicar sin abrir el personalizador. Cada rasgo se "pinea" a un único valor de su array (`skinColor[]`, `hair[]`, `hairColor[]`, `mood[]`, `backgroundColor[]`, `facialHairProbability`), de modo que el resultado es determinista y la semilla (`"pickpal"`, fija) no influye en lo que se ve. dylan solo trae 2 tonos de piel de fábrica → ampliamos la paleta para representación; `mood` excluye `angry` y `sad` por no encajar con el retrato de un ser querido. La URL construida (~185 chars) se guarda en `person.avatarUrl` (opcional) y pasa la validación server-side (prefijo `https://api.dicebear.com/`, < 512 chars). Las opciones llevan `aria-pressed` y cada grupo de rasgo es un `role="group"` con `aria-labelledby`. **`AvatarPicker` es controlado** (props `build` / `onBuildChange`): el estado del avatar vive en el padre (`AvatarPickerDialog`), no en el picker; así el preview puede pintarse en la cabecera fija del diálogo mientras los selectores scrollean. Componente: `src/components/people/AvatarPicker.tsx`.
- **Avatar en diálogo (crear y editar)**: tanto en `PersonForm` (alta) como en el encabezado de perfil, el `AvatarPicker` va dentro de un **diálogo** (`AvatarPickerDialog`, compartido) para que la personalización no ocupe espacio por delante de los datos importantes. La superficie en el formulario/encabezado es solo un `Avatar` (preview con fallback de iniciales) + un disparador: botón «Elegir/Cambiar avatar» en `PersonForm`, overlay de cámara (`Camera`, visible en hover) en el perfil. **Layout del diálogo**: cabecera con un **preview pequeño fijo (`size-14`) a la izquierda**, y a su derecha el título «Personalizar avatar» con el botón **«Aleatorio» justo debajo** (sin texto de descripción). Preview y Aleatorio quedan fuera del área scrolleable, de modo que el avatar y el azar nunca se pierden de vista al bajar por los selectores (`max-h-[55vh] overflow-y-auto`, no en el div redondeado del diálogo). El diálogo edita un **borrador**: `build` se siembra al abrir desde la URL guardada (`parseAvatarUrl`; las URLs antiguas con semilla + arrays múltiples caen a los valores por defecto) y solo se persiste al pulsar «Usar este avatar» **si `touched`** (el usuario tocó algún rasgo o «Aleatorio») — sin ese flag, confirmar sin tocar guardaría el avatar por defecto y se perdería el fallback de iniciales. En el perfil eso dispara el autosave; en alta queda en el formulario hasta el submit; «Cancelar» descarta. Componente: `src/components/people/AvatarPickerDialog.tsx`.

### Edición inline (perfil de persona)

`/seres-queridos/[personId]` no tiene página de edición separada. `/seres-queridos/[personId]/edit` redirige a `/seres-queridos/[personId]`. Toda la edición ocurre inline en el perfil, dividida en tres secciones independientes:

| Sección | Campos | Cuándo guarda |
|---|---|---|
| Header — nombre | name | `onBlur` del input (o Enter) |
| Header — relación | relationship | `onValueChange` del Select (inmediato) |
| Header — avatar | avatarUrl | Al confirmar en el Dialog («Usar este avatar») |
| Intereses | interests | `onChange` del tag input (cada add/remove) |
| Marcas favoritas | favoriteBrands | `onChange` del tag input (cada add/remove) |
| Notas | notes | `onBlur` del textarea |
| Datos prácticos | shoeSize, clothingSize, allergies, dislikes | `onBlur` de cada campo |

**Autosave — principios:**
- No hay botones "Guardar" ni dirty flags. El usuario edita y el cambio se persiste en cuanto sale del campo.
- La función `save(fields)` llama a `api.people.update({ id, ...fields })` — como la mutación acepta campos opcionales y hace merge en servidor, cada campo puede guardarse de forma independiente sin sobrescribir los demás.
- Errores: solo se muestra toast de error (`toast.error`). No hay toast de éxito para no generar ruido en cada blur.

**Indicador visual "✓ Guardado":**
- Un pill fijo (`position: fixed; bottom: 1.5rem; right: 1.5rem`) con fondo `bg-primary` y `text-primary-foreground` aparece tras cada guardado exitoso.
- Desaparece automáticamente a los 2 segundos con fade + slide (`transition-all duration-300`).
- Si el usuario edita varios campos rápido, el timer se reinicia para que el pill no parpadee.
- `aria-live="polite"` para lectores de pantalla.
- Implementado con `useState(false)` + `setTimeout` + `clearTimeout` — sin librería externa.

**Guardar parcial:** `api.people.update` acepta todos los campos como opcionales y hace merge en el servidor. Cada `save(fields)` solo pasa los campos de su sección.

**Sin guard de navegación:** al ser autosave no hay "cambios sin guardar" — se puede navegar libremente. No usar `beforeunload` ni `pendingNav` en pantallas con autosave.

**Mismo patrón en `/settings`:** la página de Ajustes usa exactamente el mismo helper local `save(patch, revert)` con pill flotante "Guardado", `toast.error` solo en fallo, sin botón "Guardar" ni dirty flags. Switches y checkboxes guardan al `onChange`; el campo numérico de días guarda al `onBlur`. Diferencia respecto a la ficha de persona: las mutations Convex de Ajustes (`api.settings.setMine`) reciben patches por campo igual que `api.people.update`, así que el patrón se traslada 1:1.

**Tipografía en secciones inline:**
- Los labels de sección (eyebrows) usan `<p>` o `<h2>` según el contexto — en ambos casos añadir `font-sans` explícito para anular el base layer serif. Ver regla en Tipografía.

### Animaciones

`tw-animate-css` ya está disponible (instalado por shadcn). Reglas:

- **Aparición de listas grandes** (>3 elementos generados): stagger fade-in usando `animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both` + `style={{ animationDelay: '${i * 60}ms' }}`. 60ms entre cards, no más, para no demorar la lectura. Ejemplo: cards de `/seres-queridos/[personId]/gifts`.
- **Hover sobre cards**: ya cubierto en sus reglas. `transition-all` o `transition-shadow` solo, duración por defecto (~150ms).
- **Formularios inline expand/collapse**: cuando un formulario aparece in situ tras pulsar un botón "Añadir/Editar X" (`ImportantDateForm`, `EditImportantDateInline`, `GiftHistoryForm`, `EditGiftHistoryInline`, `AddEventForm` de `PersonForm`), añadir `animate-in fade-in slide-in-from-top-1 duration-200` al elemento raíz del formulario. Es excepción legítima a la regla "no animar elementos individuales" porque hay continuidad espacial (el contenedor expande, no aparece de la nada). 200ms corto para no demorar la interacción.
  - **Riesgo:** la animación se replay si el componente se desmonta/remonta. Verificar que ningún ancestro tiene un `key` que cambie con datos de Convex. El toggle interno (`useState` de `showForm`) mantiene el elemento montado mientras esté abierto; sin riesgo en los formularios actuales.
- **Selección de cards con cambio visual** (UpcomingDateCard cuando `isSelected`): `transition-[border-color,box-shadow] duration-150` para que el ring/border aparezca con fade en lugar de saltar. No usar `transition-all` con `hover:-translate-y` en cards con acción interna (regla 164).
- **Hovers en chips/badges clicables** (un `Badge` que no sea `<a>` — p. ej. los tags de interés, que son `<Badge render={<button>}>`; ver Accesibilidad): añadir explícitamente `hover:bg-secondary/80 transition-colors` (o equivalente). Las variantes shadcn de Badge tienen el hover bajo selector `[a]:hover:...`, que solo aplica a `<a>` — un `<span>`/`<button>` con cursor-pointer no recibe hover por defecto.
- **No animar**: aparición de un único elemento espontáneo (es ruido), elementos que reaparecen tras refresh, headers, navegación, transiciones de página. **Excepción**: los pictogramas de la landing animan su entrada en cada carga — es una página de marketing donde la primera impresión es el objetivo, no una herramienta de uso repetido. No extender esto a páginas de la app.
- **`fill-mode-both`** es importante en stagger: sin él, las cards parpadean al inicio porque la animación no tiene estado inicial.
- **`prefers-reduced-motion`**: Tailwind y `tw-animate-css` lo respetan por defecto. No añadir overrides manuales.

### Iconografía

Set único: [`lucide-react`](https://lucide.dev). Stroke 2 (default), tamaño `size-4` (16px) en botones y nav, `size-3.5` en botones `icon-sm`, `size-5` para iconos decorativos en headers.

Iconos en uso:
- `CalendarDays` — sección Agenda (nav).
- `Bell` — campanita de notificaciones.
- `Menu` — hamburguesa, abre el `Sheet` de navegación en móvil.
- `Plus` — crear nueva entidad.
- `Sparkles` — reservado; el botón "Ideas de regalo" usa `Gift` (ver regla más abajo).
- ~~`Pencil`~~ — **no se usa**: el código solo importa `PencilLine`. Verificado el 25-ago-2026 al inventariar los imports para la librería de Figma.
- `PencilLine` — editar inline dentro de una lista (abre formulario en lugar, sin navegar).
- `Trash2` — eliminar (siempre con `text-destructive`).
- `X` — cerrar / quitar elemento de una lista.
- `RefreshCw` — regenerar / refrescar (regenerar ideas de regalo en `GiftsPanel`, refrescar sugerencias de intereses en `InterestTagInput`). El avatar picker ya no lo usa (se construye por rasgos, sin "Regenerar").
- `Repeat2` — evento recurrente (anual).
- `CalendarX2` — evento de fecha única (no recurrente).
- `Check` — indicador de guardado exitoso (pill fijo en perfil de persona).
- `ArrowLeft` — enlace de retroceso ("← Seres queridos", "← [nombre]"). Siempre `size-3.5`.
- `Star` — eyebrow de sección "Intereses" (ficha y formulario).
- `Tags` — eyebrow de sección "Marcas favoritas" (ficha).
- `NotebookPen` — eyebrow de sección "Notas" (ficha).
- `CalendarDays` — eyebrow de sección "Eventos" (ficha y formulario) y nav "Agenda".
- `Ruler` — eyebrow de sección "Datos prácticos" (ficha y formulario).
- `Gift` — eyebrow de sección "Historial de regalos" (ficha), botón "Ideas de regalo" y empty state de la campana. También el botón "Lo regalo yo" de una lista ajena.
- `BookHeart` — todo lo de «Mi lista»: nav, eyebrow de "Lo que te haría ilusión" y de "La lista de {nombre}", icono de la tarjeta de lista recibida y empty state de `/mi-lista`.
- `ShoppingBag` — tipo de regalo "Producto físico".
- `Ticket` — tipo de regalo "Experiencia".
- `Heart` — tipo de regalo "Tiempo juntos".
- `Shuffle` — tipo de regalo "Sorpréndeme".
- `ExternalLink` — chips de tienda en `GiftRecommendationCard` (size-3, detrás del texto).
- `Gift` — icono del botón "Ideas de regalo" (agenda y ficha de persona) y empty state de la campana de notificaciones.
- **Catálogo visual de ideas** — la cabecera de `GiftRecommendationCard` usa 30 iconos lucide adicionales (Smartphone, Headphones, ChefHat, Wine, Plane, Drama, etc.) mapeados en `src/lib/giftImages.ts`. Es el único sitio donde se usan iconos `size-9` con `strokeWidth={1.5}`; ver Componentes · Cards · Cabecera visual.
- **Nota tiendas**: los chips de tienda ya NO usan iconos Lucide. Usan logos PNG/SVG oficiales en `public/stores/`. Ver sección Chips de tienda.

**Reglas:**
- **Botones icon-only** necesitan `aria-label` y `title`. Usar variant `ghost` y size `icon` o `icon-sm`.
- **Botones con icono + texto**: el icono va antes del texto, separado por el gap nativo del botón. No añadir `mr-2`.
- **No mezclar sets**: no usar Heroicons / Phosphor / SVG inline como icono funcional. Si lucide no tiene un icono concreto, abrir issue en pendientes antes de meter algo ad-hoc. **Excepción**: las ilustraciones de marca (logo-mark, pictogramas de la landing en `src/components/landing/StepIllustrations.tsx`) sí son SVG propio — son ilustración, no iconografía. Ver Componentes · Landing page.
- **NADA de emojis en ningún sitio de la UI** (botones, chips, tarjetas, headers, navegación y también empty states). Siempre el icono de lucide más cercano. Equivalencias usadas en empty states: libreta → `Notebook`, café/calma → `Coffee`, ideas/destellos → `Sparkles`.
- **Iconos decorativos**: `aria-hidden`. Solo los que aportan información llevan label.

#### Figma — librería de iconos (25-ago-2026)

Página **`Foundations - Iconography`** → sección `Iconography` → frame `Lucide icons`: **66 componentes sueltos**, uno por glifo, nombrados `icon/<nombre-kebab>`, en rejilla de 11×6. Hasta esta fecha el archivo no tenía **ni un solo componente de icono**.

- **Generados desde `node_modules`, no desde el plugin de comunidad de Lucide.** Los path data salen de `lucide-react/dist/esm/icons/*.mjs` de la versión instalada, así que el archivo de Figma no puede divergir de lo que renderiza la app. Es la regla de siempre —si Figma contradice el código, gana el código— aplicada al origen del asset, no solo a su valor. Regenerar tras un bump de `lucide-react` es rehacer el mismo paso.
- **`package.json` pide `^1.33.0` y `node_modules` tiene 1.31.0.** Los componentes se generaron desde el instalado; la descripción de cada uno lo deja escrito. Si el lockfile sube, hay que regenerar.
- **66 glifos frente a 68 imports**: `X`/`XIcon` y `Check`/`CheckIcon` son alias del mismo módulo. 33 de los 66 son el catálogo cerrado de categorías de regalo de `src/lib/giftImages.ts`.
- **El nombre kebab es el canónico de lucide y no siempre coincide con el export que usa el código**: `Loader2Icon` → `icon/loader-circle`, `TriangleAlertIcon` → `icon/triangle-alert`, `InfoIcon` → `icon/info`. La descripción de cada componente guarda el export real y el JSX (`<Gift />`), que es lo que hace que el buscador de instance swap encuentre las dos formas.
- **Un componente por glifo, no un component set con 66 variantes.** Es como lo montan Material, Radix y la propia librería oficial de Lucide: el `/` del nombre ya agrupa en carpeta en el instance swap, y un desplegable de 66 valores sería impracticable.
- **Estructura de cada componente**: frame 24×24 (el viewBox nativo de lucide) con `clipsContent` desactivado —el trazo centrado se sale hasta 1px—, trazo 2, cap y join `round`, e hijos con constraints `SCALE` para que el glifo escale al redimensionar la instancia a 16 · 20 · 24 (`sizing/icon/*`).
- **El trazo va vinculado a `color/icon`**, no pintado. Los dos glifos que llevan relleno (`palette` y `tags`) lo tienen vinculado también en el fill: lucide los declara `fill="currentColor"`, que Figma no entiende y habría dejado en negro fijo.
- **El alcance es lo que el producto usa, no la librería entera** (2.025 iconos disponibles). Si un diseño necesita uno nuevo se añade en el momento y se anota aquí — mismo criterio que con los tokens sin consumidor.

#### Migración de los glifos dibujados a mano (25-ago-2026)

Los iconos vivían como vectores sueltos dentro de cada componente, redibujados a mano. Se sustituyeron **30 nodos reales** por instancias de la librería. El recuento bruto de nodos «con pinta de icono» da ~86, pero la mayoría son espejos de instancia y los paths del logo, que no es lucide:

| Componente | Nodos | Icono | Qué estaba mal |
|---|---|---|---|
| `Sidebar Link` | 4 | `calendar-days` | Un frame de 4 rectángulos llamado literalmente `Icon (CalendarDays, simplified)`, sin los 6 puntos del glifo real y con los rellenos sin vincular a ninguna variable |
| `Button Icon` | 12 | `x` | Vector 10×10; en código `size="icon"` y `size="icon-sm"` heredan ambos `size-4` = **16px** |
| `Toast` | 4 | `circle-check` · `info` · `triangle-alert` · `octagon-x` | Frames de elipses y rectángulos montados a mano |
| `Select` | 5 | `chevron-down` ×4 · `check` | Vectores con bbox ajustado (16×9,6 y 10×7) en vez de la caja de 16 |
| `Back Link` | 2 | `arrow-left` | Vector 14×12; en código es `size-3.5` = 14×14 |
| `Theme Toggle` | 2 | `moon` · `sun` | Dos **rectángulos grises** de 16×16 haciendo de marcador |
| `Tag Input` | 1 | `plus` | Vector suelto, ya a 16×16 |

Dos divergencias que la migración cierra de paso, y que conviene no reintroducir:

- **El trazo era 1,5 (y 1,6 en el checkbox), no 2.** Todos los vectores a mano se dibujaron finos. En el producto solo hay **un** sitio con `strokeWidth={1.5}`: la cabecera de `GiftRecommendationCard` a `size-9`. Todo lo demás usa el default de lucide, que es 2. Los componentes ahora se ven más pesados que antes en Figma, y esa es la forma correcta.
- **Los glifos aliasaban a `color/text/*`.** Se repuntaron a su pareja `color/icon/*` — que existe justamente para esto, porque `color/text/*` solo tiene scope `TEXT_FILL` y no aparece en el picker de Fill de un vector. El color por estado se conserva: en `Sidebar Link`, Default → `color/icon/secondary`, Desktop Active → `color/icon`, Mobile Active → `color/icon/brand`, que es lo que hacen `text-muted-foreground`, `text-foreground` y `text-primary` en `SidebarLink.tsx` y `MobileNav.tsx`.

**Lo que se dejó fuera a propósito:**

- **`Checkbox`** (2 vectores `Check`). No es un icono lucide: en el producto el checkbox es un `<input type="checkbox">` nativo con `accent-primary` (`/settings`), así que la marca la dibuja el navegador. Meter un `icon/check` afirmaría algo falso. No existe `src/components/ui/checkbox.tsx`.
- **`Button` (108) y `Badge` (12), rectángulos `Icon Left` / `Icon Right`.** Son *slots* genéricos —«aquí va un icono»—, no un glifo concreto divergente. Convertirlos en instancias daría instance swap gratis, pero obliga a elegir un glifo por defecto que el componente hoy no afirma. Decisión pendiente, no un descuido.
- **`Gift Recommendation Card` y `Empty State`**, elipse `Icon` de 36×36. Es el hueco de la cabecera visual (`size-9`, `strokeWidth={1.5}`, tinte por categoría) y del empty state; migrarlos es elegir glifo y tinte por variante, no un reemplazo mecánico.
- **`Theme Toggle`**: quedan 3 nodos huérfanos en la raíz de la página (dos `BOOLEAN_OPERATION` y un grupo con `rays`) — los Sun/Moon viejos, ya fuera de todo componente **antes** de esta migración. Son basura, pero borrarlos es destructivo y no se hizo sin pedirlo.

**Dos cosas que aparecieron al mirar y que no son de iconografía:**

- **`Sidebar Link`, variante `Platform=Mobile, State=Active`** se pinta como pastilla verde sólida con el contenido invisible. El código dice `bg-primary/10 text-primary` (tinte al 10 % + texto verde). El icono ya está bien; el fondo no.
- **`cn-toast`**, la única clase que `sonner.tsx` pasa en `toastOptions.classNames`, **no está definida en ningún sitio** del proyecto. Los cuatro iconos de Toast en Figma comparten `color/icon`, que es lo que había; el color por tipo no se pudo verificar contra CSS que no existe.


---

## Empty states

Componente compartido: `src/components/layout/EmptyState.tsx`. Usado en [`src/app/(app)/seres-queridos/page.tsx`](../src/app/(app)/seres-queridos/page.tsx), [`src/app/(app)/agenda/page.tsx`](../src/app/(app)/agenda/page.tsx), [`src/app/(app)/mi-lista/page.tsx`](../src/app/(app)/mi-lista/page.tsx) y [`src/components/gifts/GiftsPanel.tsx`](../src/components/gifts/GiftsPanel.tsx).

```tsx
<EmptyState
  icon={Notebook}
  title="Una libreta en blanco"
  description="Texto invitador, 1-2 frases, voz humana, sugiere acción concreta."
  cta={
    <Link href="/..." className={buttonVariants({ size: "lg" })}>
      Verbo concreto + objeto
    </Link>
  }
/>
```

**Props:**
- `icon?: LucideIcon` — opcional; sin icono para variantes reducidas de "sin resultados" (ver `seres-queridos` más abajo).
- `title?: string` — opcional por la misma razón.
- `description?: ReactNode`.
- `descriptionClassName?: string` — para casos que necesitan un ancho distinto (p. ej. `max-w-md` en vez del `max-w-sm` por defecto).
- `cta?: ReactNode` — se pasa el `Link`/`Button` ya construido, no una API propia, porque los CTAs varían entre navegación (`Link`) y acción (`Button onClick`).
- `compact?: boolean` (default `false`) — `p-10` en vez de `p-14`, para variantes secundarias con menos contenido.

**Reglas:**
- Icono decorativo lucide (`Notebook`, `Coffee`, `Sparkles`) con `size-9 text-muted-foreground`, centrado con `flex justify-center` y `aria-hidden`. **NADA de emojis** (ni aquí ni en navegación, headers, badges o step cards).
- Título h2 en serif (heredado del base layer), **frase con voz**, no etiqueta funcional. "Una libreta en blanco" sí; "Sin datos" no.
- Container: `rounded-2xl border-dashed`. Punteado refuerza "este sitio está esperando algo".
- **El CTA debe ir al destino más directo**: el empty state de la agenda sin personas lleva a `/seres-queridos/new` ("Añadir ser querido"), no a `/seres-queridos`. El usuario ya sabe que necesita crear una persona — no hay que darle un paso intermedio.
- **Empty states contextuales**: cuando hay más de una razón posible para que algo esté vacío, distinguir cuál aplica y adaptar mensaje + CTA. No mostrar siempre el mismo empty state genérico.

**Seres queridos — dos variantes** (`src/app/(app)/seres-queridos/page.tsx`):

| Situación | Icono | Título | CTA |
|---|---|---|---|
| Sin personas (`people.length === 0`) | `Notebook` | "Una libreta en blanco" | "Añadir la primera persona" → `/seres-queridos/new` |
| Hay personas pero el filtro de relación no devuelve ninguna | — | — (solo `description`, `compact`) | Sin CTA — "Nadie en esta categoría todavía." |

**Agenda — dos empty states** (`src/app/(app)/agenda/page.tsx`):

| Situación | Icono | Título | CTA |
|---|---|---|---|
| Sin personas (`people.length === 0`) | `Coffee` | "Empieza aquí" | "Añadir ser querido" → `/seres-queridos/new` |
| Hay personas pero sin eventos próximos | `Coffee` | "Todo tranquilo" | "Ver seres queridos" → `/seres-queridos` |

La página hace dos queries en paralelo: `api.importantDates.getUpcoming` y `api.people.getAll`. Si `filtered.length === 0`, se comprueba `people.length` para decidir qué empty state mostrar. Si `people` todavía carga, se muestra el skeleton (no el empty state) para evitar un flash.

**Mi lista** (`src/app/(app)/mi-lista/page.tsx`): sin elementos, `EmptyState` con `BookHeart`, título «Nada apuntado todavía», descripción «Apunta lo que te haría ilusión recibir, con su enlace si lo tienes. Quien tenga acceso a tu lista lo verá en su libreta, junto a tus fechas.» y CTA filled «Apuntar lo primero» (`Button` + `hover:bg-primary/80`), que abre el formulario en el sitio en vez de navegar. Una lista ajena sin elementos no usa `EmptyState`: dentro de su card basta «Todavía no ha apuntado nada.».

**GiftsPanel sin eventos** (`src/components/gifts/GiftsPanel.tsx`):

Cuando `events.length === 0` (la persona existe pero no tiene ningún evento guardado), el placeholder central muestra:
- Título: "Sin eventos todavía"
- Mensaje: "Para generar ideas necesitas al menos un evento."
- CTA botón `outline`: "Añadir evento a [nombre]" → `/seres-queridos/[personId]`

Cuando hay eventos pero no se ha generado aún, muestra el placeholder informativo habitual ("A medida para [nombre]") sin CTA (usa `descriptionClassName="max-w-md"`, más ancho que el resto de empty states porque el texto explicativo es más largo).

Cuando el usuario **descarta todas las ideas** de una tanda, se muestra otro empty state contextual ("Has descartado todas las ideas") con CTA filled "Generar de nuevo" (`Button` default + `hover:bg-primary/80` explícito, icono `RefreshCw`) — nunca un grid en blanco.

**Cuota visible**: tras cada generación, bajo los controles aparece `Te quedan N generaciones hoy` (`text-xs text-muted-foreground`), con el `remaining` que devuelve la API de recomendaciones.

---

## Voz y copy

El producto va de relaciones, no de productividad. El copy debería sonar como una persona que te conoce, no como un onboarding de growth hacking.

**Sí**:
- "Las personas que te importan"
- "Los tuyos"
- "Tener un detalle con alguien"
- "No olvides el cumpleaños de…"
- "Calma por delante"
- "Ideas hechas a medida"

**No**:
- "¡Vamos a empezar! 🎉"
- "Boost your gift game"
- "Tu lista de contactos" (frío, suena a CRM)
- "Notificaciones inteligentes con IA" (jerga)
- Exclamaciones gratuitas, emojis 🚀 ⚡, mayúsculas para enfatizar.

Persona gramatical: **tú** (singular, cercano). Nunca "nosotros" corporativo.

El "tú" incluye las pantallas de Clerk: su localización `esES` habla de usted ("Ingrese su dirección", "Regístrese"), así que `src/app/layout.tsx` la extiende con las dos claves que se ven en el acceso. Si aparece otra cadena de usted en Clerk, se añade ahí, no se acepta. La casilla legal del registro también se sobrescribe en ese archivo, aunque por otro motivo: «Acepto los Términos… y he leído la Política de Privacidad», porque la política se lee, no se acepta (`docs/legal.md` §3).

Tampoco adjetivos de folleto ni remates: la landing decía "Genera ideas perfectas" y "Sin sorpresas." en un producto que promete nueve ideas con razón y vende sorpresas; hoy dice "Genera nueve ideas" y termina donde termina el dato. Los dos guiones largos que había en el copy pasaron a coma y dos puntos (pasada de escritura natural, 18-sep-2026; el espejo en Figma, en Screens & prototype, cambió a la vez).

---

## Email transaccional

El email de recordatorio de eventos traduce los tokens del design system a hex para compatibilidad con clientes de correo. La paleta, la estructura y las reglas del botón CTA están documentadas en [`docs/email-notifications.md`](email-notifications.md#plantilla-de-email). Si los tokens de color cambian, actualizar también las constantes hex de `convex/emails.ts`.

Desde el 10-oct-2026 hay un segundo correo, el aviso de lista compartida, que reutiliza la misma carcasa (`emailShell`: página, cabecera con logo y pie) con el subtítulo «Lista compartida» y el CTA sin el icono de regalo, porque no lleva a ideas de regalo sino a la tarjeta de la app. Detalle en `docs/email-notifications.md` § «Aviso de lista compartida».

---

## Accesibilidad

Convenciones obligatorias. Las primitivas de `components/ui` (base-ui) ya traen roles y `focus-visible`; estas reglas cubren cómo usarlas y los patrones propios.

- **Skip link**: el shell autenticado (`src/app/(app)/layout.tsx`) abre con un `<a href="#contenido">Saltar al contenido</a>` oculto (`sr-only focus:not-sr-only`). El contenedor del contenido lleva `id="contenido" tabIndex={-1}`. Si se añade otro shell con navegación previa al contenido, replicar el patrón.
- **Navegación activa**: el enlace activo lleva `aria-current="page"` además del estilo (sidebar y `MobileNav`). El color/peso por sí solo no comunica el estado a un lector. Cada `<nav>` lleva `aria-label` ("Principal").
- **Selects sin `<Label htmlFor>`**: cuando el `<Label>` no está asociado al control (selects custom, o triggers con `<span>` manual), el `SelectTrigger` **debe** llevar `aria-label`. Si se puede asociar, mejor el patrón `htmlFor`+`id` (ejemplo: filtro de relación en `seres-queridos/page.tsx`).
- **Errores de formulario**: el input con error lleva `aria-invalid` y `aria-describedby="<campo>-error"`, y el `<p>` del mensaje lleva ese mismo `id`. Sin esto el lector no anuncia el error al enfocar el campo. Patrón aplicado en `PersonForm`, `ImportantDateForm` y `GiftHistoryForm` — incluidos los `SelectTrigger` (mes, reacción) y los inputs de `BudgetRangeSlider` (que usa `useId()` porque se monta varias veces en la misma página). **Todo campo validado debe renderizar su mensaje de error** — un submit que falla sin feedback visible es un bug (pasó con reacción/año en el historial de regalos).
- **Chips/tags clicables**: si un chip ejecuta una acción (p. ej. eliminar un interés), debe ser un `<button>` real, no un `<span onClick>`. Usar `<Badge render={<button type="button" .../>} aria-label="Eliminar …">`. Los `<span onClick>` no son enfocables ni operables por teclado.
- **Toggles**: botones que actúan como interruptor o selección única llevan `aria-pressed` (tipo de regalo en `GiftsPanel`, guardar idea en `GiftRecommendationCard`, opciones del `AvatarPicker`). Un grupo de selección única se envuelve en `role="group"` con `aria-labelledby`.
- **Enlaces externos** (`target="_blank"`): `aria-label` descriptivo que incluya "(abre en una pestaña nueva)" — los chips de tienda solo "se llaman" como el nombre de la tienda y se repiten entre cards.
- **Resultados asíncronos**: anunciar con una región `aria-live="polite"` (`role="status"`). La generación de ideas anuncia "Generando…" / "N ideas generadas". **El contenido debe insertarse/quitarse del DOM dentro de la región**: un cambio solo de opacidad no se anuncia. El pill "Guardado" de autosave (ficha de persona y `/settings`) renderiza su texto condicionalmente dentro del `div` `aria-live` por este motivo.
- **Iconos decorativos** `aria-hidden`; **botones icon-only** con `aria-label` único y descriptivo (no repetir el mismo label N veces).
- **Skeletons de carga**: el contenedor lleva `role="status"` + un `<span className="sr-only">Cargando…</span>`; los bloques `animate-pulse` van `aria-hidden`. `LoadingFallback` ya sigue este patrón.
- **`DatePickerDialog` (rueda móvil)**: cada columna (`ScrollColumn`) es un `role="spinbutton"` enfocable (`tabIndex={0}`) con `aria-label` (Día/Mes/Año), `aria-valuemin/max/now` y `aria-valuetext` (mes en texto completo). Teclado: ↑/→ incrementa, ↓/← decrementa, Re/Av Pág ±5, Inicio/Fin a los extremos; el ítem central se resalta (`font-medium text-foreground`). Las tres columnas van en un `role="group" aria-label="Fecha"`. Mantiene el arrastre con puntero para móvil.

### Contraste (WCAG AA)

Medido con conversión OKLCH→sRGB (objetivo 4.5:1 texto normal, 3:1 texto grande/UI):

- **`text-muted-foreground`** sobre `background`/`card`: ~5.6–7.0:1 en claro y oscuro → **pasa**. No oscurecer el token (la sensación de medido a ojo engaña: la `L` de OKLCH no es la luminancia relativa de sRGB).
- **`text-amber-500`** sobre superficies claras: ~2.0:1 → **fallaba** (era el contador "≤7 días" de la campana). Corregido a **`text-amber-700 dark:text-amber-500`** (claro 4.91:1, oscuro 8.1:1). Para texto de aviso ámbar sobre fondo claro, usar `amber-700` (no `amber-500/600`).
- **`text-destructive`** ("Hoy") sobre `card` claro: ~5.2:1 → pasa.
- **`--secondary-foreground` sobre `--secondary`** (botones/badges `secondary`, terracota): en claro el texto era casi blanco (`oklch(0.985 0.005 80)`) sobre terracota → **3.66:1**, no pasaba AA de texto normal (4.5:1), solo el umbral de texto grande/UI (3:1). **Corregido**: `--secondary-foreground` en claro pasa a texto oscuro `oklch(0.18 0.012 50)` → **4.92:1** (pasa AA). Se conserva el terracota de marca (`--secondary` sin tocar) y queda coherente con dark, que ya usaba texto oscuro sobre terracota (6.78:1). Nota WCAG: `font-medium` (500) no cuenta como "bold", así que estos botones no se acogen al umbral de texto grande (3:1); por eso hay que cumplir los 4.5:1. Detectado auditando las variables de Figma (ver "Tokens · Figma — arquitectura de variables").
- **Terracota como texto** (etiquetas de marca favorita, `BrandStoreLink`, glifo de categoría): `--secondary` (`#C56A3E`) daba 3.55–3.70:1 en claro, bajo el 4.5:1 de texto normal → **resuelto el 28-ago-2026 con `--brand-secondary`** (`Terracotta/1000` `#A44C1D`, 5.38–5.61:1), el mismo patrón relleno/primer-plano que `--brand`. En oscuro las dos props coinciden y ya cumplían. Ver «La terracota se parte como el verde».
- **Verde de marca como texto sobre fondo oscuro** → **resuelto el 26-ago-2026 con `--brand`**. El problema: `--primary` en dark (`#315837`) daba **2.30:1** sobre `--background` y **2.18:1** sobre `bg-primary/10` — no pasaba ni el umbral de texto grande. La causa es que `--primary` es el *relleno* del botón primario (con `--primary-foreground` encima) y en claro resulta ser además un verde casi negro que funciona bien como texto; en oscuro se aclara lo justo para seguir sirviendo de fondo y dejar de servir de texto. Un mismo token con dos requisitos de contraste opuestos.

  **La solución es un token aparte solo para primer plano** (texto e iconos): `--brand` vale lo mismo que `--primary` en claro (`oklch(0.25 0.055 148)`, **14.55:1**, sin ningún cambio visual) y en oscuro sube a `oklch(0.71 0.047 148)` = `#8eaa91` → **7.46:1**. Medido, no calculado: en el navegador resolviendo el color en un canvas y en Figma leyendo el nodo real, y ambos dan lo mismo. Ese valor **es exactamente `Green/400`**, un paso que ya existía en la rampa, así que no hizo falta inventar ningún primitivo. El `oklch` de tres decimales hace ida y vuelta exacta al hex, de modo que Figma y CSS no difieren ni un bit.

  **Por qué `Green/400` y no un verde más vivo**: el primer intento fue `oklch(0.72 0.11 148)`, que contrasta algo más (7.97) pero lleva el doble de croma que cualquier paso de la rampa `Green`, cuyo máximo es 0.071. El verde de PickPal es el apagado **por diseño**, también en claro: ahí convive con terracota (C 0.13) y ámbar (C 0.1455) siendo él 0.055. Subirle el croma solo en oscuro le habría cambiado el carácter y roto esa relación. Con `Green/400` sigue siendo el sobrio de los tres y aun así cae en la misma banda de contraste que ellos (terracota 6.76, ámbar 9.85). **Regla que se deriva: al buscar una variante clara de un color de marca para oscuro, coger un paso de su rampa antes que inventar un valor — la rampa ya codifica el croma que le corresponde a esa familia.**

  **Por qué un verde y no crema**: el token `color/text/brand` de Figma resolvía a crema en oscuro, que contrasta de sobra pero queda a un pelo de `--foreground` — un enlace indistinguible del texto normal. Y sobre todo, uno de los cinco usos es el glifo de la **categoría verde** de `giftImages.ts`, que convive con categorías terracota y ámbar: en crema esa categoría perdería su color mientras las otras dos lo mantienen.

  **Los cinco usos migrados** de `text-primary` a `text-brand`: variante `link` de `button.tsx` y de `badge.tsx`, el `Sparkles` de `GenerationProgress`, el glifo de categoría verde de `giftImages.ts` y el item activo de `MobileNav`. Tras el cambio **`text-primary` no aparece en ningún archivo**: si vuelve, es un bug. `bg-primary` sigue siendo lo correcto para rellenos. Nota: hoy ningún componente instancia `variant="link"`, así que esas dos variantes están vivas solo en el sistema de diseño.

  **En Figma** se creó el token de hub `brand/primary-text` (`Green/950` en claro, `Green/400` en oscuro) que pide la regla de la capa de marca, y **`color/text/brand` y `color/icon/brand` aliasan ahora a él en los dos modos**, ambos con `codeSyntax` `var(--brand)`. Los dos caían antes a `color/Cream/200` en oscuro, que contrasta de sobra pero queda a un pelo de `--foreground`.

  El fallo de binding estaba en el componente: **los 9 nodos de texto de las variantes `Type=Link` del Button (3 tamaños × 3 estados) usaban `color/fill/brand` como relleno de texto**, es decir el token de fondo. Repuntados a `color/text/brand`. Un barrido del archivo confirmó que no había ningún otro `TEXT` ni `VECTOR` bindeado al token de relleno, así que el Link era el único caso.

  **Al cambiar el valor de un token, acordarse de las leyendas del swatch**: las tarjetas de `Foundations - Color` llevan el nombre del primitivo como texto estático y no siguen a la variable. Hubo que reescribir las de `card/text/brand` y `card/icon/brand` a `brand/primary-text`, y añadir la tarjeta del token de hub nuevo para que la página siga siendo 1:1 tarjeta↔token (verificado: 0 tokens sin tarjeta).

---

## Anti-patrones

Cosas que se han probado o considerado y NO funcionan. Si vuelven a tentar, leer aquí primero.

- **Gradients en superficies grandes**: rompen la sensación de papel del fondo crema. Los CTAs y headers son planos.
- **Emojis en navegación, botones o tarjetas**: rompen el registro adulto. Los emojis son solo para empty states. Sustituir siempre por el icono de lucide más cercano.
- **Sombras fuertes** (`shadow-lg`+): material design vibe, choque inmediato con la calidez. Máximo `shadow-md` y solo en hover si se justifica.
- **Borde de color en cards** (ej. `border-primary` decorativo): se sentía corporativo. Mantener bordes en `border-border` o variantes con alpha.
- **`font-bold` en headings de serif sin razón**: peso 700 en Fraunces a tamaños medianos parece "newspaper" anticuado. Preferir 500–600 salvo en hero gigante.
- **Dirty tracking + botón "Guardar" en edición inline de perfil**: introduce fricción innecesaria (el usuario tiene que recordar guardar) y complejidad de estado (dirty flags, beforeunload, nav guard). Si la mutation es barata y los campos no son críticos, usar autosave en blur/change. El "✓ Guardado" fijo da el feedback suficiente.
- **`<select>` nativo en formularios**: aspecto inconsistente entre navegadores, no respeta los tokens de color/radio del sistema de diseño. Siempre usar el componente shadcn `Select`.

---

## Pendientes

Lista de cosas que sé que faltan o que no han recibido pasada todavía. Se irán tachando o convirtiéndose en reglas a medida que se resuelvan.

- [ ] **Una cita real de un tester en «04 · What the beta changed»**: la página cuenta la beta sin una sola frase literal de los diez, y el bloque de persona que la sustituye es lo más genérico del archivo. No queda rastro del feedback ni del botón «Cuéntame» en el repositorio; hay que recuperarla de las notas o llamadas de mayo de 2026. Si no aparece, la tarjeta de persona se queda como está. (Pasada de escritura natural, 18-sep-2026. Ese mismo día se decidió dejar «El regalo perfecto para quien más te importa.» en el hero: es promesa de marca en un titular, y el único «perfecto» que sobrevive en el producto.)

- [x] ~~Hover de cards interactivas~~ → resuelto, ver Componentes · Cards.
- [x] ~~Iconografía~~ → resuelto: lucide-react adoptado, ver Componentes · Iconografía.
- [x] ~~Página `/seres-queridos/[personId]` (detalle)~~ → edición inline por secciones (header / intereses+notas / datos prácticos). Sin página `/seres-queridos/[personId]/edit` (redirige al perfil). Guard de cambios sin guardar con `beforeunload` + dialog. Ver "Edición inline (perfil de persona)".
- [x] ~~Página `/seres-queridos/[personId]/gifts`~~ → resuelto: panel de configuración con Select de evento (solo eventos del perfil, presupuesto automático), tarjetas de tipo con iconos lucide y descripción, botón "Generar" top-right del panel, skeletons visibles (`bg-muted/40 animate-pulse`), tarjetas con stagger animation, botón X con toast permanente + deshacer, back link con `ArrowLeft`.
- [ ] **Escalera de texto en oscuro desequilibrada**: 2.60 de hueco entre normal y secundario frente a 6.11 entre secundario y terciario, y la rampa `Cream` no tiene paso entre `400` y `500` para arreglarlo. O se rehace el espaciado de `Cream` en su tramo bajo, o el primer plano en oscuro pasa a salir de `Neutral` (bien espaciada, pero más griseada y choca con la regla de calidez). Ver «Reparto de los 151 usos».
- [ ] **Cuatro elementos se apagan al pasar el ratón**: `badge.tsx` (variantes `outline` y `ghost`) y los dos enlaces legales de `/settings` usan `hover:text-muted-foreground` sobre `text-foreground`, así que **pierden** contraste al señalarlos. Los otros 11 usos interactivos van al contrario. Decidir si en el badge es deliberado.
- [ ] **Completar los 7 grupos de rol de `color/`**: falta crear `feedback` (los 7 de retroalimentación que siguen en `fill/`) y `bg/disabled` (el par duplicado `fill/field-disabled` + `field/fill-disabled`). Y `text`, `icon`, `border` y `field` crecen en el objetivo sin contenido asignado. Ver «`color/` se reduce a grupos de rol».
- [ ] **`bg/category/*` guarda hues sólidos, no tintes**: el nombre dice `bg` pero el código los aplica al 10–15 % de alfa. Al definir los 8 miembros, decidir si el token guarda el hue o el tinte. Arrastra una colisión en código: la categoría ámbar necesita contenedor e icono, y `--category-amber` ya está ocupado por el icono mientras el contenedor sigue siendo `--chart-3`.
- [ ] **Mover la barra lateral de `lg` a `xl`**: hoy aparece a 1024 pero el panel de regalos pide 1280, así que la franja 1024–1279 tiene barra lateral sin el layout maestro-detalle para el que existe, y el contenido se queda en 784 px. Propuesta dibujada en los cuatro marcos de tableta del Figma. Son tres intercambios de clase: `app/(app)/layout.tsx:29` `hidden lg:flex` → `hidden xl:flex`, `layout.tsx:61` `lg:hidden` → `xl:hidden`, y `components/gifts/GiftsPanel.tsx:633` `lg:hidden` → `xl:hidden`. Comprobar después el `p-4 sm:p-6 lg:p-8` de las páginas, que a 1024 seguiría en 32 y está bien, y que la hoja de navegación se lee a 1024 de ancho (hoy sólo está probada a 390).
- [ ] **La fila activa del menú móvil desaparece en oscuro**: `color/fill/brand-subtle` (#0c2912) sobre `color/bg/surface-raised` (#211914) da **1,11:1**, así que el estado activo se sostiene casi solo en el color del texto (6,19:1, que sí cumple AA). `aria-current` da la pista programática, pero el indicador visual no tiene contraste propio. O el `brand-subtle` de oscuro sube un paso, o la fila activa gana un borde. Salió al montar el gemelo en oscuro de la hoja de navegación.
- [ ] **WCAG 2.5.3 en el CTA de la tarjeta de fecha**: en móvil el botón se lee «Regalar» y su `aria-label` dice «Ideas de regalo», así que el texto visible no está contenido en el nombre accesible. Arreglo en código: que el nombre accesible empiece por la palabra visible, o quitar el `aria-label` cuando el span visible está presente. Es el único sitio del producto donde la etiqueta cambia por breakpoint.
- [ ] **Footer global**: minimal por ahora. Decidir si crece o se queda así.
- [ ] **Skeletons consistentes**: todos en `rounded-2xl` y `border-dashed`, pero verificar dimensiones uniformes.
- [ ] **Mobile < 380px**: sin probar. Hero de landing podría descuadrar.
- [x] ~~Tono de los toasts de error~~ → fallbacks genéricos actualizados: "No se pudo guardar / añadir / eliminar…" en lugar de "Error". Los mensajes del servidor se siguen mostrando cuando están disponibles.
- [ ] **Estado de loading global / transiciones de página**: actualmente cada página gestiona el suyo. ¿Vale la pena una skeleton global o no?
- [x] ~~ThemeToggle en sidebar~~ → retirado. El toggle vive solo en `/settings`. El tema por defecto es **`light`** (`src/app/layout.tsx:52`, `defaultTheme="light"`): el oscuro es opt-in. Esta línea decía `dark` y era falso; corregido el 26-ago-2026 al verificarlo contra el código.
- [x] ~~Navegación móvil~~ → hamburguesa + Sheet lateral (`MobileNav`).
- [x] ~~Grids fijos en desktop~~ → todos los grids son ahora responsive con columnas dinámicas.
- [x] ~~Panel lateral de regalos en Agenda~~ → layout master-detail en desktop con CSS Grid `[480px_1fr]`. Ver "Dashboard" y "GiftsPanel".
- [x] ~~Footer global~~ → decisión tomada: la landing tiene un footer mínimo de una línea. Las páginas de la app (autenticadas) no tienen footer — no es un sitio web, es una herramienta.
- [x] ~~Estado de loading global~~ → decisión tomada: cada página gestiona su propio estado. Las páginas de lista usan skeletons inline con `animate-pulse rounded-2xl border-dashed`. Las páginas de detalle/edición usan `LoadingFallback` (tres puntos con stagger de 150ms). No se introduce un skeleton global porque no hay estructura de página compartida que lo justifique.
- [x] ~~Mobile < 380px (landing)~~ → h1 reducido a `text-4xl` base con escalado `sm:text-6xl md:text-7xl lg:text-8xl`. Feature cards con `grid-cols-1` base. `ThemeToggle` eliminado de la landing. **Ojo: esto no la deja en oscuro fijo** — `src/app/page.tsx` no tiene ni una clase `dark:` ni fuerza tema, así que hereda el del `ThemeProvider`, que arranca en claro. Quitar el toggle sólo la dejó sin mando, no sin tema. Corregido el 11-sep-2026 al montar los marcos de pantalla.
- [x] ~~MobileNav sin user info~~ → `SidebarUserInfo` añadido al pie del Sheet (mismo patrón que sidebar desktop).
- [x] ~~Adoptar `color/fill/field-disabled` en código~~ → hecho el 28-ago-2026: nace `--field-disabled` (`Cream/200` claro, `Neutral/800` oscuro), `Input` y `Textarea` dejan el alfa y el token tiene `codeSyntax`. Lo aceleró la sincronización a11y: con `--input` en `Neutral/500`, el `disabled:bg-input/50` heredado pintaba los campos deshabilitados de marrón medio. Ver «El apagado de los campos deja el alfa».
- [ ] **`color/switch/thumb-bg-checked` / `-unchecked`**: siguen diciendo `bg` siendo relleno de una pieza. Decidir el rename junto al resto de la capa de componente. Sus alias ya se arreglaron el 27-ago (ver «El thumb del Switch»); lo que queda es solo el nombre. Y como los dos resuelven ya al mismo valor en todos los modos, decidir a la vez si se fusionan en uno.
- [ ] **Revisar `color/field/*`**: se creó como indirección preventiva y sus 5 miembros resuelven igual que el semántico al que aliasan — los 5 desde el 27-ago-2026, cuando `field/border` dejó de aliasar un primitivo y pasó a `color/border/strong`. Si ninguno llega a divergir de su semántico, decidir si la capa se queda o se retira — y mientras esté, no ampliarla a `button/*` o `badge/*` por simetría. **Ojo con el nombre parecido**: `field/border` (accesible, 3:1) y `border/component` (decorativo) **no** son intercambiables, ver «Pasada de uso».
- [ ] **Disabled: opacidad global o familia completa**: hoy el apagado es `opacity-50` sobre el elemento entero, que también atenúa el texto y deja el placeholder por debajo de AA. Si algún día se cambia, hacen falta las cuatro familias (`fill`, `text`, `border`, `icon` en `-disabled`) y desaparece `opacity/disabled` de los componentes. **No mezclar los dos mecanismos**: un color ya apagado más la opacidad del nodo se atenúa dos veces.
- [ ] **Los estados `Focus` del Figma dibujan un borde, no un anillo**: las 5 variantes `State=Focus` del archivo (Input, Textarea, Select ×2 y la de Select Item, sin trazo) usan el borde de 1 px en color de foco, así que `border-width/focus` (3 px) no tiene ni un nodo que lo aplique. O se dibuja el anillo en esas variantes, o el token se queda como documentación del código. Ver «Pasada de uso».
- [x] ~~Montar el grupo label–input–error en una página del Figma~~ → hecho el 28-ago-2026: página `Field Group` (30ª de componente) con set State=Default/Error y un especimen `Formulario` de dos grupos. Da consumidor a `space/field/gap` **y también** a `space/field-group/gap`, que estaba igual de huérfano. Ver «El grupo de campo se monta».
- [ ] **28 textos de especímenes sin hueco en la escala**: `Geist Medium 12` con tracking 0 (9), `Geist Medium 11` con 12 % sin mayúsculas (6), `Geist Medium 18` (6), `Geist Light 24` (2), `Geist Medium 13` (2), `Geist Regular 24` (1), más las 3 iniciales del Avatar (Regular, y por rol pedirían un `Label`) y 3 etiquetas de Button subrayadas, que perderían el subrayado al tomar `Label 2`. Decidir si nacen 3–4 estilos o se normalizan los nodos.
- [x] ~~Huecos de icono: rectángulo o instancia~~ → instancias, hecho el 18-sep-2026: los 119 rectángulos `Icon Left`/`Icon Right` de los componentes Button (108) y Badge (11) son ahora instancias de `icon/plus` ocultas, con el mismo nombre, la misma propiedad booleana de visibilidad y el mismo tamaño vinculado; el resto de páginas los heredan por instancia. Los seis huecos visibles llevan su glifo real: `gift` en el CTA de Upcoming Date Card, `dices` en «Aleatorio» del Avatar Picker, `x` en los chips de Tag Input. El trazo se escala con el tamaño (1 px a 12, 1,17 a 14, 1,33 a 16), como hace el SVG de lucide. Ver «Cuatro pendientes de Figma se cierran».
- [ ] **Retirar `color/border/component`**: sin puente y sin bindings desde el 28-ago-2026 (la sincronización a11y movió los bordes de campo a `color/field/border` y `var(--input)` se fue con ellos). Decidirlo junto a la revisión de `color/field/*`: si esa capa se retirase, el borde de campo volvería a necesitar un semántico con nombre.
- [x] ~~`color/icon/category/3` desapareció de Figma y el código lo sigue usando~~ → recreado el 28-ago-2026 tal como estaba prescrito: alias a `Amber/800`/`Amber/500`, puente `var(--category-amber)` recuperado de `color/icon/warning` (que lo llevaba prestado) y tarjeta nueva en `Foundations - Color`. La decisión de `bg/category/*` (hue o tinte, y la colisión contenedor/icono del ámbar) sigue abierta en su propio pendiente: un rename futuro de la familia arrastrará también a este token, y renombrar es barato. Ver «El préstamo de `--category-amber`».

---

## Cuatro pendientes de Figma se cierran (18-sep-2026)

Los cuatro puntos de diseño que la pasada de Community dejó abiertos, resueltos en el archivo el mismo día que la auditoría de textos.

**Button: Md mide 32 px.** `Size=Md` bajaba de la rampa de espaciado (`paddingTop`/`paddingBottom` a 8) y salía a 36, igual que Lg, mientras el producto tiene `h-8` por defecto y `h-9` en grande. Las 18 variantes Md llevan ahora un relleno vertical literal de 6, sin variable, porque 32 menos la línea de 20 son 12 y la rampa no tiene paso de 6; es la única medida fuera de la cuadrícula de 4 en el set, y la nota de la página lo dice. Sm (28), Md (32) y Lg (36) coinciden con `sm`, `default` y `lg` del código. **Queda por revisar** `sizing/control/*`: sus descripciones dicen sm 32, default 36, lg 44, que no es la escala del Button del producto (28 · 32 · 36); ningún nodo los aplica.

**Hover de marca en oscuro: se queda oscureciendo, y ahora con razón escrita.** `brand/primary-hover` es `Green/800` en claro (aclara) y `Green/700` en oscuro (oscurece). Medido antes de cambiarlo: `text/on-brand-solid` da 4,59:1 sobre el relleno en reposo `Green/600`, 5,85:1 sobre `Green/700` y **3,30:1 sobre `Green/500`**. Subir un paso dejaría el texto de todos los botones primarios por debajo de AA mientras el puntero está encima. El producto llega al mismo sitio con `hover:bg-primary/80` (solo en `<a>`), que sobre página oscura también oscurece. Decisión 20 en el apéndice de Figma.

**Terracota: la convención ya era numérica.** El rename `text` → `1000` y `brand` → `vivid` se hizo el 11-sep (A5/A6) pero dos textos del archivo seguían diciendo lo viejo: el swatch de la rampa en 01 · Colour y la decisión 11 del apéndice. Corregidos. `vivid` no es un paso y no lo pretende.

**Huecos de icono: instancias.** Ver el pendiente tachado en «Pendientes». Sustituir un hueco fue: crear instancia de `icon/plus`, copiar tamaño, nombre, visibilidad y `componentPropertyReferences.visible`, insertar en el mismo índice, escalar el trazo y borrar el rectángulo. 119 nodos en dos lotes de 60; las páginas que consumen Button y Badge no hubo que tocarlas.

---

## Lo que el archivo copia de otro caso: la pasada FlySplit (18-sep-2026)

Se comparó la organización del Figma con la de **FlySplit · Case Study & Design System** (`3evPA3meO0e4iH4YA8AClT`, 30 páginas en cuatro bloques: caso, producto, sistema y archivo de proceso) para sacar sus puntos fuertes frente a este archivo. Once salieron; cuatro se adoptaron el mismo día, uno se aplaza y uno se descarta. Versión con nombre guardada antes del primer cambio: «Before the FlySplit pass».

**Lo adoptado.**

1. **Enlace de documentación en los 103 componentes.** FlySplit lo tenía en 47 de 47 y este archivo en 0 de 103. Cada `COMPONENT_SET` y cada componente suelto lleva ahora en `documentationLinks` la URL del archivo con el `node-id` del `Header` de su página; los 69 de `04 · Iconography` apuntan a la sección `Foundations · Iconography`. Es lo que hace que el panel de cualquier instancia, en cualquier archivo consumidor, enseñe un enlace de vuelta a la página. Al mover o recrear un `Header` hay que regenerarlo, porque el id cambia.

2. **Dos callouts más en el `Header` de las 30 páginas, uno por set (34 pares).** Mismo bloque que «Note» y «Accessibility» (`color/bg/subtle` + `color/border/subtle` + `radius/surface`, padding 12/14, gap 4, título Geist Medium 11, cuerpo Geist Regular 11 en `color/text/secondary`), sin estilo de texto, como el resto del mobiliario de esas páginas. En las páginas con dos sets el título lleva el nombre del set como sufijo (`When not to use it · Button Icon`), y las capas se llaman `when-not-to-use/<Set>` y `tokens/<Set>`.
   - **«When not to use it»**: 34 textos escritos a mano a partir de la descripción del set y del producto. Siempre tres cosas: el componente vecino que se confunde con este, la variante que el producto no envía, y la propiedad que se deriva en vez de elegirse.
   - **«Tokens it consumes»**: generado por script leyendo `boundVariables` de todos los descendientes del set (sin entrar en instancias), agrupados por lo que gobiernan: `Background`, `Text`, `Icon`, `Border`, `Border width`, `Padding`, `Gap`, `Radius`, `Size`, `Opacity`, `Typography` (estilos de texto), `Effects` (estilos de efecto) y `Built from` (los sets de las instancias que contiene; los iconos colapsan en `icon/*`). Reglas de clasificación: un relleno sobre `TEXT` es `Text`; sobre un vector, o cualquier variable `color/icon/*` o `brand/logo`, es `Icon`; un trazo con `color/text*` o `color/icon*` sobre un nodo que no es texto también es `Icon`, porque es un glifo dibujado (decisión 3 del apéndice). Los nombres van en Geist Mono 11 en filas de etiqueta fija de 92 px + valor `FILL`. **Es una foto, no un vínculo**: revincular un token no actualiza la fila (misma regla 8 de `figma-tokens.md` que los renombrados). Regenerar es borrar los frames `tokens*` y volver a correr el script.
   - Al crecer el `Header`, todos los nodos de primer nivel que estaban por debajo bajan el mismo delta; verificado sin solapes en las 30 páginas y con el hueco de 40 px intacto.

3. **Start here gana dos bloques y actualiza uno.** `block/6-definition-of-done` (diez puntos, clonado de la anatomía de «How to use it»: `Label/Label 1` + `Body/Body 4`) y `block/7-closed-vocabulary` (tabla de 29 filas en `Mono/Table` con cabecera `Mono/Label`, columnas 96 · 320 · resto, filas con trazo inferior `color/border/subtle`), los dos entre «Conventions» y «Credits», en los huecos 6 y 7 que la numeración de bloques ya dejaba. El párrafo de «Conventions» nombra los dos callouts nuevos y el frame `callouts` pasa de dos a cuatro descripciones. El `para-2` de «How the tokens are organized» iba sin estilo desde antes; ahora lleva `Body/Body 3` como sus hermanos. La `SECTION` se redimensionó a 6.090 px para contener el marco. **La tabla de vocabulario deja a la vista una inconsistencia que no se corrigió**: `Size` dice `Sm · Md · Lg` en Button y `Sm · Default · Lg` en Avatar, `Default · Sm` en Switch, Select Trigger y Store Link Chip. El producto tiene `default` en shadcn y `Md` es invención del archivo. Se anota en la propia tabla y se deja como decisión pendiente, porque renombrar un valor de variante cambia el panel de quien consuma la librería.

4. **El apéndice pasa de texto corrido a 20 tarjetas con el mismo esqueleto.** Cada par `title-N`/`body-N` vive ahora en un frame `decision-N` con trazo superior de 1 px `color/border/subtle` y 24 px de aire: dos chips arriba (`Mono/Label` en mayúsculas, `radius/pill`, mismo fondo y borde subtle), el título y el cuerpo intactos, y, en las diez decisiones cuyo cuerpo acababa en «Rule: …», esa frase separada en un callout `rule` (`Label/Label 2` + `Body/Body 4` en `color/text`, fondo subtle, `radius/surface`). Ninguna frase se reescribió: solo se partió el cuerpo en «Rule:». El primer chip es el área (Colour ×7, Naming ×3, Radius ×2, y Effects, Icons, Token architecture, Publishing, Scope, Spacing, States, Component layer) y el segundo el origen de la restricción: **System** ×9, **Product** ×4, **Figma limit** ×4, **Accessibility** ×2 y **Debt** ×1 (la decisión 3, los cuatro glifos aún dibujados con primitivas). La entradilla gana una frase que explica los chips. El `body-20` iba con estilo mixto y toma `Body/Body 4`. La `SECTION` se redimensionó a 6.524 px.

**Lo aplazado (y hecho la misma tarde; ver la sección siguiente): agrupar los 30 componentes en páginas por categoría.** FlySplit resuelve 47 sets en seis páginas (Actions, Inputs, Navigation, Content, Cards, Feedback), cada una con un frame de inventario (componente · variantes · qué es) y las notas transversales de la categoría; el árbol lateral pasa de 55 entradas a 30. Es el cambio más grande y toca lo ya escrito para Community («28 component sets documented on six pages, one per family»), las cifras de Start here, el índice de 37 enlaces y la convención de «una página, una anatomía» de § «Figma — anatomía de una página de componente». Decidir antes de publicar, no después.

**Lo descartado: el changelog dentro del archivo.** FlySplit lo lleva en Getting started con semver y fecha por release, y se leía como punto fuerte. Aquí se borró el 11-sep a propósito (§ «Pasada de portfolio», «Changelog se borra») y la regla de § «Descripciones de variables y estilos» dice que fechas y changelog viven en este documento. No se reabre.

**Otros puntos fuertes de FlySplit que quedan como ideas, sin decisión**: una franja de cifras de evidencia (entrevistas, tests, SUS) al inicio de las páginas de caso, donde aquí las cifras de la beta van en prosa en la 04; una cabecera «How to read this page» en `Screens & prototype` con chips de versión y los pasos del flujo numerados; paridad literal claro/oscuro en las secciones de pantallas (allí cada tema es una sección con las mismas 35 pantallas en el mismo orden; aquí desktop tiene 7 claras y 5 oscuras); y un archivo de proceso (bocetos, wireframes, playground), que este producto no conserva.

**Cifras tras la pasada**: 55 páginas (29 tras la reagrupación de la tarde), 349 variables, 25 estilos de texto, 4 de efecto, 103 componentes con descripción y con enlace de documentación, 34 pares de callouts nuevos, Start here con 10 bloques.

## Seis páginas de componente, y tres remates de la misma tarde (18-sep-2026)

Lo que la sección anterior dejó aplazado se hizo la misma tarde, junto con las tres ideas que quedaban sin decisión. Versión con nombre previa: «Before Size rename and category grouping».

**Las 30 páginas de componente pasan a seis, por lo que el componente hace.** `01 · Actions` (Button con sus dos sets, Back Link, Theme Toggle) · `02 · Forms` (Label, Input, Textarea, Field Group, Checkbox, Switch, Select con sus dos sets, Tag Input, Slider, Budget Slider) · `03 · Navigation` (Sidebar Link, Notification Bell con sus dos sets, Sheet) · `04 · Overlays` (Dialog, Popover, Toast, Date Picker Dialog, Avatar Picker Dialog con sus dos sets) · `05 · Content` (Avatar, Badge, LogoMark, Spinner, Empty State) · `06 · Cards` (Person Card, Upcoming Date Card, Gift Recommendation Card, Store Link Chip). El eje átomo/molécula desaparece: separaba por composición y no decía dónde buscar; la categoría sí. Cada página abre con un `Header` de inventario de 960 px (título, entradilla con el recuento de componentes y variantes, y una tabla `Component · Variants · What it is` en Geist Mono 11 cuya tercera columna es la primera frase de la descripción del set), y debajo cada componente vive en una **`SECTION` con su nombre**, con `fills` → `color/bg` y `strokeWeight` → `border-width/default` como las demás, que contiene intactos los tres nodos que eran su página (`Header`, la sección de la rejilla, `Light & Dark`) desplazados 32 px, y 80 px entre secciones. **Los ids no cambian al mover un nodo de página**: los 103 `documentationLinks` siguen resolviendo al `Header` de siempre, las `vlabel/` no se tocaron y ninguna instancia se enteró. Se borraron las 30 páginas vacías, el divisor y la etiqueta `COMPONENTS · MOLECULES`; `COMPONENTS · ATOMS` pasa a `COMPONENTS`. El archivo va de 55 a **29 páginas**.

**La convención de § «Figma — anatomía de una página de componente» cambia de sujeto**: donde decía «cada página» hay que leer «cada sección»; el `Header`, la rejilla etiquetada y el marco `Light & Dark` son los mismos. Los scripts que recorrían `figma.root.children` buscando la página por nombre de componente tienen que recorrer ahora las `SECTION` de primer nivel de las seis páginas (todas menos `Header`). El reflujo tras hacer crecer un `Header` es el mismo, pero dentro de la sección envolvente, y hay que redimensionar la sección después.

**Start here.** Índice reconstruido en seis grupos (`ACTIONS (3)` … `CARDS (4)`) en las dos primeras columnas: el rótulo de cada grupo enlaza a su página y cada entrada a su sección (hipervínculos `NODE`; 49 enlaces, todos resuelven). Cifra de páginas 55 → 29, párrafo de «What is inside», párrafo de «Conventions» reescrito con el inventario y la sección, puntos 7 y 10 de la Definition of done, y las frases «eight component pages» / «Seven pages» / «Every component page» pasan a hablar de componentes. La `SECTION` de Start here se redimensionó a 6.297 px.

**`Size`: `Md` pasa a `Default` en Button.** El producto lo llama `default` (`button.tsx`, igual que `select.tsx`, `switch.tsx` y `avatar.tsx`); `Md` era invención del archivo. Renombradas las 18 variantes `Size=Md` del set (las instancias siguen por id), y seis textos que lo citaban: la `vlabel/Size=Md`, la descripción y la nota de la cabecera de Button, la decisión 4 del apéndice, la fila y la nota de la tabla de vocabulario, cuyas filas de Button y Avatar ahora coinciden y se fusionan (`Sm · Default · Lg` → `Button · Avatar`). El eje queda en tres formas: `Sm · Default · Lg` (Button, Avatar), `Default · Sm` (Switch, Select Trigger, Store Link Chip) e `Icon · Icon-Sm` (Button Icon).

**Cabecera de `Screens & prototype`, y un error de análisis corregido.** La comparación con FlySplit dijo que a este archivo le faltaba paridad claro/oscuro en las pantallas de escritorio; era falso, la lista con que se juzgó estaba truncada a doce marcos. Las tres secciones ya tenían los 15 marcos por tema en filas paralelas (7 · 4 · 4) y cuatro puntos de inicio de prototipo (recorrido principal y menú móvil, cada uno en claro y en oscuro). Lo que sí estaba desactualizado era la descripción, que seguía diciendo «veintiún marcos, seis gemelos oscuros, dos flujos» desde antes del 13-sep. Reescrita (30 marcos, cada uno con su gemelo en la fila de abajo, cuatro flujos), y la cabecera gana una fila de chips (`30 FRAMES · 3 WIDTHS · LIGHT + DARK · 4 PROTOTYPE FLOWS · V1.0`), los siete pasos del recorrido de escritorio numerados como chips, y un callout `note/prototype` que dice cómo navegarlo. Chips en `Mono/Label` mayúsculas sobre `color/bg/subtle` con `radius/pill`, el mismo patrón que las etiquetas del apéndice. Las tres secciones bajaron 154 px.

**Franjas de cifras.** La 04 gana bajo su cabecera una fila `figures` clonada de la de «What is inside» (`Heading/Heading 6` + `Eyebrow/Micro`): `10 BETA USERS · 24–58 AGE RANGE · 2 WEEKS · ~40 OBSERVATIONS · 4 CHANGES SHIPPED`. Y el bloque «Read the story in five minutes» de Start here otra: `10 BETA USERS · ~40 OBSERVATIONS · 4 CHANGES · 6 PATHS NOT TAKEN · 7 AA FIXES`, las cifras que ya afirmaban las páginas 04, 05 y 06 en prosa.

**Descripción de Community, actualizada en este documento** (§ «Pasada de portfolio»): «28 component sets documented on six pages, one per family» y «30 product frames, every screen in Light and Dark, with two click-through flows in each theme».

**Dos trampas nuevas.** (1) `loadFontAsync(node.fontName)` sobre un hijo que resulta ser un `FRAME` (el grupo del índice era `heading` + un marco `entries`, no `heading` + textos) falla con «Required value missing» y aborta la llamada antes de escribir nada; leer la estructura antes de asumirla. (2) Un `await loadFontAsync` por celda dentro de un marco con instancias agota los 30 s a la segunda celda: cargar las fuentes una vez al principio y escribir sin awaits, que es lo que ya decía la nota del 11-sep y volvió a costar un timeout.

**Cifras tras la tarde**: 29 páginas, 79 secciones (todas con `fills` → `color/bg`), 349 variables, 103 componentes con descripción y enlace, 30 marcos de producto, 4 flujos de prototipo.

## La portada enseña una pantalla, no piezas (18-sep-2026, noche; pantalla cambiada a Agenda la misma noche)

El panel derecho de `Cover Art` mostraba el flujo en piezas (ficha de persona y dos tarjetas de idea) por duplicado, en claro y en oscuro. Ahora muestra **una sola pantalla real en claro: `Screen · Gift ideas · Desktop 1440`**, el momento del caso, con la ficha de Marta, el selector de ocasión y tipo de regalo y la primera fila de ideas. Se decidió así porque una pantalla dice de qué va el producto y las piezas no, y porque el oscuro no se pierde: el chip «Light + Dark» sigue en la portada y la tercera imagen del carrusel es la Agenda en oscuro. Versión previa con nombre: «Before the single-screen cover».

**Cómo está montada.** Un frame `Screen panel · Gift ideas 1440` en el mismo sitio y con el mismo borde, radio 24 y sombras que el panel anterior (756 × 96, 1164 × 692), con `clipsContent`, y dentro un rectángulo de 1152 × 720 con la pantalla como **relleno de imagen** exportada desde el propio archivo (`exportAsync` JPG a 1,5x → `figma.createImage`, como las capturas de la 03), escala 0,8 respecto a los 1440 reales, centrada, recortada solo por abajo (28 px). Imagen y no instancia a propósito: pesa menos en render y una edición de la pantalla original no descuadra la miniatura de Community; el precio es que hay que reexportar si la pantalla cambia. Se probó antes una escala de 0,85 con el sidebar cortado por la izquierda y se descartó: cortaba palabras («ckPal», «es queridos») y parecía accidente. **Legibilidad en la tarjeta de Community** (unos 400 px de ancho): la portada baja a un 21 %, así que lo que se lee ahí son el logo, el nombre, los chips y las tres fotos de las ideas; el texto de las tarjetas se lee ya en la vista grande, que es donde toca.

**Un chip desactualizado, corregido de paso**: la portada decía «374 variables» desde el 11-sep y el archivo tiene 349. El nodo pasa a `chip/349-variables`.
**Corrección de la misma noche, a petición del usuario: la pantalla es la Agenda, y la portada recupera su margen derecho.** `Screen · Agenda · Desktop 1440` cuenta el flujo entero en un solo plano: la lista de fechas con el ser querido a la izquierda y el panel de ideas abierto a la derecha, que la pantalla de ideas sola no enseñaba. Y el panel anterior llegaba hasta el borde de la portada (x 1920) mientras todo lo demás respeta 96 px; ahora mide 1068 × 668 (756 → 1824, alineado con el final del texto del pie) y la pantalla entra entera a escala 0,742, sin recorte. El frame se llama `Screen panel · Agenda 1440` y el rectángulo con la imagen `Screen · Agenda · Desktop 1440 (image)`. El resto del párrafo anterior sigue valiendo: imagen exportada del archivo, no instancia, y reexportar si la pantalla cambia.

## Los rótulos de bloque llevan un rombo; las páginas, no emoji (18-sep-2026, noche)

Se valoró copiar de FlySplit el emoji por página (📘 📱 🎨 🧩 ✏️) y se descartó: allí cada bloque mezcla tipos de página y el emoji anticipa el contenido; aquí cada bloque es homogéneo y la numeración `01 ·` más el rótulo ya lo dicen. Además el emoji se pinta con la fuente del sistema de quien abre el archivo (tres dibujos distintos en Windows, Mac y web) y choca con el registro sobrio del archivo. Lo que sí se hizo, a petición del usuario, es marcar los **cuatro rótulos de bloque** con un carácter tipográfico que renderiza igual en todas partes: `◆ STORY` · `◆ FOUNDATIONS` · `◆ COMPONENTS` · `◆ APPENDIX`. Renombrar la página no toca ningún enlace: los del índice apuntan a ids. Si se añade un bloque, su rótulo lleva el rombo.

## El apéndice se vuelve visual: veinte tarjetas, veinte especímenes (18-sep-2026, noche)

`Design decisions` era la única página larga del archivo sin nada que mirar: una columna de 600 px de prosa, sección de 744, veinte entradas seguidas. El patrón que le faltaba ya estaba en casa, en `05 · Paths not taken` —tarjeta de 468 con `number`, título, entradillas y un `specimen` de instancias reales—, y es el mismo gesto con el que FlySplit resuelve su página de decisiones. Versión con nombre previa: «Before the visual appendix pass».

**La página toma la geometría de STORY**: sección 1120, marco 1040 con relleno 40, contenido 960, entradilla a 640. Las veinte tarjetas pasan a un frame `Decisions` con **diez filas de dos columnas de 468 y hueco 24**, y cada fila se fija a la altura de la más alta para que las dos tarjetas acaben a la vez. Anatomía de la tarjeta, en este orden: `tags` · `title-N` · `body-N` · `specimen` · `rule` (en diez) · `source`. El número deja de ir dentro del título («1. Shadows carry…») y es un nodo `number` en `Eyebrow/Micro` al principio de la fila de chips, como en la 05.

**La tarjeta deja de ser un filete superior y pasa a superficie**, `color/bg/surface` + `radius/surface`, sin trazo. Eso obliga a retintar lo que va dentro: **los chips pasan de `color/bg/subtle` a `color/fill/component` y el callout `rule` a `color/bg`**. El motivo no es de gusto: `color/bg/subtle` y `color/bg/surface` resuelven al **mismo `#211914` en oscuro**, así que un chip subtle sobre una tarjeta de superficie habría perdido el relleno y se habría quedado en un borde. Y hay una razón de modelo además de una de contraste: por la decisión 9 de este mismo apéndice, un chip es una **pieza**, no un contenedor, y las piezas se pintan con `fill/*`. Verificado en los dos modos.

**Los veinte especímenes, por tipo.** Nueve con **instancia real** del propio archivo: 3 (Bell Trigger y los dos Store Link Chip, los glifos que siguen siendo rectángulos), 4 (Button + Button Icon en los dos radios), 9 (Person Card frente a Button y Badge), 15, 16 (los tres controles al 50 % y el Input con su relleno), 18 (el contador de la campana junto a los dos ámbares), 19 (los cinco alias de campo) y 20. Siete de **muestrario**: 1 (los cuatro estilos de sombra sobre un pozo de `color/bg`), 6 (los diez `brand/*`), 10 (los gemelos `text`/`icon`), 11 (Cream, Terracotta, Amber y Umber con paso de 28 px fijo, para que una rampa corta se vea corta), 12 (los nueve radios), 13 (la escalera de `space/inset/*`) y 17 (Amber 600–950 con su hex). Cuatro **diagramáticas**: 5, 7, 8 y 14.

**Lo que no está escrito a mano, sino leído del archivo en el momento de montarlo.** Las cadenas de alias de la 5 (`space/card/padding → space/inset/md → spacing/16`, y la de `space/switch/track-inset`, que resultó tener solo dos eslabones), los cinco destinos de la 19 (`field/border → border/strong`, `field/placeholder → text/tertiary`…), el reparto de la 7 (**141 ocultas y 208 publicadas de 349**, contadas por `hiddenFromPublishing`) y los ratios de la 17 y la 20. Los de la 20 confirman la prosa sin tocarla: 4,59:1 en reposo, 5,85:1 en hover y 3,30:1 el aclarado que se descartó. **Si un valor cambia, el espécimen no se entera**: es una foto, como los callouts de «Tokens it consumes», misma regla 8 de `figma-tokens.md`. Regenerar es volver a correr el script.

**Dos literales a propósito.** El espécimen de la 2 dibuja los dos degradados con su hex tecleado, `#FFFBF6` y `#211914`, porque eso *es* la decisión. Y los dos suelos de la 20 llevan modo explícito con `setExplicitVariableModeForCollection`, uno en claro y otro en oscuro, para enseñar los dos temas a la vez en una página que solo tiene uno.

**El pie `source` es un enlace de verdad**: `setRangeHyperlink` de tipo `NODE` a la página donde vive el token, veinte en total, con el nombre de la página en `color/text/brand-secondary`. Apuntan a **ids de página**, que son estables, no a ids de `Header`, que cambian al recrearlos.

**Coste y cifras.** Ninguna frase del cuerpo se reescribió; solo salió el prefijo «N. » de los veinte títulos y la entradilla ganó una frase sobre el espécimen. La página va de **744 × 6.524 a 1.120 × 6.540**: las dos columnas no la acortaron, porque los especímenes devolvieron lo que la rejilla ahorraba. Lo que cambia es que ahora hay algo que mirar en cada entrada. En oscuro **las sombras de la 1 desaparecen** —negro con alpha 0,05–0,10 sobre `#211914`—, que es una propiedad real del sistema y justo lo que la decisión cuenta; el borde `color/border/subtle` de cada baldosa la mantiene legible.

**El desajuste de la decisión 10, resuelto el 19-sep-2026: era medio falso positivo.** La nota decía que el cuerpo se equivocaba en dos cosas, «There are fifteen» y `category-amber`. Contadas las variables en el archivo, **la cifra estaba bien**: hay quince `color/icon*` —catorce hijos más el token base `color/icon`, que también tiene gemelo `color/text`—, y la aritmética de la frase cuadra exactamente, trece con gemelo y dos sin él, `icon/strong` e `icon/category/3`, que son los dos que nombra. El «catorce» salió de contar **las tarjetas de `01 · Colour`, que son catorce porque el token base no tiene**; contar el muestrario no es contar la familia. Lo que sí estaba mal era el nombre: el cuerpo decía `category-amber` mientras el pie de su propio espécimen, tres líneas más abajo, ya decía `icon/category/3`. Corregido solo eso. `category-amber` no sobrevive en ningún texto ni nombre de nodo del archivo, y la tarjeta se llama ya `card/icon/category/3`.

## La spec al lado de la rejilla, no encima: prueba en `01 · Actions` (18-sep-2026, noche)

Segunda cosa que FlySplit hace mejor y que aquí faltaba: allí la tarjeta `Spec` de 380 px vive **a la izquierda** del component set (x 64 frente a x 508); aquí el `Header` con sus callouts se apilaba **encima** de la rejilla. Medido en las 30 secciones: `Select` tenía **722 px de documentación sobre 233 px de componente**, `Store Link Chip` 527 sobre 167, y las 30 sumaban **36.315 px**. Además el ancho era **dieciocho anchos distintos**, de 704 a 1.736, así que el borde derecho de cada página era un serrucho. Versión con nombre previa: «Before the spec-beside-grid pass on 01 Actions».

**La retícula nueva**, probada de momento **solo en `01 · Actions`**: padding 32, columna de spec de **640** —el ancho que ya tenían 20 de los 30 `Header`, así que casi ninguno re-fluye—, hueco 40, columna derecha de **920**, y **sección fija a 1.664** (32 + 640 + 40 + 920 + 32). En la columna derecha van, en este orden, la `SECTION` de la rejilla, el bloque `ext/` si lo hay, y `Light & Dark`. La altura de la sección es `32 + max(header, columna derecha) + 32`.

**Un hallazgo al medir: en seis secciones `Light & Dark` es más ancho que la rejilla** —Empty State 1.672, Button 1.216, Upcoming Date Card 1.080, Person Card 1.032, Avatar Picker 1.024, Select 1.008—, así que la pareja de temas, y no el component set, era la que fijaba el ancho de la sección. Esas seis pasan de `HORIZONTAL` a `VERTICAL`, claro arriba y oscuro debajo, y entran en los 920 sin recortar nada.

**Resultado en la página de prueba**: Button 1.280 × 3.248 → 1.664 × 2.724, Back Link 704 × 821 → 1.664 × 473, Theme Toggle 782 × 736 → 1.664 × 448. La página va de 5.358 a 4.220 px con las tres secciones al mismo ancho. Extrapolado a las 30, las secciones bajarían de 36.315 a unos 22.000.

**Bloques `ext/`, para las propiedades que a propósito no son eje.** FlySplit los usa mucho porque sus sets tienen muchas; aquí solo hay **siete propiedades no-variante** en toda la librería y cuatro son de texto (`Input.Placeholder`, `Textarea.Placeholder`, `Label.Text`, `Spinner.Label`), que no necesitan demostración. Las tres que sí: `Button.Icon Left/Right`, `Badge.Icon Left/Right` y `Avatar.Show Badge`. Se montó la primera, `ext/icon-slots/Button`: mismo bloque que los callouts (`color/bg/subtle` + `color/border/subtle` + `radius/surface`, título Geist Medium 11, cuerpo Regular 11, sin estilo de texto, como el resto del mobiliario), con padding 16 y cuatro instancias reales —sin icono, izquierda, derecha, las dos— y el motivo: como ejes, el set pasaría de 54 variantes a 216 por dos interruptores.

**Dos cosas de FlySplit que se descartan aquí, y por qué.** (1) **Las cabeceras de eje de la rejilla** (`STATE` arriba, `VARIANT × SIZE` a la izquierda): FlySplit las necesita porque sus rótulos dicen `Primary`, `sm`, `Default` a secas; los de aquí son `vlabel/Type=Primary`, `Size=Sm`, `State=Default` y **ya llevan el eje dentro**, así que la cabecera sería repetirlo. (2) **La tabla `props` de su tarjeta Spec**: la misma información vive aquí en la `description` en prosa («Variants: Type (…), Size (…), State (…)»), y cambiar la forma no añade nada.

**Un defecto preexistente que salió al recolocar**: en `Theme Toggle` el frame `row` medía 654 px y su segunda columna acababa en 659, así que «…switches to light» se cortaba cinco píxeles. Ensanchado a 683 y la sección de la rejilla a 747.

**Lo que cambia de la convención de § «Figma — anatomía de una página de componente»**: donde dice que el `Header` se ensancha al mayor de 640 y el ancho de la sección más ancha, hay que leer **columna fija de 640 a la izquierda**; y donde dice que la página se reapila en vertical con 40 px entre bloques, hay que leer **columna derecha** con esos 40 px entre las rejillas, el `ext/` y `Light & Dark`. Los scripts que recolocaban una página en vertical tienen que colocar ahora dos columnas.

## Las seis páginas de componente, con ancho por página (18-sep-2026, noche)

Lo que la sección anterior probaba en `01 · Actions` se extendió a las seis, **con ancho por página en vez de global**: dentro de una página todas las secciones miden igual, y las páginas no tienen por qué medir igual entre sí. Versión con nombre previa: «Before the spec-beside-grid pass on the other five pages»; posterior: «Component pages: spec beside the grid, per-page width».

**La regla de ancho, en tres pasos.** (1) El ancho lo fijan las **rejillas**, no la documentación: `gridMax` es la `SECTION` de rejilla más ancha de la página. (2) Una pareja `Light & Dark` que se pasara de ahí por más de 80 px se **apila en vertical** en vez de ensanchar la página entera: la tolerancia evita voltear por cuatro píxeles, que es lo que pasaba con `Notification Bell` (696 frente a 692) y `Date Picker Dialog` (904 frente a 900). (3) La columna derecha mide lo que pida el mayor de rejillas y parejas ya resueltas, y la sección es `32 + 640 + 40 + derecha + 32`. **El bloque `ext/` no vota**: es elástico y se redimensiona a la columna.

| Página | Ancho | Secciones | Alto |
|---|---|---|---|
| 01 · Actions | 1.590 | 3 | 3.645 |
| 02 · Forms | 1.428 | 10 | 6.225 |
| 03 · Navigation | 1.504 | 3 | 2.719 |
| 04 · Overlays | 1.648 | 5 | 5.592 |
| 05 · Content | 1.648 | 5 | 3.334 |
| 06 · Cards | 1.448 | 4 | 3.844 |

> **Estas cifras están superadas.** La pasada de esa misma noche («Tres remates contra la convención del sector») recolocó las rejillas y movió tres de los seis anchos. Los buenos son los de su línea **Cifras** —1.491 · 1.428 · 1.436 · 1.612 · 1.648 · 1.448—, verificados contra el archivo el 18-sep-2026. La tabla se conserva porque explica **la regla** de los tres pasos, que sigue en pie; para un ancho concreto, mirar allí.

Las 30 secciones pasan de **36.315 a 25.359 px**. Seis parejas de tema se apilaron: Button, Select, Avatar Picker Dialog, Empty State, Person Card y Upcoming Date Card.

**Dos secciones tienen dos rejillas** —`Select` (Select Trigger + Select Item) y `Avatar Picker Dialog` (Avatar Swatch + el diálogo)—, así que la columna derecha admite N rejillas, no una. Buscar solo la primera `SECTION` hija dejó la segunda aparcada donde estaba y sobresaliendo de la sección; el script recorre ahora todas.

**Los otros dos bloques `ext/`**: `ext/icon-slots/Badge` (6 variantes → 24 con los dos interruptores como ejes) y `ext/show-badge/Avatar` (3 → 6), este con las tres tallas con y sin insignia. Al montarlos se comprobó de dónde salen esos huecos y **el apunte de la sección anterior estaba mal**: los 108 `Icon Left`/`Icon Right` de Button y los 12 de Badge **son instancias de `icon/plus`**, no rectángulos. El pendiente de «308 rectángulos» que este documento arrastraba desde la pasada de portfolio ya no existe. La insignia del Avatar sí es un dibujo, un `ELLIPSE`, porque no lleva glifo.

**Tres defectos preexistentes que salieron al recolocar, todos escondidos por un recorte.**

1. **`Light & Dark` con altura fija.** Cinco marcos tenían `primaryAxisSizingMode = FIXED`, así que al girarlos a vertical no crecían y el tema oscuro quedaba fuera del marco. Puestos los dos ejes a `AUTO`. Dos estaban **ya recortados antes de tocar nada**: `Sidebar Link` (584 × 252 con 280 de contenido) y, tras el giro, `Avatar Picker Dialog` (708 con 1.440).
2. **El cuarto enlace de `Sidebar Link` era invisible en claro.** Las dos instancias `Platform=Mobile · State=Active` de la validación estaban atadas a **`color/fill/brand-solid`** mientras el component set usa **`color/fill/brand-subtle`**: en claro el relleno salía `#0C2912` con el texto `color/text/brand`, también `#0C2912`, o sea **1:1**. Un override viejo que nadie vio porque la cuarta fila caía fuera del marco. Reatadas a `brand-subtle`: **13,20:1 en claro y 6,19:1 en oscuro**. El component set nunca estuvo mal; la foto de validación sí.
3. **El `row` de `Theme Toggle`** medía 654 px con la segunda columna acabando en 659 (§ anterior).

**Regla que deja esto**: al girar una pareja de tema, poner los dos ejes en `AUTO` antes de medir; y cuando un marco de validación se recorta, comprobar qué había debajo antes de darlo por bueno — dos de los tres defectos llevaban meses tapados por dos píxeles de recorte.

**Lo que sigue sin copiarse de FlySplit** es lo de la sección anterior: las cabeceras de eje de la rejilla, porque los `vlabel/` ya llevan el eje dentro, y la tabla `props`, porque la `description` ya lo dice en prosa.

## Una rejilla y un control en oscuro, no tres renders del mismo componente (18-sep-2026, noche)

Con la spec ya al lado de la rejilla se vio lo que la disposición vieja escondía: cada sección enseñaba **el mismo componente tres veces** — la rejilla etiquetada, una copia clara y una oscura. La copia clara no añadía nada.

**Medido antes de borrar.** En **16 de las 30** secciones la mitad clara no contenía ni un componente que la rejilla no tuviera. En las otras 14 lo «exclusivo» eran piezas anidadas —`icon/plus`, `icon/arrow-left`, el `Avatar` y el `Badge` de dentro de una tarjeta— que la rejilla también pinta, y solo `Sheet` y `Dialog` enseñaban una maqueta distinta, más pequeña, del mismo componente. De las 106 instancias de las mitades claras, **82 repetían algo de su rejilla**. En superficie: 2,78 M px² de lienzo dibujando dos veces lo mismo.

**Lo que queda, y los dos modos fijados.** El marco pasa de `Light & Dark` con dos mitades a **`Dark check`**, una sola copia con `Semantic` fijada a `Dark`. Y la rejilla, **a petición del usuario, se fija a `Light`**: las 32 rejillas de las 30 secciones llevan modo explícito `Light`, así que las dos lecturas aguantan **aunque alguien cambie el archivo entero a oscuro**. Sin fijarla habría bastado con el modo por defecto de la colección, que es `Light`, pero entonces al tematizar el archivo la rejilla y el `Dark check` saldrían las dos oscuras y esa pantalla se quedaría sin referencia clara.

**El pin va en el marco, nunca en el `COMPONENT_SET`.** Un modo explícito puesto sobre un componente **viaja con él**: quien instancie el botón en otro archivo se lo lleva clavado en claro. Por eso los 32 modos están en la `SECTION` que envuelve al set, y se comprobó después que **ningún `COMPONENT_SET` ni `COMPONENT` carga modo explícito**. Verificado el efecto forzando una sección entera a oscuro: la cabecera, los callouts y el fondo se van a oscuro, y la rejilla se queda clara, leyéndose como un panel claro sobre la página oscura. En el modo por defecto no se nota, porque el `color/bg` de la rejilla y el de la sección resuelven al mismo `#FAF6F1`.

**Lo que no se fija: el bloque `ext/`.** Va con el mobiliario —mismo `color/bg/subtle` y mismo borde que los callouts— y sigue el modo del archivo como ellos. Fijarlo a claro lo habría dejado como una isla cremosa entre callouts oscuros.

**Cifras.** Las 30 secciones pasan de 25.359 a **23.273 px**, y los anchos por página bajan solos porque la mitad clara era la que los empujaba: `03 · Navigation` de 1.504 a 1.436 y `04 · Overlays` de 1.648 a 1.644. Y **las seis parejas que se habían apilado en vertical dejan de necesitarlo**: sin mitad clara no hay nada que apilar, así que `Avatar Picker Dialog` baja de 1.440 a 708 px de validación y `Empty State` de 846 a 411. El acumulado desde el principio de la tarde: **36.315 → 23.273 px**, un 36 % menos.

**Prosa actualizada en el archivo**, que no sigue a nadie (regla 8 de `figma-tokens.md`): las **seis descripciones de página**, que prometían «its header, its labelled grid and its Light & Dark check», ahora describen las dos columnas y dicen cuál sigue el modo y cuál está fijado; y en `Start here`, el párrafo de anatomía de las páginas de componente y la fila de la tabla de vocabulario. Barrido después: **cero menciones a «Light & Dark»** en las 29 páginas.

## Tres remates contra la convención del sector (18-sep-2026, noche)

Mirando una captura de `Back Link` salieron tres cosas, y **la referencia corrigió dos de mis recomendaciones**. Se comprobó cómo lo resuelve FlySplit antes de decidir. Versión con nombre previa: «Before the one-specimen Dark check».

**1. El nombre repetido: `<Componente> · labelled grid`.** En **29 de 32** rejillas la `SECTION` envolvente se llamaba igual que el `COMPONENT_SET` de dentro, así que el lienzo enseñaba «Back Link» dos veces, en la pestaña y en el rótulo morado. FlySplit nombra sus nueve bloques equivalentes `Button · labelled grid`, `Selection/Checkbox · labelled grid`: **nombre del componente más función**. Se adoptó tal cual. Donde la rejilla no tiene `vlabel/` —porque lo que enseña es una maqueta y no una matriz— el sufijo es `· specimen`: 24 `labelled grid` y 8 `specimen`. **Propuse llamarlos `Light` y era peor**: ni es la convención ni dice qué contiene el marco.

**2. El `Dark check` pasa a un solo espécimen.** Y aquí el error era de fondo, no de forma. Yo propuse **rotular las variantes** del oscuro porque no se sabía cuál era cuál; FlySplit hace lo contrario y tiene razón: su `Mode test` **no rotula variantes**, rotula los **modos**, y escribe al lado «ninguna de estas dos filas es un componente distinto; es el mismo Primary/md/Default». El punto de una comprobación de modo es enseñar **lo mismo** en los dos, para que cualquier diferencia sea culpa del modo. Lo que había aquí no era ni una cosa ni la otra: un surtido de variantes distintas sin rótulo. Ahora cada `Dark check` conserva **una instancia por set** —dos en `Select` y en `Notification Bell`, que tienen dos— y lleva encima una línea que la nombra: «Not a different component: the same Back Link (State=Default) the grid shows above, with the Semantic collection pinned to Dark». De 7 espécimenes a 1 en Button, de 4 a 1 en Input, Textarea, Switch, Toast y Sidebar Link.

**La leyenda va fuera del panel oscuro.** Primero se metió dentro de `Preview Dark` y **estiró los paneles hasta empujar el ancho de página**: `02 · Forms` se fue de 1.428 a 1.698 px, porque el texto medía lo que medía el marco viejo. Sacada al `Dark check`, que pasa a auto-layout vertical con la leyenda a 420 px fijos y el panel debajo ajustado a su espécimen. Regla: **un párrafo dentro de un marco que ajusta al contenido acaba mandando sobre el ancho**; darle medida fija o sacarlo.

**3. Las rejillas se ajustan al contenido.** 14 se habían dimensionado a ojo y no se habían tocado desde entonces: `Back Link` tenía 210 px de contenido en 500 de marco, `LogoMark` 96 en 500. Las 29 que lo necesitaban se recolocaron a 32 px de aire por los cuatro lados. Aviso que ya se dio antes de hacerlo y se confirmó: **el ancho de página apenas cambia**, porque la rejilla más ancha de cada página no era de las infladas. La ganancia es que deje de parecer dimensionado a ojo. Aquí también hay matiz de la referencia: FlySplit deja sus **secciones exteriores** todas a 3.276 px sin ajustar y ajusta solo la rejilla de dentro — o sea, se ajusta el espécimen, no la banda, que es lo que se hizo.

**Cifras.** 22.911 px en las 30 secciones. Anchos: 1.491 · 1.428 · 1.436 · 1.612 · 1.648 · 1.448. Verificado después: 32 rejillas con `Light` fijado y sufijo en el nombre, 30 `Dark check` con modo `Dark` y su leyenda, cero desbordes.

**Trampa de herramienta, para el registro.** A mitad de la pasada el archivo activo del plugin se había cambiado a FlySplit —lo cambió una llamada `figma_execute_across_files` lanzada contra él—, y `figma_execute` empezó a dar timeouts porque buscaba ids de PickPal en el archivo equivocado. **Con dos archivos conectados, apuntar por `fileKeys` y abrir cada script con una comprobación de `figma.root.name`**, que es lo que se hizo para todo lo que borraba nodos. `figma_navigate` con la URL del archivo devuelve el foco.

## El lote barato de la auditoría de nomenclatura (18-sep-2026, noche)

Segunda pasada con la skill `nomenclatura-tokens`, esta vez sobre el archivo entero: variables, estilos **y la API de los componentes**, que la del 15-sep no había mirado. El diagnóstico es que ya no conviven cinco dialectos sino dos, y están bien repartidos — **las variables hablan el suyo y los ejes de componente hablan el del código**. El roce está en la costura, y la pasada de esta misma tarde (`Size Md→Default`) la movió sin arrastrar las variables detrás.

**Antes de tocar nada, cuatro «hallazgos» se cayeron al comprobarlos contra `src/`.** Se anotan porque son justo los que parecen defectos a simple vista:

- `Size=[Sm, Default, Lg]` y `Size=[Icon, Icon-Sm]` no son inconsistencia: espejan literalmente `buttonVariants` (`size: default | sm | lg | icon | icon-sm`). El renombrado de la tarde fue correcto y `Button Icon` no se quedó atrás.
- `Empty State Type=[Full, Minimal]` no es vocabulario inventado: de ahí salen `space/empty-state/padding-full` y `-minimal`.
- `Sidebar Link State=Active` no colisiona con nada: el archivo reserva `pressed` para pulsado (`opacity/pressed`), y aquí `Active` es la ruta actual.
- `Type` como eje genérico (Button, Badge, Toast, Avatar Swatch, Empty State) es consistente consigo mismo. Renombrarlo por «precisión» habría creado el dialecto de más.

**Los cinco renombrados que sí se hicieron**, todos puros, cero bindings tocados:

1. **`Select Item`: `State=Focused` → `State=Focus`.** Era el único `Focused` frente a tres `Focus` (Input, Textarea, Select Trigger), y el mayoritario no tenía defecto que lo descalificara.
2. **`Date Picker Dialog`: `State=[Without Year, With Year]` → `Year=[Without, With]`.** No era un estado sino una configuración, y el eje no decía qué variaba. La palabra «Year» se mueve del valor al eje, que era donde faltaba.
3. **`Notification Popover`: `State=[Empty, List]` → `Content=[Empty, List]`.** La respuesta ya estaba escrita en el archivo: la prosa de la página decía «Content (Empty, List)» mientras la propiedad decía `State`, y `Store Link Chip` ya tenía un eje `Content`. Se implementó lo que la documentación prometía.
4. **`LogoMark` → `Logo Mark`.** El único de 34 nombres de componente sin espacios.
5. **`sizing/avatar/md` → `default`, `avatar/badge-md` → `badge-default`, `sizing/control/md` → `default`.** Son las familias de tamaño que espejan un eje `Size` de componente: la del switch ya decía `default` y coincidía; estas dos decían `md`. Su propia descripción ya las llamaba «Default» y «Standard», así que el nombre era el último sitio que decía `md`. **`sizing/icon/*` y `sizing/selection/*` no se tocan**: son rampas t-shirt, no ejes de componente, y ahí `md` es el paso correcto.

**El coste de un rename no está en los bindings, está en la prosa.** Los cinco cambios arrastraron **23 nodos de texto en 8 páginas** y 3 descripciones de variable: las dos tablas monoespaciadas de `03 · Space, Radius & Elevation` —con su alineación por columnas hecha a mano, que hubo que rehacer contando caracteres—, el callout «Tokens it consumes» de `05 · Content`, los rótulos `vlabel/` de las rejillas, las leyendas de los `Dark check`, la tabla de API de `Start here` y la descripción de `brand/logo`, que citaba «LogoMark». Barrido después por las 29 páginas: cero restos.

**La tabla de `Start here` además se reordenó.** Agrupa por propiedad, así que al dejar de ser `State`, las filas de Notification Popover y Date Picker se quedaban huérfanas en mitad del bloque de estados. Ahora la de Notification Popover va junto a la otra `Content` y `Year` detrás.

**Lo que quedó decidido y sin hacer: `danger` → `destructive`** — ejecutado esa misma noche, ver «`danger` pasa a `destructive`». El archivo llamaba de tres maneras al mismo rol rojo —`danger` en las 9 variables, `Destructive` en el eje Type de Button, `Error` en cuatro estados de campo— y el código no usa `danger` **ni una vez**: `destructive` aparece 45 veces y la custom property es `--destructive`. Tres de las nueve variables ya lo declaran en su `codeSyntax`. `danger` no gana ni pierde por ser mejor palabra —no es ambigua ni codifica su valor—: pierde porque **la regla de desempate del archivo es que manda el código**, y porque el propio archivo ya dice `Destructive` en el eje de Button. `State=Error` se queda: es el nombre del estado, no el del color, y el código hace lo mismo (`aria-invalid` pintado con `--destructive`). Coste medido: 9 variables (0 bindings), 11 descripciones y ~20 nodos de texto. **Hacerlo antes de publicar en Community**, que es cuando renombrar deja de ser barato.

**Un apunte que no es de nomenclatura**: `Button Type=Primary` diverge del código, que llama `default` a esa variante. Se mantiene `Primary` a propósito —`default` ya ocupa los ejes Size y State del mismo componente, y es término tóxico justo por eso—, pero falta anotarlo en la tabla de divergencias de [`docs/figma-tokens.md`](figma-tokens.md).

---

## `danger` pasa a `destructive` (18-sep-2026, noche)

El hallazgo de severidad alta de la auditoría de nomenclatura, ejecutado. El archivo llamaba de **tres maneras** al mismo rol rojo: `danger` en las 9 variables, `Destructive` en el eje Type de Button y `Error` en cuatro estados de campo. El código no usa `danger` **ni una vez** — `destructive` aparece 45 veces y la custom property es `--destructive`—, y tres de las nueve variables ya lo declaraban en su `codeSyntax`.

**`danger` no pierde por ser peor palabra.** No es ambigua, no codifica su valor y no está en la lista de términos tóxicos; por mayoría habría ganado ella, 9 contra 1. Pierde por dos razones que no son de gusto: la **regla de desempate del archivo es que manda el código**, y el archivo ya decía `Destructive` en el eje de Button, así que no se importa vocabulario de fuera — se elige entre dos palabras que ya convivían dentro.

**`State=Error` se queda, y no es una excepción.** Es el nombre de un **estado** (el campo no valida), no el de un color. El código hace exactamente lo mismo: marca `aria-invalid` y lo pinta con `--destructive`. Un estado y un rol de color son slots distintos; que compartan el rojo no los hace sinónimos.

**Los 9 renombrados**, todos alias puros, 0 bindings tocados:

| Antes | Después |
|---|---|
| `color/fill/danger-solid` | `color/fill/destructive-solid` |
| `color/fill/danger-subtle` · `-subtle-hover` | `color/fill/destructive-subtle` · `-subtle-hover` |
| `color/text/danger` · `color/icon/danger` | `color/text/destructive` · `color/icon/destructive` |
| `color/border/danger` | `color/border/destructive` |
| `color/text/on-danger-solid` · `color/icon/on-danger-solid` | `color/text/on-destructive-solid` · `color/icon/on-destructive-solid` |
| `color/field/border-danger` | `color/field/border-destructive` |

**El barrido, que es donde está el trabajo.** 11 descripciones de variable, **23 nodos de texto** en cinco páginas (`01 · Colour`, `01 · Actions`, `02 · Forms`, `03 · Navigation`, `Design decisions`) y **20 nombres de capa** de los swatches de `01 · Colour`, que no salen en una búsqueda de texto y hay que buscar aparte — los 10 marcos `card/<token>` y los 10 TEXT cuyo nombre de capa espeja el token. Verificado después: cero apariciones de `danger` en las 29 páginas, en las descripciones de variables, estilos y componentes, y en los nombres de capa.

**Una trampa de sustitución, para el registro.** `danger` aparecía también como **palabra inglesa corriente** en la descripción de `color/Red/950` («text, border and solid fill of danger»). Un `replace` global la habría convertido en «solid fill of destructive», que no es inglés. La regla que se usó fue sustituir solo cuando `danger` va pegada a `/` o a `-` —es decir, cuando forma parte de una ruta de token— y arreglar esa descripción a mano. **Al renombrar un token cuyo nombre es también una palabra del idioma, la sustitución tiene que anclarse al separador, no al término.**

**El snapshot estaba dos pasadas atrasado.** `design/figma-tokens.snapshot.json` seguía en `capturedAt: 2026-09-15`, así que el `npm run token-map` que se corrió tras el lote barato **no probó nada**: leía nombres viejos y por eso no daba diferencias. Regenerado con las dos pasadas (12 entradas: las 3 de `sizing/` y estas 9). La puerta pasa: 71 espejados, 71 de acuerdo, 0 divergencias, 0 conflictos. **Recordatorio que deja: el snapshot es derivado pero no automático — si no se regenera, `token-map` da un verde falso.**

**Lo que no se tocó, a propósito.** Las secciones fechadas de este documento conservan el nombre viejo: son un registro de lo que pasó cada día, no una descripción del archivo de hoy, y reescribirlas falsearía el log. Solo se actualizaron las que describen el **estado actual** (la tabla de «Cómo se nombran las variables», «Los tres tokens que cerraban huecos de pareja») y se marcó como cerrada la sección «`danger` y `error`: dos rojos con el mismo hex», que documentaba una distinción que nunca existió en Figma. Tampoco se tocó la transcripción literal de la guía canónica en [`docs/figma-tokens.md`](figma-tokens.md), que sigue diciendo `danger` porque es una cita; la divergencia se anotó en su tabla.

---

## Los tres flecos de la auditoría, y un hallazgo que se cae (18-sep-2026, noche)

**1. `Eyebrow/Micro`: retirado por infundado.** La auditoría lo marcó como gramática mezclada —`Hero` y `Section` nombran un contexto, `Micro` un tamaño— y propuso `Eyebrow/Store`. **Comprobado, y la propuesta era peor que el problema.** El estilo tiene **104 usos en 10 páginas** y solo uno es una cadena de producto; atarlo a «Store» lo habría amarrado a una de sus 104 apariciones. Y el criterio tampoco se puede unificar por el otro lado: `Hero` y `Section` miden **los dos 12 px** y se distinguen por tracking (20 % y 18 %), así que una escala de tamaños no podría separarlos. Cada nombre es claro por separado, ninguno compite con otro por el mismo significado y el arreglo habría creado el dialecto de más. **Se queda como está.** Es la tercera propuesta propia que se cae al mirar el producto en esta auditoría.

Lo que sí salió de comprobarlo: **su descripción contaba media historia.** Decía «Minimum label, the one of the store sections», que es cierto —el producto lo usa en `GiftRecommendationCard`, dos veces— pero deja fuera que este archivo lo reutiliza 103 veces como su rótulo pequeño de documentación. Reescrita con los dos usos.

**2. `Type=Primary` queda registrado como la única divergencia con el código.** Anotado en [`docs/figma-tokens.md`](figma-tokens.md) § «El único sitio donde el archivo no sigue al código, a propósito». Button y Badge llaman `Primary` a lo que el código llama `variant: "default"`, y se mantiene porque `Default` ya ocupa `Size` y `State` en el mismo componente: adoptarlo dejaría tres ejes con el mismo nombre en un panel de variantes. **De paso se verificó el resto de la API**, que no se había comprobado entera: los ejes `Size` de Switch, Avatar y Select Trigger coinciden **exactamente** con el `size` de su componente en `src/components/ui/`. No hay más divergencias de nombre.

**3. Los cuatro valores obsoletos, corregidos.** La tabla de la sección «`danger` y `error`» citaba `Green/100` como #E8ECE8, `Green/800` #203322 (es `Green/900` #1E4024), `Green/850` —paso que no existe desde la migración a la escala 50–950, y que este mismo documento ya daba por muerto doscientas líneas más arriba— y `Green/400` como #89968B (es #8EAA91). Los cuatro venían de agosto. Reemplazada por los nombres y valores de hoy, medidos contra el archivo.

**El patrón que dejan los tres.** Ninguno se resolvió mirando la lista de tokens: el primero se cayó al contar usos, el segundo al abrir `src/components/ui/`, el tercero al resolver los alias en Figma. **Un documento de sistema envejece por sus citas concretas —valores, pasos de rampa, nombres de eje—, no por su prosa**, y esas citas solo se pueden verificar contra la fuente, nunca contra el propio documento.

---

## El Notification Popover estaba cortado 8 px (18-sep-2026, noche)

Salió al verificar por captura los renombrados de la auditoría: la variante `Content=List` aparecía con la última fila partida por la mitad. No era culpa del rename —geometría anterior—, y **no eran dos marcos sino tres**:

| Marco | Alto | Contenido | |
|---|---|---|---|
| `COMPONENT_SET` Notification Popover | 222 | 230 (`Content=List`) | recortaba |
| `FRAME` Composed (open) | 262 | 270 (trigger 32 + popover a y=40) | recortaba |
| `FRAME` Dark check › Preview Dark › row | 262 | 270 | **el que faltaba en la nota** |

Los tres con `clipsContent`. El tercero se encontró **buscando desbordes en toda la página**, no repasando la lista de la nota: cualquier marco que recorte y cuyo hijo más bajo pase de su alto. Esa barrida dejó además un falso positivo instructivo — `backdrop` de la hoja móvil recorta 160 px de un `Sheet` de 420, y eso **es deliberado**: es un viewport simulado. **Un recorte accidental son unos pocos píxeles; uno de 160 es encuadre.**

**Por qué solo creció un contenedor.** Antes de tocar nada se siguió la cadena hacia arriba, que es donde esta página tenía el riesgo: la sección de rejilla `Notification Bell · labelled grid` sí sube de 732 a **740**, para conservar los 32 px de aire por los cuatro lados que fijó la pasada de las seis páginas. De ahí para arriba no se propaga: `Preview Dark` es auto-layout vertical de alto **fijo** con holgura de sobra, así que absorbe los 8 px sin crecer; `Dark check` hug a partir de él y se queda en 424; y la sección exterior `Notification Bell` mide lo que le pide el `Dark check`, no la rejilla, así que sigue en 1.260. **Ancho de página intacto en 1.436** y las cuatro secciones de `03 · Navigation` en su sitio —`Sheet` no se movió de y=2.251—, que era la condición que ponía la nota.

Verificado después por captura: las dos variantes del set y la maqueta compuesta cierran su borde inferior y enseñan la tercera fila entera, y el `Dark check` igual.

## Portada «Marta would love ___» y logos de tienda en todo el archivo (26-sep-2026)

**La portada nueva, dentro de `Cover Art`.** Se conservan la sección `33:849` y el marco `33:842`, así que la miniatura del archivo sigue apuntando al mismo nodo. Sustituye la pantalla entera, el lema y los seis chips por una sola idea. A la izquierda, una frase de contexto («Marta’s birthday is in three weeks.»), el titular para completar («She’d love ___.», con cursor y línea en blanco terracota de `brand/logo`) y tres intentos tachados (*a candle*, *flowers, again?*, *a scarf*). A la derecha, la interfaz cuenta el flujo: la `Upcoming Date Card` de Marta con «Cumpleaños · Pareja» y el botón «Ideas de regalo», y debajo un abanico de tres `Gift Recommendation Card` con foto (delantal y lámpara de arcilla detrás, girados ±11°; el torno delante). Los seis datos de los chips pasan a una línea de pie, y la URL de la derecha lleva hipervínculo y subrayado.

**Por qué así, en tres pasos.** (1) A unos 400 px, en la tarjeta de Community, la portada anterior solo dejaba leer «PickPal». (2) La primera versión, con «Marta would love ___» y una sola tarjeta, se leía bien pero no decía que era una app de regalos: sin la palabra, sin una fecha, y la tarjeta suelta parecía una ficha de tienda. (3) Añadir una línea explicando el producto no servía, porque a 400 px queda en unos 6 px. Lo que funcionó fue la frase del cumpleaños, que aguanta ese tamaño, y sobre todo la imagen: una cara, una fecha y varias ideas con foto se leen como «regalos para alguien» antes de leer nada. Todo se comprobó con un mapa de bits exportado a 400 px. En el resto del archivo la fecha de Marta es el aniversario; en la portada es su cumpleaños a propósito, porque se entiende a la primera como ocasión de regalo.

**Detalles de montaje.** El tachado es un rectángulo agrupado con el texto, porque Figma solo deja dar color y grosor propios a un subrayado. La tarjeta del torno mide 392 de base, un ancho real de la rejilla fluida, para que «El Corte Inglés» quepa sin recortarse. Versiones con nombre: «Before the blank-line cover» (la portada anterior) y «Blank-line cover drafts» (las tres variantes antes de elegir). **Pendiente**: reexportar la primera imagen del carrusel y publicar la actualización en Community, que es lo que cambia la miniatura pública.

**El tamaño óptico de Fraunces no estaba atascado en 9.** La nota de 10-sep («`opsz` no se puede escribir por API… se queda en 9») era cierta en la lectura y falsa en el render: Figma aplica el tamaño óptico solo, según el cuerpo. El ancho por em de un mismo texto cambia con el cuerpo (7,90 a 31 px, 6,47 a 150 px) y es idéntico con `opsz` 9, 144 o sin fijar, y 36 px ampliado frente a 144 px da corte de texto frente a corte de cartel. El 9 que se lee es un valor guardado. Consecuencia práctica: **para previsualizar la miniatura hay que exportar la imagen, no reescalar el marco**, porque al reescalar el texto se recompone con el corte pequeño, que es un 22 % más ancho.

**Once logos de tienda como componentes.** Nuevo bloque `Store logos` en `04 · Iconography`: `store/amazon` … `store/druni`, con los nombres de `STORE_IDS`, los logos de `public/stores/` (Temu, Zalando, MediaMarkt y Amazon reducidos a 48 px; IKEA como vector desde su SVG) y la misma anatomía que el `<img>` del código: 16 × 16, placa blanca, `radius/logo` y 1 px de margen, con el logo en `SCALE` para que encoja a 14 en los botones Sm. **La placa es blanco literal, sin variable, a propósito**: el código usa `bg-white`, igual en los dos temas, y el archivo no tenía ningún blanco opaco. Crear un semántico solo para esto sería un token que no existe en el código. Cada logo lleva descripción y la nota de que es marca registrada y no entra en la licencia del archivo; lo mismo se añadió a *Credits* de `Start here`.

**Dónde se aplican, contra el código:**

| Sitio | Antes | Ahora |
|---|---|---|
| `Gift Recommendation Card` (maestro y sus 52 instancias) | `StoreButtons` en *wrap* a 240, botón solo con el nombre | Dos columnas iguales (el `grid-cols-2` del código), `Icon Left` = logo, `Icon Right` = `icon/external-link`, nombre en `FILL` con puntos suspensivos |
| Ideas guardadas del perfil (6 pantallas) | 24 `Store Link Chip` Sm en *Fallback Icon* con nombre de tienda | 24 `Button` Outline Sm con logo y enlace externo, que es lo que pinta el perfil; los 6 chips de Muji siguen siendo `Store Link Chip`, porque son de marca |
| Ajustes › Tiendas (claro y oscuro) | Casilla + nombre | Casilla + logo + nombre; se corrigieron de paso 10 nombres de capa que no coincidían con su texto |

**Divergencia asumida**: el icono de enlace externo del botón Default mide 16 y no los 14 del código (`size-3.5`), porque Figma no deja cambiar el tamaño de una instancia anidada en el hueco de icono.

**Hallazgo del producto, no del archivo**: con el logo, el nombre y el icono, «El Corte Inglés» no cabe en una columna de menos de 168 px, y ni siquiera «Amazon» cabe en las tarjetas estrechas del panel de la Agenda (columna de 119). El código ya lo recorta con `truncate` y el archivo ahora lo enseña igual: casi todas las tarjetas de las pantallas dicen «El Corte In…» o menos.

---

## Cómo mantener este documento

- Cualquier cambio visual no obvio se anota aquí en el commit donde se introduce.
- Cuando un "Pendiente" se resuelve: pasa a Componentes / Tokens / etc. con su regla, o desaparece si fue descartado.
- Cuando un anti-pattern se descubre: se añade con una frase del por qué, no como dogma.
- Si el documento crece más allá de 250 líneas: hay que partirlo o podar — está rotando.

# IA y recomendaciones de regalos

## Flujo completo

```
Usuario → selecciona un evento del perfil (Select)
  → elige tipo de regalo (tarjeta de tipo)
  → click "Generar 9 ideas"
    → POST /api/recommendations { personId, occasionLabel, giftType }
    → Busca persona en Convex (intereses, marcas favoritas, notas, tallas, alergias, dislikes)
    → Busca la importantDate cuyo label == occasionLabel (presupuesto)
    → Busca historial de regalos anteriores (para no repetir)
    → Llama a Gemini 2.5 Flash vía AI SDK con generateObject
    → Persiste las 9 ideas en Convex (tabla recommendations, upsert)
    → Devuelve 9 recomendaciones validadas por Zod
    → Cada tarjeta muestra título, badges de intereses, descripción, precio y chips de tienda
    → Si se accede con ?occasion=LABEL, el selector de ocasión se pre-selecciona automáticamente
```

---

## Selección de evento (ocasión)

La pantalla muestra un `<Select>` con los eventos (`importantDates`) guardados en el perfil de esa persona. Solo se puede elegir entre ellos — no hay campo de texto libre.

- El presupuesto de la fecha seleccionada se aplica automáticamente al prompt (ver sección siguiente).
- El `<Select>` muestra el presupuesto junto al label cuando la fecha lo tiene definido: `Cumpleaños · 50–100€`.
- Si la persona no tiene ningún evento, la opción aparece deshabilitada: "Sin eventos guardados".
- El botón "Generar" queda deshabilitado hasta que se elige un evento.
- Al cambiar de evento, las ideas en pantalla se limpian (`ideas = null`) para que no queden ideas de una ocasión mezcladas con otra.

---

## Presupuesto por ocasión

El presupuesto (`budgetMin` / `budgetMax`) se asocia a cada **fecha importante** (`importantDates`), no a la persona. Esto permite gastar distinto en el cumpleaños y en el Día de la Madre de la misma persona.

- Almacenado en **céntimos** de euro en Convex (`budgetMin`, `budgetMax` en `importantDates`).
- Convertido a euros en los formularios (`value * 100` al guardar, `value / 100` al cargar).
- Al generar recomendaciones, `/api/recommendations` busca la `importantDate` cuyo `label` coincide con `occasionLabel` mediante `api.importantDates.getByPersonAndLabel`. Si la fecha no tiene presupuesto, se pasa `undefined` y el prompt dice "sin límite definido".
- El campo `budgetMin`/`budgetMax` en la tabla `people` se mantiene como **legacy opcional** para no romper documentos existentes en producción, pero ya no se usa en ningún flujo activo.

---

## Tipos de regalo

Cuatro opciones mutuamente excluyentes definidas en `src/lib/giftCatalog.ts`:

| Valor | Icono (lucide) | Label | Descripción visible | Comportamiento del prompt |
|---|---|---|---|---|
| `fisica` | `ShoppingBag` | Producto físico | Algo que comprar y envolver | Productos comprables online. `amazonQuery` se usa como query de búsqueda en cada tienda favorita del usuario. |
| `experiencia` | `Ticket` | Experiencia | Cena, taller, escapada… | Cenas, talleres, escapadas, conciertos. `amazonQuery` para Google. |
| `tiempo-juntos` | `Heart` | Tiempo juntos | Planes sin coste o caseros | Planes gratuitos o caseros. Precios bajos o cero. |
| `sorprendeme` | `Shuffle` | Sorpréndeme | Mezcla de los tres tipos | Mezcla libre de los tres tipos anteriores. |

Se muestran como tarjetas en grid 2×2 (4×1 en `sm+`) con icono, nombre y descripción corta. Sin emojis — se usan iconos de lucide-react para coherencia con el resto de la UI. Cambiar el tipo limpia las ideas en pantalla (`ideas = null`).

---

## Estado de carga (skeletons)

Mientras la petición a Gemini está en curso (`loading === true`):
- El botón muestra "Generando…" y queda deshabilitado.
- Se muestran 9 tarjetas placeholder con `animate-pulse` y fondo `bg-muted/40` para indicar actividad.
- Al llegar la respuesta, las tarjetas reales aparecen con animación escalonada (`animationDelay: index * 60ms`).

---

## Caché de ideas

Las ideas generadas se persisten en Convex (`tabla recommendations`) indexadas por `(clerkUserId, personId, occasionLabel, giftType)`. Esto permite:

- Mostrar las últimas ideas al volver a la pantalla sin consumir cuota.
- El botón cambia a "Regenerar" (con icono `RefreshCw`) cuando existen ideas cacheadas para la combinación seleccionada.
- Un aviso informa al usuario de que regenerar consume cuota diaria.
- Las ideas locales (state React) tienen prioridad sobre las cacheadas: `showIdeas = ideas ?? cached?.ideas`.

---

## Límite de uso (rate limit)

10 generaciones por usuario por día (UTC). El flujo es **reserva atómica + refund**:

1. `api.recommendationUsage.reserve` (mutation): incrementa el contador **antes** de llamar a Gemini. Si la cuota está agotada lanza `ConvexError` y la API devuelve `429`. Al ser una transacción Convex, dos peticiones concurrentes en el límite no pueden superar las 10/día. `reserve`/`refund` exigen el secreto server-only `CONVEX_SERVER_SECRET` para no ser invocables desde el navegador (ver `docs/security.md` §4).
2. Gemini se llama solo si la reserva tuvo éxito.
3. Si la generación falla (saturación, timeout, o el JSON de Gemini no valida contra el schema), la API llama a `api.recommendationUsage.refund` para devolver la unidad: como las ideas se persisten solo tras una generación correcta, un fallo nunca cuesta cuota. `refund` recibe el `day` UTC que devolvió `reserve`, así que devuelve la unidad al bucket correcto aunque el fallo cruce la medianoche.
4. Tras el éxito, `api.recommendations.upsert` persiste las ideas. No hay consumo posterior al guardado, así que no existe el caso "ideas guardadas pero el usuario ve un error de cuota".

La respuesta de la API incluye `remaining` (generaciones que quedan hoy).

---

## Reacciones 👍 / 👎

Cada tarjeta tiene dos botones en la esquina superior derecha: pulgar arriba y pulgar abajo.

### 👎 Pulgar abajo — descartar

1. La tarjeta desaparece inmediatamente (optimistic update en estado local).
2. Aparece un **toast permanente** con el mensaje "Descartada — la IA evitará ideas parecidas" y un botón "Deshacer".
3. La idea **no se elimina de Convex todavía** — queda en una cola de pendientes (`pendingDiscards` ref).

#### Cuándo se hace efectivo el descarte en Convex

| Acción del usuario | Resultado |
|---|---|
| Cierra el toast manualmente | `removeIdea` se llama en `onDismiss` |
| Navega fuera de la pantalla | El `useEffect` de cleanup llama `removeIdea` por cada pendiente |
| Regenera | Los pendientes se confirman antes de la nueva tirada |
| Pulsa "Deshacer" | La idea vuelve a su posición; `removeIdea` **no** se llama |

**Descartar una idea ya guardada también la des-guarda.** Si la idea tenía 👍 (existe en `savedIdeas` para esa ocasión), al confirmarse el descarte se llama además a `api.savedIdeas.remove` — descartar = "no la quiero", así que no debe quedar en "Ideas guardadas" de la ficha. Se difiere junto a `removeIdea` (mismo `onDismiss` / cleanup / flush al regenerar), de modo que "Deshacer" la restaura sin necesidad de re-guardarla: hasta que el toast se cierra, nada se ha borrado. El `_id` a borrar se resuelve desde un ref espejo de `savedIdeas.getByPerson` (`discardSavedIdea` en `GiftsPanel`).

#### Campos `discardedTitles` y `dislikedCategories`

`removeIdea` actualiza dos campos en el doc de `recommendations`:

```typescript
await ctx.db.patch(existing._id, {
  ideas: existing.ideas.filter((idea) => idea.title !== ideaTitle),
  discardedTitles: [...(existing.discardedTitles ?? []), ideaTitle],
  dislikedCategories: merged, // categorías acumuladas de todas las ideas descartadas
});
```

- `discardedTitles` — títulos exactos; evitan que el upsert los sobrescriba al regenerar.
- `dislikedCategories` — categorías de ideas descartadas (deduplicadas, cap 100). Se inyectan en `buildPrompt` como sección "Tipos de regalos que NO encajan con esta persona", para que la siguiente generación los evite a nivel semántico.

#### Por qué el descarte usa título (no índice)

`removeIdea` filtra por `ideaTitle`, no por posición en el array. Esto evita que descartes múltiples rápidos desajusten los índices entre estado local y Convex.

### 👍 Pulgar arriba — guardar idea

1. Llama a `api.savedIdeas.save` (rate limit: 50 guardados/día).
2. El icono pasa a `fill="currentColor"` como confirmación visual.
3. Toast: "Idea guardada en la ficha de [nombre]".

La idea se persiste en la tabla `savedIdeas` vinculada a la persona y la ocasión.

El estado relleno del pulgar **sobrevive a recargas**: se deriva de `savedTitles` (set local de la sesión) **unido** a las ideas que ya persisten en `savedIdeas.getByPerson` para esa ocasión (`isSaved` en `GiftsPanel`). La clave de "guardada" espeja la dedupe del servidor: (persona, ocasión, título). Antes el pulgar dependía solo del set local y se vaciaba al recargar aunque la idea siguiera guardada.

#### Tabla `savedIdeas`

Almacena ideas que el usuario quiere recordar para cuando llegue el momento de comprar:

```
savedIdeas: {
  clerkUserId, personId, occasionLabel,
  title, description, priceMinEuros, priceMaxEuros,
  category, amazonQuery, suggestedStores?, giftType?, imageKey?
}
index: by_person
```

#### Conversión a historial de regalos

Desde la ficha de la persona (sección "Ideas guardadas") el usuario puede:

1. Ver todas las ideas guardadas con título, precio, categorías y ocasión.
2. Pulsar **"Lo regalé →"** → se abre un diálogo con `giftName` y `occasionLabel` pre-rellenados; el usuario elige reacción (+ año y notas opcionales).
3. Al confirmar: se crea una entrada en `giftHistory` y se borra la idea de `savedIdeas`.

---

## Implementación (`/api/recommendations/route.ts`)

```typescript
// 1. Datos de contexto en paralelo. Si Convex lanza (personId malformado
//    o de otro usuario), la API devuelve 404 — nunca un 500 genérico.
const [person, matchingDate, history, existingRec] = await Promise.all([
  fetchQuery(api.people.getById, { id: personId }, { token }),
  fetchQuery(api.importantDates.getByPersonAndLabel, { personId, label: occasionLabel }, { token }),
  fetchQuery(api.giftHistory.getByPerson, { personId }, { token }),
  fetchQuery(api.recommendations.getByPersonOccasion, { personId, occasionLabel, giftType }, { token }),
]);

// 2. Reservar cuota atómicamente (lanza ConvexError si agotada → 429).
//    `secret` (CONVEX_SERVER_SECRET) marca la llamada como server-side.
const { remaining, day } = await fetchMutation(
  api.recommendationUsage.reserve, { secret: serverSecret }, { token });

// 3. Llamar a Gemini — si la generación falla (saturación/timeout/schema),
//    se llama a api.recommendationUsage.refund({ day, secret }) en el catch
const { object } = await generateObject({
  model: google("gemini-2.5-flash"),
  schema: giftRecommendationsSchema,   // definido en src/lib/gifts.ts
  prompt,
});

// 4. Persistir ideas (la cuota ya quedó reservada en el paso 2)
await fetchMutation(api.recommendations.upsert,
  { personId, occasionLabel, giftType, ideas: object.ideas }, { token });
```

`generateObject` valida la respuesta contra el schema Zod automáticamente.

---

## Diseño del prompt (`buildPrompt`)

```
Genera EXACTAMENTE 9 ideas de regalo para la siguiente persona.

Persona:
- Nombre: {name}
- Relación: {relationship}
- Intereses: {interests} | sin definir
[Marcas favoritas: {favoriteBrands} — solo si están definidas]
- Notas: {notes} | ninguna
- Presupuesto: entre Xmin€ y Xmax€ | sin límite definido
- Ocasión: {occasionLabel}
[Talla de zapato / ropa / alergias / dislikes — solo si están definidos]
[Historial de regalos anteriores — hasta 10 entradas, con reacción]

Reglas:
[según giftType: física / experiencia / tiempo-juntos / sorprendeme]
[Regla de marcas favoritas — solo si hay marcas definidas]
- Los precios deben respetar el presupuesto indicado cuando sea posible.
- "description" en español, UNA frase breve (≤ ~140 car.) — debe caber entera en la card (3 líneas) sin truncarse con "…".
- "category" array JSON de 1-3 intereses concretos del perfil (ej: ["Senderismo","Fotografía"]). La card muestra como máx. 3 chips en total (marca + categorías).
- Responde en español.
```

### Marcas favoritas (`favoriteBrands`)

Campo opcional por persona (`people.favoriteBrands: string[]`, máx. 10 marcas × 40 chars, texto libre). Se edita como chips en `PersonForm` y en la ficha (`BrandTagInput`, sin catálogo de sugerencias — el vocabulario de marcas es abierto).

Cuando la persona tiene marcas, el prompt añade dos cosas:

1. La línea `- Marcas favoritas: LEGO, Nike` en el bloque Persona.
2. Una regla que pide a Gemini priorizar productos de esas marcas **cuando encajen de forma natural** e incluir el nombre de la marca en `amazonQuery` (mejora directa de los resultados de búsqueda en tienda). Guardarraíles: máximo 3-4 de las 9 ideas con marca (variedad) y **nunca usar una marca como `category`** — las categorías siguen siendo intereses, y así el feedback 👎 (`dislikedCategories`) no acumula nombres de marca.

Por qué campo propio y no un chip en intereses: el prompt instruye a que `category` referencie los intereses, así que un interés "Nike" acabaría como badge/categoría y contaminaría la semántica del descarte. Las **tiendas** del destinatario no tienen campo: se expresan como marca en texto libre ("Decathlon") y el sistema de `suggestedStores` ya muestra esa tienda cuando la idea encaja.

**Cierre del círculo en la card**: cuando una idea menciona de verdad una marca favorita (en su título o `amazonQuery`), `GiftRecommendationCard` muestra un badge `Tags` con el nombre de la marca junto a las categorías. La detección es `matchFavoriteBrands` en [`src/lib/brands.ts`](../src/lib/brands.ts) (pura, testeada): match normalizado sin acentos/mayúsculas y con límite de palabra para no casar marcas cortas dentro de otra palabra. Es una heurística sobre el texto que ya devolvió la IA — no se le pide al modelo que marque nada. Así el usuario *ve* que el campo funcionó, no solo confía en ello.

**Botón de marca accionable** (regalos físicos): además del badge, por cada marca matcheada se muestra un botón a ancho completo, *encima* de los chips de tienda. Motivo: el badge solo decoraba; el botón de compra seguía apuntando a un marketplace (Amazon) que **a menudo no vende la marca** — el caso típico son marcas DTC de distribución propia (p. ej. Brandy Melville), que solo venden en su web. El botón tiene dos niveles:

- **Tienda oficial resuelta (Brandfetch)**: al generar, `/api/recommendations` resuelve cada marca matcheada a su tienda con una llamada a Brandfetch Search (`GET /v2/search/{marca}?c={clientId}`), que devuelve dominio + logo en una sola petición. Se adjunta a la idea como `matchedBrandStores` (igual que la foto de Pexels: enriquecimiento server-side tras la generación, validado por prefijo antes de persistir). La card muestra el **logo de la marca** y enlaza **a la tienda** (no a un buscador). El destino exacto depende de si se pudo confirmar la ruta de búsqueda de la tienda:
  - **Búsqueda del producto dentro de la tienda** (`generateBrandProductSearchUrl` → `https://{dominio}/search?q={producto}`) cuando la resolución detectó que la tienda admite `/search?q=`. La detección sondea `/products.json` (huella de Shopify, donde esa ruta es universal); el flag se guarda como `supportsSearch`. La mayoría de marcas DTC de moda (incl. Brandy Melville) son Shopify.
  - **Home de la marca** (`generateBrandStoreUrl` → `https://{dominio}`) si no se pudo confirmar la ruta. **Nunca** se inventa una ruta de búsqueda: adivinarla y fallar dejaría un 404, peor que la home. (También se descartó una búsqueda Google con `site:`: dejaba al usuario en Google, no en la tienda.)
- **Fallback (Capa 0)**: si no hay `BRANDFETCH_CLIENT_ID`, la marca no se resuelve, o el campo no existe (ideas viejas), el botón cae a `generateBrandSearchUrl` — búsqueda en Google `"{producto} {marca}"` con el icono `Tags`. Misma vía determinista que el botón a Google de los no físicos.

`BRANDFETCH_CLIENT_ID` es **opcional** (degrada al fallback, como `PEXELS_API_KEY`) y server-only. **Sin caché**: el volumen está acotado por la cuota de 10 generaciones/día; una tabla de caché global queda como mejora si crece (ver `docs/security.md` §8). Los chips de tienda se mantienen debajo (algunas marcas sí están en Amazon). Helpers y validación en [`src/lib/brands.ts`](../src/lib/brands.ts) / [`convex/validators.ts`](../convex/validators.ts).

---

## Pre-selección de ocasión por query param

La página `/seres-queridos/[personId]/gifts` acepta `?occasion=LABEL` en la URL. Si está presente, el selector de ocasión se inicializa con ese valor sin que el usuario tenga que buscarlo.

**Puntos de entrada que usan este param:**
- `UpcomingDateCard` (la agenda; el componente vive en `src/components/dashboard/`,
  carpeta que conservó el nombre viejo de la ruta): el botón "Ver regalos" incluye
  `?occasion={date.label}`.
- `NotificationBell` (popover): cada fila incluye `?occasion={date.label}`.
- Email de recordatorio (CTA único): el enlace apunta a `/seres-queridos/{personId}/gifts?occasion={label}`.

**Implementación:** `useSearchParams()` en el cliente lee el param en el montaje; si coincide con algún evento del perfil, se llama `setOccasion` con ese valor. Si el label no existe en la lista de eventos (evento eliminado tras envío del email), el selector queda vacío y el usuario elige manualmente.

---

## Multi-tienda

Para regalos físicos cada tarjeta muestra un chip por cada tienda relevante. El click abre una búsqueda en esa tienda con la query que generó la IA. La lista de tiendas que se ven en cada tarjeta resulta del cruce entre tres señales:

1. Las **tiendas soportadas** (4 hardcoded por la app).
2. Las **favoritas del usuario** (configuradas en `/settings`).
3. Las **sugeridas por la IA** para esa idea concreta (`suggestedStores`).

### Por qué multi-tienda

Antes solo había Amazon. Ampliar a 11 tiendas amplía el rango calidad-precio y cubre más categorías sin coste técnico: Gemini no consulta catálogos reales — devuelve una query de búsqueda genérica de 3-6 palabras y la app construye URLs deterministas por tienda. Cero alucinaciones de URL, cero claves API, fácil añadir tiendas.

### Tiendas soportadas

Definidas en [`src/lib/stores.ts`](../src/lib/stores.ts). Lista cerrada con allowlist en cliente (`STORE_IDS`) y servidor (`ALLOWED_STORES` en [`convex/validators.ts`](../convex/validators.ts)).

| Store ID | Etiqueta | Plantilla de URL | Encaje típico |
|---|---|---|---|
| `amazon` | Amazon | `https://www.amazon.es/s?k={query}` | Generalista. Tech, libros, marcas internacionales, envío rápido |
| `elcorteingles` | El Corte Inglés | `https://www.elcorteingles.es/search/?s={query}` | Gourmet, vinos, moda media-alta, hogar, regalos premium nacionales |
| `aliexpress` | AliExpress | `https://es.aliexpress.com/w/wholesale-{query}.html` | Gadgets baratos, accesorios sin marca, espera larga |
| `temu` | Temu | `https://www.temu.com/search_result.html?search_key={query}` | Marketplace ultra-low-cost: hogar, gadgets, papelería, accesorios |
| `miravia` | Miravia | `https://www.miravia.es/search?q={query}` | Marketplace asiático/europeo curado, moda y belleza |
| `decathlon` | Decathlon | `https://www.decathlon.es/es/search?Ntt={query}` | Deporte y outdoor: running, ciclismo, montaña, fitness, camping |
| `ikea` | IKEA | `https://www.ikea.com/es/es/search/?q={query}` | Hogar, muebles, decoración, textil hogar, organización, iluminación |
| `pccomponentes` | PcComponentes | `https://www.pccomponentes.com/search/?query={query}` | Tech especializada: componentes PC, periféricos, gaming, monitores |
| `mediamarkt` | MediaMarkt | `https://www.mediamarkt.es/es/search.html?query={query}` | Electrónica mainstream: TV, audio, electrodomésticos, móviles, gaming consolas |
| `zalando` | Zalando | `https://www.zalando.es/catalog/?q={query}` | Moda y calzado: ropa, zapatos, deportivas, complementos de marca |
| `druni` | Druni | `https://www.druni.es/catalogsearch/result/?q={query}` | Perfumería y cosmética: perfumes, maquillaje, skincare, sets de belleza |

Las URLs se construyen con `encodeURIComponent` sobre la query, así que cualquier carácter especial queda escapado correctamente. Los enlaces siempre llevan `target="_blank" rel="noopener noreferrer"`.

Cada chip muestra el logo oficial de la tienda (PNG 64px o SVG según disponibilidad) almacenado en `public/stores/{storeId}.{ext}`. `STORE_ICONS` en `src/lib/stores.ts` mapea cada `StoreId` a su path público. Los iconos se renderizan como `<img>` con fondo blanco (`bg-white p-px`) para garantizar visibilidad en modo oscuro.

### Filtro de precio en la URL

Algunas tiendas aceptan filtro de precio en la query string, otras no. La lista actual está en `STORES_WITH_PRICE_FILTER` (`src/lib/stores.ts`):

| Tienda | Filtro precio | Sintaxis |
|---|---|---|
| `amazon` | ✅ | `&low-price={n}&high-price={m}` |
| `aliexpress` | ✅ | `?minPrice={n}&maxPrice={m}` |
| `elcorteingles` | ❌ | Filtros van en path, no en query string |
| `temu` | ❌ | Filtros JS-driven, parámetros de precio en URL inestables |
| `miravia` | ❌ | Filtros JS-driven, URL params no honran |
| `decathlon` | ❌ | Filtros JS-driven, parámetros desconocidos redirigen a home |
| `ikea` | ❌ | Filtros JS-driven |
| `pccomponentes` | ❌ | Sintaxis no documentada con fiabilidad |
| `mediamarkt` | ❌ | Filtros JS-driven, URL params no honran |
| `zalando` | ❌ | Filtros van en path (ej. `/catalog/?price=`) y son inestables |
| `druni` | ❌ | Magento default, filtros van por path layered nav |

En las tiendas que NO soportan filtro fiable, el chip enlaza a la búsqueda sin filtrar — preferible a un filtro silencioso que la tienda ignore.

**Padding de la franja**: `padPriceRange(min, max)` ensancha `[min × 0.8, max × 1.3]` antes de pasarla al filtro. Motivo: la IA estima precios y suele subestimarlos un poco; un filtro estricto sobre una estimación deja la página vacía con frecuencia. Ejemplos: `[30, 50] → [24, 65]`, `[10, 15] → [8, 20]`, `[30, 30] → [24, 39]`.

El padding solo afecta a la URL del filtro. La etiqueta de precio en la card sigue mostrando los valores originales que devolvió Gemini.

Notas:

- El campo de la idea se llama `amazonQuery` por motivos legacy (antes solo existía Amazon). Su contenido ya es una query genérica de 3-6 palabras válida para cualquier tienda. Renombrarlo a `searchQuery` requiere migración Convex y queda fuera de alcance.
- Para `experiencia`, `tiempo-juntos` y `sorprendeme` se mantiene un único botón a Google (no tiene sentido buscar "cena romántica" en AliExpress).
- Sin afiliación. Futuro: parámetros de afiliado por tienda para monetización (Amazon Associates, AliExpress Affiliate, etc.).

### Setting `favoriteStores` (preferencia del usuario)

Cada usuario elige en `/settings` qué tiendas quiere ver en sus tarjetas.

- **Storage**: `userSettings.favoriteStores: string[]` (opcional en el schema). Si nunca se ha tocado, `getMine` devuelve `DEFAULT_FAVORITE_STORES` (todas las soportadas, hoy 11).
- **UI**: una casilla por tienda en `/settings`, en grid `grid-cols-1 sm:grid-cols-2`. Validación cliente "selecciona al menos una tienda" antes de llamar la mutation.
- **Mutation**: `setMine` en [`convex/settings.ts`](../convex/settings.ts) llama `sanitizeStores` (allowlist contra `ALLOWED_STORES`) y rechaza el array vacío con error.
- **Lectura**: tanto `getMine` como el cliente vuelven a pasar el array por `sanitizeFavoriteStores` para mantener orden canónico y filtrar valores caducados (por si se elimina una tienda en el futuro — p.ej. Etsy quedó como valor legacy filtrado tras retirarla).

### Tiendas sugeridas por idea (`suggestedStores`)

Para evitar mostrar chips a tiendas que claramente no tienen el producto (miel artesanal de un pueblo en AliExpress), la IA marca por idea en qué tiendas tiene sentido buscar.

- **Schema**: campo opcional en `giftRecommendationSchema` con `z.array(z.enum(STORE_IDS)).min(1).max(4)`. Opcional por compatibilidad con ideas cacheadas pre-v2 que no lo tienen.
- **Persistencia**: `recommendations.ideas[].suggestedStores: v.optional(v.array(v.string()))` en el schema Convex.
- **Reglas que el prompt impone a Gemini** (ver `buildPrompt` en [`src/app/api/recommendations/route.ts`](../src/app/api/recommendations/route.ts)):
  - **Incluir siempre al menos una generalista** (`amazon` o `elcorteingles`) salvo en casos claramente nicho (artesanal, gourmet hiper-local, hecho a medida).
  - **Generalistas** (`amazon`, `elcorteingles`): Amazon en la mayoría de tech/libros/marcas internacionales; ECI cuando marca/calidad importan o es producto muy "español".
  - **Marketplaces baratos** (`aliexpress`, `temu`, `miravia`): solo cuando la idea funciona con producto barato + espera larga aceptable; excluir gourmet español, moda media-alta, calidad relevante. `temu` y `aliexpress` se solapan; añade ambos cuando la idea es ultra-low-cost y la espera no importa.
  - **Especialistas** — la IA tiene que añadir la tienda especialista junto a la generalista cuando claramente encaja:
    - `decathlon` → solo si la idea es claramente deportiva/outdoor.
    - `ikea` → hogar, muebles, decoración, textil; útil para mudanzas o pareja que estrena piso.
    - `pccomponentes` → tech serio (PCs, periféricos gaming, monitores, smart home).
    - `mediamarkt` → electrónica mainstream (TV, audio, electrodomésticos, gaming consolas, móviles, fotografía). Complementaria a Amazon. No para componentes PC sueltos.
    - `zalando` → moda y calzado de marca (no deportivo técnico, eso va a Decathlon).
    - `druni` → perfumería y cosmética (perfumes, maquillaje, skincare, sets de belleza).
  - Solo se pide para `fisica` y para los items físicos dentro de `sorprendeme`. Para `experiencia` y `tiempo-juntos` el prompt instruye explícitamente a omitir el campo.

### Lógica de renderizado

`pickEffectiveStores(favoriteStores, suggestedStores)` en [`src/lib/stores.ts`](../src/lib/stores.ts) decide qué chips mostrar. Es pura y testeada en `stores.test.ts`.

| Caso | `stores` devuelto | `isFallback` | UI |
|---|---|---|---|
| `suggestedStores` ausente o vacío (idea cacheada pre-v2 o tipo no físico) | Todas las favoritas | `false` | Chips sin hint |
| Hay intersección entre sugeridas y favoritas | Solo la intersección | `false` | Chips sin hint |
| Hay sugeridas pero ninguna coincide con favoritas | Todas las favoritas | `true` | Chips + texto "Búsqueda genérica — esta idea encaja mejor en otras tiendas" |

El orden de los chips es siempre el canónico de `ALL_STORES` (Amazon, AliExpress, Miravia, El Corte Inglés), sin importar el orden en que llegan los inputs.

### Cabecera visual por idea (`image` + `imageKey`)

Cada card lleva una cabecera visual con dos niveles, de mejor a peor:

1. **Foto de stock (Pexels)** — `image: { url, photographer?, photographerUrl? }`. Se busca server-side en `/api/recommendations` tras la generación, con una query EN INGLÉS de 2-4 palabras (`imageQuery`) que Gemini produce por idea. `attachStockImages` lanza las 9 búsquedas en paralelo con timeout de 4 s por foto y **nunca falla la generación**: sin `PEXELS_API_KEY`, sin resultados, con error o timeout, la idea sale sin `image`. `imageQuery` se elimina siempre antes de persistir.
2. **Icono por categoría (fallback)** — tinte plano + icono lucide elegido vía `imageKey`, un catálogo cerrado de 30 claves (`GIFT_IMAGE_KEYS` en [`src/lib/giftCatalog.ts`](../src/lib/giftCatalog.ts)). También cubre fotos que fallan al cargar en cliente (`onError` → estado `photoFailed`) e ideas persistidas antes de estos campos.

La foto ilustra la **categoría**, no el producto exacto — el matching semántico de un buscador de stock no es perfecto y no se verifica (hacerlo requeriría visión por IA, descartado por coste). Generación de imágenes con IA descartada también (~0,35 €/tirada + latencia) — ver decisión en `docs/design-system.md` · "Cards generadas por IA".

- **Schema**: en generación, `imageKey` (enum) e `imageQuery` son **obligatorios** (un enum opcional hace fallar a Gemini al omitirlo, mismo gotcha que `suggestedStores`); en el tipo de cara a la UI `imageKey`/`image` son opcionales y `imageQuery` no existe.
- **Persistencia**: `recommendations.ideas[].{imageKey,image}` y `savedIdeas.{imageKey,image}`, opcionales. Allowlists en [`convex/validators.ts`](../convex/validators.ts): `ALLOWED_IMAGE_KEYS` para la clave, prefijo `https://images.pexels.com/` para `image.url` y `https://www.pexels.com/` para `image.photographerUrl` (mismo patrón que el avatar DiceBear). CSP `img-src` incluye `images.pexels.com` ([`next.config.ts`](../next.config.ts)).
- **Prompt**: una regla pide la clave más específica disponible ("audio" antes que "tecnologia", "regalo-generico" como último recurso) y otra pide la query de foto genérica y visual, sin marcas. Coste en tokens: despreciable.
- **Renderizado**: la card pinta `image.url` (`object-cover`, `h-24`, `alt=""` decorativo) si existe; si no, `resolveGiftImage(imageKey, giftType)` en [`src/lib/giftImages.ts`](../src/lib/giftImages.ts) mapea clave → icono + tinte. Ideas sin nada caen al icono del tipo de regalo (`ShoppingBag`/`Ticket`/`Heart`/`Shuffle`).
- **Cuota Pexels**: free tier 200 req/hora · 20k/mes. Acotado por la cuota de generaciones: 10/usuario/día × 9 fotos. La atribución (fotógrafo + enlace) se persiste para poder mostrarla: las pautas de la API de Pexels piden un enlace visible a Pexels y dar crédito al fotógrafo cuando sea posible. Este punto decía antes que Pexels «la recomienda pero no la exige», y no era así. El enlace a Pexels va bajo la rejilla de ideas cuando alguna trae foto, y en «Créditos» de `/terminos`. El nombre del fotógrafo no se muestra: el overlay en la cabecera de la card se descartó por diseño.

### Defensa en profundidad

La salida de un LLM se trata como input no confiable. El flujo de validación tiene 3 capas:

```
Gemini  →  generateObject + Zod (giftRecommendationSchema)  →  fetchMutation(api.recommendations.upsert)  →  validateRecommendationIdeas  →  Convex DB
                          [/api/recommendations/route.ts]                                                     [convex/validators.ts]
```

1. **Zod** rechaza cualquier idea con campos fuera de tipo o tienda no listada (`z.enum(STORE_IDS)`).
2. **`validateRecommendationIdeas`** se ejecuta dentro de la mutation Convex y revalida tamaños, rangos numéricos, allowlists de tiendas y de claves visuales (`ALLOWED_IMAGE_KEYS`), no-duplicados, y exactamente 9 ideas. Cierra el agujero de "atacante autenticado llama a `api.recommendations.upsert` directamente saltándose la API route" (ver [`docs/security.md`](security.md) sección "Validar tamaños y rangos en el servidor").
3. **`encodeURIComponent`** al construir la URL impide cualquier inyección desde la query string al path/dominio.

Si en algún momento futuro Gemini empieza a devolver datos hostiles (prompt injection vía `notes`/`interests` del usuario), el daño máximo es: query de búsqueda rara que el propio usuario abriría en su navegador. Sin amplificación cross-user, sin escape a otros endpoints.

---

## Configuración de la API key de Google

La variable de entorno `GOOGLE_GENERATIVE_AI_API_KEY` debe configurarse en Vercel (y en `.env.local` para desarrollo).

**Condiciones de datos.** Según los [términos adicionales](https://ai.google.dev/gemini-api/terms) (en vigor desde el 23-mar-2026), a quien usa la API desde el EEE Google le aplica sus reglas de datos de pago: no entrena con los datos, los trata como encargado y los registra 55 días solo para detectar abusos (ver [`privacy.md`](privacy.md) §4.1). Todo lo que `/privacidad` dice de Google depende de esas reglas, así que cuando Google publique una versión nueva de los términos hay que comprobar que siguen ahí.

1. Crear la API key en [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Los límites de `gemini-3.5-flash` (RPM/RPD) se aplican **al proyecto entero**, así que el techo real lo marca el número de usuarios activos: el rate limit interno de 10 generaciones/usuario/día acota lo que gasta cada uno, no la suma. Con el uso actual sobra, pero es la cifra que hay que vigilar según crezca. El *thinking* se deja activo a propósito (desactivarlo degradaba el structured output), y `maxRetries: 2` da margen ante una tanda que no valide. Ver [`route.ts`](../src/app/api/recommendations/route.ts).
3. **Proyecto de Google Cloud dedicado.** La [doc de Google](https://ai.google.dev/gemini-api/docs/rate-limits) dice literalmente que los rate limits "se aplican por proyecto, no por API key": crear una segunda key dentro del mismo proyecto **no** separa la cuota. Si el proyecto se comparte con otra app, esa app puede agotar el RPD del día y PickPal se queda sin generar. PickPal debe tener su propio proyecto.

### Qué ve el usuario cuando falla el proveedor

`classifyProviderError` ([`src/lib/errors.ts`](../src/lib/errors.ts), tests en `errors.test.ts`) traduce el fallo en status + mensaje. En todos los casos la cuota interna se devuelve con `refund` antes de responder, así que ningún fallo del proveedor le cuesta una generación al usuario.

| Fallo del proveedor | Status | Mensaje |
|---|---|---|
| `503` | 503 | "La IA está saturada ahora mismo… Inténtalo en unos minutos." |
| `429` con `quotaId` `…PerDay…` | 429 | "La cuota diaria de la IA se ha agotado… Vuelve a intentarlo **mañana**." |
| `429` con `quotaId` `…PerMinute…` | 429 | "Demasiadas peticiones seguidas… Espera **un minuto**." |
| `429` sin cuerpo reconocible | 429 | "…ha alcanzado su límite de uso… Inténtalo más tarde." (sin plazo) |
| Cualquier otro (timeout, schema, bloqueo de seguridad) | 500 | Mensaje genérico. |

La distinción del `429` importa porque agotar el **RPD** no se arregla reintentando: el reset es a medianoche del Pacífico, así que un "inténtalo de nuevo" genérico manda al usuario a golpear un endpoint que no puede funcionar. Google lo indica en el `quotaId` del cuerpo (`GenerateRequestsPerDayPerProjectPerModel-FreeTier` vs. `…PerMinute…`); si el cuerpo no llega o cambia de forma, se degrada a un mensaje que **no promete ningún plazo** — prometer el equivocado es peor. El `kind` de la clasificación va al log (`[recommendations] gemini (quotaDaily):`) para poder distinguirlos en Vercel sin releer el cuerpo.

Los números concretos de RPM/RPD del free tier **ya no aparecen en la doc de Google** (antes se listaban por modelo). Ahora remite al panel de la cuenta en [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit) y añade que "los límites especificados no están garantizados y la capacidad real puede variar". Por eso este doc no fija una cifra: consultar el panel. Las fuentes de terceros que sí dan números se contradicen entre sí (250 vs. 1.500 RPD) — no fiarse.

> **Facturación.** Activarla en un proyecto elimina su cuota gratuita: *toda* petición pasa a cobrarse, sin franja gratis dentro de la capa de pago. Con los precios publicados para `gemini-3.5-flash` (1,50 $ por millón de tokens de entrada y 9 $ por millón de salida, *thinking* incluido), una tanda de 9 ideas debería costar unos pocos céntimos. Es una estimación sin medir (unos 2.500 tokens de entrada y entre 2.000 y 5.000 de salida), así que hay que comprobarla con el `usage` que devuelve `generateObject`. El *spending cap* tiene que ser mayor que cero: con 0 € las llamadas fallan con "límite alcanzado". Si la key de desarrollo está en el mismo proyecto, también se cobrará.

**Modelo actual:** `gemini-3.5-flash`, desde el 20-sep-2026. `gemini-2.5-flash` y `gemini-2.0-flash` están retirados para API keys nuevas. El porqué de la elección está en el comentario de [`route.ts`](../src/app/api/recommendations/route.ts).

---

## Archivos clave

| Archivo | Rol |
|---|---|
| [`src/app/(app)/seres-queridos/[personId]/gifts/page.tsx`](../src/app/%28app%29/seres-queridos/%5BpersonId%5D/gifts/page.tsx) | Página principal: selector de evento, tipo, generación, descarte con toast+undo |
| [`src/components/gifts/GiftRecommendationCard.tsx`](../src/components/gifts/GiftRecommendationCard.tsx) | Tarjeta de idea: título, descripción, precio, categoría, chips de tienda, botones 👍/👎 |
| [`src/components/gifts/GiftsPanel.tsx`](../src/components/gifts/GiftsPanel.tsx) | Orquesta generación, caché, estado local de ideas, `handleSave` y `handleDiscard` |
| [`src/app/api/recommendations/route.ts`](../src/app/api/recommendations/route.ts) | API route: fetches Convex, llama a Gemini, inyecta `dislikedCategories`, persiste resultado |
| [`convex/recommendations.ts`](../convex/recommendations.ts) | `getByPersonOccasion`, `upsert`, `removeIdea` (actualiza `discardedTitles` + `dislikedCategories`) |
| [`convex/savedIdeas.ts`](../convex/savedIdeas.ts) | `save`, `remove`, `getByPerson` — ideas que el usuario quiere recordar (👍) |
| [`convex/recommendationUsage.ts`](../convex/recommendationUsage.ts) | Rate limit: `check` (query sin efecto) + `consume` (mutation, solo tras éxito) |
| [`src/lib/gifts.ts`](../src/lib/gifts.ts) | Tipo `GiftRecommendation`, schema Zod (incluye `suggestedStores`); reexporta el catálogo |
| [`src/lib/giftCatalog.ts`](../src/lib/giftCatalog.ts) | Constante `GIFT_TYPES`, tipo `GiftType` y claves `GIFT_IMAGE_KEYS`, sin zod para que el cliente no lo arrastre |
| [`src/lib/stores.ts`](../src/lib/stores.ts) | `STORE_IDS`, `STORE_LABELS`, `generateStoreSearchUrl`, `pickEffectiveStores`, `sanitizeFavoriteStores` |
| [`src/lib/stores.test.ts`](../src/lib/stores.test.ts) | Tests unitarios de URL building, sanitización y `pickEffectiveStores` |
| [`convex/settings.ts`](../convex/settings.ts) | `getMine` y `setMine` con `favoriteStores`; importa `ALLOWED_STORES` de `validators.ts` |
| [`convex/validators.ts`](../convex/validators.ts) | Allowlist `ALLOWED_STORES`, `validateRecommendationIdeas` y `validateSavedIdeaInput` |
| [`src/app/(app)/settings/page.tsx`](../src/app/%28app%29/settings/page.tsx) | UI de selector de tiendas favoritas (4 checkboxes) |

---

## Mejoras pendientes

- **Afiliación**: añadir parámetros de afiliado por tienda en `generateStoreSearchUrl` cuando haya cuentas (Amazon Associates, AliExpress Affiliate, etc.).
- **Recordatorios escalonados**: no relacionado con IA, pero la estructura de `importantDates` ya lo soporta.

---

## Verificación manual

### Flujo base
- [ ] Crear persona con intereses y **añadir una fecha con presupuesto definido**
- [ ] Añadir 1-2 marcas favoritas (en el alta o en la ficha) → al generar ideas físicas, algunas (no todas) mencionan la marca y su `amazonQuery` la incluye; ninguna marca aparece como badge de categoría
- [ ] Ir a `/seres-queridos/[personId]/gifts`, el `<Select>` muestra los eventos con presupuesto
- [ ] Seleccionar evento → botón "Generar" se activa
- [ ] Click en "Generar" → aparecen 9 skeletons con fondo visible mientras carga
- [ ] Aparecen 9 tarjetas con título, badge de categoría, precio y chips de tienda
- [ ] Volver a la pantalla sin regenerar → las ideas cacheadas aparecen y el botón dice "Regenerar"
- [ ] Pulsar 👎 en una tarjeta → desaparece, toast "Descartada — la IA evitará ideas parecidas" con "Deshacer"
- [ ] Pulsar "Deshacer" → la tarjeta vuelve a su posición
- [ ] Cerrar el toast manualmente → la idea se elimina de Convex (verificar en dashboard de Convex)
- [ ] Navegar fuera de la pantalla con toasts abiertos → las ideas pendientes se eliminan de Convex al desmontar
- [ ] Pulsar 👍 en una tarjeta → el icono pasa a relleno (filled), toast "Idea guardada en la ficha de [nombre]"
- [ ] Pulsar 👍 de nuevo en la misma idea (ya guardada) → no lanza error (rate limit no se toca al duplicar en mismo set)
- [ ] Recargar la página (o salir y volver) → las ideas con 👍 siguen rellenas (estado persistido, no solo local)
- [ ] Pulsar 👎 en una idea ya guardada con 👍 y cerrar el toast → desaparece de sugerencias **y** de "Ideas guardadas" de la ficha
- [ ] Pulsar 👎 en una idea guardada y luego "Deshacer" → vuelve y sigue guardada en la ficha (no se borró)
- [ ] Regenerar ideas → las nuevas tarjetas salen hollow (títulos nuevos; `savedTitles` se resetea). Si una coincide en título con una ya guardada para esa ocasión, sale relleno (persistencia)
- [ ] Ir a la ficha de la persona → aparece sección "Ideas guardadas" con las ideas marcadas con 👍, su badge de marca favorita y, en físicas, el botón a la tienda de la marca
- [ ] Pulsar "Lo regalé →" en una idea guardada → se abre el diálogo con nombre y ocasión pre-rellenados
- [ ] Confirmar conversión → la idea desaparece de "Ideas guardadas" y aparece en el historial de regalos

### Multi-tienda
- [ ] En `/settings` aparece la sección "Tiendas para recomendaciones" con 7 checkboxes (todas marcadas por defecto)
- [ ] Desmarcar todas y pulsar "Guardar" → toast de error "Selecciona al menos una tienda", no se guarda
- [ ] Marcar solo Amazon + ECI, guardar, recargar → la selección persiste
- [ ] Generar 9 ideas físicas → cada tarjeta muestra solo chips de Amazon/ECI (no AliExpress/Miravia)
- [ ] Generar 9 ideas con un mix temático (gourmet + tech + algo artesanal) y revisar que **no todas las tarjetas muestran las mismas tiendas** (la IA filtra por idea)
- [ ] Marcar solo AliExpress + Miravia y generar una idea de gourmet/vino → debería aparecer el hint "Búsqueda genérica — esta idea encaja mejor en otras tiendas" (la IA habrá sugerido `amazon`/`elcorteingles`, sin solapamiento)
- [ ] Click en cada chip abre la búsqueda real de esa tienda con la query correcta
- [ ] Cambiar el tipo a "experiencia" o "tiempo-juntos" → solo aparece el botón único a Google, sin chips de tienda
- [ ] Las ideas cacheadas pre-multi-tienda (sin `suggestedStores`) deberían mostrar todas las favoritas del usuario sin hint hasta que se regeneren

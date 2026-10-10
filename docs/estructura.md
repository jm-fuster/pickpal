# Estructura del proyecto

> Regenerado contra el código el 20-sep-2026. La versión anterior describía
> `/dashboard` y `/people/*`, rutas que se renombraron a `/agenda` y
> `/seres-queridos/*`, y un `middleware.ts` que en Next 16 se llama `proxy.ts`.
> Si vuelve a desviarse, la fuente de verdad son `npm run build` para las rutas y
> `convex/schema.ts` para las tablas.

```
pickpal/
├── convex/                          # backend: base de datos y lógica de servidor
│   ├── schema.ts                    # las 13 tablas
│   ├── auth.ts                      # requireUser(ctx) → identity.subject
│   ├── auth.config.ts               # valida el JWT de Clerk (plantilla "convex")
│   ├── validators.ts                # revalidación server-side; espeja los Zod de src/lib
│   ├── people.ts                    # personas
│   ├── importantDates.ts            # fechas de cada persona
│   ├── recommendations.ts           # tandas de ideas generadas (upsert revalidado)
│   ├── recommendationUsage.ts       # cuota de IA: reserve / refund atómicos
│   ├── rateLimit.ts                 # contador genérico por (usuario, día, cubo)
│   ├── savedIdeas.ts                # ideas guardadas con el pulgar arriba
│   ├── giftHistory.ts               # qué se regaló y cómo sentó
│   ├── personShares.ts              # compartir fichas: invitados y comprobación de acceso
│   ├── lists.ts                     # «Mi lista»: elementos, quién la ve y marcas
│   ├── settings.ts                  # userSettings: tema, avisos, tiendas
│   ├── notifications.ts             # internal: qué eventos tocan por email hoy
│   ├── emails.ts                    # internal: envío por la API REST de Resend
│   ├── crons.ts                     # cron diario 08:00 UTC
│   ├── account.ts                   # borrado en cascada de la cuenta
│   ├── migrations.ts                # migraciones de datos puntuales
│   └── _generated/                  # lo genera el CLI de Convex
│
├── src/
│   ├── proxy.ts                     # Next 16 renombró middleware.ts → proxy.ts.
│   │                                # Denegar por defecto + CSRF por Sec-Fetch-Site
│   ├── app/
│   │   ├── layout.tsx               # ClerkProvider + tema + fuentes
│   │   ├── fonts.ts                 # Geist Mono, sin precarga: se importa donde se usa
│   │   ├── page.tsx                 # landing pública, estática (con sesión, el proxy
│   │   │                            # redirige a /agenda)
│   │   ├── manifest.ts              # PWA
│   │   ├── privacidad/ terminos/    # páginas legales — públicas a propósito
│   │   │
│   │   ├── (auth)/                  # sign-in y sign-up de Clerk
│   │   │
│   │   ├── (app)/                   # todo lo de aquí exige sesión
│   │   │   ├── layout.tsx           # Convex, sidebar, campana, enlace de salto
│   │   │   ├── agenda/              # lo que llega en los próximos 4 meses
│   │   │   ├── seres-queridos/
│   │   │   │   ├── page.tsx         # la lista
│   │   │   │   ├── new/             # alta
│   │   │   │   └── [personId]/
│   │   │   │       ├── page.tsx     # ficha: se edita en la propia página
│   │   │   │       ├── edit/        # solo redirige a la ficha
│   │   │   │       └── gifts/       # panel de ideas
│   │   │   ├── mi-lista/            # lo que te haría ilusión, y con quién la compartes
│   │   │   └── settings/
│   │   │
│   │   └── api/
│   │       ├── recommendations/     # generación de ideas con Gemini
│   │       ├── people/[personId]/share/  # compartir una ficha por email
│   │       ├── lista/share/         # compartir tu lista por email
│   │       └── account/delete/      # purga Convex y luego borra el usuario Clerk
│   │
│   ├── components/
│   │   ├── ui/                      # primitivas Base UI, convenciones shadcn
│   │   ├── layout/                  # Sidebar, NotificationBell, SessionGuard
│   │   ├── landing/                 # ilustraciones de los tres pasos
│   │   ├── dashboard/               # tarjetas y agrupación de la agenda. La carpeta
│   │   │                            # conservó el nombre viejo de la ruta (/dashboard
│   │   │                            # → /agenda); no hay ningún dashboard
│   │   ├── people/                  # formularios, tags, avatar, presupuesto
│   │   ├── lista/                   # «Mi lista»: formulario, quién la ve, tarjeta y sección de la ficha
│   │   └── gifts/                   # panel y tarjetas de ideas
│   │
│   └── lib/                         # utilidades puras, con tests al lado
│       ├── gifts.ts                 # esquemas Zod de generación
│       ├── giftCatalog.ts           # tipos de regalo y claves de imagen, sin zod
│       ├── schemas.ts               # esquemas de formulario
│       ├── options.ts               # relaciones y reacciones, sin zod
│       ├── zod.ts                   # la parte de zod que usan los schemas del cliente
│       ├── stores.ts                # las 11 tiendas, sus URLs de búsqueda y sus dominios
│       ├── links.ts                 # enlaces de «Mi lista»: normalizar, validar, dominio
│       ├── brands.ts                # resolución de tienda de marca
│       ├── interests.ts             # catálogo local de ~130 intereses
│       ├── giftImages.ts            # clave de imagen → icono y tinte
│       ├── dates.ts                 # cálculo de la próxima ocurrencia
│       ├── errors.ts                # clasifica fallos del proveedor, sin filtrar
│       └── utils.ts
│
├── design/                          # volcado de tokens de Figma y divergencias
├── docs/                            # esta carpeta
└── scripts/                         # token-map.mjs, screenshots.mjs
```

## Schema de base de datos (Convex)

Trece tablas. Casi todas llevan el `clerkUserId` de su dueño o autor
denormalizado para comprobar el acceso en cada función; `importantDates` cuelga
de la persona y hereda de ella el control de acceso, y las tres de «Mi lista»
llevan `ownerClerkUserId` (y `readerClerkUserId` las de permisos y marcas). El detalle de campos vive en
[`convex/schema.ts`](../convex/schema.ts) — aquí solo el mapa, para que no se
desincronice otra vez.

| Tabla | Para qué | Índices |
|---|---|---|
| `people` | La ficha: nombre, relación, intereses, marcas, notas, tallas, alergias, avatar | `by_user` |
| `importantDates` | Fecha con etiqueta, día/mes, año opcional, recurrencia y presupuesto | `by_person` |
| `userSettings` | Tema, avisos por email y su antelación, tiendas favoritas | `by_user` |
| `emailNotifications` | Deduplicación de envíos por `(fecha, año, antelación)` | `by_date_year`, `by_date_year_lead`, `by_user` |
| `recommendationUsage` | Cuota de IA: 10 generaciones por usuario y día UTC | `by_user_day` |
| `rateLimitBuckets` | Contador genérico por cubo y día: personas, fechas, ideas guardadas, invitaciones y «Mi lista». Las cifras, en [`security.md`](security.md) §4 | `by_user_day_bucket` |
| `recommendations` | La tanda generada, cacheada por persona, ocasión y tipo | `by_user_person_occasion_type`, `by_person` |
| `savedIdeas` | Ideas guardadas con el pulgar arriba | `by_person`, `by_user` |
| `giftHistory` | Qué se regaló, en qué año y qué cara puso | `by_person` |
| `personShares` | Con quién más se comparte una ficha | `by_person`, `by_person_and_user`, `by_user` |
| `listItems` | Lo que un usuario apunta en «Mi lista» | `by_owner` |
| `listShares` | Quién puede leer cada lista y en qué ficha la guardó | `by_owner`, `by_reader`, `by_owner_and_reader`, `by_person` |
| `listClaims` | Marcas de «Lo regalo yo»; el dueño de la lista nunca las ve | `by_item`, `by_reader`, `by_owner_and_reader` |

**Decisiones de diseño:**

- El **presupuesto va en la fecha, no en la persona**: cada ocasión tiene el suyo,
  porque no se gasta igual en un cumpleaños que en un detalle de Navidad. Se
  guarda en céntimos para no arrastrar decimales.
- Las fechas almacenan `month` + `day`, y `year` es opcional: presente marca un
  evento puntual, ausente lo repite cada año.
- `interests` es un array nativo de Convex, sin serializar a JSON.
- `userSettings` lleva **dos** ventanas de aviso separadas: `notifyDaysBefore`
  para la campana y `emailNotifyDaysBefore` para el correo. El razonamiento está
  en [`email-notifications.md`](email-notifications.md). Ojo: la primera hoy no
  tiene control en ninguna pantalla, aunque el servidor acepte de 1 a 365.
- `recommendationUsage` se reserva **antes** de llamar al modelo y se devuelve si
  algo falla, en vez de consumir después. Detalle en [`security.md`](security.md).

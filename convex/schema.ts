import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Foto de stock (Pexels) adjuntada server-side a una idea. Opcional en todos
// los documentos: sin foto, la card usa la cabecera de icono (imageKey).
const ideaImageValidator = v.object({
  url: v.string(),
  photographer: v.optional(v.string()),
  photographerUrl: v.optional(v.string()),
});

export default defineSchema({
  people: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    relationship: v.string(),
    interests: v.array(v.string()),
    favoriteBrands: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
    shoeSize: v.optional(v.string()),
    clothingSize: v.optional(v.string()),
    allergies: v.optional(v.string()),
    dislikes: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }).index("by_user", ["clerkUserId"]),

  importantDates: defineTable({
    personId: v.id("people"),
    label: v.string(),
    month: v.number(),
    day: v.number(),
    year: v.optional(v.number()),
    recurring: v.optional(v.boolean()),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
  }).index("by_person", ["personId"]),

  userSettings: defineTable({
    clerkUserId: v.string(),
    notifyDaysBefore: v.number(),
    emailNotificationsEnabled: v.optional(v.boolean()),
    // Backward-compat: docs anteriores a la migración a multi-trigger guardan
    // un único número. Nuevos docs guardan un array. Los lectores normalizan.
    emailNotifyDaysBefore: v.optional(
      v.union(v.number(), v.array(v.number())),
    ),
    email: v.optional(v.string()),
    favoriteStores: v.optional(v.array(v.string())),
  }).index("by_user", ["clerkUserId"]),

  emailNotifications: defineTable({
    clerkUserId: v.string(),
    importantDateId: v.id("importantDates"),
    occurrenceYear: v.number(),
    // Antelación con la que se envió este aviso (0/2/7/14). Optional para
    // documentos previos a la migración multi-trigger; los nuevos siempre lo
    // tienen. La dedupe se hace por (dateId, year, leadDays).
    leadDays: v.optional(v.number()),
    sentAt: v.number(),
  })
    .index("by_date_year", ["importantDateId", "occurrenceYear"])
    .index("by_date_year_lead", [
      "importantDateId",
      "occurrenceYear",
      "leadDays",
    ])
    .index("by_user", ["clerkUserId"]),

  recommendationUsage: defineTable({
    clerkUserId: v.string(),
    day: v.string(), // "YYYY-MM-DD" en UTC
    count: v.number(),
  }).index("by_user_day", ["clerkUserId", "day"]),

  rateLimitBuckets: defineTable({
    clerkUserId: v.string(),
    day: v.string(), // "YYYY-MM-DD" en UTC
    bucket: v.string(), // p.ej. "create_person", "create_date"
    count: v.number(),
  }).index("by_user_day_bucket", ["clerkUserId", "day", "bucket"]),

  recommendations: defineTable({
    clerkUserId: v.string(),
    personId: v.id("people"),
    occasionLabel: v.string(),
    giftType: v.string(),
    ideas: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        priceMinEuros: v.number(),
        priceMaxEuros: v.number(),
        category: v.union(v.string(), v.array(v.string())),
        amazonQuery: v.string(),
        suggestedStores: v.optional(v.array(v.string())),
        // Clave del catálogo visual de la card (allowlist en validators.ts).
        // Opcional: las ideas generadas antes de este campo no lo tienen.
        imageKey: v.optional(v.string()),
        image: v.optional(ideaImageValidator),
        // Tienda oficial de cada marca favorita matcheada, resuelta vía
        // Brandfetch (dominio + logo). Opcional: ideas previas a este campo o
        // sin marca resuelta no lo tienen. Validado en validateRecommendationIdeas.
        matchedBrandStores: v.optional(
          v.array(
            v.object({
              brand: v.string(),
              domain: v.string(),
              logoUrl: v.optional(v.string()),
              supportsSearch: v.optional(v.boolean()),
            }),
          ),
        ),
      }),
    ),
    discardedTitles: v.optional(v.array(v.string())),
    dislikedCategories: v.optional(v.array(v.string())),
  })
    .index("by_user_person_occasion_type", [
      "clerkUserId",
      "personId",
      "occasionLabel",
      "giftType",
    ])
    .index("by_person", ["personId"]),

  savedIdeas: defineTable({
    clerkUserId: v.string(),
    personId: v.id("people"),
    // Foto del nombre del evento en el momento de guardar. Ninguna pantalla lo
    // lee desde que la idea apunta al evento por `importantDateId`, y mover la
    // idea no lo actualiza (docs/encargo-ocasiones.md, decisión 4).
    occasionLabel: v.string(),
    // Evento de la ficha en el que está la idea. Vacío = «Sin ocasión»: ideas
    // movidas ahí a mano, ideas cuyo evento se borró y las viejas que la
    // migración no pudo emparejar por nombre.
    importantDateId: v.optional(v.id("importantDates")),
    title: v.string(),
    description: v.string(),
    priceMinEuros: v.number(),
    priceMaxEuros: v.number(),
    category: v.union(v.string(), v.array(v.string())),
    amazonQuery: v.string(),
    suggestedStores: v.optional(v.array(v.string())),
    // Tipo de regalo (fisica/experiencia/tiempo-juntos/sorprendeme). Opcional:
    // los documentos guardados antes de este campo no lo tienen y se tratan
    // como físicos (fallback) en la UI.
    giftType: v.optional(v.string()),
    // Clave del catálogo visual (allowlist en validators.ts). Opcional: las
    // ideas guardadas antes de este campo caen al fallback por tipo de regalo.
    imageKey: v.optional(v.string()),
    image: v.optional(ideaImageValidator),
    // Snapshot de la tienda oficial de cada marca matcheada al guardar (mismo
    // shape que en `recommendations`). Opcional: ideas guardadas antes de este
    // campo, o sin marca resuelta, caen al botón de búsqueda de marca (Capa 0).
    // Validado en validateSavedIdeaInput.
    matchedBrandStores: v.optional(
      v.array(
        v.object({
          brand: v.string(),
          domain: v.string(),
          logoUrl: v.optional(v.string()),
          supportsSearch: v.optional(v.boolean()),
        }),
      ),
    ),
  })
    .index("by_person", ["personId"])
    .index("by_user", ["clerkUserId"])
    // Para que borrar un evento encuentre sus ideas sin recorrer la ficha.
    .index("by_important_date", ["importantDateId"]),

  giftHistory: defineTable({
    // Quién lo registró, no necesariamente quién es dueño de la persona:
    // compartir una ficha permite que cualquiera con acceso añada entradas.
    clerkUserId: v.string(),
    personId: v.id("people"),
    giftName: v.string(),
    occasionLabel: v.string(),
    year: v.optional(v.number()),
    reaction: v.union(
      v.literal("loved"),
      v.literal("ok"),
      v.literal("bad"),
    ),
    notes: v.optional(v.string()),
  }).index("by_person", ["personId"]),

  // Tabla de enlace que convierte la propiedad de `people` en muchos-a-muchos.
  // El dueño sigue siendo `people.clerkUserId`; esta tabla solo guarda a quién
  // más se le ha dado acceso. `role` es literal por ahora (un único nivel de
  // permiso: acceso completo salvo borrar la ficha para todos), pero queda
  // como columna propia por si algún día hace falta diferenciar niveles.
  personShares: defineTable({
    personId: v.id("people"),
    clerkUserId: v.string(),
    role: v.literal("invitee"),
  })
    .index("by_person", ["personId"])
    .index("by_person_and_user", ["personId", "clerkUserId"])
    .index("by_user", ["clerkUserId"]),

  // «Mi lista» (docs/encargo-lista.md): lo que un usuario apunta que le haría
  // ilusión recibir. Una lista por usuario, así que no hay tabla de listas: el
  // dueño de cada elemento es la propia lista.
  listItems: defineTable({
    ownerClerkUserId: v.string(),
    title: v.string(),
    url: v.optional(v.string()),
    note: v.optional(v.string()),
    // Solo existe si el dueño lo editó alguna vez. Quien lo había marcado ve
    // un aviso si es posterior a su `listClaims.ackAt` (decisión 15).
    editedAt: v.optional(v.number()),
  }).index("by_owner", ["ownerClerkUserId"]),

  // Quién puede leer cada lista. El acceso se comprueba siempre contra esta
  // tabla, nunca contra el acceso a la ficha asociada (decisión 12).
  listShares: defineTable({
    ownerClerkUserId: v.string(),
    readerClerkUserId: v.string(),
    // Copiados del JWT del dueño al conceder el acceso: Convex no guarda
    // nombres de usuario y la tarjeta de lista recibida los necesita.
    ownerName: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    // Ficha del lector a la que la ha asociado. Si deja de tener acceso a
    // ella, se trata como sin asociar al leer (decisión 11).
    personId: v.optional(v.id("people")),
  })
    .index("by_owner", ["ownerClerkUserId"])
    .index("by_reader", ["readerClerkUserId"])
    .index("by_owner_and_reader", ["ownerClerkUserId", "readerClerkUserId"])
    .index("by_person", ["personId"]),

  // Marcas de «Lo regalo yo». Nunca se devuelven al dueño de la lista, ni en
  // la app ni en su exportación (decisiones 7 y 21).
  listClaims: defineTable({
    ownerClerkUserId: v.string(),
    readerClerkUserId: v.string(),
    // Vacío cuando el dueño borró el elemento marcado: quien lo marcó lo
    // sigue viendo desde `snapshot` hasta que quita la marca (decisión 14).
    itemId: v.optional(v.id("listItems")),
    status: v.union(v.literal("marked"), v.literal("given")),
    ackAt: v.number(),
    snapshot: v.optional(
      v.object({
        title: v.string(),
        url: v.optional(v.string()),
        note: v.optional(v.string()),
      }),
    ),
  })
    .index("by_item", ["itemId"])
    .index("by_reader", ["readerClerkUserId"])
    .index("by_owner_and_reader", ["ownerClerkUserId", "readerClerkUserId"]),

  // Cuándo se avisó por última vez por correo a un lector de que un dueño le
  // compartió su lista. Va aparte de `listShares` porque esa fila se borra al
  // dejar la lista o perder el acceso, y el tope de un aviso cada 30 días por
  // pareja tiene que sobrevivir a eso: si no, invitar, que pulsen «No me
  // interesa» y volver a invitar sería una forma de mandar correos sin límite.
  listInviteEmails: defineTable({
    ownerClerkUserId: v.string(),
    readerClerkUserId: v.string(),
    sentAt: v.number(),
  })
    .index("by_owner_and_reader", ["ownerClerkUserId", "readerClerkUserId"])
    .index("by_reader", ["readerClerkUserId"]),
});

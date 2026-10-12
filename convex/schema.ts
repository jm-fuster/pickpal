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
    // «Lo que más ilusión te haría»: como mucho 5 por lista, con el tope en
    // `lists.setFavorite`. Vacío = no lo es. Cambiarlo no pone `editedAt`: no
    // es una edición del elemento, y quien lo había marcado no tiene por qué
    // ver «lo ha cambiado».
    favorite: v.optional(v.boolean()),
    // «Unos 40 €»: precio aproximado en céntimos de euro, entero entre 1 y
    // 1.000.000 (`validateListItemPrice`). Vacío = sin precio. Lo escribe el
    // dueño a mano; el servidor nunca lo saca del enlace (decisión 3).
    priceCents: v.optional(v.number()),
    // Foto que sube el dueño (nunca copiada de la tienda: el servidor no abre
    // enlaces). `lists.setItemPhoto` comprueba tipo y tamaño en los metadatos
    // de `_storage` y que ninguna otra fila use ya ese archivo; quitar la foto,
    // borrar el elemento o la cuenta borran el archivo. La copia que guarda
    // una marca al borrar el elemento nunca lleva foto.
    photoStorageId: v.optional(v.id("_storage")),
    // Orden a mano («Subir»/«Bajar»). El orden efectivo es `position ??
    // -_creationTime`, ascendente: lo nuevo, sin `position`, sale arriba, y
    // `lists.moveItem` intercambia ese valor con el vecino del mismo grupo.
    // Mover no pone `editedAt`.
    position: v.optional(v.number()),
  })
    .index("by_owner", ["ownerClerkUserId"])
    // Para que dos elementos no compartan archivo: si no, quitar la foto de
    // uno borraría la del otro.
    .index("by_photo", ["photoStorageId"]),

  // «Una nota para quien te regala»: un texto del dueño para todos sus
  // lectores (tallas, «nada de plástico»…), y desde la fase 3 también su
  // cumpleaños. Como mucho una fila por dueño, que `lists.setAbout` y
  // `lists.setBirthday` reescriben; se borra cuando no queda ni nota ni
  // cumpleaños. Se lee con el mismo permiso que la lista (`listShares`), nunca
  // por la ficha.
  listAbout: defineTable({
    ownerClerkUserId: v.string(),
    // Opcional desde que la fila puede guardar solo el cumpleaños.
    note: v.optional(v.string()),
    // Día y mes, sin año: lo que hace falta para acordarse, no la edad. El 29
    // de febrero vale (`validateBirthday`).
    birthdayMonth: v.optional(v.number()),
    birthdayDay: v.optional(v.number()),
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
    // El lector bloqueó a este dueño (`listBlocks`) antes de que le volviera a
    // compartir la lista. La fila existe para que al dueño todo le salga igual
    // que sin bloqueo (cuenta para el tope de 20, sale en `myReaders`), pero
    // al lector no le llega por ningún sitio. `lists.unblock` la destapa.
    hidden: v.optional(v.boolean()),
  })
    .index("by_owner", ["ownerClerkUserId"])
    .index("by_reader", ["readerClerkUserId"])
    .index("by_owner_and_reader", ["ownerClerkUserId", "readerClerkUserId"])
    .index("by_person", ["personId"]),

  // Dueños de los que un lector no quiere recibir más listas. El dueño no lo
  // sabe nunca: ni un error, ni un contador, ni una línea en su exportación.
  // Nombre y email se copian de la fila de `listShares` al bloquear, para que
  // el lector sepa a quién tiene bloqueado cuando esa fila ya no existe.
  listBlocks: defineTable({
    readerClerkUserId: v.string(),
    ownerClerkUserId: v.string(),
    ownerName: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
  })
    .index("by_reader", ["readerClerkUserId"])
    .index("by_reader_and_owner", ["readerClerkUserId", "ownerClerkUserId"])
    .index("by_owner", ["ownerClerkUserId"]),

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
        // «Ya lo tengo»: el dueño lo quitó porque ya lo tiene, y quien lo
        // había marcado ve «Ya lo tiene» en vez de «Ya no está en su lista».
        // Solo vive en esta copia: al dueño no se le dice si había marca.
        reason: v.optional(v.literal("got")),
      }),
    ),
    // «Lo regalo yo · para…»: la fecha de la ficha del lector para la que lo
    // guarda. Solo la escribe y la lee quien marcó; se resuelve al leer, y si
    // la fecha se borró o el lector ya no ve la ficha, sale como sin ocasión.
    importantDateId: v.optional(v.id("importantDates")),
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
    // El lector tenía bloqueado al dueño y el último correo no salió, aunque
    // el plazo se apunta igual para que el dueño no note nada. Entonces
    // `deliveredAt` guarda cuándo salió de verdad el anterior, si salió. Solo
    // los mira la exportación del lector, para no decirle que le avisaron
    // cuando no.
    suppressed: v.optional(v.boolean()),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_owner_and_reader", ["ownerClerkUserId", "readerClerkUserId"])
    .index("by_reader", ["readerClerkUserId"]),
});

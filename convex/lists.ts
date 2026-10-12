import { v, ConvexError } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./auth";
import { checkAndIncrement } from "./rateLimit";
import {
  isAllowedListPhoto,
  validateBirthday,
  validateListItemInput,
  validateListItemPrice,
} from "./validators";
import { INVITE_LOOKUP_DAILY_LIMIT, personHasAccess } from "./personShares";
import { internal } from "./_generated/api";

/**
 * «Mi lista»: lo que un usuario apunta que le haría ilusión recibir, y quién
 * puede leerlo. Las decisiones numeradas que se citan aquí son las de
 * docs/encargo-lista.md.
 *
 * Hay tres públicos y cada función sirve solo a uno:
 * - **El dueño** ve sus elementos, su «nota para quien te regala» y a quién se
 *   los ha compartido. Nada de lo que le llega lee `listClaims` (decisión 7).
 * - **El lector** ve la lista y la nota por el permiso que le dio el dueño
 *   (`listShares`), nunca por tener acceso a la ficha a la que la asoció
 *   (decisión 12). Ve qué está cogido, pero no por quién (decisión 13), y en
 *   «Lo que vas a regalar» solo sus propias marcas.
 * - **Nadie más** ve nada, ni siquiera que la lista existe.
 *
 * Un lector puede bloquear a un dueño (`leaveAndBlock`). El dueño no lo nota
 * nunca: si vuelve a compartirle la lista, la fila de `listShares` se crea
 * igual, con `hidden`, y al lector no le llega por ningún sitio.
 */

export const MAX_ITEMS_PER_LIST = 100;
export const MAX_READERS_PER_LIST = 20;
// «Lo que más ilusión te haría». Sin tope, la señal se diluye.
export const MAX_FAVORITES = 5;
const CREATE_ITEM_DAILY_LIMIT = 100;
// Una unidad por importación, no por fila: fila a fila, una lista de 100
// gastaría el cupo diario entero de `create_list_item`.
export const IMPORT_DAILY_LIMIT = 5;
const CLAIM_DAILY_LIMIT = 100;
const INVITE_LIST_DAILY_LIMIT = 20;
const MAX_CLERK_ID_LENGTH = 100;
const MAX_OWNER_NAME = 80;
// Listas que te han compartido. No tiene tope propio (cada dueño elige a
// quién), así que se acota la lectura.
const MAX_SHARES_READ = 100;
// Como mucho un correo de aviso por pareja (dueño, lector) en este plazo.
export const INVITE_EMAIL_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
// «Una nota para quien te regala»: unas líneas, no una carta.
export const MAX_ABOUT_LENGTH = 300;
// «Lo que vas a regalar»: tus marcas en todas las listas que te comparten.
// Cada lista aporta como mucho una por elemento, así que se acota la lectura.
const MAX_GIFTS_READ = 200;
// Fotos de los elementos: una subida por foto, y la página la vuelve a
// codificar antes de subirla. Treinta al día dan para rehacer media lista.
export const PHOTO_UPLOAD_DAILY_LIMIT = 30;
// Bloqueos de un lector. No tienen tope propio (salen de listas que alguien te
// compartió), así que se acota la lectura.
const MAX_BLOCKS_READ = 100;
// Fechas de una ficha que se ofrecen en «Lo regalo yo · para…».
const MAX_OCCASIONS_READ = 50;
// Barrido de fotos sin elemento (`sweepOrphanPhotos`).
const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;
const ORPHAN_SWEEP_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const ORPHAN_SWEEP_BATCH = 200;
const PHOTO_REJECTED = "Esa foto no vale: tiene que ser JPG, PNG o WebP de menos de 1,5 MB.";

// ─── Helpers de acceso ───────────────────────────────────────────────────────

async function findShare(
  ctx: QueryCtx | MutationCtx,
  ownerClerkUserId: string,
  readerClerkUserId: string,
) {
  return ctx.db
    .query("listShares")
    .withIndex("by_owner_and_reader", (q) =>
      q
        .eq("ownerClerkUserId", ownerClerkUserId)
        .eq("readerClerkUserId", readerClerkUserId),
    )
    .unique();
}

/**
 * El permiso de lectura tal como lo ve el lector: una fila oculta (la lista de
 * alguien a quien bloqueó) es como si no existiera. Todo lo que sirve al
 * lector entra por aquí o por `assertListReader`. `findShare` a secas queda
 * para el lado del dueño, que ve la fila igual esté oculta o no (`grantAccess`
 * y `sharedBack`, que mira tu propia lista), y para `unblock`, que busca
 * justo la oculta.
 */
async function visibleShare(
  ctx: QueryCtx | MutationCtx,
  ownerClerkUserId: string,
  readerClerkUserId: string,
) {
  const share = await findShare(ctx, ownerClerkUserId, readerClerkUserId);
  return share && share.hidden !== true ? share : null;
}

/**
 * El permiso de lectura de `clerkUserId`. Mismo mensaje si no existe, si es
 * de otro o si está oculto: el cliente no distingue los casos
 * (docs/security.md §5).
 */
async function assertListReader(
  ctx: QueryCtx | MutationCtx,
  shareId: Id<"listShares">,
  clerkUserId: string,
): Promise<Doc<"listShares">> {
  const share = await ctx.db.get(shareId);
  if (!share || share.readerClerkUserId !== clerkUserId || share.hidden === true) {
    throw new ConvexError("Lista no encontrada.");
  }
  return share;
}

async function blockOf(
  ctx: QueryCtx | MutationCtx,
  readerClerkUserId: string,
  ownerClerkUserId: string,
) {
  return ctx.db
    .query("listBlocks")
    .withIndex("by_reader_and_owner", (q) =>
      q
        .eq("readerClerkUserId", readerClerkUserId)
        .eq("ownerClerkUserId", ownerClerkUserId),
    )
    .first();
}

async function assertOwnItem(
  ctx: MutationCtx,
  itemId: Id<"listItems">,
  clerkUserId: string,
): Promise<Doc<"listItems">> {
  const item = await ctx.db.get(itemId);
  if (!item || item.ownerClerkUserId !== clerkUserId) {
    throw new ConvexError("Elemento no encontrado.");
  }
  return item;
}

/** Las marcas de un lector se borran al perder el acceso (decisión 17), así
 * que una marca que existe y es tuya implica que sigues teniendo permiso. */
async function assertOwnClaim(
  ctx: MutationCtx,
  claimId: Id<"listClaims">,
  clerkUserId: string,
): Promise<Doc<"listClaims">> {
  const claim = await ctx.db.get(claimId);
  if (!claim || claim.readerClerkUserId !== clerkUserId) {
    throw new ConvexError("Marca no encontrada.");
  }
  return claim;
}

/**
 * La ficha a la que el lector asoció la lista, si todavía puede verla. Un
 * lector pierde el acceso a una ficha por varios caminos (`people.remove`,
 * `personShares.leave`, la transferencia al borrar una cuenta); en vez de
 * engancharse a todos, la asociación se valida al leer (decisión 11).
 */
async function validPersonId(
  ctx: QueryCtx | MutationCtx,
  share: Doc<"listShares">,
): Promise<Id<"people"> | null> {
  if (!share.personId) return null;
  const person = await ctx.db.get(share.personId);
  return (await personHasAccess(ctx, person, share.readerClerkUserId))
    ? share.personId
    : null;
}

async function deleteClaimsBetween(
  ctx: MutationCtx,
  ownerClerkUserId: string,
  readerClerkUserId: string,
) {
  const claims = await ctx.db
    .query("listClaims")
    .withIndex("by_owner_and_reader", (q) =>
      q
        .eq("ownerClerkUserId", ownerClerkUserId)
        .eq("readerClerkUserId", readerClerkUserId),
    )
    .collect();
  for (const c of claims) await ctx.db.delete(c._id);
}

/**
 * Dónde va un elemento en su lista, de menor a mayor. Sin orden a mano, el
 * opuesto de cuándo se apuntó: lo más nuevo, arriba. `moveItem` escribe
 * `position` en este mismo espacio de valores, así que lo que se apunta
 * después de mover algo sigue saliendo arriba.
 */
function sortKey(item: Doc<"listItems">) {
  return item.position ?? -item._creationTime;
}

/** Para `Array.sort`: el orden de la lista. También lo usa la exportación. */
export function compareListItems(a: Doc<"listItems">, b: Doc<"listItems">) {
  return sortKey(a) - sortKey(b) || b._creationTime - a._creationTime;
}

/**
 * Los elementos de un dueño en el orden de su lista. Se leen los 100 más
 * nuevos (el tope de la lista) y se ordenan en memoria: `position` es
 * opcional y no puede ir en el índice.
 */
async function ownerItems(
  ctx: QueryCtx | MutationCtx,
  ownerClerkUserId: string,
) {
  const items = await ctx.db
    .query("listItems")
    .withIndex("by_owner", (q) => q.eq("ownerClerkUserId", ownerClerkUserId))
    .order("desc")
    .take(MAX_ITEMS_PER_LIST);
  return items.sort(compareListItems);
}

async function photoUrlOf(ctx: QueryCtx | MutationCtx, item: Doc<"listItems">) {
  return item.photoStorageId ? await ctx.storage.getUrl(item.photoStorageId) : null;
}

/** Borra un archivo de `_storage` si todavía existe. */
async function deleteFileIfExists(ctx: MutationCtx, storageId: Id<"_storage">) {
  if (await ctx.db.system.get("_storage", storageId)) {
    await ctx.storage.delete(storageId);
  }
}

/**
 * La ocasión que el lector puso a su marca, si la fecha sigue existiendo y es
 * de `personId`, la ficha a la que asoció la lista y que todavía ve. Si no,
 * `null`: se resuelve al leer, como la asociación (decisión 11).
 */
async function occasionOf(
  ctx: QueryCtx | MutationCtx,
  claim: Doc<"listClaims">,
  personId: Id<"people"> | null,
) {
  if (!claim.importantDateId || !personId) return null;
  const date = await ctx.db.get(claim.importantDateId);
  return date && date.personId === personId ? date : null;
}

async function claimOf(ctx: QueryCtx | MutationCtx, itemId: Id<"listItems">) {
  // Como mucho una por elemento: `claim` rechaza la segunda.
  return ctx.db
    .query("listClaims")
    .withIndex("by_item", (q) => q.eq("itemId", itemId))
    .first();
}

/** La «nota para quien te regala» de un dueño, como mucho una (`setAbout`). */
async function aboutOf(ctx: QueryCtx | MutationCtx, ownerClerkUserId: string) {
  return ctx.db
    .query("listAbout")
    .withIndex("by_owner", (q) => q.eq("ownerClerkUserId", ownerClerkUserId))
    .unique();
}

/** El cumpleaños guardado en la fila de `listAbout`, o `null`. */
function birthdayOf(about: Doc<"listAbout"> | null) {
  return about?.birthdayMonth !== undefined && about.birthdayDay !== undefined
    ? { month: about.birthdayMonth, day: about.birthdayDay }
    : null;
}

/**
 * Concede a `readerClerkUserId` permiso para leer la lista de quien llama.
 * Compartido por `invite` (email resuelto en la API route) y `shareBack`
 * (cuenta conocida por el permiso recibido, decisión 10).
 *
 * El nombre y el email del dueño salen de su propio JWT, no del cliente: son
 * lo que verá el lector en la tarjeta de lista recibida. El nombre lo elige
 * el propio usuario en Clerk; el email está verificado, y por eso la tarjeta
 * enseña los dos.
 *
 * Un acceso nuevo además avisa al lector por correo (`emailed`), salvo que ya
 * se le avisara de esta misma lista en los últimos 30 días o no tenga email
 * guardado. Si ya tenía acceso no pasa nada: ni fila nueva ni correo.
 *
 * Si el lector había bloqueado a este dueño (`leaveAndBlock`), todo sigue el
 * mismo camino, con el mismo tope, el mismo cupo y el mismo `emailed`, pero
 * la fila nace oculta y el correo no sale. Lo que recibe el dueño no puede
 * depender del bloqueo: si cambiara algo, sabría que le han bloqueado.
 */
async function grantAccess(
  ctx: MutationCtx,
  ownerClerkUserId: string,
  readerClerkUserId: string,
): Promise<{ shareId: Id<"listShares">; emailed: boolean }> {
  if (
    readerClerkUserId.length === 0 ||
    readerClerkUserId.length > MAX_CLERK_ID_LENGTH
  ) {
    throw new ConvexError("Identificador de usuario inválido.");
  }
  if (readerClerkUserId === ownerClerkUserId) {
    throw new ConvexError("No puedes compartir la lista contigo.");
  }

  const existing = await findShare(ctx, ownerClerkUserId, readerClerkUserId);
  if (existing) return { shareId: existing._id, emailed: false };

  const readers = await ctx.db
    .query("listShares")
    .withIndex("by_owner", (q) => q.eq("ownerClerkUserId", ownerClerkUserId))
    .take(MAX_READERS_PER_LIST);
  if (readers.length >= MAX_READERS_PER_LIST) {
    throw new ConvexError(
      `Tu lista ya la ven ${MAX_READERS_PER_LIST} personas, el máximo. Quita a alguien para invitar a otra.`,
    );
  }

  await checkAndIncrement(
    ctx,
    ownerClerkUserId,
    "invite_list",
    INVITE_LIST_DAILY_LIMIT,
  );

  const identity = await ctx.auth.getUserIdentity();
  const name =
    identity?.givenName?.trim() ||
    identity?.name?.trim().split(/\s+/)[0] ||
    undefined;

  const ownerName = name ? name.slice(0, MAX_OWNER_NAME) : undefined;
  const blocked = (await blockOf(ctx, readerClerkUserId, ownerClerkUserId)) !== null;
  const shareId = await ctx.db.insert("listShares", {
    ownerClerkUserId,
    readerClerkUserId,
    ownerName,
    ownerEmail: identity?.email,
    hidden: blocked ? true : undefined,
  });
  const emailed = await scheduleInviteEmail(
    ctx,
    ownerClerkUserId,
    readerClerkUserId,
    ownerName,
    identity?.email,
    !blocked,
  );
  return { shareId, emailed };
}

/**
 * Programa el correo de aviso al lector, como mucho uno cada 30 días por
 * pareja. El plazo se apunta al programarlo, no al enviarlo: si Resend falla,
 * no se reintenta, pero así nadie puede encadenar invitaciones para mandar
 * correos. La dirección sale de `userSettings.email` del lector, que se sella
 * cada vez que entra en la app; nunca de un argumento.
 *
 * Con `send` en falso (el lector bloqueó al dueño) hace las mismas cuentas,
 * apunta el plazo y devuelve lo mismo, pero no programa nada: el dueño ve
 * «le hemos avisado» igual, y el siguiente intento cae en el mismo plazo de
 * 30 días que si el correo hubiera salido.
 */
async function scheduleInviteEmail(
  ctx: MutationCtx,
  ownerClerkUserId: string,
  readerClerkUserId: string,
  ownerName: string | undefined,
  ownerEmail: string | undefined,
  send: boolean,
): Promise<boolean> {
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q) => q.eq("clerkUserId", readerClerkUserId))
    .unique();
  const to = settings?.email;
  if (!to) return false;

  const last = await ctx.db
    .query("listInviteEmails")
    .withIndex("by_owner_and_reader", (q) =>
      q
        .eq("ownerClerkUserId", ownerClerkUserId)
        .eq("readerClerkUserId", readerClerkUserId),
    )
    .unique();
  const now = Date.now();
  if (last && now - last.sentAt < INVITE_EMAIL_COOLDOWN_MS) return false;
  // `suppressed` y `deliveredAt` solo los lee la exportación del lector, para
  // no decirle que le avisaron cuando no y conservar cuándo fue la última vez
  // que sí. Con `send`, los dos se borran al patchear.
  const fields = send
    ? { sentAt: now, suppressed: undefined, deliveredAt: undefined }
    : {
        sentAt: now,
        suppressed: true,
        deliveredAt: last && last.suppressed !== true ? last.sentAt : last?.deliveredAt,
      };
  if (last) {
    await ctx.db.patch(last._id, fields);
  } else {
    await ctx.db.insert("listInviteEmails", {
      ownerClerkUserId,
      readerClerkUserId,
      ...fields,
    });
  }

  if (!send) return true;
  await ctx.scheduler.runAfter(0, internal.emails.sendListInviteEmail, {
    to,
    ownerName,
    ownerEmail,
  });
  return true;
}

function normalizeItem(args: { title: string; url?: string; note?: string }) {
  return {
    title: args.title.trim(),
    url: args.url?.trim() || undefined,
    note: args.note?.trim() || undefined,
  };
}

// ─── El dueño ────────────────────────────────────────────────────────────────

/**
 * Los elementos de tu lista, en el orden de tu lista (`ownerItems`). Solo lee
 * `listItems` y las direcciones de sus fotos: nunca cruza con `listClaims`, ni
 * para un contador.
 */
export const myItems = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    const items = await ownerItems(ctx, clerkUserId);
    return Promise.all(
      items.map(async (i) => ({
        _id: i._id,
        _creationTime: i._creationTime,
        title: i.title,
        url: i.url,
        note: i.note,
        favorite: i.favorite === true,
        priceCents: i.priceCents ?? null,
        photoUrl: await photoUrlOf(ctx, i),
      })),
    );
  },
});

/** Tu «nota para quien te regala», o `null` si no has escrito ninguna. */
export const myAbout = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    return (await aboutOf(ctx, clerkUserId))?.note ?? null;
  },
});

/**
 * Escribe, cambia o borra tu «nota para quien te regala». Vacía (o solo
 * espacios) la quita; la fila se borra si tampoco guarda tu cumpleaños. No
 * lleva cubo de límite diario: reescribe siempre la misma fila, así que
 * repetirla no llena nada (docs/security.md §4). No toca `editedAt` de ningún
 * elemento: a quien había marcado algo no le salta «lo ha cambiado» por
 * cambiar la nota.
 */
export const setAbout = mutation({
  args: { note: v.string() },
  handler: async (ctx, args) => {
    const clerkUserId = await requireUser(ctx);
    const note = args.note.trim();
    if (note.length > MAX_ABOUT_LENGTH) {
      throw new ConvexError("La nota es demasiado larga.");
    }
    const existing = await aboutOf(ctx, clerkUserId);
    if (note.length === 0) {
      if (!existing) return;
      if (existing.birthdayMonth !== undefined) {
        if (existing.note !== undefined) await ctx.db.patch(existing._id, { note: undefined });
      } else {
        await ctx.db.delete(existing._id);
      }
    } else if (existing) {
      if (existing.note !== note) await ctx.db.patch(existing._id, { note });
    } else {
      await ctx.db.insert("listAbout", { ownerClerkUserId: clerkUserId, note });
    }
  },
});

/** Tu cumpleaños tal como lo ven quienes leen tu lista, o `null`. */
export const myBirthday = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    return birthdayOf(await aboutOf(ctx, clerkUserId));
  },
});

/**
 * Pone o quita tu cumpleaños (día y mes, sin año), que ven quienes leen tu
 * lista. Vive en la misma fila que la nota (`listAbout`), así que tampoco
 * gasta cupo ni pone `editedAt`. `null` lo quita, y la fila se borra si
 * tampoco queda nota.
 */
export const setBirthday = mutation({
  args: {
    birthday: v.union(v.object({ month: v.number(), day: v.number() }), v.null()),
  },
  handler: async (ctx, { birthday }) => {
    const clerkUserId = await requireUser(ctx);
    const existing = await aboutOf(ctx, clerkUserId);
    if (birthday === null) {
      if (!existing) return;
      if (existing.note !== undefined) {
        await ctx.db.patch(existing._id, { birthdayMonth: undefined, birthdayDay: undefined });
      } else {
        await ctx.db.delete(existing._id);
      }
      return;
    }
    validateBirthday(birthday.month, birthday.day);
    const fields = { birthdayMonth: birthday.month, birthdayDay: birthday.day };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("listAbout", { ownerClerkUserId: clerkUserId, ...fields });
    }
  },
});

/**
 * A quién has compartido tu lista. Lo consume `src/app/api/lista/share/route.ts`
 * para resolver los emails en Clerk. No dice si cada lector ha asociado la
 * lista a una ficha: eso es cosa de cómo organiza su libreta (decisión 7).
 */
export const myReaders = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    const shares = await ctx.db
      .query("listShares")
      .withIndex("by_owner", (q) => q.eq("ownerClerkUserId", clerkUserId))
      .take(MAX_READERS_PER_LIST);
    return shares.map((s) => ({
      shareId: s._id,
      readerClerkUserId: s.readerClerkUserId,
      since: s._creationTime,
    }));
  },
});

export const addItem = mutation({
  args: {
    title: v.string(),
    url: v.optional(v.string()),
    note: v.optional(v.string()),
    priceCents: v.optional(v.number()),
  },
  handler: async (ctx, { priceCents, ...args }) => {
    const clerkUserId = await requireUser(ctx);
    const item = normalizeItem(args);
    validateListItemInput(item);
    if (priceCents !== undefined) validateListItemPrice(priceCents);

    const existing = await ownerItems(ctx, clerkUserId);
    if (existing.length >= MAX_ITEMS_PER_LIST) {
      throw new ConvexError(
        `Tu lista ya tiene ${MAX_ITEMS_PER_LIST} cosas, el máximo. Quita alguna para apuntar otra.`,
      );
    }

    await checkAndIncrement(
      ctx,
      clerkUserId,
      "create_list_item",
      CREATE_ITEM_DAILY_LIMIT,
    );

    return ctx.db.insert("listItems", {
      ownerClerkUserId: clerkUserId,
      ...item,
      priceCents,
    });
  },
});

/**
 * «Pegar una lista»: apunta de golpe lo que la página de pegar analizó en el
 * navegador. Lo que llega del cliente no es de fiar, así que cada fila pasa la
 * misma validación que `addItem`, y todas antes de insertar ninguna: si una
 * falla, el error lleva su número para que la página la señale. Después el
 * tope de la lista y, solo si cabe todo, la unidad del cupo diario. Cualquier
 * error deshace la mutation entera: nunca queda una importación a medias ni
 * se cobra la unidad.
 *
 * Solo lee `listItems`. Lo importado llega sin estado (ni marcas ni `editedAt`
 * ni «lo que más ilusión»), y los repetidos los avisa la vista previa: aquí no
 * se quitan, igual que en `addItem`.
 */
export const importItems = mutation({
  args: {
    items: v.array(
      v.object({
        title: v.string(),
        url: v.optional(v.string()),
        note: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireUser(ctx);
    if (args.items.length === 0) {
      throw new ConvexError("No hay nada que apuntar.");
    }
    if (args.items.length > MAX_ITEMS_PER_LIST) {
      throw new ConvexError("Son demasiadas cosas de una vez.");
    }

    const rows = args.items.map((raw, i) => {
      const item = normalizeItem(raw);
      try {
        validateListItemInput(item);
      } catch (err) {
        if (err instanceof ConvexError && typeof err.data === "string") {
          throw new ConvexError(`Fila ${i + 1}: ${err.data}`);
        }
        throw err;
      }
      return item;
    });

    const existing = await ownerItems(ctx, clerkUserId);
    const caben = MAX_ITEMS_PER_LIST - existing.length;
    if (rows.length > caben) {
      throw new ConvexError(
        caben <= 0
          ? `Tu lista ya tiene ${MAX_ITEMS_PER_LIST} cosas, el máximo. Quita alguna para apuntar otra.`
          : `${caben === 1 ? "Cabe 1" : `Caben ${caben}`} más. Quítale la casilla a alguna o quita algo de tu lista.`,
      );
    }

    await checkAndIncrement(ctx, clerkUserId, "import_list", IMPORT_DAILY_LIMIT);

    // Al revés, para que la primera línea pegada sea la más nueva y salga
    // arriba (sin `position`, `ownerItems` pone lo más nuevo primero). En el
    // deployment de desarrollo, 30 inserciones en una misma mutation salieron
    // con `_creationTime` distintos y en orden: no hace falta desempatar.
    for (let i = rows.length - 1; i >= 0; i--) {
      await ctx.db.insert("listItems", {
        ownerClerkUserId: clerkUserId,
        ...rows[i],
      });
    }
    return { inserted: rows.length };
  },
});

/**
 * Edita un elemento. `priceCents` tiene tres estados: sin el campo se queda el
 * precio guardado, `null` lo quita y un número lo cambia. Así una pestaña con
 * el código de antes del precio, que no lo manda, no lo borra al guardar.
 */
export const updateItem = mutation({
  args: {
    id: v.id("listItems"),
    title: v.string(),
    url: v.optional(v.string()),
    note: v.optional(v.string()),
    priceCents: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { id, priceCents, ...fields }) => {
    const clerkUserId = await requireUser(ctx);
    const existing = await assertOwnItem(ctx, id, clerkUserId);
    const item = normalizeItem(fields);
    validateListItemInput(item);
    if (typeof priceCents === "number") validateListItemPrice(priceCents);
    // `undefined` = no tocarlo; `null` se guarda sin el campo.
    const price = priceCents === undefined ? undefined : { priceCents: priceCents ?? undefined };

    // Guardar sin cambiar nada no cuenta como edición: si no, quien lo había
    // marcado vería «lo ha cambiado» sin que nada cambiara (decisión 15). El
    // precio solo cuenta si ha llegado.
    if (
      item.title === existing.title &&
      item.url === existing.url &&
      item.note === existing.note &&
      (price === undefined || price.priceCents === existing.priceCents)
    ) {
      return;
    }
    // `undefined` en un patch borra el campo: vaciar el enlace o la nota lo
    // quita de verdad. Por eso el precio solo entra en el patch si ha llegado.
    // `favorite` no está en `item`, así que editar no lo toca.
    await ctx.db.patch(id, { ...item, ...price, editedAt: Date.now() });
  },
});

/**
 * Pasa un elemento a «Lo que más ilusión te haría», o lo saca. Va aparte de
 * `updateItem` porque no es una edición: no pone `editedAt`, así que quien lo
 * había marcado no ve «lo ha cambiado» (decisión 15). El tope se comprueba
 * solo al pasarlo, y pasar uno que ya lo es no cuenta.
 */
export const setFavorite = mutation({
  args: { id: v.id("listItems"), favorite: v.boolean() },
  handler: async (ctx, { id, favorite }) => {
    const clerkUserId = await requireUser(ctx);
    const item = await assertOwnItem(ctx, id, clerkUserId);
    if (favorite === (item.favorite === true)) return;

    if (favorite) {
      const items = await ownerItems(ctx, clerkUserId);
      if (items.filter((i) => i.favorite === true).length >= MAX_FAVORITES) {
        throw new ConvexError(`Ya tienes ${MAX_FAVORITES}. Saca una para pasar esta.`);
      }
    }
    // Al sacarlo se borra el campo en vez de guardar `false`.
    await ctx.db.patch(id, { favorite: favorite ? true : undefined });
  },
});

/**
 * Borra un elemento. Si alguien lo había marcado, su marca se queda con una
 * copia del elemento para que lo siga viendo como «Ya no está en su lista»
 * (decisión 14), o como «Ya lo tiene» si el dueño lo quitó con «Ya lo tengo»
 * (`reason: "got"`). Si ya lo había dado por regalado, la marca desaparece sin
 * aviso, porque está cerrado (decisión 16). Al dueño no se le dice nada: no
 * devuelve nada, haya marcas o no, con motivo o sin él. La foto se borra con
 * el elemento: la copia de la marca no la guarda.
 */
export const removeItem = mutation({
  args: { id: v.id("listItems"), reason: v.optional(v.literal("got")) },
  handler: async (ctx, { id, reason }) => {
    const clerkUserId = await requireUser(ctx);
    const item = await assertOwnItem(ctx, id, clerkUserId);

    const claims = await ctx.db
      .query("listClaims")
      .withIndex("by_item", (q) => q.eq("itemId", id))
      .collect();
    for (const c of claims) {
      if (c.status === "given") {
        await ctx.db.delete(c._id);
      } else {
        await ctx.db.patch(c._id, {
          itemId: undefined,
          // Sin motivo, `reason` se queda fuera de la copia.
          snapshot: { title: item.title, url: item.url, note: item.note, reason },
        });
      }
    }
    if (item.photoStorageId) await deleteFileIfExists(ctx, item.photoStorageId);
    await ctx.db.delete(id);
  },
});

/**
 * Primer paso para poner foto a un elemento: una dirección de subida de un
 * solo uso. Gasta cupo aquí, antes de que el navegador suba nada, porque es
 * lo que ocupa almacenamiento. No apunta la foto a ningún elemento: eso lo
 * hace `setItemPhoto`, que es quien comprueba el archivo.
 */
export const generatePhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    await checkAndIncrement(
      ctx,
      clerkUserId,
      "list_photo_upload",
      PHOTO_UPLOAD_DAILY_LIMIT,
    );
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Pone (o cambia) la foto de un elemento con el archivo que se acaba de subir.
 * Una mutation no puede leer el archivo, así que se fía de lo que Convex
 * apuntó al recibirlo: el tipo declarado tiene que ser JPG, PNG o WebP y el
 * tamaño real de como mucho 1,5 MB. Quitar los EXIF (el GPS) es cosa del
 * navegador, que vuelve a codificar la imagen antes de subirla; aquí no se
 * puede comprobar.
 *
 * Un archivo que ya es la foto de otro elemento no vale: compartirlo haría que
 * quitar la foto de uno borrase la del otro, y la dirección de una foto la ven
 * los lectores. Si el archivo no vale, el error deshace la mutation entera,
 * también cualquier borrado, así que el archivo rechazado se queda sin dueño
 * y lo recoge `sweepOrphanPhotos`.
 *
 * Cambiar la foto no es una edición: no pone `editedAt`, y a quien lo había
 * marcado no le salta «lo ha cambiado». La foto anterior se borra.
 */
export const setItemPhoto = mutation({
  args: { id: v.id("listItems"), storageId: v.id("_storage") },
  handler: async (ctx, { id, storageId }) => {
    const clerkUserId = await requireUser(ctx);
    const item = await assertOwnItem(ctx, id, clerkUserId);
    if (item.photoStorageId === storageId) return;

    const meta = await ctx.db.system.get("_storage", storageId);
    const enUso = await ctx.db
      .query("listItems")
      .withIndex("by_photo", (q) => q.eq("photoStorageId", storageId))
      .first();
    if (!meta || !isAllowedListPhoto(meta) || enUso) {
      throw new ConvexError(PHOTO_REJECTED);
    }

    if (item.photoStorageId) await deleteFileIfExists(ctx, item.photoStorageId);
    await ctx.db.patch(id, { photoStorageId: storageId });
  },
});

/** Quita la foto de un elemento y borra el archivo. Tampoco pone `editedAt`. */
export const removeItemPhoto = mutation({
  args: { id: v.id("listItems") },
  handler: async (ctx, { id }) => {
    const clerkUserId = await requireUser(ctx);
    const item = await assertOwnItem(ctx, id, clerkUserId);
    if (!item.photoStorageId) return;
    await deleteFileIfExists(ctx, item.photoStorageId);
    await ctx.db.patch(id, { photoStorageId: undefined });
  },
});

/**
 * «Subir» o «Bajar» un elemento dentro de su grupo («Lo que más ilusión te
 * haría» o el resto): intercambia su sitio (`sortKey`) con el del vecino del
 * mismo grupo en esa dirección, escribiendo `position` en los dos. En el
 * borde no hace nada. No es una edición: no pone `editedAt`. Sin cupo, como
 * `setFavorite`: reescribe dos filas que ya existen.
 */
export const moveItem = mutation({
  args: {
    id: v.id("listItems"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { id, direction }) => {
    const clerkUserId = await requireUser(ctx);
    const item = await assertOwnItem(ctx, id, clerkUserId);
    const favorite = item.favorite === true;
    const grupo = (await ownerItems(ctx, clerkUserId)).filter(
      (i) => (i.favorite === true) === favorite,
    );
    const at = grupo.findIndex((i) => i._id === id);
    const vecino = at === -1 ? undefined : grupo[direction === "up" ? at - 1 : at + 1];
    if (!vecino) return;
    await ctx.db.patch(id, { position: sortKey(vecino) });
    await ctx.db.patch(vecino._id, { position: sortKey(item) });
  },
});

/**
 * Paso previo a buscar un email en Clerk desde la API route de invitar: esa
 * ruta contesta distinto si el email tiene cuenta, así que cada pregunta gasta
 * cupo. Comparte cubo con la de compartir fichas (docs/security.md §9).
 */
export const reserveInviteLookup = mutation({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    await checkAndIncrement(
      ctx,
      clerkUserId,
      "invite_lookup",
      INVITE_LOOKUP_DAILY_LIMIT,
    );
    return null;
  },
});

/** Da acceso a tu lista a una cuenta ya resuelta por email en la API route. */
export const invite = mutation({
  args: { readerClerkUserId: v.string() },
  handler: async (ctx, { readerClerkUserId }) => {
    const clerkUserId = await requireUser(ctx);
    return grantAccess(ctx, clerkUserId, readerClerkUserId);
  },
});

/**
 * Quita el acceso a un lector. Sus marcas se borran con él y esos elementos
 * vuelven a quedar libres para el resto (decisión 17).
 */
export const revoke = mutation({
  args: { shareId: v.id("listShares") },
  handler: async (ctx, { shareId }) => {
    const clerkUserId = await requireUser(ctx);
    const share = await ctx.db.get(shareId);
    if (!share || share.ownerClerkUserId !== clerkUserId) {
      throw new ConvexError("Esa persona ya no tiene acceso.");
    }
    await deleteClaimsBetween(ctx, share.ownerClerkUserId, share.readerClerkUserId);
    await ctx.db.delete(shareId);
  },
});

// ─── El lector ───────────────────────────────────────────────────────────────

/**
 * Los permisos de lectura de `clerkUserId` que puede ver: sin los de dueños a
 * los que bloqueó.
 */
async function readerShares(ctx: QueryCtx | MutationCtx, clerkUserId: string) {
  const shares = await ctx.db
    .query("listShares")
    .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
    .take(MAX_SHARES_READ);
  return shares.filter((s) => s.hidden !== true);
}

/**
 * Las listas que te han compartido. `personId` es la ficha asociada si todavía
 * puedes verla, o `null`: entonces la tarjeta de lista recibida pide asociarla
 * (decisiones 9 y 11). Las de quien tienes bloqueado no salen.
 */
export const sharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    const shares = await readerShares(ctx, clerkUserId);
    return Promise.all(
      shares.map(async (s) => ({
        shareId: s._id,
        ownerName: s.ownerName ?? null,
        ownerEmail: s.ownerEmail ?? null,
        personId: await validPersonId(ctx, s),
        sharedBack: (await findShare(ctx, clerkUserId, s.ownerClerkUserId)) !== null,
        since: s._creationTime,
      })),
    );
  },
});

/**
 * Las listas que TÚ has asociado a esta ficha, con el estado de cada elemento
 * visto por ti. Otro invitado de la misma ficha recibe `[]` aunque la ficha
 * sea la misma: lo que cuenta es el permiso del dueño de la lista.
 *
 * `state`: `free` nadie lo ha marcado · `mine` lo regalas tú · `given` ya lo
 * diste por regalado · `taken` lo regala otra persona, sin decir quién.
 * `favorite`: está en «Lo que más ilusión le haría». En `removed`, `reason`
 * es `"got"` si el dueño lo quitó con «Ya lo tengo».
 * `addedAt`: cuándo lo apuntó, para que la página marque lo «Nuevo». Solo lo
 * recibe quien lee; al dueño no le hace falta.
 * `about`: la «nota para quien te regala» del dueño, y `birthday` su
 * cumpleaños, por el mismo permiso que el resto de la lista.
 * `photoUrl`: la foto que subió el dueño, o `null`. Los elementos van en el
 * orden que les dio el dueño.
 * `occasionLabel`: la fecha de esta ficha para la que guardas lo que has
 * marcado («Lo regalo yo · para…»); solo en tus marcas, nunca en las de otros.
 */
export const forPerson = query({
  args: { personId: v.id("people") },
  handler: async (ctx, { personId }) => {
    const clerkUserId = await requireUser(ctx);
    const person = await ctx.db.get(personId);
    if (!(await personHasAccess(ctx, person, clerkUserId))) return [];

    const shares = (await readerShares(ctx, clerkUserId)).filter(
      (s) => s.personId === personId,
    );

    const lists = [];
    for (const share of shares) {
      const items = await ownerItems(ctx, share.ownerClerkUserId);
      const itemViews = [];
      for (const item of items) {
        const claim = await claimOf(ctx, item._id);
        const mine = claim?.readerClerkUserId === clerkUserId;
        itemViews.push({
          _id: item._id,
          title: item.title,
          url: item.url,
          note: item.note,
          favorite: item.favorite === true,
          priceCents: item.priceCents ?? null,
          photoUrl: await photoUrlOf(ctx, item),
          addedAt: item._creationTime,
          occasionLabel: mine ? ((await occasionOf(ctx, claim, personId))?.label ?? null) : null,
          state: !claim
            ? ("free" as const)
            : !mine
              ? ("taken" as const)
              : claim.status === "given"
                ? ("given" as const)
                : ("mine" as const),
          claimId: mine ? claim._id : null,
          editedSinceMark:
            mine &&
            claim.status === "marked" &&
            item.editedAt !== undefined &&
            item.editedAt > claim.ackAt,
        });
      }

      // Elementos que el dueño borró después de que los marcaras.
      const myClaims = await ctx.db
        .query("listClaims")
        .withIndex("by_owner_and_reader", (q) =>
          q
            .eq("ownerClerkUserId", share.ownerClerkUserId)
            .eq("readerClerkUserId", clerkUserId),
        )
        .take(MAX_ITEMS_PER_LIST);
      const removed = myClaims
        .filter((c) => c.itemId === undefined && c.snapshot !== undefined)
        .map((c) => ({
          claimId: c._id,
          title: c.snapshot!.title,
          url: c.snapshot!.url,
          note: c.snapshot!.note,
          reason: c.snapshot!.reason ?? null,
        }));

      const about = await aboutOf(ctx, share.ownerClerkUserId);
      lists.push({
        shareId: share._id,
        ownerName: share.ownerName ?? null,
        ownerEmail: share.ownerEmail ?? null,
        about: about?.note ?? null,
        birthday: birthdayOf(about),
        items: itemViews,
        removed,
      });
    }
    return lists;
  },
});

/**
 * «Lo que vas a regalar»: lo que has marcado con «Lo regalo yo» y aún no has
 * dado por regalado, en todas las listas que te comparten. Solo para quien
 * lee: sale de tus propias marcas (`by_reader`), nunca de las de otros, y no
 * dice nada de quién más lee cada lista.
 *
 * Una marca solo sale si sigues teniendo el permiso del dueño. Perderlo ya
 * borra tus marcas (decisión 17), pero se vuelve a mirar aquí para no fiarlo
 * todo a ese borrado. `personId` es la ficha a la que asociaste la lista si
 * todavía la ves, igual que en `sharedWithMe`. Un elemento que el dueño quitó
 * sale con `removed` y el título de la copia; `reason` es `"got"` si lo quitó
 * con «Ya lo tengo».
 *
 * «Lo regalo yo · para…»: `occasions` son las fechas de esa ficha que se
 * pueden elegir (`[]` si la lista no está asociada a una que veas), e
 * `importantDateId` y `occasionLabel` la elegida, si sigue siendo una de ellas.
 */
export const myGifts = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    const claims = await ctx.db
      .query("listClaims")
      .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
      .take(MAX_GIFTS_READ);

    // Una lectura por dueño, no por marca.
    type Lista = {
      ownerName: string | null;
      ownerEmail: string | null;
      personId: Id<"people"> | null;
      personName: string | null;
      occasions: { _id: Id<"importantDates">; label: string }[];
    };
    const listas = new Map<string, Lista | null>();
    const listaDe = async (ownerClerkUserId: string) => {
      if (listas.has(ownerClerkUserId)) return listas.get(ownerClerkUserId)!;
      const share = await visibleShare(ctx, ownerClerkUserId, clerkUserId);
      let lista: Lista | null = null;
      if (share) {
        const personId = await validPersonId(ctx, share);
        const person = personId ? await ctx.db.get(personId) : null;
        const fechas = personId
          ? await ctx.db
              .query("importantDates")
              .withIndex("by_person", (q) => q.eq("personId", personId))
              .take(MAX_OCCASIONS_READ)
          : [];
        lista = {
          ownerName: share.ownerName ?? null,
          ownerEmail: share.ownerEmail ?? null,
          personId,
          personName: person?.name ?? null,
          occasions: fechas.map((f) => ({ _id: f._id, label: f.label })),
        };
      }
      listas.set(ownerClerkUserId, lista);
      return lista;
    };

    const gifts = [];
    for (const c of claims) {
      if (c.status !== "marked") continue;
      const lista = await listaDe(c.ownerClerkUserId);
      if (!lista) continue;
      const item = c.itemId ? await ctx.db.get(c.itemId) : null;
      const removed = c.itemId === undefined;
      const title = item?.title ?? c.snapshot?.title;
      if (title === undefined) continue;
      const ocasion = await occasionOf(ctx, c, lista.personId);
      gifts.push({
        claimId: c._id,
        title,
        url: (removed ? c.snapshot?.url : item?.url) ?? null,
        removed,
        reason: removed ? (c.snapshot?.reason ?? null) : null,
        importantDateId: ocasion?._id ?? null,
        occasionLabel: ocasion?.label ?? null,
        ...lista,
      });
    }

    const quien = (g: Lista) => g.personName ?? g.ownerName ?? g.ownerEmail ?? "";
    return gifts.sort(
      (a, b) =>
        quien(a).localeCompare(quien(b), "es") || a.title.localeCompare(b.title, "es"),
    );
  },
});

/** Asocia (o cambia) la ficha de tu libreta a la que pertenece una lista. */
export const associate = mutation({
  args: { shareId: v.id("listShares"), personId: v.id("people") },
  handler: async (ctx, { shareId, personId }) => {
    const clerkUserId = await requireUser(ctx);
    await assertListReader(ctx, shareId, clerkUserId);
    const person = await ctx.db.get(personId);
    if (!(await personHasAccess(ctx, person, clerkUserId))) {
      throw new ConvexError("Persona no encontrada.");
    }
    await ctx.db.patch(shareId, { personId });
  },
});

/** Dejar de ver una lista. También es «No me interesa» en la tarjeta. */
export const leave = mutation({
  args: { shareId: v.id("listShares") },
  handler: async (ctx, { shareId }) => {
    const clerkUserId = await requireUser(ctx);
    const share = await assertListReader(ctx, shareId, clerkUserId);
    await deleteClaimsBetween(ctx, share.ownerClerkUserId, clerkUserId);
    await ctx.db.delete(shareId);
  },
});

/**
 * Comparte tu lista con quien te compartió la suya, sin escribir su email: la
 * cuenta ya se conoce por el permiso recibido (decisión 10). Mismos topes y
 * límites diarios que `invite`.
 */
export const shareBack = mutation({
  args: { shareId: v.id("listShares") },
  handler: async (ctx, { shareId }) => {
    const clerkUserId = await requireUser(ctx);
    const share = await assertListReader(ctx, shareId, clerkUserId);
    return grantAccess(ctx, clerkUserId, share.ownerClerkUserId);
  },
});

/**
 * «No me interesa» y que no me la vuelva a compartir: deja la lista como
 * `leave` (permiso y marcas fuera) y apunta el bloqueo. Al dueño le llega lo
 * mismo que con `leave`: desaparece de quién ve su lista, y nada más. Si
 * vuelve a compartirla, `grantAccess` crea la fila oculta y no manda correo.
 * Nombre y email se copian del permiso para enseñarlos en tus bloqueos.
 */
export const leaveAndBlock = mutation({
  args: { shareId: v.id("listShares") },
  handler: async (ctx, { shareId }) => {
    const clerkUserId = await requireUser(ctx);
    const share = await assertListReader(ctx, shareId, clerkUserId);
    await deleteClaimsBetween(ctx, share.ownerClerkUserId, clerkUserId);
    await ctx.db.delete(shareId);
    if (!(await blockOf(ctx, clerkUserId, share.ownerClerkUserId))) {
      await ctx.db.insert("listBlocks", {
        readerClerkUserId: clerkUserId,
        ownerClerkUserId: share.ownerClerkUserId,
        ownerName: share.ownerName,
        ownerEmail: share.ownerEmail,
      });
    }
  },
});

/** A quién tienes bloqueado. Solo los tuyos: nadie sabe si le han bloqueado. */
export const myBlocks = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    const blocks = await ctx.db
      .query("listBlocks")
      .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
      .take(MAX_BLOCKS_READ);
    return blocks.map((b) => ({
      blockId: b._id,
      ownerName: b.ownerName ?? null,
      ownerEmail: b.ownerEmail ?? null,
      since: b._creationTime,
    }));
  },
});

/**
 * Quita un bloqueo. Si mientras tanto el dueño te volvió a compartir su lista,
 * la fila oculta se destapa y aparece como una lista recibida más, pendiente
 * de asociar. Sin correo: el aviso ya contó como enviado cuando te la
 * compartió.
 */
export const unblock = mutation({
  args: { blockId: v.id("listBlocks") },
  handler: async (ctx, { blockId }) => {
    const clerkUserId = await requireUser(ctx);
    const block = await ctx.db.get(blockId);
    if (!block || block.readerClerkUserId !== clerkUserId) {
      throw new ConvexError("Bloqueo no encontrado.");
    }
    await ctx.db.delete(blockId);
    const share = await findShare(ctx, block.ownerClerkUserId, clerkUserId);
    if (share?.hidden === true) await ctx.db.patch(share._id, { hidden: undefined });
  },
});

/** «Lo regalo yo». La primera marca gana; la segunda recibe un error. */
export const claim = mutation({
  args: { itemId: v.id("listItems") },
  handler: async (ctx, { itemId }) => {
    const clerkUserId = await requireUser(ctx);
    const item = await ctx.db.get(itemId);
    if (!item || !(await visibleShare(ctx, item.ownerClerkUserId, clerkUserId))) {
      throw new ConvexError("Elemento no encontrado.");
    }

    const existing = await claimOf(ctx, itemId);
    if (existing) {
      if (existing.readerClerkUserId === clerkUserId) return existing._id;
      throw new ConvexError("Ya lo regala otra persona.");
    }

    await checkAndIncrement(ctx, clerkUserId, "claim_list_item", CLAIM_DAILY_LIMIT);

    return ctx.db.insert("listClaims", {
      ownerClerkUserId: item.ownerClerkUserId,
      readerClerkUserId: clerkUserId,
      itemId,
      status: "marked",
      ackAt: Date.now(),
    });
  },
});

/** Quitar tu marca, también la de un elemento que ya no está en su lista. */
export const unclaim = mutation({
  args: { claimId: v.id("listClaims") },
  handler: async (ctx, { claimId }) => {
    const clerkUserId = await requireUser(ctx);
    await assertOwnClaim(ctx, claimId, clerkUserId);
    await ctx.db.delete(claimId);
  },
});

/** «Entendido» al aviso de que el dueño cambió algo que habías marcado. */
export const acknowledgeEdit = mutation({
  args: { claimId: v.id("listClaims") },
  handler: async (ctx, { claimId }) => {
    const clerkUserId = await requireUser(ctx);
    await assertOwnClaim(ctx, claimId, clerkUserId);
    await ctx.db.patch(claimId, { ackAt: Date.now() });
  },
});

/**
 * «Lo regalo yo · para…»: la fecha de tu ficha para la que guardas lo que has
 * marcado, o `null` para quitarla. Solo vale una fecha de la ficha a la que
 * asociaste esa lista y que todavía ves: tener acceso a otra ficha no basta
 * (docs/security.md §2, «misma persona, no solo acceso»). Solo en marcas que
 * aún no has dado por regaladas. Es un dato tuyo: no lo ve el dueño ni el
 * resto de lectores.
 */
export const setClaimOccasion = mutation({
  args: {
    claimId: v.id("listClaims"),
    importantDateId: v.union(v.id("importantDates"), v.null()),
  },
  handler: async (ctx, { claimId, importantDateId }) => {
    const clerkUserId = await requireUser(ctx);
    const claim = await assertOwnClaim(ctx, claimId, clerkUserId);
    if (claim.status !== "marked") {
      throw new ConvexError("Ya lo has dado por regalado.");
    }
    if (importantDateId === null) {
      if (claim.importantDateId !== undefined) {
        await ctx.db.patch(claimId, { importantDateId: undefined });
      }
      return;
    }
    const share = await visibleShare(ctx, claim.ownerClerkUserId, clerkUserId);
    const personId = share ? await validPersonId(ctx, share) : null;
    const date = await ctx.db.get(importantDateId);
    if (!personId || !date || date.personId !== personId) {
      throw new ConvexError("Esa fecha no es de su ficha.");
    }
    await ctx.db.patch(claimId, { importantDateId });
  },
});

/**
 * «Ya se lo he regalado». La entrada del historial la crea el cliente con
 * `giftHistory.create`, igual que al pasar una idea guardada. Aquí la marca
 * no se borra: queda como regalada para que el resto siga viéndolo cogido
 * (decisión 16). Si el dueño ya había borrado el elemento, no queda nada que
 * bloquear y la marca se va.
 */
export const markGiven = mutation({
  args: { claimId: v.id("listClaims") },
  handler: async (ctx, { claimId }) => {
    const clerkUserId = await requireUser(ctx);
    const claim = await assertOwnClaim(ctx, claimId, clerkUserId);
    if (claim.itemId === undefined) {
      await ctx.db.delete(claimId);
    } else {
      await ctx.db.patch(claimId, { status: "given" });
    }
  },
});

// ─── Para otros módulos ──────────────────────────────────────────────────────

/**
 * Cuántos elementos que nadie ha marcado tienen las listas que
 * `readerClerkUserId` asoció a `personId`. Lo usa el email de recordatorio
 * (decisión 18): solo la cifra, nunca los títulos. Una lista oculta (de un
 * dueño bloqueado) no cuenta; en la práctica no puede estar asociada.
 */
export async function countUnclaimedForReader(
  ctx: QueryCtx,
  personId: Id<"people">,
  readerClerkUserId: string,
): Promise<number> {
  const shares = await ctx.db
    .query("listShares")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect();
  let count = 0;
  for (const share of shares) {
    if (share.readerClerkUserId !== readerClerkUserId || share.hidden === true) continue;
    for (const item of await ownerItems(ctx, share.ownerClerkUserId)) {
      if (!(await claimOf(ctx, item._id))) count++;
    }
  }
  return count;
}

/**
 * Cuántas cosas de las listas que `readerClerkUserId` asoció a `personId` tiene
 * marcadas ese mismo lector y aún no ha dado por regalado. Es la segunda cifra
 * del email de recordatorio: cuenta solo sus propias marcas, nunca las de otros
 * lectores, y sin títulos. Las de elementos que el dueño quitó no cuentan: ya
 * no hay nada que regalarle de ahí. Una lista oculta tampoco cuenta.
 */
export async function countMarkedByReader(
  ctx: QueryCtx,
  personId: Id<"people">,
  readerClerkUserId: string,
): Promise<number> {
  const shares = await ctx.db
    .query("listShares")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect();
  let count = 0;
  for (const share of shares) {
    if (share.readerClerkUserId !== readerClerkUserId || share.hidden === true) continue;
    const claims = await ctx.db
      .query("listClaims")
      .withIndex("by_owner_and_reader", (q) =>
        q
          .eq("ownerClerkUserId", share.ownerClerkUserId)
          .eq("readerClerkUserId", readerClerkUserId),
      )
      .collect();
    for (const c of claims) {
      if (c.itemId !== undefined && c.status === "marked") count++;
    }
  }
  return count;
}

/**
 * Fotos subidas que no son de ningún elemento. Pasa cuando `setItemPhoto`
 * rechaza el archivo (el error deshace la mutation entera, también un borrado
 * que intentara), cuando la página sube la foto y se cierra antes de
 * apuntarla, o cuando el elemento se borra entre la subida y el apunte. Lo
 * llama un cron diario (`convex/crons.ts`): mira los archivos subidos entre
 * hace 3 días y hace 1 (si una pasada no corre, la siguiente lo recoge) y
 * borra los que no use ningún elemento. El día de margen es para no quitarle
 * el archivo a una subida que aún no ha llegado a `setItemPhoto`. Si hay más
 * de una tanda, se vuelve a programar desde el último que miró.
 *
 * Supone que «Mi lista» es lo único que guarda archivos en `_storage`. Si otra
 * función empieza a usarlo, este barrido tiene que saber también de ella.
 */
export const sweepOrphanPhotos = internalMutation({
  args: { after: v.optional(v.number()) },
  handler: async (ctx, { after }) => {
    const now = Date.now();
    const desde = Math.max(after ?? 0, now - ORPHAN_SWEEP_WINDOW_MS);
    const files = await ctx.db.system
      .query("_storage")
      .withIndex("by_creation_time", (q) =>
        q.gt("_creationTime", desde).lt("_creationTime", now - ORPHAN_MIN_AGE_MS),
      )
      .take(ORPHAN_SWEEP_BATCH);
    let deleted = 0;
    for (const f of files) {
      const enUso = await ctx.db
        .query("listItems")
        .withIndex("by_photo", (q) => q.eq("photoStorageId", f._id))
        .first();
      if (!enUso) {
        await ctx.storage.delete(f._id);
        deleted++;
      }
    }
    if (files.length === ORPHAN_SWEEP_BATCH) {
      await ctx.scheduler.runAfter(0, internal.lists.sweepOrphanPhotos, {
        after: files[files.length - 1]._creationTime,
      });
    }
    return { deleted };
  },
});

/**
 * Todo lo de las listas al borrar la cuenta de `clerkUserId` (decisión 22).
 * Como dueño se va su lista entera, con sus fotos y su «nota para quien te
 * regala» (y su cumpleaños), sin transferir: una ficha puede seguir
 * teniendo sentido para otra persona, una lista habla de quien la escribió.
 * Como lector se van sus permisos (también los ocultos), sus marcas y sus
 * bloqueos. Los bloqueos que otros le pusieron como dueño se van también: ya
 * no queda nadie que pueda volver a compartir nada. Las entradas de historial
 * que creó a partir de la lista son de la ficha y se quedan.
 */
export async function deleteListDataForUser(
  ctx: MutationCtx,
  clerkUserId: string,
) {
  const ownShares = await ctx.db
    .query("listShares")
    .withIndex("by_owner", (q) => q.eq("ownerClerkUserId", clerkUserId))
    .collect();
  for (const s of ownShares) {
    await deleteClaimsBetween(ctx, clerkUserId, s.readerClerkUserId);
    await ctx.db.delete(s._id);
  }

  const items = await ctx.db
    .query("listItems")
    .withIndex("by_owner", (q) => q.eq("ownerClerkUserId", clerkUserId))
    .collect();
  for (const item of items) {
    const claims = await ctx.db
      .query("listClaims")
      .withIndex("by_item", (q) => q.eq("itemId", item._id))
      .collect();
    for (const c of claims) await ctx.db.delete(c._id);
    if (item.photoStorageId) await deleteFileIfExists(ctx, item.photoStorageId);
    await ctx.db.delete(item._id);
  }

  // Su «nota para quien te regala» y su cumpleaños (como mucho una fila).
  const about = await ctx.db
    .query("listAbout")
    .withIndex("by_owner", (q) => q.eq("ownerClerkUserId", clerkUserId))
    .collect();
  for (const a of about) await ctx.db.delete(a._id);

  // Con `collect` y no con `readerShares`: también las ocultas.
  const sharesAsReader = await ctx.db
    .query("listShares")
    .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
    .collect();
  for (const s of sharesAsReader) await ctx.db.delete(s._id);

  const readerClaims = await ctx.db
    .query("listClaims")
    .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
    .collect();
  for (const c of readerClaims) await ctx.db.delete(c._id);

  // Cuándo se avisó por correo, como dueño y como lector.
  const sentInvites = await ctx.db
    .query("listInviteEmails")
    .withIndex("by_owner_and_reader", (q) => q.eq("ownerClerkUserId", clerkUserId))
    .collect();
  const receivedInvites = await ctx.db
    .query("listInviteEmails")
    .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
    .collect();
  for (const r of [...sentInvites, ...receivedInvites]) await ctx.db.delete(r._id);

  // Bloqueos, los que puso como lector y los que le pusieron como dueño.
  const blocksAsReader = await ctx.db
    .query("listBlocks")
    .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
    .collect();
  const blocksAsOwner = await ctx.db
    .query("listBlocks")
    .withIndex("by_owner", (q) => q.eq("ownerClerkUserId", clerkUserId))
    .collect();
  for (const b of [...blocksAsReader, ...blocksAsOwner]) await ctx.db.delete(b._id);
}

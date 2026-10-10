import { v, ConvexError } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./auth";
import { checkAndIncrement } from "./rateLimit";
import { validateListItemInput } from "./validators";
import { INVITE_LOOKUP_DAILY_LIMIT, personHasAccess } from "./personShares";
import { internal } from "./_generated/api";

/**
 * «Mi lista»: lo que un usuario apunta que le haría ilusión recibir, y quién
 * puede leerlo. Las decisiones numeradas que se citan aquí son las de
 * docs/encargo-lista.md.
 *
 * Hay tres públicos y cada función sirve solo a uno:
 * - **El dueño** ve sus elementos y a quién se los ha compartido. Nada de lo
 *   que le llega lee `listClaims` (decisión 7).
 * - **El lector** ve la lista por el permiso que le dio el dueño
 *   (`listShares`), nunca por tener acceso a la ficha a la que la asoció
 *   (decisión 12). Ve qué está cogido, pero no por quién (decisión 13).
 * - **Nadie más** ve nada, ni siquiera que la lista existe.
 */

export const MAX_ITEMS_PER_LIST = 100;
export const MAX_READERS_PER_LIST = 20;
const CREATE_ITEM_DAILY_LIMIT = 100;
const CLAIM_DAILY_LIMIT = 100;
const INVITE_LIST_DAILY_LIMIT = 20;
const MAX_CLERK_ID_LENGTH = 100;
const MAX_OWNER_NAME = 80;
// Listas que te han compartido. No tiene tope propio (cada dueño elige a
// quién), así que se acota la lectura.
const MAX_SHARES_READ = 100;
// Como mucho un correo de aviso por pareja (dueño, lector) en este plazo.
export const INVITE_EMAIL_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

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
 * El permiso de lectura de `clerkUserId`. Mismo mensaje si no existe o si es
 * de otro: el cliente no distingue los dos casos (docs/security.md §5).
 */
async function assertListReader(
  ctx: QueryCtx | MutationCtx,
  shareId: Id<"listShares">,
  clerkUserId: string,
): Promise<Doc<"listShares">> {
  const share = await ctx.db.get(shareId);
  if (!share || share.readerClerkUserId !== clerkUserId) {
    throw new ConvexError("Lista no encontrada.");
  }
  return share;
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

async function ownerItems(
  ctx: QueryCtx | MutationCtx,
  ownerClerkUserId: string,
) {
  return ctx.db
    .query("listItems")
    .withIndex("by_owner", (q) => q.eq("ownerClerkUserId", ownerClerkUserId))
    .order("desc")
    .take(MAX_ITEMS_PER_LIST);
}

async function claimOf(ctx: QueryCtx | MutationCtx, itemId: Id<"listItems">) {
  // Como mucho una por elemento: `claim` rechaza la segunda.
  return ctx.db
    .query("listClaims")
    .withIndex("by_item", (q) => q.eq("itemId", itemId))
    .first();
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
  const shareId = await ctx.db.insert("listShares", {
    ownerClerkUserId,
    readerClerkUserId,
    ownerName,
    ownerEmail: identity?.email,
  });
  const emailed = await scheduleInviteEmail(
    ctx,
    ownerClerkUserId,
    readerClerkUserId,
    ownerName,
    identity?.email,
  );
  return { shareId, emailed };
}

/**
 * Programa el correo de aviso al lector, como mucho uno cada 30 días por
 * pareja. El plazo se apunta al programarlo, no al enviarlo: si Resend falla,
 * no se reintenta, pero así nadie puede encadenar invitaciones para mandar
 * correos. La dirección sale de `userSettings.email` del lector, que se sella
 * cada vez que entra en la app; nunca de un argumento.
 */
async function scheduleInviteEmail(
  ctx: MutationCtx,
  ownerClerkUserId: string,
  readerClerkUserId: string,
  ownerName: string | undefined,
  ownerEmail: string | undefined,
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
  if (last) {
    await ctx.db.patch(last._id, { sentAt: now });
  } else {
    await ctx.db.insert("listInviteEmails", {
      ownerClerkUserId,
      readerClerkUserId,
      sentAt: now,
    });
  }

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
 * Los elementos de tu lista, del más nuevo al más antiguo. Solo lee
 * `listItems`: nunca cruza con `listClaims`, ni para un contador.
 */
export const myItems = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    const items = await ownerItems(ctx, clerkUserId);
    return items.map((i) => ({
      _id: i._id,
      _creationTime: i._creationTime,
      title: i.title,
      url: i.url,
      note: i.note,
    }));
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
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireUser(ctx);
    const item = normalizeItem(args);
    validateListItemInput(item);

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
    });
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("listItems"),
    title: v.string(),
    url: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const clerkUserId = await requireUser(ctx);
    const existing = await assertOwnItem(ctx, id, clerkUserId);
    const item = normalizeItem(fields);
    validateListItemInput(item);

    // Guardar sin cambiar nada no cuenta como edición: si no, quien lo había
    // marcado vería «lo ha cambiado» sin que nada cambiara (decisión 15).
    if (
      item.title === existing.title &&
      item.url === existing.url &&
      item.note === existing.note
    ) {
      return;
    }
    // `undefined` en un patch borra el campo: vaciar el enlace o la nota lo
    // quita de verdad.
    await ctx.db.patch(id, { ...item, editedAt: Date.now() });
  },
});

/**
 * Borra un elemento. Si alguien lo había marcado, su marca se queda con una
 * copia del elemento para que lo siga viendo como «Ya no está en su lista»
 * (decisión 14). Si ya lo había dado por regalado, la marca desaparece sin
 * aviso, porque está cerrado (decisión 16). Al dueño no se le dice nada.
 */
export const removeItem = mutation({
  args: { id: v.id("listItems") },
  handler: async (ctx, { id }) => {
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
          snapshot: { title: item.title, url: item.url, note: item.note },
        });
      }
    }
    await ctx.db.delete(id);
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
 * Las listas que te han compartido. `personId` es la ficha asociada si todavía
 * puedes verla, o `null`: entonces la tarjeta de lista recibida pide asociarla
 * (decisiones 9 y 11).
 */
export const sharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    const shares = await ctx.db
      .query("listShares")
      .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
      .take(MAX_SHARES_READ);
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
 */
export const forPerson = query({
  args: { personId: v.id("people") },
  handler: async (ctx, { personId }) => {
    const clerkUserId = await requireUser(ctx);
    const person = await ctx.db.get(personId);
    if (!(await personHasAccess(ctx, person, clerkUserId))) return [];

    const shares = (
      await ctx.db
        .query("listShares")
        .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
        .take(MAX_SHARES_READ)
    ).filter((s) => s.personId === personId);

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
        }));

      lists.push({
        shareId: share._id,
        ownerName: share.ownerName ?? null,
        ownerEmail: share.ownerEmail ?? null,
        items: itemViews,
        removed,
      });
    }
    return lists;
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

/** «Lo regalo yo». La primera marca gana; la segunda recibe un error. */
export const claim = mutation({
  args: { itemId: v.id("listItems") },
  handler: async (ctx, { itemId }) => {
    const clerkUserId = await requireUser(ctx);
    const item = await ctx.db.get(itemId);
    if (!item || !(await findShare(ctx, item.ownerClerkUserId, clerkUserId))) {
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
 * (decisión 18): solo la cifra, nunca los títulos.
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
    if (share.readerClerkUserId !== readerClerkUserId) continue;
    for (const item of await ownerItems(ctx, share.ownerClerkUserId)) {
      if (!(await claimOf(ctx, item._id))) count++;
    }
  }
  return count;
}

/**
 * Todo lo de las listas al borrar la cuenta de `clerkUserId` (decisión 22).
 * Como dueño se va su lista entera, sin transferir: una ficha puede seguir
 * teniendo sentido para otra persona, una lista habla de quien la escribió.
 * Como lector se van sus permisos y sus marcas. Las entradas de historial que
 * creó a partir de la lista son de la ficha y se quedan.
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
    await ctx.db.delete(item._id);
  }

  const readerShares = await ctx.db
    .query("listShares")
    .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
    .collect();
  for (const s of readerShares) await ctx.db.delete(s._id);

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
}

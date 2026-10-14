import { mutation, query, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./auth";
import { checkAndIncrement } from "./rateLimit";
import { validateOwnIdeaInput, validateSavedIdeaInput } from "./validators";
import { assertPersonAccess, personHasAccess } from "./personShares";
import { findEventByLabel } from "./eventLabels";
import { deleteSavedIdea, IDEA_PHOTO_REJECTED, ideaPhotoUrl, isUsableIdeaPhoto } from "./ideaPhotos";

/**
 * El evento en el que entra una idea al guardarla. Con id, tiene que ser de la
 * misma persona: tener acceso a las dos fichas no basta. Sin id (clientes
 * anteriores a este campo), se busca por nombre; si no hay uno claro, la idea
 * queda en «Sin ocasión».
 */
async function resolveSaveEvent(
  ctx: MutationCtx,
  personId: Id<"people">,
  importantDateId: Id<"importantDates"> | undefined,
  occasionLabel: string,
): Promise<Doc<"importantDates"> | null> {
  if (importantDateId !== undefined) {
    const date = await ctx.db.get(importantDateId);
    if (!date || date.personId !== personId) throw new ConvexError("No autorizado");
    return date;
  }
  const dates = await ctx.db
    .query("importantDates")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect();
  const match = findEventByLabel(dates, occasionLabel);
  return match.kind === "match" ? dates.find((d) => d._id === match.id) ?? null : null;
}

export const getByPerson = query({
  args: { personId: v.id("people") },
  handler: async (ctx, { personId }) => {
    const clerkUserId = await requireUser(ctx);
    // Las ideas guardadas SÍ se comparten, con autoría (decisión 10): no se
    // filtran por quién las guardó.
    const person = await ctx.db.get(personId);
    if (!(await personHasAccess(ctx, person, clerkUserId))) return [];
    const ideas = await ctx.db
      .query("savedIdeas")
      .withIndex("by_person", (q) => q.eq("personId", personId))
      .order("desc")
      .take(200);
    // `photoUrl`: la foto que pegaste en una idea propia, o `null`.
    return Promise.all(ideas.map(async (idea) => ({ ...idea, photoUrl: await ideaPhotoUrl(ctx, idea) })));
  },
});

export const save = mutation({
  args: {
    personId: v.id("people"),
    occasionLabel: v.string(),
    // Opcional solo para no romper a los clientes abiertos durante el
    // despliegue: el generador actual siempre lo manda.
    importantDateId: v.optional(v.id("importantDates")),
    title: v.string(),
    description: v.string(),
    priceMinEuros: v.number(),
    priceMaxEuros: v.number(),
    category: v.union(v.string(), v.array(v.string())),
    amazonQuery: v.string(),
    suggestedStores: v.optional(v.array(v.string())),
    giftType: v.optional(
      v.union(
        v.literal("fisica"),
        v.literal("experiencia"),
        v.literal("tiempo-juntos"),
        v.literal("sorprendeme"),
      ),
    ),
    // Allowlist verificada en validateSavedIdeaInput (ALLOWED_IMAGE_KEYS).
    imageKey: v.optional(v.string()),
    // Foto de stock Pexels; prefijo de URL verificado en validateSavedIdeaInput.
    image: v.optional(
      v.object({
        url: v.string(),
        photographer: v.optional(v.string()),
        photographerUrl: v.optional(v.string()),
      }),
    ),
    // Tienda oficial de cada marca matcheada; dominio/logo verificados en
    // validateSavedIdeaInput (mismo shape que recommendations).
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
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireUser(ctx);
    await assertPersonAccess(ctx, args.personId, clerkUserId, "No autorizado");
    validateSavedIdeaInput(args);
    const { importantDateId, occasionLabel, ...idea } = args;
    const date = await resolveSaveEvent(ctx, args.personId, importantDateId, occasionLabel);
    // Dedupe server-side: la misma persona y el mismo título son la misma
    // idea, sea cual sea la ocasión (docs/encargo-ocasiones.md, decisión 14).
    // Guardarla otra vez, desde otra ocasión, un doble clic o una doble
    // pestaña, no crea una segunda fila, no la mueve ni consume rate limit.
    const existing = await ctx.db
      .query("savedIdeas")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .collect();
    const duplicate = existing.find((s) => s.title === args.title);
    if (duplicate) return duplicate._id;
    await checkAndIncrement(ctx, clerkUserId, "save_idea", 50);
    return ctx.db.insert("savedIdeas", {
      clerkUserId,
      ...idea,
      occasionLabel: date?.label ?? occasionLabel,
      importantDateId: date?._id,
    });
  },
});

/**
 * «Apuntar una idea» desde la ficha: una idea que se te ocurre a ti, sin la
 * IA. Entra en la misma tabla que las sugerencias guardadas para que comparta
 * con ellas ocasión, menú y «Ya se lo he regalado». No se manda a Gemini: la
 * ruta de recomendaciones solo lee el historial.
 */
export const addOwn = mutation({
  args: {
    personId: v.id("people"),
    // null = «Sin ocasión».
    importantDateId: v.union(v.id("importantDates"), v.null()),
    title: v.string(),
    url: v.optional(v.string()),
    note: v.optional(v.string()),
    priceCents: v.optional(v.number()),
    // Recién subida con `lists.generatePhotoUploadUrl`. Se comprueba aquí.
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireUser(ctx);
    await assertPersonAccess(ctx, args.personId, clerkUserId, "No autorizado");
    const title = args.title.trim();
    const note = args.note?.trim() || undefined;
    const url = args.url?.trim() || undefined;
    validateOwnIdeaInput({ title, url, note, priceCents: args.priceCents });
    let date: Doc<"importantDates"> | null = null;
    if (args.importantDateId !== null) {
      // Como al mover: el evento tiene que ser de esta misma ficha.
      date = await ctx.db.get(args.importantDateId);
      if (!date || date.personId !== args.personId) throw new ConvexError("No autorizado");
    }
    // Mismo criterio que `save`: el título es la idea. Aquí se dice, porque lo
    // ha escrito a mano y si no pasa nada parecería que no se guardó.
    const existing = await ctx.db
      .query("savedIdeas")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .take(500);
    if (existing.some((s) => s.title === title)) {
      throw new ConvexError("Ya tienes una idea con ese nombre.");
    }
    if (args.photoStorageId !== undefined && !(await isUsableIdeaPhoto(ctx, args.photoStorageId))) {
      // El archivo rechazado se queda sin dueño y lo recoge el barrido de
      // fotos huérfanas (`lists.sweepOrphanPhotos`).
      throw new ConvexError(IDEA_PHOTO_REJECTED);
    }
    await checkAndIncrement(ctx, clerkUserId, "save_idea", 50);
    const euros = args.priceCents !== undefined ? args.priceCents / 100 : 0;
    return ctx.db.insert("savedIdeas", {
      clerkUserId,
      personId: args.personId,
      occasionLabel: date?.label ?? "Sin ocasión",
      importantDateId: date?._id,
      title,
      description: note ?? "",
      priceMinEuros: euros,
      priceMaxEuros: euros,
      category: [],
      amazonQuery: "",
      source: "own",
      url,
      photoStorageId: args.photoStorageId,
    });
  },
});

export const move = mutation({
  args: {
    id: v.id("savedIdeas"),
    // null = «Sin ocasión».
    importantDateId: v.union(v.id("importantDates"), v.null()),
  },
  handler: async (ctx, { id, importantDateId }) => {
    const clerkUserId = await requireUser(ctx);
    const entry = await ctx.db.get(id);
    if (!entry) throw new ConvexError("No autorizado");
    // Mover es de quien tiene acceso a la ficha, como quitar: la ocasión es
    // una propiedad de la idea y la idea es de la ficha (decisión 6).
    await assertPersonAccess(ctx, entry.personId, clerkUserId, "No autorizado");
    if (importantDateId !== null) {
      // El evento de destino tiene que colgar de la misma persona que la
      // idea. Comprobar solo el acceso dejaría mover una idea de tu madre a
      // un evento de tu padre si tienes las dos fichas.
      const date = await ctx.db.get(importantDateId);
      if (!date || date.personId !== entry.personId) throw new ConvexError("No autorizado");
    }
    await ctx.db.patch(id, { importantDateId: importantDateId ?? undefined });
  },
});

export const remove = mutation({
  args: { id: v.id("savedIdeas") },
  handler: async (ctx, { id }) => {
    const clerkUserId = await requireUser(ctx);
    const entry = await ctx.db.get(id);
    if (!entry) throw new ConvexError("No autorizado");
    // Igual que el historial: quitar una idea guardada es de quien tiene
    // acceso a la ficha, no solo de quien la guardó.
    await assertPersonAccess(ctx, entry.personId, clerkUserId, "No autorizado");
    await deleteSavedIdea(ctx, entry);
  },
});

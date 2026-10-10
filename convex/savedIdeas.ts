import { mutation, query, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./auth";
import { checkAndIncrement } from "./rateLimit";
import { validateSavedIdeaInput } from "./validators";
import { assertPersonAccess, personHasAccess } from "./personShares";
import { findEventByLabel } from "./eventLabels";

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
    return ctx.db
      .query("savedIdeas")
      .withIndex("by_person", (q) => q.eq("personId", personId))
      .order("desc")
      .take(200);
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
    await ctx.db.delete(id);
  },
});

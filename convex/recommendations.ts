import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireUser } from "./auth";
import {
  validateRecommendationIdeas,
  validateRecommendationKey,
} from "./validators";
import { assertPersonAccess, personHasAccess } from "./personShares";

const ideaValidator = v.object({
  title: v.string(),
  description: v.string(),
  priceMinEuros: v.number(),
  priceMaxEuros: v.number(),
  category: v.union(v.string(), v.array(v.string())),
  amazonQuery: v.string(),
  suggestedStores: v.optional(v.array(v.string())),
  imageKey: v.optional(v.string()),
  // Foto de stock Pexels; prefijo de URL verificado en validateRecommendationIdeas.
  image: v.optional(
    v.object({
      url: v.string(),
      photographer: v.optional(v.string()),
      photographerUrl: v.optional(v.string()),
    }),
  ),
  // Tienda oficial de marca (Brandfetch); dominio + prefijo de logo verificados
  // en validateRecommendationIdeas.
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
  // Qué es la idea en una tanda mezclada; validado en validateRecommendationIdeas.
  giftType: v.optional(v.string()),
});

export const getByPersonOccasion = query({
  args: {
    personId: v.id("people"),
    occasionLabel: v.string(),
    giftType: v.string(),
  },
  handler: async (ctx, { personId, occasionLabel, giftType }) => {
    const clerkUserId = await requireUser(ctx);

    // Acceso a la persona (dueño o invitado), no ownership de la propia
    // recomendación: las tandas siguen sin compartirse (decisión 7), lo que
    // las mantiene privadas es que la clave incluye `clerkUserId`.
    const person = await ctx.db.get(personId);
    if (!(await personHasAccess(ctx, person, clerkUserId))) return null;

    return ctx.db
      .query("recommendations")
      .withIndex("by_user_person_occasion_type", (q) =>
        q
          .eq("clerkUserId", clerkUserId)
          .eq("personId", personId)
          .eq("occasionLabel", occasionLabel)
          .eq("giftType", giftType),
      )
      .unique();
  },
});

/** Títulos descartados que llegan al prompt como mucho, sumando todas las tandas. */
const MAX_DISCARDED_TITLES = 40;

/**
 * Lo que quien regala ha descartado para esta persona, para que la siguiente
 * tanda no lo repita. Junta todas sus tandas (cualquier ocasión y tipo): lo
 * que no quiso para Navidad tampoco lo quiere para el cumpleaños. Primero la
 * tanda que se va a regenerar y, dentro de cada una, lo más reciente, para que
 * el tope corte lo menos relevante. Solo las del que llama: las tandas son
 * privadas de cada usuario, así que los descartes de un invitado no se mezclan
 * con los del dueño.
 */
export const getDiscardedTitles = query({
  args: {
    personId: v.id("people"),
    occasionLabel: v.string(),
    giftType: v.string(),
  },
  handler: async (ctx, { personId, occasionLabel, giftType }) => {
    const clerkUserId = await requireUser(ctx);
    const person = await ctx.db.get(personId);
    if (!(await personHasAccess(ctx, person, clerkUserId))) return [];

    // Una tanda por ocasión y tipo: 100 cubre 25 ocasiones con los 4 tipos.
    const batches = await ctx.db
      .query("recommendations")
      .withIndex("by_user_person_occasion_type", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("personId", personId),
      )
      .take(100);
    const isCurrent = (b: (typeof batches)[number]) =>
      b.occasionLabel === occasionLabel && b.giftType === giftType;
    const ordered = [...batches.filter(isCurrent), ...batches.filter((b) => !isCurrent(b))];
    const titles = ordered.flatMap((b) => [...(b.discardedTitles ?? [])].reverse());
    return [...new Set(titles)].slice(0, MAX_DISCARDED_TITLES);
  },
});

export const removeIdea = mutation({
  args: {
    personId: v.id("people"),
    occasionLabel: v.string(),
    giftType: v.string(),
    ideaTitle: v.string(),
    // Ya no se usa: descartar una idea vetaba sus categorías, que son los
    // intereses de la persona. Se sigue aceptando para que una pestaña abierta
    // con el cliente anterior no falle al descartar.
    ideaCategories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { personId, occasionLabel, giftType, ideaTitle }) => {
    const clerkUserId = await requireUser(ctx);
    await assertPersonAccess(ctx, personId, clerkUserId, "No autorizado");
    // Caps espejo de los tamaños que genera la app; sin ellos un cliente
    // directo puede inflar el documento con strings arbitrarios.
    if (
      ideaTitle.length > 80 ||
      occasionLabel.length > 40 ||
      giftType.length > 20
    ) {
      throw new ConvexError("Parámetros inválidos.");
    }
    const existing = await ctx.db
      .query("recommendations")
      .withIndex("by_user_person_occasion_type", (q) =>
        q
          .eq("clerkUserId", clerkUserId)
          .eq("personId", personId)
          .eq("occasionLabel", occasionLabel)
          .eq("giftType", giftType),
      )
      .unique();
    // Solo se apunta lo que estaba en la tanda: el título acaba en el prompt,
    // y así no entra texto que la IA no haya propuesto.
    if (!existing || !existing.ideas.some((idea) => idea.title === ideaTitle)) return;

    const discarded = (existing.discardedTitles ?? []).filter((t) => t !== ideaTitle);
    await ctx.db.patch(existing._id, {
      ideas: existing.ideas.filter((idea) => idea.title !== ideaTitle),
      // Acotado a los últimos 200: evita que el array crezca sin límite
      // hacia el cap de tamaño de documento de Convex.
      discardedTitles: [...discarded, ideaTitle].slice(-200),
    });
  },
});

export const upsert = mutation({
  args: {
    personId: v.id("people"),
    occasionLabel: v.string(),
    giftType: v.string(),
    ideas: v.array(ideaValidator),
  },
  handler: async (ctx, { personId, occasionLabel, giftType, ideas }) => {
    const clerkUserId = await requireUser(ctx);

    validateRecommendationKey(occasionLabel, giftType);
    validateRecommendationIdeas(ideas);

    await assertPersonAccess(ctx, personId, clerkUserId);

    const existing = await ctx.db
      .query("recommendations")
      .withIndex("by_user_person_occasion_type", (q) =>
        q
          .eq("clerkUserId", clerkUserId)
          .eq("personId", personId)
          .eq("occasionLabel", occasionLabel)
          .eq("giftType", giftType),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ideas });
    } else {
      await ctx.db.insert("recommendations", {
        clerkUserId,
        personId,
        occasionLabel,
        giftType,
        ideas,
      });
    }
  },
});

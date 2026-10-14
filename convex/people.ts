import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUser } from "./auth";
import { validatePersonInput } from "./validators";
import { checkAndIncrement } from "./rateLimit";
import { deleteSavedIdea } from "./ideaPhotos";
import {
  assertIsOwner,
  assertPersonAccess,
  deleteSharesForPerson,
  personHasAccess,
} from "./personShares";

const CREATE_PERSON_DAILY_LIMIT = 50;

/**
 * Borra todos los recursos anidados de una persona (fechas, historial,
 * recomendaciones, ideas guardadas y a quién se le había compartido) y
 * después la propia persona. Compartido entre `people.remove` y
 * `account.deleteMyAccount` para que ningún camino de borrado deje filas
 * huérfanas.
 */
export async function deletePersonCascade(
  ctx: MutationCtx,
  personId: Id<"people">,
) {
  const dates = await ctx.db
    .query("importantDates")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect();
  for (const d of dates) await ctx.db.delete(d._id);

  const history = await ctx.db
    .query("giftHistory")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect();
  for (const h of history) await ctx.db.delete(h._id);

  const recs = await ctx.db
    .query("recommendations")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect();
  for (const r of recs) await ctx.db.delete(r._id);

  const saved = await ctx.db
    .query("savedIdeas")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect();
  for (const s of saved) await deleteSavedIdea(ctx, s);

  await deleteSharesForPerson(ctx, personId);

  await ctx.db.delete(personId);
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    const owned = await ctx.db
      .query("people")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();

    // + las que otros han compartido contigo: sin esto, un invitado no tiene
    // forma de encontrar la ficha salvo que le pasen el id a mano.
    const shares = await ctx.db
      .query("personShares")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    const shared = (
      await Promise.all(shares.map((s) => ctx.db.get(s.personId)))
    ).filter((p): p is NonNullable<typeof p> => p !== null);

    return [...owned, ...shared];
  },
});

export const getById = query({
  args: { id: v.id("people") },
  handler: async (ctx, { id }) => {
    const clerkUserId = await requireUser(ctx);
    const person = await ctx.db.get(id);
    if (!(await personHasAccess(ctx, person, clerkUserId))) {
      return null;
    }
    return person;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    relationship: v.string(),
    interests: v.array(v.string()),
    favoriteBrands: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    shoeSize: v.optional(v.string()),
    clothingSize: v.optional(v.string()),
    allergies: v.optional(v.string()),
    dislikes: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireUser(ctx);
    validatePersonInput(args);
    await checkAndIncrement(
      ctx,
      clerkUserId,
      "create_person",
      CREATE_PERSON_DAILY_LIMIT,
    );
    return await ctx.db.insert("people", { ...args, clerkUserId });
  },
});

export const update = mutation({
  args: {
    id: v.id("people"),
    name: v.optional(v.string()),
    relationship: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    favoriteBrands: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    shoeSize: v.optional(v.string()),
    clothingSize: v.optional(v.string()),
    allergies: v.optional(v.string()),
    dislikes: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clerkUserId = await requireUser(ctx);
    // Editar la ficha es de todos con acceso, no solo de quien la creó: es
    // precisamente lo que hace útil compartirla (tres hermanos mantienen una
    // sola ficha de sus padres).
    await assertPersonAccess(ctx, id, clerkUserId);
    // Solo el parche, no el documento fusionado. Las comprobaciones de
    // `validatePersonInput` son campo a campo e independientes entre sí, así
    // que revalidar lo ya guardado no protege de nada: lo único que consigue
    // es que una regla nueva y más estricta convierta una ficha antigua en
    // ineditable, aunque la edición no toque ese campo (pasó a punto de
    // ocurrir con `AVATAR_FORBIDDEN`). Si alguna vez una regla necesita mirar
    // dos campos a la vez, esa sí tendrá que leer `existing`.
    validatePersonInput(patch);
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("people") },
  handler: async (ctx, { id }) => {
    const clerkUserId = await requireUser(ctx);
    // Deliberadamente NO usa assertPersonAccess: borrar la ficha para todos
    // sigue siendo solo de quien la creó (decisión 1 de docs/dudas.md). Un
    // invitado que quiera dejar de verla usa `personShares.leave`.
    assertIsOwner(await ctx.db.get(id), clerkUserId);
    await deletePersonCascade(ctx, id);
  },
});

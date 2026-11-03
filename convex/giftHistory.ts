import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireUser } from "./auth";
import { assertPersonAccess, personHasAccess } from "./personShares";

const MAX_GIFT_NAME = 120;
const MAX_OCCASION = 40;
const MAX_NOTES = 500;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const ALLOWED_REACTIONS = ["loved", "ok", "bad"] as const;

export const getByPerson = query({
  args: { personId: v.id("people") },
  handler: async (ctx, { personId }) => {
    const clerkUserId = await requireUser(ctx);

    // El historial se ve entero entre quienes comparten la ficha, con
    // autoría (decisión 3 de docs/dudas.md): no se filtra por autor.
    const person = await ctx.db.get(personId);
    if (!(await personHasAccess(ctx, person, clerkUserId))) return [];

    return ctx.db
      .query("giftHistory")
      .withIndex("by_person", (q) => q.eq("personId", personId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    personId: v.id("people"),
    giftName: v.string(),
    occasionLabel: v.string(),
    year: v.optional(v.number()),
    reaction: v.union(v.literal("loved"), v.literal("ok"), v.literal("bad")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireUser(ctx);

    // Cualquiera con acceso a la ficha registra regalos, no solo el dueño;
    // la fila queda con su clerkUserId como autoría.
    await assertPersonAccess(ctx, args.personId, clerkUserId);

    const name = args.giftName.trim();
    if (name.length === 0) throw new ConvexError("El nombre del regalo es obligatorio.");
    if (name.length > MAX_GIFT_NAME) throw new ConvexError("Nombre del regalo demasiado largo.");

    const occasion = args.occasionLabel.trim();
    if (occasion.length === 0) throw new ConvexError("La ocasión es obligatoria.");
    if (occasion.length > MAX_OCCASION) throw new ConvexError("Ocasión demasiado larga.");

    if (args.notes !== undefined && args.notes.length > MAX_NOTES) {
      throw new ConvexError("Notas demasiado largas.");
    }
    if (args.year !== undefined) {
      if (!Number.isInteger(args.year) || args.year < MIN_YEAR || args.year > MAX_YEAR) {
        throw new ConvexError("Año inválido.");
      }
    }
    if (!ALLOWED_REACTIONS.includes(args.reaction)) {
      throw new ConvexError("Reacción inválida.");
    }

    await ctx.db.insert("giftHistory", {
      clerkUserId,
      personId: args.personId,
      giftName: name,
      occasionLabel: occasion,
      year: args.year,
      reaction: args.reaction,
      notes: args.notes,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("giftHistory"),
    giftName: v.string(),
    occasionLabel: v.string(),
    year: v.optional(v.number()),
    reaction: v.union(v.literal("loved"), v.literal("ok"), v.literal("bad")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const clerkUserId = await requireUser(ctx);
    const entry = await ctx.db.get(id);
    if (!entry) throw new ConvexError("Entrada no encontrada.");
    // Editar/borrar una entrada es de quien tiene acceso a la ficha, no solo
    // de quien la registró: es un historial conjunto, no una lista de tareas
    // personales.
    await assertPersonAccess(ctx, entry.personId, clerkUserId, "Entrada no encontrada.");

    const name = fields.giftName.trim();
    if (name.length === 0) throw new ConvexError("El nombre del regalo es obligatorio.");
    if (name.length > MAX_GIFT_NAME) throw new ConvexError("Nombre del regalo demasiado largo.");

    const occasion = fields.occasionLabel.trim();
    if (occasion.length === 0) throw new ConvexError("La ocasión es obligatoria.");
    if (occasion.length > MAX_OCCASION) throw new ConvexError("Ocasión demasiado larga.");

    if (fields.notes !== undefined && fields.notes.length > MAX_NOTES) {
      throw new ConvexError("Notas demasiado largas.");
    }
    if (fields.year !== undefined) {
      if (!Number.isInteger(fields.year) || fields.year < MIN_YEAR || fields.year > MAX_YEAR) {
        throw new ConvexError("Año inválido.");
      }
    }

    // El formulario manda la entrada entera: un año o unas notas que no llegan
    // se han vaciado (el cliente de Convex quita las claves con `undefined`),
    // así que se ponen explícitas para que `db.patch` los borre.
    await ctx.db.patch(id, {
      giftName: name,
      occasionLabel: occasion,
      reaction: fields.reaction,
      year: fields.year,
      notes: fields.notes,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("giftHistory") },
  handler: async (ctx, { id }) => {
    const clerkUserId = await requireUser(ctx);
    const entry = await ctx.db.get(id);
    if (!entry) throw new ConvexError("Entrada no encontrada.");
    await assertPersonAccess(ctx, entry.personId, clerkUserId, "Entrada no encontrada.");
    await ctx.db.delete(id);
  },
});

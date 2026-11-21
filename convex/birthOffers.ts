import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./auth";
import { assertIsOwner } from "./personShares";
import { checkAndIncrement } from "./rateLimit";
import { validateDateInput, validatePersonInput } from "./validators";
import { CREATE_PERSON_DAILY_LIMIT } from "./people";
import { CREATE_DATE_DAILY_LIMIT, assertValidDate } from "./importantDates";
import { babyNameFromLabel, isBirthEvent } from "./birth";

/**
 * La ficha del bebé (21-nov-2026): cuando pasa un nacimiento apuntado en la
 * ficha de alguien, se ofrece hacerle su propia ficha. Ver
 * docs/design-system.md · «Ficha del bebé» y docs/security.md §2.
 *
 * Solo el **dueño** de la ficha del nacimiento ve la oferta y responde: la
 * respuesta se guarda en el propio evento (`birthOffer`), y si la vieran
 * también quienes tienen la ficha compartida, «Ahora no» de uno se la quitaría
 * a los demás.
 */

/**
 * Los nacimientos sin responder de tus fichas. Cuáles ya han pasado lo decide
 * el cliente con `showsInAgenda`: una query de Convex no debe depender de la
 * hora, o su resultado cacheado se quedaría viejo.
 */
export const pending = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    const people = await ctx.db
      .query("people")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    const out = [];
    for (const p of people) {
      const dates = await ctx.db
        .query("importantDates")
        .withIndex("by_person", (q) => q.eq("personId", p._id))
        .collect();
      for (const d of dates) {
        if (!isBirthEvent(d) || d.birthOffer !== undefined) continue;
        out.push({
          importantDateId: d._id,
          label: d.label,
          month: d.month,
          day: d.day,
          year: d.year,
          recurring: d.recurring,
          personId: p._id,
          personName: p.name,
          relationship: p.relationship,
          babyName: babyNameFromLabel(d.label),
        });
      }
    }
    return out;
  },
});

/** «Ahora no»: en la agenda (`hidden`) o en la ficha (`dismissed`). */
export const answer = mutation({
  args: {
    importantDateId: v.id("importantDates"),
    answer: v.union(v.literal("hidden"), v.literal("dismissed")),
  },
  handler: async (ctx, { importantDateId, answer }) => {
    const clerkUserId = await requireUser(ctx);
    const date = await ctx.db.get(importantDateId);
    if (!date) throw new ConvexError("Evento no encontrado.");
    assertIsOwner(await ctx.db.get(date.personId), clerkUserId, "Evento no encontrado.");
    if (!isBirthEvent(date)) throw new ConvexError("Ese evento no es un nacimiento.");
    // Una ficha ya creada no vuelve a estar pendiente, y «dismissed» no baja a «hidden».
    if (date.birthOffer === "created" || date.birthOffer === "dismissed") return;
    await ctx.db.patch(importantDateId, { birthOffer: answer });
  },
});

/**
 * Hace la ficha del bebé: su nombre, la relación, y su cumpleaños cada año con
 * el año en que nació. Todo en la misma transacción que marca la oferta como
 * respondida, para que dos toques no creen dos fichas.
 */
export const createProfile = mutation({
  args: {
    importantDateId: v.id("importantDates"),
    name: v.string(),
    relationship: v.string(),
    month: v.number(),
    day: v.number(),
    year: v.number(),
  },
  handler: async (ctx, { importantDateId, name, relationship, month, day, year }) => {
    const clerkUserId = await requireUser(ctx);
    const date = await ctx.db.get(importantDateId);
    if (!date) throw new ConvexError("Evento no encontrado.");
    assertIsOwner(await ctx.db.get(date.personId), clerkUserId, "Evento no encontrado.");
    if (!isBirthEvent(date)) throw new ConvexError("Ese evento no es un nacimiento.");
    if (date.birthOffer === "created") throw new ConvexError("Ya le hiciste su ficha.");

    const trimmed = name.trim();
    validatePersonInput({ name: trimmed, relationship, interests: [] });
    assertValidDate(month, day, year);
    validateDateInput({ label: "Cumpleaños", year, recurring: true });
    if (new Date(year, month - 1, day).getTime() > Date.now()) {
      throw new ConvexError("La fecha de nacimiento no puede ser futura.");
    }

    await checkAndIncrement(ctx, clerkUserId, "create_person", CREATE_PERSON_DAILY_LIMIT);
    await checkAndIncrement(ctx, clerkUserId, "create_date", CREATE_DATE_DAILY_LIMIT);
    const personId = await ctx.db.insert("people", {
      clerkUserId,
      name: trimmed,
      relationship,
      interests: [],
    });
    await ctx.db.insert("importantDates", {
      personId,
      label: "Cumpleaños",
      month,
      day,
      year,
      recurring: true,
    });
    await ctx.db.patch(importantDateId, { birthOffer: "created" });
    return personId;
  },
});

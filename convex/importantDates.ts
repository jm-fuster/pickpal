import { v, ConvexError } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { requireUser } from "./auth";
import { validateDateInput } from "./validators";
import { checkAndIncrement } from "./rateLimit";
import { Doc, Id } from "./_generated/dataModel";
import { assertPersonAccess, personHasAccess } from "./personShares";
import { normalizeLabel } from "./eventLabels";

const CREATE_DATE_DAILY_LIMIT = 100;

function assertValidDate(month: number, day: number, year?: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new ConvexError("Mes inválido (1-12).");
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new ConvexError("Día inválido (1-31).");
  }
  // 2024 (bisiesto) como año base para fechas recurrentes sin año: permite
  // 29-feb. Con año explícito se valida contra ese año (31-abr o 29-feb-2023
  // se rechazan).
  const daysInMonth = new Date(year ?? 2024, month, 0).getDate();
  if (day > daysInMonth) {
    throw new ConvexError("Día inválido para ese mes.");
  }
}

/**
 * Las recomendaciones se indexan por `occasionLabel` (texto del evento), no por
 * `dateId`. Sin esta unicidad, dos eventos con la misma etiqueta para la misma
 * persona colapsan en una sola fila de recomendación y `getByPersonAndLabel`
 * (presupuesto del prompt) resuelve al primero por orden de inserción.
 */
async function assertLabelUnique(
  ctx: MutationCtx,
  personId: Id<"people">,
  label: string,
  excludeId: Id<"importantDates"> | null,
) {
  const norm = normalizeLabel(label);
  const siblings = await ctx.db
    .query("importantDates")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect();
  if (
    siblings.some(
      (d) => d._id !== excludeId && normalizeLabel(d.label) === norm,
    )
  ) {
    throw new ConvexError(
      "Ya existe un evento con esa etiqueta para esta persona.",
    );
  }
}

/**
 * Reapunta las recomendaciones cacheadas del evento de `oldLabel` a `newLabel`
 * cuando se renombra. Sin esto, renombrar una etiqueta deja las ideas generadas
 * huérfanas bajo la etiqueta vieja (invisibles y nunca limpiadas). Como la clave
 * es exacta, migramos siempre que cambie el string literal (incluido un cambio
 * solo de mayúsculas/espacios).
 */
async function migrateRecommendationLabel(
  ctx: MutationCtx,
  clerkUserId: string,
  personId: Id<"people">,
  oldLabel: string,
  newLabel: string,
) {
  const recs = await ctx.db
    .query("recommendations")
    .withIndex("by_user_person_occasion_type", (q) =>
      q
        .eq("clerkUserId", clerkUserId)
        .eq("personId", personId)
        .eq("occasionLabel", oldLabel),
    )
    .collect();
  for (const rec of recs) {
    // Una rec huérfana previa bajo (newLabel, mismo giftType) rompería el
    // `.unique()` de getByPersonOccasion: la eliminamos antes de migrar.
    const clash = await ctx.db
      .query("recommendations")
      .withIndex("by_user_person_occasion_type", (q) =>
        q
          .eq("clerkUserId", clerkUserId)
          .eq("personId", personId)
          .eq("occasionLabel", newLabel)
          .eq("giftType", rec.giftType),
      )
      .unique();
    if (clash) await ctx.db.delete(clash._id);
    await ctx.db.patch(rec._id, { occasionLabel: newLabel });
  }
}

export const getByPerson = query({
  args: { personId: v.id("people") },
  handler: async (ctx, { personId }) => {
    const clerkUserId = await requireUser(ctx);
    const person = await ctx.db.get(personId);
    if (!(await personHasAccess(ctx, person, clerkUserId))) return [];
    return await ctx.db
      .query("importantDates")
      .withIndex("by_person", (q) => q.eq("personId", personId))
      .collect();
  },
});

export const getUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    const owned = await ctx.db
      .query("people")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    // + las personas que te han compartido: sus eventos también entran en tu
    // agenda, igual que en people.getAll.
    const shares = await ctx.db
      .query("personShares")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    const shared = (
      await Promise.all(shares.map((s) => ctx.db.get(s.personId)))
    ).filter((p): p is Doc<"people"> => p !== null);
    const people = [...owned, ...shared];

    const result: Array<{
      date: Doc<"importantDates">;
      person: Doc<"people">;
    }> = [];
    for (const person of people) {
      const dates = await ctx.db
        .query("importantDates")
        .withIndex("by_person", (q) => q.eq("personId", person._id))
        .collect();
      for (const date of dates) {
        result.push({ date, person });
      }
    }

    const todayStart = new Date(Date.now());
    todayStart.setHours(0, 0, 0, 0);
    return result.filter(({ date }) => {
      if (date.recurring === false) {
        if (date.year === undefined) return false;
        const d = new Date(date.year, date.month - 1, date.day);
        d.setHours(23, 59, 59, 999);
        return d.getTime() >= todayStart.getTime();
      }
      return true;
    });
  },
});

export const create = mutation({
  args: {
    personId: v.id("people"),
    label: v.string(),
    month: v.number(),
    day: v.number(),
    year: v.optional(v.number()),
    recurring: v.optional(v.boolean()),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireUser(ctx);
    await assertPersonAccess(ctx, args.personId, clerkUserId);
    assertValidDate(args.month, args.day, args.year);
    validateDateInput({ label: args.label, year: args.year, recurring: args.recurring, budgetMin: args.budgetMin, budgetMax: args.budgetMax });
    await assertLabelUnique(ctx, args.personId, args.label, null);
    await checkAndIncrement(
      ctx,
      clerkUserId,
      "create_date",
      CREATE_DATE_DAILY_LIMIT,
    );
    return await ctx.db.insert("importantDates", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("importantDates"),
    label: v.optional(v.string()),
    month: v.optional(v.number()),
    day: v.optional(v.number()),
    year: v.optional(v.number()),
    recurring: v.optional(v.boolean()),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clerkUserId = await requireUser(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("Fecha no encontrada.");
    await assertPersonAccess(ctx, existing.personId, clerkUserId);
    if (
      patch.month !== undefined ||
      patch.day !== undefined ||
      patch.year !== undefined
    ) {
      assertValidDate(
        patch.month ?? existing.month,
        patch.day ?? existing.day,
        patch.year ?? existing.year,
      );
    }
    const mergedRecurring = patch.recurring ?? existing.recurring;
    const mergedYear = patch.year ?? existing.year;
    validateDateInput({
      label: patch.label ?? existing.label,
      year: mergedYear,
      recurring: mergedRecurring,
      budgetMin: patch.budgetMin ?? existing.budgetMin,
      budgetMax: patch.budgetMax ?? existing.budgetMax,
    });
    if (patch.label !== undefined) {
      // Unicidad solo si la etiqueta normalizada cambia: reguardar el mismo
      // label (p. ej. al editar solo el presupuesto) no debe bloquearse aunque
      // existan duplicados heredados. Migración si cambia el string literal,
      // porque la clave de las recomendaciones es exacta.
      if (normalizeLabel(patch.label) !== normalizeLabel(existing.label)) {
        await assertLabelUnique(ctx, existing.personId, patch.label, id);
      }
      if (patch.label !== existing.label) {
        await migrateRecommendationLabel(
          ctx,
          clerkUserId,
          existing.personId,
          existing.label,
          patch.label,
        );
      }
    }
    await ctx.db.patch(id, patch);
  },
});

export const getByPersonAndLabel = query({
  args: { personId: v.id("people"), label: v.string() },
  handler: async (ctx, { personId, label }) => {
    const clerkUserId = await requireUser(ctx);
    await assertPersonAccess(ctx, personId, clerkUserId);
    const dates = await ctx.db
      .query("importantDates")
      .withIndex("by_person", (q) => q.eq("personId", personId))
      .collect();
    return dates.find((d) => d.label === label) ?? null;
  },
});

export const remove = mutation({
  args: { id: v.id("importantDates") },
  handler: async (ctx, { id }) => {
    const clerkUserId = await requireUser(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("Fecha no encontrada.");
    await assertPersonAccess(ctx, existing.personId, clerkUserId);
    // Sus ideas guardadas pasan a «Sin ocasión» en vez de quedarse apuntando a
    // un evento que ya no existe (docs/encargo-ocasiones.md, decisión 12). Cada
    // vuelta relee el índice: las ya parcheadas dejan de salir en él.
    for (;;) {
      const batch = await ctx.db
        .query("savedIdeas")
        .withIndex("by_important_date", (q) => q.eq("importantDateId", id))
        .take(100);
      if (batch.length === 0) break;
      for (const idea of batch) {
        await ctx.db.patch(idea._id, { importantDateId: undefined });
      }
    }
    await ctx.db.delete(id);
  },
});

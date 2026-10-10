import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { findEventByLabel } from "./eventLabels";

const remapMapValidator = v.array(
  v.object({ oldClerkUserId: v.string(), newClerkUserId: v.string() }),
);

/**
 * Inventario: todos los clerkUserId distintos que tienen algún documento en
 * cualquiera de las 7 tablas. Se usa antes de migrar, para confirmar que el
 * mapa old->new cubre a todo el mundo y nadie se queda huérfano.
 *
 *   npx convex run migrations:listDistinctClerkUserIds --prod
 */
export const listDistinctClerkUserIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const ids = new Set<string>();

    for (const doc of await ctx.db.query("people").collect()) {
      ids.add(doc.clerkUserId);
    }
    for (const doc of await ctx.db.query("userSettings").collect()) {
      ids.add(doc.clerkUserId);
    }
    for (const doc of await ctx.db.query("emailNotifications").collect()) {
      ids.add(doc.clerkUserId);
    }
    for (const doc of await ctx.db.query("recommendationUsage").collect()) {
      ids.add(doc.clerkUserId);
    }
    for (const doc of await ctx.db.query("rateLimitBuckets").collect()) {
      ids.add(doc.clerkUserId);
    }
    for (const doc of await ctx.db.query("recommendations").collect()) {
      ids.add(doc.clerkUserId);
    }
    for (const doc of await ctx.db.query("savedIdeas").collect()) {
      ids.add(doc.clerkUserId);
    }

    return Array.from(ids).sort();
  },
});

/**
 * Migración Clerk dev → Clerk prod: reescribe `clerkUserId` (viejo → nuevo)
 * en las 7 tablas que lo llevan. `importantDates` y `giftHistory` cuelgan de
 * `personId`, no de `clerkUserId`, y se arrastran solas con `people`.
 *
 * Uso (dry run primero, siempre):
 *   npx convex run migrations:remapClerkUserId '{"map":[{"oldClerkUserId":"user_old","newClerkUserId":"user_new"}],"dryRun":true}'
 *   npx convex run migrations:remapClerkUserId '{"map":[...],"dryRun":false}'
 *   (añade --prod para correrla contra el deployment de producción)
 *
 * Idempotente: una vez migrado un doc, ya no matchea `oldClerkUserId`, así
 * que repetir la llamada no vuelve a tocarlo.
 */
export const remapClerkUserId = internalMutation({
  args: {
    map: remapMapValidator,
    dryRun: v.boolean(),
  },
  handler: async (ctx, { map, dryRun }) => {
    const counts: Record<string, Record<string, number>> = {};

    for (const { oldClerkUserId, newClerkUserId } of map) {
      const perTable: Record<string, number> = {};

      const people = await ctx.db
        .query("people")
        .withIndex("by_user", (q) => q.eq("clerkUserId", oldClerkUserId))
        .collect();
      perTable.people = people.length;
      if (!dryRun) {
        for (const doc of people) {
          await ctx.db.patch(doc._id, { clerkUserId: newClerkUserId });
        }
      }

      const userSettings = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("clerkUserId", oldClerkUserId))
        .collect();
      perTable.userSettings = userSettings.length;
      if (!dryRun) {
        for (const doc of userSettings) {
          await ctx.db.patch(doc._id, { clerkUserId: newClerkUserId });
        }
      }

      const emailNotifications = await ctx.db
        .query("emailNotifications")
        .withIndex("by_user", (q) => q.eq("clerkUserId", oldClerkUserId))
        .collect();
      perTable.emailNotifications = emailNotifications.length;
      if (!dryRun) {
        for (const doc of emailNotifications) {
          await ctx.db.patch(doc._id, { clerkUserId: newClerkUserId });
        }
      }

      const recommendationUsage = await ctx.db
        .query("recommendationUsage")
        .withIndex("by_user_day", (q) => q.eq("clerkUserId", oldClerkUserId))
        .collect();
      perTable.recommendationUsage = recommendationUsage.length;
      if (!dryRun) {
        for (const doc of recommendationUsage) {
          await ctx.db.patch(doc._id, { clerkUserId: newClerkUserId });
        }
      }

      const rateLimitBuckets = await ctx.db
        .query("rateLimitBuckets")
        .withIndex("by_user_day_bucket", (q) =>
          q.eq("clerkUserId", oldClerkUserId),
        )
        .collect();
      perTable.rateLimitBuckets = rateLimitBuckets.length;
      if (!dryRun) {
        for (const doc of rateLimitBuckets) {
          await ctx.db.patch(doc._id, { clerkUserId: newClerkUserId });
        }
      }

      const recommendations = await ctx.db
        .query("recommendations")
        .withIndex("by_user_person_occasion_type", (q) =>
          q.eq("clerkUserId", oldClerkUserId),
        )
        .collect();
      perTable.recommendations = recommendations.length;
      if (!dryRun) {
        for (const doc of recommendations) {
          await ctx.db.patch(doc._id, { clerkUserId: newClerkUserId });
        }
      }

      const savedIdeas = await ctx.db
        .query("savedIdeas")
        .withIndex("by_user", (q) => q.eq("clerkUserId", oldClerkUserId))
        .collect();
      perTable.savedIdeas = savedIdeas.length;
      if (!dryRun) {
        for (const doc of savedIdeas) {
          await ctx.db.patch(doc._id, { clerkUserId: newClerkUserId });
        }
      }

      counts[oldClerkUserId] = perTable;
    }

    return { dryRun, counts };
  },
});

/**
 * Avisos por correo: opt-out → opt-in. Hasta ahora `settings.ensureDefaults`
 * creaba el doc con `emailNotificationsEnabled: true`, así que todo usuario con
 * email quedaba suscrito sin pedirlo, mientras `/privacidad` prometía que los
 * correos solo salen "si activas las notificaciones". Corregido el default;
 * esta migración arregla a los usuarios ya creados con el flag heredado.
 *
 * Pone `emailNotificationsEnabled: false` en TODOS los docs que lo tengan en
 * `true`. No se puede distinguir "activado por el default" de "activado a
 * mano" —no guardamos esa señal—, así que se resetea a todos: pedir un opt-in
 * de nuevo es recuperable, seguir enviando sin consentimiento no lo es. El
 * resto de ajustes (antelaciones, tiendas, email) se conserva intacto, así que
 * reactivarlo es un clic en /settings.
 *
 * Uso (dry run primero, siempre):
 *   npx convex run migrations:resetEmailNotificationsToOptIn '{"dryRun":true}'
 *   npx convex run migrations:resetEmailNotificationsToOptIn '{"dryRun":false}'
 *   (añade --prod para el deployment de producción)
 *
 * Idempotente: tras correrla ningún doc queda en `true`, así que repetirla no
 * toca nada. Correr una sola vez — si se repite después de que alguien
 * reactive sus avisos, se los volvería a desactivar.
 */
export const resetEmailNotificationsToOptIn = internalMutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const enabled = (await ctx.db.query("userSettings").collect()).filter(
      (doc) => doc.emailNotificationsEnabled === true,
    );

    if (!dryRun) {
      for (const doc of enabled) {
        await ctx.db.patch(doc._id, { emailNotificationsEnabled: false });
      }
    }

    return {
      dryRun,
      reset: enabled.length,
      clerkUserIds: enabled.map((doc) => doc.clerkUserId).sort(),
    };
  },
});

/**
 * Verificación post-migración: para cada `oldClerkUserId`, cuenta cuántos
 * documentos siguen referenciándolo en las 7 tablas. Todo en 0 = migración
 * completa; cualquier valor > 0 apunta a qué tabla quedó sin migrar.
 *
 *   npx convex run migrations:findRemainingOldClerkUserIds '{"oldClerkUserIds":["user_old1","user_old2"]}'
 */
export const findRemainingOldClerkUserIds = internalQuery({
  args: { oldClerkUserIds: v.array(v.string()) },
  handler: async (ctx, { oldClerkUserIds }) => {
    const remaining: Record<string, Record<string, number>> = {};

    for (const oldClerkUserId of oldClerkUserIds) {
      const perTable: Record<string, number> = {};

      perTable.people = (
        await ctx.db
          .query("people")
          .withIndex("by_user", (q) => q.eq("clerkUserId", oldClerkUserId))
          .collect()
      ).length;

      perTable.userSettings = (
        await ctx.db
          .query("userSettings")
          .withIndex("by_user", (q) => q.eq("clerkUserId", oldClerkUserId))
          .collect()
      ).length;

      perTable.emailNotifications = (
        await ctx.db
          .query("emailNotifications")
          .withIndex("by_user", (q) => q.eq("clerkUserId", oldClerkUserId))
          .collect()
      ).length;

      perTable.recommendationUsage = (
        await ctx.db
          .query("recommendationUsage")
          .withIndex("by_user_day", (q) =>
            q.eq("clerkUserId", oldClerkUserId),
          )
          .collect()
      ).length;

      perTable.rateLimitBuckets = (
        await ctx.db
          .query("rateLimitBuckets")
          .withIndex("by_user_day_bucket", (q) =>
            q.eq("clerkUserId", oldClerkUserId),
          )
          .collect()
      ).length;

      perTable.recommendations = (
        await ctx.db
          .query("recommendations")
          .withIndex("by_user_person_occasion_type", (q) =>
            q.eq("clerkUserId", oldClerkUserId),
          )
          .collect()
      ).length;

      perTable.savedIdeas = (
        await ctx.db
          .query("savedIdeas")
          .withIndex("by_user", (q) => q.eq("clerkUserId", oldClerkUserId))
          .collect()
      ).length;

      remaining[oldClerkUserId] = perTable;
    }

    return remaining;
  },
});

/**
 * Vincula cada idea guardada con su evento (`importantDateId`), buscándolo por
 * nombre entre los eventos de su persona con la misma normalización que la
 * unicidad de etiquetas (docs/encargo-ocasiones.md, «Qué hay que construir» §2).
 * Las que no encuentran evento, porque se renombró o se borró, y las ambiguas,
 * porque hay dos eventos con el mismo nombre de antes de la regla de
 * unicidad, se quedan sin vínculo: «Sin ocasión». Las repetidas (misma
 * persona y mismo título) solo se cuentan; no se fusionan.
 *
 * Uso (dry run primero, siempre):
 *   npx convex run migrations:linkSavedIdeasToEvents '{"dryRun":true}'
 *   npx convex run migrations:linkSavedIdeasToEvents '{"dryRun":false}'
 *   (añade --prod para el deployment de producción)
 *
 * Idempotente: las ideas ya vinculadas no se tocan. Correr una sola vez, entre
 * el despliegue que crea el campo y el que enseña la tarjeta agrupada: después
 * de que exista «Mover a Sin ocasión», repetirla volvería a meter en su evento
 * las ideas que alguien sacó a mano.
 */
export const linkSavedIdeasToEvents = internalMutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const ideas = await ctx.db.query("savedIdeas").collect();
    const datesByPerson = new Map<
      Id<"people">,
      { _id: Id<"importantDates">; label: string }[]
    >();
    const titlesByPerson = new Map<Id<"people">, Map<string, number>>();
    const counts = { linked: 0, alreadyLinked: 0, noEvent: 0, ambiguous: 0 };

    for (const idea of ideas) {
      const titles = titlesByPerson.get(idea.personId) ?? new Map<string, number>();
      titles.set(idea.title, (titles.get(idea.title) ?? 0) + 1);
      titlesByPerson.set(idea.personId, titles);

      if (idea.importantDateId !== undefined) {
        counts.alreadyLinked++;
        continue;
      }
      let dates = datesByPerson.get(idea.personId);
      if (!dates) {
        dates = await ctx.db
          .query("importantDates")
          .withIndex("by_person", (q) => q.eq("personId", idea.personId))
          .collect();
        datesByPerson.set(idea.personId, dates);
      }
      const match = findEventByLabel(dates, idea.occasionLabel);
      if (match.kind === "match") {
        counts.linked++;
        if (!dryRun) await ctx.db.patch(idea._id, { importantDateId: match.id });
      } else if (match.kind === "ambiguous") {
        counts.ambiguous++;
      } else {
        counts.noEvent++;
      }
    }

    let duplicatePairs = 0;
    for (const titles of titlesByPerson.values()) {
      for (const n of titles.values()) if (n > 1) duplicatePairs++;
    }

    return { dryRun, total: ideas.length, ...counts, duplicatePairs };
  },
});

import { mutation } from "./_generated/server";
import { requireUser } from "./auth";
import { deletePersonCascade } from "./people";
import { deleteSharesForUser, transferToOldestInviteeOrNull } from "./personShares";
import { deleteListDataForUser } from "./lists";

/**
 * Borra todos los datos del usuario autenticado en Convex.
 *
 * Se llama desde `src/app/api/account/delete/route.ts` justo antes de
 * borrar el usuario en Clerk. La autorización es por sesión: `requireUser`
 * obtiene el `clerkUserId` del JWT — nunca se acepta como argumento.
 *
 * Tablas que limpia:
 * - `people` que posees: si nadie más tiene acceso, en cascada (vía
 *   `deletePersonCascade`) con sus `importantDates`, `giftHistory`,
 *   `recommendations`, `savedIdeas` y `personShares`. Si la habías
 *   compartido, la propiedad pasa al invitado más antiguo en lugar de
 *   borrarla — ver la nota más abajo.
 * - `personShares` donde eres tú el invitado (fichas de otros que te habían
 *   compartido): te desliga de todas, igual que `personShares.leave` pero en
 *   bloque.
 * - `savedIdeas` que autoraste y cuya persona ya no existe (de antes de que
 *   la cascada las cubriera), vía índice `by_user`. Ojo: "autoraste" no es
 *   "eras dueño" — si la persona sigue existiendo (p. ej. se transfirió más
 *   arriba, o es una ficha ajena que te compartieron), esas filas se quedan:
 *   son parte del historial conjunto, no solo tuyas.
 * - «Mi lista» (`listItems`, `listShares`, `listClaims`), vía
 *   `lists.deleteListDataForUser`: tu lista entera, sin transferirla a nadie,
 *   y los permisos y marcas que tenías en listas de otros.
 * - `userSettings`, `emailNotifications`, `recommendationUsage`, `rateLimitBuckets`.
 *
 * No expone `clerkUserId` como argumento ni acepta un `userId` distinto al
 * de la sesión: un usuario solo puede borrarse a sí mismo.
 */
export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);

    const people = await ctx.db
      .query("people")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();

    for (const person of people) {
      // Decisión 6 de docs/dudas.md: bloquear el borrado no es opción (irse
      // es un derecho RGPD) y borrar en cascada castigaría a un invitado por
      // una decisión que no tomó. Si hay alguien invitado, la ficha pasa a
      // ser suya; si no hay nadie, se borra como antes.
      const heir = await transferToOldestInviteeOrNull(ctx, person);
      if (!heir) {
        await deletePersonCascade(ctx, person._id);
      }
    }

    // Fichas ajenas que te habían compartido: te desligas de todas.
    await deleteSharesForUser(ctx, clerkUserId);

    await deleteListDataForUser(ctx, clerkUserId);

    // Huérfana de verdad = su persona ya no existe. No basta con "no soy su
    // dueño ahora": una transferida sigue viva, y una idea que guardaste en
    // una ficha ajena que te compartieron no es "tuya para borrar" al cerrar
    // tu cuenta — sigue siendo del historial conjunto de esa ficha.
    const authoredSaved = await ctx.db
      .query("savedIdeas")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    for (const s of authoredSaved) {
      if (!(await ctx.db.get(s.personId))) await ctx.db.delete(s._id);
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    for (const s of settings) await ctx.db.delete(s._id);

    const emails = await ctx.db
      .query("emailNotifications")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    for (const e of emails) await ctx.db.delete(e._id);

    const usage = await ctx.db
      .query("recommendationUsage")
      .withIndex("by_user_day", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    for (const u of usage) await ctx.db.delete(u._id);

    const buckets = await ctx.db
      .query("rateLimitBuckets")
      .withIndex("by_user_day_bucket", (q) =>
        q.eq("clerkUserId", clerkUserId),
      )
      .collect();
    for (const b of buckets) await ctx.db.delete(b._id);
  },
});

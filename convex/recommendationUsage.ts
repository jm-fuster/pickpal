import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./auth";
import { checkAndIncrement } from "./rateLimit";

const DAILY_LIMIT = 10;

/**
 * Intentos al día, cuenten o no. `refund` devuelve la unidad cuando la
 * generación falla, también si Gemini devuelve algo que no valida, y eso
 * depende en parte de lo que hay en la ficha: unas notas que le pidan «solo
 * tres ideas» harían fallar cada intento y salir gratis. Este cubo no se
 * devuelve nunca, así que acota las llamadas a Gemini de una cuenta aunque
 * todas fallen. Con margen para quien reintenta durante una caída del
 * proveedor: 10 que salen y 20 que no.
 */
const ATTEMPT_DAILY_LIMIT = 30;

const todayUTC = (): string => {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * `reserve`/`refund` modifican la cuota diaria y deben invocarse SOLO desde la
 * API route server-side (`/api/recommendations`), nunca desde el navegador: un
 * cliente autenticado que llamara a `refund` directamente podría decrementar su
 * propio contador y saltarse el límite de 10/día. Como la route las invoca con
 * `fetchMutation` —que solo alcanza funciones públicas, no `internal*`— las
 * dejamos públicas pero exigimos un secreto compartido server-only. El valor de
 * `CONVEX_SERVER_SECRET` debe ser idéntico en el entorno de Convex y en el de
 * Next. Fail-closed: si no está configurado, se rechaza.
 */
/**
 * Comparación en tiempo constante. `===` sobre strings corta en el primer byte
 * que difiere, así que el tiempo de respuesta filtra cuántos caracteres del
 * secreto se han acertado. Sobre la red el ruido tapa casi siempre esa señal,
 * pero el coste de no depender de ello es este bucle. La longitud sí se
 * compara de golpe: no es lo que hay que proteger.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function assertServerCaller(secret: string) {
  const expected = process.env.CONVEX_SERVER_SECRET;
  if (!expected || !timingSafeEqual(secret, expected)) {
    throw new ConvexError("No autorizado.");
  }
}

/**
 * Comprueba si el usuario tiene cuota disponible sin consumirla.
 * Lanza ConvexError si ya alcanzó el límite.
 */
export const check = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    const day = todayUTC();
    const existing = await ctx.db
      .query("recommendationUsage")
      .withIndex("by_user_day", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("day", day),
      )
      .unique();
    const count = existing?.count ?? 0;
    if (count >= DAILY_LIMIT) {
      throw new ConvexError(
        `Has alcanzado el límite diario de ${DAILY_LIMIT} recomendaciones. Vuelve mañana.`,
      );
    }
    return { count, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - count };
  },
});

/**
 * Reserva atómicamente una unidad de cuota ANTES de llamar al proveedor de IA.
 * Lanza ConvexError si el usuario ya alcanzó el límite diario.
 *
 * Al incrementar dentro de la mutation (transacción Convex), dos peticiones
 * concurrentes en el límite no pueden superar las 10 generaciones/día — la
 * pareja check+consume anterior dejaba una ventana entre verificar y consumir.
 * Devuelve { count, limit, remaining } tras reservar.
 */
export const reserve = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    const clerkUserId = await requireUser(ctx);
    assertServerCaller(secret);
    const day = todayUTC();

    const existing = await ctx.db
      .query("recommendationUsage")
      .withIndex("by_user_day", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("day", day),
      )
      .unique();

    const count = existing?.count ?? 0;
    if (count >= DAILY_LIMIT) {
      throw new ConvexError(
        `Has alcanzado el límite diario de ${DAILY_LIMIT} recomendaciones. Vuelve mañana.`,
      );
    }
    await checkAndIncrement(ctx, clerkUserId, "generate_ideas_attempt", ATTEMPT_DAILY_LIMIT);

    if (existing) {
      await ctx.db.patch(existing._id, { count: count + 1 });
    } else {
      await ctx.db.insert("recommendationUsage", {
        clerkUserId,
        day,
        count: 1,
      });
    }
    return {
      // Día UTC del bucket reservado. `refund` lo recibe para no fallar si el
      // fallo del proveedor cruza la medianoche UTC entre reservar y reembolsar.
      day,
      count: count + 1,
      limit: DAILY_LIMIT,
      remaining: DAILY_LIMIT - (count + 1),
    };
  },
});

/**
 * Devuelve una unidad reservada con `reserve`. Solo se llama desde la API
 * route cuando la generación falla y no se guardó nada: el usuario no pierde
 * cuota por una caída ajena. Nunca baja el contador de 0, y no devuelve el
 * intento (`ATTEMPT_DAILY_LIMIT`).
 */
export const refund = mutation({
  // `day` es el bucket que devolvió `reserve`. Opcional por compatibilidad: si
  // no se pasa, cae al día UTC actual (comportamiento previo).
  args: { day: v.optional(v.string()), secret: v.string() },
  handler: async (ctx, { day: providedDay, secret }) => {
    const clerkUserId = await requireUser(ctx);
    assertServerCaller(secret);
    const day = providedDay ?? todayUTC();

    const existing = await ctx.db
      .query("recommendationUsage")
      .withIndex("by_user_day", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("day", day),
      )
      .unique();

    if (existing && existing.count > 0) {
      await ctx.db.patch(existing._id, { count: existing.count - 1 });
    }
    return null;
  },
});

import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireUser } from "./auth";
import { personHasAccess } from "./personShares";

/**
 * Copia completa de los datos del usuario autenticado (RGPD art. 15 y 20).
 *
 * Recorre exactamente las mismas tablas que `account.deleteMyAccount`: si una
 * se borra al cerrar la cuenta, es porque es del usuario, y entonces tiene que
 * salir aquí. Cuando se añada una tabla nueva hay que tocar las dos, y
 * `exportData.test.ts` falla si solo se toca una.
 *
 * Igual que el borrado, la autorización es por sesión: `requireUser` saca el
 * `clerkUserId` del JWT y nunca se acepta como argumento, así que nadie puede
 * exportar la cuenta de otro.
 *
 * Los datos van anidados bajo cada persona —sus fechas, su historial, sus
 * ideas— porque una exportación que hay que recomponer a mano no sirve de
 * mucho. Se quitan `_id` y `clerkUserId` de cada fila: son identificadores
 * internos que fuera de la base de datos no significan nada. `_creationTime`
 * se queda, que sí dice algo: cuándo se creó.
 */

/**
 * Quita el ruido interno pero conserva cuándo se creó. El tipo de vuelta
 * mantiene el resto de campos: una exportación tipada como
 * `Record<string, unknown>` obliga a castear en cada uso, y el typecheck deja
 * de avisar si un campo cambia de nombre.
 */
const limpiar = <T extends Record<string, unknown>>(row: T) => {
  const { _id, clerkUserId, personId, ...resto } = row;
  void _id;
  void clerkUserId;
  void personId;
  return resto as Omit<T, "_id" | "clerkUserId" | "personId">;
};

/**
 * Una idea guardada con el nombre actual de su ocasión en vez del
 * `importantDateId`: `limpiar` quita el `_id` de las fechas, así que el id
 * exportado no llevaría a ninguna parte (docs/encargo-ocasiones.md).
 */
const conOcasion = (
  idea: Doc<"savedIdeas">,
  fechas: Doc<"importantDates">[],
) => {
  const { importantDateId, ...resto } = limpiar(idea);
  const ocasion = fechas.find((f) => f._id === importantDateId)?.label ?? "Sin ocasión";
  return { ...resto, ocasion };
};

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireUser(ctx);
    const identity = await ctx.auth.getUserIdentity();

    const people = await ctx.db
      .query("people")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();

    const seresQueridos = [];
    for (const person of people) {
      const [fechas, historial, ideasGuardadas, ideasGeneradas, compartidoCon] = await Promise.all([
        ctx.db
          .query("importantDates")
          .withIndex("by_person", (q) => q.eq("personId", person._id))
          .collect(),
        ctx.db
          .query("giftHistory")
          .withIndex("by_person", (q) => q.eq("personId", person._id))
          .collect(),
        ctx.db
          .query("savedIdeas")
          .withIndex("by_person", (q) => q.eq("personId", person._id))
          .collect(),
        ctx.db
          .query("recommendations")
          .withIndex("by_person", (q) => q.eq("personId", person._id))
          .collect(),
        // Con quién compartes esta ficha (convex/personShares.ts). Se lista
        // aquí en vez de con `limpiar`: para esta tabla el propio
        // `clerkUserId` de cada fila ES el dato — a quién se le dio acceso.
        ctx.db
          .query("personShares")
          .withIndex("by_person", (q) => q.eq("personId", person._id))
          .collect(),
      ]);

      seresQueridos.push({
        ...limpiar(person),
        fechas: fechas.map(limpiar),
        historialDeRegalos: historial.map(limpiar),
        ideasGuardadas: ideasGuardadas.map((idea) => conOcasion(idea, fechas)),
        ideasGeneradasPorLaIA: ideasGeneradas.map(limpiar),
        compartidoCon: compartidoCon.map((s) => ({
          clerkUserId: s.clerkUserId,
          desde: s._creationTime,
        })),
      });
    }

    // Fichas que OTROS han compartido contigo: no son tuyas (no se exporta su
    // ficha completa), pero que tengas acceso a ellas sí es un dato tuyo.
    const misAccesosCompartidos = await ctx.db
      .query("personShares")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    const fichasQueTeComparten = await Promise.all(
      misAccesosCompartidos.map(async (s) => {
        const persona = await ctx.db.get(s.personId);
        return { nombre: persona?.name ?? null, desde: s._creationTime };
      }),
    );

    // «Mi lista» como dueño: los elementos y a quién se la has compartido.
    // Sin `listClaims`: si las marcas salieran aquí, bastaría con descargar
    // los datos para saber qué te van a regalar (decisión 21 de
    // docs/encargo-lista.md). Una marca es un dato de quien la hace, y sale en
    // su exportación, en `marcasEnListasDeOtros`.
    const [elementosDeMiLista, quienVeMiLista, listasQueMeComparten, misMarcas] =
      await Promise.all([
        ctx.db
          .query("listItems")
          .withIndex("by_owner", (q) => q.eq("ownerClerkUserId", clerkUserId))
          .collect(),
        ctx.db
          .query("listShares")
          .withIndex("by_owner", (q) => q.eq("ownerClerkUserId", clerkUserId))
          .collect(),
        ctx.db
          .query("listShares")
          .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
          .collect(),
        ctx.db
          .query("listClaims")
          .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
          .collect(),
      ]);
    // Avisos por correo de «Mi lista»: cuándo se avisó a quien invitaste y
    // cuándo te avisaron a ti. Se guardan solo para el tope de uno cada 30 días.
    const [avisosEnviados, avisosRecibidos] = await Promise.all([
      ctx.db
        .query("listInviteEmails")
        .withIndex("by_owner_and_reader", (q) => q.eq("ownerClerkUserId", clerkUserId))
        .collect(),
      ctx.db
        .query("listInviteEmails")
        .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
        .collect(),
    ]);
    const listasQueTeComparten = await Promise.all(
      listasQueMeComparten.map(async (s) => {
        // Solo si aún puedes ver la ficha: si te la dejaron de compartir, su
        // nombre ya no es dato tuyo.
        const ficha = s.personId ? await ctx.db.get(s.personId) : null;
        const veoLaFicha = await personHasAccess(ctx, ficha, clerkUserId);
        return {
          de: s.ownerName ?? null,
          email: s.ownerEmail ?? null,
          desde: s._creationTime,
          fichaAsociada: veoLaFicha ? (ficha?.name ?? null) : null,
        };
      }),
    );
    const marcasEnListasDeOtros = await Promise.all(
      misMarcas.map(async (c) => {
        const elemento = c.itemId ? await ctx.db.get(c.itemId) : null;
        return {
          elemento: elemento?.title ?? c.snapshot?.title ?? null,
          estado: c.status === "given" ? "regalado" : "lo regalo yo",
          sigueEnSuLista: c.itemId !== undefined,
          desde: c._creationTime,
        };
      }),
    );

    // Ideas de personas YA BORRADAS: el borrado en cascada las recoge por este
    // mismo índice, así que la exportación también. Huérfana de verdad = su
    // persona ya no existe — no basta con "no la tengo en `seresQueridos`",
    // porque desde que existe compartir eso también pasa con una idea que
    // guardaste en una ficha ajena que te compartieron (sigue viva, solo que
    // no es tuya). Esas no se listan aquí ni en `seresQueridos`: el resumen
    // de esas fichas está en `fichasQueTeComparten`.
    const autoradas = await ctx.db
      .query("savedIdeas")
      .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();
    const huerfanas = [];
    for (const s of autoradas) {
      if (!(await ctx.db.get(s.personId))) huerfanas.push(s);
    }

    const [ajustes, avisos, cuotaIA, cubosDeLimite] = await Promise.all([
      ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
        .collect(),
      ctx.db
        .query("emailNotifications")
        .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
        .collect(),
      ctx.db
        .query("recommendationUsage")
        .withIndex("by_user_day", (q) => q.eq("clerkUserId", clerkUserId))
        .collect(),
      ctx.db
        .query("rateLimitBuckets")
        .withIndex("by_user_day_bucket", (q) => q.eq("clerkUserId", clerkUserId))
        .collect(),
    ]);

    return {
      aplicacion: "PickPal",
      // Qué es cada cosa, para quien abra el archivo sin conocer el esquema.
      leeme:
        "Copia de todos tus datos en PickPal. Los datos de tu cuenta " +
        "(nombre, email, contraseña) los gestiona Clerk y puedes pedirlos allí; " +
        "aquí va lo que guarda PickPal. Las fechas están en milisegundos desde " +
        "1970 y los presupuestos en céntimos. Cada ser querido lleva un " +
        "\"compartidoCon\" con quién más tiene acceso a su ficha; " +
        "\"fichasQueTeComparten\" son las de otros a las que tú tienes acceso " +
        "(no se incluye su contenido completo, solo que las ves). " +
        "\"miLista\" es lo que has apuntado que te haría ilusión y con quién " +
        "la compartes; no incluye qué ha marcado nadie para regalarte. " +
        "\"marcasEnListasDeOtros\" es lo que has marcado tú en listas ajenas.",
      usuario: {
        // El identificador con el que se guarda todo lo de abajo.
        clerkUserId,
        email: identity?.email ?? null,
      },
      ajustes: ajustes.map(limpiar),
      seresQueridos,
      fichasQueTeComparten,
      miLista: {
        elementos: elementosDeMiLista.map((i) => ({
          titulo: i.title,
          enlace: i.url ?? null,
          nota: i.note ?? null,
          _creationTime: i._creationTime,
          editadoEn: i.editedAt ?? null,
        })),
        // Igual que `compartidoCon` de las fichas: el `clerkUserId` de cada
        // fila es el dato, a quién le diste acceso.
        compartidaCon: quienVeMiLista.map((s) => ({
          clerkUserId: s.readerClerkUserId,
          desde: s._creationTime,
        })),
      },
      listasQueTeComparten,
      marcasEnListasDeOtros,
      avisosDeListaPorCorreo: {
        // A quién avisamos de que le compartiste tu lista, y cuándo.
        enviados: avisosEnviados.map((a) => ({ clerkUserId: a.readerClerkUserId, enviado: a.sentAt })),
        // Cuándo te avisaron de que alguien te compartió la suya.
        recibidos: avisosRecibidos.map((a) => ({ enviado: a.sentAt })),
      },
      // Su ficha ya no existe, y sus eventos tampoco.
      ideasGuardadasDePersonasYaBorradas: huerfanas.map((idea) => conOcasion(idea, [])),
      avisosPorEmailEnviados: avisos.map(limpiar),
      // Contadores antiabuso. Se reinician cada día y no describen a nadie,
      // pero van igual: son filas asociadas a tu identificador.
      contadoresDeUso: {
        generacionesDeIA: cuotaIA.map(limpiar),
        otrosLimites: cubosDeLimite.map(limpiar),
      },
    };
  },
});

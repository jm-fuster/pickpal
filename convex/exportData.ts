import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./auth";
import { personHasAccess } from "./personShares";
import { compareListItems } from "./lists";

/**
 * Copia completa de los datos del usuario autenticado (RGPD art. 15 y 20).
 *
 * Recorre exactamente las mismas tablas que `account.deleteMyAccount`: si una
 * se borra al cerrar la cuenta, es porque es del usuario, y entonces tiene que
 * salir aquí. Cuando se añada una tabla nueva hay que tocar las dos.
 * `exportData.test.ts` falla si se toca el borrado y no la exportación, pero
 * no al revés, y solo mira nombres de tabla: cada tabla nueva necesita además
 * su propia aserción de lo que exporta.
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
    //
    // Cada lectura por dueño lleva la lista: `miLista` es solo la propia
    // (`managedListId` vacío) y las que llevas para otros salen aparte, en
    // `listasQueLlevas`.
    const listaDe = (listId: Id<"managedLists"> | undefined) =>
      Promise.all([
        ctx.db
          .query("listItems")
          .withIndex("by_owner_and_list", (q) =>
            q.eq("ownerClerkUserId", clerkUserId).eq("managedListId", listId),
          )
          .collect(),
        ctx.db
          .query("listShares")
          .withIndex("by_owner_list_reader", (q) =>
            q.eq("ownerClerkUserId", clerkUserId).eq("managedListId", listId),
          )
          .collect(),
        // «Una nota para quien te regala» y el cumpleaños: como mucho una
        // fila por lista.
        ctx.db
          .query("listAbout")
          .withIndex("by_owner_and_list", (q) =>
            q.eq("ownerClerkUserId", clerkUserId).eq("managedListId", listId),
          )
          .first(),
      ]);
    // En el orden de la lista, el mismo que ves en la app.
    const elementos = (filas: Doc<"listItems">[]) =>
      Promise.all(
        [...filas].sort(compareListItems).map(async (i) => ({
          titulo: i.title,
          enlace: i.url ?? null,
          nota: i.note ?? null,
          loQueMasIlusionTeHaria: i.favorite === true,
          // En euros y no en céntimos, como lo escribiste: «unos 40 €».
          precioAproximadoEuros: i.priceCents !== undefined ? i.priceCents / 100 : null,
          // La foto que subiste, por su dirección: funciona mientras exista tu
          // cuenta, que al borrarse se lleva el archivo.
          fotoUrl: i.photoStorageId ? await ctx.storage.getUrl(i.photoStorageId) : null,
          _creationTime: i._creationTime,
          editadoEn: i.editedAt ?? null,
        })),
      );
    // Igual que `compartidoCon` de las fichas: el `clerkUserId` de cada fila
    // es el dato, a quién le diste acceso. Las filas ocultas salen igual y sin
    // marca: para ti son un acceso como cualquier otro.
    const compartidaCon = (shares: Doc<"listShares">[]) =>
      shares.map((s) => ({ clerkUserId: s.readerClerkUserId, desde: s._creationTime }));
    const cumpleanos = (about: Doc<"listAbout"> | null) =>
      about?.birthdayMonth !== undefined && about.birthdayDay !== undefined
        ? { mes: about.birthdayMonth, dia: about.birthdayDay }
        : null;

    const [[filasDeMiLista, quienVeMiLista, miNota], listasQueMeComparten, misMarcas, misListasACargo] =
      await Promise.all([
        listaDe(undefined),
        ctx.db
          .query("listShares")
          .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
          .collect(),
        ctx.db
          .query("listClaims")
          .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
          .collect(),
        ctx.db
          .query("managedLists")
          .withIndex("by_manager", (q) => q.eq("managerClerkUserId", clerkUserId))
          .collect(),
      ]);
    const elementosDeMiLista = await elementos(filasDeMiLista);

    // Las listas que llevas para otras personas (docs/encargo-listas-ninos.md):
    // las pides para ti y para ejercer los derechos de para quien son, así que
    // van enteras, con elementos y lectores. Sin marcas de nadie, por lo mismo
    // que `miLista`; las tuyas en ellas salen en `marcasEnListasDeOtros`.
    const listasQueLlevas = await Promise.all(
      misListasACargo.map(async (lista) => {
        const [filas, lectores, nota] = await listaDe(lista._id);
        const ficha = lista.personId ? await ctx.db.get(lista.personId) : null;
        return {
          paraQuien: lista.forName,
          // Solo si aún ves esa ficha, como `fichaAsociada` más abajo.
          fichaEnTuLibreta: (await personHasAccess(ctx, ficha, clerkUserId))
            ? (ficha?.name ?? null)
            : null,
          elementos: await elementos(filas),
          compartidaCon: compartidaCon(lectores),
          nota: nota?.note ?? null,
          cumpleanos: cumpleanos(nota),
          desde: lista._creationTime,
        };
      }),
    );
    // Para quién es cada lista a cargo que sale en tus marcas o en las listas
    // que te comparten. Solo el nombre de pila que puso quien la lleva.
    const paraQuienDe = async (listId: Id<"managedLists"> | undefined) =>
      listId ? ((await ctx.db.get(listId))?.forName ?? null) : null;
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
    // A quién no quieres que te comparta más listas. Solo los que pusiste tú:
    // los que otros te pusieron como dueño se borran con tu cuenta pero no
    // salen aquí, porque saberlo es justo lo que el bloqueo no te deja saber.
    // Por lo mismo, las filas ocultas de `listShares` (te compartió su lista
    // después de que le bloquearas) no salen como listas que te comparten.
    const misBloqueos = await ctx.db
      .query("listBlocks")
      .withIndex("by_reader", (q) => q.eq("readerClerkUserId", clerkUserId))
      .collect();
    const listasQueTeComparten = await Promise.all(
      listasQueMeComparten.filter((s) => s.hidden !== true).map(async (s) => {
        // Solo si aún puedes ver la ficha: si te la dejaron de compartir, su
        // nombre ya no es dato tuyo.
        const ficha = s.personId ? await ctx.db.get(s.personId) : null;
        const veoLaFicha = await personHasAccess(ctx, ficha, clerkUserId);
        return {
          de: s.ownerName ?? null,
          email: s.ownerEmail ?? null,
          // Para quién es, si es una lista que lleva para otra persona.
          paraQuien: await paraQuienDe(s.managedListId),
          desde: s._creationTime,
          fichaAsociada: veoLaFicha ? (ficha?.name ?? null) : null,
        };
      }),
    );
    const marcasEnListasDeOtros = await Promise.all(
      misMarcas.map(async (c) => {
        const elemento = c.itemId ? await ctx.db.get(c.itemId) : null;
        // «Lo regalo yo · para…»: el nombre de la fecha, solo si sigue siendo
        // de la ficha a la que asociaste esa lista (o, en una que llevas tú,
        // de la que le pusiste) y aún la ves.
        let paraOcasion: string | null = null;
        if (c.importantDateId) {
          const permiso = listasQueMeComparten.find(
            (s) =>
              s.ownerClerkUserId === c.ownerClerkUserId &&
              s.managedListId === c.managedListId &&
              s.hidden !== true,
          );
          const aCargo =
            c.ownerClerkUserId === clerkUserId
              ? misListasACargo.find((l) => l._id === c.managedListId)
              : undefined;
          const fichaId = permiso?.personId ?? aCargo?.personId;
          const ficha = fichaId ? await ctx.db.get(fichaId) : null;
          const fecha = await ctx.db.get(c.importantDateId);
          if (
            ficha &&
            fecha?.personId === ficha._id &&
            (await personHasAccess(ctx, ficha, clerkUserId))
          ) {
            paraOcasion = fecha.label;
          }
        }
        return {
          // Para quién es la lista, si es una a cargo; `null` si es la propia
          // de su dueño.
          lista: await paraQuienDe(c.managedListId),
          elemento: elemento?.title ?? c.snapshot?.title ?? null,
          estado: c.status === "given" ? "regalado" : "lo regalo yo",
          sigueEnSuLista: c.itemId !== undefined,
          // Lo quitó de su lista con «Ya lo tengo».
          yaLoTiene: c.snapshot?.reason === "got",
          paraOcasion,
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
        "\"loQueMasIlusionTeHaria\" dice si lo pusiste en ese grupo; " +
        "\"precioAproximadoEuros\" va en euros, no en céntimos; " +
        "\"fotoUrl\" es la dirección de la foto que subiste, que funciona " +
        "mientras exista tu cuenta; " +
        "\"notaParaQuienTeRegala\" es la nota que ven quienes leen tu lista, y " +
        "\"miCumpleanos\" el día y el mes que les enseñas. " +
        "\"listasQueLlevas\" son las listas que llevas para otras personas, " +
        "con \"paraQuien\", la ficha de tu libreta donde la ves, sus elementos, " +
        "con quién la compartes, su nota y su cumpleaños; tampoco incluyen qué " +
        "ha marcado nadie. " +
        "\"marcasEnListasDeOtros\" es lo que has marcado tú en listas ajenas o " +
        "en las que llevas; \"lista\" es para quién es, si es una lista a cargo, " +
        "\"yaLoTiene\" dice si su dueño lo quitó porque ya lo tenía, y " +
        "\"paraOcasion\" para qué fecha de tu ficha lo guardas. " +
        "En \"listasQueTeComparten\", \"paraQuien\" es para quién es la lista " +
        "si quien te la comparte la lleva para otra persona. " +
        "\"listasQueNoQuieres\" son las personas a las que bloqueaste para que " +
        "no te compartan más su lista.",
      usuario: {
        // El identificador con el que se guarda todo lo de abajo.
        clerkUserId,
        email: identity?.email ?? null,
      },
      ajustes: ajustes.map(limpiar),
      seresQueridos,
      fichasQueTeComparten,
      miLista: {
        elementos: elementosDeMiLista,
        notaParaQuienTeRegala: miNota?.note ?? null,
        miCumpleanos: cumpleanos(miNota),
        compartidaCon: compartidaCon(quienVeMiLista),
      },
      listasQueLlevas,
      listasQueTeComparten,
      marcasEnListasDeOtros,
      avisosDeListaPorCorreo: {
        // A quién avisamos de que le compartiste tu lista, y cuándo.
        enviados: avisosEnviados.map((a) => ({ clerkUserId: a.readerClerkUserId, enviado: a.sentAt })),
        // Cuándo te avisaron de que alguien te compartió la suya. Si el último
        // no salió porque le tenías bloqueado, va el anterior que sí salió, o
        // nada. En `enviados` sí salen todos tal cual: quien comparte no
        // puede saber si le bloquearon.
        recibidos: avisosRecibidos.flatMap((a) => {
          const enviado = a.suppressed === true ? a.deliveredAt : a.sentAt;
          return enviado === undefined ? [] : [{ enviado }];
        }),
      },
      listasQueNoQuieres: misBloqueos.map((b) => ({
        de: b.ownerName ?? null,
        email: b.ownerEmail ?? null,
        desde: b._creationTime,
      })),
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

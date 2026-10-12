import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { ConvexError } from "convex/values";
import { z } from "zod";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// Un id de Convex es corto; 64 da margen sin dejar pasar cualquier cosa.
const MAX_LIST_ID = 64;

const requestSchema = z.object({
  email: z.email("Introduce un email válido").max(254),
  // Una lista que llevas para otra persona. Sin ella, tu lista propia.
  listId: z.string().min(1).max(MAX_LIST_ID).optional(),
});

const LIST_NOT_FOUND = "Lista no encontrada.";

/**
 * Quién ve tu lista, para el bloque «Quién la ve» de /mi-lista, o con
 * `?lista=<id>` quién ve una lista que llevas para otra persona.
 * `api.lists.myReaders` solo conoce `clerkUserId`s; el email vive en Clerk y
 * se resuelve aquí, igual que en la ruta de compartir fichas. Si Clerk falla,
 * la lista sale sin emails en vez de romper la pantalla.
 *
 * Quien comprueba que la lista es tuya es Convex. Un id malformado, de otro o
 * que no existe contestan lo mismo: 404 (docs/security.md §5).
 */
export async function GET(req: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const lista = req.nextUrl.searchParams.get("lista");
  if (lista !== null && (lista.length === 0 || lista.length > MAX_LIST_ID)) {
    return NextResponse.json({ error: LIST_NOT_FOUND }, { status: 404 });
  }

  let readers;
  try {
    readers = await fetchQuery(
      api.lists.myReaders,
      lista !== null ? { listId: lista as Id<"managedLists"> } : {},
      { token },
    );
  } catch (err) {
    // Con `lista`, un fallo es casi siempre un id que no vale (malformado, de
    // otro o borrado): mismo 404 para todos.
    if (lista !== null) {
      return NextResponse.json({ error: LIST_NOT_FOUND }, { status: 404 });
    }
    console.error("[lista/share] myReaders:", err);
    return NextResponse.json({ error: "No se pudo cargar." }, { status: 500 });
  }

  const emails = new Map<string, string | null>();
  if (readers.length > 0) {
    try {
      const client = await clerkClient();
      const { data } = await client.users.getUserList({
        userId: readers.map((r) => r.readerClerkUserId),
      });
      for (const u of data) {
        emails.set(u.id, u.primaryEmailAddress?.emailAddress ?? null);
      }
    } catch (err) {
      console.error("[lista/share] clerk emails:", err);
    }
  }

  return NextResponse.json({
    readers: readers.map((r) => ({
      shareId: r.shareId,
      email: emails.get(r.readerClerkUserId) ?? null,
      since: r.since,
    })),
  });
}

/**
 * Comparte tu lista, o con `listId` una que llevas, con otra cuenta de
 * PickPal, por email.
 *
 * Mismo flujo que `src/app/api/people/[personId]/share/route.ts`: primero se
 * gasta cupo de `invite_lookup` (la respuesta dice si un email tiene cuenta,
 * así que cada pregunta cuenta), luego se busca el email en Clerk y por último
 * `api.lists.invite` concede el acceso. La mutation es la frontera de
 * autorización; esta ruta solo resuelve el email. Ver docs/security.md §9.
 *
 * Con `listId`, antes de gastar nada se pregunta a Convex si esa lista es
 * tuya (`api.lists.managedList`): una lista ajena, borrada o con un id que no
 * vale da 404 sin tocar el cupo ni Clerk. `invite` lo vuelve a comprobar.
 */
export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();
  const listId = parsed.data.listId as Id<"managedLists"> | undefined;

  if (listId !== undefined) {
    try {
      await fetchQuery(api.lists.managedList, { listId }, { token });
    } catch {
      return NextResponse.json({ error: LIST_NOT_FOUND }, { status: 404 });
    }
  }

  try {
    await fetchMutation(api.lists.reserveInviteLookup, {}, { token });
  } catch (err) {
    if (err instanceof ConvexError) {
      return NextResponse.json(
        { error: typeof err.data === "string" ? err.data : "No se pudo compartir la lista." },
        { status: 400 },
      );
    }
    console.error("[lista/share] reserve lookup:", err);
    return NextResponse.json({ error: "No se pudo compartir la lista." }, { status: 500 });
  }

  let readerClerkUserId: string;
  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({ emailAddress: [email] });
    const target = data[0];
    if (!target) {
      return NextResponse.json(
        {
          error:
            "No hay ninguna cuenta de PickPal con ese email. Cuando esa persona se la cree, vuelve a invitarla.",
        },
        { status: 404 },
      );
    }
    readerClerkUserId = target.id;
  } catch (err) {
    console.error("[lista/share] clerk lookup:", err);
    return NextResponse.json({ error: "No se pudo comprobar ese email." }, { status: 500 });
  }

  if (readerClerkUserId === userId) {
    return NextResponse.json(
      { error: "No puedes compartir la lista contigo." },
      { status: 400 },
    );
  }

  let emailed = false;
  try {
    ({ emailed } = await fetchMutation(
      api.lists.invite,
      listId !== undefined ? { readerClerkUserId, listId } : { readerClerkUserId },
      { token },
    ));
  } catch (err) {
    if (err instanceof ConvexError) {
      return NextResponse.json(
        { error: typeof err.data === "string" ? err.data : "No se pudo compartir la lista." },
        { status: 400 },
      );
    }
    console.error("[lista/share] convex invite:", err);
    return NextResponse.json({ error: "No se pudo compartir la lista." }, { status: 500 });
  }

  // `emailed` dice si se programó el correo de aviso: no se manda si ya se
  // avisó a esa persona de cualquier lista tuya en los últimos 30 días.
  return NextResponse.json({ ok: true, emailed });
}

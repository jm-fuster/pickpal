import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { ConvexError } from "convex/values";
import { z } from "zod";
import { api } from "../../../../../convex/_generated/api";

const requestSchema = z.object({
  email: z.email("Introduce un email válido").max(254),
});

/**
 * Quién ve tu lista, para el bloque «Quién la ve» de /mi-lista.
 * `api.lists.myReaders` solo conoce `clerkUserId`s; el email vive en Clerk y
 * se resuelve aquí, igual que en la ruta de compartir fichas. Si Clerk falla,
 * la lista sale sin emails en vez de romper la pantalla.
 */
export async function GET() {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let readers;
  try {
    readers = await fetchQuery(api.lists.myReaders, {}, { token });
  } catch (err) {
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
 * Comparte tu lista con otra cuenta de PickPal, por email.
 *
 * Mismo flujo que `src/app/api/people/[personId]/share/route.ts`: primero se
 * gasta cupo de `invite_lookup` (la respuesta dice si un email tiene cuenta,
 * así que cada pregunta cuenta), luego se busca el email en Clerk y por último
 * `api.lists.invite` concede el acceso. La mutation es la frontera de
 * autorización; esta ruta solo resuelve el email. Ver docs/security.md §9.
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

  try {
    await fetchMutation(api.lists.reserveInviteLookup, {}, { token });
  } catch (err) {
    if (err instanceof ConvexError) {
      return NextResponse.json(
        { error: typeof err.data === "string" ? err.data : "No se pudo compartir tu lista." },
        { status: 400 },
      );
    }
    console.error("[lista/share] reserve lookup:", err);
    return NextResponse.json({ error: "No se pudo compartir tu lista." }, { status: 500 });
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
    ({ emailed } = await fetchMutation(api.lists.invite, { readerClerkUserId }, { token }));
  } catch (err) {
    if (err instanceof ConvexError) {
      return NextResponse.json(
        { error: typeof err.data === "string" ? err.data : "No se pudo compartir tu lista." },
        { status: 400 },
      );
    }
    console.error("[lista/share] convex invite:", err);
    return NextResponse.json({ error: "No se pudo compartir tu lista." }, { status: 500 });
  }

  // `emailed` dice si se programó el correo de aviso: no se manda si ya se
  // avisó a esa persona de esta lista en los últimos 30 días.
  return NextResponse.json({ ok: true, emailed });
}

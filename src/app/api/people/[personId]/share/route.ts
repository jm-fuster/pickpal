import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { ConvexError } from "convex/values";
import { z } from "zod";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  email: z.email("Introduce un email válido").max(254),
});

/**
 * Con quién se comparte una ficha, para pintar la lista en `ShareDialog`.
 * `api.personShares.listMembers` solo conoce `clerkUserId`s — el email vive
 * en Clerk, así que se resuelve aquí igual que en el POST. Si Clerk falla,
 * se degrada a mostrar la lista sin emails en vez de romper el diálogo
 * entero: no es la parte crítica del feature.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ personId: string }> },
) {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { personId } = await params;
  let members;
  try {
    members = await fetchQuery(
      api.personShares.listMembers,
      { personId: personId as Id<"people"> },
      { token },
    );
  } catch (err) {
    if (err instanceof ConvexError) {
      return NextResponse.json(
        { error: typeof err.data === "string" ? err.data : "Persona no encontrada." },
        { status: 404 },
      );
    }
    console.error("[people/share] listMembers:", err);
    return NextResponse.json({ error: "No se pudo cargar." }, { status: 500 });
  }

  let ownerEmail: string | null = null;
  const inviteeEmails = new Map<string, string | null>();
  try {
    const client = await clerkClient();
    const ids = [members.ownerClerkUserId, ...members.invitees.map((i) => i.clerkUserId)];
    // `limit` explícito: sin él Clerk devuelve 10, y una ficha la tienen
    // su dueño y hasta 20 invitados.
    const { data } = await client.users.getUserList({ userId: ids, limit: ids.length });
    const byId = new Map(data.map((u) => [u.id, u.primaryEmailAddress?.emailAddress ?? null]));
    ownerEmail = byId.get(members.ownerClerkUserId) ?? null;
    for (const inv of members.invitees) {
      inviteeEmails.set(inv.clerkUserId, byId.get(inv.clerkUserId) ?? null);
    }
  } catch (err) {
    console.error("[people/share] clerk emails:", err);
  }

  return NextResponse.json({
    isOwner: members.isOwner,
    owner: { email: ownerEmail },
    invitees: members.invitees.map((inv) => ({
      clerkUserId: inv.clerkUserId,
      email: inviteeEmails.get(inv.clerkUserId) ?? null,
      since: inv.since,
    })),
  });
}

/**
 * Invita a otro usuario de PickPal a una ficha por email.
 *
 * El email solo existe en Clerk, no en Convex, así que la resolución a un
 * `clerkUserId` pasa por aquí (la API route, con `clerkClient`) antes de
 * llamar a `api.personShares.invite` — Convex no tiene acceso al backend de
 * Clerk. La mutation vuelve a comprobar que quien invita es el dueño: esta
 * ruta es una comodidad de resolución, no la frontera de autorización.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ personId: string }> },
) {
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

  const { personId } = await params;
  const email = parsed.data.email.trim().toLowerCase();

  // Antes de consultar Clerk. La respuesta de abajo dice si el email tiene
  // cuenta, así que solo pregunta el dueño de la ficha y cada pregunta gasta
  // cupo (`invite_lookup`). Ver docs/security.md §9.
  try {
    await fetchMutation(
      api.personShares.reserveInviteLookup,
      { personId: personId as Id<"people"> },
      { token },
    );
  } catch (err) {
    if (err instanceof ConvexError) {
      return NextResponse.json(
        { error: typeof err.data === "string" ? err.data : "No se pudo compartir la ficha." },
        { status: 400 },
      );
    }
    // Un personId malformado lanza un error de validación de argumentos: el
    // mismo 404 que una ficha que no existe (docs/security.md §5).
    console.error("[people/share] reserve lookup:", err);
    return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
  }

  let targetUserId: string;
  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({ emailAddress: [email] });
    const target = data[0];
    if (!target) {
      return NextResponse.json(
        { error: "No hay ninguna cuenta de PickPal con ese email." },
        { status: 404 },
      );
    }
    targetUserId = target.id;
  } catch (err) {
    console.error("[people/share] clerk lookup:", err);
    return NextResponse.json(
      { error: "No se pudo comprobar ese email." },
      { status: 500 },
    );
  }

  if (targetUserId === userId) {
    return NextResponse.json(
      { error: "No puedes compartir la ficha contigo mismo." },
      { status: 400 },
    );
  }

  try {
    await fetchMutation(
      api.personShares.invite,
      { personId: personId as Id<"people">, clerkUserId: targetUserId },
      { token },
    );
  } catch (err) {
    if (err instanceof ConvexError) {
      return NextResponse.json(
        { error: typeof err.data === "string" ? err.data : "No se pudo compartir la ficha." },
        { status: 400 },
      );
    }
    console.error("[people/share] convex invite:", err);
    return NextResponse.json(
      { error: "No se pudo compartir la ficha." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

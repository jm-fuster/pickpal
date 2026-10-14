"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/layout/BackLink";
import type { ListItemDraft } from "@/components/lista/ListItemForm";
import { bookmarkletHref, readBookmarkletFragment } from "@/lib/bookmarklet";
import { clearPendingShare, peekPendingShare } from "@/lib/pendingShare";
import { MAX_LIST_ITEMS } from "@/lib/listLimits";
import { nextOccasion } from "@/lib/nextOccasion";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

// Valor del selector para tu propia lista: el Select no admite un valor vacío.
const OWN = "mia";

const noSubscribe = () => () => {};

/** Lo guardado al pedir sesión (src/lib/pendingShare.ts), si la pestaña lo permite. */
function pendingHash(): string | null {
  try {
    return peekPendingShare(window.sessionStorage);
  } catch {
    return null;
  }
}

/**
 * El fragmento con el que se abrió la página, leído una vez en el navegador. Si
 * no trae ninguno, el que se guardó al iniciar sesión: quien llegó sin sesión
 * perdía lo que traía la dirección al pasar por la página de entrada.
 */
function initialFragment(): ListItemDraft | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.length > 1 ? window.location.hash : pendingHash();
  if (!hash) return null;
  const data = readBookmarkletFragment(hash);
  return data.title || data.url ? data : null;
}

const ListItemForm = dynamic(() => import("@/components/lista/ListItemForm").then((m) => m.ListItemForm));
const OwnIdeaForm = dynamic(() => import("@/components/people/OwnIdeaForm").then((m) => m.OwnIdeaForm));

// Destino: tu lista (`OWN`), una lista que llevas (`lista:<id>`) o una idea
// para alguien de tu libreta (`ficha:<id>`).
const LIST = "lista:";
const PERSON = "ficha:";

/**
 * «Apuntar en PickPal»: el destino del marcador que la dueña lleva en la barra
 * del navegador (src/lib/bookmarklet.ts). El marcador lee la página de la
 * tienda en su propio navegador y abre esta página con los datos en el
 * fragmento (`#t=…&u=…&p=…`), que nunca llega a ningún servidor. Aquí solo se
 * rellena el formulario: nada se apunta hasta pulsar «Apuntar».
 *
 * Sin fragmento, la página explica cómo instalar el marcador.
 */
export default function BookmarkletPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const items = useQuery(api.lists.myItems, isLoaded && isSignedIn ? {} : "skip");
  const managedLists = useQuery(api.lists.myManagedLists, isLoaded && isSignedIn ? {} : "skip");
  const people = useQuery(api.people.getAll, isLoaded && isSignedIn ? {} : "skip");
  // Dónde se apunta: tu lista, una que llevas o una idea para alguien.
  const [target, setTarget] = useState<string>(OWN);
  const listId = target.startsWith(LIST) ? (target.slice(LIST.length) as Id<"managedLists">) : undefined;
  const personId = target.startsWith(PERSON) ? (target.slice(PERSON.length) as Id<"people">) : undefined;
  const person = people?.find((p) => p._id === personId);
  const personDates = useQuery(api.importantDates.getByPerson, personId ? { personId } : "skip");
  // En el servidor y al hidratar, `false`: así el HTML coincide y lo que
  // depende de la dirección solo se pinta en el navegador.
  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);
  // El fragmento se lee al crear el estado, antes de quitarlo de la barra.
  const [fromFragment] = useState(initialFragment);
  const [dismissed, setDismissed] = useState(false);
  const draft: ListItemDraft | null | undefined = !inBrowser ? undefined : dismissed ? null : fromFragment;
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Fuera el fragmento de la barra de direcciones y del historial.
    const { hash, pathname } = window.location;
    if (hash) window.history.replaceState(null, "", pathname);
    // Lo guardado al iniciar sesión ya se leyó al crear el estado. Se borra
    // aquí y no allí: al montar, React puede ejecutar el inicializador dos veces.
    try {
      clearPendingShare(window.sessionStorage);
    } catch {
      // Sin sessionStorage no hay nada que borrar.
    }
  }, []);

  // React no deja pintar un `javascript:` en un href: se pone a mano.
  useEffect(() => {
    if (inBrowser && linkRef.current) {
      linkRef.current.setAttribute("href", bookmarkletHref(window.location.origin));
    }
  }, [inBrowser, draft]);

  const chosen = managedLists?.find((l) => l.listId === listId);
  const full = personId
    ? false
    : chosen
      ? chosen.itemCount >= MAX_LIST_ITEMS
      : items !== undefined && items.length >= MAX_LIST_ITEMS;
  const targetLabel = person
    ? `Idea para ${person.name}`
    : chosen
      ? `La lista de ${chosen.forName}`
      : "Mi lista";
  const hasChoices = (managedLists?.length ?? 0) > 0 || (people?.length ?? 0) > 0;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 w-full max-w-2xl">
      <BackLink fallbackHref="/mi-lista" label="Mi lista" />
      <div>
        <h1 className="text-4xl font-medium">Apuntar desde la tienda</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Un botón en tu navegador para apuntar lo que estás viendo en una tienda: en tu lista, o
          como idea para alguien de tu libreta.
        </p>
      </div>

      {draft && hasChoices && (
        <div className="flex items-center gap-2">
          <Label htmlFor="apuntar-en-lista" className="text-sm">Dónde lo apuntas</Label>
          <Select value={target} onValueChange={(v) => v && setTarget(v)}>
            <SelectTrigger id="apuntar-en-lista" size="sm" className="min-w-48">
              <span>{targetLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={OWN}>Mi lista</SelectItem>
              {managedLists?.map((l) => (
                <SelectItem key={l.listId} value={`${LIST}${l.listId}`}>La lista de {l.forName}</SelectItem>
              ))}
              {people?.map((p) => (
                <SelectItem key={p._id} value={`${PERSON}${p._id}`}>Idea para {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {draft && personId && (
        personDates === undefined ? null : (
          <OwnIdeaForm
            key={personId}
            personId={personId}
            dates={personDates}
            defaultDateId={nextOccasion(personDates)?.event._id}
            initial={draft}
            onDone={(saved) => {
              if (!saved) setDismissed(true);
              else router.push(`/seres-queridos/${personId}`);
            }}
          />
        )
      )}

      {draft && !personId && (
        full ? (
          <p className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            {chosen ? `La lista de ${chosen.forName}` : "Tu lista"} ya tiene {MAX_LIST_ITEMS} cosas, el máximo. Quita alguna para apuntar otra.
          </p>
        ) : (
          <ListItemForm
            initial={draft}
            listId={listId}
            onDone={(addedId) => {
              if (!addedId) setDismissed(true);
              else router.push(listId ? `/mi-lista/llevas/${listId}` : "/mi-lista");
            }}
          />
        )
      )}

      {draft !== undefined && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
              <Bookmark className="size-3.5" aria-hidden />
              {draft ? "El botón" : "Cómo se pone"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Arrastra este botón a la barra de marcadores de tu navegador. Cuando estés en la
              página de algo que te guste, púlsalo: se abrirá el formulario con el nombre y el
              enlace ya puestos, y el precio si la tienda lo da. No se apunta nada hasta que
              pulses «Apuntar».
            </p>
            <a
              ref={linkRef}
              draggable
              onClick={(e) => {
                e.preventDefault();
                toast("Arrástralo a tu barra de marcadores; aquí no hace nada.");
              }}
              className="inline-flex w-fit cursor-grab items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium active:cursor-grabbing"
            >
              <Bookmark className="size-4" aria-hidden />
              Apuntar en PickPal
            </a>
            <p className="text-xs text-muted-foreground">
              Funciona en el ordenador. Lee la página en tu navegador: PickPal no entra en la
              tienda. Si no tenías la sesión iniciada, entra y vuelve a pulsarlo.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

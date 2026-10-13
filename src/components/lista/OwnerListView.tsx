"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BookHeart, Bookmark, Check, ClipboardPaste, Ellipsis, Gift, PencilLine, Trash2, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AddRowButton } from "@/components/layout/AddRowButton";
import { EmptyState } from "@/components/layout/EmptyState";
import { AddToHistoryDialog, type HistoryValues } from "@/components/people/AddToHistoryDialog";
import { ListItemLink } from "@/components/lista/ListItemLink";
import { ListReaders } from "@/components/lista/ListReaders";
import { AboutNote } from "@/components/lista/AboutNote";
import { OwnerBirthday } from "@/components/lista/OwnerBirthday";
import { usePhotoUpload } from "@/components/lista/usePhotoUpload";
import { closestOccasionLabel } from "@/lib/dates";
import { userErrorMessage } from "@/lib/errors";
import { ITEMS_COUNTER_FROM, MAX_LIST_FAVORITES, MAX_LIST_ITEMS } from "@/lib/listLimits";
import { formatApproxPrice } from "@/lib/price";
import { cn } from "@/lib/utils";

// El formulario (react-hook-form + zod) solo aparece al apuntar o editar algo.
// Va en su propio chunk, que se pide al montar: llega mucho antes de que la
// lista cargue, así que el botón lo abre sin esperas.
const loadListItemForm = () => import("@/components/lista/ListItemForm");
const ListItemForm = dynamic(() => loadListItemForm().then((m) => m.ListItemForm));

type OwnItem = FunctionReturnType<typeof api.lists.myItems>[number];
type ManagedItem = FunctionReturnType<typeof api.lists.managedItems>[number];
type Item = OwnItem & Partial<Pick<ManagedItem, "state" | "claimId">>;
type RemoveReason = "got" | undefined;

// Lo que dura el aviso con «Deshacer» antes de borrar de verdad.
const UNDO_MS = 6000;

/**
 * Lo que ve quien escribe una lista: su propia «Mi lista» o una lista que lleva
 * para otra persona (docs/encargo-listas-ninos.md, opción A).
 *
 * - **Lista propia** (`listId` vacío): nada de esta vista lee las marcas
 *   (decisión 7 de docs/encargo-lista.md). Lee `lists.myItems`, que no las cruza.
 * - **Lista a cargo** (`listId`): quien la lleva también regala, así que ve qué
 *   está cogido, nunca quién (`lists.managedItems`), y puede marcar. La sorpresa
 *   es para quien no tiene cuenta, que nunca entra.
 */
export function OwnerListView({
  listId,
  forName,
  personId,
}: {
  listId?: Id<"managedLists">;
  forName?: string;
  /** Ficha de tu libreta para esa persona, si la has asociado: «Ya se lo he regalado» va a su historial. */
  personId?: Id<"people"> | null;
}) {
  const managed = listId !== undefined;
  const { isLoaded, isSignedIn } = useAuth();
  const ready = isLoaded && isSignedIn;
  const ownItems = useQuery(api.lists.myItems, ready && !managed ? {} : "skip");
  const managedItems = useQuery(api.lists.managedItems, ready && listId ? { listId } : "skip");
  const items: Item[] | undefined = managed ? managedItems : ownItems;
  const dates = useQuery(api.importantDates.getByPerson, ready && personId ? { personId } : "skip");

  const removeItem = useMutation(api.lists.removeItem);
  const setFavorite = useMutation(api.lists.setFavorite);
  const moveItem = useMutation(api.lists.moveItem);
  const removeItemPhoto = useMutation(api.lists.removeItemPhoto);
  const claim = useMutation(api.lists.claim);
  const unclaim = useMutation(api.lists.unclaim);
  const markGiven = useMutation(api.lists.markGiven);
  const createHistoryEntry = useMutation(api.giftHistory.create);
  const { upload, uploadingId } = usePhotoUpload();
  // Un solo selector de archivos para toda la vista; recuerda para qué fila se abrió.
  const photoInput = useRef<HTMLInputElement>(null);
  const photoFor = useRef<Id<"listItems"> | null>(null);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"listItems"> | null>(null);
  const [highlightId, setHighlightId] = useState<Id<"listItems"> | null>(null);
  const [giving, setGiving] = useState<{ claimId: Id<"listClaims">; title: string } | null>(null);

  // Textos: la lista propia habla de ti; la que llevas, de esa persona.
  const t = managed
    ? {
        heading: `Lo que le haría ilusión a ${forName}`,
        top: "Lo que más ilusión le haría",
        toTop: "Pasar a lo que más ilusión le haría",
        fromTop: "Sacar de lo que más ilusión le haría",
        got: "Ya lo tiene",
        remove: "Quitar de su lista",
        removed: "Quitado de su lista",
        removedGot: "Quitado de su lista: ya lo tiene",
        moved: (fav: boolean) => (fav ? "Pasado a lo que más ilusión le haría" : "Sacado de lo que más ilusión le haría"),
        full: `La lista de ${forName} ya tiene ${MAX_LIST_ITEMS} cosas, el máximo. Quita alguna para apuntar otra.`,
        emptyTitle: `Nada apuntado para ${forName}`,
        emptyText:
          "Apunta lo que le haría ilusión. Quien tenga acceso a esta lista lo verá en su libreta y podrá marcar lo que va a regalar. Tú verás qué está cogido, no quién lo regala.",
        pasteHref: `/mi-lista/llevas/${listId}/traer`,
        // La foto es de la cosa, nunca de la persona para la que es la lista.
        photo: "Añadir una foto de la cosa",
        idPrefix: `lista-${listId}`,
      }
    : {
        heading: "Lo que te haría ilusión",
        top: "Lo que más ilusión te haría",
        toTop: "Pasar a lo que más ilusión me haría",
        fromTop: "Sacar de lo que más ilusión me haría",
        got: "Ya lo tengo",
        remove: "Quitar de mi lista",
        removed: "Quitado de tu lista",
        removedGot: "Quitado de tu lista: ya lo tienes",
        moved: (fav: boolean) => (fav ? "Pasado a lo que más ilusión te haría" : "Sacado de lo que más ilusión te haría"),
        full: `Tu lista ya tiene ${MAX_LIST_ITEMS} cosas, el máximo. Quita alguna para apuntar otra.`,
        emptyTitle: "Nada apuntado todavía",
        emptyText:
          "Apunta lo que te haría ilusión recibir, con su enlace si lo tienes. Quien tenga acceso a tu lista lo verá en su libreta, junto a tus fechas.",
        pasteHref: "/mi-lista/traer",
        photo: "Añadir una foto",
        idPrefix: "mi-lista",
      };

  // Quitar no borra al momento: la fila se esconde y el borrado espera a que
  // se cierre el aviso con «Deshacer». Así, si se arrepiente, quien lo había
  // marcado nunca llega a ver «Ya no está en su lista».
  const pending = useRef(new Map<Id<"listItems">, { reason: RemoveReason; toastId: string | number }>());
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<Id<"listItems">>>(() => new Set());

  useEffect(() => {
    void loadListItemForm();
  }, []);

  const unhide = (id: Id<"listItems">) =>
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const commitRemoval = (id: Id<"listItems">) => {
    const entry = pending.current.get(id);
    if (!entry) return;
    pending.current.delete(id);
    removeItem(entry.reason ? { id, reason: entry.reason } : { id })
      .then(() => unhide(id))
      .catch((err) => {
        unhide(id);
        toast.error(userErrorMessage(err, "No se pudo quitar"));
      });
  };

  // Al salir (o cerrar la pestaña) se confirman los borrados que esperaban,
  // como en el generador de ideas, y se cierran sus avisos: un «Deshacer» que
  // ya no puede deshacer nada engañaría.
  const commitRef = useRef(commitRemoval);
  useEffect(() => {
    commitRef.current = commitRemoval;
  });
  useEffect(() => {
    const flush = () => {
      for (const [id, { toastId }] of [...pending.current]) {
        commitRef.current(id);
        toast.dismiss(toastId);
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`elemento-${highlightId}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      }
    }
    const timer = setTimeout(() => setHighlightId(null), 1600);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      await action();
    } catch (err) {
      toast.error(userErrorMessage(err, fallback));
    }
  };

  const handleRemove = (item: Item, reason: RemoveReason) => {
    setHiddenIds((prev) => new Set(prev).add(item._id));
    const toastId = toast(reason === "got" ? t.removedGot : t.removed, {
      duration: UNDO_MS,
      action: {
        label: "Deshacer",
        onClick: () => {
          pending.current.delete(item._id);
          unhide(item._id);
        },
      },
      onDismiss: () => commitRemoval(item._id),
      onAutoClose: () => commitRemoval(item._id),
    });
    pending.current.set(item._id, { reason, toastId });
  };

  const handleFavorite = (item: Item, favorite: boolean) =>
    run(async () => {
      await setFavorite({ id: item._id, favorite });
      toast.success(t.moved(favorite));
    }, "No se pudo guardar");

  const pickPhoto = (item: Item) => {
    photoFor.current = item._id;
    photoInput.current?.click();
  };

  const handleGiven = async (values: HistoryValues) => {
    if (!giving) return;
    if (personId) {
      await createHistoryEntry({
        personId,
        giftName: giving.title,
        occasionLabel: values.occasionLabel,
        year: values.year,
        reaction: values.reaction,
        notes: values.notes,
      });
    }
    await markGiven({ claimId: giving.claimId });
  };

  const visible = items?.filter((i) => !hiddenIds.has(i._id)) ?? [];
  const favorites = visible.filter((i) => i.favorite);
  const rest = visible.filter((i) => !i.favorite);
  // Los topes se cuentan con lo que tiene el servidor, que es quien los aplica:
  // lo que espera a borrarse todavía ocupa sitio.
  const count = items?.length ?? 0;
  const favoriteCount = items?.filter((i) => i.favorite).length ?? 0;
  const full = count >= MAX_LIST_ITEMS;

  /** Solo en una lista a cargo: si está cogido y, si lo regalas tú, tus acciones. */
  const claimControls = (item: Item) => {
    if (!managed || !item.state) return null;
    if (item.state === "taken") {
      return <Badge variant="outline" className="text-muted-foreground">Cogido</Badge>;
    }
    if (item.state === "free") {
      return (
        <Button size="sm" variant="outline" onClick={() => run(() => claim({ itemId: item._id }), "No se pudo marcar")}>
          <Gift aria-hidden />
          Lo regalo yo
        </Button>
      );
    }
    const claimId = item.claimId;
    if (!claimId) return null;
    return (
      <>
        {item.state === "mine" ? (
          <>
            <Badge variant="secondary">Lo regalas tú</Badge>
            <Button size="sm" className="hover:bg-primary/80" onClick={() => setGiving({ claimId, title: item.title })}>
              Ya se lo he regalado
            </Button>
          </>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Check className="size-3" aria-hidden />
            Regalado
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Quitar tu marca de ${item.title}`}
          title="Quitar tu marca"
          onClick={() => run(() => unclaim({ claimId }), "No se pudo quitar la marca")}
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      </>
    );
  };

  const renderRow = (item: Item, index: number, group: Item[]) => (
    <li key={item._id} id={`elemento-${item._id}`}>
      {editingId === item._id ? (
        <ListItemForm item={item} listId={listId} onDone={() => setEditingId(null)} />
      ) : (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-lg border border-border/60 bg-background/60 p-4 text-sm transition-colors duration-700",
            highlightId === item._id && "bg-secondary/10",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            {item.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.photoUrl}
                alt=""
                className="size-14 shrink-0 rounded-md border border-border/60 object-cover"
              />
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="font-medium leading-snug">{item.title}</p>
              {uploadingId === item._id && (
                <p className="text-xs text-muted-foreground" role="status">Subiendo la foto…</p>
              )}
              {(item.priceCents !== null || item.url) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {item.priceCents !== null && (
                    <span className="text-xs text-muted-foreground">{formatApproxPrice(item.priceCents)}</span>
                  )}
                  {item.url && <ListItemLink url={item.url} />}
                </div>
              )}
              {item.note && <p className="whitespace-pre-line text-xs text-muted-foreground">{item.note}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Editar ${item.title}`}
                title="Editar"
                onClick={() => setEditingId(item._id)}
              >
                <PencilLine className="size-3.5" aria-hidden />
              </Button>
              <OwnerItemMenu
                item={item}
                labels={t}
                favoritesFull={favoriteCount >= MAX_LIST_FAVORITES}
                onFavorite={(favorite) => handleFavorite(item, favorite)}
                canMoveUp={index > 0}
                canMoveDown={index < group.length - 1}
                onMove={(direction) => run(() => moveItem({ id: item._id, direction }), "No se pudo mover")}
                onPhoto={() => pickPhoto(item)}
                onRemovePhoto={() =>
                  run(async () => {
                    await removeItemPhoto({ id: item._id });
                    toast.success("Foto quitada");
                  }, "No se pudo quitar la foto")
                }
                onGot={() => handleRemove(item, "got")}
                onRemove={() => handleRemove(item, undefined)}
              />
            </div>
          </div>
          {managed && <div className="flex flex-wrap items-center justify-end gap-2">{claimControls(item)}</div>}
        </div>
      )}
    </li>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {items === undefined ? (
        <div className="space-y-3" role="status">
          <span className="sr-only">Cargando la lista…</span>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} aria-hidden className="h-16 rounded-2xl border border-dashed border-border/60 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 && !adding ? (
        <EmptyState
          icon={BookHeart}
          title={t.emptyTitle}
          description={t.emptyText}
          cta={
            <div className="flex flex-col items-center gap-3">
              <Button size="lg" onClick={() => setAdding(true)} className="hover:bg-primary/80">
                Apuntar lo primero
              </Button>
              <Link
                href={t.pasteHref}
                className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                ¿La tienes en otra app o en una nota? Pégala
              </Link>
            </div>
          }
        />
      ) : (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
                <BookHeart className="size-3.5" aria-hidden />
                {t.heading}
              </h2>
              {count >= ITEMS_COUNTER_FROM && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {count} de {MAX_LIST_ITEMS}
                </span>
              )}
            </div>

            {managed && (
              <p className="text-xs text-muted-foreground">
                Ves qué está cogido, no quién lo regala. Lo que marques tú cuenta como cogido para los demás.
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <AboutNote listId={listId} forName={forName} />
              <OwnerBirthday listId={listId} forName={forName} />
            </div>

            {adding ? (
              <ListItemForm
                listId={listId}
                onDone={(addedId) => {
                  setAdding(false);
                  if (addedId) setHighlightId(addedId);
                }}
              />
            ) : full ? (
              <p className="rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground">{t.full}</p>
            ) : (
              <div className="space-y-2">
                <AddRowButton onClick={() => setAdding(true)}>Apuntar algo</AddRowButton>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  <Link
                    href={t.pasteHref}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    <ClipboardPaste className="size-3.5" aria-hidden />
                    Pegar una lista
                  </Link>
                  {/* Solo en ordenador: en el móvil no hay barra de marcadores. */}
                  <Link
                    href="/mi-lista/apuntar"
                    className="hidden items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline md:inline-flex"
                  >
                    <Bookmark className="size-3.5" aria-hidden />
                    Apuntar desde la tienda
                  </Link>
                </div>
              </div>
            )}

            {favorites.length > 0 ? (
              <div className="space-y-5">
                <section aria-labelledby={`${t.idPrefix}-mas-ilusion`} className="space-y-2">
                  <h3 id={`${t.idPrefix}-mas-ilusion`} className="font-sans text-sm font-medium">
                    {t.top}
                  </h3>
                  <ul className="space-y-3">{favorites.map(renderRow)}</ul>
                </section>
                {rest.length > 0 && (
                  <section aria-labelledby={`${t.idPrefix}-resto`} className="space-y-2">
                    <h3 id={`${t.idPrefix}-resto`} className="font-sans text-sm font-medium text-muted-foreground">
                      El resto
                    </h3>
                    <ul className="space-y-3">{rest.map(renderRow)}</ul>
                  </section>
                )}
              </div>
            ) : (
              visible.length > 0 && <ul className="space-y-3">{visible.map(renderRow)}</ul>
            )}
          </CardContent>
        </Card>
      )}

      <ListReaders listId={listId} forName={forName} />

      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          const id = photoFor.current;
          e.target.value = "";
          if (file && id) void upload(id, file);
        }}
      />

      {managed && (
        <AddToHistoryDialog
          key={giving?.claimId ?? "cerrado"}
          gift={giving}
          defaultOccasion={closestOccasionLabel(dates ?? [])}
          onClose={() => setGiving(null)}
          onConfirm={handleGiven}
        />
      )}
    </div>
  );
}

type MenuLabels = { toTop: string; fromTop: string; got: string; remove: string; photo: string };

/**
 * Las acciones de una fila, en un `Popover` como el de las ideas guardadas.
 * Quitar va al final, en rojo y tras un separador.
 */
function OwnerItemMenu({
  item,
  labels,
  favoritesFull,
  onFavorite,
  canMoveUp,
  canMoveDown,
  onMove,
  onPhoto,
  onRemovePhoto,
  onGot,
  onRemove,
}: {
  item: Item;
  labels: MenuLabels;
  favoritesFull: boolean;
  onFavorite: (favorite: boolean) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
  onPhoto: () => void;
  onRemovePhoto: () => void;
  onGot: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const run = (action: () => void) => {
    setOpen(false);
    action();
  };
  const cannotAdd = !item.favorite && favoritesFull;
  const row =
    "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted outline-hidden disabled:pointer-events-none disabled:opacity-50";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Más acciones para ${item.title}`} />}
      >
        <Ellipsis className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-0.5 p-1.5">
        <button
          type="button"
          className={cn(row, "flex-col items-start gap-0.5")}
          disabled={cannotAdd}
          aria-describedby={cannotAdd ? `tope-ilusion-${item._id}` : undefined}
          onClick={() => run(() => onFavorite(!item.favorite))}
        >
          {item.favorite ? labels.fromTop : labels.toTop}
          {cannotAdd && (
            <span id={`tope-ilusion-${item._id}`} className="text-xs text-muted-foreground">
              Ya hay {MAX_LIST_FAVORITES}. Saca una para pasar esta.
            </span>
          )}
        </button>
        {(canMoveUp || canMoveDown) && (
          <>
            <button type="button" className={row} disabled={!canMoveUp} onClick={() => run(() => onMove("up"))}>
              Subir un puesto
            </button>
            <button type="button" className={row} disabled={!canMoveDown} onClick={() => run(() => onMove("down"))}>
              Bajar un puesto
            </button>
          </>
        )}
        <button type="button" className={row} onClick={() => run(onPhoto)}>
          {item.photoUrl ? "Cambiar la foto" : labels.photo}
        </button>
        {item.photoUrl && (
          <button type="button" className={row} onClick={() => run(onRemovePhoto)}>
            Quitar la foto
          </button>
        )}
        <button type="button" className={row} onClick={() => run(onGot)}>
          {labels.got}
        </button>
        <div role="separator" className="my-1 h-px bg-border/60" />
        <button type="button" className={cn(row, "gap-2 text-destructive")} onClick={() => run(onRemove)}>
          <Trash2 className="size-4 shrink-0" aria-hidden />
          {labels.remove}
        </button>
      </PopoverContent>
    </Popover>
  );
}

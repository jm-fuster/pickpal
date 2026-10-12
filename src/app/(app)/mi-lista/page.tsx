"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BookHeart, Bookmark, ClipboardPaste, Ellipsis, PencilLine, Trash2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AddRowButton } from "@/components/layout/AddRowButton";
import { EmptyState } from "@/components/layout/EmptyState";
import { ListItemLink } from "@/components/lista/ListItemLink";
import { ListReaders } from "@/components/lista/ListReaders";
import { userErrorMessage } from "@/lib/errors";
import { ITEMS_COUNTER_FROM, MAX_LIST_FAVORITES, MAX_LIST_ITEMS } from "@/lib/listLimits";
import { formatApproxPrice } from "@/lib/price";
import { cn } from "@/lib/utils";
import { AboutNote } from "@/components/lista/AboutNote";
import { OwnerBirthday } from "@/components/lista/OwnerBirthday";
import { usePhotoUpload } from "@/components/lista/usePhotoUpload";

// El formulario (react-hook-form + zod) solo aparece al apuntar o editar algo.
// Va en su propio chunk, que se pide al montar la página: llega mucho antes de
// que la lista cargue, así que el botón lo abre sin esperas.
const loadListItemForm = () => import("@/components/lista/ListItemForm");
const ListItemForm = dynamic(() => loadListItemForm().then((m) => m.ListItemForm));

type Item = FunctionReturnType<typeof api.lists.myItems>[number];
type RemoveReason = "got" | undefined;

// Lo que dura el aviso con «Deshacer» antes de borrar de verdad.
const UNDO_MS = 6000;

/**
 * «Mi lista»: lo que te haría ilusión recibir, para quien te regala
 * (docs/encargo-lista.md). Es la única pantalla de la app que habla de ti y no
 * de otra persona. Lo que se marca para regalarte no aparece en ningún sitio
 * de esta página.
 */
export default function MyListPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const items = useQuery(api.lists.myItems, isLoaded && isSignedIn ? {} : "skip");
  const removeItem = useMutation(api.lists.removeItem);
  const setFavorite = useMutation(api.lists.setFavorite);
  const moveItem = useMutation(api.lists.moveItem);
  const removeItemPhoto = useMutation(api.lists.removeItemPhoto);
  const { upload, uploadingId } = usePhotoUpload();
  // Un solo selector de archivos para toda la página; recuerda para qué fila se abrió.
  const photoInput = useRef<HTMLInputElement>(null);
  const photoFor = useRef<Id<"listItems"> | null>(null);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"listItems"> | null>(null);
  const [highlightId, setHighlightId] = useState<Id<"listItems"> | null>(null);

  // Quitar no borra al momento: la fila se esconde y el borrado espera a que
  // se cierre el aviso con «Deshacer». Así, si la dueña se arrepiente, quien
  // lo había marcado nunca llega a ver «Ya no está en su lista».
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

  // Al salir de la página (o cerrar la pestaña) se confirman los borrados que
  // esperaban, como en el generador de ideas, y se cierran sus avisos: un
  // «Deshacer» que ya no puede deshacer nada engañaría.
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
    const t = setTimeout(() => setHighlightId(null), 1600);
    return () => clearTimeout(t);
  }, [highlightId]);

  const handleRemove = (item: Item, reason: RemoveReason) => {
    setHiddenIds((prev) => new Set(prev).add(item._id));
    const toastId = toast(reason === "got" ? "Quitado de tu lista: ya lo tienes" : "Quitado de tu lista", {
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

  const handleFavorite = async (item: Item, favorite: boolean) => {
    try {
      await setFavorite({ id: item._id, favorite });
      toast.success(
        favorite ? "Pasado a lo que más ilusión te haría" : "Sacado de lo que más ilusión te haría",
      );
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo guardar"));
    }
  };

  const handleMove = async (item: Item, direction: "up" | "down") => {
    try {
      await moveItem({ id: item._id, direction });
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo mover"));
    }
  };

  const pickPhoto = (item: Item) => {
    photoFor.current = item._id;
    photoInput.current?.click();
  };

  const handleRemovePhoto = async (item: Item) => {
    try {
      await removeItemPhoto({ id: item._id });
      toast.success("Foto quitada");
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo quitar la foto"));
    }
  };

  const visible = items?.filter((i) => !hiddenIds.has(i._id)) ?? [];
  const favorites = visible.filter((i) => i.favorite);
  const rest = visible.filter((i) => !i.favorite);
  // Los topes se cuentan con lo que tiene el servidor, que es quien los aplica:
  // lo que espera a borrarse todavía ocupa sitio.
  const count = items?.length ?? 0;
  const favoriteCount = items?.filter((i) => i.favorite).length ?? 0;
  const full = count >= MAX_LIST_ITEMS;

  const renderRow = (item: Item, index: number, group: Item[]) => (
    <li key={item._id} id={`elemento-${item._id}`}>
      {editingId === item._id ? (
        <ListItemForm item={item} onDone={() => setEditingId(null)} />
      ) : (
        <div
          className={cn(
            "flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 text-sm transition-colors duration-700",
            highlightId === item._id && "bg-secondary/10",
          )}
        >
          {item.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.photoUrl}
              alt=""
              className="size-14 shrink-0 rounded-md border border-border/60 object-cover"
            />
          )}
          <div className="min-w-0 flex-1 space-y-1">
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
            {item.note && (
              <p className="whitespace-pre-line text-xs text-muted-foreground">{item.note}</p>
            )}
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
              favoritesFull={favoriteCount >= MAX_LIST_FAVORITES}
              onFavorite={(favorite) => handleFavorite(item, favorite)}
              canMoveUp={index > 0}
              canMoveDown={index < group.length - 1}
              onMove={(direction) => handleMove(item, direction)}
              onPhoto={() => pickPhoto(item)}
              onRemovePhoto={() => handleRemovePhoto(item)}
              onGot={() => handleRemove(item, "got")}
              onRemove={() => handleRemove(item, undefined)}
            />
          </div>
        </div>
      )}
    </li>
  );

  return (
    <main className="flex flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8 w-full max-w-5xl">
      <div>
        <h1 className="text-4xl font-medium">Mi lista</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lo que te haría ilusión recibir, para quien te regala.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {items === undefined ? (
          <div className="space-y-3" role="status">
            <span className="sr-only">Cargando tu lista…</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                className="h-16 rounded-2xl border border-dashed border-border/60 animate-pulse"
              />
            ))}
          </div>
        ) : visible.length === 0 && !adding ? (
          <EmptyState
            icon={BookHeart}
            title="Nada apuntado todavía"
            description="Apunta lo que te haría ilusión recibir, con su enlace si lo tienes. Quien tenga acceso a tu lista lo verá en su libreta, junto a tus fechas."
            cta={
              <div className="flex flex-col items-center gap-3">
                <Button size="lg" onClick={() => setAdding(true)} className="hover:bg-primary/80">
                  Apuntar lo primero
                </Button>
                <Link
                  href="/mi-lista/traer"
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
                  Lo que te haría ilusión
                </h2>
                {count >= ITEMS_COUNTER_FROM && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {count} de {MAX_LIST_ITEMS}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <AboutNote />
                <OwnerBirthday />
              </div>

              {adding ? (
                <ListItemForm
                  onDone={(addedId) => {
                    setAdding(false);
                    if (addedId) setHighlightId(addedId);
                  }}
                />
              ) : full ? (
                <p className="rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
                  Tu lista ya tiene {MAX_LIST_ITEMS} cosas, el máximo. Quita alguna para apuntar otra.
                </p>
              ) : (
                <div className="space-y-2">
                  <AddRowButton onClick={() => setAdding(true)}>Apuntar algo</AddRowButton>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    <Link
                      href="/mi-lista/traer"
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
                  <section aria-labelledby="grupo-mas-ilusion" className="space-y-2">
                    <h3 id="grupo-mas-ilusion" className="font-sans text-sm font-medium">
                      Lo que más ilusión te haría
                    </h3>
                    <ul className="space-y-2">{favorites.map(renderRow)}</ul>
                  </section>
                  {rest.length > 0 && (
                    <section aria-labelledby="grupo-resto" className="space-y-2">
                      <h3 id="grupo-resto" className="font-sans text-sm font-medium text-muted-foreground">
                        El resto
                      </h3>
                      <ul className="space-y-2">{rest.map(renderRow)}</ul>
                    </section>
                  )}
                </div>
              ) : (
                visible.length > 0 && <ul className="space-y-2">{visible.map(renderRow)}</ul>
              )}
            </CardContent>
          </Card>
        )}

        <ListReaders />
      </div>

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
    </main>
  );
}

/**
 * Las acciones de una fila de la dueña, en un `Popover` como el de las ideas
 * guardadas: con «Lo que más ilusión…» y «Ya lo tengo», la fila tendría cuatro
 * iconos sueltos. Quitar va al final, en rojo y tras un separador.
 */
function OwnerItemMenu({
  item,
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
          {item.favorite ? "Sacar de lo que más ilusión me haría" : "Pasar a lo que más ilusión me haría"}
          {cannotAdd && (
            <span id={`tope-ilusion-${item._id}`} className="text-xs text-muted-foreground">
              Ya tienes {MAX_LIST_FAVORITES}. Saca una para pasar esta.
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
          {item.photoUrl ? "Cambiar la foto" : "Añadir una foto"}
        </button>
        {item.photoUrl && (
          <button type="button" className={row} onClick={() => run(onRemovePhoto)}>
            Quitar la foto
          </button>
        )}
        <button type="button" className={row} onClick={() => run(onGot)}>
          Ya lo tengo
        </button>
        <div role="separator" className="my-1 h-px bg-border/60" />
        <button type="button" className={cn(row, "gap-2 text-destructive")} onClick={() => run(onRemove)}>
          <Trash2 className="size-4 shrink-0" aria-hidden />
          Quitar de mi lista
        </button>
      </PopoverContent>
    </Popover>
  );
}

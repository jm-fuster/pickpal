"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  BookHeart,
  Bookmark,
  CakeSlice,
  Camera,
  Check,
  ClipboardPaste,
  Gift,
  Heart,
  ImageOff,
  PencilLine,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Count } from "@/components/layout/Count";
import { EmptyState } from "@/components/layout/EmptyState";
import { useFlip } from "@/components/layout/useFlip";
import { ActionMenu, type MenuGroup } from "@/components/people/ActionMenu";
import { AddToHistoryDialog, type HistoryValues } from "@/components/people/AddToHistoryDialog";
import { itemVisual } from "@/components/people/ideaParts";
import { ListReaders } from "@/components/lista/ListReaders";
import { AboutNote } from "@/components/lista/AboutNote";
import { OwnerBirthday } from "@/components/lista/OwnerBirthday";
import { QuickAddItem } from "@/components/lista/QuickAddItem";
import {
  AddPhotoButton,
  FavoriteToggle,
  GroupTitle,
  ItemRow,
  ItemSheet,
  hasItemMeta,
  ItemMeta,
  SheetActions,
  SheetLinkRow,
  SHOWCASE,
  SHOWCASE_ITEM,
  ShowcaseTile,
} from "@/components/lista/ListParts";
import { usePhotoUpload } from "@/components/lista/usePhotoUpload";
import { closestOccasionLabel, formatDayMonth } from "@/lib/dates";
import { userErrorMessage } from "@/lib/errors";
import { ITEMS_COUNTER_FROM, MAX_LIST_FAVORITES, MAX_LIST_ITEMS } from "@/lib/listLimits";
import { cn } from "@/lib/utils";

// El formulario (react-hook-form + zod) solo aparece al editar algo; lo nuevo
// se apunta en la línea de `QuickAddItem`. Va en su propio chunk, que se pide
// al montar: llega mucho antes de que la lista cargue, así que «Editar» lo
// abre sin esperas.
const loadListItemForm = () => import("@/components/lista/ListItemForm");
const ListItemForm = dynamic(() => loadListItemForm().then((m) => m.ListItemForm));

type OwnItem = FunctionReturnType<typeof api.lists.myItems>[number];
type ManagedItem = FunctionReturnType<typeof api.lists.managedItems>[number];
type Item = OwnItem & Partial<Pick<ManagedItem, "state" | "claimId">>;
type RemoveReason = "got" | undefined;

// Lo que dura el aviso con «Deshacer» antes de borrar de verdad.
const UNDO_MS = 6000;

// «Apuntar desde la tienda» es un marcador del navegador: en el móvil no hay
// barra de marcadores, así que solo se ofrece con pantalla de ordenador.
const WIDE = "(min-width: 768px)";
const subscribeWide = (onChange: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const useWide = () =>
  useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);

/**
 * Lo que ve quien escribe una lista: su propia «Mi lista» o una lista que lleva
 * para otra persona (docs/encargo-listas-ninos.md, opción A).
 *
 * - **Lista propia** (`listId` vacío): nada de esta vista lee las marcas
 *   (decisión 7 de docs/encargo-lista.md). Lee `lists.myItems`, que no las cruza.
 * - **Lista a cargo** (`listId`): quien la lleva también regala, así que ve qué
 *   está cogido, nunca quién (`lists.managedItems`), y puede marcar. La sorpresa
 *   es para quien no tiene cuenta, que nunca entra.
 *
 * «Escaparate y libreta» (2-nov-2026, docs/design-system.md): lo que más ilusión
 * le haría va en tarjetas grandes y el resto en filas; en las dos, el corazón
 * es la única acción a la vista. Editar, la foto, el orden, «Ya lo tengo» y
 * quitar viven en la hoja que se abre al tocar una cosa; pegar una lista, el
 * marcador y el cumpleaños, en el «⋯» de la tarjeta.
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
  const router = useRouter();
  const wide = useWide();
  const { isLoaded, isSignedIn } = useAuth();
  const ready = isLoaded && isSignedIn;
  const ownItems = useQuery(api.lists.myItems, ready && !managed ? {} : "skip");
  const managedItems = useQuery(api.lists.managedItems, ready && listId ? { listId } : "skip");
  const items: Item[] | undefined = managed ? managedItems : ownItems;
  const dates = useQuery(api.importantDates.getByPerson, ready && personId ? { personId } : "skip");
  const birthday = useQuery(api.lists.myBirthday, ready ? (listId ? { listId } : {}) : "skip");
  const about = useQuery(api.lists.myAbout, ready ? (listId ? { listId } : {}) : "skip");

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
  const [editingBirthday, setEditingBirthday] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [highlightId, setHighlightId] = useState<Id<"listItems"> | null>(null);
  // Lo apuntado en la línea se señala sin mover la página: quien apunta sigue
  // escribiendo arriba, con el teclado abierto en el móvil.
  const quietHighlight = useRef(false);
  const [giving, setGiving] = useState<{ claimId: Id<"listClaims">; title: string } | null>(null);
  // La hoja guarda su cosa al cerrarse, para que no se vacíe mientras baja.
  const [sheet, setSheet] = useState<{ id: Id<"listItems">; open: boolean } | null>(null);
  // Lo que cambia de sitio (al escaparate, un puesto arriba, el hueco de lo
  // quitado) se desliza: cada acción mide antes con `captureFlip()`.
  const { ref: flipRef, capture: captureFlip } = useFlip<HTMLDivElement>();

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
        birthday: birthday ? "Su cumpleaños" : `Añadir el cumpleaños de ${forName}`,
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
        birthday: birthday ? "Tu cumpleaños" : "Añadir tu cumpleaños",
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
    const quiet = quietHighlight.current;
    quietHighlight.current = false;
    const el = document.getElementById(`elemento-${highlightId}`);
    if (el && !quiet) {
      const rect = el.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      }
    }
    const timer = setTimeout(() => setHighlightId(null), 1600);
    return () => clearTimeout(timer);
  }, [highlightId]);

  // Editar se pide desde la hoja, que puede estar lejos del formulario.
  useEffect(() => {
    if (!editingId) return;
    const el = document.getElementById(`editar-${editingId}`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [editingId]);

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      await action();
    } catch (err) {
      toast.error(userErrorMessage(err, fallback));
    }
  };

  const handleRemove = (item: Item, reason: RemoveReason) => {
    captureFlip();
    setHiddenIds((prev) => new Set(prev).add(item._id));
    const toastId = toast(reason === "got" ? t.removedGot : t.removed, {
      duration: UNDO_MS,
      action: {
        label: "Deshacer",
        onClick: () => {
          pending.current.delete(item._id);
          captureFlip();
          unhide(item._id);
        },
      },
      onDismiss: () => commitRemoval(item._id),
      onAutoClose: () => commitRemoval(item._id),
    });
    pending.current.set(item._id, { reason, toastId });
  };

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
  const favoritesFull = favoriteCount >= MAX_LIST_FAVORITES;
  const full = count >= MAX_LIST_ITEMS;

  // El corazón: con el tope lleno no se desactiva (un botón apagado no explica
  // nada); avisa de por qué no puede.
  const toggleFavorite = (item: Item) => {
    if (!item.favorite && favoritesFull) {
      toast.error(`Ya hay ${MAX_LIST_FAVORITES} en lo que más ilusión. Saca una para pasar esta.`);
      return;
    }
    captureFlip();
    return run(async () => {
      await setFavorite({ id: item._id, favorite: !item.favorite });
      toast.success(t.moved(!item.favorite));
    }, "No se pudo guardar");
  };

  /** En una lista a cargo, cómo está cada cosa para quien regala. */
  const claimLine = (item: Item) => {
    if (!managed || !item.state) return null;
    if (item.state === "taken") return "Cogido";
    if (item.state === "mine") return <span className="text-brand-secondary">Lo regalas tú</span>;
    if (item.state === "given") return "Regalado";
    return null;
  };

  const sub = (item: Item) => {
    if (uploadingId === item._id) return <span role="status">Subiendo la foto…</span>;
    const meta = hasItemMeta(item) ? <ItemMeta item={item} /> : (item.note ?? null);
    const line = claimLine(item);
    if (line && meta) return <>{line}, {meta}</>;
    return line ?? meta;
  };

  // El corazón se nombra por lo que es (fijo) y su tooltip, por lo que hace.
  const heart = (item: Item) => ({
    on: item.favorite,
    label: `${t.top}: ${item.title}`,
    hint: item.favorite ? t.fromTop : t.toTop,
    onClick: () => toggleFavorite(item),
  });

  const open = (id: Id<"listItems">) => setSheet({ id, open: true });
  const closeSheet = () => setSheet((s) => (s ? { ...s, open: false } : s));
  const sheetItem = sheet ? items?.find((i) => i._id === sheet.id) : undefined;

  const sheetGroup = sheetItem ? (sheetItem.favorite ? favorites : rest) : [];
  const sheetIndex = sheetItem ? sheetGroup.findIndex((i) => i._id === sheetItem._id) : -1;

  const cardMenu: MenuGroup[] = [
    {
      actions: [
        // Sin nota escrita no hace falta: la card ya enseña su enlace para añadirla.
        ...(about ? [{ label: "Editar la nota", icon: PencilLine, onSelect: () => setEditingNote(true) }] : []),
        { label: "Pegar una lista", icon: ClipboardPaste, onSelect: () => router.push(t.pasteHref) },
        ...(wide ? [{ label: "Apuntar desde la tienda", icon: Bookmark, onSelect: () => router.push("/mi-lista/apuntar") }] : []),
        {
          label: t.birthday,
          icon: CakeSlice,
          hint: birthday ? formatDayMonth(birthday.month, birthday.day) : undefined,
          onSelect: () => setEditingBirthday(true),
        },
      ],
    },
  ];

  const editForm = (item: Item) => (
    <div id={`editar-${item._id}`} className="scroll-mt-6">
      <ListItemForm item={item} listId={listId} onDone={() => setEditingId(null)} />
    </div>
  );
  const editingFavorite = favorites.find((i) => i._id === editingId);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {items === undefined ? (
        <div className="space-y-3" role="status" data-loading>
          <span className="sr-only">Cargando la lista…</span>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} aria-hidden className="h-16 rounded-2xl border border-dashed border-border/60 motion-safe:animate-pulse" />
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
        <Card className="@container border-border/60 shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-(--dur-swap)">
          <CardContent ref={flipRef} className="space-y-5 p-5">
            <div className="flex items-start gap-2">
              {/* Dentro de la fila: suelto, el space-y le daría su margen aunque no se vea. */}
              <h2 className="sr-only">{t.heading}</h2>
              <div className="min-w-0 flex-1">
                <AboutNote listId={listId} forName={forName} editing={editingNote} onEditingChange={setEditingNote} />
              </div>
              {count >= ITEMS_COUNTER_FROM && (
                <span className="pt-1.5 text-xs whitespace-nowrap text-muted-foreground">
                  {count} de {MAX_LIST_ITEMS}
                </span>
              )}
              <ActionMenu label="Más opciones de la lista" groups={cardMenu} />
            </div>

            {managed && (
              <p className="text-xs text-muted-foreground">
                Ves qué está cogido, no quién lo regala. Lo que marques tú cuenta como cogido para los demás.
              </p>
            )}

            <OwnerBirthday
              listId={listId}
              forName={forName}
              editing={editingBirthday}
              onEditingChange={setEditingBirthday}
            />

            {full ? (
              <p className="rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground">{t.full}</p>
            ) : (
              <QuickAddItem
                listId={listId}
                existing={items}
                autoFocus={adding}
                onAdded={(addedId) => {
                  quietHighlight.current = true;
                  setHighlightId(addedId);
                }}
                onPhoto={upload}
              />
            )}

            {favorites.length > 0 && (
              <section aria-labelledby={`${t.idPrefix}-mas-ilusion`} className="space-y-3">
                <GroupTitle id={`${t.idPrefix}-mas-ilusion`} flipKey="titulo-mas-ilusion">
                  {t.top}
                  <Count>
                    {favoriteCount} de {MAX_LIST_FAVORITES}
                  </Count>
                </GroupTitle>
                {editingFavorite && editForm(editingFavorite)}
                <ul className={SHOWCASE}>
                  {favorites.map((item) => (
                    <li
                      key={item._id}
                      id={`elemento-${item._id}`}
                      data-flip={item._id}
                      className={cn(SHOWCASE_ITEM, "rounded-xl transition-shadow duration-700", highlightId === item._id && "ring-4 ring-secondary/20")}
                    >
                      <ShowcaseTile
                        visual={itemVisual(item)}
                        title={item.title}
                        meta={sub(item)}
                        dimmed={item.state === "taken"}
                        corner={<FavoriteToggle {...heart(item)} overlay />}
                        visualAction={
                          !item.photoUrl && uploadingId !== item._id ? (
                            <AddPhotoButton title={item.title} onClick={() => pickPhoto(item)} />
                          ) : null
                        }
                        onOpen={() => open(item._id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {rest.length > 0 && (
              <section aria-labelledby={favorites.length > 0 ? `${t.idPrefix}-resto` : undefined} className="space-y-1">
                {favorites.length > 0 && (
                  <GroupTitle id={`${t.idPrefix}-resto`} muted flipKey="titulo-resto">
                    El resto
                  </GroupTitle>
                )}
                <ul>
                  {rest.map((item) =>
                    editingId === item._id ? (
                      <li key={item._id} className="py-1.5">{editForm(item)}</li>
                    ) : (
                      <ItemRow
                        key={item._id}
                        id={`elemento-${item._id}`}
                        flipKey={item._id}
                        highlighted={highlightId === item._id}
                        visual={itemVisual(item)}
                        title={item.title}
                        sub={sub(item)}
                        dimmed={item.state === "taken"}
                        onOpen={() => open(item._id)}
                        action={<FavoriteToggle {...heart(item)} />}
                      />
                    ),
                  )}
                </ul>
              </section>
            )}
          </CardContent>
        </Card>
      )}

      <ListReaders listId={listId} forName={forName} />

      {sheetItem && (
        <ItemSheet
          open={sheet?.open ?? false}
          onOpenChange={(o) => (o ? null : closeSheet())}
          visual={itemVisual(sheetItem)}
          title={sheetItem.title}
          meta={<ItemMeta item={sheetItem} />}
        >
          {sheetItem.note && <p className="whitespace-pre-line text-sm text-muted-foreground">{sheetItem.note}</p>}
          {managed && sheetItem.state === "taken" && (
            <p className="text-sm text-muted-foreground">Cogido: alguien va a regalarlo. No sabes quién.</p>
          )}
          {sheetItem.url && (
            <div className="border-t border-border/60 pt-2">
              <SheetLinkRow url={sheetItem.url} />
            </div>
          )}
          <div className="border-t border-border/60 pt-1">
            <OwnerItemActions
              item={sheetItem}
              managed={managed}
              labels={t}
              canMoveUp={sheetIndex > 0}
              canMoveDown={sheetIndex >= 0 && sheetIndex < sheetGroup.length - 1}
              onEdit={() => setEditingId(sheetItem._id)}
              onFavorite={() => toggleFavorite(sheetItem)}
              onPhoto={() => pickPhoto(sheetItem)}
              onRemovePhoto={() =>
                run(async () => {
                  await removeItemPhoto({ id: sheetItem._id });
                  toast.success("Foto quitada");
                }, "No se pudo quitar la foto")
              }
              onMove={(direction) => {
                captureFlip();
                return run(() => moveItem({ id: sheetItem._id, direction }), "No se pudo mover");
              }}
              onGot={() => handleRemove(sheetItem, "got")}
              onRemove={() => handleRemove(sheetItem, undefined)}
              onClaim={() => run(() => claim({ itemId: sheetItem._id }), "No se pudo marcar")}
              onUnclaim={(claimId) => run(() => unclaim({ claimId }), "No se pudo quitar la marca")}
              onGiven={(claimId) => setGiving({ claimId, title: sheetItem.title })}
              onDone={closeSheet}
            />
          </div>
        </ItemSheet>
      )}

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

type ActionLabels = { toTop: string; fromTop: string; got: string; remove: string; photo: string };

/**
 * Lo que se hace con una cosa, en su hoja: lo que antes iba en el «⋯» de la
 * fila. En una lista a cargo, primero la marca de quien la lleva. Quitar va al
 * final y en rojo.
 */
function OwnerItemActions({
  item,
  managed,
  labels,
  canMoveUp,
  canMoveDown,
  onEdit,
  onFavorite,
  onPhoto,
  onRemovePhoto,
  onMove,
  onGot,
  onRemove,
  onClaim,
  onUnclaim,
  onGiven,
  onDone,
}: {
  item: Item;
  managed: boolean;
  labels: ActionLabels;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: () => void;
  onFavorite: () => void;
  onPhoto: () => void;
  onRemovePhoto: () => unknown;
  onMove: (direction: "up" | "down") => unknown;
  onGot: () => void;
  onRemove: () => void;
  onClaim: () => unknown;
  onUnclaim: (claimId: Id<"listClaims">) => unknown;
  onGiven: (claimId: Id<"listClaims">) => void;
  onDone: () => void;
}) {
  const claimId = item.claimId;
  const claimActions: MenuGroup["actions"] = !managed
    ? []
    : item.state === "free"
      ? [{ label: "Lo regalo yo", icon: Gift, onSelect: onClaim }]
      : claimId && item.state === "mine"
        ? [
            { label: "Ya se lo he regalado", icon: Check, onSelect: () => onGiven(claimId) },
            { label: "Quitar tu marca", icon: X, onSelect: () => onUnclaim(claimId) },
          ]
        : claimId && item.state === "given"
          ? [{ label: "Quitar tu marca", icon: X, onSelect: () => onUnclaim(claimId) }]
          : [];
  const groups: MenuGroup[] = [
    { actions: claimActions },
    {
      actions: [
        { label: "Editar", icon: PencilLine, onSelect: onEdit },
        { label: item.favorite ? labels.fromTop : labels.toTop, icon: Heart, onSelect: onFavorite },
        { label: item.photoUrl ? "Cambiar la foto" : labels.photo, icon: Camera, onSelect: onPhoto },
        ...(item.photoUrl ? [{ label: "Quitar la foto", icon: ImageOff, onSelect: onRemovePhoto }] : []),
      ],
    },
    {
      actions: [
        ...(canMoveUp ? [{ label: "Subir un puesto", icon: ArrowUp, onSelect: () => onMove("up") }] : []),
        ...(canMoveDown ? [{ label: "Bajar un puesto", icon: ArrowDown, onSelect: () => onMove("down") }] : []),
      ],
    },
    {
      actions: [
        { label: labels.got, icon: Check, onSelect: onGot },
        { label: labels.remove, icon: Trash2, destructive: true, onSelect: onRemove },
      ],
    },
  ];
  return <SheetActions groups={groups} onDone={onDone} />;
}

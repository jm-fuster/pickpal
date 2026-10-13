"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { BookHeart, Check, ChevronDown, ChevronUp, ExternalLink, Gift, X } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { AddToHistoryDialog, type HistoryValues } from "@/components/people/AddToHistoryDialog";
import { ListItemLink } from "@/components/lista/ListItemLink";
import { closestOccasionLabel, formatDayMonth, freeEventLabel } from "@/lib/dates";
import { userErrorMessage } from "@/lib/errors";
import { budgetTarget, fitsBudget, formatApproxPrice } from "@/lib/price";
import { MAX_NEW_BADGES } from "@/lib/listSeen";
import {
  generateCompareUrl,
  generateStoreSearchUrl,
  otherStoresFor,
  STORE_ICONS,
  STORE_LABELS,
  type StoreId,
} from "@/lib/stores";
import { cn } from "@/lib/utils";
import { useNewSince } from "@/components/lista/useNewSince";

type SharedList = FunctionReturnType<typeof api.lists.forPerson>[number];
type SharedItem = SharedList["items"][number];
type Budget = { budgetMin?: number; budgetMax?: number };
type DateLike = Budget & { label: string; month: number; day: number; year?: number; recurring?: boolean };
type Giftable = { claimId: Id<"listClaims">; title: string; occasionLabel?: string | null };

/**
 * «La lista de {nombre}» en la ficha de quien la recibe (decisión 11 de
 * docs/encargo-lista.md). Solo aparece si TÚ has asociado a esta ficha una
 * lista que te compartieron: otro invitado de la misma ficha no ve nada.
 *
 * Lleva `id="lista"` porque el email de recordatorio enlaza aquí.
 */
export function PersonListSection({
  personId,
  personName,
  dates,
  personBudget = {},
  favoriteStores,
}: {
  personId: Id<"people">;
  personName: string;
  dates: DateLike[];
  personBudget?: Budget;
  /** Las tiendas de quien lee, para «Otras tiendas». */
  favoriteStores: StoreId[];
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const ready = isLoaded && isSignedIn;
  const lists = useQuery(api.lists.forPerson, ready ? { personId } : "skip");
  const people = useQuery(api.people.getAll, ready ? {} : "skip");

  if (!lists || lists.length === 0) return null;

  return (
    <div id="lista" className="scroll-mt-6 space-y-6">
      {lists.map((list) => (
        <SharedListCard
          key={list.shareId}
          list={list}
          // Con una sola lista, el nombre de la ficha, que es como la conoces
          // tú. Con dos (raro), el de cada dueña, para distinguirlas.
          name={lists.length > 1 ? (list.forName ?? list.ownerName ?? list.ownerEmail ?? personName) : personName}
          personId={personId}
          people={people ?? []}
          dates={dates}
          personBudget={personBudget}
          favoriteStores={favoriteStores}
        />
      ))}
    </div>
  );
}

function SharedListCard({
  list,
  name,
  personId,
  people,
  dates,
  personBudget,
  favoriteStores,
}: {
  list: SharedList;
  name: string;
  personId: Id<"people">;
  people: Array<{ _id: Id<"people">; name: string }>;
  dates: DateLike[];
  personBudget: Budget;
  favoriteStores: StoreId[];
}) {
  const claim = useMutation(api.lists.claim);
  const unclaim = useMutation(api.lists.unclaim);
  const acknowledgeEdit = useMutation(api.lists.acknowledgeEdit);
  const markGiven = useMutation(api.lists.markGiven);
  const associate = useMutation(api.lists.associate);
  const leave = useMutation(api.lists.leave);
  const leaveAndBlock = useMutation(api.lists.leaveAndBlock);
  const createDate = useMutation(api.importantDates.create);
  const createHistoryEntry = useMutation(api.giftHistory.create);

  const [giving, setGiving] = useState<Giftable | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [block, setBlock] = useState(false);
  const [addingBirthday, setAddingBirthday] = useState(false);
  // Filas con «Otras tiendas» desplegado. Solo en este navegador y esta visita.
  const [searching, setSearching] = useState<ReadonlySet<string>>(new Set());
  const toggleSearch = (id: string) =>
    setSearching((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      await action();
    } catch (err) {
      toast.error(userErrorMessage(err, fallback));
    }
  };

  const handleGiven = async (values: HistoryValues) => {
    if (!giving) return;
    await createHistoryEntry({
      personId,
      giftName: giving.title,
      occasionLabel: values.occasionLabel,
      year: values.year,
      reaction: values.reaction,
      notes: values.notes,
    });
    await markGiven({ claimId: giving.claimId });
  };

  const handleMove = async (target: Id<"people">) => {
    if (target === personId) return;
    try {
      await associate({ shareId: list.shareId, personId: target });
      const targetName = people.find((p) => p._id === target)?.name;
      toast.success(targetName ? `Lista movida a la ficha de ${targetName}` : "Lista movida");
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo mover la lista"));
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      if (block) await leaveAndBlock({ shareId: list.shareId });
      else await leave({ shareId: list.shareId });
      toast.success(`Ya no ves la lista de ${name}`);
      setConfirmLeave(false);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo dejar la lista"));
    } finally {
      setLeaving(false);
    }
  };

  // Su cumpleaños, si lo ha puesto. Se ofrece añadirlo a la ficha solo si la
  // ficha no tiene ya una fecha ese día.
  const birthday = list.birthday;
  const birthdayInFicha =
    birthday !== null && dates.some((d) => d.month === birthday.month && d.day === birthday.day);
  const handleAddBirthday = async () => {
    if (!birthday) return;
    setAddingBirthday(true);
    try {
      // Si la ficha ya tiene un «Cumpleaños» con otra fecha (el servidor no admite
      // dos etiquetas iguales), este entra con otro nombre en vez de fallar.
      const label = freeEventLabel(["Cumpleaños", "Cumpleaños (de su lista)"], dates.map((d) => d.label));
      await createDate({ personId, label, month: birthday.month, day: birthday.day, recurring: true });
      toast.success("Cumpleaños añadido a su ficha");
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo añadir la fecha"));
    } finally {
      setAddingBirthday(false);
    }
  };

  const favorites = list.items.filter((i) => i.favorite);
  const rest = list.items.filter((i) => !i.favorite);
  const groupId = `lista-${list.shareId}`;
  const fresh = useNewSince(list.shareId, list.items);
  const badgeNew = fresh.size > 0 && fresh.size <= MAX_NEW_BADGES;

  // Una sola frase, sin juzgar cada fila: cuántas cosas con precio caben en
  // lo que pensabas gastar. Se calcula aquí; tu presupuesto no sale de tu
  // navegador ni llega a la dueña.
  const target = budgetTarget(dates, personBudget);
  const fitting = target
    ? list.items.filter((i) => i.priceCents !== null && fitsBudget(i.priceCents, target.budget)).length
    : 0;

  const renderItem = (item: SharedItem) => {
    // «Otras tiendas» solo en lo que aún puedes regalar: lo libre y lo tuyo.
    const canSearch = item.state === "free" || item.state === "mine";
    const searchOpen = canSearch && searching.has(item._id);
    const searchId = `otras-tiendas-${item._id}`;
    const stores = searchOpen ? otherStoresFor(favoriteStores, item.url) : [];
    return (
      <li
        key={item._id}
        className="rounded-lg border border-border/60 bg-background/60 p-4 text-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            {item.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.photoUrl}
                alt=""
                className="size-14 shrink-0 rounded-md border border-border/60 object-cover"
              />
            )}
            <div className="min-w-0 space-y-1.5">
              <p className={cn("font-medium leading-snug", item.state === "taken" && "text-muted-foreground")}>
                {item.title}
                {badgeNew && fresh.has(item._id) && (
                  <Badge variant="outline" className="ml-2 align-middle text-muted-foreground">
                    Nuevo
                  </Badge>
                )}
              </p>
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
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canSearch && (
              // Detrás de la acción principal en móvil; a su izquierda en escritorio.
              <Button
                size="sm"
                variant="ghost"
                className="order-last text-muted-foreground sm:order-first"
                aria-expanded={searchOpen}
                aria-controls={searchId}
                onClick={() => toggleSearch(item._id)}
              >
                Otras tiendas
                {searchOpen ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
              </Button>
            )}
            {item.state === "free" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => run(() => claim({ itemId: item._id }), "No se pudo marcar")}
              >
                <Gift aria-hidden />
                Lo regalo yo
              </Button>
            )}
            {item.state === "mine" && item.claimId && (
              <>
                <Badge variant="secondary">
                  {item.occasionLabel ? `Lo regalas tú · para ${item.occasionLabel}` : "Lo regalas tú"}
                </Badge>
                <Button
                  size="sm"
                  className="hover:bg-primary/80"
                  onClick={() =>
                    setGiving({ claimId: item.claimId!, title: item.title, occasionLabel: item.occasionLabel })
                  }
                >
                  Ya se lo he regalado
                </Button>
              </>
            )}
            {item.state === "given" && (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Check className="size-3" aria-hidden />
                Regalado
              </Badge>
            )}
            {(item.state === "mine" || item.state === "given") && item.claimId && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Quitar tu marca de ${item.title}`}
                title="Quitar tu marca"
                onClick={() => run(() => unclaim({ claimId: item.claimId! }), "No se pudo quitar la marca")}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            )}
            {item.state === "taken" && (
              <span className="text-xs text-muted-foreground">Ya lo regala otra persona</span>
            )}
          </div>
        </div>
        {searchOpen && (
          // PickPal no mira precios: son búsquedas con el título, en las tiendas
          // de quien lee, y en idealo, que es quien ordena por precio.
          <div
            id={searchId}
            className="mt-4 flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            {stores.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Buscar en</span>
                {stores.map((store) => (
                  <a
                    key={store}
                    href={generateStoreSearchUrl(store, item.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Buscar ${item.title} en ${STORE_LABELS[store]} (abre en una pestaña nueva)`}
                    className={cn(buttonVariants({ size: "xs", variant: "outline" }))}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={STORE_ICONS[store]}
                      alt=""
                      aria-hidden
                      className="size-3.5 shrink-0 rounded-sm bg-white object-contain p-px"
                    />
                    {STORE_LABELS[store]}
                  </a>
                ))}
              </div>
            )}
            <a
              href={generateCompareUrl(item.title)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Comparar precios de ${item.title} en idealo.es (abre en una pestaña nueva)`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Comparar precios en idealo.es
              <ExternalLink className="size-3 shrink-0" aria-hidden />
            </a>
          </div>
        )}
        {item.editedSinceMark && item.claimId && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary/10 px-2.5 py-1.5 text-xs">
            <span>{name} lo ha cambiado después de que lo marcaras.</span>
            <Button
              size="xs"
              variant="outline"
              onClick={() =>
                run(() => acknowledgeEdit({ claimId: item.claimId! }), "No se pudo guardar")
              }
            >
              Entendido
            </Button>
          </div>
        )}
      </li>
    );
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
            <BookHeart className="size-3.5" aria-hidden />
            La lista de {name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {list.forName
              ? `La lleva ${list.ownerName ?? list.ownerEmail ?? "otra persona"}. Ve qué está cogido, no quién lo regala.`
              : `Lo que ${name} ha apuntado que le haría ilusión. No ve lo que marcas.`}
          </p>
        </div>

        {list.about && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            <span className="text-foreground">{name}:</span> «{list.about}»
          </p>
        )}
        {birthday && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>
              <span className="text-foreground">Su cumpleaños:</span> {formatDayMonth(birthday.month, birthday.day)}
            </span>
            {!birthdayInFicha && (
              <Button size="xs" variant="outline" onClick={handleAddBirthday} disabled={addingBirthday}>
                Añadir a su ficha
              </Button>
            )}
          </div>
        )}
        {fresh.size > MAX_NEW_BADGES && (
          <p className="text-sm text-muted-foreground">
            Ha apuntado {fresh.size} cosas desde la última vez que la miraste.
          </p>
        )}
        {fitting > 0 && target && (
          <p className="text-sm text-muted-foreground">
            {fitting === 1 ? "1 de sus cosas encaja" : `${fitting} de sus cosas encajan`}{" "}
            {target.label ? `en lo que pensabas gastar para ${target.label}` : `en el presupuesto que tienes para ${name}`}.
          </p>
        )}

        {list.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no ha apuntado nada.</p>
        ) : favorites.length > 0 ? (
          // Lo que la dueña pasó a «Lo que más ilusión te haría», arriba y en su
          // propio grupo, como las ideas guardadas por ocasión. Sin una etiqueta
          // repetida en cada fila.
          <div className="space-y-5">
            <section aria-labelledby={`${groupId}-mas-ilusion`} className="space-y-2">
              <h3 id={`${groupId}-mas-ilusion`} className="font-sans text-sm font-medium">
                Lo que más ilusión le haría
              </h3>
              <ul className="space-y-3">{favorites.map(renderItem)}</ul>
            </section>
            {rest.length > 0 && (
              <section aria-labelledby={`${groupId}-resto`} className="space-y-2">
                <h3 id={`${groupId}-resto`} className="font-sans text-sm font-medium text-muted-foreground">
                  El resto
                </h3>
                <ul className="space-y-3">{rest.map(renderItem)}</ul>
              </section>
            )}
          </div>
        ) : (
          <ul className="space-y-3">{list.items.map(renderItem)}</ul>
        )}

        {list.removed.length > 0 && (
          <ul className="space-y-3" aria-label="Marcados que ya no están en su lista">
            {list.removed.map((r) => (
              <li
                key={r.claimId}
                className="flex flex-col gap-3 rounded-lg border border-dashed border-border/70 p-4 text-sm sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1.5">
                  <p className="font-medium leading-snug text-muted-foreground">{r.title}</p>
                  {r.url && <ListItemLink url={r.url} />}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {/* «Ya lo tiene» cuando la dueña lo quitó con «Ya lo tengo»: así quien lo
                      había marcado no lo confunde con un cambio de idea. */}
                  <Badge variant="outline" className="text-muted-foreground">
                    {r.reason === "got" ? "Ya lo tiene" : "Ya no está en su lista"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setGiving({ claimId: r.claimId, title: r.title })}
                  >
                    Ya se lo he regalado
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar tu marca de ${r.title}`}
                    title="Quitar tu marca"
                    onClick={() => run(() => unclaim({ claimId: r.claimId }), "No se pudo quitar la marca")}
                  >
                    <X className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
          {people.length > 1 ? (
            <div className="flex items-center gap-2">
              <Label htmlFor={`lista-ficha-${list.shareId}`} className="text-xs text-muted-foreground">
                Ficha
              </Label>
              <Select value={personId} onValueChange={(v) => { if (v) handleMove(v as Id<"people">); }}>
                <SelectTrigger id={`lista-ficha-${list.shareId}`} size="sm" className="min-w-40">
                  <span>{people.find((p) => p._id === personId)?.name ?? "Esta ficha"}</span>
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <span />
          )}
          <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(true)}>
            Dejar esta lista
          </Button>
        </div>
      </CardContent>

      <AddToHistoryDialog
        key={giving?.claimId ?? "cerrado"}
        gift={giving}
        // La ocasión que eligió al marcarlo, si la eligió; si no, la más cercana.
        defaultOccasion={giving?.occasionLabel || closestOccasionLabel(dates)}
        onClose={() => setGiving(null)}
        onConfirm={handleGiven}
      />

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Dejar la lista de {name}?</DialogTitle>
            <DialogDescription>
              Dejarás de verla y se quitarán tus marcas. Lo que ya pasaste al historial se
              queda. Para volver a verla, {name} tendría que invitarte otra vez.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={block}
              onChange={(e) => setBlock(e.target.checked)}
              className="mt-0.5 size-4 rounded border-input accent-primary"
            />
            <span>
              Y no quiero más listas de {name}.{" "}
              <span className="text-muted-foreground">
                No se le avisa: sus invitaciones no te llegarán. Puedes deshacerlo en Ajustes.
              </span>
            </span>
          </label>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={leaving}>Cancelar</Button>} />
            <Button variant="destructive" onClick={handleLeave} disabled={leaving}>
              {leaving ? "Saliendo…" : "Dejar la lista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

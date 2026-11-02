"use client";

import { useState, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ArrowRightLeft, Check, ChevronDown, ChevronRight, ExternalLink, Gift, LogOut, ShoppingBag, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GiftToggle,
  GroupTitle,
  ItemRow,
  ItemSheet,
  itemMeta,
  SheetActions,
  SheetLinkRow,
  SHOWCASE,
  SHOWCASE_ITEM,
  ShowcaseTile,
} from "@/components/lista/ListParts";
import { ActionMenu, type MenuGroup } from "@/components/people/ActionMenu";
import {
  itemVisual,
  useClaimMenu,
  type GiveTarget,
  type ImportantDate,
  type SharedItem,
  type SharedList,
} from "@/components/people/ideaParts";
import { formatDayMonth, freeEventLabel } from "@/lib/dates";
import { userErrorMessage } from "@/lib/errors";
import { budgetTarget, fitsBudget } from "@/lib/price";
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

type Budget = { budgetMin?: number; budgetMax?: number };

/**
 * «La lista de {nombre}» en la ficha de quien la recibe (decisión 11 de
 * docs/encargo-lista.md), como sección de la tarjeta «Más ideas». Solo existe
 * si TÚ has asociado a esta ficha una lista que te compartieron: otro invitado
 * de la misma ficha no ve nada.
 *
 * «Escaparate y libreta» (2-nov-2026): lo que más ilusión le haría va en
 * tarjetas que se deslizan, con «Lo regalo yo» a la vista; el resto, en filas
 * con su baldosa y un solo círculo de regalo. El enlace, «Otras tiendas», la
 * nota y lo que haces con lo marcado viven en la hoja que se abre al tocar
 * una cosa. Lo que ya regala otra persona se pliega al final. Lo que has
 * marcado para la próxima fecha sube a «Lo que tienes pensado»
 * (`hiddenItemIds`). «Mover a otra ficha» y «Dejar esta lista» viven en el
 * «⋯» de la sección.
 *
 * Lleva `id="lista"` porque el email de recordatorio enlaza aquí.
 */
export function SharedListSection({
  list,
  name,
  personId,
  people,
  dates,
  personBudget,
  favoriteStores,
  hiddenItemIds,
  onGive,
}: {
  list: SharedList;
  name: string;
  personId: Id<"people">;
  people: Array<{ _id: Id<"people">; name: string }>;
  dates: ImportantDate[];
  personBudget: Budget;
  /** Las tiendas de quien lee, para «Otras tiendas». */
  favoriteStores: StoreId[];
  /** Lo que ya enseña «Lo que tienes pensado»: no se repite aquí. */
  hiddenItemIds: ReadonlySet<string>;
  onGive: (target: GiveTarget) => void;
}) {
  const claim = useMutation(api.lists.claim);
  const unclaim = useMutation(api.lists.unclaim);
  const associate = useMutation(api.lists.associate);
  const leave = useMutation(api.lists.leave);
  const leaveAndBlock = useMutation(api.lists.leaveAndBlock);
  const createDate = useMutation(api.importantDates.create);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [block, setBlock] = useState(false);
  const [addingBirthday, setAddingBirthday] = useState(false);
  const [onlyBudget, setOnlyBudget] = useState(false);
  const [showTaken, setShowTaken] = useState(false);
  // La hoja guarda su cosa al cerrarse, para que no se vacíe mientras baja.
  const [sheet, setSheet] = useState<{ id: string; open: boolean } | null>(null);

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      await action();
    } catch (err) {
      toast.error(userErrorMessage(err, fallback));
    }
  };

  const handleMove = async (target: Id<"people">) => {
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

  // Su cumpleaños, si lo ha puesto, solo cuando la ficha aún no tiene esa
  // fecha: si ya la tiene, está en «Eventos» y repetirlo es ruido.
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

  const groupId = `lista-${list.shareId}`;
  const fresh = useNewSince(list.shareId, list.items);
  const badgeNew = fresh.size > 0 && fresh.size <= MAX_NEW_BADGES;

  // El filtro de presupuesto sustituye a la frase que contaba cuántas cosas
  // caben en lo que pensabas gastar. Se calcula aquí; tu presupuesto no sale
  // de tu navegador ni llega a la dueña.
  const target = budgetTarget(dates, personBudget);
  const fits = (i: SharedItem) => target !== null && i.priceCents !== null && fitsBudget(i.priceCents, target.budget);
  const shown = list.items.filter((i) => !hiddenItemIds.has(i._id));
  const fitting = shown.filter(fits).length;
  const budgetOn = onlyBudget && fitting > 0;
  const filtered = budgetOn ? shown.filter(fits) : shown;
  const available = filtered.filter((i) => i.state !== "taken");
  const taken = filtered.filter((i) => i.state === "taken");
  const favorites = available.filter((i) => i.favorite);
  const rest = available.filter((i) => !i.favorite);

  const open = (id: string) => setSheet({ id, open: true });
  const sheetItem = sheet ? list.items.find((i) => i._id === sheet.id) : undefined;
  const closeSheet = () => setSheet((s) => (s ? { ...s, open: false } : s));

  const doClaim = (item: SharedItem) => run(() => claim({ itemId: item._id }), "No se pudo marcar");
  // Libre, el círculo marca; marcado o regalado, abre la hoja con lo que se
  // puede hacer con esa marca.
  const toggle = (item: SharedItem) => (item.state === "free" ? doClaim(item) : open(item._id));

  const others = people.filter((p) => p._id !== personId);
  const listMenu: MenuGroup[] = [
    {
      heading: "Mover a otra ficha",
      actions: others.map((p) => ({ label: p.name, icon: ArrowRightLeft, onSelect: () => handleMove(p._id) })),
    },
    {
      actions: [{ label: "Dejar esta lista", icon: LogOut, destructive: true, onSelect: () => setConfirmLeave(true) }],
    },
  ];

  const tileBadge = (item: SharedItem) =>
    item.editedSinceMark && item.claimId ? (
      <Badge variant="outline" className="bg-card text-brand-secondary">Lo ha cambiado</Badge>
    ) : badgeNew && fresh.has(item._id) ? (
      <Badge variant="outline" className="bg-card">Nuevo</Badge>
    ) : null;

  // El pie solo lleva botón cuando hay algo que hacer: marcar. Lo marcado o
  // regalado es un estado, con el mismo badge que en «Lo que tienes pensado»;
  // lo que se hace con esa marca está en la hoja, que se abre tocando la
  // tarjeta. Mide lo que el botón, para que las tarjetas no bailen.
  const tileFooter = (item: SharedItem) => {
    if (item.state === "free") {
      return (
        <Button size="sm" variant="outline" className="w-full" onClick={() => doClaim(item)} aria-label={`Lo regalo yo: ${item.title}`}>
          <Gift aria-hidden />
          Lo regalo yo
        </Button>
      );
    }
    return (
      <div className="flex h-7 items-center">
        {item.state === "mine" ? (
          <Badge variant="secondary">Lo regalas tú</Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Check aria-hidden />
            Regalado
          </Badge>
        )}
      </div>
    );
  };

  const rowSub = (item: SharedItem) => {
    if (item.state === "mine") {
      return (
        <span className="text-brand-secondary">
          {item.occasionLabel ? `Lo regalas tú · para ${item.occasionLabel}` : "Lo regalas tú"}
        </span>
      );
    }
    if (item.state === "given") return "Regalado";
    if (item.state === "taken") return "Ya lo regala otra persona";
    return itemMeta(item) ?? item.note ?? null;
  };

  const renderRow = (item: SharedItem) => (
    <ItemRow
      key={item._id}
      visual={itemVisual(item)}
      title={item.title}
      sub={rowSub(item)}
      badge={badgeNew && fresh.has(item._id) ? <Badge variant="outline" className="text-muted-foreground">Nuevo</Badge> : null}
      dimmed={item.state === "taken"}
      onOpen={() => open(item._id)}
      action={item.state === "taken" ? null : <GiftToggle state={item.state} title={item.title} onClick={() => toggle(item)} />}
    >
      {item.editedSinceMark && item.claimId && <EditedNotice name={name} claimId={item.claimId} />}
    </ItemRow>
  );

  return (
    <section id="lista" aria-labelledby={`${groupId}-titulo`} className="@container scroll-mt-6 space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h2
            id={`${groupId}-titulo`}
            className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
          >
            La lista de {name}
          </h2>
          <ActionMenu label={`Más acciones para la lista de ${name}`} groups={listMenu} />
        </div>
        <p className="text-xs text-muted-foreground">
          {list.forName
            ? `La lleva ${list.ownerName ?? list.ownerEmail ?? "otra persona"}. Ve qué está cogido, no quién lo regala.`
            : `${name} no ve lo que marcas.`}
        </p>
      </div>

      {list.about && (
        // Su nota, con su voz: la letra de los titulares y sin «Marta:» delante,
        // porque la sección ya dice de quién es la lista.
        <p className="font-heading text-[17px] leading-snug whitespace-pre-line">
          <span className="sr-only">{name} dice: </span>«{list.about}»
        </p>
      )}
      {birthday && !birthdayInFicha && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="text-foreground">Su cumpleaños:</span> {formatDayMonth(birthday.month, birthday.day)}
          </span>
          <Button size="xs" variant="outline" onClick={handleAddBirthday} disabled={addingBirthday}>
            Añadir a su ficha
          </Button>
        </div>
      )}
      {fresh.size > MAX_NEW_BADGES && (
        <p className="text-sm text-muted-foreground">
          Ha apuntado {fresh.size} cosas desde la última vez que la miraste.
        </p>
      )}
      {fitting > 0 && target && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={`Filtrar la lista de ${name}`}>
          <FilterChip pressed={!budgetOn} onClick={() => setOnlyBudget(false)}>
            Todo
          </FilterChip>
          <FilterChip
            pressed={budgetOn}
            onClick={() => setOnlyBudget(true)}
            title={
              target.label
                ? `Lo que encaja en lo que pensabas gastar para ${target.label}`
                : `Lo que encaja en el presupuesto que tienes para ${name}`
            }
          >
            En tu presupuesto · {fitting}
          </FilterChip>
        </div>
      )}

      {list.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no ha apuntado nada.</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Lo que has marcado está arriba, en lo que tienes pensado.</p>
      ) : (
        <div className="space-y-5">
          {favorites.length > 0 && (
            <section aria-labelledby={`${groupId}-mas-ilusion`} className="space-y-3">
              <GroupTitle id={`${groupId}-mas-ilusion`} favorite>
                Lo que más ilusión le haría
              </GroupTitle>
              <ul className={SHOWCASE}>
                {favorites.map((item) => (
                  <li key={item._id} className={SHOWCASE_ITEM}>
                    <ShowcaseTile
                      visual={itemVisual(item)}
                      title={item.title}
                      meta={itemMeta(item)}
                      badge={tileBadge(item)}
                      footer={tileFooter(item)}
                      onOpen={() => open(item._id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {rest.length > 0 &&
            (favorites.length > 0 ? (
              <section aria-labelledby={`${groupId}-resto`} className="space-y-1">
                <GroupTitle id={`${groupId}-resto`} muted>
                  El resto
                </GroupTitle>
                <ul>{rest.map(renderRow)}</ul>
              </section>
            ) : (
              <ul>{rest.map(renderRow)}</ul>
            ))}
        </div>
      )}

      {list.removed.length > 0 && (
        <ul aria-label="Marcados que ya no están en su lista">
          {list.removed.map((r) => (
            <ItemRow
              key={r.claimId}
              visual={itemVisual({ photoUrl: null, title: r.title })}
              title={r.title}
              // «Ya lo tiene» cuando la dueña lo quitó con «Ya lo tengo»: así quien lo
              // había marcado no lo confunde con un cambio de idea.
              sub={r.reason === "got" ? "Ya lo tiene" : "Ya no está en su lista"}
              dimmed
              action={
                // Quitar es secundario: va al «⋯», como en el resto de la ficha.
                <ActionMenu
                  label={`Más acciones para ${r.title}`}
                  groups={unclaimMenu(() => run(() => unclaim({ claimId: r.claimId }), "No se pudo quitar la marca"))}
                />
              }
            >
              <Button size="sm" variant="outline" onClick={() => onGive({ kind: "claim", claimId: r.claimId, title: r.title })}>
                Ya se lo he regalado
              </Button>
            </ItemRow>
          ))}
        </ul>
      )}

      {taken.length > 0 && (
        <div className="border-t border-border/60 pt-1">
          <button
            type="button"
            aria-expanded={showTaken}
            aria-controls={`${groupId}-cogido`}
            onClick={() => setShowTaken((v) => !v)}
            className="flex min-h-11 w-full items-center gap-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className={cn("size-4 transition-transform", showTaken && "rotate-90")} aria-hidden />
            Ya lo regala otra persona · {taken.length}
          </button>
          {showTaken && (
            <ul id={`${groupId}-cogido`}>{taken.map(renderRow)}</ul>
          )}
        </div>
      )}

      {sheetItem && (
        <ItemSheet
          open={sheet?.open ?? false}
          onOpenChange={(o) => (o ? null : closeSheet())}
          visual={itemVisual(sheetItem)}
          title={sheetItem.title}
          meta={itemMeta(sheetItem)}
        >
          <SharedItemSheetBody
            item={sheetItem}
            name={name}
            dates={dates}
            favoriteStores={favoriteStores}
            onClaim={() => doClaim(sheetItem)}
            onUnclaim={() => run(() => unclaim({ claimId: sheetItem.claimId! }), "No se pudo quitar la marca")}
            onGive={onGive}
            onDone={closeSheet}
          />
        </ItemSheet>
      )}

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
    </section>
  );
}

/** El «⋯» de lo que ya no puedes cambiar más que quitando tu marca. */
const unclaimMenu = (onSelect: () => unknown): MenuGroup[] => [
  { actions: [{ label: "Quitar tu marca", icon: X, destructive: true, onSelect }] },
];

/** Un botón del filtro de la lista: «Todo», «En tu presupuesto · 2». */
function FilterChip({
  pressed,
  onClick,
  title,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={title}
      onClick={onClick}
      className={cn(
        "relative h-8 rounded-full border px-3.5 text-sm transition-colors pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1.5",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** «Marta lo ha cambiado después de que lo marcaras», con su «Entendido». */
function EditedNotice({ name, claimId }: { name: string; claimId: Id<"listClaims"> }) {
  const acknowledgeEdit = useMutation(api.lists.acknowledgeEdit);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary/10 px-2.5 py-1.5 text-xs">
      <span>{name} lo ha cambiado después de que lo marcaras.</span>
      <Button
        size="xs"
        variant="outline"
        onClick={async () => {
          try {
            await acknowledgeEdit({ claimId });
          } catch (err) {
            toast.error(userErrorMessage(err, "No se pudo guardar"));
          }
        }}
      >
        Entendido
      </Button>
    </div>
  );
}

/**
 * Lo de dentro de la hoja de una cosa de su lista: su nota, qué puedes hacer
 * según cómo esté (marcarla, o lo que haces con tu marca) y, debajo, el
 * enlace y «Otras tiendas».
 */
function SharedItemSheetBody({
  item,
  name,
  dates,
  favoriteStores,
  onClaim,
  onUnclaim,
  onGive,
  onDone,
}: {
  item: SharedItem;
  name: string;
  dates: ImportantDate[];
  favoriteStores: StoreId[];
  onClaim: () => void;
  onUnclaim: () => void;
  onGive: (target: GiveTarget) => void;
  onDone: () => void;
}) {
  // «Otras tiendas» solo en lo que aún puedes regalar: lo libre y lo tuyo.
  const canSearch = item.state === "free" || item.state === "mine";
  return (
    <>
      {item.note && <p className="whitespace-pre-line text-sm text-muted-foreground">{item.note}</p>}
      {item.editedSinceMark && item.claimId && <EditedNotice name={name} claimId={item.claimId} />}

      {item.state === "free" && (
        <Button size="lg" className="w-full" onClick={onClaim}>
          <Gift aria-hidden />
          Lo regalo yo
        </Button>
      )}
      {item.state === "mine" && item.claimId && (
        <MineActions
          item={{ title: item.title, claimId: item.claimId, occasionId: item.occasionId, occasionLabel: item.occasionLabel }}
          dates={dates}
          onGive={onGive}
          onDone={onDone}
        />
      )}
      {item.state === "given" && item.claimId && (
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Check className="size-4" aria-hidden />
            Ya se lo regalaste.
          </p>
          <SheetActions groups={unclaimMenu(onUnclaim)} onDone={onDone} />
        </div>
      )}
      {item.state === "taken" && <p className="text-sm text-muted-foreground">Ya lo regala otra persona.</p>}

      {(item.url || canSearch) && (
        <div className="flex flex-col border-t border-border/60 pt-2">
          {item.url && <SheetLinkRow url={item.url} />}
          {canSearch && <OtherStores title={item.title} url={item.url} favoriteStores={favoriteStores} />}
        </div>
      )}
    </>
  );
}

/** Lo marcado por ti: para qué ocasión, pasarlo al historial o quitar la marca. */
function MineActions({
  item,
  dates,
  onGive,
  onDone,
}: {
  item: { title: string; claimId: Id<"listClaims">; occasionId: Id<"importantDates"> | null; occasionLabel: string | null };
  dates: ImportantDate[];
  onGive: (target: GiveTarget) => void;
  onDone: () => void;
}) {
  const groups = useClaimMenu(item, dates, onGive);
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-sm text-brand-secondary">
        <Check className="size-4" aria-hidden />
        {item.occasionLabel ? `Lo regalas tú, para ${item.occasionLabel}.` : "Lo regalas tú."}
      </p>
      <SheetActions groups={groups} onDone={onDone} />
    </div>
  );
}

/**
 * «Buscar en otras tiendas»: búsquedas con el título en las tiendas de quien
 * lee y en idealo, que es quien ordena por precio. PickPal no mira precios.
 */
function OtherStores({ title, url, favoriteStores }: { title: string; url?: string; favoriteStores: StoreId[] }) {
  const [open, setOpen] = useState(false);
  const stores = open ? otherStoresFor(favoriteStores, url) : [];
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-sm transition-colors hover:bg-muted"
      >
        <ShoppingBag className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">Buscar en otras tiendas</span>
        <ChevronDown className={cn("size-4 shrink-0 text-subtle-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-2 pt-1 pb-2">
          {stores.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {stores.map((store) => (
                <a
                  key={store}
                  href={generateStoreSearchUrl(store, title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Buscar ${title} en ${STORE_LABELS[store]} (abre en una pestaña nueva)`}
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
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
            href={generateCompareUrl(title)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Comparar precios de ${title} en idealo.es (abre en una pestaña nueva)`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Comparar precios en idealo.es
            <ExternalLink className="size-3 shrink-0" aria-hidden />
          </a>
        </div>
      )}
    </div>
  );
}

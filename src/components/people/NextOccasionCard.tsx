"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, Gift, Plus } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ListItemLink } from "@/components/lista/ListItemLink";
import { AddRowButton } from "@/components/layout/AddRowButton";
import { ActionMenu } from "@/components/people/ActionMenu";
import { OwnIdeaForm } from "@/components/people/OwnIdeaForm";
import {
  IdeaStores,
  ideaOrigin,
  ideaPrice,
  ideaVisual,
  isOwnIdea,
  itemVisual,
  useClaimMenu,
  useIdeaMenu,
  VisualBox,
  type GiveTarget,
  type ImportantDate,
  type SavedIdea,
  type SharedItem,
  type SharedList,
} from "@/components/people/ideaParts";
import { formatDayMonth } from "@/lib/dates";
import { userErrorMessage } from "@/lib/errors";
import { formatBudget, nextOccasion, occasionWhen, URGENT_DAYS } from "@/lib/nextOccasion";
import { formatApproxPrice } from "@/lib/price";
import type { StoreId } from "@/lib/stores";
import { cn } from "@/lib/utils";

/**
 * Lo primero de la ficha: la próxima fecha y lo que ya tienes pensado para
 * ella, venga de donde venga (lo que marcaste de su lista para esa fecha, las
 * sugerencias guardadas en esa ocasión y las ideas que apuntaste tú).
 *
 * Tres estados (docs/design-system.md · «Ficha de un ser querido»):
 * - A una semana o menos, teñida y con el título grande, como la tarjeta de
 *   urgencia de la Agenda.
 * - Más lejos, neutra: el nombre, la fecha y cuánto falta.
 * - Sin ninguna fecha por delante, «Ideas para {nombre}»: la acción principal
 *   es añadir una fecha, porque sin evento la IA no sugiere (decidido el
 *   14-oct-2026), y aquí salen las ideas sin ocasión.
 */
export function NextOccasionCard({
  personId,
  personName,
  dates,
  savedIdeas,
  lists,
  favoriteStores,
  favoriteBrands,
  onGive,
  onAddDate,
}: {
  personId: Id<"people">;
  personName: string;
  dates: ImportantDate[];
  savedIdeas: SavedIdea[];
  lists: SharedList[];
  favoriteStores: StoreId[];
  favoriteBrands: string[];
  onGive: (target: GiveTarget) => void;
  onAddDate: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const next = nextOccasion(dates);
  const urgent = next !== null && next.days <= URGENT_DAYS;
  const knownDate = (id?: Id<"importantDates">) => id !== undefined && dates.some((d) => d._id === id);

  const items = next
    ? lists.flatMap((list) => list.items.filter((i) => i.state === "mine" && i.occasionId === next.event._id))
    : [];
  const ideas = next
    ? savedIdeas.filter((s) => s.importantDateId === next.event._id)
    : savedIdeas.filter((s) => !knownDate(s.importantDateId));
  const count = items.length + ideas.length;

  const title = next ? next.event.label : `Ideas para ${personName}`;
  const budget = next ? formatBudget(next.event.budgetMin, next.event.budgetMax) : null;

  return (
    <section
      aria-labelledby="proxima-ocasion"
      className={cn(
        "@container space-y-5 rounded-2xl border p-5 shadow-sm sm:p-6",
        urgent ? "border-primary/60 bg-primary/5" : "border-border/60 bg-card",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2
            id="proxima-ocasion"
            className={cn("leading-tight font-semibold", urgent ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl")}
          >
            {title}
          </h2>
          {next ? (
            <p className="text-sm text-muted-foreground sm:text-base">
              <span className={cn(urgent && "font-medium text-foreground")}>{occasionWhen(next.days)}</span>
              {" · "}
              {formatDayMonth(next.event.month, next.event.day)}
              {budget && ` · ${budget}`}
            </p>
          ) : (
            <p className="max-w-prose text-sm text-muted-foreground">
              Todavía no hay fechas en su ficha. Añade su cumpleaños y te avisaremos con tiempo; con una fecha,
              PickPal también te sugiere ideas.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {next ? (
            <Link
              href={`/seres-queridos/${personId}/gifts?from=person&occasion=${encodeURIComponent(next.event.label)}`}
              className={cn(buttonVariants(), "w-full sm:w-auto")}
            >
              <Gift className="size-4" aria-hidden />
              Buscar ideas
            </Link>
          ) : (
            <>
              <Button variant="outline" onClick={() => setAdding(true)} className="order-last sm:order-first">
                <Plus className="size-4" aria-hidden />
                Apuntar una idea
              </Button>
              <Button onClick={onAddDate}>
                <CalendarPlus className="size-4" aria-hidden />
                Añadir una fecha
              </Button>
            </>
          )}
        </div>
      </div>

      {adding && (
        <OwnIdeaForm
          personId={personId}
          dates={dates}
          defaultDateId={next?.event._id}
          onDone={() => setAdding(false)}
        />
      )}

      {(next || count > 0) && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            Lo que tienes pensado{count > 0 && <span className="font-normal text-muted-foreground"> · {count}</span>}
          </p>
          {/* En el móvil, carrusel; con sitio, rejilla. */}
          <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 @2xl:grid @2xl:grid-cols-3 @2xl:overflow-visible @4xl:grid-cols-4">
            {items.map((item) => (
              <li key={item._id} className="w-52 shrink-0 snap-start @2xl:w-auto">
                <ItemTile item={item} personName={personName} dates={dates} onGive={onGive} />
              </li>
            ))}
            {ideas.map((idea) => (
              <li key={idea._id} className="w-52 shrink-0 snap-start @2xl:w-auto">
                <IdeaTile
                  idea={idea}
                  dates={dates}
                  favoriteStores={favoriteStores}
                  favoriteBrands={favoriteBrands}
                  onGive={onGive}
                />
              </li>
            ))}
            {next && !adding && (
              <li className="hidden @2xl:block">
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input/50 p-4 text-center text-muted-foreground transition-colors hover:border-input hover:bg-muted/40 hover:text-foreground"
                >
                  <Plus className="size-5" aria-hidden />
                  <span className="text-sm font-medium text-foreground">Apuntar una idea</span>
                  <span className="text-xs">Algo que viste, un plan, lo que se te ocurra</span>
                </button>
              </li>
            )}
          </ul>
          {next && !adding && (
            // En el móvil la casilla punteada no cabe en el carrusel: la misma
            // acción, como fila punteada debajo (regla 1: añadir es punteado).
            <AddRowButton onClick={() => setAdding(true)} className="@2xl:hidden">
              Apuntar una idea
            </AddRowButton>
          )}
        </div>
      )}
    </section>
  );
}

const TILE = "flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card";

function TileHead({ origin, menu }: { origin: string; menu: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{origin}</span>
      {menu}
    </div>
  );
}

function ItemTile({
  item,
  personName,
  dates,
  onGive,
}: {
  item: SharedItem;
  personName: string;
  dates: ImportantDate[];
  onGive: (target: GiveTarget) => void;
}) {
  const acknowledgeEdit = useMutation(api.lists.acknowledgeEdit);
  const groups = useClaimMenu(
    { title: item.title, claimId: item.claimId!, occasionId: item.occasionId, occasionLabel: item.occasionLabel },
    dates,
    onGive,
  );
  return (
    <article className={TILE} aria-label={item.title}>
      <VisualBox visual={itemVisual(item)} className="h-24 w-full @2xl:h-28" />
      <div className="flex flex-1 flex-col gap-1 p-3 pt-2">
        <TileHead origin="De su lista" menu={<ActionMenu label={`Más acciones para ${item.title}`} groups={groups} />} />
        <h3 className="line-clamp-2 font-sans text-[15px] leading-snug font-medium">{item.title}</h3>
        {item.priceCents !== null && (
          <p className="text-sm text-muted-foreground">{formatApproxPrice(item.priceCents)}</p>
        )}
        {item.url && <ListItemLink url={item.url} />}
        <div className="mt-auto space-y-1.5 pt-2">
          <Badge variant="secondary">Lo regalas tú</Badge>
          {item.editedSinceMark && item.claimId && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-secondary">
              {personName} lo ha cambiado.
              {/* El mismo «Entendido» que en la fila de su lista: un botón, no un enlace. */}
              <Button
                size="xs"
                variant="outline"
                onClick={async () => {
                  try {
                    await acknowledgeEdit({ claimId: item.claimId! });
                  } catch (err) {
                    toast.error(userErrorMessage(err, "No se pudo guardar"));
                  }
                }}
              >
                Entendido
              </Button>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function IdeaTile({
  idea,
  dates,
  favoriteStores,
  favoriteBrands,
  onGive,
}: {
  idea: SavedIdea;
  dates: ImportantDate[];
  favoriteStores: StoreId[];
  favoriteBrands: string[];
  onGive: (target: GiveTarget) => void;
}) {
  const groups = useIdeaMenu(idea, dates, onGive);
  const price = ideaPrice(idea);
  return (
    <article className={TILE} aria-label={idea.title}>
      <VisualBox visual={ideaVisual(idea)} className="h-24 w-full @2xl:h-28" />
      <div className="flex flex-1 flex-col gap-1 p-3 pt-2">
        <TileHead origin={ideaOrigin(idea)} menu={<ActionMenu label={`Más acciones para ${idea.title}`} groups={groups} />} />
        <h3 className="line-clamp-2 font-sans text-[15px] leading-snug font-medium">{idea.title}</h3>
        {price && <p className="text-sm text-muted-foreground">{price}</p>}
        {isOwnIdea(idea) ? (
          <>
            {idea.url && <ListItemLink url={idea.url} />}
            {idea.description && <p className="line-clamp-2 text-xs text-muted-foreground">{idea.description}</p>}
          </>
        ) : (
          <div className="mt-auto pt-2">
            <IdeaStores idea={idea} favoriteStores={favoriteStores} favoriteBrands={favoriteBrands} />
          </div>
        )}
      </div>
    </article>
  );
}

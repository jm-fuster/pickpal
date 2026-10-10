"use client";

import { useState } from "react";
import { Ellipsis, ExternalLink, Tags, ThumbsUp, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BrandStoreLink } from "@/components/gifts/BrandStoreLink";
import { matchFavoriteBrands } from "@/lib/brands";
import { userErrorMessage } from "@/lib/errors";
import {
  formatEventDate,
  groupSavedIdeas,
  moveDestinations,
  type MoveDestination,
} from "@/lib/savedIdeaGroups";
import { generateStoreSearchUrl, sanitizeFavoriteStores, STORE_ICONS, STORE_LABELS, type StoreId } from "@/lib/stores";
import { cn } from "@/lib/utils";

type SavedIdea = NonNullable<FunctionReturnType<typeof api.savedIdeas.getByPerson>>[number];
type ImportantDate = NonNullable<FunctionReturnType<typeof api.importantDates.getByPerson>>[number];

const formatPriceRange = (min: number, max: number) =>
  min === max ? `${Math.round(min)}€` : `${Math.round(min)}–${Math.round(max)}€`;

const googleSearchUrl = (q: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(q)}`;

/**
 * Tarjeta «Ideas guardadas» de la ficha, agrupada por ocasión
 * (docs/encargo-ocasiones.md). Una ocasión es un evento de la ficha; solo
 * salen las que tienen ideas, y cada idea se mueve de una en una desde su menú.
 */
export function SavedIdeasCard({
  savedIdeas,
  dates,
  favoriteStores,
  favoriteBrands,
  onGiven,
}: {
  savedIdeas: SavedIdea[];
  dates: ImportantDate[];
  favoriteStores: StoreId[];
  favoriteBrands: string[];
  onGiven: (idea: SavedIdea) => void;
}) {
  const groups = groupSavedIdeas(savedIdeas, dates);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <ThumbsUp className="size-3.5" aria-hidden />
          Ideas guardadas
        </h2>
        {savedIdeas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Las ideas que guardes desde el panel de sugerencias aparecerán aquí para convertirlas en historial cuando las regales.
          </p>
        ) : (
          <div className="space-y-7">
            {groups.map((group) => {
              const key = group.kind === "none" ? "sin-ocasion" : group.event._id;
              return (
                <section key={key} aria-labelledby={`ocasion-${key}`} className="space-y-3">
                  <h3 id={`ocasion-${key}`} className="flex flex-wrap items-center gap-x-1 gap-y-1 font-sans text-sm">
                    {group.kind === "none" ? (
                      <span className="font-medium text-muted-foreground">Sin ocasión</span>
                    ) : (
                      <>
                        <span className="font-medium">{group.event.label}</span>
                        <span className="text-muted-foreground">· {formatEventDate(group.event)}</span>
                        {group.past && (
                          <Badge variant="outline" className="ml-1 text-muted-foreground">Ya pasó</Badge>
                        )}
                      </>
                    )}
                  </h3>
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.ideas.map((s) => (
                      <li key={s._id}>
                        <SavedIdeaItem
                          idea={s}
                          dates={dates}
                          favoriteStores={favoriteStores}
                          favoriteBrands={favoriteBrands}
                          onGiven={() => onGiven(s)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SavedIdeaItem({
  idea: s,
  dates,
  favoriteStores,
  favoriteBrands,
  onGiven,
}: {
  idea: SavedIdea;
  dates: ImportantDate[];
  favoriteStores: StoreId[];
  favoriteBrands: string[];
  onGiven: () => void;
}) {
  const cats = Array.isArray(s.category) ? s.category : [s.category];
  // Mismas tiendas que mostró la card al generar: solo las físicas
  // (e ideas viejas sin tipo) muestran chips; experiencias, planes
  // y sorpréndeme → Google. Las ideas nuevas ya guardan el snapshot
  // de tiendas efectivas, así que se muestran tal cual; las viejas
  // sin ese dato caen al fallback de favoritas.
  const isPhysicalLike = !s.giftType || s.giftType === "fisica";
  const storeChips = !isPhysicalLike
    ? []
    : s.suggestedStores && s.suggestedStores.length > 0
      ? sanitizeFavoriteStores(s.suggestedStores)
      : favoriteStores;
  // Marcas favoritas que la idea menciona — misma heurística que la
  // card de generación. El badge sale para cualquier tipo; el botón
  // a la tienda de marca, solo en físicas (igual que los chips).
  const matchedBrands = matchFavoriteBrands(s, favoriteBrands);

  return (
    <div className="flex h-full flex-col gap-2 rounded-lg border border-border/60 bg-background/60 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-snug line-clamp-2">{s.title}</p>
          {/* Sin la ocasión: ya la dice la cabecera del grupo. */}
          <p className="text-xs text-muted-foreground">
            {formatPriceRange(s.priceMinEuros, s.priceMaxEuros)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            className="text-xs h-7 px-2 hover:bg-primary/80"
            onClick={onGiven}
          >
            Lo regalé
          </Button>
          <SavedIdeaMenu idea={s} dates={dates} />
        </div>
      </div>
      {s.description && (
        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {s.description}
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        {matchedBrands.map((brand) => (
          <Badge
            key={`brand-${brand}`}
            variant="outline"
            className="gap-1 text-xs text-brand-secondary border-secondary/40"
          >
            <Tags className="size-3" aria-hidden />
            <span className="sr-only">Marca favorita: </span>
            {brand}
          </Badge>
        ))}
        {cats.map((c) => (
          <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
        ))}
      </div>
      {s.amazonQuery && (
        <div className="mt-auto flex flex-col gap-2 pt-1">
          {isPhysicalLike && matchedBrands.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {matchedBrands.map((brand) => (
                <BrandStoreLink
                  key={`brand-${brand}`}
                  brand={brand}
                  query={s.amazonQuery}
                  title={s.title}
                  matchedBrandStores={s.matchedBrandStores}
                  size="sm"
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
          {storeChips.length > 0 ? (
            storeChips.map((store) => (
              <a
                key={store}
                href={generateStoreSearchUrl(store, s.amazonQuery, {
                  minEuros: s.priceMinEuros,
                  maxEuros: s.priceMaxEuros,
                })}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Buscar ${s.title} en ${STORE_LABELS[store]} (abre en una pestaña nueva)`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={STORE_ICONS[store]} alt="" className="size-3.5 shrink-0 rounded-sm object-contain bg-white p-px" aria-hidden />
                {STORE_LABELS[store]}
                <ExternalLink className="size-3 shrink-0" aria-hidden />
              </a>
            ))
          ) : (
            <a
              href={googleSearchUrl(s.amazonQuery)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Buscar ${s.title} (abre en una pestaña nueva)`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Buscar
              <ExternalLink className="size-3 shrink-0" aria-hidden />
            </a>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Menú de una idea guardada: moverla a otra ocasión o quitarla. Los destinos
 * son los eventos que aún van a llegar y «Sin ocasión», nunca el sitio donde ya
 * está (decisión 10). Quitar vive aquí, un paso más lejos que «Lo regalé».
 */
function SavedIdeaMenu({ idea, dates }: { idea: SavedIdea; dates: ImportantDate[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const moveIdea = useMutation(api.savedIdeas.move);
  const removeIdea = useMutation(api.savedIdeas.remove);
  const destinations = moveDestinations(dates, idea.importantDateId);
  const labelId = `mover-${idea._id}`;

  const handleMove = async (dest: MoveDestination<ImportantDate>) => {
    setBusy(true);
    try {
      await moveIdea({ id: idea._id, importantDateId: dest.kind === "none" ? null : dest.event._id });
      setOpen(false);
      toast.success(`Idea movida a ${dest.kind === "none" ? "«Sin ocasión»" : dest.event.label}`);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo mover la idea"));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await removeIdea({ id: idea._id });
      setOpen(false);
    } catch {
      toast.error("No se pudo eliminar la idea");
    } finally {
      setBusy(false);
    }
  };

  const item = "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted outline-hidden disabled:pointer-events-none disabled:opacity-50";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Más acciones para ${idea.title}`} />
        }
      >
        <Ellipsis className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-68 gap-0.5 p-1.5">
        {destinations.length > 0 && (
          <div role="group" aria-labelledby={labelId} className="flex flex-col gap-0.5">
            <p id={labelId} className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
              Mover a otra ocasión
            </p>
            {destinations.map((dest) => (
              <button
                key={dest.kind === "none" ? "sin-ocasion" : dest.event._id}
                type="button"
                className={item}
                disabled={busy}
                onClick={() => handleMove(dest)}
              >
                <span className="min-w-0 flex-1 truncate">
                  {dest.kind === "none" ? "Sin ocasión" : dest.event.label}
                </span>
                {dest.kind === "event" && (
                  <span className="shrink-0 text-muted-foreground">{formatEventDate(dest.event)}</span>
                )}
              </button>
            ))}
            <div role="separator" className="my-1 h-px bg-border/60" />
          </div>
        )}
        <button
          type="button"
          className={cn(item, "gap-2 text-destructive")}
          disabled={busy}
          onClick={handleRemove}
        >
          <Trash2 className="size-4 shrink-0" aria-hidden />
          Quitar idea
        </button>
      </PopoverContent>
    </Popover>
  );
}

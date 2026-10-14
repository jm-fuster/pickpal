"use client";

import { BookHeart, Check, Gift, NotebookPen, Trash2, X } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BrandStoreLink } from "@/components/gifts/BrandStoreLink";
import type { MenuGroup } from "@/components/people/ActionMenu";
import { matchFavoriteBrands } from "@/lib/brands";
import { userErrorMessage } from "@/lib/errors";
import { resolveGiftImage } from "@/lib/giftImages";
import type { GiftType } from "@/lib/gifts";
import { formatApproxPrice } from "@/lib/price";
import { formatEventDate, moveDestinations } from "@/lib/savedIdeaGroups";
import { generateStoreSearchUrl, sanitizeFavoriteStores, STORE_ICONS, STORE_LABELS, type StoreId } from "@/lib/stores";
import { cn } from "@/lib/utils";

export type SavedIdea = NonNullable<FunctionReturnType<typeof api.savedIdeas.getByPerson>>[number];
export type ImportantDate = NonNullable<FunctionReturnType<typeof api.importantDates.getByPerson>>[number];
export type SharedList = FunctionReturnType<typeof api.lists.forPerson>[number];
export type SharedItem = SharedList["items"][number];

/** Lo que se pasa al historial con «Ya se lo he regalado». */
export type GiveTarget =
  | { kind: "idea"; idea: SavedIdea }
  | { kind: "claim"; claimId: Id<"listClaims">; title: string; occasionLabel?: string | null };

export const isOwnIdea = (idea: SavedIdea) => idea.source === "own";

/** «Tuya» o «Sugerida»: de dónde viene, en pequeño encima del título. */
export const ideaOrigin = (idea: SavedIdea) => (isOwnIdea(idea) ? "Tuya" : "Sugerida");

/** «40–50 €» en las sugeridas; «unos 70 €» en las tuyas, o nada si no le pusiste precio. */
export function ideaPrice(idea: SavedIdea): string | null {
  if (isOwnIdea(idea)) {
    return idea.priceMaxEuros > 0 ? formatApproxPrice(Math.round(idea.priceMaxEuros * 100)) : null;
  }
  const min = Math.round(idea.priceMinEuros);
  const max = Math.round(idea.priceMaxEuros);
  return min === max ? `${min} €` : `${min}–${max} €`;
}

type Visual =
  | { kind: "photo"; url: string }
  | { kind: "icon"; Icon: typeof Gift; container: string; iconClass: string };

const TERRACOTTA = { container: "bg-secondary/15", iconClass: "text-brand-secondary" };

/**
 * La foto de stock de una sugerencia, o el icono de su categoría; las tuyas,
 * la foto que pegaste o, sin foto, una libreta.
 */
export function ideaVisual(idea: SavedIdea): Visual {
  if (isOwnIdea(idea)) {
    return idea.photoUrl ? { kind: "photo", url: idea.photoUrl } : { kind: "icon", Icon: NotebookPen, ...TERRACOTTA };
  }
  if (idea.image?.url) return { kind: "photo", url: idea.image.url };
  const v = resolveGiftImage(idea.imageKey, (idea.giftType ?? "fisica") as GiftType);
  return { kind: "icon", Icon: v.icon, container: v.container, iconClass: v.iconClass };
}

/** La foto que subió la dueña, o el libro de «Mi lista» si no subió ninguna. */
export function itemVisual(item: Pick<SharedItem, "photoUrl">): Visual {
  return item.photoUrl
    ? { kind: "photo", url: item.photoUrl }
    : { kind: "icon", Icon: BookHeart, ...TERRACOTTA };
}

export function VisualBox({ visual, className, iconSize = "size-8" }: { visual: Visual; className?: string; iconSize?: string }) {
  if (visual.kind === "photo") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={visual.url} alt="" aria-hidden loading="lazy" className={cn("object-cover", className)} />
    );
  }
  const { Icon } = visual;
  return (
    <div aria-hidden className={cn("flex items-center justify-center", visual.container, className)}>
      <Icon className={cn(iconSize, visual.iconClass)} strokeWidth={1.5} />
    </div>
  );
}

/**
 * Dónde comprar una sugerencia: la tienda oficial de una marca favorita, si la
 * menciona, y las tiendas de búsqueda como logos. Las mismas que mostraba la
 * tarjeta de ideas guardadas; solo para regalos físicos. Experiencias y planes,
 * nada: no se compran en una tienda.
 */
export function IdeaStores({
  idea,
  favoriteStores,
  favoriteBrands,
}: {
  idea: SavedIdea;
  favoriteStores: StoreId[];
  favoriteBrands: string[];
}) {
  if (isOwnIdea(idea) || !idea.amazonQuery) return null;
  const physical = !idea.giftType || idea.giftType === "fisica";
  if (!physical) return null;
  const stores =
    idea.suggestedStores && idea.suggestedStores.length > 0
      ? sanitizeFavoriteStores(idea.suggestedStores)
      : favoriteStores;
  const brands = matchFavoriteBrands(idea, favoriteBrands);
  if (stores.length === 0 && brands.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {brands.map((brand) => (
        <BrandStoreLink
          key={brand}
          brand={brand}
          query={idea.amazonQuery}
          title={idea.title}
          matchedBrandStores={idea.matchedBrandStores}
          size="sm"
        />
      ))}
      {stores.map((store) => (
        <a
          key={store}
          href={generateStoreSearchUrl(store, idea.amazonQuery, {
            minEuros: idea.priceMinEuros,
            maxEuros: idea.priceMaxEuros,
          })}
          target="_blank"
          rel="noopener noreferrer"
          title={STORE_LABELS[store]}
          aria-label={`Buscar ${idea.title} en ${STORE_LABELS[store]} (abre en una pestaña nueva)`}
          className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-background transition-colors hover:bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={STORE_ICONS[store]} alt="" aria-hidden className="size-4 rounded-sm bg-white object-contain p-px" />
        </a>
      ))}
    </div>
  );
}

/**
 * El «⋯» de una idea guardada, sugerida o tuya: pasarla al historial, moverla
 * a otra ocasión (las que vienen y «Sin ocasión», nunca donde ya está) o
 * quitarla.
 */
export function useIdeaMenu(
  idea: SavedIdea,
  dates: ImportantDate[],
  onGive: (target: GiveTarget) => void,
): MenuGroup[] {
  const move = useMutation(api.savedIdeas.move);
  const remove = useMutation(api.savedIdeas.remove);
  const destinations = moveDestinations(dates, idea.importantDateId);
  return [
    { actions: [{ label: "Ya se lo he regalado", icon: Gift, onSelect: () => onGive({ kind: "idea", idea }) }] },
    {
      heading: "Mover a otra ocasión",
      actions: destinations.map((dest) => ({
        label: dest.kind === "none" ? "Sin ocasión" : dest.event.label,
        hint: dest.kind === "event" ? formatEventDate(dest.event) : undefined,
        onSelect: async () => {
          try {
            await move({ id: idea._id, importantDateId: dest.kind === "none" ? null : dest.event._id });
            toast.success(`Idea movida a ${dest.kind === "none" ? "«Sin ocasión»" : dest.event.label}`);
          } catch (err) {
            toast.error(userErrorMessage(err, "No se pudo mover la idea"));
          }
        },
      })),
    },
    {
      actions: [
        {
          label: "Quitar idea",
          icon: Trash2,
          destructive: true,
          onSelect: async () => {
            try {
              await remove({ id: idea._id });
            } catch {
              toast.error("No se pudo quitar la idea");
            }
          },
        },
      ],
    },
  ];
}

/**
 * El «⋯» de algo de su lista que has marcado: pasarlo al historial, decir
 * para qué fecha lo guardas (así sube a «Lo que tienes pensado») o quitar tu
 * marca. Ella no ve nada de esto.
 */
export function useClaimMenu(
  item: { title: string; claimId: Id<"listClaims">; occasionId: Id<"importantDates"> | null; occasionLabel: string | null },
  dates: ImportantDate[],
  onGive: (target: GiveTarget) => void,
): MenuGroup[] {
  const setOccasion = useMutation(api.lists.setClaimOccasion);
  const unclaim = useMutation(api.lists.unclaim);
  const choose = async (importantDateId: Id<"importantDates"> | null) => {
    try {
      await setOccasion({ claimId: item.claimId, importantDateId });
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo guardar"));
    }
  };
  const options = moveDestinations(dates, item.occasionId ?? undefined);
  return [
    {
      actions: [
        {
          label: "Ya se lo he regalado",
          icon: Check,
          onSelect: () =>
            onGive({ kind: "claim", claimId: item.claimId, title: item.title, occasionLabel: item.occasionLabel }),
        },
      ],
    },
    {
      heading: "Para qué ocasión",
      actions: options.map((dest) => ({
        label: dest.kind === "none" ? "Sin ocasión" : dest.event.label,
        hint: dest.kind === "event" ? formatEventDate(dest.event) : undefined,
        onSelect: () => choose(dest.kind === "none" ? null : dest.event._id),
      })),
    },
    {
      actions: [
        {
          label: "Quitar tu marca",
          icon: X,
          destructive: true,
          onSelect: async () => {
            try {
              await unclaim({ claimId: item.claimId });
            } catch (err) {
              toast.error(userErrorMessage(err, "No se pudo quitar la marca"));
            }
          },
        },
      ],
    },
  ];
}

import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TagChip } from "@/components/landing/mocks/parts";
import type { ExampleIdea } from "@/components/landing/sample";
import type { GiftType } from "@/lib/giftCatalog";
import { resolveGiftImage } from "@/lib/giftImages";
import { STORE_LABELS } from "@/lib/stores";
import { cn } from "@/lib/utils";

// GiftRecommendationCard sin pulgares, sin foto y sin hover. No es una réplica
// inerte: es texto de verdad que se lee y se anuncia. Sin h3 (la real lo
// lleva): nueve tarjetas colgarían del árbol de títulos de la página. Las
// tiendas van en texto, sin logos y sin enlace: desde aquí no se busca nada.

// El formato de la propia tarjeta, sin espacio («35–55€»), no el de ideaPrice.
const formatRange = (min: number, max: number) => (min === max ? `${min}€` : `${min}–${max}€`);

// Las clases del botón `outline` de las tiendas, menos el hover: aquí no se pulsa.
const CHIP =
  "inline-flex h-8 min-w-0 items-center justify-center gap-2 rounded-lg border border-input bg-background bg-clip-padding px-3 text-sm font-medium dark:bg-input/30";

function StoreChip({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn(CHIP, className)}>
      <span className="truncate">{label}</span>
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
    </span>
  );
}

export function IdeaExampleCard({ idea, type }: { idea: ExampleIdea; type: GiftType }) {
  const visual = resolveGiftImage(idea.imageKey, idea.type);
  const stores = idea.stores ?? [];
  // Como en la app: solo el tipo «Producto físico» reparte la búsqueda por
  // tiendas; en «Sorpréndeme» hasta la idea física lleva un único botón.
  const singleLabel = type === "tiempo-juntos" ? "Ideas" : "Buscar";

  return (
    <Card className="flex h-full flex-col shadow-sm">
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className={cn("flex h-24 shrink-0 items-center justify-center rounded-xl", visual.container)}>
          <visual.icon className={cn("size-9", visual.iconClass)} strokeWidth={1.5} aria-hidden />
        </div>
        <div className="space-y-2">
          <p className="min-h-[2.75rem] font-heading text-base leading-snug font-medium">
            {idea.title}
          </p>
          <div className="flex min-h-[2.75rem] flex-wrap content-start gap-1">
            {idea.tags.map((tag) => (
              <TagChip key={tag} className="text-xs">
                {tag}
              </TagChip>
            ))}
          </div>
        </div>
        <p className="min-h-[4.5rem] text-sm leading-relaxed text-muted-foreground">
          {idea.description}
        </p>
        {/* Sin line-clamp: es texto de verdad y se leería cortado (o, con más
            espaciado, a medias). mt-auto deja precio y tiendas a la misma
            altura en toda la fila aunque una descripción ocupe cuatro líneas. */}
        <div className="@container mt-auto space-y-3 border-t border-border/50 pt-3">
          <p className="text-lg font-medium tracking-tight">{formatRange(idea.min, idea.max)}</p>
          {type === "fisica" ? (
            <>
              <p className="sr-only">Buscar en:</p>
              {/* Desvío asumido: la app siempre va a dos columnas, pero aquí la
                  tarjeta es más estrecha (tres en 9/12 de ancho) y a dos
                  columnas se cortaba hasta «Amaz…». Por debajo de 19rem, una. */}
              <div className="grid grid-cols-1 gap-2 @min-[19rem]:grid-cols-2">
                {stores.map((id, i) => (
                  <StoreChip
                    key={id}
                    label={STORE_LABELS[id]}
                    className={cn(stores.length % 2 === 1 && i === stores.length - 1 && "@min-[19rem]:col-span-2")}
                  />
                ))}
              </div>
            </>
          ) : (
            <StoreChip label={singleLabel} className="w-full" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { IdeaExampleCard } from "@/components/landing/IdeaExampleCard";
import { reveal } from "@/components/landing/motion";
import { IDEAS, OCCASION } from "@/components/landing/sample";
import { buttonVariants } from "@/components/ui/button-variants";
import { IDEA_KINDS, MIXED_GIFT_TYPE } from "@/lib/giftCatalog";
import { cn } from "@/lib/utils";

// El filtro por tipo de GiftsPanel, sin JS: radios nativos y una lista por
// filtro, todas en el HTML. src/app/landing.css enseña la del radio marcado
// con :has() ([data-switcher] / [data-set]); sin :has() se queda en «Todas».
// Las ocultas van con display:none, fuera del árbol accesible, y al volver a
// mostrarse sus tarjetas repiten la entrada.
//
// Desvíos asumidos de GiftsPanel: sin recuentos (aquí cada filtro enseña tres
// ejemplos, y «Todas · 3» junto a «Para comprar · 3» no cuadraría) y con una
// leyenda visible, porque es lo único de la página que responde.

const FILTERS = [{ value: MIXED_GIFT_TYPE, label: "Todas" }, ...IDEA_KINDS];

export function IdeasSwitcher() {
  return (
    <div data-switcher className="mt-8 space-y-5">
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-5">
        <p className="text-sm">
          <span className="text-muted-foreground">¿Para qué ocasión?</span>{" "}
          <span className="font-medium">
            {OCCASION.label} · {OCCASION.panelBudget}
          </span>
        </p>
      </div>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        {/* «Prueba», como antes: entre réplicas que no responden, esta sí y
            tiene que decirlo. */}
        <legend className="mb-2 text-sm font-medium">Prueba a filtrarlas por tipo</legend>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            // El botón `sm` del panel: `ghost` en reposo y, marcado, el borde y
            // el fondo de `outline`. Trae la zona táctil de 44 px.
            <label
              key={f.value}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "group/pill cursor-pointer text-muted-foreground has-[:checked]:border-input has-[:checked]:bg-background has-[:checked]:text-foreground dark:has-[:checked]:bg-input/30 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
              )}
            >
              <input
                type="radio"
                name="tipo-regalo"
                value={f.value}
                defaultChecked={f.value === MIXED_GIFT_TYPE}
                className="sr-only"
              />
              <Check aria-hidden className="hidden group-has-[:checked]/pill:block" />
              {f.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <div {...reveal()}>
          {FILTERS.map((f) => (
            <ul
              key={f.value}
              data-set={f.value}
              aria-label={`Ideas de ejemplo: ${f.label}`}
              className="grid gap-4 sm:grid-cols-2 md:grid-cols-3"
            >
              {IDEAS[f.value].map((idea, i) => (
                <li
                  key={idea.title}
                  style={{ "--landing-i": i } as CSSProperties}
                  // La tercera solo cabe en la fila de tres: en dos columnas quedaría huérfana.
                  className={i === 2 ? "max-md:hidden" : undefined}
                >
                  <IdeaExampleCard idea={idea} />
                </li>
              ))}
            </ul>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Ideas de ejemplo para Marta.
        </p>
      </div>
    </div>
  );
}

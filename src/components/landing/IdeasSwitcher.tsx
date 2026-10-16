import type { CSSProperties } from "react";
import { Check, Heart, ShoppingBag, Shuffle, Ticket } from "lucide-react";
import { IdeaExampleCard } from "@/components/landing/IdeaExampleCard";
import { reveal } from "@/components/landing/motion";
import { IDEAS, OCCASION } from "@/components/landing/sample";
import { GIFT_TYPES } from "@/lib/giftCatalog";

// El bloque de tipo de regalo de GiftsPanel, sin JS: radios nativos y una
// lista por tipo, todas en el HTML. src/app/landing.css enseña la del radio
// marcado con :has() ([data-switcher] / [data-set]); sin :has() se queda en
// «Producto físico». Las ocultas van con display:none, fuera del árbol
// accesible, y al volver a mostrarse sus tarjetas repiten la entrada.
//
// Desvío asumido de GiftsPanel: la casilla marcada lleva además un check y el
// foco va en contorno sólido. El fondo bg-muted y el borde del panel real se
// quedan en 1,16–1,36:1 y desaparecen en colores forzados; el check (color de
// texto) y el contorno se ven en los dos temas y con colores forzados.

const ICONS = { ShoppingBag, Ticket, Heart, Shuffle };

export function IdeasSwitcher() {
  return (
    <div data-switcher className="mt-8 space-y-5">
      <div className="space-y-5 rounded-2xl border border-dashed border-border/70 bg-card/40 p-5">
        <p className="text-sm">
          <span className="text-muted-foreground">¿Para qué ocasión?</span>{" "}
          <span className="font-medium">
            {OCCASION.label} · {OCCASION.panelBudget}
          </span>
        </p>
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-2 text-xs font-medium text-muted-foreground">Tipo de regalo</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GIFT_TYPES.map((t) => {
              const Icon = ICONS[t.icon];
              return (
                <label
                  key={t.value}
                  className="group/tile relative flex min-h-11 cursor-pointer flex-col items-start gap-1 rounded-xl border border-border/50 px-3 py-3 text-left text-sm text-muted-foreground transition-[background-color,border-color,color] duration-(--dur-micro) hover:border-border hover:text-foreground has-[:checked]:border-border has-[:checked]:bg-muted has-[:checked]:text-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
                >
                  <input
                    type="radio"
                    name="tipo-regalo"
                    value={t.value}
                    defaultChecked={t.value === "fisica"}
                    aria-describedby={`tipo-${t.value}-desc`}
                    className="sr-only"
                  />
                  <Icon className="size-4" aria-hidden />
                  <Check
                    aria-hidden
                    className="absolute top-3 right-3 hidden size-4 group-has-[:checked]/tile:block"
                  />
                  <span className="leading-tight font-medium">{t.label}</span>
                  {/* Fuera del nombre del radio, que sería «Producto físico Algo que…»; llega como descripción. */}
                  <span id={`tipo-${t.value}-desc`} aria-hidden className="text-xs leading-tight text-muted-foreground">
                    {t.description}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
      <div>
        <div {...reveal()}>
          {GIFT_TYPES.map((t) => (
            <ul
              key={t.value}
              data-set={t.value}
              aria-label={`Ideas de ejemplo: ${t.label}`}
              className="grid gap-4 sm:grid-cols-2 md:grid-cols-3"
            >
              {IDEAS[t.value].map((idea, i) => (
                <li
                  key={idea.title}
                  style={{ "--landing-i": i } as CSSProperties}
                  // La tercera solo cabe en la fila de tres: en dos columnas quedaría huérfana.
                  className={i === 2 ? "max-md:hidden" : undefined}
                >
                  <IdeaExampleCard idea={idea} type={t.value} />
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

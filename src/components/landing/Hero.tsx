import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { HeroDisc } from "@/components/landing/StepIllustrations";
import { OccasionMock } from "@/components/landing/mocks/OccasionMock";
import { cn } from "@/lib/utils";

// La pregunta que antes cerraba la página (19-oct-2026, revisión de patrones
// de IA). El titular anterior, «El regalo perfecto para quien más te
// importa.», era la promesa de marca del 18-sep-2026, pero lo podía firmar
// cualquier tienda de regalos y «perfecto» chocaba con el «son orientativas»
// del resto. Las otras dos que se barajaron: «Que su cumpleaños no te pille
// sin idea.» y «Llega a su cumpleaños sabiendo qué regalarle.».
export const HERO_TITLE = "¿Quién cumple años el mes que viene?";

// Tamaño de CTA solo de la landing (docs/design-system.md · Landing). Lo usa
// también el cierre.
export const CTA = "h-11 w-full px-5 text-base min-[400px]:w-auto";

/**
 * Las palabras no se mueven: el h1 es el LCP y pinta en el primer fotograma.
 * Solo anima la columna de la réplica, con CSS al cargar (`data-scene="load"`,
 * src/app/landing.css), así que la escena corre también sin JS.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-x-clip">
      {/* pt-6 y mt-10 en el móvil: a 360×640 la línea de «En 7 días» tiene que
          asomar por encima de los 600 px, y con pt-8 y mt-12 se queda en 608. */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-12 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 lg:px-8 lg:pt-16 lg:pb-24">
        <div className="lg:col-span-7">
          {/* El alto se reserva en líneas (`lh`) para que el paso de la fuente
              de reserva a Fraunces no mueva lo de debajo. En Android la reserva
              es Noto Serif, un 3 % más ancha: «¿Quién cumple años» mide 9,7em
              en Fraunces y 10em en Noto. Cada tamaño está elegido para que esa
              primera línea quepa con las dos y el titular vaya siempre en dos,
              «¿Quién cumple años / el mes que viene?»: 2rem (32 px) hasta 400 px
              y después la escala de globals.css, 4xl (34), 5xl (40), 6xl (48)
              en lg, donde la columna mide 543 px a 1024, y 7xl (60) en xl, con
              618. Por debajo de 360 no cabe con ninguna: se estrecha a 9.5em y
              va en tres con las dos. El 14em impide que en tableta quepa en
              una sola línea. Medido con este titular: si cambia, se vuelve a
              medir. */}
          <h1
            id="hero-title"
            className="max-w-[9.5em] min-h-[3lh] text-balance text-[2rem] leading-[1.05] font-semibold min-[360px]:max-w-[14em] min-[360px]:min-h-[2lh] min-[400px]:text-4xl sm:text-5xl lg:text-6xl xl:text-7xl xl:tracking-tight"
          >
            {HERO_TITLE}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            Apunta lo que sabes de cada persona. PickPal te avisa antes de sus fechas y te propone ideas con lo que apuntaste.
          </p>
          <div className="mt-8 flex flex-col gap-3 min-[400px]:flex-row">
            <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), CTA)}>
              Empezar gratis
            </Link>
            {/* Un <a> y no Link: el router de Next desplaza al ancla pero deja el
                foco donde estaba, y el foco tiene que llegar a la sección. El
                pr-4: con icono, el tamaño lg baja el relleno derecho a pr-2 y,
                junto al px-5 de la landing, el botón quedaba cojo. */}
            <a
              href="#como-funciona"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), CTA, "has-data-[icon=inline-end]:pr-4")}
            >
              Ver cómo funciona
              <ChevronDown
                data-icon="inline-end"
                aria-hidden
                className="motion-safe:transition-transform motion-safe:duration-(--dur-micro) motion-safe:group-hover/button:translate-y-0.5"
              />
            </a>
          </div>
        </div>
        <div data-scene="load" className="relative mx-auto mt-10 w-full max-w-md lg:col-span-5 lg:mt-0 lg:max-w-none">
          {/* En el móvil sube 8 px menos de lo que baja la columna (-top-8 frente
              a mt-10): el destello queda debajo de los botones, sin tocarlos, y
              fuera de la réplica. En oscuro el disco (--accent) es más claro que
              la tarjeta y la hacía leer hundida. */}
          <HeroDisc className="pointer-events-none absolute -top-8 -right-16 size-[20rem] sm:size-[24rem] lg:-top-16 lg:-right-24 lg:size-[28rem] xl:size-[32rem] dark:opacity-70" />
          <OccasionMock className="relative z-10" />
        </div>
      </div>
    </section>
  );
}

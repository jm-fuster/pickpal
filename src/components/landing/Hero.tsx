import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HeroDisc } from "@/components/landing/StepIllustrations";
import { OccasionMock } from "@/components/landing/mocks/OccasionMock";
import { cn } from "@/lib/utils";

// Promesa de marca: Jorge decidió quedarse con ella el 18-sep-2026
// (docs/design-system.md · Pendientes). Las dos alternativas que se barajaron:
// «Que su cumpleaños no te pille sin idea.» y «Llega a su cumpleaños sabiendo
// qué regalarle.».
export const HERO_TITLE = "El regalo perfecto para quien más te importa.";

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
              es Noto Serif, más ancha: parte el titular en 3 líneas hasta unos
              420 px de ancho, cuando Fraunces ya lo deja en 2 desde 398. Por eso,
              por debajo de 440 se estrecha a 10em y va en 3 con cualquiera de
              las dos; de 440 a xl, en 2; en xl, en 3 otra vez (a 60 px «El regalo
              perfecto para» no cabe en la columna). Medido con este titular: si
              cambia, se vuelve a medir. */}
          <h1
            id="hero-title"
            className="max-w-[10em] min-h-[3lh] text-balance text-4xl leading-[1.05] font-semibold min-[440px]:max-w-[14em] min-[440px]:min-h-[2lh] sm:text-5xl lg:text-6xl xl:min-h-[3lh] xl:text-7xl xl:tracking-tighter"
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

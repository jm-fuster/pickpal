import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { CTA } from "@/components/landing/Hero";
import { reveal } from "@/components/landing/motion";
import { LovedOnesIllustration } from "@/components/landing/StepIllustrations";
import { cn } from "@/lib/utils";

// El cierre pide lo mínimo para empezar (una persona y una fecha). El h2 se
// queda por debajo del H1 en cada punto de corte.
export function Closing() {
  return (
    <section aria-labelledby="cierre-titulo" className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
        <div {...reveal("settle")}>
          <LovedOnesIllustration className="mx-auto h-20 w-auto" />
        </div>
        <h2
          id="cierre-titulo"
          className="mt-6 text-3xl leading-tight font-medium text-balance sm:text-4xl lg:text-5xl"
        >
          ¿Quién cumple años el mes que viene?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
          Empieza por esa persona y su fecha. Lo demás lo vas apuntando cuando te enteras.
        </p>
        <div className="mt-8">
          <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), CTA)}>
            Empezar gratis
          </Link>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Solo necesitas un email.</p>
      </div>
    </section>
  );
}

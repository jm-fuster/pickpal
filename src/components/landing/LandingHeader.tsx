import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { LogoMark } from "@/components/ui/LogoMark";
import { cn } from "@/lib/utils";

// Ni sticky ni animada: en una página que se lee de arriba abajo, la cabecera
// solo tiene que estar al llegar. El enlace de salto va primero en el orden de
// tabulación y apunta al <main id="contenido"> de src/app/page.tsx.
export function LandingHeader() {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:text-sm"
      >
        Saltar al contenido
      </a>
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="flex items-center gap-2 text-lg font-medium tracking-tight">
          <LogoMark className="size-7" />
          PickPal
        </span>
        <nav aria-label="Cuenta" className="flex items-center gap-2">
          <Link href="/sign-in" className={buttonVariants({ variant: "ghost" })}>
            Iniciar sesión
          </Link>
          {/* En el móvil ya lo tiene el hero justo debajo. `hidden` va por cn y no
              dentro de buttonVariants, que trae su propio `inline-flex`. */}
          <Link href="/sign-up" className={cn(buttonVariants(), "hidden sm:inline-flex")}>
            Empezar gratis
          </Link>
        </nav>
      </header>
    </>
  );
}

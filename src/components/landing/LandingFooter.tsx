import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";

// Contorno sólido al enfocar: el anillo por defecto (ring/50) se queda en
// 1,83:1 en oscuro, y un contorno sobrevive a los colores forzados.
const LINK =
  "rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <span className="flex items-center gap-2">
          <LogoMark className="size-5" />
          PickPal
        </span>
        <nav aria-label="Legal" className="flex gap-4">
          <Link href="/privacidad" className={LINK}>
            Privacidad
          </Link>
          <Link href="/terminos" className={LINK}>
            Términos
          </Link>
        </nav>
      </div>
    </footer>
  );
}

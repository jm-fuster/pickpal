import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/ui/Logo";

/**
 * El marco de las páginas que viven fuera de la app: entrar, registrarse, la
 * lista de espera, la 404 y la página de error. Logo arriba (enlaza al
 * inicio), el cambio de tema y los enlaces legales al pie.
 */
export function PlainShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between p-6">
        <Link href="/" className="flex">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="flex items-center justify-center gap-4 px-6 py-6 text-center text-xs text-muted-foreground">
        <Link href="/privacidad" className="hover:text-foreground">
          Privacidad
        </Link>
        <Link href="/terminos" className="hover:text-foreground">
          Términos
        </Link>
      </footer>
    </div>
  );
}

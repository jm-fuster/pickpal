"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Logo } from "@/components/ui/Logo";
import { PageMessage } from "@/components/layout/PageMessage";
import { fraunces, geistSans } from "./brandFonts";
import "./globals.css";

// Lo que se ve cuando falla el propio layout raíz, donde `error.tsx` no llega.
// Sustituye al layout entero, así que trae su <html>, sus estilos y sus
// fuentes, y no tiene Clerk, ni next-themes, ni el router de la app: el
// enlace al inicio es un <a> normal, que recarga la página entera. Como
// `error.tsx`, no enseña `error.message` (docs/security.md, sanitización de
// errores). Antes salía la de Next, en inglés.
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Sin next-themes, el tema se lee de donde lo deja guardado: la misma clave
  // `theme` de localStorage. Si falla la lectura, claro, como el resto.
  useEffect(() => {
    let theme: string | null = null;
    try {
      theme = localStorage.getItem("theme");
    } catch {}
    const dark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  return (
    <html lang="es" className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <title>Algo ha fallado · PickPal</title>
        <div className="flex flex-1 flex-col">
          <header className="p-6">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- ver «Ir al inicio» */}
            <a href="/" className="flex w-fit">
              <Logo />
            </a>
          </header>
          <main className="flex flex-1 flex-col">
            <PageMessage
              icon={TriangleAlert}
              title="No se ha podido cargar PickPal"
              description="Ha fallado algo por nuestra parte. Vuelve a intentarlo y, si sigue igual, prueba dentro de un rato."
            >
              <Button size="lg" onClick={() => retry()}>
                Volver a intentarlo
              </Button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- con el layout roto, mejor recargar entera que navegar con el router */}
              <a href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Ir al inicio
              </a>
            </PageMessage>
          </main>
        </div>
      </body>
    </html>
  );
}

import { ViewTransition } from "react";

/**
 * Cambio de página dentro de la app: la que se va se apaga y la que llega
 * aparece subiendo 6 px (clases `page-exit` y `page-enter` de globals.css).
 * La barra lateral y la cabecera quedan fuera y no se mueven.
 *
 * Va en los `template.tsx` de (app) y no en el layout, que no se desmonta al
 * navegar. Hay uno por nivel de rutas con hijas (Next solo remonta la plantilla
 * cuyo segmento hijo cambia), y cuando entran varias a la vez solo anima la de
 * fuera. `default="none"`: ni un `router.refresh()` ni lo que cambia dentro de
 * la página la hacen parpadear. docs/design-system.md · Animaciones.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}

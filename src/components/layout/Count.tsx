import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Cuántos hay, junto a un rótulo o dentro de un botón: «Lo que tienes
 * pensado 3», «En tu presupuesto 2». Sustituye al «· 3» que se repetía como
 * separador en la ficha y la lista (auditoría del 2-nov-2026). Sin
 * "use client": lo usan también las réplicas de la landing.
 */
export function Count({ children, inverted, className }: { children: ReactNode; inverted?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 align-middle text-xs font-medium tabular-nums",
        inverted ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

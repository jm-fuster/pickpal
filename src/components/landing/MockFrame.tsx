import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * La etiqueta que dice que lo de debajo es un dibujo de la app y no la app:
 * los botones de una réplica no responden, y sin ella parecían de verdad. El
 * borde punteado es el de lo que aún no existe (estados vacíos, el panel de
 * ideas). Va dentro del `role="img"`, así que no se anuncia: el aria-label de
 * cada réplica ya empieza por «Ejemplo».
 */
export function ExampleTag({ className, children = "Ejemplo" }: { className?: string; children?: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * El marco de toda réplica de la landing: para el lector de pantalla es una
 * imagen con su descripción; por dentro, `inert` y fuera del árbol accesible,
 * así que nada de la réplica se enfoca ni se anuncia por separado. Encima, la
 * etiqueta de ejemplo (`tag`: otro texto, o `false` si la réplica la lleva
 * dentro, como el hero). Las props sueltas llevan el `reveal()` del bloque.
 */
export function MockFrame({
  label,
  tag = "Ejemplo",
  className,
  children,
  ...rest
}: {
  label: string;
  tag?: ReactNode | false;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="img" aria-label={label} data-mock className={className} {...rest}>
      {tag !== false && <ExampleTag className="mb-3 flex">{tag}</ExampleTag>}
      <div inert aria-hidden className="cursor-default">
        {children}
      </div>
    </div>
  );
}

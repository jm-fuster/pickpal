import type { HTMLAttributes, ReactNode } from "react";

/**
 * El marco de toda réplica de la landing: para el lector de pantalla es una
 * imagen con su descripción; por dentro, `inert` y fuera del árbol accesible,
 * así que nada de la réplica se enfoca ni se anuncia por separado. Las props
 * sueltas llevan el `reveal()` del bloque.
 */
export function MockFrame({
  label,
  className,
  children,
  ...rest
}: { label: string; className?: string; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="img" aria-label={label} data-mock className={className} {...rest}>
      <div inert aria-hidden className="cursor-default">
        {children}
      </div>
    </div>
  );
}

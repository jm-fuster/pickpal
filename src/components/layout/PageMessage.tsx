import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * El mensaje de una página entera que no tiene nada que enseñar (la 404, la
 * página de error). Es el aspecto del `EmptyState` centrado —icono, título,
 * texto y acciones—, sin la caja punteada, porque aquí no hay hueco que
 * llenar, y con el título como `h1`, porque es el de la página.
 */
export function PageMessage({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <Icon className="mb-3 size-9 text-muted-foreground" aria-hidden />
      <h1 className="mb-2 text-2xl font-medium">{title}</h1>
      <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">{children}</div>
    </div>
  );
}

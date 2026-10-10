import type { ReactNode } from "react";
import { Plus } from "lucide-react";

/**
 * Fila discontinua que abre un formulario en línea («Añadir evento», «Apuntar
 * algo»). También hace de marcador mientras llega el chunk del formulario en
 * la ficha de persona, así que el hueco no cambia de forma al cargar.
 */
export function AddRowButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
    >
      <Plus className="size-4" aria-hidden />
      {children}
    </button>
  );
}

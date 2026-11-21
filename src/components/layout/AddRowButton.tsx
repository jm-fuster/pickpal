import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fila discontinua que abre un formulario en línea («Añadir evento», «Apuntar
 * algo»). También hace de marcador mientras llega el chunk del formulario en
 * la ficha de persona, así que el hueco no cambia de forma al cargar.
 */
export function AddRowButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border border-dashed border-input p-3 text-sm text-foreground transition-colors hover:bg-muted/40",
        className,
      )}
    >
      <Plus className="size-4" aria-hidden />
      {children}
    </button>
  );
}

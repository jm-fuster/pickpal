"use client";

import { useId, useState, type Ref } from "react";
import { Ellipsis, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MenuAction = {
  label: string;
  onSelect: () => unknown;
  icon?: LucideIcon;
  /** Texto apagado a la derecha: la fecha de un destino, por ejemplo. */
  hint?: string;
  destructive?: boolean;
  disabled?: boolean;
};

export type MenuGroup = { heading?: string; actions: MenuAction[] };

const ITEM =
  "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted outline-hidden disabled:pointer-events-none disabled:opacity-50";

/**
 * El «⋯» de las filas y tarjetas de la ficha: editar, mover, quitar. Es el
 * mismo `Popover` que tenía el menú de las ideas guardadas, generalizado para
 * que eventos, historial, ideas y la lista recibida hablen igual. Lo
 * destructivo va al final y en rojo; cerrar el menú es parte de cada acción.
 */
export function ActionMenu({
  label,
  groups,
  className,
  triggerRef,
}: {
  /** Nombre accesible del botón: «Más acciones para Cumpleaños». */
  label: string;
  groups: MenuGroup[];
  className?: string;
  /** Para devolverle el foco al «⋯» (la cabecera, al salir de edición). */
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const baseId = useId();
  const visible = groups.filter((g) => g.actions.length > 0);

  const run = async (action: MenuAction) => {
    setBusy(true);
    try {
      await action.onSelect();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button ref={triggerRef} variant="ghost" size="icon-sm" aria-label={label} className={className} />}
      >
        <Ellipsis className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-68 gap-0.5 p-1.5">
        {visible.map((group, gi) => {
          const headingId = `${baseId}-g${gi}`;
          return (
            <div
              key={gi}
              role="group"
              aria-labelledby={group.heading ? headingId : undefined}
              className="flex flex-col gap-0.5"
            >
              {gi > 0 && <div role="separator" className="my-1 h-px bg-border/60" />}
              {group.heading && (
                <p id={headingId} className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                  {group.heading}
                </p>
              )}
              {group.actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    className={cn(ITEM, action.destructive && "gap-2 text-destructive")}
                    disabled={busy || action.disabled}
                    onClick={() => run(action)}
                  >
                    {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
                    <span className="min-w-0 flex-1 truncate">{action.label}</span>
                    {action.hint && <span className="shrink-0 text-muted-foreground">{action.hint}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

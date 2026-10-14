"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CalendarX2, PencilLine, Trash2 } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AddRowButton } from "@/components/layout/AddRowButton";
import { ActionMenu } from "@/components/people/ActionMenu";
import type { ImportantDate } from "@/components/people/ideaParts";
import { formatBudget } from "@/lib/nextOccasion";
import { formatEventDate } from "@/lib/savedIdeaGroups";

// El formulario (react-hook-form, slider, selector de fecha) va en su propio
// chunk, que la página pide en cuanto monta; mientras llega, la fila «Añadir
// evento» hace de marcador con la misma forma.
export const loadImportantDateForm = () => import("@/components/people/ImportantDateForm");
const ImportantDateForm = dynamic(
  () => loadImportantDateForm().then((m) => m.ImportantDateForm),
  { loading: () => <AddRowButton>Añadir evento</AddRowButton> },
);
const EditImportantDateInline = dynamic(() => loadImportantDateForm().then((m) => m.EditImportantDateInline));

/**
 * Las fechas de la ficha, en la columna de consulta. Filas planas: el nombre y,
 * debajo, «24 jun · 30 – 60 €». Solo se marca lo que no es lo normal: «Única»
 * en un evento de una vez; los anuales no llevan etiqueta. Editar y quitar van
 * en el «⋯» de cada fila.
 */
export function PersonEventsCard({
  personId,
  dates,
  formOpen,
  onFormOpenChange,
  onRemove,
}: {
  personId: Id<"people">;
  dates: ImportantDate[];
  /** «Añadir una fecha» en la cabecera abre este formulario. */
  formOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
  onRemove: (date: ImportantDate) => void;
}) {
  const [editing, setEditing] = useState<Id<"importantDates"> | null>(null);

  return (
    <Card id="eventos" className="scroll-mt-6 border-border/60 shadow-sm">
      <CardContent className="space-y-3 p-5">
        <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Eventos
        </h2>
        {dates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay eventos.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {dates.map((d) => {
              const budget = formatBudget(d.budgetMin, d.budgetMax);
              return (
                <li key={d._id} className="py-2.5 first:pt-0">
                  {editing === d._id ? (
                    <EditImportantDateInline date={d} onClose={() => setEditing(null)} />
                  ) : (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0 space-y-0.5">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          {d.label}
                          {d.recurring === false && (
                            <Badge variant="outline" className="gap-1 text-muted-foreground">
                              <CalendarX2 className="size-3" aria-hidden />
                              Única
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatEventDate(d)}
                          {budget && ` · ${budget}`}
                        </p>
                      </div>
                      <ActionMenu
                        label={`Más acciones para ${d.label}`}
                        groups={[
                          {
                            actions: [
                              { label: "Editar", icon: PencilLine, onSelect: () => setEditing(d._id) },
                              { label: "Quitar evento", icon: Trash2, destructive: true, onSelect: () => onRemove(d) },
                            ],
                          },
                        ]}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <ImportantDateForm personId={personId} open={formOpen} onOpenChange={onFormOpenChange} />
      </CardContent>
    </Card>
  );
}

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
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { babyNameFromLabel, showsInProfile } from "../../../convex/birth";
import { Button } from "@/components/ui/button";
import { userErrorMessage } from "@/lib/errors";

const BirthProfileSheet = dynamic(() =>
  import("@/components/people/BirthProfileSheet").then((m) => m.BirthProfileSheet),
);

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
  person,
  dates,
  formOpen,
  onFormOpenChange,
  onRemove,
}: {
  personId: Id<"people">;
  /**
   * Solo si eres el dueño: entonces, bajo un nacimiento que ya ha pasado, se
   * ofrece hacerle su ficha al bebé (`BirthProfileOffer`). Quien tiene la
   * ficha compartida no la ve: la respuesta se guarda en el evento.
   */
  person: { name: string; relationship: string } | null;
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
        <h2 className="text-base font-semibold">
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
                  {person && editing !== d._id && showsInProfile(d) && (
                    <BirthProfileOffer date={d} person={person} />
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

/**
 * Bajo un nacimiento que ya ha pasado, en la ficha de su madre o su padre
 * (opción B de `Playground · Baby profile offer`, 21-nov-2026). Es el sitio
 * fijo: sigue aquí aunque se diga «Ahora no» en la agenda; «Ahora no» aquí la
 * quita para siempre. Ver docs/design-system.md · «Ficha del bebé».
 */
function BirthProfileOffer({
  date,
  person,
}: {
  date: ImportantDate;
  person: { name: string; relationship: string };
}) {
  const answer = useMutation(api.birthOffers.answer);
  const [creating, setCreating] = useState(false);
  const babyName = babyNameFromLabel(date.label);
  return (
    <div className="mt-3 space-y-2.5 rounded-xl bg-[color-mix(in_oklab,var(--secondary)_8%,var(--card))] p-3 ring-1 ring-secondary/40">
      <p className="text-sm font-medium">
        {babyName ? `${babyName} ya ha nacido.` : "El bebé ya ha nacido."} ¿Le haces su propia ficha?
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="hover:bg-primary/80" onClick={() => setCreating(true)}>
          Hacerle su ficha
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            answer({ importantDateId: date._id, answer: "dismissed" }).catch((err) =>
              toast.error(userErrorMessage(err)),
            )
          }
        >
          Ahora no
        </Button>
      </div>
      {creating && (
        <BirthProfileSheet
          subject={{
            importantDateId: date._id,
            label: date.label,
            month: date.month,
            day: date.day,
            year: date.year!,
            personName: person.name,
            relationship: person.relationship,
            babyName,
          }}
          open
          onOpenChange={setCreating}
        />
      )}
    </div>
  );
}

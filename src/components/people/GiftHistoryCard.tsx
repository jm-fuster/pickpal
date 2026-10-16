"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, PencilLine, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { AddRowButton } from "@/components/layout/AddRowButton";
import { ActionMenu } from "@/components/people/ActionMenu";
import { REACTIONS } from "@/lib/options";
import { cn } from "@/lib/utils";

type GiftHistory = NonNullable<FunctionReturnType<typeof api.giftHistory.getByPerson>>;

export const loadGiftHistoryForm = () => import("@/components/people/GiftHistoryForm");
const GiftHistoryForm = dynamic(
  () => loadGiftHistoryForm().then((m) => m.GiftHistoryForm),
  { loading: () => <AddRowButton>Añadir regalo</AddRowButton> },
);
const EditGiftHistoryInline = dynamic(() => loadGiftHistoryForm().then((m) => m.EditGiftHistoryInline));

/**
 * El tercer nivel de la ficha: lo que ya le regalaste. Plegado en una línea
 * cuando hay algo («Ver los 2»), porque se consulta poco; la IA lo lee igual.
 * Sin nada todavía, abierto, con la fila para añadir el primero.
 */
export function GiftHistoryCard({ personId, entries }: { personId: Id<"people">; entries: GiftHistory }) {
  const [open, setOpen] = useState(entries.length === 0);
  const [editing, setEditing] = useState<Id<"giftHistory"> | null>(null);
  const removeEntry = useMutation(api.giftHistory.remove);
  const panelId = useId();
  const expanded = open || entries.length === 0;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Historial de regalos
          </h2>
          {entries.length > 0 && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {expanded ? "Ocultar" : entries.length === 1 ? "Ver el regalo" : `Ver los ${entries.length}`}
              <ChevronDown className={cn("size-3.5 motion-safe:transition-transform", expanded && "rotate-180")} aria-hidden />
            </button>
          )}
        </div>
        {expanded && (
          <div id={panelId} className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay regalos registrados. Añade el primero para que la IA aprenda qué funciona y qué no.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {entries.map((h) => {
                  const reaction = REACTIONS.find((r) => r.value === h.reaction);
                  return (
                    <li key={h._id} className="py-2.5 first:pt-0">
                      {editing === h._id ? (
                        <EditGiftHistoryInline entry={h} onClose={() => setEditing(null)} />
                      ) : (
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-medium">{h.giftName}</p>
                            <p className="text-xs text-muted-foreground">
                              {h.occasionLabel}
                              {h.year ? ` ${h.year}` : ""}
                              {reaction ? ` · ${reaction.label}` : ""}
                            </p>
                          </div>
                          <ActionMenu
                            label={`Más acciones para ${h.giftName}`}
                            groups={[
                              {
                                actions: [
                                  { label: "Editar", icon: PencilLine, onSelect: () => setEditing(h._id) },
                                  {
                                    label: "Quitar del historial",
                                    icon: Trash2,
                                    destructive: true,
                                    onSelect: async () => {
                                      try {
                                        await removeEntry({ id: h._id });
                                        toast.success("Entrada eliminada");
                                      } catch {
                                        toast.error("No se pudo eliminar la entrada");
                                      }
                                    },
                                  },
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
            <GiftHistoryForm personId={personId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

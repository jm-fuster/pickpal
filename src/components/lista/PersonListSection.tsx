"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { BookHeart, Check, Gift, X } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { AddToHistoryDialog, type HistoryValues } from "@/components/people/AddToHistoryDialog";
import { ListItemLink } from "@/components/lista/ListItemLink";
import { closestOccasionLabel } from "@/lib/dates";
import { userErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type SharedList = FunctionReturnType<typeof api.lists.forPerson>[number];
type DateLike = { label: string; month: number; day: number; year?: number; recurring?: boolean };
type Giftable = { claimId: Id<"listClaims">; title: string };

/**
 * «La lista de {nombre}» en la ficha de quien la recibe (decisión 11 de
 * docs/encargo-lista.md). Solo aparece si TÚ has asociado a esta ficha una
 * lista que te compartieron: otro invitado de la misma ficha no ve nada.
 *
 * Lleva `id="lista"` porque el email de recordatorio enlaza aquí.
 */
export function PersonListSection({
  personId,
  personName,
  dates,
}: {
  personId: Id<"people">;
  personName: string;
  dates: DateLike[];
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const ready = isLoaded && isSignedIn;
  const lists = useQuery(api.lists.forPerson, ready ? { personId } : "skip");
  const people = useQuery(api.people.getAll, ready ? {} : "skip");

  if (!lists || lists.length === 0) return null;

  return (
    <div id="lista" className="scroll-mt-6 space-y-6">
      {lists.map((list) => (
        <SharedListCard
          key={list.shareId}
          list={list}
          // Con una sola lista, el nombre de la ficha, que es como la conoces
          // tú. Con dos (raro), el de cada dueña, para distinguirlas.
          name={lists.length > 1 ? (list.ownerName ?? list.ownerEmail ?? personName) : personName}
          personId={personId}
          people={people ?? []}
          dates={dates}
        />
      ))}
    </div>
  );
}

function SharedListCard({
  list,
  name,
  personId,
  people,
  dates,
}: {
  list: SharedList;
  name: string;
  personId: Id<"people">;
  people: Array<{ _id: Id<"people">; name: string }>;
  dates: DateLike[];
}) {
  const claim = useMutation(api.lists.claim);
  const unclaim = useMutation(api.lists.unclaim);
  const acknowledgeEdit = useMutation(api.lists.acknowledgeEdit);
  const markGiven = useMutation(api.lists.markGiven);
  const associate = useMutation(api.lists.associate);
  const leave = useMutation(api.lists.leave);
  const createHistoryEntry = useMutation(api.giftHistory.create);

  const [giving, setGiving] = useState<Giftable | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      await action();
    } catch (err) {
      toast.error(userErrorMessage(err, fallback));
    }
  };

  const handleGiven = async (values: HistoryValues) => {
    if (!giving) return;
    await createHistoryEntry({
      personId,
      giftName: giving.title,
      occasionLabel: values.occasionLabel,
      year: values.year,
      reaction: values.reaction,
      notes: values.notes,
    });
    await markGiven({ claimId: giving.claimId });
  };

  const handleMove = async (target: Id<"people">) => {
    if (target === personId) return;
    try {
      await associate({ shareId: list.shareId, personId: target });
      const targetName = people.find((p) => p._id === target)?.name;
      toast.success(targetName ? `Lista movida a la ficha de ${targetName}` : "Lista movida");
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo mover la lista"));
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leave({ shareId: list.shareId });
      toast.success(`Ya no ves la lista de ${name}`);
      setConfirmLeave(false);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo dejar la lista"));
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
            <BookHeart className="size-3.5" aria-hidden />
            La lista de {name}
          </h2>
          <p className="text-xs text-muted-foreground">
            Lo que {name} ha apuntado que le haría ilusión. No ve lo que marcas.
          </p>
        </div>

        {list.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no ha apuntado nada.</p>
        ) : (
          <ul className="space-y-2">
            {list.items.map((item) => (
              <li
                key={item._id}
                className="rounded-lg border border-border/60 bg-background/60 p-3 text-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className={cn("font-medium leading-snug", item.state === "taken" && "text-muted-foreground")}>
                      {item.title}
                    </p>
                    {item.url && <ListItemLink url={item.url} />}
                    {item.note && (
                      <p className="whitespace-pre-line text-xs text-muted-foreground">{item.note}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {item.state === "free" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => run(() => claim({ itemId: item._id }), "No se pudo marcar")}
                      >
                        <Gift aria-hidden />
                        Lo regalo yo
                      </Button>
                    )}
                    {item.state === "mine" && item.claimId && (
                      <>
                        <Badge variant="secondary">Lo regalas tú</Badge>
                        <Button
                          size="sm"
                          className="hover:bg-primary/80"
                          onClick={() => setGiving({ claimId: item.claimId!, title: item.title })}
                        >
                          Ya se lo he regalado
                        </Button>
                      </>
                    )}
                    {item.state === "given" && (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <Check className="size-3" aria-hidden />
                        Regalado
                      </Badge>
                    )}
                    {(item.state === "mine" || item.state === "given") && item.claimId && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Quitar tu marca de ${item.title}`}
                        title="Quitar tu marca"
                        onClick={() => run(() => unclaim({ claimId: item.claimId! }), "No se pudo quitar la marca")}
                      >
                        <X className="size-3.5" aria-hidden />
                      </Button>
                    )}
                    {item.state === "taken" && (
                      <span className="text-xs text-muted-foreground">Ya lo regala otra persona</span>
                    )}
                  </div>
                </div>
                {item.editedSinceMark && item.claimId && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary/10 px-2.5 py-1.5 text-xs">
                    <span>{name} lo ha cambiado después de que lo marcaras.</span>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        run(() => acknowledgeEdit({ claimId: item.claimId! }), "No se pudo guardar")
                      }
                    >
                      Entendido
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {list.removed.length > 0 && (
          <ul className="space-y-2" aria-label="Marcados que ya no están en su lista">
            {list.removed.map((r) => (
              <li
                key={r.claimId}
                className="flex flex-col gap-2 rounded-lg border border-dashed border-border/70 p-3 text-sm sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium leading-snug text-muted-foreground">{r.title}</p>
                  {r.url && <ListItemLink url={r.url} />}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-muted-foreground">Ya no está en su lista</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setGiving({ claimId: r.claimId, title: r.title })}
                  >
                    Ya se lo he regalado
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar tu marca de ${r.title}`}
                    title="Quitar tu marca"
                    onClick={() => run(() => unclaim({ claimId: r.claimId }), "No se pudo quitar la marca")}
                  >
                    <X className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
          {people.length > 1 ? (
            <div className="flex items-center gap-2">
              <Label htmlFor={`lista-ficha-${list.shareId}`} className="text-xs text-muted-foreground">
                Ficha
              </Label>
              <Select value={personId} onValueChange={(v) => { if (v) handleMove(v as Id<"people">); }}>
                <SelectTrigger id={`lista-ficha-${list.shareId}`} size="sm" className="min-w-40">
                  <span>{people.find((p) => p._id === personId)?.name ?? "Esta ficha"}</span>
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <span />
          )}
          <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(true)}>
            Dejar esta lista
          </Button>
        </div>
      </CardContent>

      <AddToHistoryDialog
        key={giving?.claimId ?? "cerrado"}
        gift={giving}
        defaultOccasion={closestOccasionLabel(dates)}
        onClose={() => setGiving(null)}
        onConfirm={handleGiven}
      />

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Dejar la lista de {name}?</DialogTitle>
            <DialogDescription>
              Dejarás de verla y se quitarán tus marcas. Lo que ya pasaste al historial se
              queda. Para volver a verla, {name} tendría que invitarte otra vez.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={leaving}>Cancelar</Button>} />
            <Button variant="destructive" onClick={handleLeave} disabled={leaving}>
              {leaving ? "Saliendo…" : "Dejar la lista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

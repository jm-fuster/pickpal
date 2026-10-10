"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { BookHeart, Plus } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { RELATIONSHIPS } from "@/lib/schemas";
import { userErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type Incoming = FunctionReturnType<typeof api.lists.sharedWithMe>[number];

/**
 * Aviso de lista recibida, arriba en /agenda y /seres-queridos (decisiones 9
 * y 10 de docs/encargo-lista.md). Es el único aviso: ni email ni campana.
 *
 * Sale mientras la lista no esté asociada a una ficha que puedas ver. Después
 * de asociarla, la misma tarjeta pregunta si compartes tu lista de vuelta; esa
 * segunda pregunta solo vive en esta visita (`askingBack`), porque una lista
 * asociada ya no está pendiente y la query deja de devolverla como tal.
 *
 * `className` va al contenedor raíz y no a un `div` envolvente en la página:
 * sin listas pendientes el componente no pinta nada, y un envolvente vacío
 * seguiría ocupando un hueco del `gap` de la página.
 */
export function IncomingListsCard({ className }: { className?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const ready = isLoaded && isSignedIn;
  const shares = useQuery(api.lists.sharedWithMe, ready ? {} : "skip");
  const people = useQuery(api.people.getAll, ready ? {} : "skip");
  const [askingBack, setAskingBack] = useState<Set<string>>(new Set());

  if (!shares || !people) return null;
  const visible = shares.filter((s) => s.personId === null || askingBack.has(s.shareId));
  if (visible.length === 0) return null;

  const stopAsking = (shareId: string) =>
    setAskingBack((prev) => {
      const next = new Set(prev);
      next.delete(shareId);
      return next;
    });

  return (
    <div className={cn("space-y-3", className)}>
      {visible.map((share) => (
        <IncomingListCard
          key={share.shareId}
          share={share}
          people={people}
          askingBack={share.personId !== null}
          onAssociated={() => {
            if (!share.sharedBack) {
              setAskingBack((prev) => new Set(prev).add(share.shareId));
            }
          }}
          onDoneAskingBack={() => stopAsking(share.shareId)}
        />
      ))}
    </div>
  );
}

function IncomingListCard({
  share,
  people,
  askingBack,
  onAssociated,
  onDoneAskingBack,
}: {
  share: Incoming;
  people: Array<{ _id: Id<"people">; name: string }>;
  askingBack: boolean;
  onAssociated: () => void;
  onDoneAskingBack: () => void;
}) {
  const associate = useMutation(api.lists.associate);
  const leave = useMutation(api.lists.leave);
  const shareBack = useMutation(api.lists.shareBack);
  const createPerson = useMutation(api.people.create);

  const [chosen, setChosen] = useState<Id<"people"> | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState(share.ownerName ?? "");
  const [newRelationship, setNewRelationship] = useState("");
  const [busy, setBusy] = useState(false);

  // El nombre lo elige cada usuario en su cuenta; el email está verificado.
  // Por eso, si hay nombre, el email se enseña debajo.
  const name = share.ownerName ?? share.ownerEmail ?? "Alguien";

  const withBusy = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      toast.error(userErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const handleAssociate = (personId: Id<"people">, personName: string) =>
    withBusy(async () => {
      await associate({ shareId: share.shareId, personId });
      toast.success(`Lista guardada en la ficha de ${personName}`);
      onAssociated();
    }, "No se pudo guardar la lista en esa ficha");

  const handleCreate = () =>
    withBusy(async () => {
      const personName = newName.trim();
      const personId = await createPerson({
        name: personName,
        relationship: newRelationship,
        interests: [],
      });
      await associate({ shareId: share.shareId, personId });
      toast.success(`Ficha de ${personName} creada, con su lista`);
      onAssociated();
    }, "No se pudo crear la ficha");

  const handleDismiss = () =>
    withBusy(async () => {
      await leave({ shareId: share.shareId });
      toast.success(`Ya no verás la lista de ${name}`);
    }, "No se pudo descartar la lista");

  const handleShareBack = () =>
    withBusy(async () => {
      await shareBack({ shareId: share.shareId });
      toast.success(`${name} ya ve tu lista`);
      onDoneAskingBack();
    }, "No se pudo compartir tu lista");

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <div
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-brand-secondary"
        >
          <BookHeart className="size-5" />
        </div>

        {askingBack ? (
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <p className="font-medium">¿Compartes tu lista con {name}?</p>
              <p className="text-sm text-muted-foreground">
                Verá lo que apuntes en Mi lista. Lo que marque para regalarte, tú no lo verás.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleShareBack} disabled={busy} className="hover:bg-primary/80">
                Compartir mi lista
              </Button>
              <Button variant="ghost" onClick={onDoneAskingBack} disabled={busy}>
                Ahora no
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <p className="font-medium">{name} te ha compartido su lista.</p>
              {share.ownerName && share.ownerEmail && (
                <p className="text-xs text-muted-foreground">{share.ownerEmail}</p>
              )}
              <p className="text-sm text-muted-foreground">¿Quién es en tu libreta?</p>
            </div>

            {creating ? (
              <div className="space-y-3 rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`nueva-ficha-${share.shareId}`}>Nombre</Label>
                    <Input
                      id={`nueva-ficha-${share.shareId}`}
                      value={newName}
                      maxLength={80}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`nueva-relacion-${share.shareId}`}>Relación</Label>
                    <Select value={newRelationship} onValueChange={(v) => setNewRelationship(v ?? "")}>
                      <SelectTrigger id={`nueva-relacion-${share.shareId}`} className="w-full">
                        <span className={!newRelationship ? "text-subtle-foreground" : ""}>
                          {RELATIONSHIPS.find((r) => r.value === newRelationship)?.label ?? "Relación…"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreating(false)} disabled={busy}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={busy || !newName.trim() || !newRelationship}
                    className="hover:bg-primary/80"
                  >
                    Crear ficha
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {people.length > 0 && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={chosen ?? ""} onValueChange={(v) => setChosen((v as Id<"people">) || null)}>
                      <SelectTrigger aria-label="Elige su ficha" className="w-full sm:w-64">
                        <span className={!chosen ? "text-subtle-foreground" : ""}>
                          {people.find((p) => p._id === chosen)?.name ?? "Elige su ficha…"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {people.map((p) => (
                          <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => {
                        const person = people.find((p) => p._id === chosen);
                        if (person) handleAssociate(person._id, person.name);
                      }}
                      disabled={busy || !chosen}
                      className="hover:bg-primary/80"
                    >
                      Guardar en su ficha
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCreating(true)} disabled={busy}>
                    <Plus aria-hidden />
                    {share.ownerName ? `Crear ficha de ${share.ownerName}` : "Crear ficha nueva"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDismiss} disabled={busy}>
                    No me interesa
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

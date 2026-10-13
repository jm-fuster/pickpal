"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookHeart, Ellipsis, Plus } from "lucide-react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
} from "@/components/ui/select";
import { RELATIONSHIPS } from "@/lib/options";
import { userErrorMessage } from "@/lib/errors";
import { suggestedPerson } from "@/lib/suggestedPerson";

export type Incoming = FunctionReturnType<typeof api.lists.sharedWithMe>[number];

type Person = { _id: Id<"people">; name: string; avatarUrl?: string };

// Valor del selector que no es una ficha: abre el alta en el sitio.
const CREATE = "__crear";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

function PersonAvatar({ person }: { person: Person }) {
  return (
    <Avatar size="sm">
      {person.avatarUrl ? <AvatarImage src={person.avatarUrl} alt="" /> : null}
      <AvatarFallback>{initials(person.name)}</AvatarFallback>
    </Avatar>
  );
}

// Tarjeta de una lista recibida. Vive en su propio módulo para cargarla bajo
// demanda desde IncomingListsCard: casi nunca hay listas pendientes, y su
// formulario (Select, Input) no debe pesar en la agenda de todo el mundo.
export function IncomingListCard({
  share,
  people,
  askingBack,
  onAssociated,
  onDoneAskingBack,
}: {
  share: Incoming;
  people: Person[];
  askingBack: boolean;
  onAssociated: () => void;
  onDoneAskingBack: () => void;
}) {
  const associate = useMutation(api.lists.associate);
  const leave = useMutation(api.lists.leave);
  const leaveAndBlock = useMutation(api.lists.leaveAndBlock);
  const shareBack = useMutation(api.lists.shareBack);
  const createPerson = useMutation(api.people.create);

  const [chosen, setChosen] = useState<Id<"people"> | null>(null);
  const [creating, setCreating] = useState(false);
  // En una lista a cargo, la ficha que hay que crear es la de la persona para
  // la que es la lista (Lucía), no la de quien la lleva (Marta).
  const forName = share.forName;
  const [newName, setNewName] = useState(forName ?? share.ownerName ?? "");
  const [newRelationship, setNewRelationship] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // El nombre lo elige cada usuario en su cuenta; el email está verificado.
  // Por eso, si hay nombre, el email se enseña debajo.
  const name = share.ownerName ?? share.ownerEmail ?? "Alguien";
  const createLabel = forName
    ? `Crear ficha de ${forName}`
    : share.ownerName
      ? `Crear ficha de ${share.ownerName}`
      : "Crear ficha nueva";
  const suggested = suggestedPerson(people, forName ?? share.ownerName);
  const others = people.filter((p) => p._id !== suggested?._id);
  const chosenPerson = people.find((p) => p._id === chosen);

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

  // Quien bloquea no avisa a nadie: sus invitaciones siguientes se aceptan
  // por fuera y no le llegan (docs/security.md §11). Se deshace en Ajustes.
  const handleBlock = () =>
    withBusy(async () => {
      await leaveAndBlock({ shareId: share.shareId });
      setConfirmBlock(false);
      toast.success(`No te llegarán más listas de ${name}`);
    }, "No se pudo bloquear");

  const handleShareBack = () =>
    withBusy(async () => {
      const { emailed } = await shareBack({ shareId: share.shareId });
      toast.success(emailed ? `${name} ya ve tu lista. Le avisamos por correo.` : `${name} ya ve tu lista`);
      onDoneAskingBack();
    }, "No se pudo compartir tu lista");

  return (
    // Tinte terracota y borde a juego: es un aviso, no una fecha más de la
    // lista que tiene debajo.
    <Card className="relative bg-[color-mix(in_oklab,var(--secondary)_8%,var(--card))] shadow-sm ring-secondary/40">
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
              <p className="text-base font-semibold">¿Compartes tu lista con {name}?</p>
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
            <div className="space-y-1 pr-8">
              <p className="text-base font-semibold">
                {forName ? `${name} te ha compartido la lista de ${forName}.` : `${name} te ha compartido su lista.`}
              </p>
              {share.ownerName && share.ownerEmail && (
                <p className="text-xs text-muted-foreground">{share.ownerEmail}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {forName ? `¿Quién es ${forName} en tu libreta?` : "¿Quién es en tu libreta?"}
              </p>
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
              // Una sola pregunta, una sola respuesta: crear ficha es una opción
              // más del selector, y «Guardar» sale cuando ya hay una elegida.
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                {people.length > 0 ? (
                  <Select
                    value={chosen ?? ""}
                    onValueChange={(v) => {
                      if (v === CREATE) setCreating(true);
                      else setChosen((v as Id<"people">) || null);
                    }}
                  >
                    <SelectTrigger aria-label="Elige su ficha" className="w-full sm:w-64">
                      {chosenPerson ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <PersonAvatar person={chosenPerson} />
                          <span className="truncate">{chosenPerson.name}</span>
                        </span>
                      ) : (
                        <span className="text-subtle-foreground">Elige su ficha…</span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {suggested && (
                        <>
                          <SelectItem value={suggested._id} className="py-1.5">
                            <PersonAvatar person={suggested} />
                            <span className="truncate">{suggested.name}</span>
                            <span className="ml-auto pl-2 text-xs text-muted-foreground">Mismo nombre</span>
                          </SelectItem>
                          <SelectSeparator />
                        </>
                      )}
                      {others.map((p) => (
                        <SelectItem key={p._id} value={p._id} className="py-1.5">
                          <PersonAvatar person={p} />
                          <span className="truncate">{p.name}</span>
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                      <SelectItem value={CREATE} className="py-1.5 text-brand">
                        <span
                          aria-hidden
                          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10"
                        >
                          <Plus className="size-3.5" />
                        </span>
                        {createLabel}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Button variant="outline" onClick={() => setCreating(true)} disabled={busy}>
                    <Plus aria-hidden />
                    {createLabel}
                  </Button>
                )}
                {chosenPerson && (
                  <Button
                    onClick={() => handleAssociate(chosenPerson._id, chosenPerson.name)}
                    disabled={busy}
                    className="hover:bg-primary/80"
                  >
                    Guardar en su ficha
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start sm:self-auto"
                  onClick={handleDismiss}
                  disabled={busy}
                >
                  Descartar
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      {/* Después del contenido en el DOM, para que el tabulador llegue antes al
          selector; la posición absoluta lo deja en la esquina. Bloquear es raro
          y serio: no tiene por qué estar siempre a la vista. */}
      {!askingBack && (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Más opciones para la lista de ${name}`}
                className="absolute top-3 right-3"
              />
            }
          >
            <Ellipsis className="size-3.5" aria-hidden />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto gap-0.5 p-1.5">
            <button
              type="button"
              className="flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors outline-hidden hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-50"
              onClick={() => {
                setMenuOpen(false);
                setConfirmBlock(true);
              }}
              disabled={busy}
            >
              No quiero más listas suyas
            </button>
          </PopoverContent>
        </Popover>
      )}
      <Dialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿No quieres más listas de {name}?</DialogTitle>
            <DialogDescription>
              Dejarás de ver esta y no te llegará ninguna más, ni su correo de aviso. No se le
              avisa de nada. Puedes deshacerlo en Ajustes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={busy}>Cancelar</Button>} />
            <Button variant="destructive" onClick={handleBlock} disabled={busy}>
              No quiero más
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

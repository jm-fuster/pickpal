"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { userErrorMessage } from "@/lib/errors";

type Members = {
  isOwner: boolean;
  owner: { email: string | null };
  invitees: Array<{ clerkUserId: string; email: string | null; since: number }>;
};

/**
 * Compartir una ficha, o dejar de verla. La disclosure de qué se comparte va
 * ANTES del formulario de invitar, no en /privacidad (decisión 9 de
 * docs/dudas.md): las alergias son datos de salud (art. 9 RGPD) y quien
 * comparte tiene que verlo en el momento de decidir, no enterrado.
 */
export function ShareDialog({
  personId,
  personName,
  isOwner,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  personId: Id<"people">;
  personName: string;
  isOwner: boolean;
  /** Sin `trigger`, se abre desde fuera con `open`/`onOpenChange` (el menú «⋯» de la ficha). */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  const [members, setMembers] = useState<Members | null>(null);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const leaveShare = useMutation(api.personShares.leave);

  const loadMembers = async () => {
    try {
      const res = await fetch(`/api/people/${personId}/share`);
      const data = await res.json();
      if (res.ok) setMembers(data);
    } catch {
      // La lista de miembros es una comodidad, no crítica: si falla, el
      // formulario de invitar sigue funcionando.
    }
  };

  useEffect(() => {
    // El setState de loadMembers ocurre tras dos `await` (fetch + json), no
    // en el mismo tick que el efecto — igual que el resto de cargas async de
    // este componente. eslint no distingue eso del caso síncrono.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleInvite = async () => {
    setInviting(true);
    try {
      const res = await fetch(`/api/people/${personId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo compartir la ficha.");
        return;
      }
      toast.success("Ficha compartida");
      setEmail("");
      await loadMembers();
    } catch {
      toast.error("No se pudo compartir la ficha.");
    } finally {
      setInviting(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leaveShare({ personId });
      toast.success("Has dejado de ver esta ficha");
      setOpen(false);
      router.push("/seres-queridos");
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo desligar"));
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-4" aria-hidden />
            Compartir la ficha de {personName}
          </DialogTitle>
          <DialogDescription>
            Quien tenga acceso ve y edita la ficha entera: intereses, marcas,
            notas, tallas, <strong>alergias y restricciones</strong>, fechas,
            historial de regalos e ideas guardadas. Las alergias pueden ser un
            dato de salud — compártela solo con quien deba verlas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Con acceso
            </Label>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center justify-between gap-2">
                <span className="truncate">{members?.owner.email ?? "Quien la creó"}</span>
                <Badge variant="outline" className="shrink-0">Propietario</Badge>
              </li>
              {members?.invitees.map((inv) => (
                <li key={inv.clerkUserId} className="flex items-center justify-between gap-2">
                  <span className="truncate">{inv.email ?? "Cuenta invitada"}</span>
                  <Badge variant="secondary" className="shrink-0">Invitado</Badge>
                </li>
              ))}
            </ul>
          </div>

          {isOwner ? (
            <div className="space-y-2">
              <Label htmlFor="share-email">Compartir con (email)</Label>
              <div className="flex gap-2">
                <Input
                  id="share-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hermana@email.com"
                  onKeyDown={(e) => { if (e.key === "Enter" && email) handleInvite(); }}
                />
                <Button onClick={handleInvite} disabled={inviting || !email}>
                  {inviting ? "Compartiendo…" : "Compartir"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tiene que tener ya una cuenta en PickPal con ese email.
              </p>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-sm text-muted-foreground">
                Te han compartido esta ficha. Puedes dejar de verla cuando quieras
                — seguirá existiendo para el resto.
              </p>
              <Button variant="outline" onClick={handleLeave} disabled={leaving}>
                {leaving ? "Saliendo…" : "Dejar de ver esta ficha"}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cerrar</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

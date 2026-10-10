"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { userErrorMessage } from "@/lib/errors";

/**
 * «Quién la ve» en /mi-lista. La lista de lectores es reactiva
 * (`api.lists.myReaders`): si alguien deja tu lista, desaparece al momento.
 * Los emails viven en Clerk y se piden a `/api/lista/share` cada vez que
 * cambia quién la ve.
 *
 * El texto fijo de arriba no es decoración: las marcas que el dueño no ve son
 * lo contrario de lo que nadie espera, y sin el aviso parecería un fallo
 * (decisión 7 de docs/encargo-lista.md).
 */
export function ListReaders() {
  const { isLoaded, isSignedIn } = useAuth();
  const readers = useQuery(api.lists.myReaders, isLoaded && isSignedIn ? {} : "skip");
  const revoke = useMutation(api.lists.revoke);

  const [emails, setEmails] = useState<Record<string, string | null>>({});
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<{ shareId: Id<"listShares">; label: string } | null>(null);
  const [revoking, setRevoking] = useState(false);

  const readersKey = readers?.map((r) => r.shareId).join(",") ?? "";

  useEffect(() => {
    if (!readersKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/lista/share");
        if (!res.ok) return;
        const data: { readers: Array<{ shareId: string; email: string | null }> } = await res.json();
        if (!cancelled) {
          setEmails(Object.fromEntries(data.readers.map((r) => [r.shareId, r.email])));
        }
      } catch {
        // Los emails son una comodidad: sin ellos la lista sigue funcionando.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readersKey]);

  const handleInvite = async () => {
    setInviting(true);
    try {
      const res = await fetch("/api/lista/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo compartir tu lista.");
        return;
      }
      toast.success("Lista compartida");
      setEmail("");
    } catch {
      toast.error("No se pudo compartir tu lista.");
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async () => {
    if (!removing) return;
    setRevoking(true);
    try {
      await revoke({ shareId: removing.shareId });
      toast.success("Ya no ve tu lista");
      setRemoving(null);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo quitar el acceso"));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <Users className="size-3.5" aria-hidden />
          Quién la ve
        </h2>
        <p className="text-sm text-muted-foreground">
          Quien la lee puede marcar lo que va a regalarte. Tú no lo verás.
        </p>

        {readers === undefined ? (
          <div aria-hidden className="h-10 rounded-lg border border-dashed border-border/60 animate-pulse" />
        ) : readers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no la ve nadie.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {readers.map((r) => {
              const label = emails[r.shareId] ?? "Cuenta de PickPal";
              return (
                <li key={r.shareId} className="flex items-center justify-between gap-2">
                  <span className="truncate">{label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setRemoving({ shareId: r.shareId, label })}
                  >
                    Quitar
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="space-y-2 border-t border-border/50 pt-4">
          <Label htmlFor="lista-share-email">Compartir con (email)</Label>
          <div className="flex gap-2">
            <Input
              id="lista-share-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pareja@email.com"
              onKeyDown={(e) => {
                if (e.key === "Enter" && email) handleInvite();
              }}
            />
            <Button onClick={handleInvite} disabled={inviting || !email} className="hover:bg-primary/80">
              {inviting ? "Compartiendo…" : "Compartir"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tiene que tener ya una cuenta en PickPal con ese email.
          </p>
        </div>
      </CardContent>

      <Dialog open={removing !== null} onOpenChange={(open) => { if (!open) setRemoving(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Quitarle el acceso?</DialogTitle>
            <DialogDescription>
              {removing?.label} dejará de ver tu lista. Si cambias de idea, tendrás que
              volver a invitarle.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={revoking}>Cancelar</Button>} />
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? "Quitando…" : "Quitar acceso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

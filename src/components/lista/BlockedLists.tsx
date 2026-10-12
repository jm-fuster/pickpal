"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { userErrorMessage } from "@/lib/errors";

/**
 * «Listas que no quieres recibir», en Ajustes: las personas cuyas listas has
 * dicho que no quieres. Solo sale si hay alguna. Al desbloquear, si esa
 * persona te había vuelto a invitar entretanto, su lista aparece como una
 * lista recibida más, sin correo.
 */
export function BlockedLists() {
  const { isLoaded, isSignedIn } = useAuth();
  const blocks = useQuery(api.lists.myBlocks, isLoaded && isSignedIn ? {} : "skip");
  const unblock = useMutation(api.lists.unblock);

  if (!blocks || blocks.length === 0) return null;

  const handleUnblock = async (blockId: Id<"listBlocks">, label: string) => {
    try {
      await unblock({ blockId });
      toast.success(`Ya pueden llegarte listas de ${label}`);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo deshacer"));
    }
  };

  return (
    <section className="space-y-3 rounded-xl border p-5">
      <div className="space-y-1">
        <Label>Listas que no quieres recibir</Label>
        <p className="text-xs text-muted-foreground">
          Sus invitaciones no te llegan, y a ellos no se les avisa de nada.
        </p>
      </div>
      <ul className="space-y-1.5 text-sm">
        {blocks.map((b) => {
          const label = b.ownerName ?? b.ownerEmail ?? "Cuenta de PickPal";
          return (
            <li key={b.blockId} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">
                {label}
                {b.ownerName && b.ownerEmail && (
                  <span className="text-muted-foreground"> · {b.ownerEmail}</span>
                )}
              </span>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={() => handleUnblock(b.blockId, label)}>
                Deshacer
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

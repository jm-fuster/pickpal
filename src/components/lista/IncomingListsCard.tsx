"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

const IncomingListCard = dynamic(() =>
  import("./IncomingListCard").then((m) => m.IncomingListCard),
);

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

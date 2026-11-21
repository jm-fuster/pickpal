"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Baby } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { showsInAgenda } from "../../../convex/birth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BirthOfferSubject } from "@/components/people/BirthProfileSheet";
import { formatDayMonth } from "@/lib/dates";
import { userErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

// El formulario y el selector de fecha solo se descargan al pulsar «Hacerle su ficha».
const BirthProfileSheet = dynamic(() =>
  import("@/components/people/BirthProfileSheet").then((m) => m.BirthProfileSheet),
);

const firstName = (name: string) => name.trim().split(/\s+/)[0];

/**
 * «Ya ha nacido», arriba en /agenda (opción A de `Playground · Baby profile
 * offer`, 21-nov-2026). Cuando pasa un nacimiento apuntado en una de tus
 * fichas, ofrece hacerle su propia ficha al bebé. Es un aviso, no una fecha
 * más: el mismo tinte que «Te han compartido». Sale 60 días como mucho, y
 * «Ahora no» lo quita de aquí pero no de la ficha (`BirthProfileOffer`).
 * Ver docs/design-system.md · «Ficha del bebé».
 */
export function BirthOffersCard({ className }: { className?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const offers = useQuery(api.birthOffers.pending, isLoaded && isSignedIn ? {} : "skip");
  const answer = useMutation(api.birthOffers.answer);
  const [creating, setCreating] = useState<BirthOfferSubject | null>(null);

  const visible = (offers ?? []).filter((o) => showsInAgenda(o));
  const sheet = creating && (
    <BirthProfileSheet
      key={creating.importantDateId}
      subject={creating}
      open
      onOpenChange={(open) => !open && setCreating(null)}
    />
  );
  if (visible.length === 0) return sheet || null;

  return (
    <section aria-labelledby="ya-ha-nacido" className={cn("space-y-3", className)}>
      <h2 id="ya-ha-nacido" className="text-base font-semibold">
        Ya ha nacido
      </h2>
      {visible.map((o) => {
        const baby = o.babyName || "el bebé";
        const parent = firstName(o.personName);
        return (
          <Card
            key={o.importantDateId}
            className="bg-[color-mix(in_oklab,var(--secondary)_8%,var(--card))] shadow-sm ring-secondary/40"
          >
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
              <div
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-brand-secondary"
              >
                <Baby className="size-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="space-y-1">
                  <p className="text-base font-semibold">
                    {o.babyName ? `¿Le haces una ficha a ${o.babyName}?` : "¿Le haces una ficha al bebé?"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.label} · en la ficha de {parent} · {formatDayMonth(o.month, o.day)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Con su propia ficha te acordarás de su cumpleaños, y las ideas serán para {baby}, no
                    para {parent}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="hover:bg-primary/80" onClick={() => setCreating({ ...o, year: o.year! })}>
                    Hacerle su ficha
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      answer({ importantDateId: o.importantDateId, answer: "hidden" }).catch((err) =>
                        toast.error(userErrorMessage(err)),
                      )
                    }
                  >
                    Ahora no
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {sheet}
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ChevronDown, Gift } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { ListItemLink } from "@/components/lista/ListItemLink";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { Id } from "../../../convex/_generated/dataModel";
import { userErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

// Valor del selector para «sin ocasión»: el Select no admite un valor vacío.
const NONE = "ninguna";

/**
 * «Lo que vas a regalar»: tus marcas de «Lo regalo yo» en todas las listas que
 * te comparten, juntas. Solo las tuyas y solo para ti (`lists.myGifts`).
 *
 * Va plegada y en «Seres queridos», no en la Agenda: la Agenda es donde se
 * aterriza al entrar y donde puede asomarse quien vive contigo, que puede ser
 * justo la persona a la que le vas a regalar.
 */
export function MyGiftsCard() {
  const { isLoaded, isSignedIn } = useAuth();
  const gifts = useQuery(api.lists.myGifts, isLoaded && isSignedIn ? {} : "skip");
  const [open, setOpen] = useState(false);
  const setClaimOccasion = useMutation(api.lists.setClaimOccasion);

  const handleOccasion = async (claimId: Id<"listClaims">, value: string) => {
    try {
      await setClaimOccasion({
        claimId,
        importantDateId: value === NONE ? null : (value as Id<"importantDates">),
      });
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo guardar la ocasión"));
    }
  };

  if (!gifts || gifts.length === 0) return null;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="lo-que-vas-a-regalar"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-5 py-4 text-left"
        >
          <Gift className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Lo que vas a regalar
          </span>
          <span className="text-xs text-muted-foreground">· {gifts.length}</span>
          <ChevronDown
            className={cn("ml-auto size-4 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
        {open && (
          <ul id="lo-que-vas-a-regalar" className="space-y-2 px-5 pb-5">
            {gifts.map((g) => {
              const who = g.personName ?? g.forName ?? g.ownerName ?? g.ownerEmail ?? "Alguien";
              return (
                <li
                  key={g.claimId}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border border-border/60 bg-background/60 p-3 text-sm sm:flex-row sm:items-start sm:justify-between",
                    g.removed && "border-dashed",
                  )}
                >
                  <div className="min-w-0 space-y-1">
                    <p className={cn("font-medium leading-snug", g.removed && "text-muted-foreground")}>{g.title}</p>
                    {g.url && <ListItemLink url={g.url} />}
                    {g.removed && (
                      <p className="text-xs text-muted-foreground">
                        {g.reason === "got" ? "Ya lo tiene" : "Ya no está en su lista"}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                    {g.personId ? (
                      <Link
                        href={`/seres-queridos/${g.personId}#lista`}
                        className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        Para {who}
                      </Link>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">Para {who}</span>
                    )}
                    {/* Para qué fecha de su ficha: se propone al pasarlo al historial. */}
                    {!g.removed && g.occasions.length > 0 && (
                      <Select
                        value={g.importantDateId ?? NONE}
                        onValueChange={(v) => {
                          if (v) void handleOccasion(g.claimId, v);
                        }}
                      >
                        <SelectTrigger size="sm" aria-label={`Para qué ocasión es ${g.title}`} className="min-w-36">
                          <span className={g.occasionLabel ? "" : "text-subtle-foreground"}>
                            {g.occasionLabel ?? "Para qué ocasión…"}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Sin ocasión</SelectItem>
                          {g.occasions.map((o) => (
                            <SelectItem key={o._id} value={o._id}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

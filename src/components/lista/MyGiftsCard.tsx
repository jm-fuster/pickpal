"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ChevronDown, Gift } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { ListItemLink } from "@/components/lista/ListItemLink";
import { cn } from "@/lib/utils";

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
              const who = g.personName ?? g.ownerName ?? g.ownerEmail ?? "Alguien";
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
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

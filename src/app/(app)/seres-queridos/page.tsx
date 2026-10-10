"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Notebook, Plus } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PersonCard } from "@/components/people/PersonCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { IncomingListsCard } from "@/components/lista/IncomingListsCard";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RELATIONSHIPS } from "@/lib/schemas";

const ALL_VALUE = "all";

export default function PeoplePage() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const people = useQuery(
    api.people.getAll,
    isLoaded && isSignedIn ? {} : "skip",
  );

  const [relationshipFilter, setRelationshipFilter] = useState<string>(ALL_VALUE);

  const filteredPeople = useMemo(() => {
    if (!people) return people;
    if (relationshipFilter === ALL_VALUE) return people;
    return people.filter((p) => p.relationship === relationshipFilter);
  }, [people, relationshipFilter]);

  const filterLabel =
    relationshipFilter === ALL_VALUE
      ? "Todas las relaciones"
      : (RELATIONSHIPS.find((r) => r.value === relationshipFilter)?.label ??
        "Todas las relaciones");

  return (
    <main className="flex flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-medium">Seres queridos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quienes te importan, en una sola libreta.
          </p>
        </div>
        <Link href="/seres-queridos/new" className={buttonVariants({ size: "lg" })}>
          <Plus className="size-4" aria-hidden />
          Nueva persona
        </Link>
      </div>

      <IncomingListsCard />

      {!isLoaded || people === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" role="status">
          <span className="sr-only">Cargando seres queridos…</span>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              className="h-56 rounded-2xl border border-dashed border-border/60 animate-pulse"
            />
          ))}
        </div>
      ) : people.length === 0 ? (
        <EmptyState
          icon={Notebook}
          title="Una libreta en blanco"
          description="Empieza por alguien fácil — pareja, padres, mejor amigo. Anota sus intereses y déjanos cuidar las fechas."
          cta={
            <Link href="/seres-queridos/new" className={buttonVariants({ size: "lg" })}>
              Añadir la primera persona
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Label htmlFor="relationship-filter" className="text-xs font-sans uppercase tracking-[0.18em] text-muted-foreground">
              Filtrar
            </Label>
            <Select
              value={relationshipFilter}
              onValueChange={(v) => setRelationshipFilter(v ?? ALL_VALUE)}
            >
              <SelectTrigger id="relationship-filter" className="w-auto min-w-[180px]">
                <span>{filterLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todas las relaciones</SelectItem>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredPeople && filteredPeople.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filteredPeople.map((p) => (
                <PersonCard key={p._id} person={p} currentUserId={userId} />
              ))}
            </div>
          ) : (
            <EmptyState compact description="Nadie en esta categoría todavía." />
          )}
        </>
      )}
    </main>
  );
}

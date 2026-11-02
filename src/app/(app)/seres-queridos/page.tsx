"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Notebook, Plus } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PersonCard, type NextDate } from "@/components/people/PersonCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { IncomingListsCard } from "@/components/lista/IncomingListsCard";
import { MyGiftsCard } from "@/components/lista/MyGiftsCard";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { computeDaysUntil } from "@/lib/dates";
import { RELATIONSHIPS } from "@/lib/options";

const ALL_VALUE = "all";

// La rejilla de las tarjetas y la de su esqueleto de carga.
const GRID = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";

export default function PeoplePage() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const people = useQuery(
    api.people.getAll,
    isLoaded && isSignedIn ? {} : "skip",
  );

  // La misma consulta que la Agenda y la campana: la próxima fecha de cada
  // persona sale de aquí, en el navegador.
  const upcoming = useQuery(
    api.importantDates.getUpcoming,
    isLoaded && isSignedIn ? {} : "skip",
  );
  const nextDates = useMemo(() => {
    if (!upcoming) return undefined;
    const today = new Date();
    const byPerson = new Map<Id<"people">, NextDate>();
    for (const { date, person } of upcoming) {
      const days = computeDaysUntil(date, today);
      if (days === null) continue;
      const current = byPerson.get(person._id);
      if (!current || days < current.days) {
        byPerson.set(person._id, { label: date.label, days, month: date.month, day: date.day });
      }
    }
    return byPerson;
  }, [upcoming]);

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

      <MyGiftsCard />

      {!isLoaded || people === undefined ? (
        <div className={GRID} role="status">
          <span className="sr-only">Cargando seres queridos…</span>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              className="h-32 rounded-xl border border-dashed border-border/60 motion-safe:animate-pulse"
            />
          ))}
        </div>
      ) : people.length === 0 ? (
        <EmptyState
          icon={Notebook}
          title="Una libreta en blanco"
          description="Empieza por alguien cercano, como tu pareja o tu madre. Apunta lo que le gusta y sus fechas."
          cta={
            <Link href="/seres-queridos/new" className={buttonVariants({ size: "lg" })}>
              Añadir la primera persona
            </Link>
          }
        />
      ) : (
        <>
          <div>
            {/* El selector ya dice lo que hace («Todas las relaciones»); la etiqueta, para el lector de pantalla. */}
            <Label htmlFor="relationship-filter" className="sr-only">
              Filtrar por relación
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
            <div className={GRID}>
              {filteredPeople.map((p) => (
                <PersonCard
                  key={p._id}
                  person={p}
                  currentUserId={userId}
                  next={nextDates === undefined ? undefined : (nextDates.get(p._id) ?? null)}
                />
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

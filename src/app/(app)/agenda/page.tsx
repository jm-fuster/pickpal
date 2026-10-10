"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Coffee } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DateGroupedList } from "@/components/dashboard/DateGroupedList";
import { EmptyState } from "@/components/layout/EmptyState";
import { IncomingListsCard } from "@/components/lista/IncomingListsCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { computeDaysUntil, monthsWindowDays } from "@/lib/dates";

const WINDOW_MONTHS = 4;

// El panel de ideas solo se abre a partir de xl y tras pulsar «Ideas»; por
// debajo, la tarjeta enlaza a /gifts. Va en su propio chunk para que la agenda
// pinte antes, y se precarga en cuanto la página está lista en pantallas xl
// para que abrirlo no espere a la red.
const loadGiftsPanel = () => import("@/components/gifts/GiftsPanel");
const GiftsPanel = dynamic(() => loadGiftsPanel().then((m) => m.GiftsPanel));
const XL_QUERY = "(min-width: 80rem)";

type SelectedEvent = {
  personId: Id<"people">;
  occasion: string;
  dateId: string;
};

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const ready = isLoaded && isSignedIn;
  const upcoming = useQuery(
    api.importantDates.getUpcoming,
    ready ? {} : "skip",
  );
  const people = useQuery(api.people.getAll, ready ? {} : "skip");

  const [selected, setSelected] = useState<SelectedEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia(XL_QUERY).matches) void loadGiftsPanel();
  }, []);

  const filtered = useMemo(() => {
    if (!upcoming) return [];
    const today = new Date();
    const windowDays = monthsWindowDays(WINDOW_MONTHS, today);
    return upcoming
      .map(({ date, person }) => {
        const daysUntil = computeDaysUntil(date, today);
        return daysUntil === null ? null : { date, person, daysUntil };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null && e.daysUntil <= windowDays)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [upcoming]);

  return (
    <main className="flex flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-4xl font-medium">Agenda</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lo que llega en los próximos 4 meses.
        </p>
      </div>

      {/* Mismo ancho que la lista de fechas: a partir de xl el panel de ideas
          es fijo y empieza en left-[48.5rem], así que una tarjeta a todo el
          ancho quedaría tapada en cuanto se abren las ideas de una fecha. */}
      <IncomingListsCard className="xl:max-w-[480px] xl:px-1" />

      {!ready || upcoming === undefined ? (
        <div className="space-y-3" role="status">
          <span className="sr-only">Cargando agenda…</span>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              className="h-20 rounded-2xl border border-dashed border-border/60 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        people && people.length > 0 ? (
          <EmptyState
            icon={Coffee}
            title="Todo tranquilo"
            description="Tus seres queridos no tienen fechas en los próximos 4 meses. ¿Les falta algún evento?"
            cta={
              <Link
                href="/seres-queridos"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Ver seres queridos
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={Coffee}
            title="Empieza aquí"
            description="Añade a alguien para que la agenda cobre vida."
            cta={
              <Link
                href="/seres-queridos/new"
                className={buttonVariants({ size: "lg" })}
              >
                Añadir ser querido
              </Link>
            }
          />
        )
      ) : (
        <>
          <div className="xl:max-w-[480px] xl:px-1 xl:pb-1">
            <DateGroupedList
              entries={filtered}
              onSelect={(entry) =>
                setSelected({
                  personId: entry.person._id,
                  occasion: entry.date.label,
                  dateId: entry.date._id,
                })
              }
              selectedDateId={selected?.dateId}
            />
          </div>

          {selected && (
            <div className="hidden xl:flex flex-col fixed top-8 bottom-8 right-8 left-[48.5rem]">
              <GiftsPanel
                key={`${selected.personId}-${selected.occasion}`}
                personId={selected.personId}
                initialOccasion={selected.occasion}
                embedded
                onClose={() => setSelected(null)}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}

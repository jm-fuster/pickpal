"use client";

import Link from "next/link";
import { Bell, Gift } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { computeDaysUntil } from "@/lib/dates";

export function NotificationBell() {
  const { isLoaded, isSignedIn } = useAuth();
  const ready = isLoaded && isSignedIn;
  const upcoming = useQuery(api.importantDates.getUpcoming, ready ? {} : "skip");
  const settings = useQuery(api.settings.getMine, ready ? {} : "skip");

  const windowDays = settings?.notifyDaysBefore ?? 30;

  type UpcomingItem = NonNullable<typeof upcoming>[number] & { days: number };

  const items: UpcomingItem[] = (upcoming ?? [])
    .map((entry) => ({ ...entry, days: computeDaysUntil(entry.date) }))
    .filter((entry): entry is UpcomingItem => entry.days !== null && entry.days <= windowDays)
    .sort((a, b) => a.days - b.days);

  const count = items.length;

  return (
    <Popover>
      <PopoverTrigger
        className="relative inline-flex items-center justify-center size-8 rounded-md hover:bg-muted transition-colors"
        aria-label={
          count === 0
            ? "Notificaciones: sin fechas próximas"
            : `Notificaciones: ${count} ${count === 1 ? "fecha próxima" : "fechas próximas"}`
        }
      >
        <Bell className="size-4" aria-hidden />
        {count > 0 && (
          <Badge
            variant="default"
            className="absolute -top-1 -right-1 size-4 p-0 text-[10px] flex items-center justify-center rounded-full"
          >
            {count > 9 ? "9+" : count}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <PopoverTitle className="text-sm">Próximas fechas</PopoverTitle>
          <PopoverDescription className="text-xs">
            Próximos {windowDays} días
          </PopoverDescription>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <Gift className="size-6 opacity-40" aria-hidden />
            <p className="text-sm">Nada en los próximos {windowDays} días</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40 max-h-72 overflow-y-auto">
            {items.map(({ date, person, days }) => (
              <li key={date._id}>
                <Link
                  href={`/seres-queridos/${person._id}/gifts?occasion=${encodeURIComponent(date.label)}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors focus-visible:-outline-offset-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{person.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{date.label}</p>
                  </div>
                  <span
                    aria-label={days === 0 ? "Hoy" : days === 1 ? "Mañana" : `En ${days} días`}
                    className={[
                    "text-xs font-medium shrink-0 tabular-nums",
                    days === 0
                      ? "text-destructive"
                      : days <= 7
                        ? "text-warning"
                        : "text-muted-foreground",
                  ].join(" ")}>
                    {days === 0 ? "Hoy" : days === 1 ? "Mañana" : `${days}d`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

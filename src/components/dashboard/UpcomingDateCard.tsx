import Link from "next/link";
import { Gift } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RELATIONSHIPS } from "@/lib/options";
import type { Doc } from "../../../convex/_generated/dataModel";

interface UpcomingDateCardProps {
  person: Doc<"people">;
  date: Doc<"importantDates">;
  daysUntil: number;
  onSelect?: () => void;
  isSelected?: boolean;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

const relationshipLabel = (value: string) =>
  RELATIONSHIPS.find((r) => r.value === value)?.label ?? value;

function budgetLabel(min?: number, max?: number): string | null {
  const fmt = (v: number) => Math.round(v / 100);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)} €`;
  if (min != null) return `Desde ${fmt(min)} €`;
  if (max != null) return `Hasta ${fmt(max)} €`;
  return null;
}

export function UpcomingDateCard({
  person,
  date,
  daysUntil,
  onSelect,
  isSelected,
}: UpcomingDateCardProps) {
  const urgent = daysUntil <= 7;

  const budget =
    budgetLabel(date.budgetMin, date.budgetMax) ??
    budgetLabel(person.budgetMin, person.budgetMax);

  return (
    <Card
      className={cn(
        "transition-[border-color,box-shadow] duration-150",
        isSelected
          ? "border-primary/80 shadow-sm ring-1 ring-primary/30"
          : urgent
            ? "border-primary/60 shadow-sm"
            : "border-border/60 shadow-sm",
      )}
    >
      <CardContent className="flex items-center gap-3 p-4 sm:gap-4">
        <Link
          href={`/seres-queridos/${person._id}`}
          aria-label={`Ver ficha de ${person.name}`}
          className="shrink-0 rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Avatar className="size-12">
            {person.avatarUrl ? (
              <AvatarImage src={person.avatarUrl} alt={person.name} />
            ) : null}
            <AvatarFallback>{initials(person.name)}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            href={`/seres-queridos/${person._id}`}
            className="block font-medium truncate hover:underline transition-colors duration-150"
          >
            {person.name}
          </Link>
          <p className="text-xs text-muted-foreground truncate">
            {date.label} · {relationshipLabel(person.relationship)}
          </p>
          {budget ? (
            <p className="text-xs text-muted-foreground truncate">
              Presupuesto: {budget}
            </p>
          ) : person.notes ? (
            <p className="text-xs text-muted-foreground truncate">
              {person.notes}
            </p>
          ) : null}
        </div>

        {/* Móvil: navega a la página. Desktop: abre el panel lateral (si hay callback). */}
        <Link
          href={`/seres-queridos/${person._id}/gifts?occasion=${encodeURIComponent(date.label)}`}
          aria-label="Ideas de regalo"
          className={cn(buttonVariants({ size: "sm" }), "shrink-0", onSelect && "xl:hidden")}
        >
          <Gift className="size-4" aria-hidden />
          <span className="sm:hidden">Regalar</span>
          <span className="hidden sm:inline">Ideas de regalo</span>
        </Link>
        {onSelect && (
          <button
            onClick={onSelect}
            aria-label="Ideas de regalo"
            className={cn(buttonVariants({ size: "sm" }), "shrink-0 hidden xl:inline-flex hover:bg-primary/80")}
          >
            <Gift className="size-4" aria-hidden />
            Ideas de regalo
          </button>
        )}
      </CardContent>
    </Card>
  );
}

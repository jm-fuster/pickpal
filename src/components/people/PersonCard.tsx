import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { nextDatePhrase } from "@/lib/dates";
import { RELATIONSHIPS } from "@/lib/options";
import type { Doc } from "../../../convex/_generated/dataModel";

const relationshipLabel = (value: string) =>
  RELATIONSHIPS.find((r) => r.value === value)?.label ?? value;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

/** La fecha más cercana de la persona, ya calculada por la página. */
export type NextDate = { label: string; days: number; month: number; day: number };

/**
 * Una persona en «Seres queridos» (2-nov-2026): alineada a la izquierda, con
 * lo que de verdad sirve en esta lista, su próxima fecha. Antes era la tarjeta
 * de perfil de plantilla (avatar centrado, «INTERESES» en versalitas, una nube
 * de etiquetas y la relación en una pastilla de color en la esquina).
 */
export function PersonCard({
  person,
  currentUserId,
  next,
}: {
  person: Doc<"people">;
  // Cuando no coincide con clerkUserId, la ficha te la ha compartido otra
  // persona (convex/personShares.ts) — se marca para que no parezca tuya.
  currentUserId?: string | null;
  /** `undefined` mientras cargan las fechas; `null` si no tiene ninguna. */
  next: NextDate | null | undefined;
}) {
  const isShared = currentUserId != null && person.clerkUserId !== currentUserId;
  return (
    // min-w-0: en la rejilla, sin él la línea de gustos (truncate) ensancha la tarjeta.
    <Link href={`/seres-queridos/${person._id}`} className="block h-full min-w-0">
      <Card className="h-full border-border/60 transition-colors hover:bg-muted/40">
        <CardContent className="flex items-start gap-3 p-4">
          <Avatar className="size-12">
            {person.avatarUrl ? <AvatarImage src={person.avatarUrl} alt="" /> : null}
            <AvatarFallback>{initials(person.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2">
              <span className="truncate text-base font-medium">{person.name}</span>
              {isShared && (
                <Badge variant="outline" className="shrink-0">
                  Compartida
                </Badge>
              )}
            </p>
            <p className="text-sm text-muted-foreground">{relationshipLabel(person.relationship)}</p>
            <div className="mt-2 space-y-0.5">
              {/* Mientras cargan las fechas, la línea ocupa su sitio: la tarjeta no salta. */}
              <p className={next ? "text-sm" : "text-sm text-muted-foreground"}>
                {next === undefined
                  ? " "
                  : next
                    ? nextDatePhrase(next.label, next.days, next.month, next.day)
                    : "Sin fechas apuntadas"}
              </p>
              {person.interests.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">{person.interests.join(", ")}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

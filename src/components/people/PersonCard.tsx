import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

export function PersonCard({
  person,
  currentUserId,
}: {
  person: Doc<"people">;
  // Cuando no coincide con clerkUserId, la ficha te la ha compartido otra
  // persona (convex/personShares.ts) — se marca para que no parezca tuya.
  currentUserId?: string | null;
}) {
  const isShared = currentUserId != null && person.clerkUserId !== currentUserId;
  return (
    <Link href={`/seres-queridos/${person._id}`} className="block h-full">
      <Card className="relative h-full border-border/60 transition-all hover:bg-muted/40 hover:shadow-md hover:-translate-y-0.5">
        <div className="absolute top-3 right-3 z-10 flex flex-wrap justify-end gap-1">
          {isShared && (
            <Badge variant="outline" className="text-xs">Compartida</Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {relationshipLabel(person.relationship)}
          </Badge>
        </div>

        <CardContent className="flex flex-col items-center gap-3 p-5 pt-10">
          <Avatar className="size-16">
            {person.avatarUrl ? (
              <AvatarImage src={person.avatarUrl} alt={person.name} />
            ) : null}
            <AvatarFallback className="text-lg">
              {initials(person.name)}
            </AvatarFallback>
          </Avatar>

          <p className="font-medium text-base text-center leading-tight">
            {person.name}
          </p>

          {person.interests.length > 0 ? (
            <div className="w-full">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 text-center">
                Intereses
              </p>
              <div className="flex flex-wrap gap-1 justify-center">
                {person.interests.slice(0, 3).map((i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {i}
                  </Badge>
                ))}
                {person.interests.length > 3 ? (
                  <Badge variant="outline" className="text-xs">
                    +{person.interests.length - 3}
                  </Badge>
                ) : null}
              </div>
            </div>
          ) : null}

        </CardContent>
      </Card>
    </Link>
  );
}

"use client";

import { Fragment } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SharedListSection } from "@/components/lista/PersonListSection";
import { ListItemLink } from "@/components/lista/ListItemLink";
import { ActionMenu } from "@/components/people/ActionMenu";
import {
  IdeaStores,
  ideaOrigin,
  ideaPrice,
  ideaVisual,
  isOwnIdea,
  useIdeaMenu,
  VisualBox,
  type GiveTarget,
  type ImportantDate,
  type SavedIdea,
  type SharedList,
} from "@/components/people/ideaParts";
import { formatEventDate, groupSavedIdeas } from "@/lib/savedIdeaGroups";
import type { StoreId } from "@/lib/stores";

/**
 * El segundo nivel de la ficha: lo que todavía no has decidido. Su lista, si
 * te la ha compartido, y el resto de ideas guardadas, por ocasión. Filas
 * planas, sin cajas, para que se lea como menos importante que «Lo que tienes
 * pensado». Lo que ya sale arriba no se repite aquí. Sin nada que enseñar, la
 * tarjeta no aparece.
 */
export function MoreIdeasCard({
  personId,
  personName,
  lists,
  people,
  dates,
  personBudget,
  ideas,
  hiddenItemIds,
  favoriteStores,
  favoriteBrands,
  onGive,
}: {
  personId: Id<"people">;
  personName: string;
  lists: SharedList[];
  people: Array<{ _id: Id<"people">; name: string }>;
  dates: ImportantDate[];
  personBudget: { budgetMin?: number; budgetMax?: number };
  /** Las ideas guardadas que no están ya en «Lo que tienes pensado». */
  ideas: SavedIdea[];
  hiddenItemIds: ReadonlySet<string>;
  favoriteStores: StoreId[];
  favoriteBrands: string[];
  onGive: (target: GiveTarget) => void;
}) {
  if (lists.length === 0 && ideas.length === 0) return null;
  const groups = groupSavedIdeas(ideas, dates);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="space-y-6 p-5">
        {lists.map((list, i) => (
          <Fragment key={list.shareId}>
            {i > 0 && <hr className="border-border/60" />}
            <SharedListSection
              list={list}
              // Con una sola lista, el nombre de la ficha, que es como la conoces
              // tú. Con dos (raro), el de cada dueña, para distinguirlas.
              name={lists.length > 1 ? (list.forName ?? list.ownerName ?? list.ownerEmail ?? personName) : personName}
              personId={personId}
              people={people}
              dates={dates}
              personBudget={personBudget}
              favoriteStores={favoriteStores}
              hiddenItemIds={hiddenItemIds}
              onGive={onGive}
            />
          </Fragment>
        ))}

        {ideas.length > 0 && (
          <section aria-labelledby="otras-ideas" className={lists.length > 0 ? "space-y-4 border-t border-border/60 pt-5" : "space-y-4"}>
            <h2
              id="otras-ideas"
              className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              {lists.length > 0 ? "Otras ideas" : "Más ideas"}
            </h2>
            {groups.map((group) => {
              const key = group.kind === "none" ? "sin-ocasion" : group.event._id;
              return (
                <section key={key} aria-labelledby={`ocasion-${key}`} className="space-y-1">
                  <h3 id={`ocasion-${key}`} className="flex flex-wrap items-center gap-x-1 font-sans text-sm">
                    {group.kind === "none" ? (
                      <span className="font-medium text-muted-foreground">Sin ocasión</span>
                    ) : (
                      <>
                        <span className="font-medium">{group.event.label}</span>
                        <span className="text-muted-foreground">· {formatEventDate(group.event)}</span>
                        {group.past && (
                          <Badge variant="outline" className="ml-1 text-muted-foreground">Ya pasó</Badge>
                        )}
                      </>
                    )}
                  </h3>
                  <ul className="divide-y divide-border/60">
                    {group.ideas.map((idea) => (
                      <IdeaRow
                        key={idea._id}
                        idea={idea}
                        dates={dates}
                        favoriteStores={favoriteStores}
                        favoriteBrands={favoriteBrands}
                        onGive={onGive}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </section>
        )}
      </CardContent>
    </Card>
  );
}

function IdeaRow({
  idea,
  dates,
  favoriteStores,
  favoriteBrands,
  onGive,
}: {
  idea: SavedIdea;
  dates: ImportantDate[];
  favoriteStores: StoreId[];
  favoriteBrands: string[];
  onGive: (target: GiveTarget) => void;
}) {
  const groups = useIdeaMenu(idea, dates, onGive);
  const price = ideaPrice(idea);
  return (
    <li className="flex items-start gap-3 py-3 text-sm">
      <VisualBox visual={ideaVisual(idea)} className="size-14 shrink-0 rounded-md" iconSize="size-6" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-medium leading-snug">{idea.title}</p>
        <p className="text-xs text-muted-foreground">
          {ideaOrigin(idea)}
          {price && ` · ${price}`}
        </p>
        {isOwnIdea(idea) ? (
          <>
            {idea.url && <ListItemLink url={idea.url} />}
            {idea.description && <p className="whitespace-pre-line text-xs text-muted-foreground">{idea.description}</p>}
          </>
        ) : (
          <IdeaStores idea={idea} favoriteStores={favoriteStores} favoriteBrands={favoriteBrands} />
        )}
      </div>
      <ActionMenu label={`Más acciones para ${idea.title}`} groups={groups} className="shrink-0" />
    </li>
  );
}

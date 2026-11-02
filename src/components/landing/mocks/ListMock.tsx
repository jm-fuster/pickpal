import type { HTMLAttributes, ReactNode } from "react";
import { ChevronRight, Ellipsis, Gift, Heart, PencilLine, Plus } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MockFrame } from "@/components/landing/MockFrame";
import { beat } from "@/components/landing/motion";
import { Eyebrow, FakeButton, FakeIconButton, StackCell } from "@/components/landing/mocks/parts";
import { LIST, PERSON } from "@/components/landing/sample";
import { giftImageFor } from "@/lib/giftImages";
import { listItemImageKey } from "@/lib/listItemImage";
import { cn } from "@/lib/utils";

// La lista de Marta por sus dos lados, «Escaparate y libreta» (2-nov-2026).
// ListOwnerMock copia OwnerListView (con AboutNote y AddRowButton);
// ListReaderMock, SharedListSection dentro de MoreIdeasCard. Las piezas copian
// las clases de ShowcaseTile, ItemRow, GiftToggle y FavoriteToggle
// (src/components/lista/ListParts.tsx), sin fotos ni enlaces. Si cambian los
// originales, se cambia aquí (lista de sincronía en docs/design-system.md).

type MockProps = Omit<HTMLAttributes<HTMLDivElement>, "children">;

type ListEntry = (typeof LIST.top)[number] | (typeof LIST.rest)[number];

// Lo cogido por otra persona se pliega al final; en el ejemplo, solo la báscula.
const TAKEN = LIST.top.filter((i) => i.reader === "taken");
const READER_TOP = LIST.top.filter((i) => i.reader !== "taken");

/** La baldosa de `itemVisual`: el icono y el tinte de la categoría del título. */
function ItemVisual({ title, className, iconSize }: { title: string; className: string; iconSize: string }) {
  const v = giftImageFor(listItemImageKey(title));
  return (
    <span className={cn("flex items-center justify-center", v.container, className)}>
      <v.icon className={cn(iconSize, v.iconClass)} strokeWidth={1.5} />
    </span>
  );
}

function Tile({ item, corner, footer }: { item: ListEntry; corner?: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
      <ItemVisual title={item.title} className="h-24 w-full" iconSize="size-9" />
      <div className={cn("flex flex-col gap-1 px-3 pt-2.5", !footer && "pb-3")}>
        <p className="line-clamp-2 text-[15px] leading-snug font-medium">{item.title}</p>
        <p className="truncate text-sm text-muted-foreground">{item.price}</p>
      </div>
      {corner && <span className="absolute top-2 right-2">{corner}</span>}
      {footer && <div className="mt-auto px-3 pt-3 pb-3">{footer}</div>}
    </div>
  );
}

/** El carrusel del escaparate: en una réplica no se desliza, se corta. */
function Showcase({ children }: { children: ReactNode }) {
  return <div className="-mx-1 flex gap-3 overflow-hidden px-1">{children}</div>;
}

function Row({ item, action }: { item: ListEntry; action: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <ItemVisual title={item.title} className="size-11 shrink-0 rounded-lg" iconSize="size-5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium">{item.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.price}</p>
      </div>
      {action}
    </div>
  );
}

function GroupLabel({ favorite, muted, children }: { favorite?: boolean; muted?: boolean; children: ReactNode }) {
  return (
    <p className={cn("flex items-center gap-1.5 font-sans text-sm font-medium", muted && "text-muted-foreground")}>
      {favorite && <Heart className="size-3.5 text-brand-secondary" />}
      {children}
    </p>
  );
}

function GiftCircle() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-input bg-background">
      <Gift className="size-4" />
    </span>
  );
}

function HeartToggle({ on, overlay }: { on: boolean; overlay?: boolean }) {
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", overlay && "bg-card/90")}>
      <Heart className={cn("size-[18px]", on ? "fill-current text-brand-secondary" : "text-subtle-foreground")} />
    </span>
  );
}

/**
 * Lo que ve Marta de su propia lista. No se mueve nunca: aunque alguien marque
 * algo, en su lado no cambia nada, y eso es lo que la sección cuenta.
 */
export function ListOwnerMock(props: MockProps) {
  return (
    <MockFrame
      tag="Así la ve Marta"
      label={`Así ve Marta su propia lista: su nota, tres cosas en lo que más ilusión le haría (${LIST.top.map((i) => i.title.toLowerCase()).join(", ")}) y ${LIST.rest[0].title.toLowerCase()} en el resto, sin saber quién regala qué.`}
      {...props}
    >
      <Card className="@container shadow-sm">
        <CardContent className="space-y-5 p-5">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 font-heading text-[17px] leading-snug">«{LIST.about}»</p>
            <FakeIconButton icon={PencilLine} />
            <FakeIconButton icon={Ellipsis} />
          </div>

          <div className="flex w-full items-center gap-2 rounded-lg border border-dashed border-input/50 p-3 text-sm text-muted-foreground">
            <Plus className="size-4" />
            Apuntar algo
          </div>

          <div className="space-y-3">
            <GroupLabel favorite>
              Lo que más ilusión te haría
              <span className="font-normal text-muted-foreground">· {LIST.top.length} de 5</span>
            </GroupLabel>
            <Showcase>
              {LIST.top.map((item) => (
                <div key={item.title} className="w-44 shrink-0">
                  <Tile item={item} corner={<HeartToggle on overlay />} />
                </div>
              ))}
            </Showcase>
          </div>

          <div className="space-y-1">
            <GroupLabel muted>El resto</GroupLabel>
            {LIST.rest.map((item) => (
              <Row key={item.title} item={item} action={<HeartToggle on={false} />} />
            ))}
          </div>
        </CardContent>
      </Card>
    </MockFrame>
  );
}

/**
 * Marcar la regadera: «Lo regalo yo» se hunde y se va, y en su sitio queda el
 * badge «Lo regalas tú», el mismo de «Lo que tienes pensado». Los dos ocupan
 * la misma celda, así que la tarjeta no salta.
 */
function ClaimScene() {
  return (
    <StackCell className="grid w-full items-center">
      <FakeButton variant="outline" size="sm" className="w-full opacity-0" {...beat("press-out", 500, 900)}>
        <Gift />
        Lo regalo yo
      </FakeButton>
      <span className={badgeVariants({ variant: "secondary" })} {...beat("swap-in", 1400)}>
        Lo regalas tú
      </span>
    </StackCell>
  );
}

/** La lista de Marta tal como sale en tu ficha de ella: ahí es donde marcas. */
export function ListReaderMock(props: MockProps) {
  return (
    <MockFrame
      tag="Así la ves tú"
      label={`Así la ves tú: marcas «Lo regalo yo» en la regadera y pasa a «Lo regalas tú»; el hervidor sigue libre, el delantal está en el resto y la báscula ya la regala otra persona. Un filtro enseña las ${LIST.fitCount} cosas que encajan en lo que pensabas gastar.`}
      {...props}
    >
      <Card className="@container shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>La lista de {PERSON.name}</Eyebrow>
              <FakeIconButton icon={Ellipsis} />
            </div>
            <p className="text-xs text-muted-foreground">{PERSON.name} no ve lo que marcas.</p>
          </div>

          <p className="font-heading text-[17px] leading-snug">«{LIST.about}»</p>

          <div className="flex flex-wrap gap-2">
            <span className="h-8 rounded-full border border-primary bg-primary px-3.5 text-sm leading-[30px] text-primary-foreground">
              Todo
            </span>
            <span className="h-8 rounded-full border border-input px-3.5 text-sm leading-[30px] text-muted-foreground">
              En tu presupuesto · {LIST.fitCount}
            </span>
          </div>

          <div className="space-y-5">
            <div className="space-y-3">
              <GroupLabel favorite>Lo que más ilusión le haría</GroupLabel>
              <Showcase>
                {READER_TOP.map((item) => (
                  <div key={item.title} className="w-52 shrink-0">
                    <Tile
                      item={item}
                      footer={
                        item.reader === "claim" ? (
                          <ClaimScene />
                        ) : (
                          <FakeButton variant="outline" size="sm" className="w-full">
                            <Gift />
                            Lo regalo yo
                          </FakeButton>
                        )
                      }
                    />
                  </div>
                ))}
              </Showcase>
            </div>
            <div className="space-y-1">
              <GroupLabel muted>El resto</GroupLabel>
              {LIST.rest.map((item) => (
                <Row key={item.title} item={item} action={<GiftCircle />} />
              ))}
            </div>
          </div>

          <div className="border-t border-border/60 pt-1">
            <p className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
              <ChevronRight className="size-4" />
              Ya lo regala otra persona · {TAKEN.length}
            </p>
          </div>
        </CardContent>
      </Card>
    </MockFrame>
  );
}

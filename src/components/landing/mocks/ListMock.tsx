import type { HTMLAttributes } from "react";
import { BookHeart, ChevronDown, ClipboardPaste, Ellipsis, Gift, PencilLine, Plus } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MockFrame } from "@/components/landing/MockFrame";
import { beat } from "@/components/landing/motion";
import { Eyebrow, FakeButton, FakeIconButton, StackCell } from "@/components/landing/mocks/parts";
import { LIST, PERSON } from "@/components/landing/sample";
import { cn } from "@/lib/utils";

// La lista de Marta por sus dos lados. ListOwnerMock copia OwnerListView (con
// AboutNote y AddRowButton); ListReaderMock, SharedListSection dentro de
// MoreIdeasCard. Sin fotos, enlaces ni la línea de su cumpleaños. Si cambian
// los originales, se cambia aquí (lista de sincronía en docs/design-system.md).

type MockProps = Omit<HTMLAttributes<HTMLDivElement>, "children">;

type ListEntry = (typeof LIST.top)[number] | (typeof LIST.rest)[number];

function OwnerRow({ item }: { item: ListEntry }) {
  return (
    <li>
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/60 p-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="leading-snug font-medium">{item.title}</p>
            {/* Un p y no un span suelto: en un span, space-y no separa. */}
            <p className="text-xs text-muted-foreground">{item.price}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <FakeIconButton icon={PencilLine} />
            <FakeIconButton icon={Ellipsis} />
          </div>
        </div>
      </div>
    </li>
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
      label="Así ve Marta su propia lista: una regadera de cobre pequeña, una báscula para café con temporizador y un delantal de lona, con su precio aproximado y sin saber quién regala qué."
      {...props}
    >
      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-5">
          <Eyebrow icon={BookHeart}>Lo que te haría ilusión</Eyebrow>

          <div className="flex items-start gap-2 text-sm">
            <p className="min-w-0 flex-1 text-muted-foreground">
              <span className="text-foreground">Para quien te regala:</span> «{LIST.about}»
            </p>
            <FakeIconButton icon={PencilLine} />
          </div>

          <div className="space-y-2">
            <div className="flex w-full items-center gap-2 rounded-lg border border-dashed border-input/50 p-3 text-sm text-muted-foreground">
              <Plus className="size-4" />
              Apuntar algo
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <ClipboardPaste className="size-3.5" />
                Pegar una lista
              </span>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <p className="font-sans text-sm font-medium">Lo que más ilusión te haría</p>
              <ul className="space-y-3">
                {LIST.top.map((item) => (
                  <OwnerRow key={item.title} item={item} />
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-sans text-sm font-medium text-muted-foreground">El resto</p>
              <ul className="space-y-3">
                {LIST.rest.map((item) => (
                  <OwnerRow key={item.title} item={item} />
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </MockFrame>
  );
}

function ClaimButton(props: HTMLAttributes<HTMLSpanElement>) {
  return (
    <FakeButton variant="outline" size="sm" {...props}>
      <Gift />
      Lo regalo yo
    </FakeButton>
  );
}

/**
 * Marcar la regadera: «Lo regalo yo» se hunde y se va, y en su sitio queda
 * «Lo regalas tú» con su ⋯. Sin «· para …»: la app no lo añade hasta que
 * eliges ocasión. Alineados a la izquierda para que el botón no se estire al
 * ancho de la insignia mientras se ve.
 */
function ClaimScene() {
  return (
    <StackCell className="justify-items-start">
      <ClaimButton className="opacity-0" {...beat("press-out", 500, 900)} />
      <span className="flex items-center gap-2" {...beat("swap-in", 1400)}>
        <span className={badgeVariants({ variant: "secondary" })}>Lo regalas tú</span>
        <FakeIconButton icon={Ellipsis} />
      </span>
    </StackCell>
  );
}

// Columna o fila según el ancho de la tarjeta (@md) y no de la ventana, que
// es lo que usa la app (sm): aquí la tarjeta ocupa media pantalla.
function ReaderRow({ item }: { item: ListEntry }) {
  const taken = item.reader === "taken";
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-col gap-3 @md:flex-row @md:items-start @md:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className={cn("leading-snug font-medium", taken && "text-muted-foreground")}>{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.price}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {taken ? (
            <span className="text-xs text-muted-foreground">Ya lo regala otra persona</span>
          ) : (
            <>
              <FakeButton variant="ghost" size="sm" className="order-last text-muted-foreground @md:order-first">
                Otras tiendas
                <ChevronDown />
              </FakeButton>
              {item.reader === "claim" ? <ClaimScene /> : <ClaimButton />}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/** La lista de Marta tal como sale en tu ficha de ella: ahí es donde marcas. */
export function ListReaderMock(props: MockProps) {
  return (
    <MockFrame
      tag="Así la ves tú"
      label="Así la ves tú: marcas «Lo regalo yo» en la regadera y pasa a «Lo regalas tú»; la báscula ya la regala otra persona, y dos de sus cosas encajan en lo que pensabas gastar."
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

          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">{PERSON.name}:</span> «{LIST.about}»
          </p>
          <p className="text-sm text-muted-foreground">{LIST.fitLine}</p>

          <div className="space-y-4">
            <div className="space-y-1">
              <p className="font-sans text-sm font-medium">Lo que más ilusión le haría</p>
              <ul className="divide-y divide-border/60">
                {LIST.top.map((item) => (
                  <ReaderRow key={item.title} item={item} />
                ))}
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-sans text-sm font-medium text-muted-foreground">El resto</p>
              <ul className="divide-y divide-border/60">
                {LIST.rest.map((item) => (
                  <ReaderRow key={item.title} item={item} />
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </MockFrame>
  );
}

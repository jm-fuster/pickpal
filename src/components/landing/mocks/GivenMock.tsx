import { ChevronDown, Ellipsis, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MockFrame } from "@/components/landing/MockFrame";
import { beat, reveal, type BeatProps } from "@/components/landing/motion";
import { CompactTile, Eyebrow, FakeIconButton, OccasionCard, StackCell } from "@/components/landing/mocks/parts";
import { HISTORY, OCCASION, TILES } from "@/components/landing/sample";
import { cn } from "@/lib/utils";

// Capítulo 3, el día del cumpleaños: el ⋯ de la maceta, «Ya se lo he
// regalado», y la idea pasa al historial. Réplica de NextOccasionCard (vía
// OccasionCard), del menú de ActionMenu y de GiftHistoryCard.
// El fotograma final es el de la app: al darla, la idea guardada se borra
// (handleGiven en seres-queridos/[personId]/page.tsx), así que su casilla se
// queda vacía y la cuenta baja de 3 a 2.

const LABEL =
  "Ejemplo del día del cumpleaños: la maceta que tenías pensada pasa al historial de regalos de Marta con «Le encantó», encima de una vela aromática de Navidad que no le gustó.";

// El ITEM de ActionMenu, en un div quieto.
const ITEM = "relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm";

function MenuSeparator() {
  return <div className="my-1 h-px bg-border/60" />;
}

/**
 * El menú de la idea guardada (useIdeaMenu en ideaParts.tsx), de paso: se abre,
 * se ilumina «Ya se lo he regalado» y se cierra. Sin las otras ocasiones de
 * Marta, que llevarían fecha al lado del «Hoy», y sin «Quitar idea»: el día de
 * su cumpleaños, una papelera en rojo era lo más visible de la escena.
 */
function GiveMenu() {
  return (
    // Bajo el ⋯ de la tarjeta (64 px de cabecera + su fila), alineado a la derecha, como el Popover real.
    <div
      className="absolute top-22 right-0 z-10 flex w-52 flex-col gap-0.5 rounded-lg bg-popover p-1.5 text-sm text-popover-foreground opacity-0 shadow-sm ring-1 ring-foreground/10"
      {...beat("pass", 300, 1100)}
    >
      <div className="flex flex-col gap-0.5">
        <div className={ITEM}>
          <span className="absolute inset-0 rounded-md bg-muted" {...beat("fade", 750)} />
          <Gift className="relative size-4 shrink-0" />
          <span className="relative min-w-0 flex-1 truncate">Ya se lo he regalado</span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <MenuSeparator />
        <p className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">Mover a otra ocasión</p>
        <div className={ITEM}>
          <span className="min-w-0 flex-1 truncate">Sin ocasión</span>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <FakeIconButton icon={Ellipsis} />
    </div>
  );
}

/**
 * GiftHistoryCard abierta, con los dos regalos de Marta. `givenBeat` es la
 * entrada de la maceta, que en el capítulo 3 llega al historial; en el 4 ya
 * está y la tarjeta sale quieta.
 */
export function HistoryCard({ givenBeat, className }: { givenBeat?: BeatProps; className?: string }) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <Eyebrow>Historial de regalos</Eyebrow>
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground">
            Ocultar
            <ChevronDown className="size-3.5 rotate-180" />
          </span>
        </div>
        {/* Sin año en la línea de cada regalo (la real puede llevarlo): ninguna fecha absoluta en la escena. */}
        <ul className="divide-y divide-border/60">
          <li className="py-2.5 first:pt-0" {...givenBeat}>
            <HistoryRow title={HISTORY.given.title} meta={HISTORY.given.meta} />
          </li>
          <li className="py-2.5 first:pt-0">
            <HistoryRow title={HISTORY.earlier.title} meta={HISTORY.earlier.meta} />
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function GivenMock({ className }: { className?: string }) {
  return (
    <MockFrame label={LABEL} className={cn("mt-8", className)} {...reveal()}>
      <div className="space-y-4">
        <OccasionCard
          title={OCCASION.label}
          meta={
            <>
              <span className="font-medium text-foreground">Hoy</span> · {OCCASION.budget}
            </>
          }
          count={
            <StackCell>
              <span className="opacity-0" {...beat("blink", 0, 1600)}>
                3
              </span>
              <span {...beat("swap-in", 1600)}>2</span>
            </StackCell>
          }
        >
          <CompactTile spec={TILES[0]} />
          <CompactTile spec={TILES[1]} />
          <div className="relative">
            <CompactTile spec={TILES[2]} className="opacity-0" {...beat("blink", 0, 1600)} />
            <GiveMenu />
          </div>
        </OccasionCard>

        <HistoryCard givenBeat={beat("rise", 1600)} />
      </div>
    </MockFrame>
  );
}

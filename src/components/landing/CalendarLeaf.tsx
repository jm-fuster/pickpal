import { OCCASION, PERSON } from "@/components/landing/sample";

// La hoja de calendario que acompaña a cada capítulo de «Cómo funciona»: un
// objeto de papelería, no una pieza de la app, así que solo vive en la
// landing. La banda es terracota porque terracota es «persona», y la cifra no
// pasa de text-5xl para no competir con el H1. Las dos piezas son decorativas
// (`aria-hidden`): lo que cuentan ya lo lleva en sr-only el h3 del capítulo.

const BAND = `${OCCASION.label} de ${PERSON.name}`;

/** Desde lg, en la columna izquierda del capítulo (Story la hace sticky). */
export function CalendarLeaf({
  value,
  showCount = false,
  note,
}: {
  value: string;
  /** Con cuenta: «Faltan · 21 · días». Sin ella, solo el valor («Hoy»). */
  showCount?: boolean;
  note?: string;
}) {
  return (
    <div className="w-full max-w-[13rem] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <p className="bg-secondary px-4 py-2.5 text-xs font-medium text-secondary-foreground">{BAND}</p>
      <div className="px-4 py-6 text-center">
        {showCount ? (
          <>
            <p className="text-xs text-muted-foreground">Faltan</p>
            <p className="font-heading text-5xl leading-none font-semibold tabular-nums">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">días</p>
          </>
        ) : (
          <p className="font-heading text-5xl leading-none font-semibold">{value}</p>
        )}
        {note && <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}

/**
 * La hoja en pequeño para debajo de lg: una franja pegada arriba mientras dura
 * su capítulo. z-20 y no z-10: el menú de GivenMock lleva z-10 y, al ir
 * después en el DOM, pintaría por encima de la franja si pasa por debajo a
 * mitad de su escena.
 */
export function ChapterChip({ text }: { text: string }) {
  return (
    <div aria-hidden className="sticky top-0 z-20 -mx-4 bg-background px-4 py-2 sm:-mx-6 sm:px-6 lg:hidden">
      <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-sm font-medium shadow-sm">
        <span className="size-2 rounded-full bg-secondary" />
        {text}
      </span>
    </div>
  );
}

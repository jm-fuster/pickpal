import type { ComponentProps, ReactNode } from "react";
import { CalendarLeaf, ChapterChip } from "@/components/landing/CalendarLeaf";
import { IdeasSwitcher } from "@/components/landing/IdeasSwitcher";
import { reveal } from "@/components/landing/motion";
import { CalendarIllustration } from "@/components/landing/StepIllustrations";
import { GivenMock } from "@/components/landing/mocks/GivenMock";
import { ProfileMock } from "@/components/landing/mocks/ProfileMock";
import { RemindersMock } from "@/components/landing/mocks/RemindersMock";
import { cn } from "@/lib/utils";

// «Cómo funciona», contado con un cumpleaños: el de Marta, de 21 días antes al
// año siguiente. Cada capítulo lleva su hoja de calendario (desde lg) o su
// franja (debajo); las dos son decorativas y el lector de pantalla oye la
// cuenta al principio del h3. El texto no se mueve; solo las réplicas.

/**
 * Un capítulo. La columna de la hoja es un elemento de la rejilla y se estira
 * hasta el alto de la fila, así que la hoja, sticky dentro de ella, acompaña a
 * su capítulo y se va con él cuando entra el siguiente. Solo CSS: para que
 * funcione, nada por encima puede llevar overflow-hidden (ni auto ni scroll).
 */
function Chapter({
  chip,
  leaf,
  children,
}: {
  chip: string;
  leaf: ComponentProps<typeof CalendarLeaf>;
  children: ReactNode;
}) {
  return (
    <li className="py-10 last:pb-0 lg:grid lg:grid-cols-12 lg:gap-8 lg:py-12">
      <ChapterChip text={chip} />
      <div aria-hidden className="hidden lg:col-span-3 lg:block">
        <div className="sticky top-10" {...reveal("settle")}>
          <CalendarLeaf {...leaf} />
        </div>
      </div>
      <div className="lg:col-span-9">{children}</div>
    </li>
  );
}

/** `when` es lo que dice la hoja, para quien no la ve: va delante del título. */
function Title({ when, className, children }: { when?: string; className?: string; children: ReactNode }) {
  return (
    <h3 className={cn("text-2xl leading-tight font-medium text-pretty", className)}>
      {when && <span className="sr-only">{when} </span>}
      {children}
    </h3>
  );
}

function Para({ children }: { children: ReactNode }) {
  return <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-pretty text-muted-foreground">{children}</p>;
}

export function Story() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="historia-titulo"
      tabIndex={-1}
      className="scroll-mt-6 focus:outline-none"
    >
      {/* Arriba casi sin relleno: el pb del hero ya separa. */}
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6 lg:px-8 lg:pt-8 lg:pb-24">
        {/* Alineado con la columna del texto de los capítulos. */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="max-w-2xl lg:col-span-9 lg:col-start-4">
            <div className="w-fit" {...reveal("settle")}>
              <CalendarIllustration className="h-16 w-auto" />
            </div>
            <h2 id="historia-titulo" className="mt-4 text-3xl leading-tight font-medium text-balance lg:text-4xl">
              Cómo funciona, con el cumpleaños de Marta
            </h2>
          </div>
        </div>

        <ol className="mt-6">
          <Chapter chip="Faltan 21 días" leaf={{ value: "21", showCount: true }}>
            <Title when="Faltan 21 días.">Apuntas lo que sabes de ella</Title>
            <Para>Lo vas apuntando en su ficha cuando te enteras, y cada fecha puede llevar lo que piensas gastar.</Para>
            <ProfileMock />
          </Chapter>

          <Chapter chip="Faltan 14 días" leaf={{ value: "14", showCount: true }}>
            <Title when="Faltan 14 días.">La campana y, si quieres, un correo</Title>
            <Para>
              La campana te enseña lo que llega en los próximos 30 días. Si activas el correo, te llega con la
              antelación que elijas.
            </Para>
            <RemindersMock />

            <Title className="mt-16">Pides ideas para ella</Title>
            <Para>
              Eliges el tipo de regalo y PickPal te propone hasta nueve ideas, cada una con su precio aproximado y
              por qué le pega.
            </Para>
            {/* Lleva dentro su pie («Ideas de ejemplo para Marta»). Lo de las
                tiendas y Google lo cuenta la pregunta «¿En qué tiendas busca?». */}
            <IdeasSwitcher />
          </Chapter>

          <Chapter chip="Hoy es su cumpleaños" leaf={{ value: "Hoy" }}>
            <Title when="Hoy es su cumpleaños.">Se lo das y apuntas cómo fue</Title>
            <Para>Eliges «Ya se lo he regalado» y el regalo pasa a su historial con lo que le pareció.</Para>
            <GivenMock />
          </Chapter>

          <Chapter chip="Al año siguiente: faltan 21 días" leaf={{ value: "21", showCount: true, note: "al año siguiente" }}>
            <Title when="Al año siguiente, faltan 21 días.">Con su historial delante</Title>
            {/* «Lo que le regala cada uno cuenta»: el historial es de la ficha,
                sea quien sea quien lo apuntó (route.ts lee los diez últimos). */}
            <Para>
              Las ideas nuevas tienen en cuenta sus diez últimos regalos y cómo le sentaron. Si tu hermano usa PickPal
              y le compartes su ficha, también cuenta lo que le regala él.
            </Para>
          </Chapter>
        </ol>
      </div>
    </section>
  );
}

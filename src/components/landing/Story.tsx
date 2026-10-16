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
    <li className="py-12 last:pb-0 lg:grid lg:grid-cols-12 lg:gap-8 lg:py-16">
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
    <h3 className={cn("text-2xl leading-tight font-medium", className)}>
      {when && <span className="sr-only">{when} </span>}
      {children}
    </h3>
  );
}

function Para({ children }: { children: ReactNode }) {
  return <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground">{children}</p>;
}

export function Story() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="historia-titulo"
      tabIndex={-1}
      className="scroll-mt-6 focus:outline-none"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        {/* Alineado con la columna del texto de los capítulos. */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="max-w-2xl lg:col-span-9 lg:col-start-4">
            <div className="w-fit" {...reveal("settle")}>
              <CalendarIllustration className="h-16 w-auto" />
            </div>
            <h2 id="historia-titulo" className="mt-4 text-3xl leading-tight font-medium text-balance lg:text-4xl">
              Cómo funciona, con el cumpleaños de Marta
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Marta es un ejemplo y las pantallas imitan las de la app. Con un aniversario, un santo o Navidad
              funciona igual.
            </p>
          </div>
        </div>

        <ol className="mt-12">
          <Chapter chip="Faltan 21 días" leaf={{ value: "21", showCount: true }}>
            <Title when="Faltan 21 días.">Apuntas lo que sabes de ella</Title>
            <Para>
              Le gusta la cerámica y el café de especialidad, calza un 38 y no soporta los perfumes fuertes. Lo vas
              apuntando en su ficha cuando te enteras, no la víspera, y se guarda solo.
            </Para>
            <Para>Cada fecha lleva su presupuesto: para su cumpleaños pensabas gastar entre 30 y 60&nbsp;€.</Para>
            <ProfileMock />
          </Chapter>

          <Chapter chip="Faltan 14 días" leaf={{ value: "14", showCount: true }}>
            <Title when="Faltan 14 días.">La campana y, si quieres, un correo</Title>
            <Para>
              Al abrir PickPal ves lo que llega en los próximos cuatro meses. La campana te enseña lo más cercano:
              los próximos 30 días, o el plazo que elijas.
            </Para>
            <Para>
              El correo viene apagado. Si lo activas en Ajustes, eliges con cuánta antelación te escribe (el mismo
              día, 2 días antes, 7 días antes o 2 semanas antes), y puedes marcar más de una. Si coinciden varias
              fechas, te llega un solo correo con todas.
            </Para>
            <RemindersMock />

            <Title className="mt-16">Pides ideas para ella</Title>
            <Para>
              Desde el correo, la agenda o su ficha llegas a sus ideas con el cumpleaños ya elegido. Dices qué tipo
              de regalo buscas y PickPal te propone hasta nueve ideas a partir de su ficha y de lo que pensabas
              gastar. Cada una explica por qué le pega y cuánto puede costar, más o menos.
            </Para>
            <Para>
              Si eliges «Producto físico», cada idea trae la búsqueda hecha en las tiendas que marcaste; con los
              otros tipos, un botón para buscarla en Google. Si descartas una, la siguiente tanda para esa ocasión y
              ese tipo de regalo evita las parecidas.
            </Para>
            {/* Lleva dentro su pie («Ideas de ejemplo para la ficha de Marta…»). */}
            <IdeasSwitcher />
          </Chapter>

          <Chapter chip="Hoy es su cumpleaños" leaf={{ value: "Hoy" }}>
            <Title when="Hoy es su cumpleaños.">Se lo das y apuntas cómo fue</Title>
            <Para>
              La idea que guardaste te espera en su ficha, en «Lo que tienes pensado» para su cumpleaños. Cuando se
              la das, eliges «Ya se lo he regalado» y pasa a su historial con lo que le pareció: «Le encantó», «Le
              dio igual» o «No gustó».
            </Para>
            <GivenMock />
          </Chapter>

          <Chapter chip="Al año siguiente: faltan 21 días" leaf={{ value: "21", showCount: true, note: "al año siguiente" }}>
            <Title when="Faltan 21 días.">Al año siguiente, con su historial delante</Title>
            <Para>
              Cuando vuelvas a pedir ideas, PickPal tendrá en cuenta sus últimos diez regalos y cómo le sentaron,
              para no repetir ni volver a lo que no le gustó.
            </Para>
            <Para>
              Si tu hermano también usa PickPal, puedes compartir con él la ficha de Marta. Los dos veis y editáis
              sus gustos, fechas, historial e ideas guardadas, y lo que le regala cada uno cuenta en las ideas del
              otro. Las tandas que pide cada uno a la IA quedan en privado, y su lista solo la ve quien la recibe
              de ella.
            </Para>
          </Chapter>
        </ol>
      </div>
    </section>
  );
}

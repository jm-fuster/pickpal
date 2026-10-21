import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ALL_STORES, STORE_LABELS } from "@/lib/stores";

// La lista sale de las tiendas reales, en su orden de Ajustes. «once» va
// escrito a mano: si cambia el número, el test de la landing (ALL_STORES.length
// === 11) falla y obliga a reescribir la respuesta.
const STORE_LIST = new Intl.ListFormat("es", { type: "conjunction" }).format(
  ALL_STORES.map((s) => STORE_LABELS[s]),
);

const QUESTIONS: { q: string; a: ReactNode }[] = [
  {
    q: "¿Cuánto cuesta?",
    a: "Nada. Es un proyecto personal. De momento puedes pedir ideas diez veces al día.",
  },
  {
    q: "¿Sirve para algo más que cumpleaños?",
    a: "Sí: aniversarios, santos, Navidad o la fecha que quieras, y cada una puede llevar su presupuesto.",
  },
  {
    q: "¿De dónde salen las ideas?",
    a: (
      <>
        Se piden para una fecha concreta y las escribe una IA con la ficha de la persona, el presupuesto de esa fecha
        y los diez últimos regalos de su historial. Son orientativas. La{" "}
        <Link
          href="/privacidad"
          className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          política de privacidad
        </Link>{" "}
        explica qué datos recibe la IA.
      </>
    ),
  },
  {
    q: "¿En qué tiendas busca?",
    // Solo «Producto físico» reparte la búsqueda por tiendas
    // (GiftRecommendationCard, isPhysical); los demás tipos, también
    // «Sorpréndeme» aunque la idea sea un objeto, llevan un único botón a Google.
    a: `Las ideas de «Producto físico» se buscan en las tiendas que marques en Ajustes, de estas once: ${STORE_LIST}. Las demás, en Google.`,
  },
  {
    q: "¿Hay que instalar algo?",
    a: "No, es una web y funciona en el navegador. En Android puedes instalarla y mandar enlaces a tu lista desde el botón Compartir de otras apps.",
  },
  {
    q: "Ya tengo mi lista en otra app. ¿Empiezo de cero?",
    a: "No. Pégala y PickPal la lee en tu navegador, sea una cosa por línea, un chat de WhatsApp o una hoja de cálculo.",
  },
];

// <details> nativo: abre y cierra sin JS, y el mismo `name` hace que abrir
// una pregunta cierre la anterior. Va en la columna del texto de «Cómo
// funciona» y de «Lo que PickPal no hace», con el titular encima y no al lado:
// dos secciones seguidas con el titular en un tercio y el contenido en dos
// tercios era la maqueta de plantilla. Es la sección de consulta, así que su
// h2 es el más pequeño.
export function Faq() {
  return (
    <section aria-labelledby="preguntas-titulo">
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-24">
        <div className="lg:col-span-8 lg:col-start-4">
          <h2 id="preguntas-titulo" className="text-2xl leading-tight font-medium text-balance lg:text-3xl">
            Preguntas
          </h2>

          <div className="mt-6 divide-y divide-border/60 border-y border-border/60">
            {QUESTIONS.map(({ q, a }) => (
              <details key={q} name="faq" className="group">
                <summary className="-mx-2 flex cursor-pointer list-none items-center justify-between gap-4 rounded-md px-2 py-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                  <h3 className="text-lg leading-snug font-medium">{q}</h3>
                  <ChevronDown
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground motion-safe:transition-transform motion-safe:duration-(--dur-swap) ease-(--ease-swap) group-open:rotate-180"
                  />
                </summary>
                <div className="max-w-prose pb-5 text-sm leading-relaxed text-muted-foreground">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

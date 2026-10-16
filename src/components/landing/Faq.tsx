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
    a: "Nada. PickPal es un proyecto personal y gratuito. Está en beta, así que algunas cosas pueden cambiar, y de momento puedes pedir diez tandas de ideas al día.",
  },
  {
    q: "¿Sirve para algo más que cumpleaños?",
    a: "Sí. Cada fecha lleva el nombre que tú le pongas, sea un aniversario, un santo o Navidad, y su propio presupuesto. Puede repetirse todos los años o ser una sola vez.",
  },
  {
    q: "¿De dónde salen las ideas?",
    // Los enlaces no son siempre búsquedas: el botón de una marca favorita
    // puede abrir su portada (BrandStoreLink). Lo que vale para todos es que
    // ninguno lleva a un producto concreto.
    a: (
      <>
        Las escribe una IA a partir de la ficha de esa persona, del presupuesto de la fecha y de lo que ya le
        regalaste. Son orientativas: los precios son aproximados y los enlaces te llevan a buscarlas, no a un
        producto concreto. En la{" "}
        <Link
          href="/privacidad"
          className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          política de privacidad
        </Link>{" "}
        tienes qué datos recibe y cuándo.
      </>
    ),
  },
  {
    q: "¿En qué tiendas busca?",
    // Solo «Producto físico» reparte la búsqueda por tiendas
    // (GiftRecommendationCard, isPhysical); los demás tipos, también
    // «Sorpréndeme» aunque la idea sea un objeto, llevan un único botón a Google.
    a: `Las ideas de «Producto físico» se buscan en las que marques en Ajustes, de estas once: ${STORE_LIST}. Al empezar están todas marcadas. Las demás, también las de «Sorpréndeme», se buscan en Google.`,
  },
  {
    q: "¿Hay que instalar algo?",
    a: "No. PickPal es una web y funciona en el navegador del móvil y del ordenador. En Android puedes instalarla y mandar enlaces a tu lista desde el botón Compartir de otras apps.",
  },
  {
    q: "Ya tengo mi lista en otra app. ¿Empiezo de cero?",
    a: "No. Pégala y PickPal la lee en tu navegador: una cosa por línea, Markdown, un chat de WhatsApp o filas de una hoja de cálculo. También puedes subir un archivo .csv, .tsv o .txt.",
  },
];

// <details> nativo: abre y cierra sin JS, y el mismo `name` hace que abrir
// una pregunta cierre la anterior.
export function Faq() {
  return (
    <section aria-labelledby="preguntas-titulo">
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-24">
        <div className="lg:col-span-4">
          <h2 id="preguntas-titulo" className="text-3xl leading-tight font-medium text-balance lg:text-4xl">
            Preguntas
          </h2>
        </div>

        <div className="mt-8 lg:col-span-8 lg:mt-0">
          <div className="divide-y divide-border/60 border-y border-border/60">
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

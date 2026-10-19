import { reveal } from "@/components/landing/motion";
import { NotebookIllustration } from "@/components/landing/StepIllustrations";

type Claim = { claim: string; detail?: string };

// Cada frase está comprobada contra el código y contra /privacidad y
// /terminos. Si cambia lo que hace la app, se cambia aquí en el mismo commit:
// esta sección promete, no adorna. Una línea por promesa; el detalle, solo
// cuando sin él la frase se lee más fuerte de lo que es.
//
// La de la IA va sola y en grande, como titular de la sección: es la que más
// pesa, y en una rejilla de seis pesaba lo mismo que «No vende nada». «No da
// ideas sin una fecha» pasó a la pregunta «¿De dónde salen las ideas?»: aquí
// se leía como una pega.
// Espacios duros en «a la IA»: en dos líneas, el titular partía «a la / IA».
const LEAD: Required<Claim> = {
  claim: "No le enseña a la IA toda tu libreta.",
  detail: "Solo la ficha de la persona para la que pides ideas, y solo cuando pulsas el botón.",
};

const CLAIMS: Claim[] = [
  { claim: "No publica tu lista.", detail: "La ven las personas que invitas." },
  // «Recordatorios» y no «avisos»: el correo de una lista compartida llega sin
  // pasar por ese interruptor (convex/emails.ts).
  { claim: "No te manda recordatorios por correo si no los activas." },
  { claim: "No usa cookies de publicidad ni de seguimiento." },
  // No «sus enlaces son búsquedas»: el botón de una marca puede abrir su
  // portada (BrandStoreLink). Lo que vale para todos es que no vende nada.
  { claim: "No vende nada.", detail: "El precio de verdad lo ves donde lo compres." },
];

/**
 * Lo que PickPal no hace. La libreta del pictograma es la del titular, así que
 * va al margen, en la columna de las hojas de calendario de «Cómo funciona»,
 * y no encima del h2.
 */
export function TrustSection() {
  return (
    <section aria-labelledby="no-hace-titulo" className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-32">
        <div className="lg:col-span-3">
          <div className="w-fit" {...reveal("settle")}>
            <NotebookIllustration className="h-16 w-auto lg:h-24" />
          </div>
        </div>

        <div className="mt-6 lg:col-span-9 lg:mt-0">
          <h2
            id="no-hace-titulo"
            className="max-w-[16em] text-3xl leading-tight font-medium text-balance sm:text-4xl lg:text-5xl"
          >
            {LEAD.claim}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {LEAD.detail}
          </p>

          <ul className="mt-12 grid gap-x-10 gap-y-6 border-t border-border/60 pt-8 sm:grid-cols-2">
            {CLAIMS.map(({ claim, detail }) => (
              <li key={claim}>
                <p className="font-medium text-pretty">{claim}</p>
                {detail && <p className="mt-1 text-sm leading-relaxed text-pretty text-muted-foreground">{detail}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-sm text-muted-foreground">
            Puedes descargar tus datos o cerrar tu cuenta desde Ajustes cuando quieras.
          </p>
        </div>
      </div>
    </section>
  );
}

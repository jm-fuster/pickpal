import { reveal } from "@/components/landing/motion";
import { NotebookIllustration } from "@/components/landing/StepIllustrations";

type Claim = { claim: string; detail?: string };

// Cada frase está comprobada contra el código y contra /privacidad y
// /terminos. Si cambia lo que hace la app, se cambia aquí en el mismo commit:
// esta sección promete, no adorna. Una línea por promesa; el detalle, solo
// cuando sin él la frase se lee más fuerte de lo que es.
const CLAIMS: Claim[] = [
  {
    claim: "No le enseña a la IA toda tu libreta.",
    detail: "Solo la ficha de la persona para la que pides ideas, al pulsar el botón.",
  },
  { claim: "No da ideas sin una fecha." },
  { claim: "No publica tu lista.", detail: "La ven las personas que invitas." },
  // «Recordatorios» y no «avisos»: el correo de una lista compartida llega sin
  // pasar por ese interruptor (convex/emails.ts).
  { claim: "No te manda recordatorios por correo si no los activas." },
  { claim: "No usa cookies de publicidad ni de seguimiento." },
  // No «sus enlaces son búsquedas»: el botón de una marca puede abrir su
  // portada (BrandStoreLink). Lo que vale para todos es que no vende nada.
  { claim: "No vende nada.", detail: "El precio de verdad lo ves donde lo compres." },
];

export function TrustSection() {
  return (
    <section aria-labelledby="no-hace-titulo" className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-24">
        <div className="lg:col-span-4">
          <div className="w-fit" {...reveal("settle")}>
            <NotebookIllustration className="h-16 w-auto" />
          </div>
          <h2 id="no-hace-titulo" className="mt-4 text-3xl leading-tight font-medium text-balance lg:text-4xl">
            Lo que PickPal no hace
          </h2>
        </div>

        <div className="mt-10 lg:col-span-8 lg:mt-0">
          <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
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

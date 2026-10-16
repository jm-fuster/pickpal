import { reveal } from "@/components/landing/motion";
import { NotebookIllustration } from "@/components/landing/StepIllustrations";

type Claim = { claim: string; proof: string };

// Cada frase está comprobada contra el código y contra /privacidad y
// /terminos (tabla «Claim → source» de la spec). Si cambia lo que hace la
// app, se cambia aquí en el mismo commit: esta sección promete, no adorna.
const GROUPS: { title: string; items: Claim[] }[] = [
  {
    title: "Con tus datos",
    items: [
      {
        // La prueba dice para qué sirve, no qué guarda: también se guardan las
        // tandas de ideas, los contadores del límite diario y el registro de
        // correos enviados (convex/schema.ts), y /privacidad los enumera.
        claim: "No usa lo que apuntas para nada más.",
        proof: "Lo que apuntas sirve para tus avisos, para las ideas que pides y para lo que decides compartir.",
      },
      {
        claim: "No abre los enlaces que apuntas.",
        proof:
          "Solo los guarda. Y una lista pegada se lee en tu navegador: a PickPal solo llega lo que eliges apuntar.",
      },
      {
        claim: "No publica tu lista.",
        proof:
          "No tiene enlace público. La ven las personas que invitas por email, y puedes quitarles el acceso cuando quieras.",
      },
      {
        claim: "No usa cookies de publicidad ni de seguimiento.",
        proof: "Solo las necesarias para mantener tu sesión iniciada.",
      },
    ],
  },
  {
    title: "Con las ideas y los avisos",
    items: [
      {
        claim: "No da ideas sin una fecha.",
        proof: "Siempre se piden para una ocasión concreta.",
      },
      {
        claim: "No le enseña a la IA toda tu libreta.",
        proof:
          "Solo la ficha de la persona para la que pides ideas, con su nombre de pila, y solo cuando pulsas el botón.",
      },
      {
        // No «una búsqueda en la tienda»: las ideas que no son para comprar
        // buscan en Google y el botón de una marca puede abrir su portada
        // (BrandStoreLink), así que se dice lo que vale para todos los enlaces.
        claim: "No es una tienda.",
        proof:
          "Sus enlaces te llevan a buscar la idea en otras webs, como las tiendas que elijas, y el precio de verdad lo ves allí.",
      },
      {
        // «Recordatorios» y no «avisos»: el correo de una lista compartida
        // llega sin pasar por ese interruptor (convex/emails.ts).
        claim: "No te manda recordatorios por correo si no los activas.",
        proof: "Vienen apagados, y cada uno dice cómo quitarlos.",
      },
    ],
  },
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
          <div className="grid gap-10 sm:grid-cols-2">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="font-sans text-sm font-medium text-muted-foreground">{group.title}</h3>
                <ul className="mt-4 space-y-5">
                  {group.items.map(({ claim, proof }) => (
                    <li key={claim}>
                      <p className="font-medium">{claim}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{proof}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm text-muted-foreground">
            Desde Ajustes puedes descargar tus datos o cerrar tu cuenta cuando quieras.
          </p>
        </div>
      </div>
    </section>
  );
}

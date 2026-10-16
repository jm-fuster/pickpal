import type { HTMLAttributes } from "react";
import { Check, Gift } from "lucide-react";
import { LogoMark } from "@/components/ui/LogoMark";
import { MockFrame } from "@/components/landing/MockFrame";
import { beat, reveal } from "@/components/landing/motion";
import { EMAIL, OCCASION, PERSON } from "@/components/landing/sample";
import { PersonAvatar, StackCell } from "@/components/landing/mocks/parts";
import { cn } from "@/lib/utils";

// Capítulo 2a: el bloque de correo de Ajustes (settings/page.tsx) y el correo
// que manda convex/emails.ts. La escena es la que hace quien lo activa: se
// enciende el interruptor, aparecen las antelaciones con «2 semanas antes»
// ya marcada (el valor por defecto, [14]), marca «2 días antes» y llega el
// correo. El correo copia estructura y textos; los colores van en tokens,
// porque los hex del real no pasan AA (blanco sobre #F1704B, 2,93:1).

const LABEL =
  "Ejemplo de aviso por correo: en Ajustes está activado para dos semanas y dos días antes, y el correo que llega 14 días antes del cumpleaños de Marta trae el botón «Ideas para Marta».";

/** Las cuatro antelaciones de Ajustes (EMAIL_LEAD_OPTIONS), en su orden. */
const LEADS: { label: string; state: "off" | "on" | "turning-on" }[] = [
  { label: "El mismo día", state: "off" },
  { label: "2 días antes", state: "turning-on" },
  { label: "7 días antes", state: "off" },
  { label: "2 semanas antes", state: "on" },
];

// El checkbox nativo (`size-4 rounded accent-primary`) dibujado en spans.
function EmptyBox() {
  return <span className="size-4 shrink-0 rounded-[4px] border border-input bg-background" />;
}

function CheckedBox(props: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className="grid size-4 shrink-0 place-items-center rounded-[4px] bg-primary text-primary-foreground"
      {...props}
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}

function LeadRow({ label, state }: (typeof LEADS)[number]) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        state === "on" ? "border-border bg-muted" : "border-border/50",
      )}
    >
      {state === "turning-on" && (
        <>
          {/* -inset-px: tapa también el borde de la fila, así el estado
              final es idéntico al de una fila marcada. */}
          <span className="absolute -inset-px rounded-lg border border-border bg-muted" {...beat("fade", 1100)} />
          <StackCell className="relative shrink-0">
            <EmptyBox />
            <CheckedBox {...beat("pop", 1100)} />
          </StackCell>
        </>
      )}
      {state === "on" && <CheckedBox />}
      {state === "off" && <EmptyBox />}
      <span className="relative font-medium">{label}</span>
    </div>
  );
}

const [footerBefore, footerAfter] = EMAIL.footer.split("ajustes");

export function RemindersMock({ className }: { className?: string }) {
  return (
    <MockFrame label={LABEL} className={cn("mt-8", className)} {...reveal()}>
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        {/* Ajustes · Notificaciones por correo. Sin la línea «Los avisos
            llegarán a…», que llevaría un email, ni la ayuda «Recibirás un
            correo cada vez…», que ya cuenta el capítulo. */}
        <div className="@container space-y-3 rounded-xl border bg-background p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm leading-none font-medium">Notificaciones por correo</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recibe un email cuando se acerquen tus eventos importantes.
              </p>
            </div>
            {/* El Switch encendido. Apagado debajo (bg-input, disco a la
                izquierda); el verde se funde y el disco se desliza. */}
            <span className="relative inline-flex h-5 w-8 shrink-0 items-center rounded-full border border-transparent bg-input">
              <span className="absolute -inset-px rounded-full bg-primary" {...beat("fade", 400)} />
              <span
                className="relative block size-4 translate-x-[calc(100%-2px)] rounded-full bg-primary-foreground"
                {...beat("slide", 400)}
              />
            </span>
          </div>

          <div className="space-y-2 pt-1" {...beat("rise", 600)}>
            <p className="text-sm leading-none font-medium">Cuándo enviarte el correo</p>
            {/* @sm y no sm: la rejilla responde al ancho de la réplica. */}
            <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2">
              {LEADS.map((lead) => (
                <LeadRow key={lead.label} {...lead} />
              ))}
            </div>
          </div>
        </div>

        {/* El correo del día 14. Sin la fecha («· 12/11») junto a la cuenta atrás. */}
        <div {...beat("rise", 1300)}>
          <p className="mb-2 text-xs text-muted-foreground">Asunto: {EMAIL.subject}</p>
          <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-foreground/10">
            <div className="flex items-center gap-3 bg-primary px-5 py-4 text-primary-foreground">
              <LogoMark className="size-7" />
              <div>
                <p className="text-base font-semibold">PickPal</p>
                <p className="text-xs">Recordatorio de evento</p>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">Tienes un evento próximo:</p>
              <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3">
                {/* El correo real pinta el avatar como fondo de un círculo de 44 px
                    (avatarHtml en convex/emails.ts). */}
                <PersonAvatar src={PERSON.avatar} className="size-11" />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{PERSON.name}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{OCCASION.label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-brand-secondary">{EMAIL.when}</p>
                </div>
              </div>
              <div className="pt-2 text-center">
                <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-secondary px-5 text-sm font-semibold text-secondary-foreground">
                  <Gift className="size-4" />
                  {EMAIL.cta}
                </span>
              </div>
            </div>
            <p className="border-t border-border/60 px-5 py-3 text-xs leading-relaxed text-muted-foreground">
              {footerBefore}
              <span className="underline">ajustes</span>
              {footerAfter}
            </p>
          </div>
        </div>
      </div>
    </MockFrame>
  );
}

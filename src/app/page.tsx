import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/ui/LogoMark";
import {
  GiftIdeasIllustration,
  LovedOnesIllustration,
  RemindersIllustration,
} from "@/components/landing/StepIllustrations";

const STEPS: {
  number: number;
  title: string;
  body: string;
  illustration: ReactNode;
}[] = [
  {
    number: 1,
    title: "Añade a tus seres queridos",
    body: "Sus gustos, notas, tallas y sus eventos, cada ocasión con su presupuesto.",
    illustration: <LovedOnesIllustration className="h-20 w-auto" />,
  },
  {
    number: 2,
    title: "Dile cuándo avisarte",
    body: "Elige con cuántos días de antelación quieres el aviso.",
    illustration: <RemindersIllustration className="h-20 w-auto" />,
  },
  {
    number: 3,
    title: "Genera nueve ideas",
    body: "Un botón. Nueve sugerencias adaptadas a esa persona, a la ocasión y a tu presupuesto.",
    illustration: <GiftIdeasIllustration className="h-20 w-auto" />,
  },
];

// Quien ya tiene sesión no llega a ver esto: src/proxy.ts lo manda a la
// agenda antes de servir la página, que así puede ser estática.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <span className="text-lg font-medium tracking-tight flex items-center gap-2">
          <LogoMark className="size-7" />
          PickPal
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-16 px-6 py-16">
        <section className="space-y-6 max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-medium leading-[1.05] tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl">
            El regalo perfecto para quien más te importa.
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Guarda lo que sabes de cada persona, activa los avisos y deja que la IA piense contigo cuando llegue el momento.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-3">
            <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
              Empezar gratis
            </Link>
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              Iniciar sesión
            </Link>
          </div>
        </section>

        <section className="grid w-full max-w-5xl gap-4 grid-cols-1 sm:grid-cols-3">
          {STEPS.map(({ number, title, body, illustration }, index) => (
            <Card key={title} className="border-border/60 shadow-sm">
              <CardContent className="space-y-4 p-6">
                <div
                  className="flex h-24 items-center justify-center animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  {illustration}
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-2xs font-semibold text-secondary-foreground">
                    {number}
                  </span>
                  <h2 className="text-xl font-medium">{title}</h2>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="flex items-center justify-center gap-4 px-6 py-8 text-xs text-muted-foreground">
        <Link href="/privacidad" className="hover:text-foreground">
          Privacidad
        </Link>
        <Link href="/terminos" className="hover:text-foreground">
          Términos
        </Link>
      </footer>
    </div>
  );
}

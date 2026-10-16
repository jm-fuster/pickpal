"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

// Mensajes de paso que acompañan la espera. No reflejan fases reales del
// servidor (la POST es una sola llamada bloqueante sin eventos de progreso):
// son una narración que tranquiliza y comunica que el trabajo está en marcha.
const STEPS = [
  "Repasando sus intereses, notas y gustos…",
  "Pensando ideas que encajen con la ocasión…",
  "Ajustando todo a tu presupuesto…",
  "Buscando fotos y tiendas para cada idea…",
  "Dando los últimos retoques…",
];

/**
 * Barra de progreso para la generación de ideas. No existe progreso real que
 * leer (Gemini + Pexels + Brandfetch en serie, ~10-20s, sin streaming), así que
 * el avance es simulado con easing asintótico hacia un tope < 100 %: corre al
 * principio y se frena cerca del final para nunca afirmar que ha terminado
 * antes de tiempo. La señal real de "listo" es la aparición de las cards, que
 * desmontan este componente. Decorativo para lectores: el estado de carga se
 * anuncia en el `aria-live` del panel padre.
 */
export function GenerationProgress({ regenerate = false }: { regenerate?: boolean }) {
  const [progress, setProgress] = useState(6);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => (p >= 93 ? p : p + (93 - p) * 0.055));
    }, 240);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s >= STEPS.length - 1 ? s : s + 1));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden
      className="rounded-2xl border border-border/70 bg-card/40 p-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
    >
      <div className="mb-4 flex items-center gap-3">
        <Sparkles className="size-5 shrink-0 text-brand motion-safe:animate-pulse" />
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight">
            {regenerate ? "Regenerando ideas…" : "Generando 9 ideas…"}
          </p>
          <p className="truncate text-sm text-muted-foreground">{STEPS[step]}</p>
        </div>
        <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary/15">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Suele tardar unos segundos. Puedes esperar aquí, está todo en marcha.
      </p>
    </div>
  );
}

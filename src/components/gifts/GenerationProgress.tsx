import { LoaderCircle } from "lucide-react";

/**
 * La espera mientras se generan las ideas. No hay progreso real que leer
 * (Gemini, Pexels y Brandfetch en serie, unos 10-20 s, sin streaming), así que
 * no se finge ninguno: ni porcentaje ni fases con temporizador. Una línea de
 * estado con el aro de los avisos de carga y la cifra real de espera; lo que
 * se mueve además son las tarjetas fantasma de debajo (`GiftsPanel`), que
 * respiran una tras otra. Hasta el 3-nov-2026 era una barra indeterminada de
 * 8 px dentro de una tarjeta: parecía de juguete. La señal real de "listo" es
 * la aparición de las cards, que desmontan este componente. Decorativo para
 * lectores: el estado de carga se anuncia en el `aria-live` del panel padre.
 */
export function GenerationProgress({ regenerate = false }: { regenerate?: boolean }) {
  return (
    <div
      aria-hidden
      className="flex items-start gap-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-(--dur-swap)"
    >
      {/* Gira también con movimiento reducido, como el de sonner: quieto no
          diría que algo está en marcha. */}
      <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
      <p className="text-sm leading-snug-alt">
        <span className="font-medium">{regenerate ? "Regenerando las ideas." : "Generando 9 ideas."}</span>{" "}
        <span className="text-muted-foreground">Suele tardar entre 10 y 20 segundos.</span>
      </p>
    </div>
  );
}

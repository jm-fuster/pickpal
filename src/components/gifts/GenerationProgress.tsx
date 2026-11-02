/**
 * La espera mientras se generan las ideas. No hay progreso real que leer
 * (Gemini, Pexels y Brandfetch en serie, unos 10-20 s, sin streaming), así que
 * no se finge ninguno: ni porcentaje ni fases con temporizador. La barra es
 * indeterminada, un tramo que se desliza (quieto con movimiento reducido), y
 * la frase de abajo dice cuánto suele tardar. La señal real de "listo" es la
 * aparición de las cards, que desmontan este componente. Decorativo para
 * lectores: el estado de carga se anuncia en el `aria-live` del panel padre.
 */
export function GenerationProgress({ regenerate = false }: { regenerate?: boolean }) {
  return (
    <div
      aria-hidden
      className="rounded-2xl border border-border/70 bg-card/40 p-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
    >
      <div className="mb-4">
        <p className="font-medium leading-tight">
          {regenerate ? "Regenerando ideas…" : "Generando 9 ideas…"}
        </p>
        <p className="text-sm text-muted-foreground">Suele tardar entre 10 y 20 segundos.</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary/15">
        {/* 30 % de ancho; quieto, centrado (35 % de la pista = 117 % de sí mismo). */}
        <div className="h-full w-[30%] translate-x-[117%] rounded-full bg-primary motion-safe:animate-indeterminate" />
      </div>
    </div>
  );
}

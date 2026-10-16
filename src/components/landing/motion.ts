import type { CSSProperties } from "react";

// Atributos que lee src/app/landing.css. Ni efectos ni estado: los compases
// los anima el CSS y los revelados los arma RevealRoot.

export type Beat = "rise" | "settle" | "pop" | "swap-in" | "fade" | "grow" | "slide" | "blink" | "pass" | "press-out";

/** Un compás de escena: qué hace, en qué ms empieza y, si no es la de su tipo, cuánto dura. */
export function beat(name: Beat, at: number, dur?: number) {
  const style: Record<string, string> = { "--landing-at": `${at}ms` };
  if (dur !== undefined) style["--landing-dur"] = `${dur}ms`;
  return { "data-beat": name, style: style as CSSProperties };
}

/** Lo que devuelve `beat()`, para las props que lo reciben y lo reparten. */
export type BeatProps = ReturnType<typeof beat>;

/** Bloque que aparece al entrar en pantalla (lo arma RevealRoot). `i` = posición en un escalonado de 120 ms. */
export function reveal(kind: "rise" | "settle" = "rise", i = 0) {
  return { "data-reveal": kind === "settle" ? "settle" : "", style: { "--landing-i": i } as CSSProperties };
}

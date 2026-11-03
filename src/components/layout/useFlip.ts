"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

// Lo que cambia de sitio en una lista se desliza hasta el sitio nuevo en vez de
// saltar: se mide antes, se mide después y se anima la diferencia con
// `transform` (la técnica FLIP). Va con la Web Animations API sobre los nodos
// de verdad, así que respeta el recorte de un panel con scroll, cosa que
// <ViewTransition> no hace.
//
// Solo se mueve lo que pide una acción: el manejador llama a `capture()` justo
// antes del cambio, y el primer render que mueve algo lo anima. Si el cambio
// llega del servidor (el corazón de «Mi lista»), espera a que llegue. La carga
// de la página y lo que cambia en otro dispositivo no se mueven solos.
//
// Cada elemento lleva `data-flip="clave"`. La clave que cambia de forma (pasa
// de una fila al escaparate) sale de su sitio viejo y aparece mientras llega;
// la que es nueva (el «Deshacer» de lo descartado) aparece y se posa.
// docs/design-system.md · Animaciones.

const EASE_PAPER = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_SWAP = "cubic-bezier(0.4, 0, 0.2, 1)";
const MOVE_MS = 320; // --dur-move
const ENTER_MS = 240;
const ENTER_DELAY_MS = 80;
const EXIT_MS = 160;
/** Lo que se espera a que el servidor mueva algo antes de olvidar la medida. */
const WAIT_MS = 4000;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Snapshot = { rects: Map<string, DOMRect>; scrollY: number; at: number };

const nodesIn = (root: HTMLElement) => root.querySelectorAll<HTMLElement>("[data-flip]");

const stopFlips = (el: HTMLElement) => {
  for (const a of el.getAnimations()) if (a.id === "flip") a.cancel();
};

export function useFlip<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  const snapshot = useRef<Snapshot | null>(null);

  /** Llamar en el manejador, justo antes de cambiar la lista. */
  const capture = useCallback(() => {
    const root = ref.current;
    if (!root || reducedMotion()) return;
    const rects = new Map<string, DOMRect>();
    for (const el of nodesIn(root)) rects.set(el.dataset.flip!, el.getBoundingClientRect());
    snapshot.current = { rects, scrollY: window.scrollY, at: performance.now() };
  }, []);

  /** El nodo de una clave, para apagarlo con `flipExit` antes de quitarlo. */
  const item = useCallback(
    (key: string) => ref.current?.querySelector<HTMLElement>(`[data-flip="${CSS.escape(key)}"]`) ?? null,
    [],
  );

  // Sin dependencias a propósito: mira después de cada render si lo medido se
  // ha movido. Mientras nada cambie (el servidor aún no ha contestado), espera.
  useLayoutEffect(() => {
    const snap = snapshot.current;
    const root = ref.current;
    if (!snap || !root) return;
    if (performance.now() - snap.at > WAIT_MS) {
      snapshot.current = null;
      return;
    }
    const scrolled = window.scrollY - snap.scrollY;
    const nodes = nodesIn(root);
    let changed = nodes.length !== snap.rects.size;
    const plays: Array<() => void> = [];
    for (const el of nodes) {
      const before = snap.rects.get(el.dataset.flip!);
      if (!before) {
        changed = true;
        plays.push(() => {
          // La entrada propia de la tarjeta (animate-in) ya no hace falta.
          for (const a of el.getAnimations({ subtree: true })) if (a instanceof CSSAnimation) a.cancel();
          // Espera a que lo demás le haga sitio, para no aparecer encima.
          el.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], {
            id: "flip",
            duration: ENTER_MS,
            delay: ENTER_DELAY_MS,
            easing: EASE_PAPER,
            fill: "backwards",
          });
        });
        continue;
      }
      const now = el.getBoundingClientRect();
      const dx = before.left - now.left;
      const dy = before.top - now.top - scrolled;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      changed = true;
      const reshaped = Math.abs(before.width - now.width) > 8 || Math.abs(before.height - now.height) > 8;
      const from = `translate(${dx}px, ${dy}px)`;
      plays.push(() => {
        stopFlips(el);
        if (!reshaped) {
          el.animate([{ transform: from }, { transform: "none" }], { id: "flip", duration: MOVE_MS, easing: EASE_PAPER });
          return;
        }
        // De fila a tarjeta o al revés: no se estira (el texto se deformaría).
        // Sale de donde estaba, a escala de su alto viejo (la tarjeta nace del
        // tamaño de la baldosa), y vuela por encima de las filas que cruza.
        const scale = Math.min(1, Math.max(0.3, before.height / now.height));
        const { position, zIndex } = el.style;
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
        el.style.zIndex = "1";
        const flight = el.animate(
          [
            { transform: `${from} scale(${scale})`, transformOrigin: "top left", opacity: 0.4 },
            { opacity: 1, offset: 0.5 },
            { transform: "none", transformOrigin: "top left", opacity: 1 },
          ],
          { id: "flip", duration: MOVE_MS + 80, easing: EASE_PAPER },
        );
        const land = () => Object.assign(el.style, { position, zIndex });
        flight.finished.then(land, land);
      });
    }
    if (!changed) return;
    snapshot.current = null;
    for (const play of plays) play();
  });

  return { ref, capture, item };
}

/**
 * Lo que la propia vista quita de una lista (descartar una idea) se apaga
 * antes de irse. Devuelve la animación, que se queda en su último fotograma:
 * si se deshace a mitad, `cancel()` la devuelve.
 */
export function flipExit(el: HTMLElement | null): Animation | null {
  if (!el || reducedMotion()) return null;
  return el.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(0.96)" }], {
    duration: EXIT_MS,
    easing: EASE_SWAP,
    fill: "forwards",
  });
}

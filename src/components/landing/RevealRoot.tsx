"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

// Umbrales cada 5 %: así salta tanto el 100 % de una réplica corta como el
// ~90 % de pantalla que llena una más alta que la pantalla.
const PLAY_THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20);

/**
 * Arma los revelados de la landing. Sin JS, con reduced motion o antes de
 * hidratar no se oculta nada: el CSS solo esconde bajo [data-reveal-armed].
 * Lo que ya está en pantalla al armar se queda en su fotograma final. Se mide
 * en la primera tanda del observer y no al hidratar: al volver atrás, el
 * navegador restaura el scroll después de hidratar, y medir antes dejaba en
 * blanco (y luego animaba) lo que ya se veía.
 */
export function RevealRoot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    if (!root || reduce.matches || typeof IntersectionObserver === "undefined") return;

    // Los compases de una réplica esperan a que esté entera en pantalla (o ya
    // pasada); si es más alta que la pantalla, a que llene el 90 % de ella.
    const play = new IntersectionObserver(
      (entries) => {
        const vh = innerHeight;
        for (const e of entries) {
          const r = e.boundingClientRect;
          if (r.bottom <= vh || (r.height > vh && e.intersectionRect.height >= 0.9 * vh)) {
            (e.target as HTMLElement).dataset.play = "";
            play.unobserve(e.target);
          }
        }
      },
      { threshold: PLAY_THRESHOLDS },
    );

    let first = true;
    const io = new IntersectionObserver(
      (entries) => {
        const vh = innerHeight;
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (first && e.boundingClientRect.top < vh) {
            el.dataset.revealed = "instant";
            io.unobserve(el);
            continue;
          }
          if (!e.isIntersecting) continue;
          el.dataset.revealed = "in";
          io.unobserve(el);
        }
        if (!first) return;
        first = false;
        root
          .querySelectorAll<HTMLElement>("[data-mock][data-reveal]:not([data-revealed='instant'])")
          .forEach((el) => play.observe(el));
        root.dataset.revealArmed = "";
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => io.observe(el));

    const settleAll = () => {
      io.disconnect();
      play.disconnect();
      root.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])").forEach((el) => (el.dataset.revealed = "instant"));
      root.querySelectorAll<HTMLElement>("[data-mock]").forEach((el) => (el.dataset.play = ""));
    };
    reduce.addEventListener("change", settleAll);
    return () => {
      io.disconnect();
      play.disconnect();
      reduce.removeEventListener("change", settleAll);
      delete root.dataset.revealArmed;
    };
  }, []);
  return <div ref={ref}>{children}</div>;
}

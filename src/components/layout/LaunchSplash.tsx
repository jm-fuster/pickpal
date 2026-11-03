"use client";

import { useEffect, useState } from "react";
import { LOGO_CORAL, LOGO_PIECES } from "@/components/ui/LogoMark";
import { LAZO_SIZE } from "@/components/layout/launchScript";

/** Pase lo que pase, a los 3 s de arrancar React se ve la app, cargada o no. */
const MAX_MS = 3000;
/** Lo que dura el fundido de salida (globals.css · .launch), con margen. */
const LEAVE_MS = 400;

/**
 * El relevo de la pantalla de arranque del móvil con la app instalada. La del
 * sistema es estática: Android la pinta con el manifiesto (crema y el icono) y
 * el iPhone, con las imágenes de `appleWebApp.startupImage` (solo crema). Esta
 * la continúa con el mismo crema y el logo en el mismo sitio, y entonces el
 * lazo: el final de la película del regalo, con los dos cordones subiendo
 * enroscados hasta formar el logo y las dos cabezas (1,9 s). Lo dibuja un
 * worker en un canvas (public/splash/lazo-worker.js), así que no le quita
 * tiempo a la app.
 *
 * Se va en cuanto no queda nada con `data-loading` en la página. Un lazo
 * empezado no se corta (un logo a medio formar parece roto): se espera a que
 * acabe. Uno que aún no ha empezado (el worker se está descargando) no se
 * espera: se para. Si el lazo acaba y la app no está lista, el logo quieto
 * sigue con el nudo que se ajusta. Sin worker o con movimiento reducido, solo
 * el logo.
 *
 * Solo sale si el script de arranque (launchScript.ts) ha puesto `data-launch`
 * en `<html>`: con la app instalada, o con `?arranque` en la dirección para
 * verla en el navegador. Sin JavaScript no sale, y si React no llega a
 * arrancar, el CSS la apaga solo a los 8 s. docs/design-system.md · Animaciones.
 */
export function LaunchSplash() {
  const [state, setState] = useState<"on" | "leaving" | "gone">("on");

  useEffect(() => {
    const html = document.documentElement;
    let raf = 0;
    let cap = 0;
    let fade = 0;
    let left = false;
    if (!html.hasAttribute("data-launch")) {
      raf = requestAnimationFrame(() => setState("gone"));
      return () => cancelAnimationFrame(raf);
    }
    const leave = () => {
      if (left) return;
      left = true;
      observer.disconnect();
      window.clearTimeout(cap);
      (window as { __lazo?: Worker }).__lazo?.terminate();
      setState("leaving");
      fade = window.setTimeout(() => setState("gone"), LEAVE_MS);
    };
    const check = () => {
      if (html.getAttribute("data-lazo") === "on") return;
      if (!document.querySelector("[data-loading]")) leave();
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    observer.observe(html, { attributes: true, attributeFilter: ["data-lazo"] });
    // Un fotograma después de hidratar: la página ya ha pintado lo suyo.
    raf = requestAnimationFrame(check);
    cap = window.setTimeout(leave, MAX_MS);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(cap);
      window.clearTimeout(fade);
    };
  }, []);

  if (state === "gone") return null;
  return (
    <div className="launch" data-state={state} aria-hidden>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="launch-mark">
        {LOGO_PIECES.map((piece) => (
          <path
            key={piece.d}
            d={piece.d}
            fill={piece.tone === "coral" ? LOGO_CORAL : "#302621"}
            className={piece.tone === "coral" ? "launch-coral" : "launch-ink"}
          />
        ))}
      </svg>
      {/* El script de arranque pasa su control al worker antes de hidratar, y
          el worker le pone `width` y `height` a la densidad del móvil, que el
          servidor no conoce: de ahí suppressHydrationWarning. */}
      <canvas className="launch-lazo" style={LAZO_SIZE} suppressHydrationWarning />
    </div>
  );
}

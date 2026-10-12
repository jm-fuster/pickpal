"use client";

import { useEffect } from "react";
import { stashPendingShare } from "@/lib/pendingShare";

/**
 * En las páginas de entrada y de registro: si se llegó desde el marcador o
 * desde «Compartir» sin sesión, guarda lo que traía la dirección para que
 * `/mi-lista/apuntar` lo recoja al volver (src/lib/pendingShare.ts). No pinta
 * nada. Lo guardado se quita también de la barra de direcciones.
 */
export function StashPendingShare() {
  useEffect(() => {
    const { hash, pathname, search } = window.location;
    if (hash.length <= 1) return;
    try {
      if (stashPendingShare(hash, window.sessionStorage)) {
        window.history.replaceState(null, "", pathname + search);
      }
    } catch {
      // sessionStorage no disponible: el fragmento se queda como estaba.
    }
  }, []);
  return null;
}

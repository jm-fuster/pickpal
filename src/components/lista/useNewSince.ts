"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { latestAddedAt, newSince, parseSeen, seenKey } from "@/lib/listSeen";

// Lo que había guardado al abrir la ficha, por lista. Se lee una sola vez por
// visita y se olvida al salir, así que las etiquetas se quedan mientras miras
// y desaparecen la próxima vez que entres.
const baselines = new Map<string, number | null>();

function baselineFor(key: string): number | null {
  if (!baselines.has(key)) {
    let stored: number | null = null;
    try {
      stored = parseSeen(window.localStorage.getItem(key));
    } catch {
      // Sin almacenamiento (modo privado, bloqueado): sin «Nuevo», nada más.
    }
    baselines.set(key, stored);
  }
  return baselines.get(key) ?? null;
}

/**
 * Qué elementos de una lista recibida son nuevos desde tu última visita
 * (src/lib/listSeen.ts). Al abrirla se guarda al momento la nueva referencia.
 */
export function useNewSince(
  shareId: string,
  items: ReadonlyArray<{ _id: string; addedAt: number }>,
): Set<string> {
  const { userId } = useAuth();
  const key = userId ? seenKey(userId, shareId) : null;
  const latest = latestAddedAt(items);
  const seen = key && typeof window !== "undefined" ? baselineFor(key) : null;

  useEffect(() => {
    if (!key) return;
    try {
      const stored = parseSeen(window.localStorage.getItem(key));
      if (latest > (stored ?? 0)) window.localStorage.setItem(key, String(latest));
    } catch {
      // Igual que arriba.
    }
  }, [key, latest]);

  useEffect(() => {
    if (!key) return;
    return () => {
      baselines.delete(key);
    };
  }, [key]);

  return newSince(items, seen);
}

"use client";

import { useEffect, useRef } from "react";

/**
 * Devuelve el foco a «Editar» (o a lo que lleve `ref`) cuando un bloque sale
 * de edición con «Listo». Solo entonces: si el bloque se cierra porque se ha
 * abierto otro, el foco se queda en el campo del bloque nuevo.
 */
export function useRestoreFocus<T extends HTMLElement = HTMLButtonElement>(editing: boolean) {
  const ref = useRef<T>(null);
  const pending = useRef(false);
  useEffect(() => {
    if (!editing && pending.current) {
      pending.current = false;
      ref.current?.focus();
    }
  }, [editing]);
  return {
    ref,
    restore: () => {
      pending.current = true;
    },
  };
}

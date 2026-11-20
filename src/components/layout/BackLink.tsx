"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackLinkProps {
  /**
   * Si se indica y no hay historial dentro de la app (p. ej. la página se
   * abrió directamente o desde un enlace externo), navega aquí en vez de
   * `router.back()`. Sin esta prop, siempre usa `router.back()`.
   */
  fallbackHref?: string;
  /** Icono `ArrowLeft` + layout en fila. Por defecto `true`; desactivar para variantes de texto plano (p. ej. pie de página). */
  icon?: boolean;
  label?: string;
  className?: string;
}

export function BackLink({
  fallbackHref,
  icon = true,
  label = "Volver",
  className,
}: BackLinkProps) {
  const router = useRouter();

  const handleClick = () => {
    if (fallbackHref && window.history.length <= 1) {
      router.push(fallbackHref);
      return;
    }
    router.back();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "touch-target",
        icon
          ? "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit"
          : "hover:text-foreground",
        className,
      )}
    >
      {icon && <ArrowLeft className="size-3.5" aria-hidden />}
      {label}
    </button>
  );
}

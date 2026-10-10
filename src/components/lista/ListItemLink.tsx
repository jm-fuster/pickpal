import { ExternalLink } from "lucide-react";
import { linkHostname } from "@/lib/links";
import { STORE_ICONS, storeIdForUrl } from "@/lib/stores";
import { cn } from "@/lib/utils";

/**
 * El enlace de un elemento de «Mi lista». Siempre enseña el dominio, para que
 * se vea adónde lleva antes de abrirlo, y el logo si es una de las 11 tiendas
 * conocidas (decisión 3 de docs/encargo-lista.md). Nada se pide a la tienda:
 * el logo es el de `public/stores/` y el dominio sale de la propia URL.
 *
 * `nofollow` además de `noopener noreferrer`: la URL la escribió otra persona.
 */
export function ListItemLink({ url, className }: { url: string; className?: string }) {
  const host = linkHostname(url);
  if (!host) return null;
  const store = storeIdForUrl(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label={`Abrir el enlace en ${host} (abre en una pestaña nueva)`}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline",
        className,
      )}
    >
      {store ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={STORE_ICONS[store]}
          alt=""
          aria-hidden
          className="size-3.5 shrink-0 rounded-sm bg-white object-contain p-px"
        />
      ) : null}
      <span className="truncate">{host}</span>
      <ExternalLink className="size-3 shrink-0" aria-hidden />
    </a>
  );
}

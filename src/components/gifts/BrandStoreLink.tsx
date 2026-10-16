"use client";

import { useState } from "react";
import { ExternalLink, Tags } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  findBrandStore,
  generateBrandProductSearchUrl,
  generateBrandSearchUrl,
  generateBrandStoreUrl,
} from "@/lib/brands";
import type { MatchedBrandStore } from "@/lib/gifts";

/**
 * Botón de marca favorita matcheada. Si la idea trae la tienda oficial resuelta
 * (`matchedBrandStores`, vía Brandfetch), muestra su logo y enlaza a la web de
 * la marca: a la búsqueda del producto dentro de la tienda si esta la admite
 * (`supportsSearch`), o a su home en caso contrario. Si no se resolvió, cae al
 * botón de búsqueda de marca en Google (Capa 0) con el icono `Tags`. Logo con
 * `bg-white` para que se vea en modo oscuro (igual que los logos de tienda) y
 * fallback al icono si la imagen falla.
 *
 * Compartido entre la card de generación (`GiftRecommendationCard`, tamaño
 * `default` a ancho completo) y la lista de "Ideas guardadas" de la ficha
 * (tamaño `sm`, compacto). Recibe los campos sueltos (no la idea entera) para
 * servir a ambos tipos — recomendación e idea guardada.
 */
export function BrandStoreLink({
  brand,
  query,
  title,
  matchedBrandStores,
  size = "default",
  className,
}: {
  brand: string;
  query: string;
  title: string;
  matchedBrandStores: readonly MatchedBrandStore[] | undefined;
  size?: "default" | "sm";
  className?: string;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const store = findBrandStore(brand, matchedBrandStores);
  const href = store
    ? store.supportsSearch
      ? generateBrandProductSearchUrl(store.domain, query)
      : generateBrandStoreUrl(store.domain)
    : generateBrandSearchUrl(query, brand);
  const logo = store?.logoUrl && !logoFailed ? store.logoUrl : null;
  const iconClass = size === "sm" ? "size-3.5" : "size-4";
  const externalClass = size === "sm" ? "size-3" : "size-3.5";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        store && !store.supportsSearch
          ? `Ir a la tienda de ${brand} (abre en una pestaña nueva)`
          : `Buscar ${title} en ${brand} (abre en una pestaña nueva)`
      }
      className={cn(
        buttonVariants({ size, variant: "outline" }),
        "min-w-0 border-secondary/40 text-brand-secondary hover:text-brand-secondary",
        className,
      )}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          aria-hidden
          loading="lazy"
          onError={() => setLogoFailed(true)}
          className={cn(iconClass, "shrink-0 rounded-sm object-contain bg-white p-px")}
        />
      ) : (
        <Tags className={cn(iconClass, "shrink-0")} aria-hidden />
      )}
      <span className="truncate">{brand}</span>
      <ExternalLink className={cn(externalClass, "shrink-0")} aria-hidden />
    </a>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpRight, Camera, Check, ExternalLink, Gift, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { MenuAction, MenuGroup } from "@/components/people/ActionMenu";
import { VisualBox, type Visual } from "@/components/people/ideaParts";
import { linkHostname } from "@/lib/links";
import { formatApproxPrice } from "@/lib/price";
import { STORE_ICONS, storeIdForUrl } from "@/lib/stores";
import { cn } from "@/lib/utils";

// Las piezas de las dos caras de una lista: la de quien la escribe
// (OwnerListView) y la de quien la lee en su ficha (SharedListSection).
// «Escaparate y libreta» (2-nov-2026, docs/design-system.md): lo que más
// ilusión le haría va en tarjetas grandes que se deslizan, el resto en filas
// con una baldosa y una sola acción, y todo lo demás vive en la hoja que se
// abre al tocar una cosa.

type MetaSource = { priceCents: number | null; url?: string | null };

/** Si hay precio o un enlace con dominio que enseñar bajo el título. */
export const hasItemMeta = (item: MetaSource) =>
  item.priceCents !== null || (item.url ? linkHostname(item.url) !== null : false);

/**
 * «unos 25 €» y la tienda, con su logo si es una de las conocidas: lo que cabe
 * bajo el título, sin enlaces (el enlace está en la hoja). El logo distingue
 * cosas que comparten baldosa, y separa precio y tienda sin un punto medio.
 */
export function ItemMeta({ item }: { item: MetaSource }) {
  const host = item.url ? linkHostname(item.url) : null;
  const store = item.url ? storeIdForUrl(item.url) : null;
  if (item.priceCents === null && !host) return null;
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-2 align-bottom">
      {item.priceCents !== null && <span className="shrink-0">{formatApproxPrice(item.priceCents)}</span>}
      {host && (
        <span className="inline-flex min-w-0 items-center gap-1">
          {store && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={STORE_ICONS[store]} alt="" aria-hidden className="size-3.5 shrink-0 rounded-sm bg-white object-contain p-px" />
          )}
          <span className="truncate">{host}</span>
        </span>
      )}
    </span>
  );
}

/**
 * El carrusel del escaparate: en el móvil se desliza, como «Lo que tienes
 * pensado»; con sitio, rejilla de tres. Va dentro de un `@container`.
 */
export const SHOWCASE = "-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 @xl:grid @xl:grid-cols-3 @xl:overflow-visible";
export const SHOWCASE_ITEM = "w-52 shrink-0 snap-start @xl:w-auto";

/**
 * Rótulo de un grupo de la lista: «Lo que más ilusión le haría», «El resto».
 * Sin icono delante: el ♡ repetía lo que dice el texto y, en «Mi lista», se
 * confundía con los corazones que sí se pulsan.
 */
export function GroupTitle({ id, muted, children }: { id: string; muted?: boolean; children: ReactNode }) {
  return (
    <h3 id={id} className={cn("font-sans text-sm font-medium", muted && "text-muted-foreground")}>
      {children}
    </h3>
  );
}

/**
 * Una tarjeta del escaparate. Tocar la imagen o el título abre la hoja; el pie
 * lleva la acción que no puede esperar («Lo regalo yo»); la esquina, el
 * corazón de quien la escribe, y abajo a la izquierda de la imagen, la cámara
 * si aún no tiene foto.
 */
export function ShowcaseTile({
  visual,
  title,
  meta,
  badge,
  corner,
  visualAction,
  footer,
  dimmed,
  onOpen,
}: {
  visual: Visual;
  title: string;
  meta?: ReactNode;
  badge?: ReactNode;
  corner?: ReactNode;
  /** Sobre la imagen, abajo a la izquierda: «Añadir una foto». */
  visualAction?: ReactNode;
  footer?: ReactNode;
  dimmed?: boolean;
  onOpen: () => void;
}) {
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card" aria-label={title}>
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col text-left -outline-offset-2">
        <VisualBox visual={visual} className={cn("h-28 w-full", dimmed && "opacity-60")} iconSize="size-10" />
        <span className={cn("flex flex-col gap-1 px-3 pt-2.5", !footer && "pb-3")}>
          <span className="line-clamp-2 text-base leading-snug font-medium">{title}</span>
          {meta && <span className="truncate text-sm text-muted-foreground">{meta}</span>}
        </span>
      </button>
      {badge && <span className="pointer-events-none absolute top-2 left-2">{badge}</span>}
      {corner && <span className="absolute top-2 right-2">{corner}</span>}
      {/* La imagen mide h-28 (112): 112 − 8 de margen − 32 del botón = 72. */}
      {visualAction && <span className="absolute top-18 left-2">{visualAction}</span>}
      {footer && <div className="mt-auto px-3 pt-3 pb-3">{footer}</div>}
    </article>
  );
}

/**
 * La cámara sobre una tarjeta sin foto, en la vista de quien la escribe. La
 * baldosa de categoría repite icono entre cosas parecidas (tres tazas en una
 * lista de café); una foto es lo único que las distingue, así que se pide
 * donde más se ve, en lo que más ilusión le haría. Solo icono: con cinco
 * tarjetas sin foto, cinco «Añadir foto» escritos serían otra pared de texto.
 */
export function AddPhotoButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Añadir una foto: ${title}`}
      title="Añadir una foto"
      className="relative grid size-8 place-items-center rounded-full bg-card/90 text-muted-foreground transition-[background-color,color,translate] hover:bg-card hover:text-foreground active:translate-y-px pointer-coarse:after:absolute pointer-coarse:after:-inset-1.5"
    >
      <Camera className="size-4" aria-hidden />
    </button>
  );
}

/**
 * Una fila de la lista: baldosa, título y una línea, y a la derecha su única
 * acción. Tocar el resto de la fila abre la hoja.
 */
export function ItemRow({
  id,
  highlighted,
  visual,
  title,
  sub,
  badge,
  action,
  dimmed,
  onOpen,
  children,
}: {
  /** Para llevar la vista a lo que se acaba de apuntar. */
  id?: string;
  /** Recién apuntado: se tiñe un momento. */
  highlighted?: boolean;
  visual: Visual;
  title: string;
  sub?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  dimmed?: boolean;
  /** Sin él la fila no abre nada (lo que ya no está en su lista no tiene hoja). */
  onOpen?: () => void;
  /** Lo que va debajo de la fila: el aviso «lo ha cambiado», un botón. */
  children?: ReactNode;
}) {
  const body = (
    <>
      <VisualBox visual={visual} className={cn("size-11 shrink-0 rounded-lg", dimmed && "opacity-60")} iconSize="size-5" />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm leading-snug font-medium", dimmed && "text-muted-foreground")}>
          {title}
          {badge && <span className="ml-2 inline-block align-middle">{badge}</span>}
        </span>
        {sub && <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{sub}</span>}
      </span>
    </>
  );
  const bodyClass = "flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left";
  return (
    <li id={id} className={cn("-mx-2 rounded-lg px-2 py-1.5 transition-[background-color] duration-700", highlighted && "bg-secondary/10")}>
      <div className="flex items-center gap-3">
        {onOpen ? (
          <button type="button" onClick={onOpen} className={cn(bodyClass, "-outline-offset-2")}>
            {body}
          </button>
        ) : (
          <div className={bodyClass}>{body}</div>
        )}
        {action}
      </div>
      {children && <div className="mt-1.5 pl-14">{children}</div>}
    </li>
  );
}

export type GiftState = "free" | "mine" | "given";

/**
 * El círculo de regalo de quien lee una lista. Libre, marca de un toque.
 * Marcado o regalado, abre la hoja: quitar la marca, elegir la ocasión o
 * pasarlo al historial merecen un paso más que marcar.
 */
export function GiftToggle({ state, title, onClick }: { state: GiftState; title: string; onClick: () => void }) {
  const label =
    state === "free"
      ? `Lo regalo yo: ${title}`
      : state === "mine"
        ? `Lo regalas tú: ${title}. Ver opciones`
        : `Ya se lo regalaste: ${title}. Ver opciones`;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={state === "free" ? "Lo regalo yo" : undefined}
      className={cn(
        "relative grid size-8 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,translate] active:translate-y-px pointer-coarse:after:absolute pointer-coarse:after:-inset-1.5",
        state === "free" && "border-input bg-background hover:bg-muted",
        state === "mine" && "border-primary bg-primary text-primary-foreground",
        state === "given" && "border-border bg-muted text-muted-foreground",
      )}
    >
      {state === "free" ? <Gift className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
    </button>
  );
}

/**
 * El corazón de quien escribe la lista: pasa una cosa a «Lo que más ilusión»
 * o la saca. Es su única acción en la fila; lo demás está en la hoja.
 */
export function FavoriteToggle({
  on,
  label,
  hint,
  onClick,
  overlay,
}: {
  on: boolean;
  /**
   * Qué es, no qué hace, y no cambia: «Lo que más ilusión te haría:
   * Regadera». Si cambiaba con el estado además de `aria-pressed`, el lector
   * de pantalla lo decía dos veces («Sacar de…, pulsado»).
   */
  label: string;
  /** Lo que hace al pulsarlo, para el tooltip: «Pasar a lo que más ilusión te haría». */
  hint: string;
  onClick: () => void;
  /** Sobre la imagen de una tarjeta: lleva fondo para que se lea encima. */
  overlay?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={hint}
      className={cn(
        "relative grid size-8 shrink-0 place-items-center rounded-full transition-[background-color,translate] active:translate-y-px pointer-coarse:after:absolute pointer-coarse:after:-inset-1.5",
        overlay ? "bg-card/90 hover:bg-card" : "hover:bg-muted",
      )}
    >
      <Heart
        className={cn("size-4.5", on ? "fill-current text-brand-secondary" : "text-subtle-foreground")}
        aria-hidden
      />
    </button>
  );
}

/**
 * La hoja que se abre al tocar una cosa: su imagen grande, el título, el
 * precio y lo que haya debajo (nota, acciones, enlaces). Sube desde abajo en
 * el móvil y en escritorio se queda centrada y estrecha.
 */
export function ItemSheet({
  open,
  onOpenChange,
  visual,
  title,
  meta,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visual: Visual;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-[90dvh] w-full max-w-lg gap-0 overflow-y-auto rounded-t-2xl px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-9 shrink-0 rounded-full bg-input/50" />
        <VisualBox visual={visual} className="h-36 w-full shrink-0 rounded-xl" iconSize="size-12" />
        <div className="mt-4 space-y-1">
          <SheetTitle className="text-xl leading-tight font-semibold">{title}</SheetTitle>
          {meta && <SheetDescription>{meta}</SheetDescription>}
        </div>
        <div className="mt-4 space-y-4">{children}</div>
        <SheetClose
          render={<Button variant="ghost" size="icon-sm" className="absolute top-2 right-2" aria-label="Cerrar" />}
        >
          <X aria-hidden />
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}

const SHEET_ROW =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

/** «Abrir en amazon.es»: el enlace de la cosa, con el logo si es una tienda conocida. */
export function SheetLinkRow({ url }: { url: string }) {
  const host = linkHostname(url);
  if (!host) return null;
  const store = storeIdForUrl(url);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer nofollow" className={SHEET_ROW}>
      {store ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={STORE_ICONS[store]} alt="" aria-hidden className="size-4 shrink-0 rounded-sm bg-white object-contain p-px" />
      ) : (
        <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <span className="min-w-0 flex-1 truncate">Abrir en {host}</span>
      <ArrowUpRight className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
      <span className="sr-only">(abre en una pestaña nueva)</span>
    </a>
  );
}

/**
 * Las acciones de un `⋯` pintadas como filas de la hoja: los mismos grupos que
 * ActionMenu, así una acción no cambia de nombre según dónde se abra. Cada
 * acción cierra la hoja al acabar.
 */
export function SheetActions({ groups, onDone }: { groups: MenuGroup[]; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const visible = groups.filter((g) => g.actions.length > 0);
  const run = async (action: MenuAction) => {
    setBusy(true);
    try {
      await action.onSelect();
      onDone();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col">
      {visible.map((group, gi) => (
        <div key={gi} role="group" aria-label={group.heading} className={cn("flex flex-col", gi > 0 && "mt-1 border-t border-border/60 pt-1")}>
          {group.heading && <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">{group.heading}</p>}
          {group.actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                disabled={busy || action.disabled}
                onClick={() => run(action)}
                className={cn(SHEET_ROW, action.destructive && "text-destructive")}
              >
                {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : <span aria-hidden className="size-4 shrink-0" />}
                <span className="min-w-0 flex-1">{action.label}</span>
                {action.hint && <span className="shrink-0 text-muted-foreground">{action.hint}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

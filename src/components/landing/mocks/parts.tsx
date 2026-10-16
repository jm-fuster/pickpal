import type { HTMLAttributes, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { BookHeart, Ellipsis, Gift, NotebookPen, type LucideIcon } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { BeatProps } from "@/components/landing/motion";
import type { TileSpec } from "@/components/landing/sample";
import { resolveGiftImage } from "@/lib/giftImages";
import { cn } from "@/lib/utils";

// Piezas de las réplicas de la landing. Copian las clases de los componentes
// reales sin importarlos: aquellos son de cliente y llevan datos y acciones;
// estos son spans y párrafos quietos dentro de un MockFrame inerte. Si cambia
// el original, se cambia aquí (lista de sincronía en docs/design-system.md).

/**
 * `ui/avatar` con iniciales, sin su `"use client"`. El tamaño de la letra va
 * en `className` («size-16 text-lg»): lo hereda el círculo de dentro.
 */
export function InitialsAvatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 rounded-full text-sm after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten",
        className,
      )}
    >
      <span className="flex size-full items-center justify-center rounded-full bg-muted text-muted-foreground">
        {initials}
      </span>
    </span>
  );
}

/** El título en versalitas de los bloques de la ficha («Gustos», «Historial de regalos»). */
export function Eyebrow({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
      {Icon && <Icon className="size-3.5" />}
      {children}
    </p>
  );
}

/** Fila de lectura de la ficha, etiqueta y valor. Las props sueltas llevan el compás. */
export function ViewRow({
  label,
  children,
  className,
  ...rest
}: { label: string; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "-mx-2 grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-3 rounded-md px-2 py-1.5 text-sm",
        className,
      )}
      {...rest}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** La línea de lo que falta por apuntar («Faltan sus marcas.»). */
export function MissingLine({ children }: { children: ReactNode }) {
  return <p className="-mx-2 px-2 py-1 text-xs text-muted-foreground">{children}</p>;
}

type ButtonLook = VariantProps<typeof buttonVariants>;

/** Un botón que solo se ve: un span con las clases de `buttonVariants`. */
export function FakeButton({
  variant = "default",
  size = "default",
  className,
  children,
  ...rest
}: {
  variant?: ButtonLook["variant"];
  size?: ButtonLook["size"];
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn(buttonVariants({ variant, size }), className)} {...rest}>
      {children}
    </span>
  );
}

/** El ⋯ o el lápiz de una fila: icono de 14 px en una caja de 28. */
export function FakeIconButton({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="inline-flex size-7 items-center justify-center rounded-[min(var(--radius-md),12px)] text-muted-foreground">
      <Icon className="size-3.5" />
    </span>
  );
}

/** Una etiqueta de la ficha (`Badge` secundario). Las props sueltas llevan el compás. */
export function TagChip({ className, children, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn(badgeVariants({ variant: "secondary" }), className)} {...rest}>
      {children}
    </span>
  );
}

/**
 * Apila sus hijos en una sola celda: mide lo que el más ancho, así que cambiar
 * de etiqueta a mitad de escena no mueve nada de alrededor.
 */
export function StackCell({ className, children, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("inline-grid [&>*]:col-start-1 [&>*]:row-start-1", className)} {...rest}>
      {children}
    </span>
  );
}

const TILE_ORIGIN: Record<TileSpec["kind"], string> = { list: "De su lista", own: "Tuya", suggested: "Sugerida" };

// Como `itemVisual` e `ideaVisual` de ideaParts.tsx, sin fotos.
const TERRACOTTA = { container: "bg-secondary/15", iconClass: "text-brand-secondary" };
const TILE_VISUAL = {
  list: { icon: BookHeart, ...TERRACOTTA },
  own: { icon: NotebookPen, ...TERRACOTTA },
} as const;

/**
 * Lo que tienes pensado, en pequeño. Desvío asumido del `TILE` de
 * NextOccasionCard: más bajo, sin insignia ni tiendas, para que quepan tres
 * en una fila del móvil. El título llega a tres líneas: en el móvil y a 1024
 * la tesela mide unos 70–80 px por dentro y en dos se cortaban todos.
 */
export function CompactTile({
  spec,
  className,
  ...rest
}: { spec: TileSpec; className?: string } & HTMLAttributes<HTMLDivElement>) {
  const visual = spec.kind === "suggested" ? resolveGiftImage(spec.imageKey, "fisica") : TILE_VISUAL[spec.kind];
  return (
    <div
      className={cn("flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card", className)}
      {...rest}
    >
      <div className={cn("flex h-16 w-full items-center justify-center", visual.container)}>
        <visual.icon className={cn("size-6", visual.iconClass)} strokeWidth={1.5} />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2.5 pt-2">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-2xs text-muted-foreground">{TILE_ORIGIN[spec.kind]}</span>
          <Ellipsis className="size-3.5 shrink-0 text-muted-foreground" />
        </div>
        <p className="line-clamp-3 font-sans text-[13px] leading-snug font-medium">{spec.title}</p>
        <p className="text-xs text-muted-foreground">{spec.price}</p>
      </div>
    </div>
  );
}

/**
 * NextOccasionCard en su estado urgente. El tinte va en una capa aparte
 * encima de la neutra para poder fundirlo (`urgentBeat`); sin compás, la capa
 * urgente es el fotograma final. `countBeat` anima la línea entera de «Lo
 * que tienes pensado». Nunca un h2: dentro de una réplica no hay títulos.
 */
export function OccasionCard({
  title,
  meta,
  count,
  urgentBeat,
  titleBeat,
  countBeat,
  children,
}: {
  title: string;
  meta: ReactNode;
  count: ReactNode;
  urgentBeat?: BeatProps;
  titleBeat?: BeatProps;
  countBeat?: BeatProps;
  children: ReactNode;
}) {
  return (
    <div className="relative @container rounded-2xl p-5 shadow-sm">
      <div className="absolute inset-0 rounded-2xl border border-border/60 bg-card" />
      <div
        className="absolute inset-0 rounded-2xl border border-primary/60 bg-[color-mix(in_oklab,var(--primary)_5%,var(--background))]"
        {...urgentBeat}
      />
      <div className="relative space-y-5">
        <div className="flex flex-col gap-4 @md:flex-row @md:items-center @md:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="origin-bottom-left font-heading text-2xl leading-tight font-semibold" {...titleBeat}>
              {title}
            </p>
            <p className="text-sm text-muted-foreground">{meta}</p>
          </div>
          <FakeButton className="w-full @md:w-auto">
            <Gift className="size-4" />
            Buscar ideas
          </FakeButton>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium" {...countBeat}>
            Lo que tienes pensado<span className="font-normal text-muted-foreground"> · {count}</span>
          </p>
          <div className="grid grid-cols-3 gap-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

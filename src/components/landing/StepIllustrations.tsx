import { useId } from "react";
import { beat } from "@/components/landing/motion";

// Pictogramas de marca de la landing: formas planas (un disco crema y figuras
// en verde y terracota) en el mismo lenguaje que el logo-mark. Marcan cada
// sección encima de su h2 y van siempre sobre --background: sobre --card, en
// oscuro, el disco se queda en 1,19:1. Colores con tokens (`fill-*`) para
// seguir claro/oscuro; `fill-accent` vale como tinta dentro de una forma verde
// y el ámbar sale como mucho una vez. Decorativos: siempre `aria-hidden`.
// Los clipPath toman su id de useId(), que vale en componentes de servidor:
// así el mismo pictograma puede salir dos veces sin que sus recortes choquen.

type IllustrationProps = { className?: string };

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Destello de cuatro puntas centrado en (cx, cy) y de radio `s`. */
export function sparklePath(cx: number, cy: number, s: number): string {
  const a = r2(0.17 * s);
  const b = r2(0.31 * s);
  const p = (x: number, y: number) => `${r2(x)} ${r2(y)}`;
  return [
    `M${p(cx, cy - s)}`,
    `C${p(cx + a, cy - b)} ${p(cx + b, cy - a)} ${p(cx + s, cy)}`,
    `C${p(cx + b, cy + a)} ${p(cx + a, cy + b)} ${p(cx, cy + s)}`,
    `C${p(cx - a, cy + b)} ${p(cx - b, cy + a)} ${p(cx - s, cy)}`,
    `C${p(cx - b, cy - a)} ${p(cx - a, cy - b)} ${p(cx, cy - s)}`,
    "Z",
  ].join(" ");
}

function Figure({
  cx,
  cy,
  r,
  headR,
  bodyClass,
}: {
  cx: number;
  cy: number;
  r: number;
  headR: number;
  bodyClass: string;
}) {
  const clipId = useId();
  const bodyWidth = r * 1.18;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className="fill-accent" />
      <clipPath id={clipId}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <g clipPath={`url(#${clipId})`} className={bodyClass}>
        <circle cx={cx} cy={cy - r * 0.35} r={headR} />
        <rect
          x={cx - bodyWidth / 2}
          y={cy + r * 0.15}
          width={bodyWidth}
          height={r * 1.1}
          rx={bodyWidth / 2}
        />
      </g>
    </g>
  );
}

/** El disco crema de fondo de los pictogramas de un solo objeto. */
function Disc() {
  return <circle cx={70} cy={38} r={26} className="fill-accent" />;
}

/** Trío de figuras (la del centro, terracota, delante). */
export function LovedOnesIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 140 72" aria-hidden className={className}>
      <Figure cx={38} cy={40} r={17} headR={5.5} bodyClass="fill-primary" />
      <Figure cx={102} cy={40} r={17} headR={5.5} bodyClass="fill-primary" />
      <Figure cx={70} cy={34} r={20} headR={6.5} bodyClass="fill-secondary" />
    </svg>
  );
}

/** Campana con badge de aviso. */
export function RemindersIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 140 72" aria-hidden className={className}>
      <Disc />
      <g className="fill-primary">
        <circle cx={70} cy={21} r={2.5} />
        <path d="M58 44 v-10 a12 12 0 0 1 24 0 v10 q0 3 2.5 5 h-29 q2.5 -2 2.5 -5 z" />
        <circle cx={70} cy={53.5} r={3.5} />
      </g>
      <circle cx={87} cy={21} r={6} className="fill-secondary" />
    </svg>
  );
}

/** Regalo con lazo y destellos. */
export function GiftIdeasIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 140 72" aria-hidden className={className}>
      <Disc />
      <g className="fill-primary">
        <rect x={56} y={35} width={28} height={20} rx={3} />
        <rect x={52} y={26} width={36} height={9} rx={3} />
      </g>
      <g className="fill-secondary">
        <rect x={67} y={26} width={6} height={29} />
        <circle cx={63.5} cy={22} r={4.5} />
        <circle cx={76.5} cy={22} r={4.5} />
      </g>
      <path d={sparklePath(44, 18, 7)} className="fill-chart-3" />
      <path d={sparklePath(100, 28, 5)} className="fill-secondary" />
    </svg>
  );
}

/** Hoja de calendario con el día de hoy marcado (marca de «Cómo funciona»). */
export function CalendarIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 140 72" aria-hidden className={className}>
      <Disc />
      <rect x={55} y={24} width={30} height={28} rx={3} className="fill-primary" />
      {/* La banda solo redondea arriba: el segundo rect tapa sus esquinas de abajo. */}
      <g className="fill-secondary">
        <rect x={55} y={24} width={30} height={8} rx={3} />
        <rect x={55} y={28} width={30} height={4} />
      </g>
      <rect x={63} y={37} width={14} height={10} rx={2} className="fill-accent" />
      <g className="fill-primary">
        <circle cx={62} cy={23} r={2} />
        <circle cx={78} cy={23} r={2} />
      </g>
      <path d={sparklePath(98, 24, 5)} className="fill-chart-3" />
    </svg>
  );
}

/** Hoja con renglones y marcapáginas (marca de «Mi lista»). */
export function ListIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 140 72" aria-hidden className={className}>
      <Disc />
      <rect x={56} y={20} width={28} height={36} rx={3} className="fill-primary" />
      <g className="fill-accent">
        <rect x={61} y={28} width={18} height={3} rx={1.5} />
        <rect x={61} y={35} width={18} height={3} rx={1.5} />
        <rect x={61} y={42} width={12} height={3} rx={1.5} />
      </g>
      <path d="M74 16 h6 v14 l-3 -3 l-3 3 z" className="fill-secondary" />
    </svg>
  );
}

/** Libreta cerrada con etiqueta y goma (marca de «Lo que PickPal no hace»). */
export function NotebookIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 140 72" aria-hidden className={className}>
      <Disc />
      <rect x={54} y={20} width={32} height={38} rx={3} className="fill-primary" />
      <rect x={60} y={30} width={14} height={8} rx={2} className="fill-accent" />
      <rect x={78} y={18} width={4} height={42} rx={2} className="fill-secondary" />
    </svg>
  );
}

/**
 * El disco de marca del hero: un círculo plano que sangra por el borde, nunca
 * un degradado, y el único destello ámbar, en su borde de arriba. Anima con la
 * escena de carga (`data-scene="load"` en el hero). Se oculta en colores
 * forzados (`data-decor`).
 */
export function HeroDisc({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden data-decor className={className}>
      {/* transform-fill: en SVG la escala parte de la esquina del lienzo, no del círculo. */}
      <circle cx="50" cy="50" r="46" className="fill-accent transform-fill origin-center" {...beat("settle", 0, 700)} />
      <g className="transform-fill origin-center" {...beat("pop", 3000)}>
        <path d={sparklePath(50, 4, 4)} className="fill-chart-3" />
      </g>
    </svg>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const MONTHS_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export const YEAR_START = 1900;
export const YEAR_END = 2100;
export const YEARS = Array.from(
  { length: YEAR_END - YEAR_START + 1 },
  (_, i) => String(YEAR_START + i),
);
export const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

const ITEM_H = 48;

// El ajuste de la rueda se desliza, salvo con el movimiento reducido activado.
function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export function formatDate(day: number, month: number, year?: number) {
  const m = MONTHS[month - 1]?.toLowerCase() ?? "";
  return year ? `${day} de ${m} de ${year}` : `${day} de ${m}`;
}

interface ScrollColumnProps {
  items: string[];
  initialIndex: number;
  onChange: (index: number) => void;
  /** Nombre accesible de la columna (Día / Mes / Año). */
  label: string;
  /** Valor numérico real del primer item (1 para día/mes, YEAR_START para año). */
  valueMin: number;
  /** Texto legible por item para `aria-valuetext` (p. ej. meses completos). Si no, usa `items`. */
  valueTextItems?: string[];
}

function ScrollColumn({
  items,
  initialIndex,
  onChange,
  label,
  valueMin,
  valueTextItems,
}: ScrollColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Índice seleccionado en estado: lo necesita el teclado y los atributos
  // aria-value* para anunciarse a lectores de pantalla. Se sincroniza con el
  // scroll/drag y con las flechas.
  const [idx, setIdx] = useState(initialIndex);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartTop = useRef(0);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: initialIndex * ITEM_H, behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(i: number) {
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    setIdx(clamped);
    onChange(clamped);
    return clamped;
  }

  function currentIndex() {
    const el = ref.current;
    if (!el) return idx;
    return Math.max(
      0,
      Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)),
    );
  }

  function snapToNearest() {
    const el = ref.current;
    if (!el) return;
    const i = currentIndex();
    el.scrollTo({ top: i * ITEM_H, behavior: scrollBehavior() });
    commit(i);
  }

  function handleScroll() {
    if (dragging.current) return;
    commit(currentIndex());
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(snapToNearest, 120);
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;
    dragStartY.current = e.clientY;
    dragStartTop.current = ref.current?.scrollTop ?? 0;
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging.current || !ref.current) return;
    ref.current.scrollTop =
      dragStartTop.current + (dragStartY.current - e.clientY);
    commit(currentIndex());
  }

  function handleMouseUp() {
    if (!dragging.current) return;
    dragging.current = false;
    snapToNearest();
  }

  // Teclado (rol spinbutton): ↑/→ sube el valor, ↓/← lo baja, Re/Av Pág ±5,
  // Inicio/Fin a los extremos. Anima el scroll hasta el nuevo índice.
  function handleKeyDown(e: React.KeyboardEvent) {
    let next: number;
    switch (e.key) {
      case "ArrowUp":
      case "ArrowRight": next = idx + 1; break;
      case "ArrowDown":
      case "ArrowLeft": next = idx - 1; break;
      case "PageUp": next = idx + 5; break;
      case "PageDown": next = idx - 5; break;
      case "Home": next = 0; break;
      case "End": next = items.length - 1; break;
      default: return;
    }
    e.preventDefault();
    next = Math.max(0, Math.min(items.length - 1, next));
    ref.current?.scrollTo({ top: next * ITEM_H, behavior: scrollBehavior() });
    commit(next);
  }

  return (
    <div className="relative flex-1 h-36 overflow-hidden">
      <div
        ref={ref}
        tabIndex={0}
        role="spinbutton"
        aria-label={label}
        aria-valuemin={valueMin}
        aria-valuemax={valueMin + items.length - 1}
        aria-valuenow={valueMin + idx}
        aria-valuetext={(valueTextItems ?? items)[idx]}
        onKeyDown={handleKeyDown}
        className="h-full overflow-y-scroll cursor-grab rounded-md outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:cursor-grabbing"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="py-12">
          {items.map((item, i) => (
            <div
              key={i}
              aria-hidden
              className={`h-12 flex items-center justify-center text-lg select-none transition-colors ${
                i === idx ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-12 h-px bg-border" />
        <div className="absolute inset-x-0 bottom-12 h-px bg-border" />
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-popover to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-popover to-transparent" />
      </div>
    </div>
  );
}

interface DatePickerDialogProps {
  open: boolean;
  day: number;
  month: number;
  year?: number;
  onChange: (day: number, month: number, year?: number) => void;
  onClose: () => void;
}

// Estado temporal del picker. Vive en un componente propio que se inicializa
// desde props al montar: la `key` que le pone DatePickerDialog (open + fecha
// entrante) lo remonta en cada apertura, sin resetear estado en un efecto.
function DatePickerDialogBody({
  day,
  month,
  year,
  onChange,
  onClose,
}: Omit<DatePickerDialogProps, "open">) {
  const [tmpDay, setTmpDay] = useState(day);
  const [tmpMonth, setTmpMonth] = useState(month);
  const [includeYear, setIncludeYear] = useState(year !== undefined);
  const [tmpYear, setTmpYear] = useState(year ?? new Date().getFullYear());

  return (
    <>
      <DialogTitle className="text-2xl font-light text-center tracking-tight">
        {formatDate(tmpDay, tmpMonth, includeYear ? tmpYear : undefined)}
      </DialogTitle>

      <div role="group" aria-label="Fecha" className="flex gap-1">
        <ScrollColumn
          items={DAYS}
          initialIndex={tmpDay - 1}
          onChange={(i) => setTmpDay(i + 1)}
          label="Día"
          valueMin={1}
        />
        <ScrollColumn
          items={MONTHS_SHORT}
          initialIndex={tmpMonth - 1}
          onChange={(i) => setTmpMonth(i + 1)}
          label="Mes"
          valueMin={1}
          valueTextItems={MONTHS}
        />
        {includeYear && (
          <ScrollColumn
            items={YEARS}
            initialIndex={tmpYear - YEAR_START}
            onChange={(i) => setTmpYear(i + YEAR_START)}
            label="Año"
            valueMin={YEAR_START}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={includeYear}
          onCheckedChange={setIncludeYear}
          id="picker-include-year"
        />
        <label
          htmlFor="picker-include-year"
          className="text-sm cursor-pointer select-none"
        >
          Incluir año
        </label>
      </div>

      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={() => {
            onChange(tmpDay, tmpMonth, includeYear ? tmpYear : undefined);
            onClose();
          }}
        >
          Aceptar
        </Button>
      </DialogFooter>
    </>
  );
}

export function DatePickerDialog({
  open,
  day,
  month,
  year,
  onChange,
  onClose,
}: DatePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent showCloseButton={false}>
        <DatePickerDialogBody
          key={`${open}-${day}-${month}-${year ?? "sin-año"}`}
          day={day}
          month={month}
          year={year}
          onChange={onChange}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

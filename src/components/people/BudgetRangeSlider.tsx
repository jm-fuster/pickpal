"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SliderRoot,
  SliderControl,
  SliderTrack,
  SliderIndicator,
  SliderThumb,
} from "@/components/ui/slider";

const BUDGET_MAX = 500;
const BUDGET_STEP = 5;

interface BudgetRangeSliderProps {
  minValue: number | undefined;
  maxValue: number | undefined;
  onMinChange: (v: number | undefined) => void;
  onMaxChange: (v: number | undefined) => void;
  minError?: string;
  maxError?: string;
}

export function BudgetRangeSlider({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minError,
  maxError,
}: BudgetRangeSliderProps) {
  const sliderMin = Math.min(Math.max(minValue ?? 0, 0), BUDGET_MAX);
  const sliderMax = Math.min(Math.max(maxValue ?? BUDGET_MAX, 0), BUDGET_MAX);
  // useId: el componente se monta varias veces en la misma página
  // (alta + ediciones inline), un id estático colisionaría.
  const errorId = useId();
  const hasError = Boolean(minError || maxError);

  return (
    <div className="space-y-3">
      <Label>Presupuesto (opcional)</Label>

      <SliderRoot
        value={[sliderMin, sliderMax]}
        onValueChange={(values) => {
          const [lo, hi] = values as number[];
          onMinChange(lo);
          onMaxChange(hi);
        }}
        min={0}
        max={BUDGET_MAX}
        step={BUDGET_STEP}
        minStepsBetweenValues={BUDGET_STEP}
        className="py-2 pointer-coarse:py-0"
      >
        <SliderControl>
          <SliderTrack>
            <SliderIndicator />
          </SliderTrack>
          <SliderThumb getAriaLabel={() => "Presupuesto mínimo"} />
          <SliderThumb getAriaLabel={() => "Presupuesto máximo"} />
        </SliderControl>
      </SliderRoot>

      {/* Sin text-sm en los campos: con menos de 16 px, iOS amplía la página al
          enfocarlos. Heredan el text-base md:text-sm del Input. */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            step={1}
            placeholder="Mín."
            aria-label="Presupuesto mínimo (€)"
            aria-invalid={minError ? true : undefined}
            aria-describedby={hasError ? errorId : undefined}
            value={minValue ?? ""}
            onChange={(e) =>
              onMinChange(e.target.value !== "" ? Number(e.target.value) : undefined)
            }
            className="h-7 w-20 pointer-coarse:w-22"
          />
          <span className="text-muted-foreground">€</span>
        </div>
        <span className="text-muted-foreground">–</span>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            step={1}
            placeholder="Máx."
            aria-label="Presupuesto máximo (€)"
            aria-invalid={maxError ? true : undefined}
            aria-describedby={hasError ? errorId : undefined}
            value={maxValue ?? ""}
            onChange={(e) =>
              onMaxChange(e.target.value !== "" ? Number(e.target.value) : undefined)
            }
            className="h-7 w-20 pointer-coarse:w-22"
          />
          <span className="text-muted-foreground">€</span>
        </div>
      </div>

      {hasError ? (
        <p id={errorId} className="text-xs text-destructive">{minError ?? maxError}</p>
      ) : null}
    </div>
  );
}

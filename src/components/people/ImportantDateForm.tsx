"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { userErrorMessage } from "@/lib/errors";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  importantDateSchema,
  type ImportantDateFormValues,
} from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AddRowButton } from "@/components/layout/AddRowButton";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { BudgetRangeSlider } from "./BudgetRangeSlider";
import { DatePickerDialog, MONTHS, formatDate } from "./DatePickerDialog";

// ─── Main form ────────────────────────────────────────────────────────────────

export function ImportantDateForm({ personId }: { personId: Id<"people"> }) {
  const create = useMutation(api.importantDates.create);
  const [showForm, setShowForm] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ImportantDateFormValues>({
    resolver: zodResolver(importantDateSchema),
    defaultValues: { label: "", month: undefined, day: undefined, recurring: true },
  });

  const watchedDay = useWatch({ control, name: "day" });
  const watchedMonth = useWatch({ control, name: "month" });
  const watchedYear = useWatch({ control, name: "year" });
  const watchedRecurring = useWatch({ control, name: "recurring" });
  const watchedBudgetMin = useWatch({ control, name: "budgetMinEuros" });
  const watchedBudgetMax = useWatch({ control, name: "budgetMaxEuros" });

  const defaultValues = {
    label: "",
    month: undefined,
    day: undefined,
    year: undefined,
    recurring: true,
    budgetMinEuros: undefined,
    budgetMaxEuros: undefined,
  };

  const onSubmit = async (values: ImportantDateFormValues) => {
    try {
      const { budgetMinEuros, budgetMaxEuros, ...rest } = values;
      await create({
        personId,
        ...rest,
        budgetMin: budgetMinEuros !== undefined ? Math.round(budgetMinEuros * 100) : undefined,
        budgetMax: budgetMaxEuros !== undefined ? Math.round(budgetMaxEuros * 100) : undefined,
      });
      toast.success("Evento añadido");
      reset(defaultValues);
      setShowForm(false);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo añadir el evento"));
    }
  };

  const handleCancel = () => {
    reset(defaultValues);
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <AddRowButton onClick={() => setShowForm(true)}>Añadir evento</AddRowButton>
    );
  }

  return (
    <>
      {/* Mobile drum-roll picker (rendered in a portal, not inside <form>) */}
      <DatePickerDialog
        open={pickerOpen}
        day={watchedDay ?? 1}
        month={watchedMonth ?? 1}
        year={watchedYear}
        onChange={(d, m, y) => {
          setValue("day", d, { shouldValidate: true });
          setValue("month", m, { shouldValidate: true });
          setValue("year", y as number | undefined);
        }}
        onClose={() => setPickerOpen(false)}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-3 rounded-xl border border-dashed border-border/70 bg-background/40 p-4 animate-in fade-in slide-in-from-top-1 duration-200"
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Añadir evento
</p>

        {/* Etiqueta — full width on both breakpoints */}
        <div className="space-y-2">
          <Label htmlFor="date-label">Etiqueta</Label>
          <Input
            id="date-label"
            placeholder="Cumpleaños, Aniversario…"
            aria-invalid={errors.label ? true : undefined}
            aria-describedby={errors.label ? "date-label-error" : undefined}
            {...register("label")}
          />
          {errors.label ? (
            <p id="date-label-error" className="text-xs text-destructive">{errors.label.message}</p>
          ) : null}
        </div>

        {/*
          Hidden inputs keep RHF registered for day / month / year.
          Both the desktop inputs and the mobile picker write to these
          via setValue, so there's a single source of truth.
        */}
        <input type="hidden" {...register("day", { valueAsNumber: true })} />
        <input type="hidden" {...register("month", { valueAsNumber: true })} />
        <input
          type="hidden"
          {...register("year", {
            setValueAs: (v) =>
              v === "" || v === null || v === undefined ? undefined : Number(v),
          })}
        />

        {/* ── Desktop: three inline inputs ── */}
        <div className="hidden md:grid md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="date-day-desktop">Día</Label>
            <Input
              id="date-day-desktop"
              type="number"
              min={1}
              max={31}
              placeholder="Día"
              value={watchedDay ?? ""}
              onChange={(e) =>
                setValue("day", e.target.value ? Number(e.target.value) : 1, {
                  shouldValidate: true,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-month-desktop">Mes</Label>
            <Select
              value={watchedMonth ? String(watchedMonth) : ""}
              onValueChange={(v) => {
                if (v) setValue("month", Number(v), { shouldValidate: true });
              }}
            >
              <SelectTrigger
                id="date-month-desktop"
                aria-invalid={errors.month ? true : undefined}
                aria-describedby={errors.month ? "date-dmy-error" : undefined}
                className="w-full"
              >
                <span>{watchedMonth ? MONTHS[watchedMonth - 1] : "Mes"}</span>
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-year-desktop">Año (opcional)</Label>
            <Input
              id="date-year-desktop"
              type="number"
              min={1900}
              max={2100}
              placeholder="Año (opcional)"
              value={watchedYear ?? ""}
              onChange={(e) =>
                setValue("year", e.target.value ? Number(e.target.value) : undefined)
              }
            />
          </div>
          {errors.day || errors.month || errors.year ? (
            <p id="date-dmy-error" className="text-xs text-destructive md:col-span-3">
              {errors.day?.message ?? errors.month?.message ?? errors.year?.message}
            </p>
          ) : null}
        </div>

        {/* ── Mobile: single button that opens drum-roll picker ── */}
        <div className="md:hidden space-y-2">
          <Label>Fecha</Label>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={`h-8 w-full rounded-md border bg-background px-3 text-sm text-left transition-colors hover:bg-muted/50 ${!watchedDay || !watchedMonth ? "text-subtle-foreground" : ""}`}
          >
            {watchedDay && watchedMonth
              ? formatDate(watchedDay, watchedMonth, watchedYear)
              : "Selecciona fecha"}
          </button>
          {errors.day || errors.month || errors.year ? (
            <p className="text-xs text-destructive">
              {errors.day?.message ?? errors.month?.message ?? errors.year?.message}
            </p>
          ) : null}
        </div>

        {/* Recurrencia */}
        <div className="space-y-2 max-w-[14rem]">
          <Label>Recurrencia</Label>
          <Select
            value={watchedRecurring === false ? "false" : "true"}
            onValueChange={(v) => { if (v) setValue("recurring", v === "true"); }}
          >
            <SelectTrigger className="w-full">
              <span>{watchedRecurring === false ? "Fecha única" : "Todos los años"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Todos los años</SelectItem>
              <SelectItem value="false">Fecha única</SelectItem>
            </SelectContent>
          </Select>
          {watchedRecurring === false && !watchedYear ? (
            <p className="text-xs text-muted-foreground">
              Indica el año en el campo Año (obligatorio para fechas únicas).
            </p>
          ) : null}
        </div>

        {/* Hidden RHF registrations for budget fields */}
        <input
          type="hidden"
          {...register("budgetMinEuros", {
            setValueAs: (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
          })}
        />
        <input
          type="hidden"
          {...register("budgetMaxEuros", {
            setValueAs: (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
          })}
        />

        {/* Presupuesto */}
        <BudgetRangeSlider
          minValue={watchedBudgetMin}
          maxValue={watchedBudgetMax}
          onMinChange={(v) => setValue("budgetMinEuros", v)}
          onMaxChange={(v) => setValue("budgetMaxEuros", v)}
          minError={errors.budgetMinEuros?.message}
          maxError={errors.budgetMaxEuros?.message}
        />

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Añadir evento"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
}

// ─── Inline edit form ─────────────────────────────────────────────────────────

type DateDoc = {
  _id: Id<"importantDates">;
  label: string;
  month: number;
  day: number;
  year?: number;
  recurring?: boolean;
  budgetMin?: number;
  budgetMax?: number;
};

export function EditImportantDateInline({
  date,
  onClose,
}: {
  date: DateDoc;
  onClose: () => void;
}) {
  const update = useMutation(api.importantDates.update);
  const [pickerOpen, setPickerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ImportantDateFormValues>({
    resolver: zodResolver(importantDateSchema),
    defaultValues: {
      label: date.label,
      month: date.month,
      day: date.day,
      year: date.year,
      recurring: date.recurring ?? true,
      budgetMinEuros: date.budgetMin !== undefined ? date.budgetMin / 100 : undefined,
      budgetMaxEuros: date.budgetMax !== undefined ? date.budgetMax / 100 : undefined,
    },
  });

  const watchedDay = useWatch({ control, name: "day" });
  const watchedMonth = useWatch({ control, name: "month" });
  const watchedRecurring = useWatch({ control, name: "recurring" });
  const watchedYear = useWatch({ control, name: "year" });
  const watchedBudgetMin = useWatch({ control, name: "budgetMinEuros" });
  const watchedBudgetMax = useWatch({ control, name: "budgetMaxEuros" });

  const onSubmit = async (values: ImportantDateFormValues) => {
    try {
      const { budgetMinEuros, budgetMaxEuros, ...rest } = values;
      await update({
        id: date._id,
        ...rest,
        budgetMin: budgetMinEuros !== undefined ? Math.round(budgetMinEuros * 100) : undefined,
        budgetMax: budgetMaxEuros !== undefined ? Math.round(budgetMaxEuros * 100) : undefined,
      });
      toast.success("Evento actualizado");
      onClose();
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo actualizar el evento"));
    }
  };

  return (
    <>
      <DatePickerDialog
        open={pickerOpen}
        day={watchedDay ?? 1}
        month={watchedMonth ?? 1}
        year={watchedYear}
        onChange={(d, m, y) => {
          setValue("day", d, { shouldValidate: true });
          setValue("month", m, { shouldValidate: true });
          setValue("year", y as number | undefined);
        }}
        onClose={() => setPickerOpen(false)}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-3 rounded-lg border border-primary/40 bg-background/80 p-3 text-sm animate-in fade-in slide-in-from-top-1 duration-200"
      >
      {/* Etiqueta */}
      <div className="space-y-2">
        <Label htmlFor="edit-label">Etiqueta</Label>
        <Input
          id="edit-label"
          aria-invalid={errors.label ? true : undefined}
          aria-describedby={errors.label ? "edit-label-error" : undefined}
          {...register("label")}
        />
        {errors.label && <p id="edit-label-error" className="text-xs text-destructive">{errors.label.message}</p>}
      </div>

      {/* Hidden RHF registrations */}
      <input type="hidden" {...register("day", { valueAsNumber: true })} />
      <input type="hidden" {...register("month", { valueAsNumber: true })} />
      <input type="hidden" {...register("year", {
        setValueAs: (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      })} />

      {/* Fecha — desktop: tres columnas; móvil: botón que abre el picker */}
      <div className="space-y-2">
        <Label>Fecha</Label>
        <div className="hidden md:grid md:grid-cols-3 gap-2">
          <Input
            type="number"
            min={1}
            max={31}
            placeholder="Día"
            value={watchedDay ?? ""}
            onChange={(e) =>
              setValue("day", e.target.value ? Number(e.target.value) : 1, { shouldValidate: true })
            }
          />
          <Select
            value={String(watchedMonth ?? 1)}
            onValueChange={(v) => { if (v) setValue("month", Number(v), { shouldValidate: true }); }}
          >
            <SelectTrigger
              aria-label="Mes"
              aria-invalid={errors.month ? true : undefined}
              aria-describedby={errors.month ? "edit-dmy-error" : undefined}
              className="w-full"
            >
              <span>{MONTHS[(watchedMonth ?? 1) - 1]}</span>
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1900}
            max={2100}
            placeholder="Año (opc.)"
            value={watchedYear ?? ""}
            onChange={(e) =>
              setValue("year", e.target.value ? Number(e.target.value) : undefined)
            }
          />
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={`md:hidden h-8 w-full rounded-md border bg-background px-3 text-sm text-left transition-colors hover:bg-muted/50 ${!watchedDay || !watchedMonth ? "text-subtle-foreground" : ""}`}
        >
          {watchedDay && watchedMonth
            ? formatDate(watchedDay, watchedMonth, watchedYear)
            : "Selecciona fecha"}
        </button>
        {(errors.day || errors.month || errors.year) && (
          <p id="edit-dmy-error" className="text-xs text-destructive">
            {errors.day?.message ?? errors.month?.message ?? errors.year?.message}
          </p>
        )}
      </div>

      {/* Recurrencia */}
      <div className="space-y-2 max-w-[14rem]">
        <Label>Recurrencia</Label>
        <Select
          value={watchedRecurring === false ? "false" : "true"}
          onValueChange={(v) => { if (v) setValue("recurring", v === "true"); }}
        >
          <SelectTrigger aria-label="Recurrencia" className="w-full">
            <span>{watchedRecurring === false ? "Fecha única" : "Todos los años"}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">
              <span className="flex flex-col items-start gap-1 whitespace-normal py-1">
                <span className="font-medium leading-tight">Todos los años</span>
                <span className="text-xs text-muted-foreground leading-tight">
                  Se repite cada año (cumpleaños, aniversarios…)
                </span>
              </span>
            </SelectItem>
            <SelectItem value="false">
              <span className="flex flex-col items-start gap-1 whitespace-normal py-1">
                <span className="font-medium leading-tight">Fecha única</span>
                <span className="text-xs text-muted-foreground leading-tight">
                  Solo en esta fecha concreta (boda, viaje…)
                </span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {watchedRecurring === false && !watchedYear && (
          <p className="text-xs text-muted-foreground">
            Indica el año (obligatorio para fechas únicas).
          </p>
        )}
      </div>

      {/* Presupuesto */}
      <input type="hidden" {...register("budgetMinEuros", {
        setValueAs: (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      })} />
      <input type="hidden" {...register("budgetMaxEuros", {
        setValueAs: (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      })} />
      <BudgetRangeSlider
        minValue={watchedBudgetMin}
        maxValue={watchedBudgetMax}
        onMinChange={(v) => setValue("budgetMinEuros", v)}
        onMaxChange={(v) => setValue("budgetMaxEuros", v)}
        minError={errors.budgetMinEuros?.message}
        maxError={errors.budgetMaxEuros?.message}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
      </div>
      </form>
    </>
  );
}

"use client";

import { useState } from "react";
import {
  useForm,
  Controller,
  useFieldArray,
  useWatch,
  type Control,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { userErrorMessage } from "@/lib/errors";
import { CalendarDays, CalendarX2, Camera, Plus, Repeat2, Ruler, Shuffle, Trash2, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  personFormSchema,
  importantDateSchema,
  type PersonFormValues,
  type ImportantDateFormValues,
  RELATIONSHIPS,
} from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

import { InterestTagInput } from "./InterestTagInput";
import { BrandTagInput } from "./BrandTagInput";
import { AiNotesNotice } from "./AiNotesNotice";
import { randomAvatarUrl } from "./AvatarPicker";
import { AvatarPickerDialog } from "./AvatarPickerDialog";
import { BudgetRangeSlider } from "./BudgetRangeSlider";
import { DatePickerDialog, MONTHS, formatDate as formatEventDate } from "./DatePickerDialog";

// ─── Inline add-event form ────────────────────────────────────────────────────

function AddEventForm({
  onAdd,
  onCancel,
}: {
  onAdd: (values: ImportantDateFormValues) => void;
  onCancel: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ImportantDateFormValues>({
    resolver: zodResolver(importantDateSchema),
    defaultValues: {
      label: "",
      month: undefined as unknown as number,
      day: undefined as unknown as number,
      year: undefined,
      recurring: true,
      budgetMinEuros: undefined,
      budgetMaxEuros: undefined,
    },
  });

  const watchedBudgetMin = useWatch({ control, name: "budgetMinEuros" });
  const watchedBudgetMax = useWatch({ control, name: "budgetMaxEuros" });
  const watchedRecurring = useWatch({ control, name: "recurring" });
  const watchedYear = useWatch({ control, name: "year" });
  const watchedMonth = useWatch({ control, name: "month" });
  const watchedDay = useWatch({ control, name: "day" });

  return (
    <div
      className="space-y-3 rounded-lg bg-background/60 p-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200"
      onKeyDown={(e) => {
        // AddEventForm es un <div> dentro del <form> de PersonForm (no se pueden
        // anidar <form> en HTML). Sin esto, pulsar Enter en cualquier input
        // dispara el submit implícito del form EXTERIOR → crea la persona con la
        // fecha a medias y navega a su ficha, impidiendo añadir más de una al
        // crear. Interceptamos Enter en los inputs para que confirme el evento
        // (mismo comportamiento que el Enter de un <form> real, como en
        // ImportantDateForm), no la persona.
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
          e.preventDefault();
          handleSubmit(onAdd)();
        }
      }}
    >
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

      {/* Etiqueta */}
      <div className="space-y-2">
        <Label htmlFor="ae-label" className="text-xs">Etiqueta</Label>
        <Input
          id="ae-label"
          placeholder="Cumpleaños, Aniversario…"
          aria-invalid={errors.label ? true : undefined}
          aria-describedby={errors.label ? "ae-label-error" : undefined}
          {...register("label")}
        />
        {errors.label ? (
          <p id="ae-label-error" className="text-xs text-destructive">{errors.label.message}</p>
        ) : null}
      </div>

      {/* Hidden RHF registrations — kept in sync from desktop inputs and mobile picker */}
      <input type="hidden" {...register("day", { valueAsNumber: true })} />
      <input type="hidden" {...register("month", { valueAsNumber: true })} />
      <input
        type="hidden"
        {...register("year", {
          setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
        })}
      />

      {/* Desktop: día / mes / año en línea */}
      <div className="hidden md:grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ae-day" className="text-xs">Día</Label>
          <Input
            id="ae-day"
            type="number"
            min={1}
            max={31}
            placeholder="Día"
            aria-invalid={errors.day ? true : undefined}
            aria-describedby={errors.day ? "ae-day-error" : undefined}
            value={watchedDay ?? ""}
            onChange={(e) =>
              setValue("day", e.target.value ? Number(e.target.value) : 1, {
                shouldValidate: true,
              })
            }
          />
          {errors.day ? (
            <p id="ae-day-error" className="text-xs text-destructive">{errors.day.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Mes</Label>
          <Select
            value={watchedMonth ? String(watchedMonth) : ""}
            onValueChange={(v) => { if (v) setValue("month", Number(v), { shouldValidate: true }); }}
          >
            <SelectTrigger
              aria-label="Mes"
              aria-invalid={errors.month ? true : undefined}
              aria-describedby={errors.month ? "ae-month-error" : undefined}
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
          {errors.month ? (
            <p id="ae-month-error" className="text-xs text-destructive">{errors.month.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ae-year" className="text-xs">Año (opc.)</Label>
          <Input
            id="ae-year"
            type="number"
            min={1900}
            max={2100}
            placeholder="Año"
            aria-invalid={errors.year ? true : undefined}
            aria-describedby={errors.year ? "ae-year-error" : undefined}
            value={watchedYear ?? ""}
            onChange={(e) =>
              setValue("year", e.target.value ? Number(e.target.value) : undefined)
            }
          />
          {errors.year ? (
            <p id="ae-year-error" className="text-xs text-destructive">{errors.year.message}</p>
          ) : null}
        </div>
      </div>

      {/* Móvil: un único botón que abre el drum-roll picker */}
      <div className="md:hidden space-y-2">
        <Label className="text-xs">Fecha</Label>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={`h-8 w-full rounded-md border bg-background px-3 text-sm text-left transition-colors hover:bg-muted/50 ${!watchedDay || !watchedMonth ? "text-subtle-foreground" : ""}`}
        >
          {watchedDay && watchedMonth
            ? formatEventDate(watchedDay, watchedMonth, watchedYear)
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
        <Label className="text-xs">Recurrencia</Label>
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
        {watchedRecurring === false && !watchedYear ? (
          <p className="text-xs text-muted-foreground">
            Indica el año (obligatorio para fechas únicas).
          </p>
        ) : null}
      </div>

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
        <Button type="button" size="sm" onClick={handleSubmit(onAdd)}>Añadir evento</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ─── Events section ───────────────────────────────────────────────────────────

function EventsSection({
  control,
}: {
  control: Control<PersonFormValues>;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const { fields, append, remove } = useFieldArray({ control, name: "dates" });

  const handleAdd = (values: ImportantDateFormValues) => {
    append(values);
    setShowAddForm(false);
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <CalendarDays className="size-3.5" aria-hidden />
          Eventos
        </h2>
        <p className="text-xs text-muted-foreground">
          Fechas que no quieres olvidar, cada una con su presupuesto.
        </p>

        {/* List of added events */}
        {fields.map((field, idx) => {
          const min = field.budgetMinEuros;
          const max = field.budgetMaxEuros;
          const hasBudget = min !== undefined || max !== undefined;
          const budgetText =
            min !== undefined && max !== undefined
              ? `${min}€ – ${max}€`
              : min !== undefined
                ? `desde ${min}€`
                : max !== undefined
                  ? `hasta ${max}€`
                  : null;
          return (
            <div
              key={field.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{field.label}</span>
                  {field.recurring === false ? (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <CalendarX2 className="size-3" aria-hidden />Única
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <Repeat2 className="size-3" aria-hidden />Anual
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatEventDate(field.day, field.month, field.year)}
                </p>
                {hasBudget && budgetText ? (
                  <p className="text-xs text-muted-foreground">
                    Presupuesto: {budgetText}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => remove(idx)}
                aria-label="Quitar evento"
                className="shrink-0"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        })}

        {/* Add form or button */}
        {showAddForm ? (
          <AddEventForm
            onAdd={handleAdd}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-input/50 p-3 text-sm text-muted-foreground transition-colors hover:border-input hover:bg-muted/40 hover:text-foreground"
          >
            <Plus className="size-4" aria-hidden />
            Añadir evento
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface PersonFormProps {
  defaultValues?: Partial<PersonFormValues>;
  onSubmit: (values: PersonFormValues) => Promise<void>;
  submitLabel: string;
  includeDates?: boolean;
  onCancel?: () => void;
}

export function PersonForm({
  defaultValues,
  onSubmit,
  submitLabel,
  includeDates = false,
  onCancel,
}: PersonFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
      name: "",
      relationship: "friend",
      interests: [],
      favoriteBrands: [],
      notes: "",
      dates: [],
      avatarUrl: undefined,
      ...defaultValues,
    },
  });

  // Para mostrar las iniciales en el preview del avatar mientras se teclea el nombre.
  const watchedName = useWatch({ control, name: "name" });

  const submit = async (values: PersonFormValues) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo guardar"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* ── Left column: identity card ── */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="space-y-5 p-5">
            <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
              <UserRound className="size-3.5" aria-hidden />
              Quién es
            </h2>
            <p className="text-xs text-muted-foreground">
              Quién es y qué le gusta. Cuanto mejor la describas, más acertarán las sugerencias de regalo.
            </p>

            <div className="space-y-2">
              <Label>Avatar</Label>
              <Controller
                name="avatarUrl"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-4">
                    <Avatar className="size-16 ring-1 ring-border">
                      {field.value ? <AvatarImage src={field.value} alt="" /> : null}
                      <AvatarFallback>
                        {watchedName?.trim() ? (
                          watchedName.trim().slice(0, 2).toUpperCase()
                        ) : (
                          <UserRound className="size-6 text-muted-foreground" aria-hidden />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-wrap gap-2">
                      <AvatarPickerDialog
                        value={field.value}
                        onChange={field.onChange}
                        trigger={
                          <Button type="button" variant="outline" size="sm" className="gap-2">
                            <Camera className="size-3.5" aria-hidden />
                            {field.value ? "Cambiar avatar" : "Elegir avatar"}
                          </Button>
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => field.onChange(randomAvatarUrl())}
                        className="gap-2"
                      >
                        <Shuffle className="size-3.5" aria-hidden />
                        Aleatorio
                      </Button>
                    </div>
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...register("name")}
              />
              {errors.name ? (
                <p id="name-error" className="text-xs text-destructive">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Relación</Label>
              <Controller
                name="relationship"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Relación" className="w-full">
                      <span>
                        {RELATIONSHIPS.find((r) => r.value === field.value)?.label ?? "Selecciona relación"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Intereses</Label>
              <Controller
                name="interests"
                control={control}
                render={({ field }) => (
                  <InterestTagInput value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.interests ? (
                <p className="text-xs text-destructive">
                  {errors.interests.message as string}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Marcas favoritas</Label>
              <Controller
                name="favoriteBrands"
                control={control}
                render={({ field }) => (
                  <BrandTagInput value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.favoriteBrands ? (
                <p className="text-xs text-destructive">
                  {errors.favoriteBrands.message as string}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder="Contexto, anécdotas, lo que se te ocurra…"
                {...register("notes")}
              />
              <AiNotesNotice />
            </div>
          </CardContent>
        </Card>

        {/* ── Right column: practical info card + events card ── */}
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
                <Ruler className="size-3.5" aria-hidden />
                Datos prácticos
              </h2>
              <p className="text-xs text-muted-foreground">
                Tallas y restricciones para que la IA no sugiera nada que no se
                pueda usar.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shoeSize">Talla de zapato</Label>
                  <Input id="shoeSize" placeholder="EU 42, 38…" {...register("shoeSize")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clothingSize">Talla de ropa</Label>
                  <Input id="clothingSize" placeholder="M, L, 38…" {...register("clothingSize")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergies">Alergias o restricciones</Label>
                <Textarea
                  id="allergies"
                  rows={2}
                  placeholder="Frutos secos, gluten, látex…"
                  {...register("allergies")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dislikes">Cosas que no le gustan</Label>
                <Textarea
                  id="dislikes"
                  rows={2}
                  placeholder="Color amarillo, perfumes fuertes, libros de autoayuda…"
                  {...register("dislikes")}
                />
              </div>
            </CardContent>
          </Card>

          {includeDates ? <EventsSection control={control} /> : null}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Guardando…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}

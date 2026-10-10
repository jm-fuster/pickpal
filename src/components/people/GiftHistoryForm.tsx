"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { userErrorMessage } from "@/lib/errors";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { giftHistorySchema, REACTIONS } from "@/lib/schemas";
import type { GiftHistoryFormValues } from "@/lib/schemas";
import { AddRowButton } from "@/components/layout/AddRowButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const DEFAULT_VALUES = { giftName: "", occasionLabel: "", reaction: "", year: undefined as number | undefined, notes: "" };

export function GiftHistoryForm({ personId }: { personId: Id<"people"> }) {
  const [showForm, setShowForm] = useState(false);
  const create = useMutation(api.giftHistory.create);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(giftHistorySchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = async (values: GiftHistoryFormValues) => {
    try {
      await create({
        personId,
        giftName: values.giftName,
        occasionLabel: values.occasionLabel,
        year: values.year,
        reaction: values.reaction as "loved" | "ok" | "bad",
        notes: values.notes || undefined,
      });
      toast.success("Regalo añadido al historial");
      reset(DEFAULT_VALUES);
      setShowForm(false);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo añadir el regalo"));
    }
  };

  const handleCancel = () => {
    reset({ ...DEFAULT_VALUES, year: undefined, notes: "" });
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <AddRowButton onClick={() => setShowForm(true)}>Añadir regalo</AddRowButton>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-xl border border-dashed border-border/70 bg-background/40 p-4 animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Añadir regalo pasado
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gh-name">Regalo</Label>
          <Input
            id="gh-name"
            placeholder="Libro de recetas, auriculares…"
            aria-invalid={errors.giftName ? true : undefined}
            aria-describedby={errors.giftName ? "gh-name-error" : undefined}
            {...register("giftName")}
          />
          {errors.giftName ? (
            <p id="gh-name-error" className="text-xs text-destructive">{errors.giftName.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gh-occasion">Ocasión</Label>
          <Input
            id="gh-occasion"
            placeholder="Cumpleaños, Navidad…"
            aria-invalid={errors.occasionLabel ? true : undefined}
            aria-describedby={errors.occasionLabel ? "gh-occasion-error" : undefined}
            {...register("occasionLabel")}
          />
          {errors.occasionLabel ? (
            <p id="gh-occasion-error" className="text-xs text-destructive">{errors.occasionLabel.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="gh-year">Año (opcional)</Label>
          <Input
            id="gh-year"
            type="number"
            min={1900}
            max={2100}
            placeholder="2023"
            aria-invalid={errors.year ? true : undefined}
            aria-describedby={errors.year ? "gh-year-error" : undefined}
            {...register("year", {
              setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
            })}
          />
          {errors.year ? (
            <p id="gh-year-error" className="text-xs text-destructive">{errors.year.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Reacción</Label>
          <Controller
            name="reaction"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  aria-label="Reacción"
                  aria-invalid={errors.reaction ? true : undefined}
                  aria-describedby={errors.reaction ? "gh-reaction-error" : undefined}
                >
                  <span className={!field.value ? "text-subtle-foreground" : ""}>
                    {REACTIONS.find((r) => r.value === field.value)?.label ?? "Reacción…"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {REACTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.reaction ? (
            <p id="gh-reaction-error" className="text-xs text-destructive">{errors.reaction.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gh-notes">Notas (opcional)</Label>
        <Textarea
          id="gh-notes"
          rows={2}
          placeholder="Le encantó el color, pero la talla era equivocada…"
          {...register("notes")}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Añadir al historial"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={handleCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function EditGiftHistoryInline({
  entry,
  onClose,
}: {
  entry: Doc<"giftHistory">;
  onClose: () => void;
}) {
  const update = useMutation(api.giftHistory.update);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(giftHistorySchema),
    defaultValues: {
      giftName: entry.giftName,
      occasionLabel: entry.occasionLabel,
      year: entry.year,
      reaction: entry.reaction,
      notes: entry.notes ?? "",
    },
  });

  const onSubmit = async (values: GiftHistoryFormValues) => {
    try {
      await update({
        id: entry._id,
        giftName: values.giftName,
        occasionLabel: values.occasionLabel,
        year: values.year,
        reaction: values.reaction as "loved" | "ok" | "bad",
        notes: values.notes || undefined,
      });
      toast.success("Regalo actualizado");
      onClose();
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo actualizar el regalo"));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-xl border border-dashed border-border/70 bg-background/40 p-4 animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Editar regalo
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ghe-name">Regalo</Label>
          <Input
            id="ghe-name"
            placeholder="Libro de recetas, auriculares…"
            aria-invalid={errors.giftName ? true : undefined}
            aria-describedby={errors.giftName ? "ghe-name-error" : undefined}
            {...register("giftName")}
          />
          {errors.giftName ? (
            <p id="ghe-name-error" className="text-xs text-destructive">{errors.giftName.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ghe-occasion">Ocasión</Label>
          <Input
            id="ghe-occasion"
            placeholder="Cumpleaños, Navidad…"
            aria-invalid={errors.occasionLabel ? true : undefined}
            aria-describedby={errors.occasionLabel ? "ghe-occasion-error" : undefined}
            {...register("occasionLabel")}
          />
          {errors.occasionLabel ? (
            <p id="ghe-occasion-error" className="text-xs text-destructive">{errors.occasionLabel.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ghe-year">Año (opcional)</Label>
          <Input
            id="ghe-year"
            type="number"
            min={1900}
            max={2100}
            placeholder="2023"
            aria-invalid={errors.year ? true : undefined}
            aria-describedby={errors.year ? "ghe-year-error" : undefined}
            {...register("year", {
              setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
            })}
          />
          {errors.year ? (
            <p id="ghe-year-error" className="text-xs text-destructive">{errors.year.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Reacción</Label>
          <Controller
            name="reaction"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  aria-label="Reacción"
                  aria-invalid={errors.reaction ? true : undefined}
                  aria-describedby={errors.reaction ? "ghe-reaction-error" : undefined}
                >
                  <span className={!field.value ? "text-subtle-foreground" : ""}>
                    {REACTIONS.find((r) => r.value === field.value)?.label ?? "Reacción…"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {REACTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.reaction ? (
            <p id="ghe-reaction-error" className="text-xs text-destructive">{errors.reaction.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ghe-notes">Notas (opcional)</Label>
        <Textarea
          id="ghe-notes"
          rows={2}
          placeholder="Le encantó el color, pero la talla era equivocada…"
          {...register("notes")}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

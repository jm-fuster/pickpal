"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DatePickerDialog, formatDate } from "@/components/people/DatePickerDialog";
import { RELATIONSHIPS } from "@/lib/options";
import { userErrorMessage } from "@/lib/errors";

/** Un nacimiento sin responder, tal como lo devuelve `birthOffers.pending`. */
export type BirthOfferSubject = {
  importantDateId: Id<"importantDates">;
  label: string;
  month: number;
  day: number;
  year: number;
  personName: string;
  relationship: string;
  babyName: string;
};

/**
 * Hacerle su ficha al bebé, ya rellena (opción C de `Playground · Baby
 * profile offer`, 21-nov-2026): el nombre sale de la etiqueta («Nacimiento de
 * Leo»), la relación es la de su madre o su padre y la fecha, la del evento,
 * que suele ser la prevista y por eso se puede cambiar. Las acciones van en
 * `default`, a la altura de los campos (docs/design-system.md · Buttons).
 */
export function BirthProfileSheet({
  subject,
  open,
  onOpenChange,
}: {
  subject: BirthOfferSubject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createProfile = useMutation(api.birthOffers.createProfile);
  const [name, setName] = useState(subject.babyName);
  const [relationship, setRelationship] = useState(subject.relationship);
  const [date, setDate] = useState({ day: subject.day, month: subject.month, year: subject.year });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const relationshipLabel = RELATIONSHIPS.find((r) => r.value === relationship)?.label ?? relationship;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const personId = await createProfile({
        importantDateId: subject.importantDateId,
        name: name.trim(),
        relationship,
        ...date,
      });
      onOpenChange(false);
      toast.success(`Ficha de ${name.trim()} creada`, {
        action: { label: "Verla", onClick: () => router.push(`/seres-queridos/${personId}`) },
      });
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo crear la ficha. Inténtalo de nuevo."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-[90dvh] w-full max-w-lg gap-0 overflow-y-auto rounded-t-2xl px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-9 shrink-0 rounded-full bg-input/50" />
        <SheetTitle className="font-heading text-xl leading-tight font-semibold">
          {name.trim() ? `La ficha de ${name.trim()}` : "Su ficha"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Crea una ficha para el bebé con su cumpleaños.
        </SheetDescription>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bebe-nombre">Nombre</Label>
            <Input
              id="bebe-nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Su nombre"
              autoComplete="off"
              maxLength={60}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bebe-relacion">Relación</Label>
            <Select value={relationship} onValueChange={(v) => v && setRelationship(v)}>
              <SelectTrigger id="bebe-relacion" className="w-full">
                <span>{relationshipLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bebe-fecha">¿Cuándo nació?</Label>
            <button
              id="bebe-fecha"
              type="button"
              onClick={() => setPickerOpen(true)}
              className="h-8 w-full rounded-md border bg-background px-3 text-left text-sm transition-colors hover:bg-muted/50 pointer-coarse:h-11"
            >
              {formatDate(date.day, date.month, date.year)}
            </button>
            <p className="text-xs text-muted-foreground">
              Es la fecha que apuntaste para el nacimiento; cámbiala si nació otro día. Su
              cumpleaños queda apuntado para cada año.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving || !name.trim()} className="hover:bg-primary/80">
              {saving ? "Creando…" : "Crear su ficha"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </form>
        <DatePickerDialog
          open={pickerOpen}
          day={date.day}
          month={date.month}
          year={date.year}
          onChange={(day, month, year) => setDate({ day, month, year: year ?? date.year })}
          onClose={() => setPickerOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

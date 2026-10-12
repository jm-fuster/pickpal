"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { PencilLine } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { formatDayMonth } from "@/lib/dates";
import { userErrorMessage } from "@/lib/errors";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Tu cumpleaños, para quien lee tu lista: lo ve en tu lista dentro de su ficha
 * y puede añadirlo como fecha con un toque. Solo día y mes; el año no hace
 * falta para regalar y es un dato que no tiene por qué saber nadie.
 */
export function OwnerBirthday() {
  const { isLoaded, isSignedIn } = useAuth();
  const birthday = useQuery(api.lists.myBirthday, isLoaded && isSignedIn ? {} : "skip");
  const setBirthday = useMutation(api.lists.setBirthday);
  const [editing, setEditing] = useState(false);
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  if (birthday === undefined) return null;

  const open = () => {
    setMonth(birthday?.month ?? null);
    setDay(birthday?.day ?? null);
    setEditing(true);
  };

  const save = async (value: { month: number; day: number } | null) => {
    setSaving(true);
    try {
      await setBirthday({ birthday: value });
      setEditing(false);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo guardar tu cumpleaños"));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    const maxDay = month ? DAYS_IN_MONTH[month - 1] : 31;
    const validDay = day !== null && day <= maxDay ? day : null;
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
        <p className="text-sm font-medium">Tu cumpleaños, para quien te regala</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cumple-dia" className="text-xs text-muted-foreground">Día</Label>
            <Select value={validDay ? String(validDay) : ""} onValueChange={(v) => setDay(v ? Number(v) : null)}>
              <SelectTrigger id="cumple-dia" size="sm" className="w-20">
                <span>{validDay ?? "—"}</span>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxDay }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cumple-mes" className="text-xs text-muted-foreground">Mes</Label>
            <Select value={month ? String(month) : ""} onValueChange={(v) => setMonth(v ? Number(v) : null)}>
              <SelectTrigger id="cumple-mes" size="sm" className="w-36">
                <span>{month ? MONTHS[month - 1] : "—"}</span>
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {birthday && (
            <Button variant="ghost" size="sm" onClick={() => save(null)} disabled={saving}>
              Quitarlo
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="hover:bg-primary/80"
            disabled={saving || !month || !validDay}
            onClick={() => month && validDay && save({ month, day: validDay })}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    );
  }

  if (!birthday) {
    return (
      <button
        type="button"
        onClick={open}
        className="w-fit text-left text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        Añadir tu cumpleaños para quien te regala
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <p className="min-w-0 flex-1 text-muted-foreground">
        <span className="text-foreground">Tu cumpleaños:</span> {formatDayMonth(birthday.month, birthday.day)}
      </p>
      <Button variant="ghost" size="icon-sm" aria-label="Editar tu cumpleaños" title="Editar" onClick={open}>
        <PencilLine className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}

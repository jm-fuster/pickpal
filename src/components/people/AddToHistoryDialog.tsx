"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { REACTIONS } from "@/lib/schemas";
import { userErrorMessage } from "@/lib/errors";

export type HistoryValues = {
  occasionLabel: string;
  reaction: "loved" | "ok" | "bad";
  year?: number;
  notes?: string;
};

const MAX_OCCASION = 40;

/**
 * Pasar al historial de regalos algo que ya se ha regalado. Lo usan las ideas
 * guardadas («Lo regalé») y los elementos marcados de una lista ajena («Ya se
 * lo he regalado», decisión 16 de docs/encargo-lista.md).
 *
 * Una idea guardada trae su ocasión y no se pregunta. Un elemento de lista no
 * tiene: se propone `defaultOccasion` (la fecha de la ficha más cercana a hoy)
 * y se puede cambiar.
 *
 * El estado se siembra al montar; quien lo usa le pone `key` por elemento
 * para que cada apertura empiece en blanco.
 */
export function AddToHistoryDialog({
  gift,
  fixedOccasion,
  defaultOccasion = "",
  onClose,
  onConfirm,
}: {
  /** `null` = cerrado. */
  gift: { title: string } | null;
  /** Ocasión que ya trae el regalo (ideas guardadas). Si existe, no se pregunta. */
  fixedOccasion?: string;
  defaultOccasion?: string;
  onClose: () => void;
  onConfirm: (values: HistoryValues) => Promise<void>;
}) {
  const [occasion, setOccasion] = useState(fixedOccasion ?? defaultOccasion);
  const [reaction, setReaction] = useState("");
  const [year, setYear] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const occasionLabel = (fixedOccasion ?? occasion).trim();

  const handleConfirm = async () => {
    if (!reaction || !occasionLabel) return;
    // El <input type=number> no impide teclear años fuera de [1900, 2100]; sin
    // este guard el server los rechaza con un toast genérico. Validamos antes
    // para dar un mensaje preciso.
    const parsedYear = year ? parseInt(year, 10) : undefined;
    if (
      parsedYear !== undefined &&
      (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2100)
    ) {
      toast.error("El año debe estar entre 1900 y 2100.");
      return;
    }
    setSaving(true);
    try {
      await onConfirm({
        occasionLabel,
        reaction: reaction as HistoryValues["reaction"],
        year: parsedYear,
        notes: notes || undefined,
      });
      toast.success("Añadido al historial de regalos");
      onClose();
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo guardar en el historial"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={gift !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir al historial de regalos</DialogTitle>
          <DialogDescription>
            {gift?.title}
            {fixedOccasion ? ` · ${fixedOccasion}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {fixedOccasion === undefined && (
            <div className="space-y-2">
              <Label htmlFor="history-occasion">Ocasión</Label>
              <Input
                id="history-occasion"
                maxLength={MAX_OCCASION}
                placeholder="Cumpleaños, Navidad…"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Reacción</Label>
            <Select value={reaction} onValueChange={(v) => setReaction(v ?? "")}>
              <SelectTrigger aria-label="Reacción">
                <SelectValue placeholder="¿Cómo le sentó?" />
              </SelectTrigger>
              <SelectContent>
                {REACTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="history-year">Año (opcional)</Label>
            <Input
              id="history-year"
              type="number"
              min={1900}
              max={2100}
              placeholder={String(new Date().getFullYear())}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="history-notes">Notas (opcional)</Label>
            <Textarea
              id="history-notes"
              rows={2}
              placeholder="Le encantó, pero la talla era pequeña…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={saving}>Cancelar</Button>} />
          <Button
            onClick={handleConfirm}
            disabled={saving || !reaction || !occasionLabel}
            className="hover:bg-primary/80"
          >
            {saving ? "Guardando…" : "Añadir al historial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

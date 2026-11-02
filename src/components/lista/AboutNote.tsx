"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { userErrorMessage } from "@/lib/errors";

/** Espejo del tope de `lists.setAbout`. */
const MAX_ABOUT = 300;

/**
 * «Una nota para quien te regala»: una sola línea de la dueña para todos sus
 * lectores («Nada de ropa sin preguntar», «Prefiero experiencias»). Vive dentro
 * de la card de la lista, no en una card aparte, y quien la lee la ve citada en
 * su ficha. No es sitio para una dirección: no se pide ninguna.
 *
 * Quien la usa decide cuándo se edita: escrita, se abre desde el «⋯» de la
 * lista (2-nov-2026; con su lápiz al lado quedaban dos iconos pegados); sin
 * escribir, desde su propio enlace.
 */
export function AboutNote({
  listId,
  forName,
  editing,
  onEditingChange,
}: {
  listId?: Id<"managedLists">;
  forName?: string;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const args = listId ? { listId } : {};
  const about = useQuery(api.lists.myAbout, isLoaded && isSignedIn ? args : "skip");
  const label = forName ? `Una nota para quien regala a ${forName}` : "Una nota para quien te regala";
  const setAbout = useMutation(api.lists.setAbout);

  if (about === undefined) return null;

  if (editing) {
    return (
      <NoteEditor
        initial={about ?? ""}
        label={label}
        onSave={async (note) => {
          await setAbout({ ...args, note });
          onEditingChange(false);
        }}
        onCancel={() => onEditingChange(false)}
      />
    );
  }

  if (!about) {
    return (
      <button
        type="button"
        onClick={() => onEditingChange(true)}
        className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        {forName ? `Añadir una nota para quien regala a ${forName}` : "Añadir una nota para quien te regala"}
      </button>
    );
  }

  // Citada con la letra de los titulares, como la verá quien la lee
  // («Escaparate y libreta», 2-nov-2026).
  return (
    <p className="font-heading text-lg leading-snug whitespace-pre-line">
      <span className="sr-only">{forName ? `Para quien regala a ${forName}:` : "Para quien te regala:"} </span>«{about}»
    </p>
  );
}

/** El cuadro de texto. Nace con lo guardado cada vez que se abre. */
function NoteEditor({
  initial,
  label,
  onSave,
  onCancel,
}: {
  initial: string;
  label: string;
  onSave: (note: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo guardar la nota"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
      <Label htmlFor="lista-nota-lectores">{label}</Label>
      <Textarea
        id="lista-nota-lectores"
        rows={2}
        maxLength={MAX_ABOUT}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Nada de ropa sin preguntarme, que no acertáis con la talla."
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          La ve quien tiene acceso a tu lista.
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" className="hover:bg-primary/80" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

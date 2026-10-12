"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { PencilLine } from "lucide-react";
import { api } from "../../../convex/_generated/api";
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
 */
export function AboutNote() {
  const { isLoaded, isSignedIn } = useAuth();
  const about = useQuery(api.lists.myAbout, isLoaded && isSignedIn ? {} : "skip");
  const setAbout = useMutation(api.lists.setAbout);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  if (about === undefined) return null;

  const open = () => {
    setDraft(about ?? "");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await setAbout({ note: draft });
      setEditing(false);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo guardar la nota"));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-2 rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
        <Label htmlFor="lista-nota-lectores">Una nota para quien te regala</Label>
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
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
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

  if (!about) {
    return (
      <button
        type="button"
        onClick={open}
        className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        Añadir una nota para quien te regala
      </button>
    );
  }

  return (
    <div className="flex items-start gap-2 text-sm">
      <p className="min-w-0 flex-1 whitespace-pre-line text-muted-foreground">
        <span className="text-foreground">Para quien te regala:</span> «{about}»
      </p>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Editar la nota para quien te regala"
        title="Editar"
        onClick={open}
      >
        <PencilLine className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}

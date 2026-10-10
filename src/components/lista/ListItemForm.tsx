"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { listItemSchema, type ListItemFormValues } from "@/lib/schemas";
import { normalizeLinkInput } from "@/lib/links";
import { userErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Item = { _id: Id<"listItems">; title: string; url?: string; note?: string };

/**
 * Apuntar algo en «Mi lista», o editarlo en su sitio si llega `item`. Mismo
 * registro que los formularios en línea de la ficha (eventos, historial):
 * caja punteada, sin diálogo ni navegación.
 */
export function ListItemForm({ item, onDone }: { item?: Item; onDone: () => void }) {
  const addItem = useMutation(api.lists.addItem);
  const updateItem = useMutation(api.lists.updateItem);
  const prefix = item ? `li-${item._id}` : "li-new";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(listItemSchema),
    defaultValues: {
      title: item?.title ?? "",
      url: item?.url ?? "",
      note: item?.note ?? "",
    },
  });

  const onSubmit = async (values: ListItemFormValues) => {
    const fields = {
      title: values.title,
      url: normalizeLinkInput(values.url),
      note: values.note?.trim() || undefined,
    };
    try {
      if (item) {
        await updateItem({ id: item._id, ...fields });
      } else {
        await addItem(fields);
        toast.success("Apuntado en tu lista");
      }
      onDone();
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo guardar"));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-xl border border-dashed border-border/70 bg-background/40 p-4 animate-in fade-in slide-in-from-top-1 duration-200"
    >
      {!item && (
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Apuntar algo
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-title`}>Qué es</Label>
        <Input
          id={`${prefix}-title`}
          placeholder="Una vela de higo, unas zapatillas de montaña…"
          autoFocus
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${prefix}-title-error` : undefined}
          {...register("title")}
        />
        {errors.title ? (
          <p id={`${prefix}-title-error`} className="text-xs text-destructive">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-url`}>Enlace (opcional)</Label>
        <Input
          id={`${prefix}-url`}
          inputMode="url"
          autoComplete="off"
          placeholder="https://…"
          aria-invalid={errors.url ? true : undefined}
          aria-describedby={errors.url ? `${prefix}-url-error` : undefined}
          {...register("url")}
        />
        {errors.url ? (
          <p id={`${prefix}-url-error`} className="text-xs text-destructive">
            {errors.url.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-note`}>Nota (opcional)</Label>
        <Textarea
          id={`${prefix}-note`}
          rows={2}
          placeholder="Talla M, en verde, la de la tienda del centro…"
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={errors.note ? `${prefix}-note-error` : undefined}
          {...register("note")}
        />
        {errors.note ? (
          <p id={`${prefix}-note-error`} className="text-xs text-destructive">
            {errors.note.message}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" className="hover:bg-primary/80" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : item ? "Guardar" : "Apuntar"}
        </Button>
      </div>
    </form>
  );
}

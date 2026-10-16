"use client";

import { useRef, useState, type ClipboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { listItemSchema, type ListItemFormValues } from "@/lib/schemas";
import { looksLikeUrl, normalizeLinkInput, prepareListLink, type PreparedLink } from "@/lib/links";
import { userErrorMessage } from "@/lib/errors";
import { parsePriceInput, priceInputValue } from "@/lib/price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Item = {
  _id: Id<"listItems">;
  title: string;
  url?: string;
  note?: string;
  priceCents?: number | null;
};

/** Lo que llega ya escrito al apuntar algo nuevo (el botón «Apuntar en PickPal»). */
export type ListItemDraft = { title?: string; url?: string; priceCents?: number };

/** Lo que se dice bajo «Enlace» después de limpiarlo. Ninguna pista es un error. */
export function linkHint(link: PreparedLink): string | null {
  if (link.wishlistCom) return "Ese enlace lleva a wishlist.com, no a la tienda. Pega el de la tienda.";
  if (link.foreignAmazon) return "Es Amazon de otro país; quizá prefieras el enlace de amazon.es.";
  if (link.shortened) return "Enlace acortado: lleva a la misma página.";
  return null;
}

/**
 * Apuntar algo en «Mi lista», o editarlo en su sitio si llega `item`. Mismo
 * registro que los formularios en línea de la ficha (eventos, historial):
 * caja punteada, sin diálogo ni navegación.
 *
 * Los enlaces se limpian en el navegador al pegarlos o al salir del campo
 * (`prepareListLink`): sin etiquetas de seguimiento ni de afiliado, y sin el
 * redirector si llegó envuelto. Nada se pide a la tienda (decisión 3).
 */
export function ListItemForm({
  item,
  initial,
  listId,
  onDone,
}: {
  item?: Item;
  initial?: ListItemDraft;
  /** Lista a cargo en la que se apunta; vacío, tu propia lista. */
  listId?: Id<"managedLists">;
  /** Al apuntar algo nuevo recibe su id, para que la página lo señale. */
  onDone: (addedId?: Id<"listItems">) => void;
}) {
  const addItem = useMutation(api.lists.addItem);
  const updateItem = useMutation(api.lists.updateItem);
  const prefix = item ? `li-${item._id}` : "li-new";
  const titleRef = useRef<HTMLInputElement | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(listItemSchema),
    defaultValues: {
      title: item?.title ?? initial?.title ?? "",
      url: item?.url ?? initial?.url ?? "",
      note: item?.note ?? "",
      price: priceInputValue(item ? item.priceCents : initial?.priceCents),
    },
  });

  // Deja el enlace limpio en «Enlace» y, si «Qué es» está vacío, propone un
  // título sacado de la dirección, ya seleccionado para escribir encima.
  const applyLink = (raw: string) => {
    const link = prepareListLink(raw);
    setValue("url", link.url ?? (link.wishlistCom ? "" : raw.trim()), { shouldValidate: true });
    setHint(linkHint(link));
    if (link.suggestedTitle && getValues("title").trim() === "") {
      setValue("title", link.suggestedTitle, { shouldValidate: true });
      requestAnimationFrame(() => titleRef.current?.select());
    }
  };

  const onTitlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text/plain").trim();
    if (!looksLikeUrl(text)) return;
    e.preventDefault();
    applyLink(text);
  };

  const onUrlPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text/plain").trim();
    if (!text) return;
    e.preventDefault();
    applyLink(text);
  };

  const titleField = register("title");
  const urlField = register("url");

  const onSubmit = async (values: ListItemFormValues) => {
    const fields = {
      title: values.title,
      url: normalizeLinkInput(values.url),
      note: values.note?.trim() || undefined,
    };
    const parsed = parsePriceInput(values.price);
    const priceCents = typeof parsed === "number" ? parsed : null;
    try {
      if (item) {
        // Siempre explícito al editar: `null` quita el precio y un número lo
        // pone. Si no se mandara, el servidor lo dejaría como estaba.
        await updateItem({ id: item._id, ...fields, priceCents });
        onDone();
      } else {
        const withPrice = priceCents === null ? fields : { ...fields, priceCents };
        const id = await addItem(listId ? { ...withPrice, listId } : withPrice);
        toast.success(listId ? "Apuntado en su lista" : "Apuntado en tu lista");
        onDone(id);
      }
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo guardar"));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-xl border border-dashed border-border/70 bg-background/40 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200"
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
          {...titleField}
          ref={(el) => {
            titleField.ref(el);
            titleRef.current = el;
          }}
          onPaste={onTitlePaste}
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
          aria-describedby={
            errors.url ? `${prefix}-url-error` : hint ? `${prefix}-url-hint` : undefined
          }
          {...urlField}
          onPaste={onUrlPaste}
          onChange={(e) => {
            setHint(null);
            void urlField.onChange(e);
          }}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (raw) {
              const link = prepareListLink(raw);
              if (link.url && link.url !== normalizeLinkInput(raw)) applyLink(raw);
            }
            void urlField.onBlur(e);
          }}
        />
        {errors.url ? (
          <p id={`${prefix}-url-error`} className="text-xs text-destructive">
            {errors.url.message}
          </p>
        ) : hint ? (
          <p id={`${prefix}-url-hint`} className="text-xs text-muted-foreground" aria-live="polite">
            {hint}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-price`}>Precio aproximado (opcional)</Label>
        <div className="relative max-w-40">
          <Input
            id={`${prefix}-price`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="40"
            className="pr-7"
            aria-invalid={errors.price ? true : undefined}
            aria-describedby={errors.price ? `${prefix}-price-error` : undefined}
            {...register("price")}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
          >
            €
          </span>
        </div>
        {errors.price ? (
          <p id={`${prefix}-price-error`} className="text-xs text-destructive">
            {errors.price.message}
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
        <Button type="button" variant="outline" onClick={() => onDone()} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" className="hover:bg-primary/80" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : item ? "Guardar" : "Apuntar"}
        </Button>
      </div>
    </form>
  );
}

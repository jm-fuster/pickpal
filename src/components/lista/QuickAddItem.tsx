"use client";

import { useEffect, useId, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from "react";
import { Camera, Check, ChevronDown, ClipboardPaste, Plus, X } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ItemMeta } from "@/components/lista/ListParts";
import { userErrorMessage } from "@/lib/errors";
import { isHttpUrl, linkHint, looksLikeUrl, normalizeLinkInput, prepareListLink, splitTextAndLink } from "@/lib/links";
import { MAX_LIST_ITEMS } from "@/lib/listLimits";
import { formatApproxPrice, parsePriceInput, priceInputValue, splitTrailingPrice } from "@/lib/price";
import { cn } from "@/lib/utils";

type Existing = Array<{ title: string; url?: string }>;
type Batch = { items: Array<{ title: string; url?: string; note?: string }>; left: number };
type Field = "title" | "url" | "price" | "note";

// Los topes de `listItemSchema` (src/lib/schemas.ts), sin zod: esta línea se
// carga siempre y el formulario completo va en su propio chunk.
const MAX_TITLE = 120;
const MAX_NOTE = 500;
// Lo que dura «Apuntado: …» bajo la línea.
const ADDED_MS = 4000;
// En la vista previa de varias líneas se enseñan estas; el resto, contado.
const BATCH_SHOWN = 6;

const SUGGESTED = "Título sacado del enlace: escribe encima si quieres.";

const things = (n: number) => (n === 1 ? "1 cosa" : `${n} cosas`);

/** Lo que un cambio ha metido de golpe: lo nuevo entre lo que sigue igual al principio y al final. */
function insertedText(before: string, after: string): string {
  let start = 0;
  while (start < before.length && before[start] === after[start]) start++;
  let end = 0;
  while (end < before.length - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
  return after.slice(start, after.length - end);
}

/**
 * «Apuntar algo» de «Mi lista» y de las listas que llevas: una línea que ya es
 * un campo, como una nota. Se escribe y con Intro se apunta; el foco se queda
 * para la siguiente. Lo que se pega decide qué pasa, todo en el navegador:
 *
 * - **Un enlace** se limpia como en el formulario (`prepareListLink`), pasa a
 *   su chip y, si no había nada escrito, deja el título sacado de la dirección
 *   seleccionado para escribir encima. PickPal no abre el enlace (decisión 3).
 *   Con texto delante en la misma línea («Vela https://…»), el texto es el
 *   nombre. También cuando llega sin evento de pegar (el portapapeles de
 *   algunos teclados, arrastrarlo).
 * - **Varias líneas** pasan por el analizador de «Pegar una lista» y se
 *   ofrecen de golpe; esa página sigue para archivos y listas largas.
 * - **Una imagen** (copiada en la tienda, una captura) se queda como foto y se
 *   sube tras apuntar, con la preparación de siempre (`usePhotoUpload`).
 *
 * Un precio al final («Vela de higo 25 €») pasa al precio (`splitTrailingPrice`).
 * «Más detalles» despliega enlace, precio, foto y nota. Probado en el
 * Playground del Figma (3-nov-2026, `Playground · My list · Quick add`).
 */
export function QuickAddItem({
  listId,
  existing,
  autoFocus,
  onAdded,
  onPhoto,
}: {
  /** Lista a cargo en la que se apunta; vacío, tu propia lista. */
  listId?: Id<"managedLists">;
  /** Lo que ya hay en la lista, para no repetir al pegar varias líneas. */
  existing: Existing;
  autoFocus?: boolean;
  /** Lo recién apuntado, para que la lista lo señale. */
  onAdded: (id: Id<"listItems">) => void;
  /** Sube la foto pegada a lo recién apuntado. */
  onPhoto: (id: Id<"listItems">, file: File) => unknown;
}) {
  const addItem = useMutation(api.lists.addItem);
  const importItems = useMutation(api.lists.importItems);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  // Lo escrito ahora, para saber al acabar de guardar si se ha seguido escribiendo.
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  });
  const [url, setUrl] = useState("");
  const [suggested, setSuggested] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [details, setDetails] = useState(false);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<{ field: Field; message: string } | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [added, setAdded] = useState<{ title: string } | null>(null);
  const [addedOnce, setAddedOnce] = useState(false);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview); }, [photo]);
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(null), ADDED_MS);
    return () => clearTimeout(t);
  }, [added]);

  const trimmed = text.trim();
  // Con «Precio aproximado» escrito manda ese; si no, el que lleve el título.
  const split = price.trim() ? { title: trimmed } : splitTrailingPrice(trimmed);
  const hasContent = trimmed !== "" || url !== "" || photo !== null;
  const resting = !hasContent && !details && batch === null;
  const message = error?.message ?? hint ?? (suggested !== null && text === suggested ? SUGGESTED : null);

  const reset = () => {
    setText("");
    setUrl("");
    setSuggested(null);
    setHint(null);
    setPhoto(null);
    setDetails(false);
    setPrice("");
    setNote("");
    setError(null);
  };

  const choosePhoto = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError({ field: "title", message: "Eso no es una foto." });
      return;
    }
    setError(null);
    setPhoto({ file, preview: URL.createObjectURL(file) });
  };

  // Como en el formulario: el enlace limpio va a su chip y, si no hay nada
  // escrito, el título que sale de la dirección, seleccionado.
  // Con `title` (lo que venía delante del enlace en la misma línea), ese es el
  // nombre y no se sugiere otro.
  const applyLink = (raw: string, title?: string) => {
    const link = prepareListLink(raw);
    setUrl(link.url ?? (link.wishlistCom ? "" : raw.trim()));
    setHint(linkHint(link));
    setError(null);
    if (title) {
      setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${title}` : title));
    } else if (link.suggestedTitle && text.trim() === "") {
      setText(link.suggestedTitle);
      setSuggested(link.suggestedTitle);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  };

  const previewBatch = async (raw: string) => {
    const [{ parsePastedList }, { createPreview, pasteProblem, remaining, selectedItems }] = await Promise.all([
      import("@/lib/importers/pastedList"),
      import("@/lib/importers/importPreview"),
    ]);
    const parsed = parsePastedList(raw);
    const problem = pasteProblem(parsed);
    if (problem) {
      setHint(problem);
      return;
    }
    const state = createPreview([parsed], existing, MAX_LIST_ITEMS - existing.length);
    const items = selectedItems(state);
    if (items.length === 0) {
      // Las filas que no salen pueden estar repetidas o pedir un nombre (un
      // enlace corto, una frase): solo las primeras están «ya en la lista».
      setHint(
        remaining(state) === 0
          ? "Ya no cabe nada más en la lista."
          : state.rows.every((r) => r.notice === "duplicate")
            ? "Todo eso ya está en la lista."
            : "De ahí no sale nada que apuntar tal cual. En «Pegar una lista» puedes revisarlo línea a línea.",
      );
      return;
    }
    setHint(null);
    setBatch({ items, left: state.rows.length - items.length });
  };

  /** `true` si lo pegado se ha tratado aquí (y no hay que dejarlo caer en el campo). */
  const handleText = (raw: string): boolean => {
    const s = raw.trim();
    if (!s) return false;
    if (s.split("\n").filter((l) => l.trim()).length > 1) {
      void previewBatch(raw);
      return true;
    }
    if (looksLikeUrl(s)) {
      applyLink(s);
      return true;
    }
    // «Vela de higo https://…», como comparten las apps de tienda: el texto es
    // el nombre y el enlace va a su sitio, no al título.
    const both = splitTextAndLink(s);
    if (both && both.text) {
      applyLink(both.link, both.text);
      return true;
    }
    return false;
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const image = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (image) {
      e.preventDefault();
      choosePhoto(image);
      return;
    }
    if (handleText(e.clipboardData.getData("text/plain"))) e.preventDefault();
  };

  // «Pegar»: solo con el toque, nunca se lee el portapapeles sin un gesto. En
  // el iPhone es la forma rápida de traer algo de la app de una tienda.
  const pasteFromClipboard = async () => {
    const insert = (s: string) => {
      if (!s.trim()) {
        setHint("No hay nada copiado.");
      } else if (!handleText(s)) {
        setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${s.trim()}` : s.trim()));
      }
      inputRef.current?.focus();
    };
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const type = item.types.find((t) => t.startsWith("image/"));
          if (type) {
            const blob = await item.getType(type);
            choosePhoto(new File([blob], "foto", { type }));
            inputRef.current?.focus();
            return;
          }
        }
        const withText = items.find((i) => i.types.includes("text/plain"));
        insert(withText ? await (await withText.getType("text/plain")).text() : "");
        return;
      }
      insert(await navigator.clipboard.readText());
    } catch {
      setHint("No se ha podido leer lo copiado. Pégalo en el campo.");
      inputRef.current?.focus();
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setDragging(false);
    choosePhoto(Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/")));
  };

  const toggleDetails = () => {
    // Al abrir, el precio que lleva el título pasa a su campo.
    if (!details && split.priceCents !== undefined && !price.trim()) {
      setText(split.title);
      setPrice(priceInputValue(split.priceCents));
    }
    setDetails((d) => !d);
  };

  const fail = (field: Field, msg: string) => {
    setError({ field, message: msg });
    if (field !== "title") setDetails(true);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (saving) return;
    // Con la vista previa de varias líneas abierta y la línea vacía, Intro la
    // confirma en vez de quejarse de que falta qué es.
    if (batch && !text.trim()) return submitBatch();
    const title = split.title;
    if (!title) return fail("title", "Escribe qué es");
    if (title.length > MAX_TITLE) return fail("title", `Es demasiado largo: como mucho ${MAX_TITLE} caracteres`);
    const link = normalizeLinkInput(url);
    if (link !== undefined && !isHttpUrl(link)) return fail("url", "Tiene que ser una dirección web, como https://…");
    let priceCents = split.priceCents;
    if (price.trim()) {
      const parsed = parsePriceInput(price);
      if (parsed === "invalid") return fail("price", "Escribe un importe, como 40 o 39,99");
      priceCents = parsed ?? undefined;
    }
    const n = note.trim();
    if (n.length > MAX_NOTE) return fail("note", `La nota es demasiado larga: como mucho ${MAX_NOTE} caracteres`);

    setSaving(true);
    try {
      const fields = {
        title,
        ...(link !== undefined ? { url: link } : {}),
        ...(n ? { note: n } : {}),
        ...(priceCents !== undefined ? { priceCents } : {}),
      };
      const submitted = text;
      const newId = await addItem(listId ? { ...fields, listId } : fields);
      const file = photo?.file;
      // La línea no se bloquea mientras se guarda: lo que se haya empezado a
      // escribir entretanto es la siguiente cosa, y no se borra.
      const typedSince = textRef.current !== submitted ? textRef.current : null;
      reset();
      if (typedSince !== null) setText(typedSince);
      setAdded({ title });
      setAddedOnce(true);
      onAdded(newId);
      if (file) void onPhoto(newId, file);
      inputRef.current?.focus();
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo apuntar"));
    } finally {
      setSaving(false);
    }
  };

  const submitBatch = async () => {
    if (!batch || saving) return;
    setSaving(true);
    try {
      const { inserted } = await importItems(listId ? { items: batch.items, listId } : { items: batch.items });
      setBatch(null);
      setAdded({ title: things(inserted) });
      setAddedOnce(true);
      inputRef.current?.focus();
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo apuntar. Inténtalo de nuevo."));
    } finally {
      setSaving(false);
    }
  };

  const messageId = `${id}-mensaje`;
  const detailsId = `${id}-detalles`;
  const invalid = (field: Field) => (error?.field === field ? true : undefined);
  // El mensaje va bajo la línea; los campos de «Más detalles» lo enlazan cuando es suyo.
  const describedBy = (field: Field) => (error?.field === field ? messageId : undefined);

  return (
    <form onSubmit={submit} className="space-y-2" noValidate>
      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-lg border py-1 pr-1 pl-3 transition-colors",
          resting
            ? "border-dashed border-input/50 hover:border-input hover:bg-muted/40"
            : "border-input dark:bg-input/30",
          "focus-within:border-solid focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          dragging && "border-solid border-primary bg-primary/5",
          error?.field === "title" && "border-destructive ring-3 ring-destructive/20",
        )}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.preview} alt="" aria-hidden className="size-8 shrink-0 rounded-md object-cover" />
        ) : (
          <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <input
          ref={inputRef}
          id={`${id}-que`}
          value={text}
          onChange={(e) => {
            // Algunos teclados del móvil (el portapapeles de Gboard) y
            // arrastrar un enlace meten lo copiado sin evento de pegar: llega
            // como un cambio de texto. Un enlace entero de golpe no lo teclea
            // nadie, así que se trata como pegado y no acaba en el título.
            const added = insertedText(text, e.target.value);
            if (added.length > 1 && /https?:\/\/|www\./i.test(added) && handleText(added)) return;
            setText(e.target.value);
            if (error?.field === "title") setError(null);
            if (hint && !url) setHint(null);
          }}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === "Escape" && batch) {
              e.preventDefault();
              setBatch(null);
            }
          }}
          autoFocus={autoFocus}
          autoComplete="off"
          maxLength={MAX_TITLE + 40}
          placeholder={photo ? "¿Qué es?" : addedOnce ? "Apuntar otra cosa" : "Apuntar algo"}
          aria-label={photo ? "Qué es lo de la foto" : "Apuntar algo: escribe qué es o pega un enlace"}
          aria-invalid={invalid("title")}
          aria-describedby={message ? messageId : undefined}
          className="h-9 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
        />
        {hasContent ? (
          <Button type="submit" size="sm" className="hover:bg-primary/80" disabled={!split.title || saving}>
            {saving ? "Apuntando…" : "Apuntar"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="bg-muted text-foreground hover:bg-muted/70"
            onClick={() => void pasteFromClipboard()}
          >
            <ClipboardPaste aria-hidden />
            Pegar
          </Button>
        )}
      </div>

      {batch ? (
        <div className="space-y-3 rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium">
            {batch.items.length === 1 ? "¿Apuntar esto?" : `¿Apuntar estas ${batch.items.length} cosas?`}
          </p>
          <ul className="space-y-1.5 text-sm">
            {batch.items.slice(0, BATCH_SHOWN).map((item, i) => (
              <li key={i} className="flex min-w-0 items-center gap-2">
                <Check className="size-4 shrink-0 text-brand" aria-hidden />
                <span className="truncate">{item.title}</span>
              </li>
            ))}
          </ul>
          {(batch.items.length > BATCH_SHOWN || batch.left > 0) && (
            <p className="text-xs text-muted-foreground">
              {batch.items.length > BATCH_SHOWN && `Y ${things(batch.items.length - BATCH_SHOWN)} más. `}
              {batch.left > 0 &&
                `${things(batch.left)} no se ${batch.left === 1 ? "apunta" : "apuntan"}: ya ${batch.left === 1 ? "estaba" : "estaban"}, no cabe o no parece de la lista.`}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setBatch(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" size="sm" className="hover:bg-primary/80" onClick={() => void submitBatch()} disabled={saving}>
              {saving ? "Apuntando…" : batch.items.length === 1 ? "Apuntarlo" : `Apuntar las ${batch.items.length}`}
            </Button>
          </div>
        </div>
      ) : hasContent || details ? (
        <div className="flex flex-wrap items-center gap-2 pl-1">
          {!details && split.priceCents !== undefined && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {formatApproxPrice(split.priceCents)}
            </span>
          )}
          {!details && url && (
            <span className="inline-flex max-w-56 min-w-0 items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5 text-xs text-muted-foreground">
              <ItemMeta item={{ priceCents: null, url }} />
              <button
                type="button"
                onClick={() => {
                  setUrl("");
                  setHint(null);
                }}
                aria-label="Quitar el enlace"
                className="relative rounded-full p-0.5 hover:text-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-3"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          )}
          {!details && photo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5 text-xs text-muted-foreground">
              Foto
              <button
                type="button"
                onClick={() => setPhoto(null)}
                aria-label="Quitar la foto"
                className="relative rounded-full p-0.5 hover:text-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-3"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={toggleDetails}
            aria-expanded={details}
            aria-controls={detailsId}
            className="relative ml-auto inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-y-2.5 pointer-coarse:after:inset-x-0"
          >
            {details ? "Menos detalles" : "Más detalles"}
            <ChevronDown className={cn("size-3.5 transition-transform", details && "rotate-180")} aria-hidden />
          </button>
        </div>
      ) : null}

      {message && (
        <p id={messageId} className={cn("pl-1 text-xs", error ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
          {message}
        </p>
      )}

      {details && !batch && (
        <div id={detailsId} className="grid gap-3 pt-1 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`${id}-enlace`}>Enlace</Label>
            <Input
              id={`${id}-enlace`}
              inputMode="url"
              autoComplete="off"
              placeholder="Pega el enlace de la tienda"
              value={url}
              aria-invalid={invalid("url")}
              aria-describedby={describedBy("url")}
              onChange={(e) => {
                setUrl(e.target.value);
                setHint(null);
                if (error?.field === "url") setError(null);
              }}
              onPaste={(e) => {
                const s = e.clipboardData.getData("text/plain").trim();
                if (!s) return;
                e.preventDefault();
                applyLink(s);
              }}
              onBlur={() => {
                const raw = url.trim();
                if (raw && prepareListLink(raw).url !== normalizeLinkInput(raw)) applyLink(raw);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-precio`}>Precio aproximado</Label>
            <div className="relative max-w-40">
              <Input
                id={`${id}-precio`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="40"
                className="pr-7"
                value={price}
                aria-invalid={invalid("price")}
                aria-describedby={describedBy("price")}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (error?.field === "price") setError(null);
                }}
              />
              <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                €
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-sm leading-none font-medium select-none">Foto</span>
            {photo ? (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.preview} alt="" aria-hidden className="size-11 shrink-0 rounded-md object-cover" />
                <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                  Cambiar la foto
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto(null)}>
                  Quitarla
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-input/50 text-sm text-muted-foreground transition-colors hover:border-input hover:bg-muted/40 hover:text-foreground pointer-coarse:h-11"
              >
                <Camera className="size-4" aria-hidden />
                Añadir una foto
              </button>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`${id}-nota`}>Nota</Label>
            <Textarea
              id={`${id}-nota`}
              rows={2}
              placeholder="Talla M, en verde, la de la tienda del centro…"
              value={note}
              aria-invalid={invalid("note")}
              aria-describedby={describedBy("note")}
              onChange={(e) => {
                setNote(e.target.value);
                if (error?.field === "note") setError(null);
              }}
            />
          </div>
        </div>
      )}

      <p role="status" className={cn("flex items-center gap-1.5 pl-1 text-xs text-muted-foreground", !added && "sr-only")}>
        {added && (
          <>
            <Check className="size-3.5 shrink-0 text-brand" aria-hidden />
            <span className="truncate">Apuntado: {added.title}</span>
          </>
        )}
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          choosePhoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </form>
  );
}

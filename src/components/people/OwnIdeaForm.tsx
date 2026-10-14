"use client";

import { useEffect, useId, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { ImportantDate } from "@/components/people/ideaParts";
import { userErrorMessage } from "@/lib/errors";
import { looksLikeUrl, prepareListLink } from "@/lib/links";
import { parsePriceInput, priceInputValue } from "@/lib/price";
import { linkHint, type ListItemDraft } from "@/components/lista/ListItemForm";
import { formatEventDate, moveDestinations } from "@/lib/savedIdeaGroups";
import { preparePhoto } from "@/lib/photoPrep";
import { cn } from "@/lib/utils";

// Los mismos textos que la foto de un elemento de «Mi lista» (usePhotoUpload).
const PREP_ERRORS = {
  "not-image": "Eso no es una foto.",
  "too-large": "Esa foto es demasiado grande.",
  unreadable: "No se ha podido leer esa foto. Prueba con otra o con una captura.",
} as const;

const NONE = "sin-ocasion";
// Los mismos topes que un elemento de «Mi lista» (validateOwnIdeaInput).
const MAX_TITLE = 120;
const MAX_NOTE = 500;

/**
 * «Apuntar una idea»: lo que se te ocurre a ti, sin la IA. Es el formulario de
 * «Mi lista» (qué es, enlace, precio, nota) más «Para qué ocasión», en la caja
 * punteada de los formularios en línea de la ficha. El enlace se limpia igual
 * que en la lista: sin seguimiento ni afiliados, y nunca se abre desde aquí.
 */
export function OwnIdeaForm({
  personId,
  dates,
  defaultDateId,
  initial,
  onDone,
}: {
  personId: Id<"people">;
  dates: ImportantDate[];
  /** La próxima ocasión de la ficha, si la hay. */
  defaultDateId?: Id<"importantDates">;
  /** Lo que llega ya leído de la tienda: el marcador o «Compartir» en Android. */
  initial?: ListItemDraft;
  /** `saved` es true si se apuntó; false al cancelar. */
  onDone: (saved: boolean) => void;
}) {
  const addOwn = useMutation(api.savedIdeas.addOwn);
  const id = useId();
  const titleRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [price, setPrice] = useState(priceInputValue(initial?.priceCents));
  const [hint, setHint] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [occasion, setOccasion] = useState<string>(defaultDateId ?? NONE);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // La foto que pegas o eliges. Se prepara y se sube al pulsar «Apuntar»,
  // no antes: si cancelas, no se ha subido nada.
  const generateUploadUrl = useMutation(api.lists.generatePhotoUploadUrl);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Arrastrar una imagen desde el escritorio, desde otra pestaña de la tienda
  // o desde la carpeta de descargas. Solo se acepta un archivo de imagen: lo
  // que arrastras desde una web llega como archivo o no llega, PickPal no
  // descarga la dirección de la imagen.
  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(false);
    const image = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (image) choosePhoto(image);
    else setError("Eso no se puede usar como foto. Guarda la imagen en tu equipo y arrástrala, o cópiala y pégala.");
  };
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview); }, [photo]);
  const choosePhoto = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError(PREP_ERRORS["not-image"]);
    setError(null);
    setPhoto({ file, preview: URL.createObjectURL(file) });
  };
  // Pegar una imagen en cualquier campo (copiada en la tienda o una captura).
  const imageFrom = (e: ClipboardEvent) =>
    Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
  const onFormPaste = (e: ClipboardEvent<HTMLFormElement>) => {
    const image = imageFrom(e);
    if (!image) return;
    e.preventDefault();
    choosePhoto(image);
  };
  // Las fechas que vienen; «Sin ocasión» se añade aparte.
  const options = moveDestinations(dates, undefined).flatMap((d) => (d.kind === "event" ? [d.event] : []));
  const occasionLabel = occasion === NONE ? "Sin ocasión" : dates.find((d) => d._id === occasion)?.label ?? "Sin ocasión";

  // Como en «Mi lista»: deja el enlace limpio y, si «Qué es» está vacío,
  // propone un título sacado de la dirección, ya seleccionado para escribir
  // encima. Todo en el navegador: PickPal no abre el enlace.
  const applyLink = (raw: string) => {
    if (!raw.trim()) return;
    const link = prepareListLink(raw);
    setUrl(link.url ?? (link.wishlistCom ? "" : raw.trim()));
    setHint(linkHint(link));
    if (link.suggestedTitle && title.trim() === "") {
      setTitle(link.suggestedTitle);
      requestAnimationFrame(() => titleRef.current?.select());
    }
  };
  const cleanLink = () => applyLink(url);

  const onTitlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (imageFrom(e)) return; // la recoge el formulario
    const text = e.clipboardData.getData("text/plain").trim();
    if (!looksLikeUrl(text)) return;
    e.preventDefault();
    applyLink(text);
  };

  const onUrlPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (imageFrom(e)) return; // la recoge el formulario
    const text = e.clipboardData.getData("text/plain").trim();
    if (!text) return;
    e.preventDefault();
    applyLink(text);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setError("Escribe qué es.");
    const cents = parsePriceInput(price);
    if (cents === "invalid") return setError("El precio no se entiende. Escribe solo el número, como 40.");
    let link: string | undefined;
    if (url.trim()) {
      link = prepareListLink(url).url;
      if (!link) return setError("Ese enlace no vale: tiene que ser la página de una tienda (http o https).");
    }
    setError(null);
    setSaving(true);
    try {
      let photoStorageId: Id<"_storage"> | undefined;
      if (photo) {
        // Igual que en «Mi lista»: se reduce y se vuelve a codificar aquí, lo
        // que le quita los metadatos, y el servidor comprueba tipo y tamaño.
        const blob = await preparePhoto(photo.file);
        if (typeof blob === "string") {
          setError(PREP_ERRORS[blob]);
          return;
        }
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
        if (!res.ok) throw new Error("upload");
        photoStorageId = ((await res.json()) as { storageId: Id<"_storage"> }).storageId;
      }
      await addOwn({
        personId,
        importantDateId: occasion === NONE ? null : (occasion as Id<"importantDates">),
        title: t,
        url: link,
        note: note.trim() || undefined,
        priceCents: cents ?? undefined,
        photoStorageId,
      });
      toast.success("Idea apuntada");
      onDone(true);
    } catch (err) {
      setError(userErrorMessage(err, "No se pudo apuntar la idea"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      onPaste={onFormPaste}
      className="space-y-3 rounded-lg border border-dashed border-border/70 bg-background/60 p-4"
      aria-label="Apuntar una idea"
    >
      <div className="space-y-2">
        <Label htmlFor={`${id}-photo`}>Foto (opcional)</Label>
        {photo ? (
          <div
            className="flex items-center gap-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.preview} alt="" className="size-20 rounded-md border border-border/60 object-cover" />
            <div className="flex flex-col items-start gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus aria-hidden />
                Cambiar la foto
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto(null)}>
                <X aria-hidden />
                Quitar la foto
              </Button>
            </div>
          </div>
        ) : (
          // Zona de soltar: también se pulsa (abre el selector) y recibe lo
          // que pegas con Ctrl+V en cualquier campo del formulario.
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
              dragging
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border/70 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <ImagePlus className="size-5" aria-hidden />
            <span className="text-sm font-medium text-foreground">
              {dragging ? "Suéltala aquí" : "Arrastra aquí una foto"}
            </span>
            <span className="text-xs">o pulsa para elegirla, o pégala con Ctrl+V</span>
          </button>
        )}
        <input
          id={`${id}-photo`}
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            choosePhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-title`}>Qué es</Label>
        <Input
          id={`${id}-title`}
          ref={titleRef}
          autoFocus
          maxLength={MAX_TITLE}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onPaste={onTitlePaste}
          placeholder="Una cena, un libro… o pega el enlace"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-url`}>Enlace (opcional)</Label>
        <Input
          id={`${id}-url`}
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={onUrlPaste}
          onBlur={cleanLink}
          placeholder="https://…"
          aria-describedby={hint ? `${id}-url-hint` : undefined}
        />
        {hint && (
          <p id={`${id}-url-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${id}-price`}>Precio aproximado (opcional)</Label>
          <div className="relative max-w-40">
            <Input
              id={`${id}-price`}
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pr-7"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">€</span>
          </div>
        </div>
        <div className="min-w-48 flex-1 space-y-2">
          <Label htmlFor={`${id}-occasion`}>Para qué ocasión</Label>
          <Select value={occasion} onValueChange={(v) => { if (v) setOccasion(v); }}>
            <SelectTrigger id={`${id}-occasion`} className="w-full">
              <span>{occasionLabel}</span>
            </SelectTrigger>
            <SelectContent>
              {options.map((d) => (
                <SelectItem key={d._id} value={d._id}>
                  {d.label} · {formatEventDate(d)}
                </SelectItem>
              ))}
              <SelectItem value={NONE}>Sin ocasión</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-note`}>Nota (opcional)</Label>
        <Textarea
          id={`${id}-note`}
          rows={2}
          maxLength={MAX_NOTE}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Lo que no quieres olvidar"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onDone(false)} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Apuntando…" : "Apuntar"}
        </Button>
      </div>
    </form>
  );
}

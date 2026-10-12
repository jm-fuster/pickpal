"use client";

import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, FileUp } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BackLink } from "@/components/layout/BackLink";
import { ListItemLink } from "@/components/lista/ListItemLink";
import { parsePastedList, type PastedList } from "@/lib/importers/pastedList";
import { readListFile } from "@/lib/importers/fileImport";
import {
  addPastedList,
  createPreview,
  dedupeKey,
  remaining,
  selectedItems,
  summary,
  toggleGroup,
  toggleRow,
  renameRow,
  type PreviewRow,
  type PreviewState,
} from "@/lib/importers/importPreview";
import { listItemSchema } from "@/lib/schemas";
import { userErrorMessage } from "@/lib/errors";
import { MAX_LIST_ITEMS } from "@/lib/listLimits";

/** Lo que se dice cuando lo pegado no da para una vista previa. */
function problemFor(list: PastedList): string | null {
  switch (list.kind) {
    case "too-large":
      return "Es demasiado largo para leerlo de una vez. Pega la lista por partes.";
    case "empty":
      return "No hay nada que apuntar en lo que has pegado.";
    case "noisy":
      return "Esto no parece una lista. Copia solo los nombres, uno por línea, y vuelve a pegar.";
    case "whole-list-link":
      return "Eso es el enlace de la lista entera, y PickPal no abre enlaces. Ábrela en tu navegador, copia su texto y pégalo aquí.";
    default:
      return null;
  }
}

const things = (n: number) => (n === 1 ? "1 cosa" : `${n} cosas`);

function remainingText(n: number) {
  if (n === 0) return "Ya no cabe nada más en tu lista";
  return n === 1 ? "Cabe 1 más en tu lista" : `Caben ${n} más en tu lista`;
}

/** Lleva al campo de invitar de «Mi lista». Se usa desde el aviso final. */
function focusShareField() {
  const el = document.getElementById("lista-share-email");
  el?.scrollIntoView({ block: "center" });
  el?.focus();
}

/**
 * «Pegar una lista»: traer de golpe una lista que ya existe en otra app, en
 * una nota o en un chat. Todo se lee en el navegador con funciones puras
 * (`src/lib/importers/`): no hay red, ni IA, ni nada que abra los enlaces. A
 * PickPal solo llega lo que se deja marcado, con `lists.importItems`, que lo
 * vuelve a validar.
 *
 * Lo pegado nunca se pinta tal cual: pasa directo a la vista previa. Así no
 * aparece en pantalla lo que la otra app añade al copiar (estados de reserva,
 * el email o el cumpleaños de la dueña).
 */
export default function ImportListPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const ready = isLoaded && isSignedIn;
  const items = useQuery(api.lists.myItems, ready ? {} : "skip");
  const readers = useQuery(api.lists.myReaders, ready ? {} : "skip");
  const importItems = useMutation(api.lists.importItems);

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(true);
  const [fromWishlistCom, setFromWishlistCom] = useState(false);
  const [saving, setSaving] = useState(false);

  const existing = items ?? [];
  const capacity = Math.max(0, MAX_LIST_ITEMS - existing.length);
  const left = preview ? remaining(preview) : capacity;

  // La cuenta se ve al momento, pero el lector de pantalla la oye con retardo:
  // si no, la repetiría a cada casilla.
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    if (!preview) return;
    const t = setTimeout(() => setAnnounced(remainingText(left)), 800);
    return () => clearTimeout(t);
  }, [preview, left]);

  const handleText = (text: string) => {
    if (!text.trim() || items === undefined) return;
    const parsed = parsePastedList(text);
    const message = problemFor(parsed);
    if (message) {
      setProblem(message);
      return;
    }
    setProblem(null);
    if (parsed.fromWishlistCom) setFromWishlistCom(true);
    setPreview((prev) =>
      prev ? addPastedList(prev, parsed, existing) : createPreview([parsed], existing, capacity),
    );
    setShowPaste(false);
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    handleText(e.clipboardData.getData("text/plain"));
  };

  // Solo con el toque en «Pegar»: nunca se lee el portapapeles sin un gesto.
  const readClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setProblem("No hay nada copiado. Copia tu lista y vuelve a probar.");
        return;
      }
      handleText(text);
    } catch {
      setProblem("No se ha podido leer lo copiado. Pulsa en el recuadro y pega.");
    }
  };

  // Un CSV, TSV o TXT (una hoja exportada de Excel o de otra app). Se lee aquí,
  // como lo pegado: el archivo no se sube a ningún sitio.
  const fileInput = useRef<HTMLInputElement>(null);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const result = await readListFile(file);
    if ("error" in result) {
      setProblem(
        result.error === "too-large"
          ? "Ese archivo es demasiado grande. Prueba con una parte de la lista."
          : "Solo se pueden leer archivos .csv, .tsv o .txt.",
      );
      return;
    }
    handleText(result.text);
  };

  const existingKeys = new Set(existing.map((i) => dedupeKey(i.title)));
  const existingUrls = new Set(existing.flatMap((i) => (i.url ? [i.url] : [])));
  const inList = (row: PreviewRow) =>
    existingKeys.has(dedupeKey(row.title)) || (row.url !== undefined && existingUrls.has(row.url));

  const noticeText = (row: PreviewRow): string | null => {
    switch (row.notice) {
      case "duplicate":
        return inList(row) ? "Ya está en tu lista" : "Está repetido en lo que has pegado";
      case "looks-like-text":
        return "Esto parece un texto, no algo de tu lista";
      case "other-author":
        return row.author ? `Lo escribió ${row.author}` : "Lo escribió otra persona";
      case "needs-name":
        return "Ponle nombre";
      case "no-room":
        return `Solo caben ${preview?.capacity ?? capacity}. Quítale la casilla a lo que no quieras o quita algo de tu lista.`;
      default:
        return null;
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    const rows = selectedItems(preview);
    if (rows.length === 0) return;
    for (const row of rows) {
      const check = listItemSchema.safeParse(row);
      if (!check.success) {
        toast.error(`Revisa «${row.title || "una fila sin nombre"}»: ${check.error.issues[0]?.message ?? "no se puede apuntar"}`);
        return;
      }
    }
    const skipped = preview.rows.filter((r) => r.notice === "duplicate" && !r.checked && inList(r)).length;
    setSaving(true);
    try {
      const { inserted } = await importItems({ items: rows });
      const message =
        `${inserted === 1 ? "1 cosa apuntada" : `${inserted} cosas apuntadas`} en tu lista` +
        (skipped > 0 ? ` · ${skipped} ya ${skipped === 1 ? "estaba" : "estaban"}` : "");
      toast.success(
        message,
        readers && readers.length === 0
          ? { action: { label: "Compartirla", onClick: focusShareField } }
          : undefined,
      );
      router.push("/mi-lista");
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo apuntar. Inténtalo de nuevo."));
    } finally {
      setSaving(false);
    }
  };

  const counts = preview ? summary(preview) : null;
  const selectable = preview?.rows.filter((r) => r.notice !== "duplicate") ?? [];
  const allDuplicates = preview !== null && preview.rows.length > 0 && selectable.length === 0;
  const droppedWishlistLinks = preview?.rows.some((r) => r.droppedWishlistLink) ?? false;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 w-full max-w-3xl">
      <BackLink fallbackHref="/mi-lista" label="Mi lista" />
      <div>
        <h1 className="text-4xl font-medium">Pegar una lista</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trae de una vez una lista que ya tengas en otra app, en una nota o en un mensaje.
        </p>
      </div>

      {items === undefined ? (
        <div role="status" className="h-40 rounded-2xl border border-dashed border-border/60 animate-pulse">
          <span className="sr-only">Cargando tu lista…</span>
        </div>
      ) : capacity === 0 && !preview ? (
        <p className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
          Tu lista ya tiene {MAX_LIST_ITEMS} cosas, el máximo. Quita alguna para apuntar otra.
        </p>
      ) : (
        <>
          {showPaste ? (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <p className="text-sm text-muted-foreground">
                  Normalmente, cada línea será una cosa. También vale un archivo .csv o .txt, como
                  una hoja exportada de Excel. Trae solo lo que te siga haciendo ilusión. Se lee en
                  tu navegador: PickPal no entra en la otra app ni abre los enlaces.
                </p>
                <Textarea
                  value=""
                  onPaste={onPaste}
                  // Algunos teclados del móvil pegan sin evento de pegar: llega
                  // como un cambio de texto. Una sola letra es alguien tecleando.
                  onChange={(e) => {
                    if (e.target.value.length > 1) handleText(e.target.value);
                  }}
                  placeholder="Pulsa aquí y pega"
                  aria-label="Pulsa aquí y pega tu lista"
                  aria-describedby={problem ? "pegar-problema" : undefined}
                  className="min-h-28 resize-none rounded-xl border-dashed bg-background/40 p-4"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" onClick={readClipboard}>
                    <ClipboardPaste aria-hidden />
                    Pegar
                  </Button>
                  <Button variant="outline" onClick={() => fileInput.current?.click()}>
                    <FileUp aria-hidden />
                    Subir un archivo
                  </Button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(e) => {
                      void onFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  {preview && (
                    <Button variant="ghost" onClick={() => setShowPaste(false)}>
                      Cancelar
                    </Button>
                  )}
                </div>
                {problem && (
                  <p id="pegar-problema" className="text-sm text-muted-foreground" aria-live="polite">
                    {problem}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => setShowPaste(true)}>
                <ClipboardPaste aria-hidden />
                Pegar otra lista
              </Button>
            </div>
          )}

          {preview && (
            <section aria-label="Lo que vas a apuntar" className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">{remainingText(left)}</p>
                <p className="sr-only" aria-live="polite">
                  {announced}
                </p>
                {allDuplicates ? (
                  <p className="text-sm text-muted-foreground">Todo eso ya está en tu lista.</p>
                ) : null}
                {counts && counts.withoutLink > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {counts.withoutLink === 1
                      ? "1 llega sin enlace a la tienda."
                      : `${counts.withoutLink} llegan sin enlace a la tienda.`}{" "}
                    Puedes añadirlo después desde tu lista.
                  </p>
                )}
                {fromWishlistCom && droppedWishlistLinks && (
                  <p className="text-sm text-muted-foreground">
                    Los enlaces de wishlist.com llevan a wishlist.com y no a la tienda, así que no
                    se guardan.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Cada cosa llega sin su estado: si en la otra app alguien la había reservado, aquí
                  llega como cualquier otra. Si sabes que algo ya lo tienes, quítale la casilla.
                </p>
              </div>

              {Array.from({ length: preview.groups }, (_, group) => {
                const rows = preview.rows.filter((r) => r.group === group);
                if (rows.length === 0) return null;
                return (
                  <PreviewGroup
                    key={group}
                    group={group}
                    rows={rows}
                    labelled={preview.groups > 1}
                    left={left}
                    noticeText={noticeText}
                    onToggleGroup={() => setPreview((s) => s && toggleGroup(s, group))}
                    onToggle={(key) => setPreview((s) => s && toggleRow(s, key))}
                    onRename={(key, title) => setPreview((s) => s && renameRow(s, key, title))}
                  />
                );
              })}

              <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background py-3">
                <span className="text-sm text-muted-foreground">{remainingText(left)}</span>
                <Button
                  size="lg"
                  className="hover:bg-primary/80"
                  disabled={saving || (counts?.selected ?? 0) === 0}
                  onClick={handleImport}
                >
                  {saving ? "Apuntando…" : `Apuntar ${things(counts?.selected ?? 0)}`}
                </Button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

/**
 * El título de una fila, corregible. Se escribe en local y se entrega al salir
 * del campo (o con Intro): `renameRow` recorta espacios, y hacerlo a cada
 * pulsación se comería el espacio entre dos palabras mientras se escribe.
 */
function RowTitle({ title, onRename }: { title: string; onRename: (title: string) => void }) {
  const [draft, setDraft] = useState(title);
  const [prev, setPrev] = useState(title);
  if (title !== prev) {
    setPrev(title);
    setDraft(title);
  }
  const commit = () => {
    if (draft !== title) onRename(draft);
  };
  return (
    <Input
      value={draft}
      maxLength={120}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      placeholder="Ponle nombre"
      aria-label="Qué es"
      className="h-8 border-transparent bg-transparent px-1.5 shadow-none hover:border-input focus-visible:border-ring"
    />
  );
}

/**
 * Una lista pegada. Si se pegaron varias, cada una lleva su casilla de grupo,
 * para saltarse de un toque una lista vieja. Cada fila es una casilla y el
 * título, que se puede corregir; si llegó un enlace a una tienda, debajo se ve
 * su dominio. Nada más: cien filas con más controles no caben en un móvil.
 */
function PreviewGroup({
  group,
  rows,
  labelled,
  left,
  noticeText,
  onToggleGroup,
  onToggle,
  onRename,
}: {
  group: number;
  rows: PreviewRow[];
  labelled: boolean;
  left: number;
  noticeText: (row: PreviewRow) => string | null;
  onToggleGroup: () => void;
  onToggle: (key: string) => void;
  onRename: (key: string, title: string) => void;
}) {
  const checked = rows.filter((r) => r.checked).length;
  const groupBox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (groupBox.current) groupBox.current.indeterminate = checked > 0 && checked < rows.length;
  }, [checked, rows.length]);

  return (
    <div className="space-y-2">
      {labelled && (
        <label className="flex items-center gap-3 px-3 text-sm font-medium">
          <input
            ref={groupBox}
            type="checkbox"
            checked={checked > 0}
            onChange={onToggleGroup}
            className="size-4 rounded border-input accent-primary"
          />
          Lista {group + 1} · {things(rows.length)}
        </label>
      )}
      <ul className="space-y-2">
        {rows.map((row) => {
          const notice = noticeText(row);
          const noticeId = `aviso-${row.key}`;
          return (
            <li
              key={row.key}
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 p-3"
            >
              <input
                type="checkbox"
                checked={row.checked}
                disabled={!row.checked && (left === 0 || row.title.trim() === "")}
                onChange={() => onToggle(row.key)}
                aria-label={row.title ? `Apuntar «${row.title}»` : "Apuntar esta fila"}
                aria-describedby={notice ? noticeId : undefined}
                className="mt-2 size-4 shrink-0 rounded border-input accent-primary"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <RowTitle title={row.title} onRename={(title) => onRename(row.key, title)} />
                {row.url && <ListItemLink url={row.url} className="px-1.5" />}
                {notice && (
                  <p id={noticeId} className="px-1.5 text-xs text-muted-foreground">
                    {notice}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

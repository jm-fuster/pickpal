"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  CalendarDays, CalendarX2, Camera, Check, Gift, NotebookPen, PencilLine, Repeat2, Ruler, Star, Tags, Trash2, Users, X,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { AddRowButton } from "@/components/layout/AddRowButton";
import { BackLink } from "@/components/layout/BackLink";
import { LoadingFallback } from "@/components/layout/LoadingFallback";
import { AvatarPickerDialog } from "@/components/people/AvatarPickerDialog";
import { InterestTagInput } from "@/components/people/InterestTagInput";
import { BrandTagInput } from "@/components/people/BrandTagInput";
import { AiNotesNotice } from "@/components/people/AiNotesNotice";
import { ShareDialog } from "@/components/people/ShareDialog";
import { AddToHistoryDialog, type HistoryValues } from "@/components/people/AddToHistoryDialog";
import { PersonListSection } from "@/components/lista/PersonListSection";
import { SavedIdeasCard } from "@/components/people/SavedIdeasCard";
import { RELATIONSHIPS, REACTIONS } from "@/lib/options";
import { cn } from "@/lib/utils";
import { closestOccasionLabel } from "@/lib/dates";
import { ALL_STORES, sanitizeFavoriteStores, type StoreId } from "@/lib/stores";

// Los formularios de evento y de historial (react-hook-form + zod, el slider de
// presupuesto, el selector de fecha) solo se usan al pulsar «Añadir» o
// «Editar». Van en su propio chunk, que se pide en cuanto monta la página: llega
// en paralelo a los datos y no retrasa la hidratación. Mientras tanto, el
// marcador es la misma fila «Añadir…» que pinta el formulario plegado.
const loadImportantDateForm = () => import("@/components/people/ImportantDateForm");
const loadGiftHistoryForm = () => import("@/components/people/GiftHistoryForm");
const ImportantDateForm = dynamic(
  () => loadImportantDateForm().then((m) => m.ImportantDateForm),
  { loading: () => <AddRowButton>Añadir evento</AddRowButton> },
);
const EditImportantDateInline = dynamic(() =>
  loadImportantDateForm().then((m) => m.EditImportantDateInline),
);
const GiftHistoryForm = dynamic(
  () => loadGiftHistoryForm().then((m) => m.GiftHistoryForm),
  { loading: () => <AddRowButton>Añadir regalo</AddRowButton> },
);
const EditGiftHistoryInline = dynamic(() =>
  loadGiftHistoryForm().then((m) => m.EditGiftHistoryInline),
);

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

// ─── Inner component — person is guaranteed loaded ────────────────────────────

type Person = NonNullable<FunctionReturnType<typeof api.people.getById>>;
type Dates = NonNullable<FunctionReturnType<typeof api.importantDates.getByPerson>>;
type GiftHistory = NonNullable<FunctionReturnType<typeof api.giftHistory.getByPerson>>;
type SavedIdeas = NonNullable<FunctionReturnType<typeof api.savedIdeas.getByPerson>>;

function PersonDetailContent({
  person,
  dates,
  giftHistory,
  savedIdeas,
  favoriteStores,
  isOwner,
}: {
  person: Person;
  dates: Dates;
  giftHistory: GiftHistory;
  savedIdeas: SavedIdeas;
  favoriteStores: StoreId[];
  isOwner: boolean;
}) {
  const id = person._id as Id<"people">;
  const router = useRouter();
  const updatePerson = useMutation(api.people.update);
  const removePerson = useMutation(api.people.remove);
  const removeDate = useMutation(api.importantDates.remove);
  const removeHistoryEntry = useMutation(api.giftHistory.remove);
  const removeSavedIdea = useMutation(api.savedIdeas.remove);
  const createHistoryEntry = useMutation(api.giftHistory.create);

  // ── Local state (mirrors DB, kept in sync on every autosave) ──
  const [headerName, setHeaderName] = useState(person.name);
  const [headerRelationship, setHeaderRelationship] = useState(person.relationship);
  const [headerAvatar, setHeaderAvatar] = useState<string | undefined>(person.avatarUrl);
  const [localInterests, setLocalInterests] = useState<string[]>(person.interests);
  const [localBrands, setLocalBrands] = useState<string[]>(person.favoriteBrands ?? []);
  const [localNotes, setLocalNotes] = useState(person.notes ?? "");
  const [localShoeSize, setLocalShoeSize] = useState(person.shoeSize ?? "");
  const [localClothingSize, setLocalClothingSize] = useState(person.clothingSize ?? "");
  const [localAllergies, setLocalAllergies] = useState(person.allergies ?? "");
  const [localDislikes, setLocalDislikes] = useState(person.dislikes ?? "");

  // ── Saved indicator ──
  const [savedRecently, setSavedRecently] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Delete / inline edit ──
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingDate, setEditingDate] = useState<Dates[number] | null>(null);
  const [removingDate, setRemovingDate] = useState<{ date: Dates[number]; ideas: number } | null>(null);
  const [editingGift, setEditingGift] = useState<GiftHistory[number] | null>(null);

  // ── Convert saved idea to history ──
  const [convertingIdea, setConvertingIdea] = useState<SavedIdeas[number] | null>(null);

  // ── Shared save (silent on success, toast on error) ──
  type SaveFields = {
    name?: string; relationship?: string; interests?: string[];
    favoriteBrands?: string[];
    notes?: string; shoeSize?: string; clothingSize?: string;
    allergies?: string; dislikes?: string; avatarUrl?: string;
  };
  const save = async (fields: SaveFields) => {
    try {
      await updatePerson({ id, ...fields });
      clearTimeout(savedTimerRef.current);
      setSavedRecently(true);
      savedTimerRef.current = setTimeout(() => setSavedRecently(false), 2000);
    } catch {
      toast.error("No se pudo guardar");
    }
  };

  const handleRemoveDate = async (dateId: Id<"importantDates">) => {
    try { await removeDate({ id: dateId }); toast.success("Evento eliminado"); }
    catch { toast.error("No se pudo eliminar el evento"); }
  };

  const handleConvertToHistory = async (values: HistoryValues) => {
    if (!convertingIdea) return;
    await createHistoryEntry({
      personId: id,
      giftName: convertingIdea.title,
      occasionLabel: values.occasionLabel,
      year: values.year,
      reaction: values.reaction,
      notes: values.notes,
    });
    await removeSavedIdea({ id: convertingIdea._id });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removePerson({ id });
      toast.success("Persona eliminada");
      router.push("/seres-queridos");
    } catch { toast.error("Algo salió mal"); setDeleting(false); }
  };

  return (
    <main className="flex flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8 w-full max-w-6xl">
      {/* Título de página para navegación por encabezados (el nombre visible es un input editable) */}
      <h1 className="sr-only">{headerName}</h1>
      <BackLink />

      {/* ── Header ── */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Avatar with camera overlay */}
        <div className="relative shrink-0 w-24 h-24 group">
          <Avatar className="size-24 ring-1 ring-border">
            {headerAvatar ? <AvatarImage src={headerAvatar} alt={headerName} /> : null}
            <AvatarFallback className="text-xl">
              {headerName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <AvatarPickerDialog
            value={headerAvatar}
            onChange={(url) => { setHeaderAvatar(url); if (url) save({ avatarUrl: url }); }}
            trigger={
              <button
                type="button"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Cambiar avatar"
              >
                <Camera className="size-6 text-white" />
              </button>
            }
          />
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {/* Name — autosave on blur / Enter */}
          <input
            value={headerName}
            onChange={(e) => setHeaderName(e.target.value)}
            onBlur={() => { if (headerName.trim()) save({ name: headerName.trim() }); }}
            onKeyDown={(e) => { if (e.key === "Enter" && headerName.trim()) { (e.target as HTMLInputElement).blur(); } }}
            className="w-full text-4xl font-medium bg-transparent border-0 border-b-2 border-transparent outline-none focus:border-primary/40 transition-colors leading-tight"
            aria-label="Nombre"
          />
          {/* Relationship — autosave on change */}
          <Select
            value={headerRelationship}
            onValueChange={(v) => {
              if (!v) return;
              setHeaderRelationship(v);
              save({ relationship: v });
            }}
          >
            <SelectTrigger aria-label="Relación" className="w-fit">
              <span>{RELATIONSHIPS.find((r) => r.value === headerRelationship)?.label ?? headerRelationship}</span>
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href={`/seres-queridos/${person._id}/gifts?from=person`} className={buttonVariants()}>
            <Gift className="size-4" aria-hidden />
            Ideas de regalo
          </Link>
          <ShareDialog
            personId={id}
            personName={person.name}
            isOwner={isOwner}
            trigger={
              <Button variant="outline" size="icon" aria-label={`Compartir la ficha de ${person.name}`}>
                <Users className="size-4" aria-hidden />
              </Button>
            }
          />
          {/* Borrar la ficha para todos es solo de quien la creó (decisión 1
              de docs/dudas.md); un invitado se desliga desde "Compartir". */}
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmDeleteOpen(true)}
              aria-label={`Eliminar a ${person.name}`}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </header>

      {/* Delete dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar a {person.name}?</DialogTitle>
            <DialogDescription>
              Se borrarán también todos sus eventos. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={deleting}>Cancelar</Button>} />
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quitar un evento con ideas guardadas: avisa de que pasan a «Sin
          ocasión» (decisión 12 de docs/encargo-ocasiones.md). */}
      <Dialog open={removingDate !== null} onOpenChange={(open) => { if (!open) setRemovingDate(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Quitar {removingDate?.date.label}?</DialogTitle>
            <DialogDescription>
              {removingDate?.ideas === 1
                ? "Su idea guardada pasará a «Sin ocasión»."
                : `Sus ${removingDate?.ideas} ideas guardadas pasarán a «Sin ocasión».`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancelar</Button>} />
            <Button
              variant="destructive"
              onClick={() => {
                if (removingDate) void handleRemoveDate(removingDate.date._id);
                setRemovingDate(null);
              }}
            >
              Quitar evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Interests + Notes card ── */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
              <Star className="size-3.5" aria-hidden />
              Intereses
            </h2>
            {/* Interests — autosave on each tag change */}
            <InterestTagInput
              value={localInterests}
              onChange={(tags) => {
                setLocalInterests(tags);
                save({ interests: tags });
              }}
            />

            <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2 pt-2">
              <Tags className="size-3.5" aria-hidden />
              Marcas favoritas
            </h2>
            <p className="text-xs text-muted-foreground">
              Si siempre compra en alguna marca, la IA lo tendrá en cuenta y podrá enlazar a su tienda oficial.
            </p>
            {/* Favorite brands — autosave on each tag change */}
            <BrandTagInput
              value={localBrands}
              onChange={(tags) => {
                setLocalBrands(tags);
                save({ favoriteBrands: tags });
              }}
            />

            <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2 pt-2">
              <NotebookPen className="size-3.5" aria-hidden />
              Notas
            </h2>
            {/* Notes — autosave on blur */}
            <Textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={() => save({ notes: localNotes || undefined })}
              rows={4}
              placeholder="Restricciones, preferencias, contexto…"
            />
            <AiNotesNotice />
          </CardContent>
        </Card>

        {/* ── Events card ── */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
              <CalendarDays className="size-3.5" aria-hidden />
              Eventos
            </h2>
            {dates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay eventos guardados. Añade el primero abajo.
              </p>
            ) : (
              <ul className="space-y-2">
                {dates.map((d) => (
                  <li key={d._id}>
                    {editingDate?._id === d._id ? (
                      <EditImportantDateInline date={d} onClose={() => setEditingDate(null)} />
                    ) : (
                      <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 text-sm">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{d.label}</span>
                            {d.recurring === false ? (
                              <Badge variant="outline" className="gap-1 text-muted-foreground">
                                <CalendarX2 className="size-3" aria-hidden />Única
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-muted-foreground">
                                <Repeat2 className="size-3" aria-hidden />Anual
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {d.day} {MONTHS[d.month - 1]}{d.year ? ` ${d.year}` : ""}
                          </p>
                          {(d.budgetMin !== undefined || d.budgetMax !== undefined) && (
                            <p className="text-xs text-muted-foreground">
                              Presupuesto:{" "}
                              {d.budgetMin !== undefined && d.budgetMax !== undefined
                                ? `${(d.budgetMin / 100).toFixed(0)}€ – ${(d.budgetMax / 100).toFixed(0)}€`
                                : d.budgetMin !== undefined
                                  ? `desde ${(d.budgetMin / 100).toFixed(0)}€`
                                  : `hasta ${(d.budgetMax! / 100).toFixed(0)}€`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon-sm" aria-label="Editar evento" onClick={() => setEditingDate(d)}>
                            <PencilLine className="size-3.5" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost" size="icon-sm" aria-label="Quitar evento"
                            onClick={() => {
                              // Con ideas guardadas se confirma antes, porque
                              // pasan a «Sin ocasión»; sin ideas, como siempre.
                              const ideas = savedIdeas.filter((s) => s.importantDateId === d._id).length;
                              if (ideas > 0) setRemovingDate({ date: d, ideas });
                              else void handleRemoveDate(d._id);
                            }}
                          >
                            <X className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <ImportantDateForm personId={id} />
          </CardContent>
        </Card>
      </div>

      {/* ── Practical data card ── */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
            <Ruler className="size-3.5" aria-hidden />
            Datos prácticos
          </h2>
          <p className="text-xs text-muted-foreground">
            Tallas y restricciones para que la IA no sugiera nada que no se pueda usar.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shoeSize">Talla de zapato</Label>
              <Input
                id="shoeSize"
                placeholder="EU 42, 38…"
                value={localShoeSize}
                onChange={(e) => setLocalShoeSize(e.target.value)}
                onBlur={() => save({ shoeSize: localShoeSize || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clothingSize">Talla de ropa</Label>
              <Input
                id="clothingSize"
                placeholder="M, L, 38…"
                value={localClothingSize}
                onChange={(e) => setLocalClothingSize(e.target.value)}
                onBlur={() => save({ clothingSize: localClothingSize || undefined })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="allergies">Alergias o restricciones</Label>
            <Textarea
              id="allergies"
              rows={2}
              placeholder="Frutos secos, gluten, látex…"
              value={localAllergies}
              onChange={(e) => setLocalAllergies(e.target.value)}
              onBlur={() => save({ allergies: localAllergies || undefined })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dislikes">Cosas que no le gustan</Label>
            <Textarea
              id="dislikes"
              rows={2}
              placeholder="Color amarillo, perfumes fuertes…"
              value={localDislikes}
              onChange={(e) => setLocalDislikes(e.target.value)}
              onBlur={() => save({ dislikes: localDislikes || undefined })}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Autosave indicator (fixed, always visible) ──
          El texto se renderiza condicionalmente DENTRO de la región aria-live:
          un cambio de opacidad no se anuncia; la inserción de contenido sí. */}
      <div
        aria-live="polite"
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-md transition-all duration-300 ${
          savedRecently ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        {savedRecently ? (
          <>
            <Check className="size-3" aria-hidden />
            Guardado
          </>
        ) : null}
      </div>

      {/* ── Lista que esta persona te ha compartido («Mi lista» suya) ──
          Solo sale si tú la has asociado a esta ficha; otro invitado de la
          ficha no la ve (decisión 12 de docs/encargo-lista.md). */}
      <PersonListSection personId={id} personName={headerName} dates={dates} />

      {/* ── Saved ideas card, agrupada por ocasión (docs/encargo-ocasiones.md) ── */}
      <SavedIdeasCard
        savedIdeas={savedIdeas}
        dates={dates}
        favoriteStores={favoriteStores}
        favoriteBrands={localBrands}
        onGiven={setConvertingIdea}
      />

      {/* ── Convert saved idea to history dialog ──
          La ocasión es el nombre actual del evento de la idea. Sin evento
          («Sin ocasión») se pregunta, como en la lista, proponiendo la fecha
          de la ficha más cercana (decisión 13 de docs/encargo-ocasiones.md). */}
      <AddToHistoryDialog
        key={convertingIdea?._id ?? "cerrado"}
        gift={convertingIdea}
        fixedOccasion={dates.find((d) => d._id === convertingIdea?.importantDateId)?.label}
        defaultOccasion={closestOccasionLabel(dates)}
        onClose={() => setConvertingIdea(null)}
        onConfirm={handleConvertToHistory}
      />

      {/* ── Gift history card ── */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
            <Gift className="size-3.5" aria-hidden />
            Historial de regalos
          </h2>
          {giftHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay regalos registrados. Añade el primero para que la IA aprenda qué funciona y qué no.
            </p>
          ) : (
            <ul className="space-y-2">
              {giftHistory.map((h) => {
                const reaction = REACTIONS.find((r) => r.value === h.reaction);
                return (
                  <li key={h._id}>
                    {editingGift?._id === h._id ? (
                      <EditGiftHistoryInline entry={h} onClose={() => setEditingGift(null)} />
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 p-3 text-sm">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="truncate">
                            <span className="font-medium">{h.giftName}</span>
                            <span className="text-muted-foreground">
                              {" · "}{h.occasionLabel}{h.year ? ` ${h.year}` : ""}{reaction ? ` · ${reaction.label}` : ""}
                            </span>
                          </span>
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon-sm" aria-label="Editar regalo" onClick={() => setEditingGift(h)}>
                            <PencilLine className="size-3.5" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost" size="icon-sm" aria-label="Quitar entrada"
                            onClick={async () => {
                              try { await removeHistoryEntry({ id: h._id }); toast.success("Entrada eliminada"); }
                              catch { toast.error("No se pudo eliminar la entrada"); }
                            }}
                          >
                            <X className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <GiftHistoryForm personId={id} />
        </CardContent>
      </Card>
    </main>
  );
}

// ─── Page shell — loads data ──────────────────────────────────────────────────

export default function PersonDetailPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = use(params);
  const id = personId as Id<"people">;
  const { isLoaded, isSignedIn, userId } = useAuth();
  const ready = isLoaded && isSignedIn;

  const person = useQuery(api.people.getById, ready ? { id } : "skip");
  const dates = useQuery(api.importantDates.getByPerson, ready ? { personId: id } : "skip");
  const giftHistory = useQuery(api.giftHistory.getByPerson, ready ? { personId: id } : "skip");
  const savedIdeas = useQuery(api.savedIdeas.getByPerson, ready ? { personId: id } : "skip");
  const settings = useQuery(api.settings.getMine, ready ? {} : "skip");

  useEffect(() => {
    void loadImportantDateForm();
    void loadGiftHistoryForm();
  }, []);

  if (!ready || person === undefined || dates === undefined || giftHistory === undefined || savedIdeas === undefined) {
    return <LoadingFallback />;
  }

  const favoriteStores =
    settings && settings.favoriteStores.length > 0
      ? sanitizeFavoriteStores(settings.favoriteStores)
      : [...ALL_STORES];

  if (person === null) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-8">
        <p>Persona no encontrada.</p>
        <Link href="/seres-queridos" className={cn(buttonVariants({ variant: "outline" }))}>Volver</Link>
      </main>
    );
  }

  // key fuerza el remount al navegar entre fichas (back/forward): el estado
  // local se siembra desde props una sola vez y, sin remount, la ficha B
  // mostraría datos de A y un blur de autosave los escribiría en B.
  return (
    <PersonDetailContent
      key={person._id}
      person={person}
      dates={dates}
      giftHistory={giftHistory}
      savedIdeas={savedIdeas}
      favoriteStores={favoriteStores}
      isOwner={person.clerkUserId === userId}
    />
  );
}

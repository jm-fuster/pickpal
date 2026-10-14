"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { Camera, Check, Trash2, Users } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { BackLink } from "@/components/layout/BackLink";
import { LoadingFallback } from "@/components/layout/LoadingFallback";
import { AvatarPickerDialog } from "@/components/people/AvatarPickerDialog";
import { ShareDialog } from "@/components/people/ShareDialog";
import { AddToHistoryDialog, type HistoryValues } from "@/components/people/AddToHistoryDialog";
import { ActionMenu } from "@/components/people/ActionMenu";
import { NextOccasionCard } from "@/components/people/NextOccasionCard";
import { MoreIdeasCard } from "@/components/people/MoreIdeasCard";
import { AboutPersonCard, type AboutFields } from "@/components/people/AboutPersonCard";
import { PersonEventsCard, loadImportantDateForm } from "@/components/people/PersonEventsCard";
import { GiftHistoryCard, loadGiftHistoryForm } from "@/components/people/GiftHistoryCard";
import type { GiveTarget, SharedList } from "@/components/people/ideaParts";
import { RELATIONSHIPS } from "@/lib/options";
import { cn } from "@/lib/utils";
import { closestOccasionLabel } from "@/lib/dates";
import { nextOccasion } from "@/lib/nextOccasion";
import { ALL_STORES, sanitizeFavoriteStores, type StoreId } from "@/lib/stores";

// ─── Inner component — person is guaranteed loaded ────────────────────────────

type Person = NonNullable<FunctionReturnType<typeof api.people.getById>>;
type Dates = NonNullable<FunctionReturnType<typeof api.importantDates.getByPerson>>;
type GiftHistory = NonNullable<FunctionReturnType<typeof api.giftHistory.getByPerson>>;
type SavedIdeas = NonNullable<FunctionReturnType<typeof api.savedIdeas.getByPerson>>;

type Tab = "regalos" | "sobre";

/**
 * La ficha de un ser querido (rediseño del 14-oct-2026, docs/design-system.md
 * · «Ficha de un ser querido»). Tres niveles: la próxima ocasión con lo que
 * tienes pensado, a todo el ancho; debajo lo que aún no has decidido (su lista
 * y el resto de ideas) y el historial plegado; al lado, en una columna de
 * consulta, sus fechas y lo que sabes de ella. En el móvil esa columna es la
 * pestaña «Sobre {nombre}».
 */
function PersonDetailContent({
  person,
  dates,
  giftHistory,
  savedIdeas,
  lists,
  people,
  favoriteStores,
  isOwner,
}: {
  person: Person;
  dates: Dates;
  giftHistory: GiftHistory;
  savedIdeas: SavedIdeas;
  lists: SharedList[];
  people: Array<{ _id: Id<"people">; name: string }>;
  favoriteStores: StoreId[];
  isOwner: boolean;
}) {
  const id = person._id as Id<"people">;
  const router = useRouter();
  const updatePerson = useMutation(api.people.update);
  const removePerson = useMutation(api.people.remove);
  const removeDate = useMutation(api.importantDates.remove);
  const removeSavedIdea = useMutation(api.savedIdeas.remove);
  const createHistoryEntry = useMutation(api.giftHistory.create);
  const markGiven = useMutation(api.lists.markGiven);

  // ── Local state (mirrors DB, kept in sync on every autosave) ──
  const [headerName, setHeaderName] = useState(person.name);
  const [headerRelationship, setHeaderRelationship] = useState(person.relationship);
  const [headerAvatar, setHeaderAvatar] = useState<string | undefined>(person.avatarUrl);

  // ── Saved indicator ──
  const [savedRecently, setSavedRecently] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Dialogs, tabs, forms ──
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingDate, setRemovingDate] = useState<{ date: Dates[number]; ideas: number } | null>(null);
  const [giving, setGiving] = useState<GiveTarget | null>(null);
  const [tab, setTab] = useState<Tab>("regalos");
  const [dateFormOpen, setDateFormOpen] = useState(false);

  // ── Shared save (silent on success, toast on error) ──
  type SaveFields = AboutFields & { name?: string; relationship?: string; avatarUrl?: string };
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

  const requestRemoveDate = (d: Dates[number]) => {
    // Con ideas guardadas se confirma antes, porque pasan a «Sin ocasión»;
    // sin ideas, como siempre.
    const ideas = savedIdeas.filter((s) => s.importantDateId === d._id).length;
    if (ideas > 0) setRemovingDate({ date: d, ideas });
    else void handleRemoveDate(d._id);
  };

  // «Ya se lo he regalado»: una idea guardada pasa al historial y sale de las
  // ideas; algo de su lista pasa al historial y queda marcado como regalado.
  const handleGiven = async (values: HistoryValues) => {
    if (!giving) return;
    const title = giving.kind === "idea" ? giving.idea.title : giving.title;
    await createHistoryEntry({
      personId: id,
      giftName: title,
      occasionLabel: values.occasionLabel,
      year: values.year,
      reaction: values.reaction,
      notes: values.notes,
    });
    if (giving.kind === "idea") await removeSavedIdea({ id: giving.idea._id });
    else await markGiven({ claimId: giving.claimId });
  };

  // «Añadir una fecha» en la cabecera: abre el formulario de Eventos, que en el
  // móvil vive en la otra pestaña.
  const handleAddDate = () => {
    setTab("sobre");
    setDateFormOpen(true);
    requestAnimationFrame(() =>
      document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removePerson({ id });
      toast.success("Persona eliminada");
      router.push("/seres-queridos");
    } catch { toast.error("Algo salió mal"); setDeleting(false); }
  };

  // Lo que ya enseña «Lo que tienes pensado» no se repite debajo.
  const next = nextOccasion(dates);
  const knownDate = (dateId?: Id<"importantDates">) => dateId !== undefined && dates.some((d) => d._id === dateId);
  const inHero = (s: SavedIdeas[number]) =>
    next ? s.importantDateId === next.event._id : !knownDate(s.importantDateId);
  const otherIdeas = savedIdeas.filter((s) => !inHero(s));
  const hiddenItemIds = new Set<string>(
    next
      ? lists.flatMap((l) => l.items.filter((i) => i.state === "mine" && i.occasionId === next.event._id).map((i) => i._id))
      : [],
  );
  const favoriteBrands = person.favoriteBrands ?? [];
  const firstName = headerName.trim().split(/\s+/)[0] || headerName;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "regalos", label: "Regalos" },
    { id: "sobre", label: `Sobre ${firstName}` },
  ];

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 w-full max-w-6xl">
      {/* Título de página para navegación por encabezados (el nombre visible es un input editable) */}
      <h1 className="sr-only">{headerName}</h1>
      <BackLink />

      {/* ── Header ── */}
      <header className="flex items-center gap-4 sm:gap-6">
        {/* Avatar with camera overlay */}
        <div className="relative shrink-0 size-16 sm:size-24 group">
          <Avatar className="size-16 sm:size-24 ring-1 ring-border">
            {headerAvatar ? <AvatarImage src={headerAvatar} alt={headerName} /> : null}
            <AvatarFallback className="text-lg sm:text-xl">
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

        <div className="flex-1 min-w-0">
          {/* Name — autosave on blur / Enter */}
          <input
            value={headerName}
            onChange={(e) => setHeaderName(e.target.value)}
            onBlur={() => { if (headerName.trim()) save({ name: headerName.trim() }); }}
            onKeyDown={(e) => { if (e.key === "Enter" && headerName.trim()) { (e.target as HTMLInputElement).blur(); } }}
            className="w-full font-heading text-3xl sm:text-4xl font-medium bg-transparent border-0 border-b-2 border-transparent outline-none focus:border-primary/40 transition-colors leading-tight"
            aria-label="Nombre"
          />
          {/* Relationship — autosave on change. Se lee como texto; el chevron dice que se cambia. */}
          <Select
            value={headerRelationship}
            onValueChange={(v) => {
              if (!v) return;
              setHeaderRelationship(v);
              save({ relationship: v });
            }}
          >
            <SelectTrigger
              aria-label="Relación"
              className="-ml-2 w-fit border-transparent bg-transparent px-2 text-muted-foreground shadow-none hover:border-input dark:bg-transparent"
            >
              <span>{RELATIONSHIPS.find((r) => r.value === headerRelationship)?.label ?? headerRelationship}</span>
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ActionMenu
          label={`Más acciones para la ficha de ${person.name}`}
          className="self-start"
          groups={[
            { actions: [{ label: "Compartir la ficha", icon: Users, onSelect: () => setShareOpen(true) }] },
            // Borrar la ficha para todos es solo de quien la creó (decisión 1
            // de docs/dudas.md); un invitado se desliga desde «Compartir».
            {
              actions: isOwner
                ? [{ label: `Eliminar a ${person.name}`, icon: Trash2, destructive: true, onSelect: () => setConfirmDeleteOpen(true) }]
                : [],
            },
          ]}
        />
      </header>

      <ShareDialog
        personId={id}
        personName={person.name}
        isOwner={isOwner}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

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

      {/* ── Nivel 1: la próxima ocasión y lo que tienes pensado ── */}
      <NextOccasionCard
        personId={id}
        personName={firstName}
        dates={dates}
        savedIdeas={savedIdeas}
        lists={lists}
        favoriteStores={favoriteStores}
        favoriteBrands={favoriteBrands}
        onGive={setGiving}
        onAddDate={handleAddDate}
      />

      {/* En el móvil, dos pestañas; desde md, las dos columnas a la vez. */}
      <div role="tablist" aria-label="Secciones de la ficha" className="-mb-2 flex border-b border-border md:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── Niveles 2 y 3: lo que aún no has decidido y el historial ── */}
        <div
          id="panel-regalos"
          role="tabpanel"
          aria-labelledby="tab-regalos"
          className={cn("min-w-0 space-y-6", tab !== "regalos" && "hidden md:block")}
        >
          <MoreIdeasCard
            personId={id}
            personName={firstName}
            lists={lists}
            people={people}
            dates={dates}
            personBudget={{ budgetMin: person.budgetMin, budgetMax: person.budgetMax }}
            ideas={otherIdeas}
            hiddenItemIds={hiddenItemIds}
            favoriteStores={favoriteStores}
            favoriteBrands={favoriteBrands}
            onGive={setGiving}
          />
          <GiftHistoryCard personId={id} entries={giftHistory} />
        </div>

        {/* ── Columna de consulta: sus fechas y lo que sabes de ella ── */}
        <div
          id="panel-sobre"
          role="tabpanel"
          aria-labelledby="tab-sobre"
          className={cn("min-w-0 space-y-6", tab !== "sobre" && "hidden md:block")}
        >
          <PersonEventsCard
            personId={id}
            dates={dates}
            formOpen={dateFormOpen}
            onFormOpenChange={setDateFormOpen}
            onRemove={requestRemoveDate}
          />
          <AboutPersonCard
            name={firstName}
            initial={{
              interests: person.interests,
              favoriteBrands: person.favoriteBrands,
              notes: person.notes,
              shoeSize: person.shoeSize,
              clothingSize: person.clothingSize,
              allergies: person.allergies,
              dislikes: person.dislikes,
            }}
            save={save}
          />
        </div>
      </div>

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

      {/* «Ya se lo he regalado», venga de una idea o de su lista. Una idea
          trae su ocasión; sin evento («Sin ocasión») o desde la lista se
          pregunta, proponiendo la fecha marcada o la más cercana (decisión 13
          de docs/encargo-ocasiones.md, 16 de docs/encargo-lista.md). */}
      <AddToHistoryDialog
        key={giving ? (giving.kind === "idea" ? giving.idea._id : giving.claimId) : "cerrado"}
        gift={giving ? { title: giving.kind === "idea" ? giving.idea.title : giving.title } : null}
        fixedOccasion={
          giving?.kind === "idea" ? dates.find((d) => d._id === giving.idea.importantDateId)?.label : undefined
        }
        defaultOccasion={(giving?.kind === "claim" && giving.occasionLabel) || closestOccasionLabel(dates)}
        onClose={() => setGiving(null)}
        onConfirm={handleGiven}
      />
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
  const lists = useQuery(api.lists.forPerson, ready ? { personId: id } : "skip");
  const people = useQuery(api.people.getAll, ready ? {} : "skip");
  const settings = useQuery(api.settings.getMine, ready ? {} : "skip");

  useEffect(() => {
    void loadImportantDateForm();
    void loadGiftHistoryForm();
  }, []);

  if (
    !ready ||
    person === undefined ||
    dates === undefined ||
    giftHistory === undefined ||
    savedIdeas === undefined ||
    lists === undefined
  ) {
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
      lists={lists}
      people={people ?? []}
      favoriteStores={favoriteStores}
      isOwner={person.clerkUserId === userId}
    />
  );
}

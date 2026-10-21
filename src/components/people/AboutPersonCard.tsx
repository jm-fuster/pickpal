"use client";

import { useId, useState, type ReactNode } from "react";
import { PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InterestTagInput } from "@/components/people/InterestTagInput";
import { BrandTagInput } from "@/components/people/BrandTagInput";
import { AiNotesNotice } from "@/components/people/AiNotesNotice";
import { useRestoreFocus } from "@/components/people/useRestoreFocus";
import { missingSentence, type MissingField } from "@/lib/missingSentence";

export type AboutFields = {
  interests?: string[];
  favoriteBrands?: string[];
  notes?: string;
  shoeSize?: string;
  clothingSize?: string;
  allergies?: string;
  dislikes?: string;
};

/** Un bloque en edición y, si se abrió con el atajo, el campo donde entra el cursor. */
export type BlockEditing = { field?: string };

type BlockProps = {
  /** `null` en lectura; con valor, en edición. */
  editing: BlockEditing | null;
  /** Abre el bloque; con `field`, con el cursor en ese campo (el atajo). */
  onEdit: (field?: string) => void;
  onDone: () => void;
  save: (fields: AboutFields) => void;
};

// Los botones de la cabecera de un bloque: 36 px en el móvil, para el dedo;
// 28 desde sm, como el resto de botones pequeños.
const BLOCK_BUTTON = "h-9 sm:h-7";

/**
 * Un bloque de datos de la persona (docs/design-system.md · «Una forma por
 * acción»). En lectura, texto: sin bordes, sin botones por campo y sin los
 * campos vacíos, que se nombran juntos en una sola línea. «Editar» lo pasa
 * entero a formulario; cada campo se guarda solo al salir de él, y «Listo»,
 * en el mismo sitio que «Editar», lo cierra. Tocar un dato o la línea de lo
 * que falta es un atajo: abre el bloque con el cursor en ese campo.
 */
function EditableCard({
  title,
  editing,
  onEdit,
  onDone,
  children,
}: {
  title: string;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  children: ReactNode;
}) {
  const { ref: editRef, restore: restoreFocus } = useRestoreFocus(editing);
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="space-y-3 p-5">
        <div className="flex min-h-9 items-center justify-between gap-2 sm:min-h-7">
          <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
          {editing ? (
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-muted-foreground">Se guarda solo</span>
              <Button
                size="sm"
                onClick={() => {
                  restoreFocus();
                  onDone();
                }}
                className={BLOCK_BUTTON}
              >
                Listo
              </Button>
            </div>
          ) : (
            <Button
              ref={editRef}
              size="sm"
              variant="outline"
              onClick={onEdit}
              className={BLOCK_BUTTON}
              aria-label={`Editar ${title.toLowerCase()}`}
            >
              <PencilLine aria-hidden />
              Editar
            </Button>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/** Una fila de lectura, etiqueta y valor. Toda la fila es el atajo a su campo. */
function ViewRow({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 grid w-[calc(100%+1rem)] grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-muted-foreground">
        <span className="sr-only">Editar · </span>
        {label}
      </span>
      <span className="min-w-0">{children}</span>
    </button>
  );
}

type Missing = MissingField & { field: string };

function MissingLine({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 block rounded-md px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {text}
    </button>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function Tags({ values }: { values: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {values.map((t) => (
        <Badge key={t} variant="secondary" title={t}>
          <span className="min-w-0 truncate">{t}</span>
        </Badge>
      ))}
    </span>
  );
}

/**
 * «Gustos»: lo que le gusta, sus marcas y las notas. El aviso de que las
 * notas van a la IA de Google solo sale en edición, pegado al campo de notas:
 * se da donde se escribe (AiNotesNotice).
 */
export function TastesCard({
  initial,
  editing,
  onEdit,
  onDone,
  save,
}: BlockProps & { initial: Required<Pick<AboutFields, "interests">> & AboutFields }) {
  const id = useId();
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [brands, setBrands] = useState<string[]>(initial.favoriteBrands ?? []);
  const [notes, setNotes] = useState(initial.notes ?? "");
  // Con «Editar», el cursor entra en el primer campo; con el atajo, en el suyo.
  const focus = editing?.field ?? "interests";

  const missing: Missing[] = [
    ...(interests.length === 0 ? [{ field: "interests", text: "lo que le gusta", plural: false }] : []),
    ...(brands.length === 0 ? [{ field: "brands", text: "sus marcas", plural: true }] : []),
    ...(notes.trim() === "" ? [{ field: "notes", text: "una nota", plural: false }] : []),
  ];

  return (
    <EditableCard title="Gustos" editing={editing !== null} onEdit={() => onEdit()} onDone={onDone}>
      {editing ? (
        <div className="space-y-4">
          <Field label="Le gusta" htmlFor={`${id}-interests`}>
            <InterestTagInput
              id={`${id}-interests`}
              autoFocus={focus === "interests"}
              value={interests}
              onChange={(tags) => {
                setInterests(tags);
                save({ interests: tags });
              }}
            />
          </Field>
          <Field label="Marcas" htmlFor={`${id}-brands`}>
            <BrandTagInput
              id={`${id}-brands`}
              autoFocus={focus === "brands"}
              value={brands}
              onChange={(tags) => {
                setBrands(tags);
                save({ favoriteBrands: tags });
              }}
            />
          </Field>
          <Field label="Notas" htmlFor={`${id}-notes`}>
            <Textarea
              id={`${id}-notes`}
              autoFocus={focus === "notes"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => save({ notes: notes || undefined })}
              rows={3}
              placeholder="Lo que la hace especial, lo que no le pegaría…"
            />
            <AiNotesNotice />
          </Field>
        </div>
      ) : missing.length === 3 ? (
        <MissingLine text="Aún no has apuntado sus gustos." onClick={() => onEdit("interests")} />
      ) : (
        <div className="space-y-1">
          {interests.length > 0 && (
            <ViewRow label="Le gusta" onClick={() => onEdit("interests")}>
              <Tags values={interests} />
            </ViewRow>
          )}
          {brands.length > 0 && (
            <ViewRow label="Marcas" onClick={() => onEdit("brands")}>
              <Tags values={brands} />
            </ViewRow>
          )}
          {notes.trim() !== "" && (
            <ViewRow label="Notas" onClick={() => onEdit("notes")}>
              <span className="line-clamp-4 whitespace-pre-line">{notes}</span>
            </ViewRow>
          )}
          {missing.length > 0 && (
            <MissingLine text={missingSentence(missing)} onClick={() => onEdit(missing[0].field)} />
          )}
        </div>
      )}
    </EditableCard>
  );
}

/** «Tallas y cuidado»: tallas, alergias y lo que no le gusta. */
export function CareCard({ initial, editing, onEdit, onDone, save }: BlockProps & { initial: AboutFields }) {
  const id = useId();
  const [shoeSize, setShoeSize] = useState(initial.shoeSize ?? "");
  const [clothingSize, setClothingSize] = useState(initial.clothingSize ?? "");
  const [allergies, setAllergies] = useState(initial.allergies ?? "");
  const [dislikes, setDislikes] = useState(initial.dislikes ?? "");
  const focus = editing?.field ?? "shoeSize";

  const rows = [
    { field: "shoeSize", label: "Zapato", value: shoeSize, text: "su talla de zapato", plural: false },
    { field: "clothingSize", label: "Ropa", value: clothingSize, text: "su talla de ropa", plural: false },
    { field: "allergies", label: "Alergias", value: allergies, text: "sus alergias", plural: true },
    { field: "dislikes", label: "No le gusta", value: dislikes, text: "lo que no le gusta", plural: false },
  ];
  const filled = rows.filter((r) => r.value.trim() !== "");
  const missing = rows.filter((r) => r.value.trim() === "");

  return (
    <EditableCard title="Tallas y cuidado" editing={editing !== null} onEdit={() => onEdit()} onDone={onDone}>
      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Talla de zapato" htmlFor={`${id}-shoe`}>
              <Input
                id={`${id}-shoe`}
                autoFocus={focus === "shoeSize"}
                value={shoeSize}
                onChange={(e) => setShoeSize(e.target.value)}
                onBlur={() => save({ shoeSize: shoeSize || undefined })}
                placeholder="EU 42, 38…"
              />
            </Field>
            <Field label="Talla de ropa" htmlFor={`${id}-clothing`}>
              <Input
                id={`${id}-clothing`}
                autoFocus={focus === "clothingSize"}
                value={clothingSize}
                onChange={(e) => setClothingSize(e.target.value)}
                onBlur={() => save({ clothingSize: clothingSize || undefined })}
                placeholder="M, L, 38…"
              />
            </Field>
          </div>
          <Field label="Alergias o restricciones" htmlFor={`${id}-allergies`}>
            <Input
              id={`${id}-allergies`}
              autoFocus={focus === "allergies"}
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              onBlur={() => save({ allergies: allergies || undefined })}
              placeholder="Frutos secos, gluten, látex…"
            />
          </Field>
          <Field label="Cosas que no le gustan" htmlFor={`${id}-dislikes`}>
            <Input
              id={`${id}-dislikes`}
              autoFocus={focus === "dislikes"}
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
              onBlur={() => save({ dislikes: dislikes || undefined })}
              placeholder="Color amarillo, perfumes fuertes…"
            />
          </Field>
        </div>
      ) : filled.length === 0 ? (
        <MissingLine text="Aún no has apuntado sus tallas ni alergias." onClick={() => onEdit("shoeSize")} />
      ) : (
        <div className="space-y-1">
          {filled.map((r) => (
            <ViewRow key={r.field} label={r.label} onClick={() => onEdit(r.field)}>
              {r.value}
            </ViewRow>
          ))}
          {missing.length > 0 && (
            <MissingLine text={missingSentence(missing)} onClick={() => onEdit(missing[0].field)} />
          )}
        </div>
      )}
    </EditableCard>
  );
}

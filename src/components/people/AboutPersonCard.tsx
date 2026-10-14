"use client";

import { useId, useState, type ReactNode } from "react";
import { PencilLine, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InterestTagInput } from "@/components/people/InterestTagInput";
import { BrandTagInput } from "@/components/people/BrandTagInput";
import { AiNotesNotice } from "@/components/people/AiNotesNotice";
import { cn } from "@/lib/utils";

export type AboutFields = {
  interests?: string[];
  favoriteBrands?: string[];
  notes?: string;
  shoeSize?: string;
  clothingSize?: string;
  allergies?: string;
  dislikes?: string;
};

// Un campo que se lee como texto y se edita al pulsarlo: sin borde hasta que
// pasas por encima o entras. El mismo truco que los títulos de «Pegar una
// lista». El margen negativo alinea el texto con las etiquetas.
const GHOST =
  "-mx-2 border-transparent bg-transparent px-2 shadow-none hover:border-input focus-visible:border-ring dark:bg-transparent";

/**
 * «Sobre {nombre}»: lo que sabes de ella, en una sola tarjeta que se lee como
 * una ficha de papel. Gustos, marcas, notas y tallas en filas etiqueta–valor;
 * todo se guarda solo al salir del campo, como antes. Las sugerencias de
 * intereses solo salen al pulsar «Añadir».
 *
 * El aviso de que las notas van a la IA de Google se queda pegado al campo de
 * notas: es información que hay que dar donde se escribe (AiNotesNotice).
 */
export function AboutPersonCard({
  name,
  initial,
  save,
}: {
  name: string;
  initial: Required<Pick<AboutFields, "interests">> & AboutFields;
  save: (fields: AboutFields) => void;
}) {
  const id = useId();
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [brands, setBrands] = useState<string[]>(initial.favoriteBrands ?? []);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [shoeSize, setShoeSize] = useState(initial.shoeSize ?? "");
  const [clothingSize, setClothingSize] = useState(initial.clothingSize ?? "");
  const [allergies, setAllergies] = useState(initial.allergies ?? "");
  const [dislikes, setDislikes] = useState(initial.dislikes ?? "");
  const [editing, setEditing] = useState<"interests" | "brands" | null>(null);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Sobre {name}
        </h2>

        <dl className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 text-sm">
          <Row label="Le gusta">
            {editing === "interests" ? (
              <TagEditor onDone={() => setEditing(null)}>
                <InterestTagInput
                  value={interests}
                  onChange={(tags) => {
                    setInterests(tags);
                    save({ interests: tags });
                  }}
                />
              </TagEditor>
            ) : (
              <Chips values={interests} onAdd={() => setEditing("interests")} label="intereses" />
            )}
          </Row>
          <Row label="Marcas">
            {editing === "brands" ? (
              <TagEditor onDone={() => setEditing(null)}>
                <BrandTagInput
                  value={brands}
                  onChange={(tags) => {
                    setBrands(tags);
                    save({ favoriteBrands: tags });
                  }}
                />
              </TagEditor>
            ) : (
              <Chips values={brands} onAdd={() => setEditing("brands")} label="marcas" />
            )}
          </Row>
          <Row label="Notas" htmlFor={`${id}-notes`}>
            <TextField
              id={`${id}-notes`}
              multiline
              value={notes}
              onChange={setNotes}
              onSave={() => save({ notes: notes || undefined })}
              addLabel="Añadir una nota"
              placeholder="Lo que la hace especial, lo que no le pegaría…"
            />
            <div className="mt-1">
              <AiNotesNotice />
            </div>
          </Row>
        </dl>

        <hr className="border-border/60" />

        <dl className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm">
          <Row label="Zapato" htmlFor={`${id}-shoe`}>
            <TextField
              id={`${id}-shoe`}
              value={shoeSize}
              onChange={setShoeSize}
              onSave={() => save({ shoeSize: shoeSize || undefined })}
              addLabel="Añadir talla de zapato"
              placeholder="EU 42, 38…"
            />
          </Row>
          <Row label="Ropa" htmlFor={`${id}-clothing`}>
            <TextField
              id={`${id}-clothing`}
              value={clothingSize}
              onChange={setClothingSize}
              onSave={() => save({ clothingSize: clothingSize || undefined })}
              addLabel="Añadir talla de ropa"
              placeholder="M, L, 38…"
            />
          </Row>
          <Row label="Alergias" htmlFor={`${id}-allergies`}>
            <TextField
              id={`${id}-allergies`}
              value={allergies}
              onChange={setAllergies}
              onSave={() => save({ allergies: allergies || undefined })}
              addLabel="Añadir alergias"
              placeholder="Frutos secos, gluten, látex…"
            />
          </Row>
          <Row label="No le gusta" htmlFor={`${id}-dislikes`}>
            <TextField
              id={`${id}-dislikes`}
              value={dislikes}
              onChange={setDislikes}
              onSave={() => save({ dislikes: dislikes || undefined })}
              addLabel="Añadir lo que no le gusta"
              placeholder="Color amarillo, perfumes fuertes…"
            />
          </Row>
        </dl>
      </CardContent>
    </Card>
  );
}

// El botón de «Añadir…» y el de «Editar» de los chips: con borde, redondo y
// de 36 px en el móvil para el dedo; 28 desde sm.
const ADD_BUTTON = "h-9 rounded-full px-3 text-muted-foreground sm:h-7";

/**
 * Un dato de «Sobre {nombre}». Vacío, es un botón con borde que dice qué falta
 * («Añadir talla de zapato»), como el «Editar» de los chips; al pulsarlo pasa a
 * ser el campo, con el cursor dentro. Con valor, se lee como texto y se edita
 * al pulsar encima. Guarda al salir; si sale vacío, vuelve a ser el botón.
 */
function TextField({
  id,
  value,
  onChange,
  onSave,
  addLabel,
  placeholder,
  multiline = false,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  addLabel: string;
  placeholder: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  if (!value && !editing) {
    return (
      <Button id={id} type="button" variant="outline" size="sm" onClick={() => setEditing(true)} className={ADD_BUTTON}>
        <Plus aria-hidden />
        {addLabel}
      </Button>
    );
  }
  const common = {
    id,
    value,
    placeholder,
    autoFocus: editing,
    onBlur: () => {
      onSave();
      setEditing(false);
    },
  };
  return multiline ? (
    <Textarea {...common} onChange={(e) => onChange(e.target.value)} className={cn(GHOST, "min-h-0 resize-none py-1")} />
  ) : (
    <Input {...common} onChange={(e) => onChange(e.target.value)} className={GHOST} />
  );
}

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <>
      <dt className="pt-1 text-muted-foreground">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

function Chips({ values, onAdd, label }: { values: string[]; onAdd: () => void; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {values.map((v) => (
        <Badge key={v} variant="secondary">
          {v}
        </Badge>
      ))}
      {/* Un botón de verdad, no una etiqueta: en el móvil mide 36 px para que
          se pueda pulsar con el dedo; desde sm, 28 px como el resto de botones
          pequeños. */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAdd}
        aria-label={values.length > 0 ? `Añadir o quitar ${label}` : `Añadir ${label}`}
        className={ADD_BUTTON}
      >
        {values.length > 0 ? <PencilLine aria-hidden /> : <Plus aria-hidden />}
        {values.length > 0 ? "Editar" : "Añadir"}
      </Button>
    </div>
  );
}

function TagEditor({ children, onDone }: { children: ReactNode; onDone: () => void }) {
  return (
    <div className="space-y-2">
      {children}
      <Button size="sm" variant="outline" onClick={onDone} className="h-9 sm:h-7">
        Listo
      </Button>
    </div>
  );
}

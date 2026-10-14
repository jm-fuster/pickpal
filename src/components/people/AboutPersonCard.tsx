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
            <Textarea
              id={`${id}-notes`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => save({ notes: notes || undefined })}
              placeholder="Añadir una nota"
              className={cn(GHOST, "min-h-0 resize-none py-1")}
            />
            <div className="mt-1">
              <AiNotesNotice />
            </div>
          </Row>
        </dl>

        <hr className="border-border/60" />

        <dl className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-sm">
          <Row label="Zapato" htmlFor={`${id}-shoe`}>
            <Input
              id={`${id}-shoe`}
              value={shoeSize}
              onChange={(e) => setShoeSize(e.target.value)}
              onBlur={() => save({ shoeSize: shoeSize || undefined })}
              placeholder="Añadir"
              className={GHOST}
            />
          </Row>
          <Row label="Ropa" htmlFor={`${id}-clothing`}>
            <Input
              id={`${id}-clothing`}
              value={clothingSize}
              onChange={(e) => setClothingSize(e.target.value)}
              onBlur={() => save({ clothingSize: clothingSize || undefined })}
              placeholder="Añadir"
              className={GHOST}
            />
          </Row>
          <Row label="Alergias" htmlFor={`${id}-allergies`}>
            <Input
              id={`${id}-allergies`}
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              onBlur={() => save({ allergies: allergies || undefined })}
              placeholder="Añadir"
              className={GHOST}
            />
          </Row>
          <Row label="No le gusta" htmlFor={`${id}-dislikes`}>
            <Input
              id={`${id}-dislikes`}
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
              onBlur={() => save({ dislikes: dislikes || undefined })}
              placeholder="Añadir"
              className={GHOST}
            />
          </Row>
        </dl>
      </CardContent>
    </Card>
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
      <button
        type="button"
        onClick={onAdd}
        aria-label={values.length > 0 ? `Añadir o quitar ${label}` : `Añadir ${label}`}
        className="inline-flex h-5 items-center gap-1 rounded-4xl border border-border px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {values.length > 0 ? <PencilLine className="size-3" aria-hidden /> : <Plus className="size-3" aria-hidden />}
        {values.length > 0 ? "Editar" : "Añadir"}
      </button>
    </div>
  );
}

function TagEditor({ children, onDone }: { children: ReactNode; onDone: () => void }) {
  return (
    <div className="space-y-2">
      {children}
      <Button size="xs" variant="ghost" onClick={onDone}>
        Listo
      </Button>
    </div>
  );
}

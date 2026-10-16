import type { ReactNode } from "react";
import { Check, PencilLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MockFrame } from "@/components/landing/MockFrame";
import { beat, reveal } from "@/components/landing/motion";
import { PERSON } from "@/components/landing/sample";
import {
  Eyebrow,
  FakeButton,
  MissingLine,
  PersonAvatar,
  TagChip,
  ViewRow,
} from "@/components/landing/mocks/parts";
import { cn } from "@/lib/utils";

// Capítulo 1: la ficha de Marta en lectura, como la dejan PersonHeader y los
// bloques de AboutPersonCard. Lo que se mueve es lo que de verdad cambia al
// apuntar: entran sus gustos y sus tallas, y sale «Guardado» (el autoguardado).

const LABEL =
  "Ejemplo de ficha: a Marta le gustan la cerámica, el café de especialidad y las plantas; calza un 38, usa la talla M, es alérgica a los frutos secos y no le gustan los perfumes fuertes. Abajo, el aviso «Guardado».";

/** Un bloque de la ficha en lectura: título en versalitas y «Editar». */
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-3 p-5">
        <div className="flex min-h-7 items-center justify-between gap-2">
          <Eyebrow>{title}</Eyebrow>
          <FakeButton variant="outline" size="sm" className="h-7">
            <PencilLine />
            Editar
          </FakeButton>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function ProfileMock({ className }: { className?: string }) {
  return (
    <MockFrame label={LABEL} className={cn("relative mt-8", className)} {...reveal()}>
      <div className="space-y-5 pb-12">
        <div className="flex items-center gap-4">
          <PersonAvatar src={PERSON.avatar} className="size-16 ring-1 ring-border" />
          <div className="min-w-0">
            <p className="font-heading text-3xl leading-tight font-medium">{PERSON.name}</p>
            <p className="text-muted-foreground">{PERSON.relationship}</p>
          </div>
        </div>

        <div className="grid gap-4 @container sm:grid-cols-2">
          <Block title="Gustos">
            <div className="space-y-1">
              <ViewRow label="Le gusta">
                <span className="flex flex-wrap gap-1.5">
                  {PERSON.interests.map((tag, i) => (
                    <TagChip key={tag} {...beat("settle", 300 + i * 60)}>
                      {tag}
                    </TagChip>
                  ))}
                </span>
              </ViewRow>
              <ViewRow label="Notas">{PERSON.notes}</ViewRow>
              {/* missingSentence() con solo las marcas vacías. */}
              <MissingLine>Faltan sus marcas.</MissingLine>
            </div>
          </Block>

          <Block title="Tallas y cuidado">
            <div className="space-y-1">
              {PERSON.care.map((row, i) => (
                <ViewRow key={row.label} label={row.label} {...beat("swap-in", 500 + i * 60)}>
                  {row.value}
                </ViewRow>
              ))}
            </div>
          </Block>
        </div>
      </div>

      {/* En la app es `fixed` y con shadow-md; aquí va dentro del marco, en el
          hueco que deja pb-12, y con la sombra de las superficies de la landing. */}
      <p
        className="absolute right-0 bottom-0 flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-sm"
        {...beat("swap-in", 1100, 300)}
      >
        <Check className="size-3" />
        Guardado
      </p>
    </MockFrame>
  );
}

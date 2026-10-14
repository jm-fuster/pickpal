"use client";

import { useId, useState } from "react";
import { PencilLine, Trash2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { AvatarPickerDialog } from "@/components/people/AvatarPickerDialog";
import { ActionMenu } from "@/components/people/ActionMenu";
import type { BlockEditing } from "@/components/people/AboutPersonCard";
import { useRestoreFocus } from "@/components/people/useRestoreFocus";
import { RELATIONSHIPS } from "@/lib/options";

type HeaderFields = { name?: string; relationship?: string; avatarUrl?: string };

const relationshipLabel = (value: string) => RELATIONSHIPS.find((r) => r.value === value)?.label ?? value;

/**
 * La cabecera de la ficha: foto, nombre y relación. Es un bloque más de
 * «Una forma por acción» (docs/design-system.md): en lectura, texto; «Editar
 * nombre y foto», en su «⋯», la pasa a formulario con autoguardado y «Listo»
 * en el sitio del «⋯». Tocar la foto, el nombre o la relación es el atajo: abre
 * la edición con el cursor en ese campo.
 */
export function PersonHeader({
  initial,
  isOwner,
  editing,
  onEdit,
  onDone,
  save,
  onShare,
  onDelete,
}: {
  initial: { name: string; relationship: string; avatarUrl?: string };
  isOwner: boolean;
  editing: BlockEditing | null;
  onEdit: (field?: string) => void;
  onDone: () => void;
  save: (fields: HeaderFields) => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(initial.name);
  const [relationship, setRelationship] = useState(initial.relationship);
  const [avatar, setAvatar] = useState<string | undefined>(initial.avatarUrl);
  // El último nombre guardado: si sales del campo dejándolo vacío, vuelve.
  const [savedName, setSavedName] = useState(initial.name);
  const { ref: menuRef, restore: restoreFocus } = useRestoreFocus(editing !== null);
  const focus = editing?.field ?? "name";

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(savedName);
      return;
    }
    if (trimmed !== savedName) {
      setSavedName(trimmed);
      save({ name: trimmed });
    }
    setName(trimmed);
  };

  const avatarNode = (
    <Avatar className="size-16 ring-1 ring-border sm:size-24">
      {avatar ? <AvatarImage src={avatar} alt="" /> : null}
      <AvatarFallback className="text-lg sm:text-xl">{savedName.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );

  if (editing) {
    return (
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <h1 className="sr-only">{savedName}</h1>
        <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
          {avatarNode}
          <AvatarPickerDialog
            value={avatar}
            onChange={(url) => {
              setAvatar(url);
              if (url) save({ avatarUrl: url });
            }}
            trigger={
              <Button variant="outline" size="sm" autoFocus={focus === "avatar"} className="h-9 sm:h-7">
                Cambiar foto
              </Button>
            }
          />
        </div>

        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,22rem)_minmax(0,15rem)] sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${id}-name`}>Nombre</Label>
            <Input
              id={`${id}-name`}
              autoFocus={focus === "name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-relationship`}>Relación</Label>
            <Select
              value={relationship}
              onValueChange={(v) => {
                if (!v) return;
                setRelationship(v);
                save({ relationship: v });
              }}
            >
              <SelectTrigger id={`${id}-relationship`} autoFocus={focus === "relationship"} className="w-full">
                <span>{relationshipLabel(relationship)}</span>
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-start">
          <span className="text-xs text-muted-foreground">Se guarda solo</span>
          <Button
            size="sm"
            className="h-9 sm:h-7"
            onClick={() => {
              restoreFocus();
              onDone();
            }}
          >
            Listo
          </Button>
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-center gap-4 sm:gap-6">
      {/* El atajo: tocar la foto, el nombre o la relación abre su campo. */}
      <button
        type="button"
        onClick={() => onEdit("avatar")}
        aria-label="Cambiar la foto"
        className="shrink-0 rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {avatarNode}
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="font-heading text-3xl font-medium leading-tight sm:text-4xl">
          <button
            type="button"
            onClick={() => onEdit("name")}
            className="-mx-2 max-w-full truncate rounded-md px-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {savedName}
          </button>
        </h1>
        <button
          type="button"
          onClick={() => onEdit("relationship")}
          className="-mx-2 mt-0.5 rounded-md px-2 py-0.5 text-left text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="sr-only">Relación: </span>
          {relationshipLabel(relationship)}
        </button>
      </div>

      <ActionMenu
        label={`Más acciones para la ficha de ${savedName}`}
        triggerRef={menuRef}
        className="self-start"
        groups={[
          {
            actions: [
              { label: "Compartir la ficha", icon: Users, onSelect: onShare },
              { label: "Editar nombre y foto", icon: PencilLine, onSelect: () => onEdit() },
            ],
          },
          // Borrar la ficha para todos es solo de quien la creó (decisión 1
          // de docs/dudas.md); un invitado se desliga desde «Compartir».
          {
            actions: isOwner
              ? [{ label: `Eliminar a ${savedName}`, icon: Trash2, destructive: true, onSelect: onDelete }]
              : [],
          },
        ]}
      />
    </header>
  );
}

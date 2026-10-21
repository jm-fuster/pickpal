"use client";

import { useRef, useState, KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Badge, badgeTouchTarget } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizeInterest } from "@/lib/interests";
import { MAX_BRANDS } from "@/lib/brands";

interface BrandTagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Con el cursor dentro al aparecer: el atajo de «Gustos» (tocar un dato abre su campo). */
  autoFocus?: boolean;
  /** Para que la etiqueta del bloque apunte al campo. */
  id?: string;
}

/**
 * Input de tags libre para marcas favoritas. Mismo patrón de chips que
 * InterestTagInput pero sin catálogo: las marcas son un vocabulario abierto
 * (Nike, LEGO, Lush…) que no tiene sentido autocompletar localmente.
 */
export function BrandTagInput({
  value,
  onChange,
  placeholder = "LEGO, Nike, Apple…",
  autoFocus = false,
  id,
}: BrandTagInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const atCap = value.length >= MAX_BRANDS;

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag || atCap) return;
    const normalized = normalizeInterest(tag);
    if (!value.some((t) => normalizeInterest(t) === normalized)) {
      onChange([...value, tag]);
    }
    setDraft("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
      // Keep the input focused so the user can keep typing tags on mobile.
      inputRef.current?.focus();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2 pointer-coarse:space-y-3">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2 pointer-coarse:gap-y-3">
          {value.map((tag) => (
            <li key={tag} className="max-w-full">
              <Badge
                variant="secondary"
                className={cn("cursor-pointer hover:bg-secondary/80 transition-colors", badgeTouchTarget)}
                title={`Eliminar ${tag}`}
                aria-label={`Eliminar ${tag}`}
                render={<button type="button" onClick={() => removeTag(tag)} />}
              >
                <span className="min-w-0 truncate">{tag}</span>
                <X className="size-3" aria-hidden />
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          id={id}
          autoFocus={autoFocus}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          enterKeyHint="done"
          placeholder={atCap ? "Máximo alcanzado" : placeholder}
          disabled={atCap}
          // Con `id`, el nombre lo da la etiqueta que apunta al campo.
          aria-label={id ? undefined : "Nueva marca favorita"}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => {
            addTag(draft);
            inputRef.current?.focus();
          }}
          disabled={!draft.trim() || atCap}
          aria-label="Añadir marca"
        >
          <Plus className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

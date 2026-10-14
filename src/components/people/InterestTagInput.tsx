"use client";

import { useId, useMemo, useRef, useState, KeyboardEvent } from "react";
import { Plus, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MAX_INTERESTS,
  normalizeInterest,
  searchInterests,
  suggestInterests,
} from "@/lib/interests";

const SUGGESTIONS_SHOWN = 6;

interface InterestTagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Con el cursor dentro al aparecer: el atajo de «Gustos» (tocar un dato abre su campo). */
  autoFocus?: boolean;
  /** Para que la etiqueta del bloque apunte al campo. */
  id?: string;
}

export function InterestTagInput({
  value,
  onChange,
  placeholder = "Añade un interés y pulsa +",
  autoFocus = false,
  id,
}: InterestTagInputProps) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const atCap = value.length >= MAX_INTERESTS;

  const matches = useMemo(
    () => (atCap ? [] : searchInterests(draft, value)),
    [draft, value, atCap],
  );
  const showDropdown = open && matches.length > 0;

  const suggestionPool = useMemo(
    () => (atCap ? [] : suggestInterests(value)),
    [value, atCap],
  );
  const suggestions = useMemo(() => {
    if (suggestionPool.length <= SUGGESTIONS_SHOWN) return suggestionPool;
    const start = suggestionOffset % suggestionPool.length;
    return Array.from(
      { length: SUGGESTIONS_SHOWN },
      (_, i) => suggestionPool[(start + i) % suggestionPool.length],
    );
  }, [suggestionPool, suggestionOffset]);

  const closeDropdown = () => {
    setOpen(false);
    setHighlighted(-1);
  };

  const addTag = (raw: string) => {
    const tag = raw.trim();
    // `atCap` también: sin este guard el input deja añadir el interés 21 y el
    // autosave de la ficha falla luego con un toast genérico (el server tope
    // a MAX_INTERESTS). Mismo patrón que BrandTagInput.
    if (!tag || atCap) return;
    const normalized = normalizeInterest(tag);
    if (!value.some((t) => normalizeInterest(t) === normalized)) {
      onChange([...value, tag]);
    }
    setDraft("");
    closeDropdown();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && matches.length > 0) {
      e.preventDefault();
      setOpen(true);
      setHighlighted((h) => (h + 1 >= matches.length ? 0 : h + 1));
    } else if (e.key === "ArrowUp" && showDropdown) {
      e.preventDefault();
      setHighlighted((h) => (h <= 0 ? matches.length - 1 : h - 1));
    } else if (e.key === "Escape" && showDropdown) {
      e.preventDefault();
      closeDropdown();
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (showDropdown && highlighted >= 0 && matches[highlighted]) {
        addTag(matches[highlighted]);
      } else {
        addTag(draft);
      }
      // Keep the input focused so the user can keep typing tags on mobile.
      inputRef.current?.focus();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleAddClick = () => {
    addTag(draft);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <li key={tag}>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                title="Eliminar"
                aria-label={`Eliminar ${tag}`}
                render={<button type="button" onClick={() => removeTag(tag)} />}
              >
                {tag}
                <X className="size-3" aria-hidden />
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id={id}
            autoFocus={autoFocus}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setOpen(true);
              setHighlighted(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={closeDropdown}
            onKeyDown={handleKeyDown}
            enterKeyHint="done"
            placeholder={atCap ? "Máximo alcanzado" : placeholder}
            disabled={atCap}
            // Con `id`, el nombre lo da la etiqueta que apunta al campo.
            aria-label={id ? undefined : "Nuevo interés"}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              showDropdown && highlighted >= 0
                ? `${listboxId}-${highlighted}`
                : undefined
            }
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleAddClick}
            disabled={!draft.trim() || atCap}
            aria-label="Añadir interés"
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>
        {showDropdown ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Intereses sugeridos"
            className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 animate-in fade-in-0 slide-in-from-top-2 duration-100"
          >
            {matches.map((match, i) => (
              <li
                key={match}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={i === highlighted}
                className={cn(
                  "cursor-pointer rounded-md px-2 py-2 text-sm",
                  i === highlighted && "bg-accent text-accent-foreground",
                )}
                // preventDefault keeps focus on the input so blur doesn't
                // close the list before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  addTag(match);
                  inputRef.current?.focus();
                }}
                onMouseEnter={() => setHighlighted(i)}
              >
                {match}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {/* El botón "Otras" va al PRINCIPIO de la fila (ancho fijo), NO al
              final de los chips: con `flex-wrap` los chips cambian de ancho y
              número en cada refresco, así que un botón al final saltaba de
              posición y era incómodo de pulsar varias veces seguidas. Aquí su
              posición es estable. Lleva borde + etiqueta (no un icono ghost
              suelto) para que se lea como un botón pulsable. */}
          {suggestionPool.length > SUGGESTIONS_SHOWN ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="rounded-full"
              onClick={() => setSuggestionOffset((o) => o + SUGGESTIONS_SHOWN)}
              aria-label="Ver otras sugerencias"
              title="Ver otras sugerencias"
            >
              <RefreshCw aria-hidden />
              Otras
            </Button>
          ) : null}
          {suggestions.map((suggestion) => (
            <Badge
              key={suggestion}
              variant="outline"
              className="cursor-pointer transition-colors hover:bg-muted"
              title={`Añadir ${suggestion}`}
              aria-label={`Añadir ${suggestion}`}
              render={
                <button type="button" onClick={() => addTag(suggestion)} />
              }
            >
              <Plus className="size-3" aria-hidden />
              {suggestion}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

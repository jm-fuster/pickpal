"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

// El estilo "dylan" de DiceBear se personaliza "pineando" cada rasgo a un único
// valor del array de opciones: con todos los arrays a un solo valor, el resultado
// visible es determinista y la semilla deja de influir. Así construimos un avatar
// exacto a partir de las elecciones del usuario, en vez de barajar semillas al azar.
const STYLE = "dylan";
const API = `https://api.dicebear.com/9.x/${STYLE}/svg`;
const SEED = "pickpal";

// ── Paletas ───────────────────────────────────────────────────────────────────
// dylan solo trae 2 tonos de piel de fábrica; ampliamos a una rampa clara→oscura
// para que cualquiera pueda parecerse a su ser querido.
const SKIN_TONES = ["ffe0d0", "ffcd94", "eac086", "d29c6a", "b87c4c", "9b6240", "6f4533", "4a2f25"];
const HAIR_COLORS = ["0e0e0e", "3b2417", "6f4e37", "a86b3c", "d8a64b", "c1502e", "9a9a9a", "ece5d8", "ff7bb0", "5aa9e6"];
// Los fondos son libres (cualquier hex): colores vivos y bien saturados (los
// pasteles apenas se apreciaban). Sin opción "transparente".
const BACKGROUNDS = [
  "ff6b6b", // rojo coral
  "ff922b", // naranja
  "fcc419", // amarillo
  "94d82d", // verde lima
  "40c057", // verde
  "20c997", // turquesa
  "22b8cf", // cian
  "4dabf7", // azul cielo
  "5c7cfa", // índigo
  "9775fa", // morado
  "da77f2", // violeta
  "f06595", // rosa
];

// Los 12 peinados del schema de dylan.
const HAIR_STYLES = [
  { id: "plain", label: "Liso" },
  { id: "wavy", label: "Ondulado" },
  { id: "shortCurls", label: "Rizos cortos" },
  { id: "parting", label: "Con raya" },
  { id: "spiky", label: "Pinchos" },
  { id: "roundBob", label: "Bob" },
  { id: "longCurls", label: "Rizos largos" },
  { id: "buns", label: "Moños" },
  { id: "bangs", label: "Flequillo" },
  { id: "fluffy", label: "Esponjoso" },
  { id: "flatTop", label: "Plano" },
  { id: "shaggy", label: "Despeinado" },
] as const;

// Conjunto de expresiones neutras/positivas — dylan también ofrece "angry" y "sad",
// que se descartan por no encajar con el retrato de un ser querido.
const MOODS = [
  { id: "happy", label: "Feliz" },
  { id: "superHappy", label: "Muy feliz" },
  { id: "neutral", label: "Neutral" },
  { id: "hopeful", label: "Ilusionado" },
  { id: "confused", label: "Despistado" },
] as const;

export interface AvatarBuild {
  skin: string;
  hair: string;
  hairColor: string;
  mood: string;
  beard: boolean;
  background: string;
}

export const DEFAULT_BUILD: AvatarBuild = {
  skin: SKIN_TONES[1],
  hair: "plain",
  hairColor: HAIR_COLORS[0],
  mood: "happy",
  beard: false,
  background: "4dabf7",
};

export function buildUrl(b: AvatarBuild): string {
  // facialHair[] se omite: "default" es el único estilo y ya es el valor por
  // defecto del schema, así que basta con la probabilidad para activarlo/quitarlo.
  const params = [
    `seed=${SEED}`,
    `skinColor[]=${b.skin}`,
    `hair[]=${b.hair}`,
    `hairColor[]=${b.hairColor}`,
    `mood[]=${b.mood}`,
    `backgroundColor[]=${b.background}`,
    `facialHairProbability=${b.beard ? 100 : 0}`,
  ];
  return `${API}?${params.join("&")}`;
}

// Reconstruye el estado del editor desde una URL ya guardada. Solo funciona con
// el formato nuevo (rasgos pineados a un valor); las URLs antiguas (semilla +
// arrays múltiples) devuelven null y el editor arranca desde los valores por defecto.
export function parseAvatarUrl(url: string | undefined): AvatarBuild | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.pathname.includes(`/${STYLE}/`)) return null;
    const p = u.searchParams;
    const skin = p.get("skinColor[]");
    const hair = p.get("hair[]");
    const hairColor = p.get("hairColor[]");
    const mood = p.get("mood[]");
    if (!skin || !hair || !hairColor || !mood) return null;
    return {
      skin,
      hair,
      hairColor,
      mood,
      beard: p.get("facialHairProbability") === "100",
      background: p.get("backgroundColor[]") ?? DEFAULT_BUILD.background,
    };
  } catch {
    return null;
  }
}

interface AvatarPickerProps {
  // Controlado: el estado del avatar vive en el padre (AvatarPickerDialog), que así
  // puede pintar el preview en la cabecera fija mientras estos selectores scrollean.
  build: AvatarBuild;
  onBuildChange: (build: AvatarBuild) => void;
}

const SELECTED = "border-primary ring-2 ring-primary ring-offset-2";
const UNSELECTED = "border-transparent hover:border-subtle-foreground/40";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomBuild(): AvatarBuild {
  return {
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_STYLES).id,
    hairColor: pick(HAIR_COLORS),
    mood: pick(MOODS).id,
    beard: Math.random() < 0.3,
    background: pick(BACKGROUNDS),
  };
}

// URL de un avatar aleatorio, para el botón «Aleatorio» que vive fuera del diálogo
// (en `PersonForm`): genera y aplica sin abrir el personalizador.
export function randomAvatarUrl(): string {
  return buildUrl(randomBuild());
}

export function AvatarPicker({ build, onBuildChange }: AvatarPickerProps) {
  const uid = useId();

  const update = (patch: Partial<AvatarBuild>) => onBuildChange({ ...build, ...patch });

  // Las miniaturas reflejan el tono de piel y color de pelo elegidos, sobre un
  // fondo neutro fijo para que se comparen en igualdad de condiciones.
  const thumb = (patch: Partial<AvatarBuild>) =>
    buildUrl({ ...build, mood: "happy", beard: false, background: "f0ece2", ...patch });

  return (
    <div className="space-y-4">
      {/* Tono de piel */}
      <Section uid={uid} name="skin" label="Tono de piel">
        <div className="flex flex-wrap gap-2">
          {SKIN_TONES.map((hex, i) => (
            <button
              key={hex}
              type="button"
              onClick={() => update({ skin: hex })}
              className={cn("size-8 rounded-full border-2 transition-all", FOCUS, build.skin === hex ? SELECTED : UNSELECTED)}
              style={{ backgroundColor: `#${hex}` }}
              aria-label={`Tono de piel ${i + 1}`}
              aria-pressed={build.skin === hex}
            />
          ))}
        </div>
      </Section>

      {/* Peinado */}
      <Section uid={uid} name="hair" label="Peinado">
        <div className="flex flex-wrap gap-2">
          {HAIR_STYLES.map((h) => (
            <Thumb
              key={h.id}
              src={thumb({ hair: h.id })}
              label={h.label}
              selected={build.hair === h.id}
              onClick={() => update({ hair: h.id })}
            />
          ))}
        </div>
      </Section>

      {/* Color de pelo */}
      <Section uid={uid} name="hairColor" label="Color de pelo">
        <div className="flex flex-wrap gap-2">
          {HAIR_COLORS.map((hex, i) => (
            <button
              key={hex}
              type="button"
              onClick={() => update({ hairColor: hex })}
              className={cn("size-8 rounded-full border-2 transition-all", FOCUS, build.hairColor === hex ? SELECTED : UNSELECTED)}
              style={{ backgroundColor: `#${hex}` }}
              aria-label={`Color de pelo ${i + 1}`}
              aria-pressed={build.hairColor === hex}
            />
          ))}
        </div>
      </Section>

      {/* Expresión */}
      <Section uid={uid} name="mood" label="Expresión">
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Thumb
              key={m.id}
              src={thumb({ mood: m.id })}
              label={m.label}
              selected={build.mood === m.id}
              onClick={() => update({ mood: m.id })}
            />
          ))}
        </div>
      </Section>

      {/* Barba */}
      <Section uid={uid} name="beard" label="Barba">
        <div className="flex flex-wrap gap-2">
          <Thumb
            src={thumb({ beard: false })}
            label="Sin barba"
            selected={!build.beard}
            onClick={() => update({ beard: false })}
          />
          <Thumb
            src={thumb({ beard: true })}
            label="Con barba"
            selected={build.beard}
            onClick={() => update({ beard: true })}
          />
        </div>
      </Section>

      {/* Fondo */}
      <Section uid={uid} name="background" label="Fondo">
        <div className="flex flex-wrap gap-2">
          {BACKGROUNDS.map((hex, i) => (
            <button
              key={hex}
              type="button"
              onClick={() => update({ background: hex })}
              className={cn("size-8 rounded-full border-2 transition-all", FOCUS, build.background === hex ? SELECTED : UNSELECTED)}
              style={{ backgroundColor: `#${hex}` }}
              aria-label={`Fondo ${i + 1}`}
              aria-pressed={build.background === hex}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────────

function Section({
  uid,
  name,
  label,
  children,
}: {
  uid: string;
  name: string;
  label: string;
  children: React.ReactNode;
}) {
  const labelId = `${uid}-${name}`;
  return (
    <div className="space-y-2" role="group" aria-labelledby={labelId}>
      <p
        id={labelId}
        className="text-sm font-medium"
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function Thumb({
  src,
  label,
  selected,
  onClick,
}: {
  src: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-full border-2 transition-all overflow-hidden", FOCUS, selected ? SELECTED : UNSELECTED)}
      aria-label={label}
      aria-pressed={selected}
      title={label}
    >
      <img src={src} alt="" className="size-12 rounded-full bg-muted block" loading="lazy" />
    </button>
  );
}

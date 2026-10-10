import {
  Bath,
  BookOpen,
  Camera,
  ChefHat,
  Coffee,
  Compass,
  Croissant,
  Dices,
  Drama,
  Dumbbell,
  Flower2,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  Hammer,
  Headphones,
  Heart,
  Mountain,
  Music,
  NotebookPen,
  Palette,
  PawPrint,
  Plane,
  Shirt,
  ShoppingBag,
  Shuffle,
  Smartphone,
  Sofa,
  Sprout,
  Ticket,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";
import type { GiftImageKey, GiftType } from "./giftCatalog";

// Tintes planos derivados de los tokens del design system (nada de gradients).
// El glifo ámbar usa --category-amber, no --warning: aquí es decorativo, no un
// aviso. Comparten valor hoy y pueden divergir sin arrastrarse
// (ver docs/design-system.md · Contraste).
const TINTS = {
  green: { container: "bg-primary/10", icon: "text-brand" },
  terracotta: { container: "bg-secondary/15", icon: "text-brand-secondary" },
  amber: { container: "bg-chart-3/15", icon: "text-category-amber" },
} as const;

type GiftImageTint = keyof typeof TINTS;

export interface GiftImageVisual {
  icon: LucideIcon;
  container: string;
  iconClass: string;
}

const entry = (icon: LucideIcon, tint: GiftImageTint): GiftImageVisual => ({
  icon,
  container: TINTS[tint].container,
  iconClass: TINTS[tint].icon,
});

// Mapeo completo del catálogo GIFT_IMAGE_KEYS (src/lib/giftCatalog.ts).
// Familias de tinte: ámbar = creativo/ocio/tech, terracota = hogar/comida/afecto,
// verde = naturaleza/experiencias activas.
const GIFT_IMAGES: Record<GiftImageKey, GiftImageVisual> = {
  tecnologia: entry(Smartphone, "amber"),
  audio: entry(Headphones, "amber"),
  gaming: entry(Gamepad2, "amber"),
  fotografia: entry(Camera, "amber"),
  libros: entry(BookOpen, "amber"),
  musica: entry(Music, "amber"),
  "arte-manualidades": entry(Palette, "amber"),
  "juegos-mesa": entry(Dices, "amber"),
  papeleria: entry(NotebookPen, "amber"),
  bricolaje: entry(Hammer, "amber"),
  "joyeria-relojes": entry(Gem, "amber"),
  moda: entry(Shirt, "amber"),
  belleza: entry(Flower2, "terracotta"),
  cocina: entry(ChefHat, "terracotta"),
  gourmet: entry(Croissant, "terracotta"),
  "vino-bebidas": entry(Wine, "terracotta"),
  "cafe-te": entry(Coffee, "terracotta"),
  "hogar-decoracion": entry(Sofa, "terracotta"),
  plantas: entry(Sprout, "green"),
  mascotas: entry(PawPrint, "terracotta"),
  deporte: entry(Dumbbell, "green"),
  "aire-libre": entry(Mountain, "green"),
  viajes: entry(Plane, "green"),
  "experiencia-gastronomica": entry(UtensilsCrossed, "terracotta"),
  "experiencia-cultural": entry(Drama, "amber"),
  "experiencia-aventura": entry(Compass, "green"),
  "experiencia-bienestar": entry(Bath, "green"),
  "taller-curso": entry(GraduationCap, "green"),
  "plan-casero": entry(Heart, "terracotta"),
  "regalo-generico": entry(Gift, "terracotta"),
};

// Ideas persistidas antes de que existiera imageKey: fallback por tipo de
// regalo, con los mismos iconos que las tarjetas de tipo del GiftsPanel.
const TYPE_FALLBACK: Record<GiftType, GiftImageVisual> = {
  fisica: entry(ShoppingBag, "terracotta"),
  experiencia: entry(Ticket, "green"),
  "tiempo-juntos": entry(Heart, "terracotta"),
  sorprendeme: entry(Shuffle, "amber"),
};

export function resolveGiftImage(
  imageKey: string | undefined,
  giftType: GiftType,
): GiftImageVisual {
  if (imageKey && imageKey in GIFT_IMAGES) {
    return GIFT_IMAGES[imageKey as GiftImageKey];
  }
  return TYPE_FALLBACK[giftType] ?? TYPE_FALLBACK.fisica;
}

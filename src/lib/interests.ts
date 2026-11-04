// Catálogo local de intereses para el autocompletado y las sugerencias de la
// ficha de persona. Es deliberadamente local (sin IA): las sugerencias deben
// ser instantáneas en cada pulsación y no gastar cuota del proveedor LLM
// (10 generaciones/día) ni enviar datos de la persona fuera.

// Espejo de MAX_INTERESTS en convex/validators.ts — si cambia allí, cambiar aquí.
export const MAX_INTERESTS = 20;

interface InterestCategory {
  id: string;
  items: string[];
}

export const INTEREST_CATALOG: ReadonlyArray<InterestCategory> = [
  {
    id: "deporte",
    items: [
      "Fútbol",
      "Baloncesto",
      "Tenis",
      "Pádel",
      "Running",
      "Ciclismo",
      "Natación",
      "Gimnasio",
      "CrossFit",
      "Escalada",
      "Esquí",
      "Surf",
      "Golf",
      "Artes marciales",
      "Patinaje",
    ],
  },
  {
    id: "aire-libre",
    items: [
      "Senderismo",
      "Camping",
      "Montaña",
      "Pesca",
      "Kayak",
      "Rutas en bici",
      "Playa",
      "Picnics",
      "Observación de aves",
    ],
  },
  {
    id: "musica",
    items: [
      "Música en directo",
      "Festivales",
      "Tocar la guitarra",
      "Piano",
      "Cantar",
      "Vinilos",
      "Rock",
      "Pop",
      "Jazz",
      "Música clásica",
      "Flamenco",
      "Música electrónica",
    ],
  },
  {
    id: "cocina",
    items: [
      "Cocinar",
      "Repostería",
      "Vinos",
      "Cerveza artesana",
      "Café de especialidad",
      "Té e infusiones",
      "Cocina asiática",
      "Cocina italiana",
      "Barbacoas",
      "Coctelería",
      "Quesos",
      "Gastronomía",
    ],
  },
  {
    id: "lectura",
    items: [
      "Lectura",
      "Novela negra",
      "Ciencia ficción",
      "Fantasía",
      "Novela romántica",
      "Poesía",
      "Historia",
      "Filosofía",
      "Cómics",
      "Manga",
      "Escritura",
    ],
  },
  {
    id: "cine-series",
    items: [
      "Cine",
      "Series",
      "Documentales",
      "Anime",
      "Cine clásico",
      "Teatro",
      "Musicales",
      "Monólogos",
    ],
  },
  {
    id: "tecnologia",
    items: [
      "Videojuegos",
      "Tecnología",
      "Gadgets",
      "Informática",
      "Programación",
      "Impresión 3D",
      "Drones",
      "Realidad virtual",
      "Juegos retro",
      "Robótica",
    ],
  },
  {
    id: "arte-manualidades",
    items: [
      "Dibujo",
      "Pintura",
      "Cerámica",
      "Costura",
      "Punto y crochet",
      "Manualidades",
      "Caligrafía",
      "Origami",
      "Scrapbooking",
      "Diseño",
    ],
  },
  {
    id: "fotografia-video",
    items: [
      "Fotografía",
      "Fotografía analógica",
      "Edición de vídeo",
      "Astrofotografía",
    ],
  },
  {
    id: "viajes",
    items: [
      "Viajar",
      "Escapadas rurales",
      "Idiomas",
      "Culturas del mundo",
      "Viajes de aventura",
      "Cruceros",
      "Roadtrips",
    ],
  },
  {
    id: "moda-belleza",
    items: [
      "Moda",
      "Zapatillas",
      "Maquillaje",
      "Cuidado de la piel",
      "Perfumes",
      "Joyería",
      "Relojes",
      "Bolsos",
    ],
  },
  {
    id: "bienestar",
    items: [
      "Yoga",
      "Meditación",
      "Mindfulness",
      "Spa y masajes",
      "Pilates",
      "Vida saludable",
      "Nutrición",
    ],
  },
  {
    id: "hogar",
    items: [
      "Plantas",
      "Jardinería",
      "Decoración",
      "Bricolaje",
      "Interiorismo",
      "Velas y aromas",
      "Orden y organización",
      "Carpintería",
    ],
  },
  {
    id: "mascotas",
    items: ["Perros", "Gatos", "Acuarios", "Animales"],
  },
  {
    id: "juegos",
    items: [
      "Juegos de mesa",
      "Puzzles",
      "Ajedrez",
      "Cartas coleccionables",
      "LEGO",
      "Modelismo",
      "Juegos de rol",
      "Escape rooms",
      "Coleccionismo",
    ],
  },
  {
    id: "motor",
    items: ["Coches", "Motos", "Fórmula 1", "MotoGP", "Mecánica", "Karting"],
  },
  {
    id: "ciencia",
    items: ["Astronomía", "Ciencia", "Espacio", "Naturaleza", "Museos"],
  },
];

// Set diverso para el arranque en frío (persona sin gustos) y para completar
// cuando las categorías relacionadas dan pocos candidatos.
const STARTER_INTERESTS = [
  "Lectura",
  "Cocinar",
  "Viajar",
  "Música en directo",
  "Senderismo",
  "Cine",
  "Videojuegos",
  "Plantas",
  "Fotografía",
  "Juegos de mesa",
  "Yoga",
  "Moda",
  "Vinos",
  "Fútbol",
];

const ALL_ITEMS = INTEREST_CATALOG.flatMap((category) => category.items);

/** Minúsculas y sin acentos, para comparar/filtrar con tolerancia a tildes. */
export function normalizeInterest(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// "fútbol sala" cuenta como match de "Fútbol": igualdad normalizada o
// contención en cualquier dirección (mínimo 4 caracteres para evitar ruido).
function matchesItem(interest: string, item: string): boolean {
  const a = normalizeInterest(interest);
  const b = normalizeInterest(item);
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4) return a.includes(b) || b.includes(a);
  return false;
}

/**
 * Opciones del desplegable de autocompletado: items del catálogo que casan
 * con lo tecleado, priorizando prefijo > inicio de palabra > subcadena.
 * Excluye los gustos ya añadidos (sin distinguir mayúsculas/acentos).
 */
export function searchInterests(
  query: string,
  exclude: string[],
  limit = 7,
): string[] {
  const q = normalizeInterest(query);
  if (!q) return [];
  const excluded = new Set(exclude.map(normalizeInterest));
  const ranked: { item: string; rank: number }[] = [];
  for (const item of ALL_ITEMS) {
    const n = normalizeInterest(item);
    if (excluded.has(n)) continue;
    let rank: number;
    if (n.startsWith(q)) rank = 0;
    else if (n.split(" ").some((word) => word.startsWith(q))) rank = 1;
    else if (n.includes(q)) rank = 2;
    else continue;
    ranked.push({ item, rank });
  }
  // sort estable: dentro del mismo rank se conserva el orden del catálogo
  return ranked
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((r) => r.item);
}

/**
 * Candidatos a sugerir, ordenados de más a menos relacionados con los gustos
 * actuales: primero los items de las categorías donde caen esos gustos
 * (round-robin entre categorías para variar), después el set de arranque.
 * Devuelve la lista completa; quien la consume decide cuántos mostrar.
 */
export function suggestInterests(current: string[]): string[] {
  const isAlreadyCovered = (item: string) =>
    current.some((interest) => matchesItem(interest, item));

  const matchedCategories = INTEREST_CATALOG.map((category) => ({
    category,
    score: current.filter((interest) =>
      category.items.some((item) => matchesItem(interest, item)),
    ).length,
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const suggestions: string[] = [];
  const seen = new Set<string>();
  const push = (item: string) => {
    const n = normalizeInterest(item);
    if (seen.has(n) || isAlreadyCovered(item)) return;
    seen.add(n);
    suggestions.push(item);
  };

  const queues = matchedCategories.map(({ category }) => [...category.items]);
  while (queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next !== undefined) push(next);
    }
  }

  for (const item of STARTER_INTERESTS) push(item);
  return suggestions;
}

/** Lo añadido y lo quitado en esta pantalla que el servidor aún no refleja. */
export type TagEdits = { added: string[]; removed: string[] };

export const NO_TAG_EDITS: TagEdits = { added: [], removed: [] };

/**
 * Aplica un cambio de etiquetas (intereses o marcas) sobre lo último guardado,
 * no sobre lo que había al abrir el bloque. En una ficha compartida otra
 * persona puede haber añadido o quitado alguna entretanto, y mandar la lista
 * entera de esta pantalla se lo llevaba por delante. Se acumula lo editado
 * aquí hasta que el servidor lo refleja: dos etiquetas seguidas, antes de que
 * llegue la primera, no se pisan entre sí.
 */
export function mergeTagEdit(
  pending: TagEdits,
  before: string[],
  after: string[],
  latest: string[],
): { tags: string[]; pending: TagEdits } {
  const add = after.filter((t) => !before.includes(t));
  const del = before.filter((t) => !after.includes(t));
  // Lo que el servidor ya refleja deja de estar pendiente.
  const added = pending.added.filter((t) => !latest.includes(t) && !del.includes(t));
  const removed = pending.removed.filter((t) => latest.includes(t) && !add.includes(t));
  for (const t of add) if (!added.includes(t)) added.push(t);
  for (const t of del) if (!removed.includes(t)) removed.push(t);
  const kept = latest.filter((t) => !removed.includes(t));
  return { tags: [...kept, ...added.filter((t) => !kept.includes(t))], pending: { added, removed } };
}

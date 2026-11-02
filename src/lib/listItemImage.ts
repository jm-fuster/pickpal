import type { GiftImageKey } from "./giftCatalog";

// La categoría de algo de una lista, sacada de su título: así la baldosa de
// una fila sin foto lleva el mismo icono y tinte que las ideas de regalo
// (src/lib/giftImages.ts). Se calcula en el navegador: el título no sale de
// aquí ni se le pregunta a nadie. Si nada encaja, el regalo genérico.
//
// Las reglas van en orden y gana la primera. Primero lo que define el tipo de
// regalo aunque el título hable de otra cosa («Clase de cerámica», «Libro de
// cocina», «Entradas para…»); después los objetos; al final los materiales y
// lo más amplio. Palabras sin tildes y en minúscula; el plural (-s, -es) se
// acepta solo. Las de varias palabras se buscan como frase.
const RULES: ReadonlyArray<readonly [GiftImageKey, readonly string[]]> = [
  ["experiencia-cultural", ["entrada", "concierto", "teatro", "musical", "opera", "museo", "exposicion", "festival", "espectaculo", "cine"]],
  ["experiencia-gastronomica", ["cena", "restaurante", "menu degustacion", "cata"]],
  ["experiencia-bienestar", ["masaje", "spa", "balneario", "circuito termal"]],
  ["experiencia-aventura", ["paracaidas", "escalada", "kayak", "rafting", "buceo", "parapente", "vuelo en globo"]],
  ["taller-curso", ["clase de", "clases de", "curso de", "cursillo", "taller de", "masterclass"]],
  ["viajes", ["viaje", "escapada", "maleta", "billete"]],
  ["libros", ["libro", "novela", "comic", "manga", "poemario", "audiolibro"]],
  ["audio", ["auriculares", "cascos", "altavoz", "tocadiscos", "airpods"]],
  ["fotografia", ["camara", "polaroid", "instax", "carrete", "tripode"]],
  ["gaming", ["videojuego", "consola", "playstation", "nintendo", "xbox", "mando"]],
  ["tecnologia", ["movil", "tablet", "ipad", "portatil", "kindle", "ebook", "smartwatch", "cargador", "teclado", "raton", "airtag", "power bank"]],
  ["musica", ["vinilo", "guitarra", "ukelele", "piano", "partitura"]],
  ["juegos-mesa", ["juego de mesa", "puzzle", "rompecabezas", "baraja", "ajedrez"]],
  ["papeleria", ["libreta", "cuaderno", "agenda", "pluma", "boligrafo", "lapiz", "lapices", "rotulador", "washi"]],
  ["arte-manualidades", ["acuarela", "pincel", "lienzo", "oleo", "arcilla", "ganchillo", "punto de cruz", "bordado", "ceramica"]],
  ["mascotas", ["perro", "gato", "mascota", "correa", "comedero", "rascador", "arenero"]],
  ["bricolaje", ["taladro", "destornillador", "herramienta", "llave inglesa", "sierra", "atornillador"]],
  ["joyeria-relojes", ["reloj", "pendiente", "collar", "pulsera", "anillo", "colgante", "joya", "broche"]],
  ["belleza", ["perfume", "colonia", "crema", "serum", "maquillaje", "pintalabios", "esmalte", "neceser", "jabon", "vela", "sales de bano"]],
  ["vino-bebidas", ["vino", "cava", "champan", "cerveza", "ginebra", "whisky", "vermut", "decantador", "coctelera"]],
  // «Té» solo en frase: suelto, sin tilde, es también el pronombre.
  ["cafe-te", ["cafe", "cafetera", "molinillo", "te verde", "te negro", "te rojo", "te chai", "tetera", "hervidor", "taza", "matcha", "infusion", "termo"]],
  ["gourmet", ["chocolate", "bombon", "jamon", "queso", "aceite", "turron", "conserva", "miel", "cesta"]],
  ["cocina", ["cuchillo", "sarten", "olla", "cazuela", "receta", "delantal", "batidora", "tabla de cortar", "cocina", "wok"]],
  ["deporte", ["running", "trail", "bicicleta", "bici", "pesa", "esterilla", "raqueta", "padel", "tenis", "balon", "gimnasio", "natacion", "yoga"]],
  ["aire-libre", ["mochila", "tienda de campana", "saco de dormir", "senderismo", "baston", "linterna", "cantimplora", "prismaticos", "camping"]],
  ["plantas", ["planta", "maceta", "regadera", "semilla", "bonsai", "huerto", "flor", "ramo", "jardin"]],
  ["moda", ["camiseta", "camisa", "jersey", "sudadera", "chaqueta", "abrigo", "pantalon", "vaquero", "vestido", "falda", "zapatilla", "zapato", "bota", "bufanda", "gorro", "guante", "calcetin", "bolso", "cartera", "cinturon", "gafas", "pijama", "sombrero"]],
  ["hogar-decoracion", ["lampara", "cojin", "manta", "jarron", "cuadro", "lamina", "poster", "espejo", "alfombra", "sabana", "toalla", "difusor", "marco", "florero", "mantel"]],
];

/** Minúsculas, sin tildes y solo letras y números, separados por un espacio. */
function words(title: string): string[] {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function matches(tokens: string[], phrase: string, keyword: string): boolean {
  if (keyword.includes(" ")) return phrase.includes(` ${keyword} `);
  return tokens.some((t) => t === keyword || t === `${keyword}s` || t === `${keyword}es`);
}

/** La categoría del catálogo de ideas que mejor encaja con el título. */
export function listItemImageKey(title: string): GiftImageKey {
  const tokens = words(title);
  const phrase = ` ${tokens.join(" ")} `;
  for (const [key, keywords] of RULES) {
    if (keywords.some((k) => matches(tokens, phrase, k))) return key;
  }
  return "regalo-generico";
}

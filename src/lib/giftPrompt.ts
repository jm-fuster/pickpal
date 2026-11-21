// El prompt del generador de ideas (`/api/recommendations`). Vive aquí y no en
// el route handler porque un `route.ts` de Next solo puede exportar métodos
// HTTP y su configuración: fuera se puede testear y ejecutar contra Gemini
// sin pasar por la API. Ver docs/ia-regalos.md · «Diseño del prompt».
import type { GiftType } from "./gifts";
import { REACTIONS, RELATIONSHIPS } from "./options";
import { STORE_IDS } from "./stores";

const formatBudget = (budgetMin?: number, budgetMax?: number) => {
  const min = budgetMin !== undefined ? budgetMin / 100 : undefined;
  const max = budgetMax !== undefined ? budgetMax / 100 : undefined;
  if (min !== undefined && max !== undefined) return `entre ${min}€ y ${max}€`;
  if (min !== undefined) return `desde ${min}€`;
  if (max !== undefined) return `hasta ${max}€`;
  return "sin límite definido";
};

const reactionLabel = (r: string) =>
  REACTIONS.find((x) => x.value === r)?.label ?? r;

export const buildPrompt = (
  person: {
    name: string;
    relationship: string;
    interests: string[];
    favoriteBrands?: string[];
    notes?: string;
    shoeSize?: string;
    clothingSize?: string;
    allergies?: string;
    dislikes?: string;
  },
  budgetMin: number | undefined,
  budgetMax: number | undefined,
  occasionLabel: string,
  giftType: GiftType,
  history: Array<{ giftName: string; occasionLabel: string; year?: number; reaction: string }>,
  discardedTitles: string[],
) => {
  const relationshipLabel =
    RELATIONSHIPS.find((r) => r.value === person.relationship)?.label ??
    person.relationship;
  const budgetText = formatBudget(budgetMin, budgetMax);
  const interestsText =
    person.interests.length > 0 ? person.interests.join(", ") : "sin definir";
  const brands = (person.favoriteBrands ?? [])
    .map((b) => b.trim())
    .filter(Boolean);
  const brandsLine =
    brands.length > 0 ? `- Marcas favoritas: ${brands.join(", ")}` : "";
  const notesText = person.notes?.trim() || "ninguna";
  // Solo el nombre de pila: los apellidos no aportan nada a la sugerencia y
  // son lo que haría identificable a la persona en el proveedor de IA. El
  // `trim()` previo importa — sin él, un nombre con espacio inicial deja el
  // campo vacío. Ver docs/privacy.md §4.1 (qué se envía y qué no).
  const firstName = person.name.trim().split(/\s+/)[0];

  const practicalLines = [
    person.shoeSize ? `- Talla de zapato: ${person.shoeSize}` : "",
    person.clothingSize ? `- Talla de ropa: ${person.clothingSize}` : "",
    person.allergies ? `- Alergias / restricciones: ${person.allergies}` : "",
    person.dislikes ? `- Cosas que no le gustan: ${person.dislikes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const historyLines =
    history.length > 0
      ? `\nHistorial de regalos anteriores (para no repetir y afinar las sugerencias):\n${history
          .slice(0, 10)
          .map(
            (h) =>
              `- "${h.giftName}" (${h.occasionLabel}${h.year ? ` ${h.year}` : ""}): ${reactionLabel(h.reaction)}`,
          )
          .join("\n")}\nEvita sugerir regalos similares a los marcados negativamente.`
      : "";

  const storesGuide = `- "suggestedStores": array de 1-${STORE_IDS.length} elementos indicando en qué tiendas online tiene sentido buscar este producto concreto. Valores válidos: ${STORE_IDS.map((s) => `"${s}"`).join(", ")}.
  Criterios por tienda — incluye solo las que realmente encajen, no copies todas:
  - "amazon": generalista. Tech, libros, productos de marca internacional, envío rápido. Inclúyela en la mayoría de productos físicos salvo nichos muy claros.
  - "elcorteingles": gran almacén español. Gourmet, vinos, moda media-alta, perfumería, juguetes, electrodomésticos, libros, regalos premium nacionales. Útil cuando la marca o la calidad importan, o cuando el producto es muy "español".
  - "aliexpress": gadgets baratos, accesorios sin marca, productos chinos genéricos. Útil para precio bajo + espera larga aceptable. Excluye gourmet español, moda media-alta, calidad relevante, artesanía.
  - "temu": marketplace ultra-low-cost (similar a AliExpress pero más reciente, con foco en hogar, gadgets, papelería, accesorios y ropa básica). Útil para presupuesto muy bajo y compras impulsivas. Mismas exclusiones que AliExpress.
  - "miravia": marketplace asiático/europeo más curado que AliExpress, con énfasis en moda y belleza. Mismo criterio general que AliExpress.
  - "decathlon": deporte y outdoor. Ropa deportiva, equipamiento (running, ciclismo, montaña, fitness, natación, fútbol), camping, mochilas técnicas. Inclúyela SOLO si la idea es claramente deportiva/outdoor.
  - "ikea": hogar, muebles, decoración, textil hogar, vajilla, iluminación, organización, plantas. Útil para regalos de mudanza o parejas que estrenan piso. Excluye tech, moda, deporte, libros.
  - "pccomponentes": tech especializada — componentes PC, periféricos, gaming, monitores, sillas gaming, smart home, móviles/portátiles. Inclúyela junto a Amazon cuando la idea es claramente tech serio.
  - "mediamarkt": electrónica mainstream — TV, audio, electrodomésticos pequeños y grandes, gaming consolas, móviles, fotografía, smartwatches. Útil para tech "no nicho", complementaria a Amazon. No la uses para componentes PC sueltos (esa es pccomponentes).
  - "zalando": moda y calzado. Ropa, zapatos, deportivas, bolsos, complementos de marca media-alta. Inclúyela cuando la idea es claramente prenda o calzado de marca; salta si es ropa deportiva técnica (esa va a decathlon).
  - "druni": perfumería y cosmética. Perfumes, maquillaje, skincare, cuidado personal, set de regalo de belleza. Inclúyela SOLO si la idea es claramente belleza/perfumería; combina con elcorteingles para regalos premium.
  Incluye SIEMPRE al menos una tienda generalista ("amazon" o "elcorteingles"), excepto si el producto es claramente nicho (artesanal, gourmet local, hecho a medida) — en ese caso indica solo las que realmente encajen.
  Para productos muy específicos (deporte → "decathlon"; muebles → "ikea"; tech serio → "pccomponentes" + "amazon"; electrónica mainstream → "mediamarkt" + "amazon"; libros y cultura → "amazon" + "elcorteingles"; moda/calzado → "zalando" + "elcorteingles"; belleza/perfumería → "druni" + "elcorteingles"; ultra-low-cost → "aliexpress" + "temu"), incluye la tienda especialista junto a la generalista para dar al usuario más opciones de calidad-precio.`;

  // La ficha no guarda dónde vive la persona. Con ciudades en los ejemplos, la
  // IA metía una en la búsqueda y alguien de Valencia acababa buscando en
  // Madrid; sin ella, Google ya ordena por la ubicación de quien busca.
  const placeRule = `- No pongas ciudad ni lugar en "amazonQuery": Google ya enseña lo que hay cerca de quien busca. Solo si las notas dicen dónde vive o dónde quiere hacerlo, inclúyelo.`;

  const typeRules: Record<GiftType, string> = {
    fisica: `- Todas las ideas deben ser productos físicos comprables online.
- "amazonQuery" debe ser una búsqueda específica de 3-6 palabras útil para encontrar el producto en cualquier tienda online.
- Si la idea es ropa o calzado y conoces la talla, inclúyela en "amazonQuery" (ej: "zapatillas running hombre talla 42", "camiseta algodón mujer talla M").
${storesGuide}`,
    experiencia: `- Todas las ideas deben ser experiencias (cenas, talleres, escapadas, conciertos, actividades…). No productos físicos.
- "amazonQuery" debe ser una búsqueda de 3-6 palabras para encontrar esa experiencia en Google (ej. "cata de vinos", "taller de cerámica para adultos").
${placeRule}
- Omite "suggestedStores" en este tipo de ideas (no aplica).
- "category" debe referenciar los intereses concretos de la persona que motivan la experiencia (ej: ["Fotografía"], ["Cocina"], ["Senderismo"]). Si la experiencia no encaja con ningún interés definido, usa una etiqueta específica a la actividad (ej: ["Escape Room"], no ["Aventura"]).`,
    "tiempo-juntos": `- Todas las ideas deben ser planes gratuitos o caseros: actividades para hacer juntos, recetas, rutas, vales artesanales, etc.
- "amazonQuery" debe ser una frase descriptiva de 3-5 palabras para buscar inspiración en Google (ej. "ruta senderismo fácil", "receta cena especial").
${placeRule}
- Los precios deben ser bajos o cero (experiencias sin coste o materiales mínimos).
- Omite "suggestedStores" en este tipo de ideas (no aplica).
- "category" debe referenciar los intereses concretos de la persona que motivan el plan (ej: ["Leer"], ["Cocina"]). Si el plan no encaja con ningún interés definido, usa una etiqueta específica al plan (ej: ["Paseo al atardecer"], no ["Romántico"]).`,
    // La tanda de cada ocasión desde el 3-nov-2026: el tipo ya no se elige
    // antes de generar, filtra después (IDEA_KINDS en giftCatalog.ts).
    sorprendeme: `- Mezcla cosas para comprar, experiencias y planes. Por defecto, unas 6 para comprar, 2 experiencias y 1 plan; ajusta la mezcla a la relación y al presupuesto (con un compañero de trabajo, ningún plan íntimo; con la pareja, algún plan más; con un presupuesto muy bajo, más planes caseros).
- "giftType" de cada idea: "fisica" si es un producto que se compra y se envuelve; "experiencia" si es una actividad que se paga (cena, taller, escapada, concierto…); "tiempo-juntos" si es un plan gratuito o casero para hacer juntos.
- Ordena las ideas de la que mejor encaja a la que menos, sin agruparlas por tipo.
- Para productos: "amazonQuery" útil para buscar online y rellena "suggestedStores" siguiendo los criterios. Para experiencias y planes: "amazonQuery" útil para Google y omite "suggestedStores".
${placeRule}
- Si la idea es ropa o calzado y conoces la talla, inclúyela en "amazonQuery".
- Los planes, con precios bajos o cero.
${storesGuide}`,
  };

  // Descartar es «esta no», no «no le gusta el tema»: hasta el 3-nov-2026 se
  // vetaban las categorías de la idea, que son sus intereses, y unos auriculares
  // descartados prohibían la música en la siguiente tanda.
  const discardedLine =
    discardedTitles.length > 0
      ? `\nIdeas que ya se le propusieron y quien regala descartó. No las repitas ni propongas variantes casi iguales. Descartar una idea no dice nada de sus intereses: siguen valiendo todos.\n${discardedTitles.map((t) => `- ${t}`).join("\n")}`
      : "";

  const brandsRule =
    brands.length > 0
      ? `\n- Marcas favoritas: cuando una idea para ${firstName} encaje de forma natural con una de sus marcas favoritas, prioriza un producto de esa marca e incluye el nombre de la marca en "amazonQuery" (ej: "zapatillas Nike running talla 42"). No las fuerces: úsalas como máximo en 3-4 de las 9 ideas para mantener la variedad, nunca en lo que sea para otra persona (un bebé, la pareja, la casa) y nunca uses una marca como "category".`
      : "";

  // La ocasión es texto libre («Nacimiento de Leo», «Boda», «Casa nueva»).
  // Hasta el 21-nov-2026 iba como una línea más del bloque Persona y sin
  // ninguna regla, así que pesaban los intereses: en un nacimiento salían
  // bastones de senderismo y una camiseta de su talla para la madre. Medido
  // con la misma ficha y cuatro ocasiones: docs/ia-regalos.md · «La ocasión
  // manda».
  const occasionRule = `- Antes de nada, decide para quién y para qué es el regalo leyendo la ocasión junto a la ficha. La ficha es de ${firstName}; la ocasión es lo que se celebra:
  - Si la ocasión nombra a otra persona que no es ${firstName} (ej. «Cumpleaños de Leo» en su ficha), el regalo es para esa persona y la ficha solo da contexto. No sabes su edad ni sus gustos: no le apliques los de ${firstName} ni propongas nada que exija ser adulto (alcohol, navajas); busca regalos que sirvan a casi cualquiera.
  - Cumpleaños, santo, aniversario, Navidad, Reyes, Día de la Madre o del Padre, San Valentín, o una fecha sin más contexto: el regalo es para ${firstName}, y sus intereses, marcas y tallas mandan.
  - Un nacimiento o la llegada de un bebé (también «bebé», «parto», «baby shower»): la mayoría de las ideas, para el bebé (cosas útiles o bonitas para un recién nacido y sus primeros meses); una o dos, para que ${firstName} y su familia se cuiden en esa etapa.
  - Un bautizo, una comunión o la fiesta de un niño: el regalo es para el niño o la niña que la celebra.
  - Una boda o una pedida de mano: regalos para la pareja y su vida juntos.
  - Una mudanza, una casa nueva o una reforma: cosas para el hogar nuevo.
  - Una jubilación, una graduación, unas oposiciones, un trabajo nuevo o un viaje: regalos que celebren ese momento y le sirvan en la etapa que empieza.
  - Cualquier otra ocasión: tómala como el motivo del regalo y deja que oriente todas las ideas.
- Cuando la ocasión manda sobre los gustos, los intereses de ${firstName} solo matizan el estilo de las ideas (ej. un móvil de cuna de fieltro hecho a mano si le gusta la artesanía), y sus tallas y marcas solo valen para lo que sea para ${firstName}.`;

  return `Genera EXACTAMENTE 9 ideas de regalo para la siguiente ocasión y persona.

Ocasión: ${occasionLabel}

Persona (su ficha):
- Nombre: ${firstName}
- Relación con quien regala: ${relationshipLabel}
- Intereses: ${interestsText}
${brandsLine ? brandsLine + "\n" : ""}- Notas: ${notesText}
- Presupuesto: ${budgetText}
${practicalLines ? practicalLines + "\n" : ""}${historyLines}${discardedLine}

Reglas:
${occasionRule}
${typeRules[giftType]}${brandsRule}
- Los precios deben respetar el presupuesto indicado cuando sea posible.
- Varía las categorías (no todas del mismo tipo).
- "description" en español, UNA sola frase breve (máximo ~140 caracteres), explicando por qué encaja con esta persona y esta ocasión. Si el regalo es para otra persona (el bebé, la pareja), que se entienda. Concisa: debe leerse entera de un vistazo.
- "category" es un array JSON de 1 a 3 strings en español. Usa intereses concretos del perfil que justifiquen la idea (ej: ["Senderismo", "Fotografía"], ["Cocina japonesa"], ["Gaming", "Tecnología"]). Si la idea no encaja con ningún interés definido, o la ocasión manda sobre los gustos, usa una etiqueta descriptiva específica al regalo (ej: ["Accesorios viaje"], no ["Viajes"]; ["Ropa de bebé"], ["Menaje"]). Nunca uses categorías genéricas sueltas como ["Tecnología"], ["Hogar"] o ["Libros"] si hay intereses más concretos disponibles.
- "imageKey": la clave del catálogo visual que mejor representa la idea. Elige siempre la más específica disponible (ej. "audio" para unos auriculares, no "tecnologia"; "experiencia-gastronomica" para una cena, no "gourmet"). Usa "regalo-generico" solo si ninguna otra encaja.
- "imageQuery": búsqueda EN INGLÉS de 2-4 palabras para encontrar una foto de stock que ilustre el regalo (ej: "wireless headphones", "pottery workshop", "hiking boots trail"). Describe el objeto o la escena de forma genérica y visual — sin marcas, sin tallas, sin adjetivos de marketing.
- "priceMinEuros" y "priceMaxEuros" en euros, valores enteros razonables.
- Responde en español. IMPORTANTE: escribe todos los textos con caracteres Unicode directos (á, é, í, ó, ú, ñ, ü, etc.). No uses secuencias de escape como \\u00e9; escribe directamente el carácter.`;
};

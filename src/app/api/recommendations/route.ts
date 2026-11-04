import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexError } from "convex/values";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  giftRecommendationsSchema,
  giftRecommendationsSchemaMixed,
  giftRecommendationsSchemaNoStores,
  GIFT_TYPES,
  repairGeneratedIdeas,
  type GiftType,
} from "@/lib/gifts";
import { RELATIONSHIPS, REACTIONS } from "@/lib/schemas";
import { STORE_IDS } from "@/lib/stores";
import { matchFavoriteBrands, normalizeBrandDomain } from "@/lib/brands";
import { normalizeInterest } from "@/lib/interests";
import { classifyProviderError } from "@/lib/errors";

const GIFT_TYPE_VALUES = GIFT_TYPES.map((t) => t.value) as [GiftType, ...GiftType[]];

const requestSchema = z.object({
  personId: z.string().min(1),
  occasionLabel: z.string().min(1).max(40),
  giftType: z.enum(GIFT_TYPE_VALUES).default("fisica"),
});

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

const buildPrompt = (
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
      ? `\n- Marcas favoritas: cuando una idea encaje de forma natural con una de las marcas favoritas de la persona, prioriza un producto de esa marca e incluye el nombre de la marca en "amazonQuery" (ej: "zapatillas Nike running talla 42"). No las fuerces: úsalas como máximo en 3-4 de las 9 ideas para mantener la variedad, y nunca uses una marca como "category".`
      : "";

  return `Genera EXACTAMENTE 9 ideas de regalo para la siguiente persona.

Persona:
- Nombre: ${firstName}
- Relación con quien regala: ${relationshipLabel}
- Intereses: ${interestsText}
${brandsLine ? brandsLine + "\n" : ""}- Notas: ${notesText}
- Presupuesto: ${budgetText}
- Ocasión: ${occasionLabel}
${practicalLines ? practicalLines + "\n" : ""}${historyLines}${discardedLine}

Reglas:
${typeRules[giftType]}${brandsRule}
- Los precios deben respetar el presupuesto indicado cuando sea posible.
- Varía las categorías (no todas del mismo tipo).
- "description" en español, UNA sola frase breve (máximo ~140 caracteres), explicando por qué encaja con esta persona. Concisa: debe leerse entera de un vistazo.
- "category" es un array JSON de 1 a 3 strings en español. Usa intereses concretos del perfil que justifiquen la idea (ej: ["Senderismo", "Fotografía"], ["Cocina japonesa"], ["Gaming", "Tecnología"]). Si la idea no encaja con ningún interés definido, usa una etiqueta descriptiva específica al regalo (ej: ["Accesorios viaje"], no ["Viajes"]). Nunca uses categorías genéricas sueltas como ["Tecnología"], ["Hogar"] o ["Libros"] si hay intereses más concretos disponibles.
- "imageKey": la clave del catálogo visual que mejor representa la idea. Elige siempre la más específica disponible (ej. "audio" para unos auriculares, no "tecnologia"; "experiencia-gastronomica" para una cena, no "gourmet"). Usa "regalo-generico" solo si ninguna otra encaja.
- "imageQuery": búsqueda EN INGLÉS de 2-4 palabras para encontrar una foto de stock que ilustre el regalo (ej: "wireless headphones", "pottery workshop", "hiking boots trail"). Describe el objeto o la escena de forma genérica y visual — sin marcas, sin tallas, sin adjetivos de marketing.
- "priceMinEuros" y "priceMaxEuros" en euros, valores enteros razonables.
- Responde en español. IMPORTANTE: escribe todos los textos con caracteres Unicode directos (á, é, í, ó, ú, ñ, ü, etc.). No uses secuencias de escape como \\u00e9; escribe directamente el carácter.`;
};

type PexelsPhoto = {
  src?: { medium?: string };
  photographer?: string;
  photographer_url?: string;
};

/**
 * Busca en Pexels una foto de stock por idea y la adjunta como `image`,
 * eliminando siempre `imageQuery` (solo existe durante la generación; el
 * validador de Convex rechaza campos desconocidos). Mejora progresiva:
 * sin PEXELS_API_KEY, sin resultados o con error/timeout, la idea sale sin
 * `image` y la card usa la cabecera de icono (imageKey). Nunca lanza.
 */
async function attachStockImages(
  ideas: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const apiKey = process.env.PEXELS_API_KEY;
  const stripped = ideas.map((idea) => {
    const rest = { ...idea };
    delete rest.imageQuery;
    return rest;
  });
  if (!apiKey) return stripped;

  const images = await Promise.all(
    ideas.map(async (idea): Promise<Record<string, unknown> | undefined> => {
      const query = typeof idea.imageQuery === "string" ? idea.imageQuery.trim() : "";
      if (!query) return undefined;
      try {
        const res = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
          {
            headers: { Authorization: apiKey },
            // La foto es decorativa: si Pexels va lento, la generación no espera.
            signal: AbortSignal.timeout(4000),
          },
        );
        if (!res.ok) return undefined;
        const data = (await res.json()) as { photos?: PexelsPhoto[] };
        const photo = data.photos?.[0];
        const url = photo?.src?.medium;
        // Espejo de la validación server-side de Convex (prefijo + tamaños):
        // no persistimos nada que la mutation fuera a rechazar.
        if (!url || !url.startsWith("https://images.pexels.com/") || url.length > 512) {
          return undefined;
        }
        const image: Record<string, unknown> = { url };
        if (photo?.photographer && photo.photographer.length <= 120) {
          image.photographer = photo.photographer;
        }
        if (
          photo?.photographer_url &&
          photo.photographer_url.startsWith("https://www.pexels.com/") &&
          photo.photographer_url.length <= 512
        ) {
          image.photographerUrl = photo.photographer_url;
        }
        return image;
      } catch {
        return undefined;
      }
    }),
  );

  return stripped.map((idea, i) =>
    images[i] ? { ...idea, image: images[i] } : idea,
  );
}

const BRANDFETCH_LOGO_PREFIX = "https://cdn.brandfetch.io/";

type BrandStoreResolution = {
  brand: string;
  domain: string;
  logoUrl?: string;
  supportsSearch?: boolean;
};

/**
 * Detecta si una tienda es Shopify sondeando `/products.json`, que en Shopify
 * devuelve 200 + JSON con `products`. Es la huella estándar de Shopify y la
 * señal usada para saber que la ruta `/search?q=` existe. Conservador: solo
 * devuelve true ante un 200 JSON con `products` (sin seguir redirecciones, que
 * indicarían password/checkout), así que nunca da un falso positivo que
 * enlazaría a una búsqueda rota. Best-effort: ante cualquier duda, false (la
 * card cae a la home de la marca). El dominio ya viene saneado como hostname.
 */
async function storeSupportsSearch(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}/products.json?limit=1`, {
      signal: AbortSignal.timeout(2500),
      redirect: "manual",
    });
    if (res.status !== 200) return false;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) {
      return false;
    }
    const data = (await res.json()) as { products?: unknown };
    return Array.isArray(data.products);
  } catch {
    return false;
  }
}

/**
 * Resuelve una marca a su tienda oficial vía Brandfetch Search: una sola
 * llamada devuelve dominio + logo (`icon`). Tras resolver, sondea si la tienda
 * admite búsqueda (`/search?q=`) para poder enlazar al producto dentro de la
 * web. Best-effort: sin clave, sin resultado, timeout o error → undefined, y la
 * card cae al botón de búsqueda de marca (Capa 0). Nunca lanza. El logo se
 * acota al CDN de Brandfetch (mismo patrón de allowlist por prefijo que Pexels).
 */
async function resolveBrandStore(
  clientId: string,
  brand: string,
): Promise<BrandStoreResolution | undefined> {
  try {
    const res = await fetch(
      `https://api.brandfetch.io/v2/search/${encodeURIComponent(brand)}?c=${encodeURIComponent(clientId)}`,
      // La resolución es decorativa: si Brandfetch va lento, no bloquea la tanda.
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as Array<{ domain?: string; icon?: string }>;
    const first = Array.isArray(data) ? data[0] : undefined;
    if (!first?.domain) return undefined;
    const domain = normalizeBrandDomain(first.domain);
    if (!domain) return undefined;
    const resolution: BrandStoreResolution = { brand: brand.trim(), domain };
    if (
      typeof first.icon === "string" &&
      first.icon.startsWith(BRANDFETCH_LOGO_PREFIX) &&
      first.icon.length <= 512
    ) {
      resolution.logoUrl = first.icon;
    }
    if (await storeSupportsSearch(domain)) {
      resolution.supportsSearch = true;
    }
    return resolution;
  } catch {
    return undefined;
  }
}

/**
 * Adjunta a cada idea las tiendas oficiales (`matchedBrandStores`) de las
 * marcas favoritas que menciona, resueltas vía Brandfetch. Mejora progresiva,
 * igual que las fotos de Pexels: sin BRANDFETCH_CLIENT_ID, sin marcas o sin
 * resolución, las ideas salen sin el campo y la card usa el botón de búsqueda
 * de marca (Capa 0). Nunca lanza. Sin caché: el volumen está acotado por la
 * cuota de 10 generaciones/día × las pocas marcas que matchea una tanda.
 */
async function attachBrandStores(
  ideas: Array<Record<string, unknown>>,
  favoriteBrands: string[] | undefined,
): Promise<Array<Record<string, unknown>>> {
  const clientId = process.env.BRANDFETCH_CLIENT_ID;
  const brands = (favoriteBrands ?? []).map((b) => b.trim()).filter(Boolean);
  if (!clientId || brands.length === 0) return ideas;

  const perIdeaMatched = ideas.map((idea) =>
    matchFavoriteBrands(
      {
        title: typeof idea.title === "string" ? idea.title : "",
        amazonQuery: typeof idea.amazonQuery === "string" ? idea.amazonQuery : "",
      },
      brands,
    ),
  );

  // Set único de marcas realmente mencionadas en esta tanda (normalizada → display).
  const unique = new Map<string, string>();
  for (const matched of perIdeaMatched) {
    for (const b of matched) unique.set(normalizeInterest(b), b);
  }
  if (unique.size === 0) return ideas;

  const resolved = new Map<string, BrandStoreResolution>();
  await Promise.all(
    [...unique].map(async ([key, display]) => {
      const r = await resolveBrandStore(clientId, display);
      if (r) resolved.set(key, r);
    }),
  );
  if (resolved.size === 0) return ideas;

  return ideas.map((idea, i) => {
    const stores = perIdeaMatched[i]
      .map((b) => resolved.get(normalizeInterest(b)))
      .filter((r): r is BrandStoreResolution => Boolean(r));
    return stores.length > 0 ? { ...idea, matchedBrandStores: stores } : idea;
  });
}

export async function POST(req: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  // Un token recién pedido para lo que va después de Gemini (guardar o
  // devolver la unidad). El del principio dura lo que diga la plantilla de
  // Clerk (60 s por defecto), y una generación lenta con reintentos más las
  // fotos y las marcas puede pasar de ahí: guardar fallaría, devolver la
  // unidad también, y el aviso diría que no se ha gastado.
  const freshToken = async () => (await getToken({ template: "convex" }).catch(() => null)) ?? token;

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error(
      "[recommendations] Falta GOOGLE_GENERATIVE_AI_API_KEY en el entorno del servidor.",
    );
    return NextResponse.json(
      { error: "Servicio temporalmente no disponible." },
      { status: 503 },
    );
  }

  // Secreto compartido que autoriza las mutations de cuota (reserve/refund) como
  // llamadas server-side. Sin él, esas mutations rechazan: prefijo de fallo
  // claro en logs en vez de un ArgumentValidationError opaco.
  const serverSecret = process.env.CONVEX_SERVER_SECRET;
  if (!serverSecret) {
    console.error(
      "[recommendations] Falta CONVEX_SERVER_SECRET en el entorno del servidor.",
    );
    return NextResponse.json(
      { error: "Servicio temporalmente no disponible." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    // No devolvemos parsed.error.issues: expone la forma interna del schema.
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const personId = parsed.data.personId as Id<"people">;
  const { occasionLabel, giftType } = parsed.data;

  // Un personId malformado o de otro usuario hace que Convex lance
  // (ArgumentValidationError / ownership): para el cliente ambos casos son
  // el mismo 404, sin distinguir "no existe" de "no es tuyo".
  let person, matchingDate, history, discardedTitles;
  try {
    [person, matchingDate, history, discardedTitles] = await Promise.all([
      fetchQuery(api.people.getById, { id: personId }, { token }),
      fetchQuery(api.importantDates.getByPersonAndLabel, { personId, label: occasionLabel }, { token }),
      fetchQuery(api.giftHistory.getByPerson, { personId }, { token }),
      fetchQuery(api.recommendations.getDiscardedTitles, { personId, occasionLabel, giftType }, { token }),
    ]);
  } catch (err) {
    console.error("[recommendations] context queries:", err);
    return NextResponse.json(
      { error: "Persona no encontrada." },
      { status: 404 },
    );
  }

  if (!person) {
    return NextResponse.json(
      { error: "Persona no encontrada." },
      { status: 404 },
    );
  }

  // La ocasión tiene que ser uno de sus eventos, y se mira antes de reservar.
  // Una etiqueta que no lo es (en blanco pasa el zod) llegaba a Gemini, la
  // rechazaba `upsert` después y el `catch` devolvía la unidad: repetirla daba
  // generaciones sin tope. Y un `?occasion=` de un evento ya renombrado o
  // borrado generaba sin presupuesto, en una tanda que nadie volvería a ver.
  if (!matchingDate) {
    return NextResponse.json(
      { error: "Esa ocasión ya no está en su ficha. Elige otra." },
      { status: 404 },
    );
  }

  // Cuota: reserva atómica ANTES de llamar a Gemini. Dos peticiones
  // concurrentes en el límite no pueden pasar de 10/día; si el proveedor
  // falla de forma retriable se devuelve la unidad con `refund` en el catch.
  let remaining: number;
  let reservedDay: string | undefined;
  try {
    const reserved = await fetchMutation(api.recommendationUsage.reserve, { secret: serverSecret }, { token });
    remaining = reserved.remaining;
    reservedDay = reserved.day;
  } catch (err) {
    // «No autorizado.» es el secreto de servidor, no la cuota: un
    // CONVEX_SERVER_SECRET distinto en Next y en Convex. Sin esto salía como
    // un límite alcanzado (429) y sin rastro en el log.
    if (err instanceof ConvexError && err.data !== "No autorizado.") {
      return NextResponse.json(
        { error: typeof err.data === "string" ? err.data : "Has alcanzado el límite diario de recomendaciones." },
        { status: 429 },
      );
    }
    console.error("[recommendations] quota reserve:", err);
    return NextResponse.json(
      { error: "Error interno al verificar el límite de uso." },
      { status: 500 },
    );
  }

  const prompt = buildPrompt(person, matchingDate?.budgetMin, matchingDate?.budgetMax, occasionLabel, giftType, history, discardedTitles);

  const noStores = giftType === "experiencia" || giftType === "tiempo-juntos";

  try {
    const { object } = await generateObject({
      // Migrado desde gemini-2.5-flash el 20-sep-2026: Google lo retiró para
      // claves nuevas y devolvía 404 "no longer available to new users".
      // La elección entre sustitutos se hizo midiendo, no leyendo la tabla de
      // modelos: 3 intentos con este mismo schema contra cada candidato.
      //   3.8-flash          0/3, saturado
      //   3.7-flash          1/3, saturado
      //   3.5-flash          3/3, ~20 s   <- este
      //   flash-latest       cuota agotada (alias flotante, además:
      //                      un cambio de modelo por debajo puede romper el
      //                      structured output sin avisar; no usar)
      // Se midió en la capa gratuita, donde la disponibilidad fluctúa por
      // horas: 3.8 iba fino veinte minutos antes de la medición. Si vuelve a
      // haber 503 sostenidos, medir otra vez antes de cambiar. Se prefiere el
      // lento que responde al rápido que devuelve 503 a mitad de una
      // generación que ya reservó cuota.
      model: google("gemini-3.5-flash"),
      schema:
        giftType === "sorprendeme"
          ? giftRecommendationsSchemaMixed
          : noStores
            ? giftRecommendationsSchemaNoStores
            : giftRecommendationsSchema,
      prompt,
      // Razonamiento dinámico: se deja en el default del modelo. Con 2.5,
      // desactivarlo con `thinkingBudget: 0` degradaba la fiabilidad del
      // structured output (9 objetos con enums/arrays) y provocaba "response did
      // not match schema"; no hay motivo para tocarlo ahora.
      // `maxRetries: 2` repite la llamada si falla la red o el proveedor (un
      // 503, un 429 por minuto). No repite una tanda que no valide contra el
      // schema: esa va directa al `catch`. Lo que el schema deja pasar y
      // `upsert` rechazaría lo arregla `repairGeneratedIdeas`.
      maxRetries: 2,
    });

    // La cuota ya quedó reservada antes de llamar a Gemini; aquí solo
    // persistimos. Sin `consume` posterior no existe el caso "ideas
    // guardadas pero el usuario ve un error".
    const cleanIdeas = repairGeneratedIdeas(object.ideas as Array<Record<string, unknown>>);
    // La UI y removeIdea usan el título como clave: si Gemini repite un
    // título, conservamos solo la primera aparición.
    const seenTitles = new Set<string>();
    const uniqueIdeas = cleanIdeas.filter((idea) => {
      const title = String(idea.title);
      if (seenTitles.has(title)) return false;
      seenTitles.add(title);
      return true;
    });
    const ideasWithImages = await attachStockImages(uniqueIdeas);
    // Resuelve la tienda oficial de las marcas favoritas matcheadas (Brandfetch).
    // Best-effort: degrada al botón de búsqueda de marca si no hay clave/resolución.
    const ideasWithBrands = await attachBrandStores(ideasWithImages, person.favoriteBrands);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchMutation(api.recommendations.upsert, { personId, occasionLabel, giftType, ideas: ideasWithBrands as any }, { token: await freshToken() });

    return NextResponse.json({ ideas: ideasWithBrands, remaining });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const failure = classifyProviderError(err);
    // El `kind` en el log distingue los 429 entre sí (cuota diaria agotada vs.
    // ráfaga por minuto) sin tener que volver a leer el cuerpo del proveedor.
    console.error(`[recommendations] gemini (${failure.kind}):`, message);
    // La cuota se reservó ANTES de llamar a Gemini. Si llegamos al catch no se
    // persistió ninguna idea (el `return` de éxito va dentro del try, tras el
    // upsert), así que SIEMPRE devolvemos la unidad: ni un fallo retriable del
    // proveedor (503/timeout) ni uno de validación del schema (Gemini devuelve
    // ≠9 ideas, bloqueo de seguridad, JSON inválido) deben costarle al usuario
    // una de sus generaciones diarias.
    try {
      await fetchMutation(api.recommendationUsage.refund, { day: reservedDay, secret: serverSecret }, { token: await freshToken() });
    } catch (refundErr) {
      console.error("[recommendations] quota refund:", refundErr);
    }
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}

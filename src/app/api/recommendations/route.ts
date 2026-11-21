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
import { matchFavoriteBrands, normalizeBrandDomain } from "@/lib/brands";
import { normalizeInterest } from "@/lib/interests";
import { classifyProviderError } from "@/lib/errors";
import { buildPrompt, firstNameOf } from "@/lib/giftPrompt";
import { ageBandForPrompt } from "@/lib/ageBand";

const GIFT_TYPE_VALUES = GIFT_TYPES.map((t) => t.value) as [GiftType, ...GiftType[]];

const requestSchema = z.object({
  personId: z.string().min(1),
  occasionLabel: z.string().min(1).max(40),
  giftType: z.enum(GIFT_TYPE_VALUES).default("fisica"),
});

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
  let person, matchingDate, allDates, history, discardedTitles;
  try {
    [person, matchingDate, allDates, history, discardedTitles] = await Promise.all([
      fetchQuery(api.people.getById, { id: personId }, { token }),
      fetchQuery(api.importantDates.getByPersonAndLabel, { personId, label: occasionLabel }, { token }),
      // Solo para la franja de edad: el cumpleaños con año de la propia ficha.
      fetchQuery(api.importantDates.getByPerson, { personId }, { token }),
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

  const ageBand = ageBandForPrompt({ events: allDates, occasion: matchingDate, firstName: firstNameOf(person.name) });
  const prompt = buildPrompt(person, matchingDate?.budgetMin, matchingDate?.budgetMax, occasionLabel, giftType, history, discardedTitles, ageBand);

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

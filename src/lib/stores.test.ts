import { describe, expect, it } from "vitest";
import {
  ALL_STORES,
  generateStoreSearchUrl,
  isStoreId,
  padPriceRange,
  pickEffectiveStores,
  sanitizeFavoriteStores,
  storeIdForUrl,
} from "./stores";

describe("generateStoreSearchUrl", () => {
  it("genera URL de búsqueda en amazon.es", () => {
    expect(generateStoreSearchUrl("amazon", "libro de cocina")).toBe(
      "https://www.amazon.es/s?k=libro%20de%20cocina",
    );
  });

  it("genera URL de búsqueda en aliexpress", () => {
    expect(generateStoreSearchUrl("aliexpress", "auriculares bluetooth")).toBe(
      "https://es.aliexpress.com/w/wholesale-auriculares%20bluetooth.html",
    );
  });

  it("genera URL de búsqueda en miravia", () => {
    expect(generateStoreSearchUrl("miravia", "regalo cumple")).toBe(
      "https://www.miravia.es/search?q=regalo%20cumple",
    );
  });

  it("genera URL de búsqueda en El Corte Inglés", () => {
    expect(
      generateStoreSearchUrl("elcorteingles", "pulsera personalizada"),
    ).toBe(
      "https://www.elcorteingles.es/search/?s=pulsera%20personalizada",
    );
  });

  it("genera URL de búsqueda en Decathlon (Endeca usa Ntt, no q)", () => {
    expect(generateStoreSearchUrl("decathlon", "zapatillas running")).toBe(
      "https://www.decathlon.es/es/search?Ntt=zapatillas%20running",
    );
  });

  it("genera URL de búsqueda en IKEA", () => {
    expect(generateStoreSearchUrl("ikea", "mesa escritorio")).toBe(
      "https://www.ikea.com/es/es/search/?q=mesa%20escritorio",
    );
  });

  it("genera URL de búsqueda en PcComponentes", () => {
    expect(generateStoreSearchUrl("pccomponentes", "teclado mecanico")).toBe(
      "https://www.pccomponentes.com/search/?query=teclado%20mecanico",
    );
  });

  it("escapa caracteres especiales", () => {
    expect(generateStoreSearchUrl("amazon", "café & té")).toBe(
      "https://www.amazon.es/s?k=caf%C3%A9%20%26%20t%C3%A9",
    );
  });

  it("añade filtro de precio en Amazon con margen padded", () => {
    expect(
      generateStoreSearchUrl("amazon", "auriculares", {
        minEuros: 30,
        maxEuros: 50,
      }),
    ).toBe(
      "https://www.amazon.es/s?k=auriculares&low-price=24&high-price=65",
    );
  });

  it("añade filtro de precio en AliExpress con margen padded", () => {
    expect(
      generateStoreSearchUrl("aliexpress", "auriculares", {
        minEuros: 30,
        maxEuros: 50,
      }),
    ).toBe(
      "https://es.aliexpress.com/w/wholesale-auriculares.html?minPrice=24&maxPrice=65",
    );
  });

  it("ignora el filtro de precio en tiendas que no lo soportan", () => {
    const range = { minEuros: 30, maxEuros: 50 };
    expect(generateStoreSearchUrl("elcorteingles", "vino tinto", range)).toBe(
      "https://www.elcorteingles.es/search/?s=vino%20tinto",
    );
    expect(generateStoreSearchUrl("decathlon", "zapatillas", range)).toBe(
      "https://www.decathlon.es/es/search?Ntt=zapatillas",
    );
    expect(generateStoreSearchUrl("ikea", "lámpara", range)).toBe(
      "https://www.ikea.com/es/es/search/?q=l%C3%A1mpara",
    );
  });

  it("sin priceRange genera URL sin filtro de precio aunque la tienda lo soporte", () => {
    expect(generateStoreSearchUrl("amazon", "auriculares")).toBe(
      "https://www.amazon.es/s?k=auriculares",
    );
    expect(generateStoreSearchUrl("aliexpress", "auriculares")).toBe(
      "https://es.aliexpress.com/w/wholesale-auriculares.html",
    );
  });
});

describe("padPriceRange", () => {
  it("ensancha la franja con -20% / +30% redondeando a enteros", () => {
    expect(padPriceRange(30, 50)).toEqual({ lowEuros: 24, highEuros: 65 });
  });

  it("redondea hacia abajo el mínimo y hacia arriba el máximo", () => {
    expect(padPriceRange(10, 15)).toEqual({ lowEuros: 8, highEuros: 20 });
  });

  it("acepta min === max (precio puntual)", () => {
    expect(padPriceRange(30, 30)).toEqual({ lowEuros: 24, highEuros: 39 });
  });

  it("nunca devuelve mínimo negativo", () => {
    expect(padPriceRange(0, 50)).toEqual({ lowEuros: 0, highEuros: 65 });
  });

  it("garantiza que high > low aunque la franja sea diminuta", () => {
    expect(padPriceRange(0, 0)).toEqual({ lowEuros: 0, highEuros: 1 });
  });

  it("devuelve 0/0 cuando la entrada es inválida (defensa)", () => {
    expect(padPriceRange(NaN, 50)).toEqual({ lowEuros: 0, highEuros: 0 });
    expect(padPriceRange(-5, 50)).toEqual({ lowEuros: 0, highEuros: 0 });
    expect(padPriceRange(50, 30)).toEqual({ lowEuros: 0, highEuros: 0 });
  });
});

describe("isStoreId", () => {
  it("acepta tiendas conocidas", () => {
    for (const store of ALL_STORES) {
      expect(isStoreId(store)).toBe(true);
    }
  });

  it("rechaza valores desconocidos", () => {
    expect(isStoreId("ebay")).toBe(false);
    expect(isStoreId("etsy")).toBe(false);
    expect(isStoreId("fnac")).toBe(false);
    expect(isStoreId("")).toBe(false);
    expect(isStoreId("AMAZON")).toBe(false);
  });
});

describe("sanitizeFavoriteStores", () => {
  it("filtra valores desconocidos", () => {
    expect(
      sanitizeFavoriteStores(["amazon", "ebay", "elcorteingles"]),
    ).toEqual(["amazon", "elcorteingles"]);
  });

  it("descarta tiendas legacy retiradas (etsy, fnac)", () => {
    expect(
      sanitizeFavoriteStores(["amazon", "etsy", "fnac", "miravia"]),
    ).toEqual(["amazon", "miravia"]);
  });

  it("elimina duplicados manteniendo orden canónico", () => {
    // Orden canónico de STORE_IDS: amazon, elcorteingles, aliexpress, miravia,
    // decathlon, ikea, pccomponentes.
    expect(
      sanitizeFavoriteStores([
        "miravia",
        "amazon",
        "amazon",
        "elcorteingles",
      ]),
    ).toEqual(["amazon", "elcorteingles", "miravia"]);
  });

  it("devuelve array vacío si no hay tiendas válidas", () => {
    expect(sanitizeFavoriteStores(["ebay", "shein"])).toEqual([]);
  });
});

describe("pickEffectiveStores", () => {
  it("devuelve todas las favoritas cuando suggestedStores es undefined (idea cacheada pre-v2)", () => {
    const result = pickEffectiveStores(
      ["amazon", "miravia"],
      undefined,
    );
    expect(result).toEqual({
      stores: ["amazon", "miravia"],
      isFallback: false,
    });
  });

  it("devuelve todas las favoritas cuando suggestedStores está vacío", () => {
    const result = pickEffectiveStores(["amazon", "miravia"], []);
    expect(result).toEqual({
      stores: ["amazon", "miravia"],
      isFallback: false,
    });
  });

  it("devuelve la intersección cuando hay solapamiento", () => {
    const result = pickEffectiveStores(
      ["amazon", "aliexpress", "miravia", "elcorteingles"],
      ["amazon", "elcorteingles"],
    );
    expect(result).toEqual({
      stores: ["amazon", "elcorteingles"],
      isFallback: false,
    });
  });

  it("hace fallback a todas las favoritas si no hay intersección", () => {
    const result = pickEffectiveStores(
      ["aliexpress", "miravia"],
      ["amazon", "elcorteingles"],
    );
    expect(result).toEqual({
      stores: ["aliexpress", "miravia"],
      isFallback: true,
    });
  });

  it("filtra tiendas sugeridas inválidas antes de calcular la intersección", () => {
    const result = pickEffectiveStores(
      ["amazon", "miravia"],
      ["amazon", "etsy", "carrefour"],
    );
    expect(result).toEqual({
      stores: ["amazon"],
      isFallback: false,
    });
  });

  it("trata sugerencias con solo tiendas inválidas como ausencia de sugerencia", () => {
    const result = pickEffectiveStores(
      ["amazon", "miravia"],
      ["etsy", "carrefour"],
    );
    expect(result).toEqual({
      stores: ["amazon", "miravia"],
      isFallback: false,
    });
  });

  it("mantiene el orden canónico de favoritas en la intersección", () => {
    const result = pickEffectiveStores(
      ["elcorteingles", "amazon", "miravia"],
      ["miravia", "amazon"],
    );
    // Preserva el orden de favoriteStores tal como llega; la página llama a
    // sanitizeFavoriteStores antes para asegurar orden canónico de STORE_IDS.
    expect(result.stores).toEqual(["amazon", "miravia"]);
  });
});

describe("storeIdForUrl", () => {
  it("reconoce cada tienda por su dominio", () => {
    expect(storeIdForUrl("https://www.amazon.es/dp/B0X")).toBe("amazon");
    expect(storeIdForUrl("https://amzn.eu/d/abc")).toBe("amazon");
    expect(storeIdForUrl("https://es.aliexpress.com/item/1.html")).toBe("aliexpress");
    expect(storeIdForUrl("https://www.ikea.com/es/es/p/x")).toBe("ikea");
    expect(storeIdForUrl("https://www.elcorteingles.es/moda/x")).toBe("elcorteingles");
  });

  it("no se deja engañar por un dominio que solo contiene el de la tienda", () => {
    expect(storeIdForUrl("https://amazon.es.ofertas-timo.com/x")).toBeNull();
    expect(storeIdForUrl("https://miamazon.es/x")).toBeNull();
  });

  it("devuelve null para cualquier otra web o para lo que no es http(s)", () => {
    expect(storeIdForUrl("https://www.etsy.com/listing/1")).toBeNull();
    expect(storeIdForUrl("javascript:alert(1)")).toBeNull();
  });
});

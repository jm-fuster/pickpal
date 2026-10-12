import { describe, expect, it } from "vitest";
import { BOOKMARKLET_SOURCE, bookmarkletHref, parsePriceCents, readBookmarkletFragment } from "./bookmarklet";

// ─── Un DOM de mentira ──────────────────────────────────────────────────────
//
// No hay jsdom: el marcador solo usa `querySelector(All)` con selectores
// `etiqueta[atributo="valor"]` (separados por comas), `getAttribute`,
// `textContent` y `title`. Con eso basta para fingir una ficha de producto.

type FakeElement = {
  tag: string;
  attrs: Record<string, string>;
  textContent: string;
  getAttribute(name: string): string | null;
};

function el(tag: string, attrs: Record<string, string>, textContent = ""): FakeElement {
  return { tag, attrs, textContent, getAttribute: (name) => attrs[name] ?? null };
}

const ld = (data: unknown) =>
  el("script", { type: "application/ld+json" }, typeof data === "string" ? data : JSON.stringify(data));
const metaProperty = (property: string, content: string) => el("meta", { property, content });
const metaName = (name: string, content: string) => el("meta", { name, content });
const canonical = (href: string) => el("link", { rel: "canonical", href });

function fakeDocument(elements: FakeElement[], title = "") {
  const matcher = (selector: string) => {
    const parts = selector.split(",").map((part) => {
      const m = /^(\w+)\[([\w:-]+)="([^"]*)"\]$/.exec(part.trim());
      if (!m) throw new Error(`Selector que el DOM de mentira no entiende: ${part}`);
      return { tag: m[1], attr: m[2], value: m[3] };
    });
    return (e: FakeElement) => parts.some((p) => e.tag === p.tag && e.attrs[p.attr] === p.value);
  };
  return {
    title,
    querySelectorAll: (selector: string) => elements.filter(matcher(selector)),
    querySelector: (selector: string) => elements.find(matcher(selector)) ?? null,
  };
}

function fakeLocation(href: string) {
  return { href, hostname: new URL(href).hostname };
}

const ORIGIN = "https://pickpal.example.com";
const PAGE = "https://www.tienda-ejemplo.es/p/zapatillas-trail-monte-123456?utm_source=boletin";

type Bookmarklet = (d: unknown, l: unknown, o: string) => string;
const bookmarklet = new Function(`return ${BOOKMARKLET_SOURCE}`)() as Bookmarklet;

/** Lo que el marcador pone en el fragmento, como objeto. */
function run(elements: FakeElement[], options: { title?: string; href?: string } = {}) {
  const result = bookmarklet(fakeDocument(elements, options.title), fakeLocation(options.href ?? PAGE), ORIGIN);
  const prefix = `${ORIGIN}/mi-lista/apuntar#`;
  expect(result.startsWith(prefix)).toBe(true);
  return { result, params: Object.fromEntries(new URLSearchParams(result.slice(prefix.length))) };
}

const product = (extra: Record<string, unknown>) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: "  Zapatillas   trail Monte\n Ejemplo ",
  ...extra,
});

// ─── El marcador ────────────────────────────────────────────────────────────

describe("BOOKMARKLET_SOURCE", () => {
  it("cabe en un marcador: una línea, sin «%» y por debajo de 2,5 KB", () => {
    expect(BOOKMARKLET_SOURCE).not.toMatch(/[\n\r%]/);
    expect(BOOKMARKLET_SOURCE.length).toBeLessThan(2560);
    expect(BOOKMARKLET_SOURCE.startsWith("function (d, l, o) {")).toBe(true);
  });

  it("lee el Product del JSON-LD con sus offers como objeto", () => {
    const { params } = run([
      ld(product({ offers: { "@type": "Offer", price: "39.99", priceCurrency: "EUR" } })),
      metaProperty("og:title", "Otro título que no manda"),
    ]);
    expect(params).toEqual({ t: "Zapatillas trail Monte Ejemplo", u: PAGE, p: "39.99" });
  });

  it("acepta un precio numérico", () => {
    const { params } = run([ld(product({ offers: { price: 1299, priceCurrency: "eur" } }))]);
    expect(params.p).toBe("1299.00");
  });

  it("busca dentro de @graph y con @type en lista", () => {
    const { params } = run([
      ld({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebPage", name: "Página" },
          { "@type": ["Product", "Thing"], name: "Mochila Ejemplo 20 L", offers: { price: "54,90", priceCurrency: "EUR" } },
        ],
      }),
    ]);
    expect(params.t).toBe("Mochila Ejemplo 20 L");
    expect(params.p).toBe("54,90");
  });

  it("recorre un JSON-LD que es una lista y offers en lista", () => {
    const { params } = run([
      ld([
        { "@type": "BreadcrumbList" },
        product({
          offers: [
            { price: "12.00", priceCurrency: "USD" },
            { price: "10.50", priceCurrency: "EUR" },
          ],
        }),
      ]),
    ]);
    expect(params.p).toBe("10.50");
  });

  it("toma el lowPrice de un AggregateOffer", () => {
    const { params } = run([
      ld(product({ offers: { "@type": "AggregateOffer", lowPrice: 19.95, highPrice: 29.95, priceCurrency: "EUR" } })),
    ]);
    expect(params.p).toBe("19.95");
  });

  it("lee priceSpecification y las variantes de un ProductGroup", () => {
    const spec = run([
      ld(product({ offers: { priceSpecification: { price: "24.00", priceCurrency: "EUR" } } })),
    ]);
    expect(spec.params.p).toBe("24.00");

    const group = run([
      ld({
        "@type": "ProductGroup",
        name: "Camiseta Ejemplo",
        hasVariant: [{ "@type": "Product", offers: { price: "15.00", priceCurrency: "EUR" } }],
      }),
    ]);
    expect(group.params).toMatchObject({ t: "Camiseta Ejemplo", p: "15.00" });
  });

  it("no da precio si la moneda no es EUR", () => {
    const { params } = run([
      ld(product({ offers: { price: "39.99", priceCurrency: "USD" } })),
      metaProperty("product:price:amount", "39.99"),
      metaProperty("product:price:currency", "USD"),
    ]);
    expect(params.p).toBeUndefined();
    expect(params.t).toBe("Zapatillas trail Monte Ejemplo");
  });

  it("no da precio si la oferta no dice la moneda", () => {
    const { params } = run([ld(product({ offers: { price: "39.99" } }))], {
      href: "https://tienda-ejemplo.com/p/1",
    });
    expect(params.p).toBeUndefined();
  });

  it("ignora un JSON-LD roto y sigue con el siguiente", () => {
    const { params } = run([
      ld('{"@type": "Product", "name": "Roto",'),
      ld(product({ offers: { price: "8.50", priceCurrency: "EUR" } })),
    ]);
    expect(params).toMatchObject({ t: "Zapatillas trail Monte Ejemplo", p: "8.50" });
  });

  it("sin JSON-LD usa og:title y el precio de las metas en EUR", () => {
    const { params } = run(
      [
        metaProperty("og:title", "Lámpara de mesa Ejemplo"),
        metaProperty("product:price:amount", "45.00"),
        metaProperty("product:price:currency", "EUR"),
      ],
      { title: "Lámpara de mesa Ejemplo | Tienda Ejemplo" },
    );
    expect(params).toMatchObject({ t: "Lámpara de mesa Ejemplo", p: "45.00" });
  });

  it("el precio de las metas sin moneda solo vale en una tienda .es", () => {
    const amount = metaProperty("product:price:amount", "45.00");
    expect(run([amount]).params.p).toBe("45.00");
    expect(run([amount], { href: "https://tienda-ejemplo.com/p/1" }).params.p).toBeUndefined();
  });

  it("después prueba twitter:title y el título de la pestaña", () => {
    expect(run([metaName("twitter:title", "Taza Ejemplo")], { title: "Pestaña" }).params.t).toBe("Taza Ejemplo");
    expect(run([], { title: "  Taza\tEjemplo  " }).params.t).toBe("Taza Ejemplo");
    expect(run([]).params.t).toBeUndefined();
  });

  it("nunca saca el precio del texto de la página", () => {
    const { params } = run([el("span", { class: "price" }, "39,99 €")], { title: "Taza Ejemplo 39,99 €" });
    expect(params.p).toBeUndefined();
  });

  it("recorta el título a 300 caracteres", () => {
    const { params } = run([], { title: "a".repeat(500) });
    expect(params.t).toHaveLength(300);
  });

  it("prefiere el canónico a la dirección de la pestaña, y resuelve uno relativo", () => {
    expect(run([canonical("https://www.tienda-ejemplo.es/p/zapatillas-trail-monte")]).params.u).toBe(
      "https://www.tienda-ejemplo.es/p/zapatillas-trail-monte",
    );
    expect(run([canonical("/p/zapatillas-trail-monte")]).params.u).toBe(
      "https://www.tienda-ejemplo.es/p/zapatillas-trail-monte",
    );
  });

  it("sin canónico usa og:url", () => {
    expect(run([metaProperty("og:url", "https://www.tienda-ejemplo.es/p/1")]).params.u).toBe(
      "https://www.tienda-ejemplo.es/p/1",
    );
  });

  it("rechaza un canónico que no es http(s) y se queda con la pestaña", () => {
    expect(run([canonical("javascript:alert(1)")]).params.u).toBe(PAGE);
    expect(run([canonical("data:text/html,hola"), metaProperty("og:url", "ftp://x.example.com")]).params.u).toBe(
      PAGE,
    );
  });

  it("lo que sale lo lee readBookmarkletFragment", () => {
    const { result } = run([
      canonical("https://www.tienda-ejemplo.es/p/zapatillas-trail-monte?utm_source=boletin"),
      ld(product({ offers: { "@type": "Offer", price: "1.299,00", priceCurrency: "EUR" } })),
    ]);
    expect(readBookmarkletFragment(new URL(result).hash)).toEqual({
      title: "Zapatillas trail Monte Ejemplo",
      url: "https://www.tienda-ejemplo.es/p/zapatillas-trail-monte",
      priceCents: 129_900,
    });
  });
});

describe("bookmarkletHref", () => {
  it("es un javascript: con el origen dentro", () => {
    const href = bookmarkletHref("https://pickpal-git-rama.example.com/");
    expect(href.startsWith("javascript:")).toBe(true);
    expect(href).not.toMatch(/[\s"#<>]/);
    expect(decodeURIComponent(href)).toContain('"https://pickpal-git-rama.example.com"');
  });

  it("al ejecutarse lleva a /mi-lista/apuntar del origen que se le pasó", () => {
    const href = bookmarkletHref(ORIGIN);
    const location = fakeLocation(PAGE);
    const document = fakeDocument([ld(product({ offers: { price: "39.99", priceCurrency: "EUR" } }))]);
    new Function("document", "location", decodeURIComponent(href.slice("javascript:".length)))(document, location);
    expect(location.href.startsWith(`${ORIGIN}/mi-lista/apuntar#`)).toBe(true);
    expect(readBookmarkletFragment(new URL(location.href).hash)).toMatchObject({
      title: "Zapatillas trail Monte Ejemplo",
      priceCents: 3999,
    });
  });

  it("no acepta un origen que no sea http(s)", () => {
    expect(() => bookmarkletHref("javascript:alert(1)")).toThrow();
    expect(() => bookmarkletHref("no es una dirección")).toThrow();
  });
});

// ─── Lo que llega a /mi-lista/apuntar ───────────────────────────────────────

describe("parsePriceCents", () => {
  it.each([
    ["39.99", 3999],
    ["39,99", 3999],
    ["39,9", 3990],
    ["1.299,00", 129_900],
    ["1,299.00", 129_900],
    ["1.299", 129_900],
    ["1299", 129_900],
    ["0,01", 1],
    [" 45 € ", 4500],
    ["10000", 1_000_000],
  ])("«%s» son %i céntimos", (raw, cents) => {
    expect(parsePriceCents(raw)).toBe(cents);
  });

  it.each(["", "0", "0,00", "-5", "1e5", "10000,01", "99999999999", "39.999,9.9", "12,34,5", "1.2345", "gratis", "NaN", "Infinity"])(
    "rechaza «%s»",
    (raw) => {
      expect(parsePriceCents(raw)).toBeUndefined();
    },
  );
});

describe("readBookmarkletFragment", () => {
  it("lee título, enlace y precio, con o sin «#»", () => {
    const hash = "t=Taza+Ejemplo&u=https%3A%2F%2Ftienda-ejemplo.es%2Fp%2Ftaza&p=12%2C50";
    const expected = { title: "Taza Ejemplo", url: "https://tienda-ejemplo.es/p/taza", priceCents: 1250 };
    expect(readBookmarkletFragment(`#${hash}`)).toEqual(expected);
    expect(readBookmarkletFragment(hash)).toEqual(expected);
  });

  it("devuelve vacío si no hay nada", () => {
    expect(readBookmarkletFragment("")).toEqual({});
    expect(readBookmarkletFragment("#")).toEqual({});
    expect(readBookmarkletFragment("#otra=cosa")).toEqual({});
  });

  it("ignora los parámetros desconocidos", () => {
    expect(readBookmarkletFragment("#t=Taza&x=1&admin=true")).toEqual({ title: "Taza" });
  });

  it("rechaza un enlace que no es http(s)", () => {
    expect(readBookmarkletFragment(`#u=${encodeURIComponent("javascript:alert(document.cookie)")}`)).toEqual({});
    expect(readBookmarkletFragment(`#u=${encodeURIComponent("data:text/html,<script>")}`)).toEqual({});
    expect(readBookmarkletFragment("#u=tienda-ejemplo.es%2Fp%2F1")).toEqual({});
  });

  it("rechaza un enlace de más de 2048 caracteres", () => {
    const long = `https://tienda-ejemplo.es/p/${"a".repeat(2100)}`;
    expect(readBookmarkletFragment(`#u=${encodeURIComponent(long)}`)).toEqual({});
  });

  it("limpia el enlace con prepareListLink", () => {
    const url = "https://tienda-ejemplo.es/p/taza?utm_source=x&color=azul";
    expect(readBookmarkletFragment(`#u=${encodeURIComponent(url)}`).url).toBe(
      "https://tienda-ejemplo.es/p/taza?color=azul",
    );
  });

  it("rechaza precios enormes, negativos o raros", () => {
    for (const p of ["99999999", "-10", "abc", "1e3", "0", "%E2%82%AC"]) {
      expect(readBookmarkletFragment(`#t=Taza&p=${p}`)).toEqual({ title: "Taza" });
    }
  });

  it("limpia y recorta el título a 120 unidades sin partir un emoji", () => {
    const title = `  ${"a".repeat(118)}🎁🎁 sobra `;
    const out = readBookmarkletFragment(`#t=${encodeURIComponent(title)}`);
    expect(out.title).toBe(`${"a".repeat(118)}…`);
    expect(out.title!.length).toBeLessThanOrEqual(120);
    expect(readBookmarkletFragment(`#t=${encodeURIComponent(" Taza \n\t Ejemplo ")}`).title).toBe("Taza Ejemplo");
  });

  it("no se rompe con secuencias mal codificadas ni con un fragmento enorme", () => {
    const broken = readBookmarkletFragment("#t=Taza%E0%A4%A&u=%&p=%");
    expect(broken.title).toMatch(/^Taza/);
    expect(broken.url).toBeUndefined();
    expect(broken.priceCents).toBeUndefined();
    expect(readBookmarkletFragment(`#t=${"a".repeat(20_000)}`)).toEqual({});
  });
});

import { describe, expect, it } from "vitest";
import {
  AMAZON_ES_MIXED,
  FIXTURES,
  MARKDOWN,
  NOTES_WITH_BULLETS,
  SAME_LINE,
  TITLE_THEN_URL,
  TSV_WITH_HEADER_CRLF,
  URL_ONLY,
  WHATSAPP_ANDROID,
  WHATSAPP_IOS,
  WISHLIST_COM_MORE,
} from "./fixtures";
import {
  MAX_PASTE_CHARS,
  MAX_PASTE_LINES,
  clampTitle,
  normalizePastedText,
  parsePastedList,
  type PastedRow,
} from "./pastedList";

const titles = (text: string) => parsePastedList(text).rows.map((r) => r.title);

describe("normalizePastedText", () => {
  it("unifica los saltos de línea", () => {
    expect(normalizePastedText("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
  });

  it("quita marcas de dirección, anchos cero y BOM", () => {
    expect(normalizePastedText("﻿‎imagen​ omitida‏‪x‬⁦y⁩")).toBe(
      "imagen omitidaxy",
    );
  });

  it("cambia los espacios duros por espacios", () => {
    expect(normalizePastedText("9:02 a. m.")).toBe("9:02 a. m.");
  });

  it("pasa a NFC", () => {
    expect(normalizePastedText("café")).toBe("café");
  });

  it("conserva el U+200D que une un emoji y quita el suelto", () => {
    expect(normalizePastedText("👩‍👧 libro‍")).toBe("👩‍👧 libro");
    expect(normalizePastedText("🏳️‍🌈")).toBe("🏳️‍🌈");
  });
});

describe("clampTitle", () => {
  it("deja igual un título que cabe", () => {
    expect(clampTitle("a".repeat(120))).toEqual({ title: "a".repeat(120), truncated: false });
  });

  it("recorta a 119 y añade «…»", () => {
    expect(clampTitle("a".repeat(121))).toEqual({ title: `${"a".repeat(119)}…`, truncated: true });
  });
});

describe("parsePastedList: formatos", () => {
  it("una nota con viñetas, numeración y casillas", () => {
    expect(titles(NOTES_WITH_BULLETS)).toEqual([
      "Auriculares con cancelación de ruido",
      "Libro «El jardín de las mariposas de cristal»",
      "Taza de cerámica hecha a mano ☕",
      "Clases de cerámica",
      "Mochila de senderismo 30 L",
      "Juego de mesa cooperativo",
      "Funda para el móvil",
      "Vinilo de jazz",
      "Pijama de franela",
      "Velas aromáticas",
      "Gorro de lana",
    ]);
    const parsed = parsePastedList(NOTES_WITH_BULLETS);
    expect(parsed.kind).toBe("list");
    expect(parsed.fromWishlistCom).toBe(false);
    expect(parsed.rows.every((r) => r.url === undefined && r.hint === undefined && !r.truncated)).toBe(true);
  });

  it("la página de una tienda copiada entera es ruido, pero devuelve las filas", () => {
    const parsed = parsePastedList(AMAZON_ES_MIXED);
    expect(parsed.kind).toBe("noisy");
    expect(parsed.rows).toEqual([
      {
        title: "Auriculares inalámbricos Ficticia X2 con cancelación de ruido",
        truncated: false,
        droppedWishlistLink: false,
      },
      {
        title: "Lámpara de escritorio LED regulable",
        url: "https://www.amazon.es/dp/B0TEST0002",
        truncated: false,
        droppedWishlistLink: false,
      },
    ]);
  });

  it("WhatsApp de iOS: quita prefijos y avisos, y señala al otro autor", () => {
    const parsed = parsePastedList(WHATSAPP_IOS);
    expect(parsed.kind).toBe("list");
    expect(parsed.rows).toEqual([
      { title: "Para mi cumple me haría ilusión", author: "Lucía", truncated: false, droppedWishlistLink: false },
      { title: "Una bufanda de lana gris", author: "Lucía", truncated: false, droppedWishlistLink: false },
      {
        title: "El libro de recetas de Tomás Fuentes",
        url: "https://www.tiendaficticia.es/libros/recetas-de-temporada-9781234567897",
        author: "Lucía",
        truncated: false,
        droppedWishlistLink: false,
      },
      {
        title: "Yo te regalo algo de jardinería",
        author: "Álvaro",
        hint: "other-author",
        truncated: false,
        droppedWishlistLink: false,
      },
      { title: "Unas zapatillas de trail", author: "Lucía", truncated: false, droppedWishlistLink: false },
    ]);
  });

  it("WhatsApp de Android con «a. m.», viñetas en el mensaje y avisos sin autor", () => {
    const parsed = parsePastedList(WHATSAPP_ANDROID);
    expect(parsed.rows.map((r) => [r.title, r.author, r.hint])).toEqual([
      ["Cosas que me gustaría", "Irene", undefined],
      ["Cafetera de émbolo", "Irene", undefined],
      ["Plantas para el balcón 🌿", "Irene", undefined],
      ["Apuntado 👍", "Bruno", "other-author"],
      ["Entradas para el teatro", "Irene", undefined],
    ]);
  });

  it("WhatsApp con un solo autor no señala a nadie y entiende el año de cuatro cifras en iOS", () => {
    const chat = "[11/10/2026, 10:15:32 p. m.] Lucía: Taza azul\n[11/10/2026, 10:16:02 p. m.] Lucía: Gorro rojo";
    expect(parsePastedList(chat).rows).toEqual([
      { title: "Taza azul", author: "Lucía", truncated: false, droppedWishlistLink: false },
      { title: "Gorro rojo", author: "Lucía", truncated: false, droppedWishlistLink: false },
    ]);
  });

  it("título en una línea y enlace en la siguiente", () => {
    expect(parsePastedList(TITLE_THEN_URL).rows).toEqual([
      {
        title: "Kit de acuarelas para principiantes",
        url: "https://www.tiendaficticia.es/arte/kit-acuarelas-principiantes-24-colores-555123.html",
        truncated: false,
        droppedWishlistLink: false,
      },
      {
        title: "Cojín de lino natural",
        url: "https://www.casaficticia.com/cojin-lino-natural?color=arena",
        truncated: false,
        droppedWishlistLink: false,
      },
      {
        title: "Taladro inalámbrico",
        url: "https://www.amazon.es/dp/B0TEST0003",
        truncated: false,
        droppedWishlistLink: false,
      },
    ]);
  });

  it("título y enlace en la misma línea, en cualquier orden", () => {
    expect(parsePastedList(SAME_LINE).rows.map((r) => [r.title, r.url])).toEqual([
      ["Bicicleta estática plegable", "https://www.tiendaficticia.es/deporte/bicicleta-estatica-plegable"],
      ["Altavoz bluetooth resistente al agua", "https://www.amazon.de/dp/B0TEST0004"],
      ["Novela negra nórdica", "https://www.libreriaficticia.es/novela-negra-nordica"],
      ["Set de té matcha", "https://www.teficticio.com/set-matcha?ref=insta"],
    ]);
  });

  it("enlaces en Markdown", () => {
    expect(parsePastedList(MARKDOWN).rows.map((r) => [r.title, r.url])).toEqual([
      ["Mochila urbana impermeable", "https://www.tiendaficticia.es/mochila-urbana-impermeable"],
      ["Cámara instantánea", "https://www.amazon.es/dp/B0TEST0005"],
      ["Lámpara de sal", "https://www.decoficticia.com/lampara-sal"],
    ]);
  });

  it("enlaces sueltos: título sacado de la ruta o «Ponle nombre»", () => {
    expect(parsePastedList(URL_ONLY).rows).toEqual([
      {
        title: "Zapatillas Running Hombre Negro",
        url: "https://www.amazon.es/dp/B0TEST0006",
        truncated: false,
        droppedWishlistLink: false,
      },
      {
        title: "",
        url: "https://www.tiendaficticia.es/p/123456",
        hint: "needs-name",
        truncated: false,
        droppedWishlistLink: false,
      },
      {
        title: "",
        url: "https://amzn.to/3FakeLk",
        hint: "needs-name",
        truncated: false,
        droppedWishlistLink: false,
      },
      {
        title: "Zapatilla trail xt6",
        url: "https://www.tiendaficticia.es/zapatilla-trail-xt6-123456.html",
        truncated: false,
        droppedWishlistLink: false,
      },
    ]);
  });

  it("hoja de cálculo con cabecera y saltos de Windows", () => {
    const parsed = parsePastedList(TSV_WITH_HEADER_CRLF);
    expect(parsed.kind).toBe("list");
    expect(parsed.rows).toEqual([
      {
        title: "Robot aspirador",
        url: "https://www.amazon.es/dp/B0TEST0007",
        note: "El modelo pequeño",
        truncated: false,
        droppedWishlistLink: false,
      },
      { title: "Guantes de jardinería", note: "Talla M", truncated: false, droppedWishlistLink: false },
      {
        title: "Puzzle de 1000 piezas",
        url: "https://www.tiendaficticia.es/puzzle-1000-piezas-paisaje",
        truncated: false,
        droppedWishlistLink: false,
      },
    ]);
  });

  it("hoja de cálculo sin cabecera: precio fuera y la nota recortada a 500", () => {
    const sheet = `Lámpara de pie\t49,99 €\t${"n".repeat(600)}\nAlfombra redonda\t\tColor arena`;
    const rows = parsePastedList(sheet).rows;
    expect(rows.map((r) => r.title)).toEqual(["Lámpara de pie", "Alfombra redonda"]);
    expect(rows[0].note).toHaveLength(500);
    expect(rows[0].note!.endsWith("…")).toBe(true);
    expect(rows[1].note).toBe("Color arena");
  });

  it("el texto de «more…» de wishlist.com", () => {
    const parsed = parsePastedList(WISHLIST_COM_MORE);
    expect(parsed.kind).toBe("list");
    expect(parsed.fromWishlistCom).toBe(true);
    expect(parsed.rows).toEqual([
      { title: "Patinete eléctrico plegable", truncated: false, droppedWishlistLink: true },
      { title: "Set de pinceles de acuarela", truncated: false, droppedWishlistLink: true },
      { title: "Taza térmica de acero", truncated: false, droppedWishlistLink: true },
      {
        title: "Thank you message and instructions",
        hint: "looks-like-text",
        truncated: false,
        droppedWishlistLink: false,
      },
      { title: "¡Gracias por pasar por mi lista!", hint: "looks-like-text", truncated: false, droppedWishlistLink: false },
      {
        title: "Si me mandas algo, esta es mi dirección",
        hint: "looks-like-text",
        truncated: false,
        droppedWishlistLink: false,
      },
      { title: "Carla Ficticia", hint: "looks-like-text", truncated: false, droppedWishlistLink: false },
    ]);
    // Ni la dirección, ni el código postal, ni el correo llegan a ser filas.
    const all = JSON.stringify(parsed);
    expect(all).not.toContain("Calle Inventada");
    expect(all).not.toContain("28999");
    expect(all).not.toContain("example.com");
    expect(all).not.toContain("wishlist.com");
  });

  it("un enlace /extrd de wishlist.com se guarda como el de la tienda", () => {
    const wrapped = `https://www.wishlist.com/extrd?wlexurl=${encodeURIComponent("https://www.tiendaficticia.es/cojin-lino?utm_source=wl")}`;
    expect(parsePastedList(`Cojín de lino\n${wrapped}`)).toEqual({
      rows: [
        {
          title: "Cojín de lino",
          url: "https://www.tiendaficticia.es/cojin-lino",
          truncated: false,
          droppedWishlistLink: false,
        },
      ],
      kind: "list",
      fromWishlistCom: false,
    });
  });
});

describe("parsePastedList: casos especiales", () => {
  it("demasiado grande, por caracteres o por líneas", () => {
    expect(parsePastedList("a".repeat(MAX_PASTE_CHARS + 1))).toEqual({
      rows: [],
      kind: "too-large",
      fromWishlistCom: false,
    });
    const lines = (n: number) => Array.from({ length: n }, (_, i) => `Cosa número ${i}`).join("\n");
    expect(parsePastedList(lines(MAX_PASTE_LINES + 1)).kind).toBe("too-large");
    expect(parsePastedList(lines(MAX_PASTE_LINES)).kind).toBe("list");
  });

  it("el enlace de una lista entera no se abre", () => {
    expect(parsePastedList("  https://www.wishlist.com/l/AbC123 \n")).toEqual({
      rows: [],
      kind: "whole-list-link",
      fromWishlistCom: true,
    });
    expect(parsePastedList("www.wishlist.com/@carlaficticia").kind).toBe("whole-list-link");
    expect(parsePastedList("https://www.amazon.es/hz/wishlist/ls/2FAKE0LIST0?ref_=wl_share")).toEqual({
      rows: [],
      kind: "whole-list-link",
      fromWishlistCom: false,
    });
    expect(parsePastedList("https://www.amazon.es/registry/wedding/1FAKE").kind).toBe("whole-list-link");
  });

  it("un enlace suelto a un elemento de wishlist.com no deja nada que apuntar", () => {
    expect(parsePastedList("https://www.wishlist.com/w/x7Kq2")).toEqual({
      rows: [],
      kind: "empty",
      fromWishlistCom: true,
    });
  });

  it("una línea sin letras no es una fila, pero un número largo sí", () => {
    expect(titles("🎁🎁🎁\n—\n3\n1984")).toEqual(["1984"]);
  });

  it("vacío", () => {
    expect(parsePastedList("")).toEqual({ rows: [], kind: "empty", fromWishlistCom: false });
    expect(parsePastedList(" \n\n  ")).toEqual({ rows: [], kind: "empty", fromWishlistCom: false });
    expect(parsePastedList("ana@example.com\n+34 600 000 000\n11/10/2026")).toMatchObject({ rows: [], kind: "empty" });
  });

  it("no convierte en filas correos, teléfonos, fechas, precios, direcciones ni valoraciones", () => {
    const junk = [
      "ana.ficticia@example.com",
      "Tel.: +34 600 00 00 00",
      "11/10/2026",
      "3 de octubre de 2026",
      "October 11, 2026",
      "29,99 €",
      "$45.00",
      "£149.95",
      "EUR 12,50",
      "Calle Inventada 12, 3º B",
      "Avda. de la Paz 5",
      "C/ Mayor 7",
      "28999 Villaficticia (Madrid)",
      "4,5 de 5 estrellas",
      "(1.234)",
      "Añadir a la cesta",
      "Comprar ahora",
      "Ver producto",
      "Add to WishList",
      "Share",
      "Sort by: priority",
      "Envío gratis",
      "En stock",
    ];
    expect(titles(["Taza azul", ...junk, "Gorro rojo"].join("\n"))).toEqual(["Taza azul", "Gorro rojo"]);
  });

  it("no confunde un deseo con una dirección", () => {
    expect(titles("Paseo en globo para 2\nCalle 13 vinilo firmado\n20000 leguas de viaje submarino")).toEqual([
      "Paseo en globo para 2",
      "Calle 13 vinilo firmado",
      "20000 leguas de viaje submarino",
    ]);
  });

  it("una frase larga llega con aviso, pero llega", () => {
    const rows = parsePastedList(
      "Taza azul\nNo me compréis ropa porque este año ya tengo de todo y prefiero cosas para hacer en casa\nGracias por acordaros de mí este año otra vez.",
    ).rows;
    expect(rows.map((r) => r.hint)).toEqual([undefined, "looks-like-text", "looks-like-text"]);
  });

  it("una línea con el enlace de una lista de wishlist.com es una cabecera", () => {
    expect(parsePastedList("Lista de Marta https://wishlist.com/l/AbC123\nTaza azul")).toEqual({
      rows: [{ title: "Taza azul", truncated: false, droppedWishlistLink: false, hint: "looks-like-text" }],
      kind: "list",
      fromWishlistCom: true,
    });
  });

  it("un enlace con espacios alrededor de la puntuación o pegado a un paréntesis", () => {
    expect(parsePastedList("Libro de cocina:https://www.tiendaficticia.es/libro-cocina.").rows).toEqual([
      {
        title: "Libro de cocina",
        url: "https://www.tiendaficticia.es/libro-cocina",
        truncated: false,
        droppedWishlistLink: false,
      },
    ]);
  });

  it("nunca guarda un enlace que no sea http(s)", () => {
    const rows = parsePastedList("[Taza](javascript:alert(1))\nGorro javascript:alert(1)").rows;
    expect(rows.every((r) => r.url === undefined)).toBe(true);
  });
});

describe("parsePastedList: títulos largos", () => {
  const noBrokenSurrogates = (s: string) => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);
  const only = (text: string): PastedRow => parsePastedList(text).rows[0];

  it("119 puntos de código con emoji: cabe entero", () => {
    const title = `${"a".repeat(118)}🎁`;
    expect(only(title)).toMatchObject({ title, truncated: false });
  });

  it("120 puntos de código: cabe si son 120 unidades, que es lo que cuenta el servidor", () => {
    expect(only("b".repeat(120))).toMatchObject({ title: "b".repeat(120), truncated: false });
    // Con un emoji son 121 unidades: el servidor lo rechazaría, así que se recorta.
    const row = only(`${"a".repeat(119)}🎁`);
    expect(row).toMatchObject({ title: `${"a".repeat(119)}…`, truncated: true });
  });

  it("121 puntos de código: 119 y «…», sin partir el emoji", () => {
    const row = only(`${"a".repeat(118)}🎁${"c".repeat(2)}`);
    expect(row.truncated).toBe(true);
    expect(row.title).toBe(`${"a".repeat(118)}…`);
    expect(row.title.length).toBeLessThanOrEqual(120);
    expect(noBrokenSurrogates(row.title)).toBe(true);
  });

  it("con muchos emojis no deja medio par sustituto ni medio emoji compuesto", () => {
    const row = only("🎁regalo".repeat(20));
    expect(row.truncated).toBe(true);
    expect(row.title.length).toBeLessThanOrEqual(120);
    expect(noBrokenSurrogates(row.title)).toBe(true);
    const family = only(`${"x".repeat(115)}👩‍👩‍👧`);
    expect(family.title).toBe(`${"x".repeat(115)}…`);
  });
});

// ─── Test diferencial: el estado de reserva no cambia nada (decisión 7) ─────

const UNDO_LINK = "https://www.wishlist.com/wish/abc123?guest=1&undo_res=1&resid=99";

type Variant = { name: string; apply: (line: string) => string[] };

const inline = (token: string): Variant => ({ name: `«${token}» en la línea`, apply: (l) => [`${l} ${token}`] });
const ownLine = (token: string): Variant => ({ name: `«${token}» en su línea`, apply: (l) => [l, token] });

// Delante del texto, después del «Autor:» si es WhatsApp.
const WHATSAPP_PREFIX = /^(\[[^\]]+\]\s*[^:[\]]{1,40}:\s|\d{1,2}\/\d{1,2}\/\d{2,4},\s[^-]+-\s[^:]{1,40}:\s)/;
const leading = (token: string): Variant => ({
  name: `«${token}» delante`,
  apply: (l) => {
    const prefix = WHATSAPP_PREFIX.exec(l)?.[1];
    if (prefix) return [`${prefix}${token} ${l.slice(prefix.length)}`];
    return /^\d{1,2}\/\d{1,2}\/\d{2,4},/.test(l) ? [l] : [`${token} ${l}`];
  },
});

const VARIANTS: Variant[] = [
  inline("Received"),
  inline("- Reserved"),
  inline("(Reservado)"),
  inline("· Comprado"),
  inline("| Regalado"),
  inline("2 of 3 received"),
  inline("Reserved by WishList.com"),
  inline(UNDO_LINK),
  ownLine("Received"),
  ownLine("not received"),
  ownLine("Reservado"),
  ownLine("Recibido"),
  ownLine("Ya regalado"),
  ownLine("3 received"),
  ownLine("1 of 2 received"),
  ownLine("Reserved by WishList.com"),
  ownLine("Reserve & Buy"),
  ownLine("Reserve and Buy"),
  ownLine("Open Gift"),
  ownLine("Granted"),
  ownLine("Purchased"),
  ownLine("Bought"),
  ownLine(UNDO_LINK),
  leading("Reserved ·"),
  leading("Reservado -"),
];

const PICKS: Array<[string, (i: number) => boolean]> = [
  ["todas las líneas", () => true],
  ["las pares", (i) => i % 2 === 0],
  ["las impares", (i) => i % 2 === 1],
];

function inject(text: string, variant: Variant, pick: (i: number) => boolean): string {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  return text
    .split(/\r?\n/)
    .flatMap((line, i) => (line.trim().length > 0 && pick(i) ? variant.apply(line) : [line]))
    .join(eol);
}

describe("parsePastedList: el estado de reserva nunca cambia el resultado", () => {
  for (const [fixture, text] of Object.entries(FIXTURES)) {
    it(fixture, () => {
      const clean = parsePastedList(text);
      for (const variant of VARIANTS) {
        for (const [pickName, pick] of PICKS) {
          const injected = inject(text, variant, pick);
          expect(injected, `${variant.name}, ${pickName}`).not.toBe(text);
          expect(parsePastedList(injected), `${variant.name}, ${pickName}`).toEqual(clean);
        }
      }
    });
  }

  it("el enlace de una lista entera, con una línea de estado al lado", () => {
    expect(parsePastedList("Received\nhttps://www.wishlist.com/l/AbC123")).toEqual(
      parsePastedList("https://www.wishlist.com/l/AbC123"),
    );
  });

  it("ninguna palabra de estado llega a un título", () => {
    for (const text of Object.values(FIXTURES)) {
      for (const variant of VARIANTS) {
        const rows = parsePastedList(inject(text, variant, () => true)).rows;
        for (const row of rows) {
          expect(row.title).not.toMatch(/received|reserved|reservad|recibid|comprad|regalad|open gift|granted|purchased/i);
          expect(row.url ?? "").not.toMatch(/resid|undo_res|guest/);
        }
      }
    }
  });

  it("una fila que solo tenía estado desaparece sin dejar rastro", () => {
    expect(parsePastedList("Taza azul\nReserved\n- Recibido\n1. Comprado\n[x] 3 received")).toEqual(
      parsePastedList("Taza azul"),
    );
  });
});

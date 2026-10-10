/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// El avatar del ser querido se pinta dentro de `url('…')` en un atributo
// `style` del correo de avisos. Son dos contextos anidados —HTML fuera, CSS
// dentro— y `escapeHtml` solo cubre el de fuera: convierte `'` en `&#39;`, que
// el cliente de correo decodifica de vuelta a `'` antes de leer el CSS. Estos
// tests fijan que la URL se percent-encodea, que es lo que sí sobrevive.

import { describe, expect, it } from "vitest";
import type { Id } from "./_generated/dataModel";
import { encodeCssUrl, listLineHtml } from "./emails";

describe("encodeCssUrl", () => {
  it("deja intacta la URL que genera el picker", () => {
    const url =
      "https://api.dicebear.com/9.x/dylan/svg?seed=pickpal&skinColor[]=ffcd94&mood[]=happy";
    expect(encodeCssUrl(url)).toBe(url);
  });

  it("percent-encodea la comilla que cerraría el url()", () => {
    expect(encodeCssUrl("https://api.dicebear.com/a?b='")).toBe(
      "https://api.dicebear.com/a?b=%27",
    );
  });

  it("no deja escapar del url() aunque la URL traiga la carga entera", () => {
    const payload =
      "https://api.dicebear.com/9.x/dylan/svg?seed=x')}/**/;background-image:url('https://atacante.example/p.png";
    const encoded = encodeCssUrl(payload);
    expect(encoded).not.toContain("'");
    expect(encoded).not.toContain("(");
    expect(encoded).not.toContain(")");
  });

  it("también cubre comillas dobles, barra invertida y espacios", () => {
    expect(encodeCssUrl('a" b\\c')).toBe("a%22%20b%5Cc");
  });
});

// La línea de «Mi lista» en la tarjeta del evento (docs/encargo-lista.md,
// decisión 18): solo una cifra, nunca títulos, y nada si no hay qué contar.
describe("listLineHtml", () => {
  const base = { personId: "abc123" as Id<"people">, personName: "Laura" };

  it("no pinta nada sin lista o con todo marcado", () => {
    expect(listLineHtml(base)).toBe("");
    expect(listLineHtml({ ...base, listUnclaimed: 0 })).toBe("");
  });

  it("cuenta en singular y en plural", () => {
    expect(listLineHtml({ ...base, listUnclaimed: 1 })).toContain(
      "Laura tiene 1 cosa en su lista que nadie ha marcado todavía",
    );
    expect(listLineHtml({ ...base, listUnclaimed: 3 })).toContain(
      "Laura tiene 3 cosas en su lista que nadie ha marcado todavía",
    );
  });

  it("enlaza a la sección de la lista en la ficha", () => {
    expect(listLineHtml({ ...base, listUnclaimed: 2 })).toContain(
      'href="https://pickpal.jorgemolinafuster.com/seres-queridos/abc123#lista"',
    );
  });

  it("escapa el nombre de la persona", () => {
    expect(
      listLineHtml({ ...base, personName: "<b>Ana</b>", listUnclaimed: 2 }),
    ).toContain("&lt;b&gt;Ana&lt;/b&gt; tiene");
  });
});

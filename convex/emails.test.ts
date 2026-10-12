/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// El avatar del ser querido se pinta dentro de `url('…')` en un atributo
// `style` del correo de avisos. Son dos contextos anidados —HTML fuera, CSS
// dentro— y `escapeHtml` solo cubre el de fuera: convierte `'` en `&#39;`, que
// el cliente de correo decodifica de vuelta a `'` antes de leer el CSS. Estos
// tests fijan que la URL se percent-encodea, que es lo que sí sobrevive.

import { describe, expect, it } from "vitest";
import type { Id } from "./_generated/dataModel";
import { buildListInviteEmail, encodeCssUrl, listLineHtml } from "./emails";

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

// Las líneas de «Mi lista» en la tarjeta del evento (docs/encargo-lista.md,
// decisión 18): solo cifras, nunca títulos, y nada si no hay qué contar.
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

  // La segunda cifra: lo que tiene marcado quien recibe el correo.
  it("no pinta nada si las dos cifras son 0", () => {
    expect(listLineHtml({ ...base, listUnclaimed: 0, listMine: 0 })).toBe("");
  });

  it("cuenta lo marcado en singular y en plural", () => {
    expect(listLineHtml({ ...base, listMine: 1 })).toContain(
      "Tienes 1 cosa de su lista marcada para regalarle",
    );
    expect(listLineHtml({ ...base, listMine: 4 })).toContain(
      "Tienes 4 cosas de su lista marcadas para regalarle",
    );
  });

  it("solo lo marcado: una línea, con el mismo enlace y sin la de lo libre", () => {
    const html = listLineHtml({ ...base, listMine: 2 });
    expect(html).not.toContain("nadie ha marcado");
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain(
      'href="https://pickpal.jorgemolinafuster.com/seres-queridos/abc123#lista"',
    );
  });

  it("con las dos cifras salen dos líneas iguales de estilo, primero lo libre", () => {
    const html = listLineHtml({ ...base, listUnclaimed: 3, listMine: 1 });
    const enlaces = [...html.matchAll(/<a href="([^"]+)" style="([^"]+)">([^<]+)<\/a>/g)];
    expect(enlaces.map((m) => m[3])).toEqual([
      "Laura tiene 3 cosas en su lista que nadie ha marcado todavía",
      "Tienes 1 cosa de su lista marcada para regalarle",
    ]);
    expect(enlaces[0][1]).toBe(enlaces[1][1]);
    expect(enlaces[0][2]).toBe(enlaces[1][2]);
  });
});

// El aviso de una lista que alguien lleva para otra persona, como un hijo
// (docs/encargo-listas-ninos.md, decisión 7): no dice para quién es. El
// nombre de un niño no pasa por Resend.
describe("buildListInviteEmail de una lista a cargo", () => {
  it("dice «una lista en PickPal», sin para quién ni nada de la lista", () => {
    const { subject, html } = buildListInviteEmail({
      ownerName: "Marta",
      ownerEmail: "marta@example.com",
      managed: true,
    });
    expect(subject).toBe("Marta te ha compartido una lista en PickPal");
    expect(html).toContain("Marta te ha compartido una lista en PickPal");
    expect(html).not.toContain("su lista");
    // No promete lo que en estas listas no se cumple: quien la lleva ve lo cogido.
    expect(html).not.toContain("no verá lo que marcas");
    expect(html).toContain("marta@example.com");
  });

  it("sin `managed`, el aviso de siempre", () => {
    expect(buildListInviteEmail({ ownerName: "Marta" }).subject).toBe(
      "PickPal · Marta te ha compartido su lista",
    );
  });

  it("escapa el nombre y no deja saltos de línea en el asunto", () => {
    const { subject, html } = buildListInviteEmail({
      ownerName: "<b>Marta</b>\r\nBcc: x@y.z",
      managed: true,
    });
    expect(subject).not.toMatch(/[\r\n]/);
    expect(html).not.toContain("<b>Marta</b>");
  });
});

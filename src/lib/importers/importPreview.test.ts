import { describe, expect, it } from "vitest";
import {
  addPastedList,
  createPreview,
  dedupeKey,
  remaining,
  renameRow,
  selectedCount,
  selectedItems,
  summary,
  toggleGroup,
  toggleRow,
  type PreviewState,
} from "./importPreview";
import type { PastedList, PastedRow } from "./pastedList";

const row = (title: string, extra: Partial<PastedRow> = {}): PastedRow => ({
  title,
  truncated: false,
  droppedWishlistLink: false,
  ...extra,
});

const list = (...rows: PastedRow[]): PastedList => ({ rows, kind: "list", fromWishlistCom: false });

const view = (state: PreviewState) => state.rows.map((r) => [r.title, r.checked, r.notice]);

describe("dedupeKey", () => {
  it("ignora mayúsculas, tildes, puntuación y espacios", () => {
    expect(dedupeKey("  Cafetera de ÉMBOLO! ")).toBe("cafetera de embolo");
    expect(dedupeKey("cafetera-de-embolo")).toBe(dedupeKey("Cafetera de émbolo"));
    expect(dedupeKey("Pijama niño")).toBe("pijama nino");
    expect(dedupeKey("🎁")).toBe("");
  });
});

describe("createPreview", () => {
  it("marca en orden lo que no tiene aviso", () => {
    const state = createPreview([list(row("Taza azul"), row("Gorro rojo"))], [], 100);
    expect(view(state)).toEqual([
      ["Taza azul", true, undefined],
      ["Gorro rojo", true, undefined],
    ]);
    expect(state.groups).toBe(1);
    expect(state.rows.map((r) => [r.key, r.group])).toEqual([
      ["0:0", 0],
      ["0:1", 0],
    ]);
  });

  it("deja sin casilla lo que ya está en la lista, por título o por enlace", () => {
    const state = createPreview(
      [
        list(
          row("CAFETERA de émbolo"),
          row("Robot aspirador", { url: "https://www.amazon.es/dp/B0TEST0007" }),
          row("Lámpara"),
        ),
      ],
      [
        { title: "Cafetera de embolo" },
        { title: "Otra cosa", url: "https://www.amazon.es/Robot/dp/B0TEST0007/ref=sr_1_1?tag=x-21" },
      ],
      98,
    );
    expect(view(state)).toEqual([
      ["CAFETERA de émbolo", false, "duplicate"],
      ["Robot aspirador", false, "duplicate"],
      ["Lámpara", true, undefined],
    ]);
  });

  it("deja sin casilla lo repetido dentro de lo pegado, no la primera vez", () => {
    const state = createPreview(
      [
        list(row("Taza azul"), row("taza  azul."), row("Gorro", { url: "https://tienda.es/gorro?utm_source=x" })),
        list(row("Bufanda", { url: "https://www.tienda.es/gorro/" })),
      ],
      [],
      100,
    );
    expect(view(state)).toEqual([
      ["Taza azul", true, undefined],
      ["taza  azul.", false, "duplicate"],
      ["Gorro", true, undefined],
      ["Bufanda", false, "duplicate"],
    ]);
  });

  it("deja sin casilla lo que parece texto, lo de otra persona y lo que no tiene nombre", () => {
    const state = createPreview(
      [
        list(
          row("Gracias por pasar por mi lista", { hint: "looks-like-text" }),
          row("Yo te regalo algo", { hint: "other-author", author: "Álvaro" }),
          row("", { hint: "needs-name", url: "https://tienda.es/p/123" }),
          row("Taza azul"),
        ),
      ],
      [],
      100,
    );
    expect(view(state)).toEqual([
      ["Gracias por pasar por mi lista", false, "looks-like-text"],
      ["Yo te regalo algo", false, "other-author"],
      ["", false, "needs-name"],
      ["Taza azul", true, undefined],
    ]);
  });

  it("lo que no cabe llega sin casilla y con «no-room»", () => {
    const state = createPreview([list(row("Uno"), row("Dos", { hint: "looks-like-text" }), row("Tres"), row("Cuatro"))], [], 2);
    expect(view(state)).toEqual([
      ["Uno", true, undefined],
      ["Dos", false, "looks-like-text"],
      ["Tres", true, undefined],
      ["Cuatro", false, "no-room"],
    ]);
    expect(remaining(state)).toBe(0);
  });

  it("sin cupo no marca nada", () => {
    const state = createPreview([list(row("Uno"))], [], 0);
    expect(view(state)).toEqual([["Uno", false, "no-room"]]);
    expect(remaining(state)).toBe(0);
    expect(createPreview([list(row("Uno"))], [], -5).capacity).toBe(0);
  });

  it("acepta listas sin filas", () => {
    const state = createPreview([{ rows: [], kind: "empty", fromWishlistCom: false }], [], 10);
    expect(state).toMatchObject({ rows: [], groups: 1, capacity: 10 });
  });
});

describe("addPastedList", () => {
  it("añade un grupo debajo y respeta lo ya marcado y desmarcado", () => {
    let state = createPreview([list(row("Taza azul"), row("Gorro rojo"))], [], 3);
    state = toggleRow(state, "0:1");
    state = addPastedList(state, list(row("taza azul"), row("Bufanda"), row("Libro"), row("Vinilo")), []);
    expect(state.groups).toBe(2);
    expect(view(state)).toEqual([
      ["Taza azul", true, undefined],
      ["Gorro rojo", false, undefined],
      ["taza azul", false, "duplicate"],
      ["Bufanda", true, undefined],
      ["Libro", true, undefined],
      ["Vinilo", false, "no-room"],
    ]);
    expect(state.rows.slice(2).map((r) => [r.key, r.group])).toEqual([
      ["1:0", 1],
      ["1:1", 1],
      ["1:2", 1],
      ["1:3", 1],
    ]);
  });
});

describe("toggleRow", () => {
  it("desmarca siempre y marca mientras quede cupo", () => {
    let state = createPreview([list(row("Uno"), row("Dos"), row("Tres"))], [], 2);
    expect(view(state)).toEqual([
      ["Uno", true, undefined],
      ["Dos", true, undefined],
      ["Tres", false, "no-room"],
    ]);
    // Sin cupo: se niega y devuelve el mismo estado.
    expect(toggleRow(state, "0:2")).toBe(state);
    state = toggleRow(state, "0:0");
    expect(remaining(state)).toBe(1);
    state = toggleRow(state, "0:2");
    expect(view(state)).toEqual([
      ["Uno", false, undefined],
      ["Dos", true, undefined],
      ["Tres", true, undefined],
    ]);
    expect(remaining(state)).toBe(0);
  });

  it("no marca una fila sin nombre", () => {
    const state = createPreview([list(row("", { hint: "needs-name", url: "https://tienda.es/p/1" }))], [], 10);
    expect(toggleRow(state, "0:0")).toBe(state);
  });

  it("deja marcar a mano algo con aviso, como lo repetido", () => {
    const state = createPreview([list(row("Taza"))], [{ title: "taza" }], 10);
    const next = toggleRow(state, "0:0");
    expect(view(next)).toEqual([["Taza", true, "duplicate"]]);
  });

  it("no cambia nada con una clave que no existe", () => {
    const state = createPreview([list(row("Uno"))], [], 10);
    expect(toggleRow(state, "9:9")).toBe(state);
  });
});

describe("toggleGroup", () => {
  it("con algo marcado, desmarca el grupo entero", () => {
    let state = createPreview([list(row("Uno"), row("Dos")), list(row("Tres"))], [], 10);
    state = toggleGroup(state, 0);
    expect(view(state)).toEqual([
      ["Uno", false, undefined],
      ["Dos", false, undefined],
      ["Tres", true, undefined],
    ]);
  });

  it("sin nada marcado, marca en orden mientras quepa, sin las filas sin nombre ni las de aviso", () => {
    let state = createPreview(
      [
        list(
          row("Uno"),
          row("", { hint: "needs-name", url: "https://tienda.es/p/1" }),
          row("Calle Inventada 12", { hint: "looks-like-text" }),
          row("Dos"),
          row("Tres"),
        ),
      ],
      [],
      2,
    );
    state = toggleGroup(state, 0);
    expect(selectedCount(state)).toBe(0);
    state = toggleGroup(state, 0);
    expect(view(state)).toEqual([
      ["Uno", true, undefined],
      ["", false, "needs-name"],
      ["Calle Inventada 12", false, "looks-like-text"],
      ["Dos", true, undefined],
      ["Tres", false, "no-room"],
    ]);
  });

  it("si todo el grupo llegó con aviso, lo marca igual (es un gesto de la dueña)", () => {
    let state = createPreview([list(row("Gracias", { hint: "looks-like-text" }), row("Carla", { hint: "looks-like-text" }))], [], 10);
    expect(selectedCount(state)).toBe(0);
    state = toggleGroup(state, 0);
    expect(selectedCount(state)).toBe(2);
  });

  it("sin cupo no cambia nada", () => {
    const state = createPreview([list(row("Uno")), list(row("Dos"))], [], 1);
    expect(toggleGroup(state, 1)).toBe(state);
  });
});

describe("renameRow", () => {
  it("con nombre deja de pedirlo y se puede marcar", () => {
    let state = createPreview([list(row("", { hint: "needs-name", url: "https://tienda.es/p/1" }))], [], 10);
    state = renameRow(state, "0:0", "  Zapatillas   de trail ");
    expect(state.rows[0]).toMatchObject({ title: "Zapatillas de trail", checked: false });
    expect(state.rows[0].hint).toBeUndefined();
    expect(state.rows[0].notice).toBeUndefined();
    state = toggleRow(state, "0:0");
    expect(state.rows[0].checked).toBe(true);
  });

  it("sin nombre se desmarca y vuelve a pedirlo", () => {
    let state = createPreview([list(row("Taza"))], [], 10);
    state = renameRow(state, "0:0", "   ");
    expect(view(state)).toEqual([["", false, "needs-name"]]);
    expect(state.rows[0].hint).toBe("needs-name");
  });

  it("recorta como el analizador", () => {
    const state = renameRow(createPreview([list(row("Taza"))], [], 10), "0:0", "a".repeat(130));
    expect(state.rows[0]).toMatchObject({ title: `${"a".repeat(119)}…`, truncated: true });
  });

  it("recalcula los repetidos: con la lista y con las demás filas", () => {
    let state = createPreview([list(row("Taza azul"), row("Taza azul"), row("Gorro"))], [{ title: "Bufanda" }], 10);
    expect(view(state)).toEqual([
      ["Taza azul", true, undefined],
      ["Taza azul", false, "duplicate"],
      ["Gorro", true, undefined],
    ]);
    // La primera deja de ser «Taza azul»: la segunda ya no está repetida.
    state = renameRow(state, "0:0", "Taza verde");
    expect(view(state)).toEqual([
      ["Taza verde", true, undefined],
      ["Taza azul", false, undefined],
      ["Gorro", true, undefined],
    ]);
    // «Gorro» pasa a llamarse como algo de la lista: aviso, sin tocar su casilla.
    state = renameRow(state, "0:2", "bufanda");
    expect(view(state)).toEqual([
      ["Taza verde", true, undefined],
      ["Taza azul", false, undefined],
      ["bufanda", true, "duplicate"],
    ]);
  });
});

describe("selectedItems y summary", () => {
  it("devuelve lo marcado en el orden en que se pegó, sin claves vacías", () => {
    let state = createPreview(
      [
        list(row("Uno", { url: "https://tienda.es/uno", note: "talla M" }), row("Dos")),
        list(row("Tres", { url: "https://tienda.es/tres" }), row("Uno")),
      ],
      [],
      10,
    );
    state = toggleRow(state, "0:1");
    expect(selectedItems(state)).toEqual([
      { title: "Uno", url: "https://tienda.es/uno", note: "talla M" },
      { title: "Tres", url: "https://tienda.es/tres" },
    ]);
    expect(Object.keys(selectedItems(state)[1])).toEqual(["title", "url"]);
    expect(summary(state)).toEqual({ selected: 2, withoutLink: 0, duplicates: 1 });
  });

  it("cuenta lo marcado sin enlace", () => {
    const state = createPreview([list(row("Uno"), row("Dos", { url: "https://tienda.es/dos" }), row("Tres"))], [], 10);
    expect(summary(state)).toEqual({ selected: 3, withoutLink: 2, duplicates: 0 });
    expect(selectedCount(state)).toBe(3);
    expect(remaining(state)).toBe(7);
  });

  it("no toca el estado que recibe", () => {
    const state = createPreview([list(row("Uno"), row("Dos"))], [], 10);
    const snapshot = JSON.stringify(state);
    toggleRow(state, "0:0");
    toggleGroup(state, 0);
    renameRow(state, "0:1", "Otro");
    addPastedList(state, list(row("Tres")), []);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

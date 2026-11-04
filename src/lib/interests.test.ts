import { describe, expect, it } from "vitest";
import {
  INTEREST_CATALOG,
  MAX_INTERESTS,
  normalizeInterest,
  searchInterests,
  suggestInterests,
  mergeTagEdit,
  NO_TAG_EDITS,
} from "./interests";

describe("normalizeInterest", () => {
  it("pasa a minúsculas y quita acentos", () => {
    expect(normalizeInterest("Fútbol")).toBe("futbol");
    expect(normalizeInterest("  Música CLÁSICA ")).toBe("musica clasica");
    expect(normalizeInterest("Pádel")).toBe("padel");
  });

  it("deja igual lo que no lleva acentos", () => {
    expect(normalizeInterest("running")).toBe("running");
  });
});

describe("searchInterests", () => {
  it("encuentra por prefijo ignorando acentos", () => {
    const results = searchInterests("fut", []);
    expect(results[0]).toBe("Fútbol");
  });

  it("prioriza prefijo sobre subcadena", () => {
    const results = searchInterests("cine", []);
    expect(results[0]).toBe("Cine");
    expect(results).toContain("Cine clásico");
  });

  it("encuentra por inicio de palabra interior", () => {
    expect(searchInterests("guita", [])).toContain("Tocar la guitarra");
  });

  it("excluye los intereses ya añadidos aunque difieran en mayúsculas o acentos", () => {
    expect(searchInterests("fut", ["futbol"])).not.toContain("Fútbol");
  });

  it("devuelve vacío para query vacía o solo espacios", () => {
    expect(searchInterests("", [])).toEqual([]);
    expect(searchInterests("   ", [])).toEqual([]);
  });

  it("respeta el límite", () => {
    expect(searchInterests("a", [], 3)).toHaveLength(3);
  });
});

describe("suggestInterests", () => {
  it("sin gustos devuelve el set de arranque", () => {
    const suggestions = suggestInterests([]);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions).toContain("Lectura");
  });

  it("prioriza items de la categoría de los gustos actuales", () => {
    const suggestions = suggestInterests(["Senderismo"]);
    const aireLibre = INTEREST_CATALOG.find((c) => c.id === "aire-libre")!;
    // las primeras sugerencias salen de la misma categoría
    expect(aireLibre.items).toContain(suggestions[0]);
    expect(suggestions).not.toContain("Senderismo");
  });

  it("no sugiere algo que ya cubre un gusto más específico", () => {
    expect(suggestInterests(["Fútbol sala"])).not.toContain("Fútbol");
  });

  it("alterna entre categorías cuando hay varios gustos", () => {
    const suggestions = suggestInterests(["Senderismo", "Cocinar"]);
    const aireLibre = INTEREST_CATALOG.find((c) => c.id === "aire-libre")!;
    const cocina = INTEREST_CATALOG.find((c) => c.id === "cocina")!;
    const firstSix = suggestions.slice(0, 6);
    expect(firstSix.some((s) => aireLibre.items.includes(s))).toBe(true);
    expect(firstSix.some((s) => cocina.items.includes(s))).toBe(true);
  });

  it("no devuelve duplicados", () => {
    const suggestions = suggestInterests(["Senderismo", "Camping"]);
    expect(new Set(suggestions).size).toBe(suggestions.length);
  });

  it("ignora gustos libres que no están en el catálogo", () => {
    const suggestions = suggestInterests(["Coleccionar posavasos raros"]);
    expect(suggestions.length).toBeGreaterThan(0);
  });
});

describe("catálogo", () => {
  it("ningún item supera los 80 caracteres del validador del servidor", () => {
    for (const category of INTEREST_CATALOG) {
      for (const item of category.items) {
        expect(item.length).toBeLessThanOrEqual(80);
      }
    }
  });

  it("no hay items duplicados entre categorías (normalizados)", () => {
    const all = INTEREST_CATALOG.flatMap((c) => c.items).map(normalizeInterest);
    expect(new Set(all).size).toBe(all.length);
  });

  it("MAX_INTERESTS coincide con el límite del servidor", () => {
    expect(MAX_INTERESTS).toBe(20);
  });
});


describe("mergeTagEdit", () => {
  const tags = (...args: Parameters<typeof mergeTagEdit>) => mergeTagEdit(...args).tags;

  it("aplica lo añadido y lo quitado aquí sobre lo que otra persona guardó entretanto", () => {
    // Al abrir: cerámica y yoga. Bob añade jardinería. Aquí se quita yoga y se añade lectura.
    expect(
      tags(NO_TAG_EDITS, ["cerámica", "yoga"], ["cerámica", "lectura"], ["cerámica", "yoga", "jardinería"]),
    ).toEqual(["cerámica", "jardinería", "lectura"]);
  });

  it("no resucita lo que otra persona quitó", () => {
    // Bob quitó yoga; aquí aún se ve y se añade cine.
    expect(tags(NO_TAG_EDITS, ["cerámica", "yoga"], ["cerámica", "yoga", "cine"], ["cerámica"])).toEqual([
      "cerámica",
      "cine",
    ]);
  });

  it("dos cambios seguidos antes de que llegue el primero no se pisan", () => {
    const primero = mergeTagEdit(NO_TAG_EDITS, ["a"], ["a", "b"], ["a"]);
    expect(primero.tags).toEqual(["a", "b"]);
    // El servidor aún dice ["a"].
    const segundo = mergeTagEdit(primero.pending, primero.tags, [...primero.tags, "c"], ["a"]);
    expect(segundo.tags).toEqual(["a", "b", "c"]);
    // Cuando llega, deja de estar pendiente.
    const tercero = mergeTagEdit(segundo.pending, segundo.tags, ["b", "c"], ["a", "b", "c"]);
    expect(tercero).toEqual({ tags: ["b", "c"], pending: { added: [], removed: ["a"] } });
  });

  it("añadir y quitar la misma antes de que llegue la deja fuera", () => {
    const puesta = mergeTagEdit(NO_TAG_EDITS, ["a"], ["a", "b"], ["a"]);
    expect(mergeTagEdit(puesta.pending, puesta.tags, ["a"], ["a"]).tags).toEqual(["a"]);
  });
});

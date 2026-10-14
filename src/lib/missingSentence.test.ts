import { describe, expect, it } from "vitest";
import { missingSentence } from "./missingSentence";

const ropa = { text: "su talla de ropa", plural: false };
const alergias = { text: "sus alergias", plural: true };
const disgustos = { text: "lo que no le gusta", plural: false };

describe("missingSentence", () => {
  it("usa «Falta» con un solo dato en singular", () => {
    expect(missingSentence([ropa])).toBe("Falta su talla de ropa.");
  });

  it("usa «Faltan» con un solo dato en plural", () => {
    expect(missingSentence([alergias])).toBe("Faltan sus alergias.");
  });

  it("une dos con «y»", () => {
    expect(missingSentence([ropa, alergias])).toBe("Faltan su talla de ropa y sus alergias.");
  });

  it("une tres con comas y «y» al final", () => {
    expect(missingSentence([ropa, alergias, disgustos])).toBe(
      "Faltan su talla de ropa, sus alergias y lo que no le gusta.",
    );
  });

  it("sin nada que falte, no dice nada", () => {
    expect(missingSentence([])).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { suggestedPerson } from "./suggestedPerson";

const people = [
  { name: "Marta Ibáñez" },
  { name: "Julián Vega" },
  { name: "Nuria Estévez" },
];

describe("suggestedPerson", () => {
  it("sugiere la ficha con el mismo nombre, sin mirar tildes ni mayúsculas", () => {
    expect(suggestedPerson(people, "julian vega")).toEqual({ name: "Julián Vega" });
    expect(suggestedPerson(people, "  Nuria   Estévez ")).toEqual({ name: "Nuria Estévez" });
  });

  it("sugiere la ficha que se llama como su nombre de pila", () => {
    expect(suggestedPerson([{ name: "Julián" }, { name: "Marta" }], "Julián Vega")).toEqual({
      name: "Julián",
    });
  });

  it("no sugiere nada si hay dos candidatas", () => {
    expect(suggestedPerson([{ name: "Julián Vega" }, { name: "Julián Vega" }], "Julián Vega")).toBeNull();
    expect(suggestedPerson([{ name: "Julián" }, { name: "julian" }], "Julián Vega")).toBeNull();
  });

  it("no sugiere nada sin nombre o sin coincidencia", () => {
    expect(suggestedPerson(people, null)).toBeNull();
    expect(suggestedPerson(people, "   ")).toBeNull();
    expect(suggestedPerson(people, "Clara Ferrán")).toBeNull();
  });

  it("no confunde un nombre de pila con un apellido o una ficha más larga", () => {
    expect(suggestedPerson([{ name: "Julián Vega" }], "Julián")).toBeNull();
    expect(suggestedPerson([{ name: "Vega" }], "Julián Vega")).toBeNull();
  });
});

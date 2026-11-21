import { describe, expect, it } from "vitest";
import { buildPrompt } from "./giftPrompt";

const ana = {
  name: "Ana García López",
  relationship: "family",
  interests: ["Cerámica", "Senderismo"],
  favoriteBrands: ["Patagonia"],
  shoeSize: "38",
};

const prompt = (occasion: string, person: Parameters<typeof buildPrompt>[0] = ana) =>
  buildPrompt(person, 3000, 6000, occasion, "sorprendeme", [], []);

describe("buildPrompt", () => {
  it("pone la ocasión en su propio bloque, antes de la ficha, y no como un rasgo de la persona", () => {
    const p = prompt("Nacimiento de Leo");
    const occasion = p.indexOf("Ocasión: Nacimiento de Leo");
    const person = p.indexOf("Persona (su ficha):");
    expect(occasion).toBeGreaterThan(-1);
    expect(person).toBeGreaterThan(occasion);
    expect(p).not.toContain("- Ocasión:");
  });

  it("pide decidir para quién y para qué es el regalo antes que el resto de reglas", () => {
    const p = prompt("Boda");
    const rules = p.slice(p.indexOf("Reglas:"));
    expect(rules.indexOf("decide para quién y para qué es el regalo")).toBeLessThan(rules.indexOf("Mezcla cosas para comprar"));
    expect(p).toContain("Un nacimiento o la llegada de un bebé");
    expect(p).toContain("sus tallas y marcas solo valen para lo que sea para Ana");
  });

  it("limita las marcas favoritas a lo que es para la persona de la ficha", () => {
    expect(prompt("Casa nueva")).toContain("nunca en lo que sea para otra persona");
    expect(prompt("Casa nueva", { ...ana, favoriteBrands: [] })).not.toContain("Marcas favoritas:");
  });

  it("solo manda el nombre de pila", () => {
    const p = prompt("Cumpleaños");
    expect(p).toContain("- Nombre: Ana");
    expect(p).not.toContain("García");
  });
});

import { describe, expect, it } from "vitest";
import { giftRecommendationsSchema, giftRecommendationsSchemaMixed } from "./gifts";

describe("giftRecommendationsSchema", () => {
  const validIdea = {
    title: "Libro de cocina",
    description: "Recetas mediterráneas para iniciados",
    priceMinEuros: 15,
    priceMaxEuros: 25,
    category: ["Libros"],
    amazonQuery: "libro recetas mediterraneas",
    imageKey: "libros",
    imageQuery: "mediterranean cookbook",
  };

  const nineIdeas = Array.from({ length: 9 }, () => validIdea);

  it("acepta entre 6 y 9 ideas", () => {
    expect(
      giftRecommendationsSchema.safeParse({ ideas: nineIdeas }).success,
    ).toBe(true);
    expect(
      giftRecommendationsSchema.safeParse({ ideas: nineIdeas.slice(0, 6) })
        .success,
    ).toBe(true);
  });

  it("rechaza menos de 6 ideas", () => {
    expect(
      giftRecommendationsSchema.safeParse({ ideas: nineIdeas.slice(0, 5) })
        .success,
    ).toBe(false);
  });

  it("rechaza más de 9 ideas", () => {
    expect(
      giftRecommendationsSchema.safeParse({
        ideas: [...nineIdeas, validIdea],
      }).success,
    ).toBe(false);
  });

  it("rechaza idea con título vacío", () => {
    const broken = [...nineIdeas];
    broken[0] = { ...validIdea, title: "" };
    expect(
      giftRecommendationsSchema.safeParse({ ideas: broken }).success,
    ).toBe(false);
  });

  it("rechaza idea con precio negativo", () => {
    const broken = [...nineIdeas];
    broken[0] = { ...validIdea, priceMinEuros: -10 };
    expect(
      giftRecommendationsSchema.safeParse({ ideas: broken }).success,
    ).toBe(false);
  });

  it("rechaza descripción demasiado larga", () => {
    const broken = [...nineIdeas];
    broken[0] = { ...validIdea, description: "x".repeat(281) };
    expect(
      giftRecommendationsSchema.safeParse({ ideas: broken }).success,
    ).toBe(false);
  });

  it("rechaza idea sin imageKey", () => {
    const broken = [...nineIdeas];
    const withoutImageKey: Record<string, unknown> = { ...validIdea };
    delete withoutImageKey.imageKey;
    broken[0] = withoutImageKey as typeof validIdea;
    expect(
      giftRecommendationsSchema.safeParse({ ideas: broken }).success,
    ).toBe(false);
  });

  it("rechaza imageKey fuera del catálogo", () => {
    const broken = [...nineIdeas];
    broken[0] = { ...validIdea, imageKey: "fotos-de-stock" };
    expect(
      giftRecommendationsSchema.safeParse({ ideas: broken }).success,
    ).toBe(false);
  });

  it("rechaza idea sin imageQuery", () => {
    const broken = [...nineIdeas];
    const withoutImageQuery: Record<string, unknown> = { ...validIdea };
    delete withoutImageQuery.imageQuery;
    broken[0] = withoutImageQuery as typeof validIdea;
    expect(
      giftRecommendationsSchema.safeParse({ ideas: broken }).success,
    ).toBe(false);
  });

  it("rechaza imageQuery demasiado larga", () => {
    const broken = [...nineIdeas];
    broken[0] = { ...validIdea, imageQuery: "x".repeat(61) };
    expect(
      giftRecommendationsSchema.safeParse({ ideas: broken }).success,
    ).toBe(false);
  });
});

describe("giftRecommendationsSchemaMixed", () => {
  const idea = {
    title: "Taller de torno",
    description: "Una mañana con barro y alguien que enseña",
    priceMinEuros: 40,
    priceMaxEuros: 60,
    category: ["Cerámica"],
    amazonQuery: "taller de torno",
    imageKey: "taller-curso",
    imageQuery: "pottery workshop",
  };
  const six = (over: Record<string, unknown>) => Array.from({ length: 6 }, () => ({ ...idea, ...over }));

  it("pide el tipo de cada idea", () => {
    expect(giftRecommendationsSchemaMixed.safeParse({ ideas: six({}) }).success).toBe(false);
    expect(giftRecommendationsSchemaMixed.safeParse({ ideas: six({ giftType: "experiencia" }) }).success).toBe(true);
  });

  it("no acepta «sorprendeme» como tipo de una idea", () => {
    expect(giftRecommendationsSchemaMixed.safeParse({ ideas: six({ giftType: "sorprendeme" }) }).success).toBe(false);
  });
});

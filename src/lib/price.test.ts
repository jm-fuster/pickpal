import { describe, expect, it } from "vitest";
import { budgetTarget, fitsBudget, formatApproxPrice, parsePriceInput, priceInputValue } from "./price";

describe("parsePriceInput", () => {
  it("lee euros enteros y con decimales en los dos formatos", () => {
    expect(parsePriceInput("40")).toBe(4000);
    expect(parsePriceInput("39,99")).toBe(3999);
    expect(parsePriceInput("39.99")).toBe(3999);
    expect(parsePriceInput("39,9")).toBe(3990);
    expect(parsePriceInput(" 40 € ")).toBe(4000);
    expect(parsePriceInput("€40")).toBe(4000);
    expect(parsePriceInput("40 euros")).toBe(4000);
  });

  it("entiende los separadores de miles", () => {
    expect(parsePriceInput("1.299,50")).toBe(129950);
    expect(parsePriceInput("1,299.50")).toBe(129950);
    expect(parsePriceInput("1.299")).toBe(129900);
    expect(parsePriceInput("1299")).toBe(129900);
  });

  it("vacío es sin precio", () => {
    expect(parsePriceInput("")).toBeNull();
    expect(parsePriceInput("   ")).toBeNull();
    expect(parsePriceInput(undefined)).toBeNull();
  });

  it("rechaza lo que no es un importe o se sale de los topes", () => {
    for (const bad of ["abc", "-5", "0", "0,00", "12,345,67", "1.29.9", "10.000,01", "1e3", "40$"]) {
      expect(parsePriceInput(bad), bad).toBe("invalid");
    }
    expect(parsePriceInput("10.000")).toBe(1_000_000);
  });
});

describe("formatApproxPrice / priceInputValue", () => {
  it("enseña el precio como una pista", () => {
    expect(formatApproxPrice(4000)).toBe("unos 40 €");
    expect(formatApproxPrice(3999)).toBe("unos 39,99 €");
    expect(formatApproxPrice(129900)).toBe("unos 1.299 €");
  });

  it("devuelve al campo lo que se escribiría", () => {
    expect(priceInputValue(4000)).toBe("40");
    expect(priceInputValue(3999)).toBe("39,99");
    expect(priceInputValue(null)).toBe("");
    expect(parsePriceInput(priceInputValue(3990))).toBe(3990);
  });
});

describe("budgetTarget", () => {
  const from = new Date(2026, 9, 12); // 12-oct-2026
  const date = (label: string, month: number, day: number, extra: object = {}) => ({ label, month, day, ...extra });

  it("elige la próxima fecha con presupuesto", () => {
    const dates = [
      date("Navidad", 12, 25, { budgetMax: 5000 }),
      date("Cumpleaños", 11, 3, { budgetMin: 2000, budgetMax: 4000 }),
      date("Santo", 10, 20),
    ];
    expect(budgetTarget(dates, {}, from)).toEqual({
      label: "Cumpleaños",
      budget: { budgetMin: 2000, budgetMax: 4000 },
    });
  });

  it("salta las fechas únicas ya pasadas y cae al presupuesto de la ficha", () => {
    const dates = [date("Boda", 5, 1, { recurring: false, year: 2026, budgetMax: 9000 })];
    expect(budgetTarget(dates, { budgetMax: 3000 }, from)).toEqual({ label: null, budget: { budgetMax: 3000 } });
    expect(budgetTarget(dates, {}, from)).toBeNull();
  });
});

describe("fitsBudget", () => {
  it("sin presupuesto no juzga", () => {
    expect(fitsBudget(4000, {})).toBe(false);
  });

  it("compara con mínimo, máximo o los dos, en céntimos", () => {
    expect(fitsBudget(4000, { budgetMax: 5000 })).toBe(true);
    expect(fitsBudget(6000, { budgetMax: 5000 })).toBe(false);
    expect(fitsBudget(2000, { budgetMin: 3000 })).toBe(false);
    expect(fitsBudget(3000, { budgetMin: 3000, budgetMax: 5000 })).toBe(true);
  });
});

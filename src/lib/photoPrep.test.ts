import { describe, expect, it } from "vitest";
import { fitWithin } from "./photoPrep";

describe("fitWithin", () => {
  it("reduce por el lado largo sin deformar", () => {
    expect(fitWithin(4000, 3000, 1200)).toEqual({ width: 1200, height: 900 });
    expect(fitWithin(3000, 4000, 1200)).toEqual({ width: 900, height: 1200 });
  });

  it("no amplía una foto pequeña", () => {
    expect(fitWithin(800, 600, 1200)).toEqual({ width: 800, height: 600 });
  });

  it("aguanta medidas raras", () => {
    expect(fitWithin(0, 100, 1200)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(10000, 1, 1200)).toEqual({ width: 1200, height: 1 });
  });
});

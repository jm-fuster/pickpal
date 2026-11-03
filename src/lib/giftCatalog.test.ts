import { describe, expect, it } from "vitest";
import { ideaKindOf } from "./giftCatalog";

describe("ideaKindOf", () => {
  it("usa el tipo que trae la idea de una tanda mezclada", () => {
    expect(ideaKindOf({ giftType: "experiencia", suggestedStores: ["amazon"] }, "sorprendeme")).toBe(
      "experiencia",
    );
    expect(ideaKindOf({ giftType: "tiempo-juntos" }, "sorprendeme")).toBe("tiempo-juntos");
  });

  it("en una tanda antigua de un solo tipo, la idea es de ese tipo", () => {
    expect(ideaKindOf({}, "fisica")).toBe("fisica");
    expect(ideaKindOf({}, "tiempo-juntos")).toBe("tiempo-juntos");
  });

  it("en una «Sorpréndeme» antigua, lo que trae tiendas se compra y lo demás cuenta como experiencia", () => {
    expect(ideaKindOf({ suggestedStores: ["amazon"] }, "sorprendeme")).toBe("fisica");
    expect(ideaKindOf({ suggestedStores: [] }, "sorprendeme")).toBe("fisica");
    expect(ideaKindOf({}, "sorprendeme")).toBe("experiencia");
  });

  it("ignora un tipo desconocido y deduce como en las antiguas", () => {
    expect(ideaKindOf({ giftType: "sorprendeme" }, "fisica")).toBe("fisica");
  });
});

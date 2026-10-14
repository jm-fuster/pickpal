import { describe, expect, test } from "vitest";
import { formatBudget, nextOccasion, occasionWhen } from "./nextOccasion";

// 9 de septiembre de 2026, el «hoy» de las pantallas del Figma.
const HOY = new Date(2026, 8, 9);

describe("nextOccasion", () => {
  test("elige la fecha que viene antes", () => {
    const res = nextOccasion(
      [
        { label: "Cumpleaños", month: 6, day: 24 },
        { label: "Nuestro aniversario", month: 9, day: 10 },
      ],
      HOY,
    );
    expect(res?.event.label).toBe("Nuestro aniversario");
    expect(res?.days).toBe(1);
  });

  test("las únicas que ya pasaron no cuentan; si no queda ninguna, null", () => {
    const pasada = { label: "Graduación", month: 6, day: 1, year: 2026, recurring: false };
    expect(nextOccasion([pasada], HOY)).toBeNull();
    expect(nextOccasion([], HOY)).toBeNull();
  });

  test("empate: por nombre", () => {
    const res = nextOccasion(
      [
        { label: "Santo", month: 12, day: 24 },
        { label: "Nochebuena", month: 12, day: 24 },
      ],
      HOY,
    );
    expect(res?.event.label).toBe("Nochebuena");
  });
});

describe("occasionWhen", () => {
  test.each([
    [0, "Hoy"],
    [1, "Mañana"],
    [12, "En 12 días"],
    [31, "En 31 días"],
    [40, "Falta un mes"],
    [288, "Faltan 9 meses"],
  ])("%i días → %s", (days, text) => {
    expect(occasionWhen(days)).toBe(text);
  });
});

describe("formatBudget", () => {
  test("como la Agenda", () => {
    expect(formatBudget(4000, 8000)).toBe("40 – 80 €");
    expect(formatBudget(3000)).toBe("Desde 30 €");
    expect(formatBudget(undefined, 6000)).toBe("Hasta 60 €");
    expect(formatBudget()).toBeNull();
  });
});

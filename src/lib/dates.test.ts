import { describe, expect, it } from "vitest";
import {
  closestOccasionLabel,
  computeDaysUntil,
  computeDaysUntilNextOccurrence,
  formatDayMonth,
  formatDaysUntil,
  monthsWindowDays,
  nextOccurrenceDate,
} from "./dates";

describe("computeDaysUntilNextOccurrence", () => {
  it("devuelve 0 si la fecha es hoy", () => {
    const today = new Date(2026, 5, 15); // 15 jun 2026
    expect(computeDaysUntilNextOccurrence(6, 15, today)).toBe(0);
  });

  it("devuelve 1 si la fecha es mañana", () => {
    const today = new Date(2026, 5, 15);
    expect(computeDaysUntilNextOccurrence(6, 16, today)).toBe(1);
  });

  it("salta al año siguiente si la fecha ya pasó este año", () => {
    const today = new Date(2026, 5, 15); // 15 jun 2026
    // 1 ene del año siguiente = 200 días
    expect(computeDaysUntilNextOccurrence(1, 1, today)).toBe(200);
  });

  it("calcula bien atravesando fin de año", () => {
    const today = new Date(2026, 11, 30); // 30 dic 2026
    expect(computeDaysUntilNextOccurrence(1, 5, today)).toBe(6);
  });

  describe("29 de febrero", () => {
    it("en año bisiesto, calcula desde la fecha real", () => {
      const today = new Date(2028, 1, 1); // 1 feb 2028 (bisiesto)
      expect(computeDaysUntilNextOccurrence(2, 29, today)).toBe(28);
    });

    it("en año NO bisiesto, hace fallback al 28 de febrero", () => {
      const today = new Date(2026, 1, 1); // 1 feb 2026 (no bisiesto)
      // Sin fallback, computaría 28 días al "29 feb 2026" (que en JS es 1 mar).
      // Con fallback al 28 feb, son 27 días.
      expect(computeDaysUntilNextOccurrence(2, 29, today)).toBe(27);
    });

    it("en año NO bisiesto, si ya pasó el 28-feb, salta al 29-feb del siguiente bisiesto", () => {
      const today = new Date(2027, 2, 1); // 1 mar 2027 (no bisiesto, día después del fallback)
      // Próxima ocurrencia: 29 feb 2028.
      const result = computeDaysUntilNextOccurrence(2, 29, today);
      // 1 mar 2027 → 29 feb 2028 = 365 días (2028 es bisiesto pero contamos
      // desde marzo, así que un año estándar no bisiesto desde el punto de vista
      // del cómputo: 365 días).
      expect(result).toBe(365);
    });
  });

  it("trata correctamente años bisiestos para el 1 de marzo", () => {
    // No regresión: el fix del 29-feb no debe afectar al 1 de marzo.
    const today = new Date(2028, 1, 28); // 28 feb 2028 (bisiesto)
    expect(computeDaysUntilNextOccurrence(3, 1, today)).toBe(2); // 29 feb + 1 mar = 2 días
  });
});

describe("nextOccurrenceDate", () => {
  it("devuelve la fecha de este año si aún no pasó", () => {
    const today = new Date(2026, 5, 15); // 15 jun 2026
    const d = nextOccurrenceDate(7, 4, today);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 7, 4]);
  });

  it("salta al año siguiente si la fecha ya pasó", () => {
    const today = new Date(2026, 5, 15);
    const d = nextOccurrenceDate(1, 1, today);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2027, 1, 1]);
  });

  it("29-feb en año NO bisiesto cae en el 28 de febrero, no en el 1 de marzo", () => {
    // El bug original: la cabecera de la agenda usaba new Date(2026, 1, 29)
    // (= 1 mar) mientras la cuenta atrás apuntaba al 28-feb.
    const today = new Date(2026, 1, 1); // 1 feb 2026 (no bisiesto)
    const d = nextOccurrenceDate(2, 29, today);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 2, 28]);
  });

  it("coincide siempre con la fecha que cuenta computeDaysUntilNextOccurrence", () => {
    const today = new Date(2026, 1, 1);
    const days = computeDaysUntilNextOccurrence(2, 29, today);
    const d = nextOccurrenceDate(2, 29, today);
    const expected = new Date(2026, 1, 1 + days);
    expect(d.getTime()).toBe(expected.getTime());
  });
});

describe("computeDaysUntil — fechas únicas (recurring=false)", () => {
  it("devuelve los días hasta una fecha única futura", () => {
    const today = new Date(2026, 5, 15); // 15 jun 2026
    expect(
      computeDaysUntil({ month: 6, day: 20, year: 2026, recurring: false }, today),
    ).toBe(5);
  });

  it("devuelve null si la fecha única ya pasó", () => {
    const today = new Date(2026, 5, 15);
    expect(
      computeDaysUntil({ month: 6, day: 10, year: 2026, recurring: false }, today),
    ).toBeNull();
  });

  it("29-feb único en año NO bisiesto hace fallback al 28 de febrero", () => {
    // Antes del fix: new Date(2026, 1, 29) = 1 mar 2026 → 28 días.
    const today = new Date(2026, 1, 1); // 1 feb 2026 (no bisiesto)
    expect(
      computeDaysUntil({ month: 2, day: 29, year: 2026, recurring: false }, today),
    ).toBe(27);
  });

  it("29-feb único en año bisiesto usa la fecha real", () => {
    const today = new Date(2028, 1, 1); // 1 feb 2028 (bisiesto)
    expect(
      computeDaysUntil({ month: 2, day: 29, year: 2028, recurring: false }, today),
    ).toBe(28);
  });
});

describe("monthsWindowDays", () => {
  it("4 meses desde el 12 jun 2026 son 122 días (no 120)", () => {
    // Regresión: la agenda usaba un fijo de 120 días, así que un evento a
    // 121–122 días (dentro de los 4 meses reales) no aparecía.
    const today = new Date(2026, 5, 12); // 12 jun 2026
    expect(monthsWindowDays(4, today)).toBe(122);
  });

  it("incluye una fecha que cae justo a 4 meses vista", () => {
    const today = new Date(2026, 5, 12); // 12 jun 2026
    const windowDays = monthsWindowDays(4, today);
    // 12 oct 2026 = 4 meses exactos.
    const daysUntil = computeDaysUntilNextOccurrence(10, 12, today);
    expect(daysUntil).toBe(122);
    expect(daysUntil <= windowDays).toBe(true);
  });

  it("excluye una fecha justo después de la ventana", () => {
    const today = new Date(2026, 5, 12);
    const windowDays = monthsWindowDays(4, today);
    expect(computeDaysUntilNextOccurrence(10, 13, today) <= windowDays).toBe(false);
  });

  it("cruza el fin de año correctamente", () => {
    const today = new Date(2026, 10, 15); // 15 nov 2026 → +4 meses = 15 mar 2027
    expect(monthsWindowDays(4, today)).toBe(120);
  });
});

describe("formatDayMonth", () => {
  it("formatea día y mes en español en minúsculas", () => {
    expect(formatDayMonth(1, 1)).toBe("1 de enero");
    expect(formatDayMonth(12, 31)).toBe("31 de diciembre");
    expect(formatDayMonth(7, 4)).toBe("4 de julio");
  });
});

describe("formatDaysUntil", () => {
  it("'Hoy' para 0", () => {
    expect(formatDaysUntil(0)).toBe("Hoy");
  });

  it("'Mañana' para 1", () => {
    expect(formatDaysUntil(1)).toBe("Mañana");
  });

  it("'En N días' para >= 2", () => {
    expect(formatDaysUntil(2)).toBe("En 2 días");
    expect(formatDaysUntil(30)).toBe("En 30 días");
    expect(formatDaysUntil(365)).toBe("En 365 días");
  });
});

describe("closestOccasionLabel", () => {
  // 10 de octubre de 2026, a mediodía local.
  const hoy = new Date(2026, 9, 10, 12);

  it("prefiere la fecha de hace una semana a la de dentro de dos", () => {
    expect(
      closestOccasionLabel(
        [
          { label: "Aniversario", month: 10, day: 24 },
          { label: "Cumpleaños", month: 10, day: 3 },
          { label: "Navidad", month: 12, day: 25 },
        ],
        hoy,
      ),
    ).toBe("Cumpleaños");
  });

  it("mira el año pasado si la de este año aún no ha llegado", () => {
    // Reyes del 6 de enero queda a 277 días hacia atrás y a 88 hacia delante;
    // el Santo del 1 de noviembre, a 22. Gana el Santo.
    expect(
      closestOccasionLabel(
        [
          { label: "Reyes", month: 1, day: 6 },
          { label: "Santo", month: 11, day: 1 },
        ],
        hoy,
      ),
    ).toBe("Santo");
  });

  it("cuenta las fechas únicas por su año", () => {
    expect(
      closestOccasionLabel(
        [
          { label: "Boda", month: 10, day: 8, year: 2026, recurring: false },
          { label: "Cumpleaños", month: 10, day: 20 },
        ],
        hoy,
      ),
    ).toBe("Boda");
  });

  it("hoy gana a todo", () => {
    expect(
      closestOccasionLabel(
        [
          { label: "Cumpleaños", month: 10, day: 9 },
          { label: "Santo", month: 10, day: 10 },
        ],
        hoy,
      ),
    ).toBe("Santo");
  });

  it("sin fechas devuelve vacío", () => {
    expect(closestOccasionLabel([], hoy)).toBe("");
  });
});

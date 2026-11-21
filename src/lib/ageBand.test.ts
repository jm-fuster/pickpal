import { describe, expect, it } from "vitest";
import { AGE_BAND_FROM, ageBandForPrompt, ageOn, bandFor, ownBirthday } from "./ageBand";

const after = new Date(2026, 11, 20); // 20-dic-2026, ya en vigor
const leoBirthday = { label: "Cumpleaños", month: 3, day: 14, year: 2026, recurring: true };

describe("ownBirthday", () => {
  it("acepta «Cumpleaños», «Cumple» y «Cumpleaños de» su propio nombre, sin tildes ni mayúsculas", () => {
    expect(ownBirthday([{ ...leoBirthday, label: "cumpleanos" }], "Leo")).not.toBeNull();
    expect(ownBirthday([{ ...leoBirthday, label: "Cumple" }], "Leo")).not.toBeNull();
    expect(ownBirthday([{ ...leoBirthday, label: "Cumpleaños de Leo" }], "Leo")).not.toBeNull();
  });

  it("no toma el cumpleaños de otra persona apuntado en la ficha", () => {
    expect(ownBirthday([{ ...leoBirthday, label: "Cumpleaños de Leo" }], "Ana")).toBeNull();
  });

  it("ignora los que no tienen año y las fechas únicas", () => {
    expect(ownBirthday([{ ...leoBirthday, year: undefined }], "Leo")).toBeNull();
    expect(ownBirthday([{ ...leoBirthday, recurring: false }], "Leo")).toBeNull();
  });
});

describe("ageOn y bandFor", () => {
  it("cuenta los años cumplidos en la fecha", () => {
    expect(ageOn({ year: 2026, month: 3, day: 14 }, new Date(2027, 2, 13))).toBe(0);
    expect(ageOn({ year: 2026, month: 3, day: 14 }, new Date(2027, 2, 14))).toBe(1);
  });

  it("solo da franja a menores, y nunca la edad exacta", () => {
    expect(bandFor(0)).toBe("menos de 1 año");
    expect(bandFor(2)).toBe("de 1 a 2 años");
    expect(bandFor(5)).toBe("de 3 a 5 años");
    expect(bandFor(17)).toBe("de 13 a 17 años");
    expect(bandFor(18)).toBeNull();
    expect(bandFor(-1)).toBeNull();
  });
});

describe("ageBandForPrompt", () => {
  const christmas = { label: "Navidad", month: 12, day: 25, recurring: true };

  it(`no manda nada antes del ${AGE_BAND_FROM}`, () => {
    expect(
      ageBandForPrompt({ events: [leoBirthday], occasion: christmas, firstName: "Leo", now: new Date(Date.UTC(2026, 11, 7, 23)) }),
    ).toBeNull();
  });

  it("usa la edad que tendrá en la ocasión elegida", () => {
    // Navidad 2026: Leo tiene 9 meses. Su primer cumpleaños (14-mar-2027): 1 año.
    expect(ageBandForPrompt({ events: [leoBirthday], occasion: christmas, firstName: "Leo", now: after })).toBe("menos de 1 año");
    expect(ageBandForPrompt({ events: [leoBirthday], occasion: leoBirthday, firstName: "Leo", now: after })).toBe("de 1 a 2 años");
  });

  it("no manda nada a un adulto ni sin cumpleaños con año", () => {
    const ana = { label: "Cumpleaños", month: 6, day: 24, year: 1990, recurring: true };
    expect(ageBandForPrompt({ events: [ana], occasion: ana, firstName: "Ana", now: after })).toBeNull();
    expect(ageBandForPrompt({ events: [christmas], occasion: christmas, firstName: "Ana", now: after })).toBeNull();
  });
});

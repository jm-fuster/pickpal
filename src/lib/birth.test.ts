import { describe, expect, it } from "vitest";
import {
  babyNameFromLabel,
  isBirthEvent,
  isBirthLabel,
  showsInAgenda,
  showsInProfile,
} from "../../convex/birth";

const birth = { label: "Nacimiento de Leo", month: 9, day: 2, year: 2026, recurring: false };
const day = (m: number, d: number) => new Date(2026, m - 1, d);

describe("isBirthLabel", () => {
  it("reconoce las formas habituales, sin tildes ni mayúsculas", () => {
    for (const l of ["Nacimiento de Leo", "NACIMIENTO", "Llega el bebé", "bebe de Marta", "Parto de Ana", "Llegada de Leo"]) {
      expect(isBirthLabel(l)).toBe(true);
    }
  });

  it("no toma por nacimiento lo que no lo es", () => {
    for (const l of ["Cumpleaños", "Baby shower", "Boda", "Llegada a Madrid", "Bebedero"]) {
      expect(isBirthLabel(l)).toBe(false);
    }
  });
});

describe("isBirthEvent", () => {
  it("pide una fecha única con año", () => {
    expect(isBirthEvent(birth)).toBe(true);
    expect(isBirthEvent({ ...birth, recurring: true })).toBe(false);
    expect(isBirthEvent({ ...birth, recurring: undefined })).toBe(false);
    expect(isBirthEvent({ ...birth, year: undefined })).toBe(false);
  });
});

describe("babyNameFromLabel", () => {
  it("saca el nombre de «Nacimiento de» y «Llegada de»", () => {
    expect(babyNameFromLabel("Nacimiento de Leo")).toBe("Leo");
    expect(babyNameFromLabel("llegada de Leo y Mía")).toBe("Leo y Mía");
  });

  it("no inventa nombres", () => {
    expect(babyNameFromLabel("Nacimiento")).toBe("");
    expect(babyNameFromLabel("Parto de Ana")).toBe("");
    expect(babyNameFromLabel("Bebé de Marta")).toBe("");
    expect(babyNameFromLabel("Nacimiento de la niña")).toBe("");
  });
});

describe("dónde se ofrece", () => {
  it("la agenda: después del nacimiento, durante 60 días y solo sin responder", () => {
    expect(showsInAgenda(birth, day(9, 2))).toBe(false);
    expect(showsInAgenda(birth, day(9, 3))).toBe(true);
    expect(showsInAgenda(birth, day(11, 1))).toBe(true);
    expect(showsInAgenda(birth, day(11, 2))).toBe(false);
    expect(showsInAgenda({ ...birth, birthOffer: "hidden" }, day(9, 3))).toBe(false);
  });

  it("la ficha: después del nacimiento, también tras «Ahora no» en la agenda", () => {
    expect(showsInProfile(birth, day(9, 1))).toBe(false);
    expect(showsInProfile(birth, day(12, 25))).toBe(true);
    expect(showsInProfile({ ...birth, birthOffer: "hidden" }, day(9, 3))).toBe(true);
    expect(showsInProfile({ ...birth, birthOffer: "dismissed" }, day(9, 3))).toBe(false);
    expect(showsInProfile({ ...birth, birthOffer: "created" }, day(9, 3))).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { latestAddedAt, newSince, parseSeen, seenKey } from "./listSeen";

describe("listSeen", () => {
  it("la clave no lleva el id de usuario en claro y distingue cuentas y listas", () => {
    const key = seenKey("user_2abcDEF", "share1");
    expect(key).not.toContain("user_2abcDEF");
    expect(key).toMatch(/^pickpal:lista-vista:[0-9a-f]{8}:share1$/);
    expect(seenKey("user_otro", "share1")).not.toBe(key);
    expect(seenKey("user_2abcDEF", "share2")).not.toBe(key);
  });

  it("lee lo guardado con cuidado", () => {
    expect(parseSeen(null)).toBeNull();
    expect(parseSeen("abc")).toBeNull();
    expect(parseSeen("-3")).toBeNull();
    expect(parseSeen("1791753427993.4155")).toBe(1791753427993.4155);
  });

  it("en la primera visita nada es nuevo; después, lo posterior a lo visto", () => {
    const items = [
      { _id: "a", addedAt: 100 },
      { _id: "b", addedAt: 200 },
      { _id: "c", addedAt: 300 },
    ];
    expect(newSince(items, null).size).toBe(0);
    expect([...newSince(items, 200)]).toEqual(["c"]);
    expect(latestAddedAt(items)).toBe(300);
    expect(latestAddedAt([])).toBe(0);
  });
});

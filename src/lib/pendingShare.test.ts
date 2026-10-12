import { describe, expect, it } from "vitest";
import { clearPendingShare, peekPendingShare, stashPendingShare } from "./pendingShare";

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const HASH = "#t=Zapatillas%20de%20trail&u=https%3A%2F%2Fwww.amazon.es%2Fdp%2FB0X";

describe("pendingShare", () => {
  it("guarda un fragmento con título o enlace y lo devuelve", () => {
    const store = memoryStore();
    expect(stashPendingShare(HASH, store, 1000)).toBe(true);
    expect(peekPendingShare(store, 2000)).toBe(HASH);
  });

  it("no guarda fragmentos que no son del marcador (los internos de Clerk)", () => {
    const store = memoryStore();
    expect(stashPendingShare("#/factor-one", store)).toBe(false);
    expect(stashPendingShare("", store)).toBe(false);
    expect(stashPendingShare("#u=javascript%3Aalert(1)", store)).toBe(false);
    expect(peekPendingShare(store)).toBeNull();
  });

  it("caduca a los 30 minutos", () => {
    const store = memoryStore();
    stashPendingShare(HASH, store, 0);
    expect(peekPendingShare(store, 29 * 60 * 1000)).toBe(HASH);
    expect(peekPendingShare(store, 31 * 60 * 1000)).toBeNull();
  });

  it("ignora un valor guardado que no tiene la forma esperada", () => {
    const store = memoryStore();
    store.setItem("pickpal:apuntar-pendiente", "no es json");
    expect(peekPendingShare(store)).toBeNull();
    store.setItem("pickpal:apuntar-pendiente", JSON.stringify({ hash: 5, at: "x" }));
    expect(peekPendingShare(store)).toBeNull();
    store.setItem("pickpal:apuntar-pendiente", JSON.stringify({ hash: HASH, at: Date.now() + 1e9 }));
    expect(peekPendingShare(store)).toBeNull();
  });

  it("borrar lo deja vacío", () => {
    const store = memoryStore();
    stashPendingShare(HASH, store);
    clearPendingShare(store);
    expect(peekPendingShare(store)).toBeNull();
  });

  it("si el almacenamiento falla, no lanza", () => {
    const broken = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    };
    expect(stashPendingShare(HASH, broken)).toBe(false);
    expect(peekPendingShare(broken)).toBeNull();
    expect(() => clearPendingShare(broken)).not.toThrow();
  });
});

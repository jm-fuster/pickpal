import { describe, expect, it } from "vitest";
import { shareTargetFragment } from "./shareTarget";
import { readBookmarkletFragment } from "./bookmarklet";

const read = (fragment: string) => readBookmarkletFragment(fragment);

describe("shareTargetFragment", () => {
  it("usa título y enlace cuando llegan en su campo", () => {
    const f = shareTargetFragment({ title: "Zapatillas trail", url: "https://www.decathlon.es/p/123" });
    expect(read(f)).toEqual({ title: "Zapatillas trail", url: "https://www.decathlon.es/p/123" });
  });

  it("saca el enlace del texto, como hacen muchas apps de Android", () => {
    const f = shareTargetFragment({ text: "Vela de higo https://tienda.example.com/vela-higo" });
    expect(read(f)).toEqual({ title: "Vela de higo", url: "https://tienda.example.com/vela-higo" });
  });

  it("sin título y con solo el enlace, deja que la página sugiera el nombre", () => {
    const f = shareTargetFragment({ text: "https://tienda.example.com/vela-higo" });
    expect(read(f)).toEqual({ url: "https://tienda.example.com/vela-higo" });
  });

  it("no acepta enlaces que no sean http(s)", () => {
    const f = shareTargetFragment({ title: "Hola", url: "javascript:alert(1)" });
    expect(read(f)).toEqual({ title: "Hola" });
  });

  it("vacío si no llega nada", () => {
    expect(shareTargetFragment({})).toBe("");
  });

  it("recorta entradas enormes", () => {
    const f = shareTargetFragment({ title: "a".repeat(10_000) });
    expect(new URLSearchParams(f).get("t")?.length).toBe(300);
  });
});

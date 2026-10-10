import { describe, expect, it } from "vitest";
import { isHttpUrl, linkHostname, normalizeLinkInput } from "./links";

describe("normalizeLinkInput", () => {
  it("deja vacío lo que no tiene nada", () => {
    expect(normalizeLinkInput(undefined)).toBeUndefined();
    expect(normalizeLinkInput("   ")).toBeUndefined();
  });

  it("pone https:// a un enlace copiado sin protocolo", () => {
    expect(normalizeLinkInput(" amazon.es/dp/B0X ")).toBe("https://amazon.es/dp/B0X");
  });

  it("respeta el protocolo que ya trae, aunque no sea válido: lo rechaza isHttpUrl", () => {
    expect(normalizeLinkInput("http://tienda.es")).toBe("http://tienda.es");
    expect(normalizeLinkInput("javascript:alert(1)")).toBe("javascript:alert(1)");
  });
});

describe("isHttpUrl", () => {
  it("acepta http y https", () => {
    expect(isHttpUrl("https://www.ikea.com/es/es/p/x")).toBe(true);
    expect(isHttpUrl("http://tienda.es")).toBe(true);
  });

  it("rechaza todo lo demás", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,hola", "ftp://x.es", "amazon.es", ""]) {
      expect(isHttpUrl(url), url).toBe(false);
    }
  });

  it("rechaza enlaces de más de 2048 caracteres", () => {
    expect(isHttpUrl(`https://x.es/${"a".repeat(2048)}`)).toBe(false);
  });
});

describe("linkHostname", () => {
  it("quita www. y pasa a minúsculas", () => {
    expect(linkHostname("https://WWW.Zalando.ES/zapatillas")).toBe("zalando.es");
  });

  it("enseña en punycode un dominio que imita a otro", () => {
    // «аmazon.es» con la «а» cirílica.
    expect(linkHostname("https://аmazon.es/x")).toMatch(/^xn--/);
  });

  it("devuelve null si no es http(s)", () => {
    expect(linkHostname("javascript:alert(1)")).toBeNull();
  });
});

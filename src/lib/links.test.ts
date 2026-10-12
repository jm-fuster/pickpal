import { describe, expect, it } from "vitest";
import {
  canonicalizeLink,
  isHttpUrl,
  linkHostname,
  looksLikeUrl,
  normalizeLinkInput,
  prepareListLink,
  suggestTitleFromUrl,
  unwrapLink,
  wishlistComLinkKind,
} from "./links";

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

describe("unwrapLink", () => {
  it("saca el destino de /extrd de wishlist.com", () => {
    const wrapped =
      "https://www.wishlist.com/extrd?wlexurl=https%3A%2F%2Fwww.tiendaficticia.es%2Fmochila-urbana&veh=wl&pla=1";
    expect(unwrapLink(wrapped)).toBe("https://www.tiendaficticia.es/mochila-urbana");
  });

  it("vale con cualquier www de wishlist.com", () => {
    expect(unwrapLink("https://www3.wishlist.com/extrd/?wlexurl=https%3A%2F%2Ftienda.es%2Fx")).toBe(
      "https://tienda.es/x",
    );
  });

  it("saca el destino de rd.bizrate.com", () => {
    expect(
      unwrapLink("https://rd.bizrate.com/rd?t=1&url=https%3A%2F%2Fwww.tiendaficticia.es%2Fcojin&af_rid=9"),
    ).toBe("https://www.tiendaficticia.es/cojin");
  });

  it("desenvuelve un envoltorio dentro de otro", () => {
    const bizrate = `https://rd.bizrate.com/rd?url=${encodeURIComponent("https://www.tiendaficticia.es/lampara")}`;
    const wrapped = `https://www.wishlist.com/extrd?wlexurl=${encodeURIComponent(bizrate)}`;
    expect(unwrapLink(wrapped)).toBe("https://www.tiendaficticia.es/lampara");
  });

  it("entiende un destino codificado dos veces", () => {
    const twice = encodeURIComponent(encodeURIComponent("https://tienda.es/x"));
    expect(unwrapLink(`https://www.wishlist.com/extrd?wlexurl=${twice}`)).toBe("https://tienda.es/x");
  });

  it("nunca saca un javascript: de dentro de wlexurl", () => {
    const evil = `https://www.wishlist.com/extrd?wlexurl=${encodeURIComponent("javascript:alert(1)")}`;
    expect(unwrapLink(evil)).toBe(evil);
    expect(prepareListLink(evil).url).toBeUndefined();
    const nested = `https://rd.bizrate.com/rd?url=${encodeURIComponent("data:text/html,hola")}`;
    expect(unwrapLink(nested)).toBe(nested);
  });

  it("deja igual lo que no es un envoltorio", () => {
    for (const url of [
      "https://www.tiendaficticia.es/extrd?wlexurl=https%3A%2F%2Fotra.es",
      "https://www.wishlist.com/w/abc",
      "no es un enlace",
    ]) {
      expect(unwrapLink(url)).toBe(url);
    }
  });
});

describe("canonicalizeLink", () => {
  it("deja Amazon en /dp/{ASIN}", () => {
    expect(
      canonicalizeLink(
        "https://www.amazon.es/Zapatillas-Running-Hombre-Negro/dp/b0test0001/ref=sr_1_3?keywords=zapatillas&qid=1&sr=8-3&tag=afiliado-21#reviews",
      ),
    ).toBe("https://www.amazon.es/dp/B0TEST0001");
  });

  it("reconoce /gp/product/ y /gp/aw/d/", () => {
    expect(canonicalizeLink("https://www.amazon.de/gp/product/B0TEST0002/?psc=1")).toBe(
      "https://www.amazon.de/dp/B0TEST0002",
    );
    expect(canonicalizeLink("http://amazon.es/gp/aw/d/B0TEST0003")).toBe("https://amazon.es/dp/B0TEST0003");
  });

  it("sin ASIN, quita en Amazon el afiliado, el ref y el fragmento", () => {
    expect(
      canonicalizeLink("https://www.amazon.es/s?k=lampara&tag=afiliado-21&ref=nb_sb_noss&pd_rd_w=x&linkCode=ll2#top"),
    ).toBe("https://www.amazon.es/s?k=lampara");
  });

  it("conserva tag y ref fuera de Amazon", () => {
    expect(canonicalizeLink("https://www.tiendaficticia.es/tazas?tag=ceramica&ref=home")).toBe(
      "https://www.tiendaficticia.es/tazas?tag=ceramica&ref=home",
    );
  });

  it("quita utm_*, gclid, fbclid, msclkid y los de Mailchimp en cualquier tienda", () => {
    expect(
      canonicalizeLink(
        "https://www.tiendaficticia.es/x?color=azul&utm_source=nl&UTM_Medium=email&gclid=1&fbclid=2&msclkid=3&mc_cid=4&mc_eid=5",
      ),
    ).toBe("https://www.tiendaficticia.es/x?color=azul");
    expect(canonicalizeLink("https://www.amazon.es/s?k=taza&utm_source=nl")).toBe("https://www.amazon.es/s?k=taza");
  });

  it("no quita las claves de los redirectores en una tienda normal", () => {
    expect(canonicalizeLink("https://www.tiendaficticia.es/x?veh=1&pla=2&utm_source=y")).toBe(
      "https://www.tiendaficticia.es/x?veh=1&pla=2",
    );
  });

  it("conserva el fragmento fuera de Amazon y la codificación de lo que queda", () => {
    expect(canonicalizeLink("https://tienda.es/x?q=a%2Cb&utm_source=y#talla")).toBe(
      "https://tienda.es/x?q=a%2Cb#talla",
    );
  });

  it("no toca la cadena si no hay nada que quitar", () => {
    expect(canonicalizeLink("https://Tienda.es")).toBe("https://Tienda.es");
    expect(canonicalizeLink("https://amzn.to/3FakeLk?tag=x")).toBe("https://amzn.to/3FakeLk?tag=x");
    expect(canonicalizeLink("javascript:alert(1)")).toBe("javascript:alert(1)");
  });
});

describe("suggestTitleFromUrl", () => {
  it("toma el nombre de Amazon antes de /dp/", () => {
    expect(suggestTitleFromUrl("https://www.amazon.es/Zapatillas-Running-Hombre-Negro/dp/B0TEST0001")).toBe(
      "Zapatillas Running Hombre Negro",
    );
    expect(suggestTitleFromUrl("https://www.amazon.es/dp/B0TEST0001")).toBeUndefined();
  });

  it("toma el último tramo con palabras, sin extensión ni identificador", () => {
    expect(suggestTitleFromUrl("https://www.tiendaficticia.es/zapatillas/zapatilla-trail-xt6-123456.html")).toBe(
      "Zapatilla trail xt6",
    );
    expect(suggestTitleFromUrl("https://www.tiendaficticia.es/es/es/p/estanteria-cubos-blanca-80275887/")).toBe(
      "Estanteria cubos blanca",
    );
  });

  it("decodifica los %XX", () => {
    expect(suggestTitleFromUrl("https://tienda.es/pijama-ni%C3%B1o-franela")).toBe("Pijama niño franela");
  });

  it("no inventa título con identificadores o una sola palabra", () => {
    for (const url of [
      "https://www.tiendaficticia.es/p/123456",
      "https://www.tiendaficticia.es/product/ABC12345",
      "https://www.tiendaficticia.es/item/p",
      "https://www.tiendaficticia.es/zapatillas",
      "https://www.tiendaficticia.es/",
      "https://amzn.to/3FakeLk",
    ]) {
      expect(suggestTitleFromUrl(url), url).toBeUndefined();
    }
  });

  it("no pasa de 119 caracteres", () => {
    const slug = Array.from({ length: 40 }, (_, i) => `palabra${String.fromCharCode(97 + (i % 26))}`).join("-");
    const title = suggestTitleFromUrl(`https://tienda.es/${slug}`);
    expect(title).toBeDefined();
    expect(title!.length).toBeLessThanOrEqual(119);
  });
});

describe("wishlistComLinkKind", () => {
  it("reconoce los elementos", () => {
    for (const path of ["/w/x7Kq2", "/ws/abc", "/wish/123/patinete", "/shop/product/99", "/extrd?wlexurl=x"]) {
      expect(wishlistComLinkKind(`https://www.wishlist.com${path}`), path).toBe("item");
    }
  });

  it("todo lo demás de wishlist.com es una lista o un perfil", () => {
    for (const path of [
      "/l/AbC123",
      "/ls/AbC123",
      "/wishlist/123",
      "/wishlists/456",
      "/user/789",
      "/@carlaficticia",
      "/carlaficticia",
      "/",
    ]) {
      expect(wishlistComLinkKind(`https://wishlist.com${path}`), path).toBe("list");
    }
  });

  it("vale sin protocolo y con www2", () => {
    expect(wishlistComLinkKind("www2.wishlist.com/w/abc")).toBe("item");
  });

  it("devuelve null fuera de wishlist.com", () => {
    expect(wishlistComLinkKind("https://www.wishlist.com.otra-cosa.es/w/abc")).toBeNull();
    expect(wishlistComLinkKind("https://mywishlist.com/w/abc")).toBeNull();
    expect(wishlistComLinkKind("javascript:alert(1)")).toBeNull();
  });
});

describe("prepareListLink", () => {
  it("limpia y avisa de que el enlace se ha acortado", () => {
    expect(
      prepareListLink(" https://www.amazon.es/Zapatillas-Running-Hombre-Negro/dp/B0TEST0001/ref=sr_1_1?tag=x-21 "),
    ).toEqual({
      url: "https://www.amazon.es/dp/B0TEST0001",
      suggestedTitle: "Zapatillas Running Hombre Negro",
      shortened: true,
      foreignAmazon: false,
    });
  });

  it("no habla de acortar si no se ha quitado nada", () => {
    expect(prepareListLink("tiendaficticia.es/taza-ceramica-azul")).toEqual({
      url: "https://tiendaficticia.es/taza-ceramica-azul",
      suggestedTitle: "Taza ceramica azul",
      shortened: false,
      foreignAmazon: false,
    });
  });

  it("cuenta como acortado el enlace desenvuelto", () => {
    const wrapped = `https://www.wishlist.com/extrd?wlexurl=${encodeURIComponent("https://www.tiendaficticia.es/cojin-lino")}`;
    expect(prepareListLink(wrapped)).toMatchObject({ url: "https://www.tiendaficticia.es/cojin-lino", shortened: true });
  });

  it("no guarda enlaces de wishlist.com", () => {
    expect(prepareListLink("https://www.wishlist.com/w/x7Kq2")).toEqual({
      wishlistCom: "item",
      shortened: false,
      foreignAmazon: false,
    });
    expect(prepareListLink("https://www.wishlist.com/l/AbC123")).toMatchObject({ wishlistCom: "list" });
    expect(prepareListLink("https://www.wishlist.com/l/AbC123").url).toBeUndefined();
  });

  it("señala Amazon de otro país, pero no los enlaces cortos", () => {
    expect(prepareListLink("https://www.amazon.de/dp/B0TEST0004").foreignAmazon).toBe(true);
    expect(prepareListLink("https://www.amazon.co.uk/dp/B0TEST0004").foreignAmazon).toBe(true);
    expect(prepareListLink("https://smile.amazon.com/dp/B0TEST0004").foreignAmazon).toBe(true);
    expect(prepareListLink("https://www.amazon.es/dp/B0TEST0004").foreignAmazon).toBe(false);
    expect(prepareListLink("https://amzn.to/3FakeLk").foreignAmazon).toBe(false);
    expect(prepareListLink("https://amzn.eu/d/fake").foreignAmazon).toBe(false);
  });

  it("deja sin enlace lo que no es http(s)", () => {
    for (const raw of ["javascript:alert(1)", "data:text/html,hola", "ftp://x.es/a", "", "   "]) {
      expect(prepareListLink(raw).url, raw).toBeUndefined();
    }
  });
});

describe("looksLikeUrl", () => {
  it("reconoce enlaces con y sin protocolo", () => {
    for (const text of [
      "https://www.tiendaficticia.es/x",
      "http://tienda.xyz",
      " www.casaficticia.com/cojin ",
      "amazon.es/dp/B0TEST0001",
      "tiendaficticia.es",
      "amzn.to/3FakeLk",
      "www.wishlist.com/@carlaficticia",
    ]) {
      expect(looksLikeUrl(text), text).toBe(true);
    }
  });

  it("no confunde palabras con puntos con enlaces", () => {
    for (const text of [
      "Auriculares inalámbricos",
      "Node.js",
      "Dr.House/T1",
      "Sr.García",
      "e.g.",
      "3.5",
      "v1.2",
      "ana@example.com",
      "javascript:alert(1)",
      "mailto:ana@example.com",
      "tienda.es con espacio",
      "",
    ]) {
      expect(looksLikeUrl(text), text).toBe(false);
    }
  });
});

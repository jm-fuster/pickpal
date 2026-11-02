import { describe, expect, it } from "vitest";
import { GIFT_IMAGE_KEYS } from "./giftCatalog";
import { listItemImageKey } from "./listItemImage";

describe("listItemImageKey", () => {
  it("reconoce lo que hay en las listas de ejemplo", () => {
    expect(listItemImageKey("Regadera de cobre pequeña")).toBe("plantas");
    expect(listItemImageKey("Báscula para café con temporizador")).toBe("cafe-te");
    expect(listItemImageKey("Delantal de lona para el taller")).toBe("cocina");
    expect(listItemImageKey("Vela de cera de higo")).toBe("belleza");
    expect(listItemImageKey("Mochila de lona encerada")).toBe("aire-libre");
    expect(listItemImageKey("Auriculares de diadema")).toBe("audio");
    expect(listItemImageKey("Taza esmaltada azul")).toBe("cafe-te");
    expect(listItemImageKey("Lámpara de mesa de barro")).toBe("hogar-decoracion");
    expect(listItemImageKey("Un buen cuchillo de cocina")).toBe("cocina");
  });

  it("el tipo de regalo gana al tema del título", () => {
    expect(listItemImageKey("Clase de cerámica para dos")).toBe("taller-curso");
    expect(listItemImageKey("Libro de cerámica japonesa")).toBe("libros");
    expect(listItemImageKey("Libro de recetas de cocina japonesa")).toBe("libros");
    expect(listItemImageKey("Entradas para un concierto en el Price")).toBe("experiencia-cultural");
  });

  it("acepta plurales, mayúsculas y tildes", () => {
    expect(listItemImageKey("BASTONES plegables de senderismo")).toBe("aire-libre");
    expect(listItemImageKey("Set de cuadernos y lápices Muji")).toBe("papeleria");
    expect(listItemImageKey("Tienda de campaña para dos")).toBe("aire-libre");
  });

  it("no confunde palabras que solo se parecen", () => {
    // «te» suelto es el pronombre, no el té.
    expect(listItemImageKey("Algo que te guste")).toBe("regalo-generico");
    // «mesa» en «lámpara de mesa» no es un juego de mesa.
    expect(listItemImageKey("Lámpara de mesa")).toBe("hogar-decoracion");
    // «taller» suelto no es un curso.
    expect(listItemImageKey("Banco para el taller")).toBe("regalo-generico");
  });

  it("sin pistas, el regalo genérico; siempre una clave del catálogo", () => {
    expect(listItemImageKey("Sorpréndeme")).toBe("regalo-generico");
    expect(listItemImageKey("")).toBe("regalo-generico");
    expect(GIFT_IMAGE_KEYS).toContain(listItemImageKey("Cualquier cosa"));
  });
});

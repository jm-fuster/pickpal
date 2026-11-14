import { describe, expect, it } from "vitest";
import { GIFT_IMAGE_KEYS } from "./giftCatalog";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { listItemImageKey, listItemPhoto } from "./listItemImage";

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

  it("reconoce lo de una lista a cargo de un niño", () => {
    expect(listItemImageKey("Caja de LEGO City: la de los bomberos")).toBe("juegos-mesa");
    expect(listItemImageKey("Dinosaurio de peluche grande")).toBe("juegos-mesa");
    expect(listItemImageKey("Muñeca de trapo")).toBe("juegos-mesa");
    expect(listItemImageKey("Cuento ilustrado de dragones")).toBe("libros");
    expect(listItemImageKey("Pinturas de dedos")).toBe("arte-manualidades");
    expect(listItemImageKey("Plastilina de colores")).toBe("arte-manualidades");
    // El juguete gana al tema, como el libro de recetas.
    expect(listItemImageKey("Cocinita de juguete")).toBe("juegos-mesa");
    expect(listItemImageKey("Libro de dinosaurios")).toBe("libros");
  });

  it("no confunde palabras que solo se parecen", () => {
    // La pintura de uñas es belleza, no manualidades; la vela de cera, también.
    expect(listItemImageKey("Pintura de uñas roja")).toBe("belleza");
    expect(listItemImageKey("Vela de cera de higo")).toBe("belleza");
    // «te» suelto es el pronombre, no el té.
    expect(listItemImageKey("Algo que te guste")).toBe("regalo-generico");
    // «mesa» en «lámpara de mesa» no es un juego de mesa.
    expect(listItemImageKey("Lámpara de mesa")).toBe("hogar-decoracion");
    // «taller» suelto no es un curso.
    expect(listItemImageKey("Banco para el taller")).toBe("regalo-generico");
  });

  describe("listItemPhoto", () => {
    it("da la foto del objeto cuando es lo primero que nombra el título", () => {
      expect(listItemPhoto("Taza esmaltada azul")).toBe("/list-photos/taza.webp");
      expect(listItemPhoto("Vela de cera de higo")).toBe("/list-photos/vela.webp");
      expect(listItemPhoto("Calcetines de lana gorda")).toBe("/list-photos/calcetin.webp");
      expect(listItemPhoto("Un jersey de lana")).toBe("/list-photos/jersey.webp");
      expect(listItemPhoto("Juego de mesa cooperativo")).toBe("/list-photos/juego-de-mesa.webp");
    });

    it("no la da si el objeto es solo un complemento o el regalo es otra cosa", () => {
      expect(listItemPhoto("Báscula para café con temporizador")).toBeNull();
      expect(listItemPhoto("Funda de guitarra")).toBeNull();
      expect(listItemPhoto("Clase de piano")).toBeNull();
      expect(listItemPhoto("Entradas para el concierto")).toBeNull();
      expect(listItemPhoto("Sorpréndeme")).toBeNull();
      expect(listItemPhoto("")).toBeNull();
    });

    it("cada palabra con foto tiene su archivo y cada archivo, su palabra", () => {
      const dir = join(process.cwd(), "public", "list-photos");
      const files = readdirSync(dir).filter((f) => f.endsWith(".webp"));
      expect(files.length).toBeGreaterThan(100);
      for (const file of files) {
        const word = file.replace(/\.webp$/, "").replace(/-/g, " ");
        expect(listItemPhoto(word), word).toBe(`/list-photos/${file}`);
      }
    });
  });

  it("sin pistas, el regalo genérico; siempre una clave del catálogo", () => {
    expect(listItemImageKey("Sorpréndeme")).toBe("regalo-generico");
    expect(listItemImageKey("")).toBe("regalo-generico");
    expect(GIFT_IMAGE_KEYS).toContain(listItemImageKey("Cualquier cosa"));
  });
});

import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  decodeFileBytes,
  fileTextToPasteText,
  parseDelimited,
  readListFile,
  type ListFile,
} from "./fileImport";
import { parsePastedList } from "./pastedList";

// Archivos inventados: el repo es público. Nombres de producto genéricos,
// tiendas en example.com o en dominios de ejemplo.

/** Windows-1252 para el texto de estos tests: Latin-1 más el «€» (0x80). */
function cp1252(text: string): Uint8Array {
  return Uint8Array.from(text, (ch) => {
    if (ch === "€") return 0x80;
    const code = ch.charCodeAt(0);
    if (code > 0xff) throw new Error(`No cabe en Windows-1252: ${ch}`);
    return code;
  });
}

function utf16le(text: string, bom = true): Uint8Array {
  const bytes: number[] = bom ? [0xff, 0xfe] : [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes.push(code & 0xff, code >> 8);
  }
  return Uint8Array.from(bytes);
}

const utf8 = (text: string) => new TextEncoder().encode(text);

function fakeFile(name: string, bytes: Uint8Array, size = bytes.byteLength): ListFile {
  return {
    name,
    size,
    arrayBuffer: async () => bytes.slice().buffer as ArrayBuffer,
  };
}

/** Lo que importa de cada fila tras pasar por el analizador. */
function rowsOf(text: string, fileName: string) {
  return parsePastedList(fileTextToPasteText(text, fileName)).rows.map((r) => ({
    title: r.title,
    url: r.url,
    note: r.note,
  }));
}

// Lo que guarda Excel en español con «CSV (delimitado por punto y coma)».
const EXCEL_ES = [
  "Nombre;Enlace;Precio;Notas",
  "Muñeca de trapo;https://juguetes.example.com/p/muneca-trapo;19,99 €;Para la más pequeña",
  "Libro de cocina;;24,90 €;Edición en tapa dura",
  "",
].join("\r\n");

// ─── Bytes ──────────────────────────────────────────────────────────────────

describe("decodeFileBytes", () => {
  it("lee Windows-1252 cuando no es UTF-8 válido", () => {
    expect(decodeFileBytes(cp1252("Muñeca;Canción"))).toBe("Muñeca;Canción");
  });

  it("lee UTF-8 sin BOM", () => {
    expect(decodeFileBytes(utf8("Muñeca;Canción 🎁"))).toBe("Muñeca;Canción 🎁");
  });

  it("quita el BOM de UTF-8", () => {
    expect(decodeFileBytes(Uint8Array.from([0xef, 0xbb, 0xbf, ...utf8("título;enlace")]))).toBe("título;enlace");
  });

  it("lee UTF-16 LE y BE con BOM", () => {
    expect(decodeFileBytes(utf16le("Qué\tEnlace\r\nMuñeca\t"))).toBe("Qué\tEnlace\r\nMuñeca\t");
    const be = Uint8Array.from([0xfe, 0xff, 0x00, 0x51, 0x00, 0xe9]);
    expect(decodeFileBytes(be)).toBe("Qé");
  });

  it("un archivo vacío es texto vacío", () => {
    expect(decodeFileBytes(new Uint8Array(0))).toBe("");
  });
});

// ─── CSV ─────────────────────────────────────────────────────────────────────

describe("parseDelimited", () => {
  it("entiende comillas, comillas dobladas y saltos de línea dentro", () => {
    const csv = 'a;"b;c";"dice ""hola""\r\nen dos líneas"\r\nd;e;f\n';
    expect(parseDelimited(csv, ";")).toEqual([
      ["a", "b;c", 'dice "hola"\r\nen dos líneas'],
      ["d", "e", "f"],
    ]);
  });

  it("tolera comillas mal cerradas sin colgarse", () => {
    expect(parseDelimited('a;b"c;"d', ";")).toEqual([["a", 'b"c', "d"]]);
    expect(parseDelimited('"x"y;z', ";")).toEqual([["xy", "z"]]);
  });

  it("una línea en blanco es una fila vacía; el final del archivo no", () => {
    expect(parseDelimited("a\r\n\r\nb\r\n", ";")).toEqual([["a"], [""], ["b"]]);
  });
});

describe("fileTextToPasteText", () => {
  it("Excel en español: «;», CRLF, cabecera reconocida y el precio fuera", () => {
    expect(fileTextToPasteText(EXCEL_ES, "Lista.CSV")).toBe(
      [
        "título\tenlace\tnota",
        "Muñeca de trapo\thttps://juguetes.example.com/p/muneca-trapo\tPara la más pequeña",
        "Libro de cocina\t\tEdición en tapa dura",
      ].join("\n"),
    );
  });

  it("campos entre comillas con «;», saltos de línea y comillas", () => {
    const csv = [
      "Título;Enlace;Nota",
      '"Puzle; 1000 piezas";https://juegos.example.com/puzle;"Que sea de paisajes',
      'el de ""montañas"" mejor"',
    ].join("\r\n");
    expect(fileTextToPasteText(csv, "lista.csv")).toBe(
      'título\tenlace\tnota\nPuzle; 1000 piezas\thttps://juegos.example.com/puzle\tQue sea de paisajes el de "montañas" mejor',
    );
  });

  it("CSV con comas: columnas reordenadas y «Precio» fuera", () => {
    const csv = [
      "Precio,Link,Notes,Product name",
      '"39,99",https://tienda.example.com/p/auriculares,Color negro,Auriculares inalámbricos',
      ",,,Taza grande",
    ].join("\n");
    expect(fileTextToPasteText(csv, "export.csv")).toBe(
      [
        "título\tenlace\tnota",
        "Auriculares inalámbricos\thttps://tienda.example.com/p/auriculares\tColor negro",
        "Taza grande\t\t",
      ].join("\n"),
    );
  });

  it("cabeceras compuestas: «Nombre del producto», «Enlace a la tienda», «Nombre de la tienda»", () => {
    const csv = [
      "Nombre del producto;Nombre de la tienda;Enlace a la tienda;Añadido el",
      "Bufanda de lana;Tienda Ejemplo;https://tienda.example.com/bufanda;01/10/2026",
    ].join("\n");
    expect(fileTextToPasteText(csv, "a.csv")).toBe(
      "título\tenlace\tnota\nBufanda de lana\thttps://tienda.example.com/bufanda\t",
    );
  });

  it("la primera línea «sep=;» de Excel fija el separador", () => {
    expect(fileTextToPasteText("sep=;\r\nTítulo;Enlace\r\nCuaderno, tapa dura;", "a.csv")).toBe(
      "título\tenlace\tnota\nCuaderno, tapa dura\t\t",
    );
  });

  it("un TSV sin cabecera sale igual", () => {
    const tsv = "Cuaderno\thttps://papeleria.example.com/cuaderno\nRotuladores\t";
    expect(fileTextToPasteText(tsv, "lista.tsv")).toBe(tsv);
  });

  it("sin cabecera reconocible, las celdas tal cual", () => {
    const csv = "Regalo sorpresa;https://tienda.example.com/x;rojo\r\nLámpara de mesa;;\r\n";
    expect(fileTextToPasteText(csv, "lista.csv")).toBe(
      "Regalo sorpresa\thttps://tienda.example.com/x\trojo\nLámpara de mesa\t\t",
    );
  });

  it("un .txt sale sin tocar", () => {
    const txt = "Muñeca; la de trapo\r\nLibro, de cocina, tapa dura\r\n";
    expect(fileTextToPasteText(txt, "notas.TXT")).toBe(txt);
  });

  it("sin extensión conocida solo se lee como tabla si se ve a las claras", () => {
    expect(fileTextToPasteText("Lego, el grande\nPuzle", "lista")).toBe("Lego, el grande\nPuzle");
    expect(fileTextToPasteText("Lego;https://tienda.example.com/lego", "lista")).toBe(
      "Lego\thttps://tienda.example.com/lego",
    );
  });

  it("deja sin nota una fila sin título, para que el título salga del enlace", () => {
    const csv = "Título;Enlace;Nota\r\n;https://tienda.example.com/p/zapatillas-trail-monte;talla 38";
    expect(fileTextToPasteText(csv, "a.csv")).toBe(
      "título\tenlace\tnota\n\thttps://tienda.example.com/p/zapatillas-trail-monte\t",
    );
  });
});

// ─── El archivo ─────────────────────────────────────────────────────────────

describe("readListFile", () => {
  it("lee un CSV de Excel en Windows-1252", async () => {
    const result = await readListFile(fakeFile("Lista.csv", cp1252(EXCEL_ES)));
    expect(result).toEqual({ text: fileTextToPasteText(EXCEL_ES, "Lista.csv") });
    expect("text" in result && result.text).toContain("Muñeca de trapo");
  });

  it("lee un CSV en UTF-16 LE con BOM", async () => {
    const result = await readListFile(fakeFile("lista.csv", utf16le("Qué;Enlace\r\nCanción de cuna;")));
    expect(result).toEqual({ text: "título\tenlace\tnota\nCanción de cuna\t\t" });
  });

  it("lee un CSV en UTF-8 con BOM", async () => {
    const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, ...utf8("Título;Enlace\nAcuarelas;")]);
    expect(await readListFile(fakeFile("lista.csv", bytes))).toEqual({ text: "título\tenlace\tnota\nAcuarelas\t\t" });
  });

  it("un .txt llega tal cual", async () => {
    expect(await readListFile(fakeFile("notas.txt", utf8("- Muñeca\n- Libro")))).toEqual({ text: "- Muñeca\n- Libro" });
  });

  it("rechaza otras extensiones", async () => {
    for (const name of ["lista.xlsx", "lista.json", "lista", "csv", "lista.csv.exe"]) {
      expect(await readListFile(fakeFile(name, utf8("a;b")))).toEqual({ error: "unsupported" });
    }
  });

  it("rechaza un archivo demasiado grande sin leerlo", async () => {
    let read = false;
    const file: ListFile = {
      name: "lista.csv",
      size: MAX_FILE_BYTES + 1,
      arrayBuffer: async () => {
        read = true;
        return new ArrayBuffer(0);
      },
    };
    expect(await readListFile(file)).toEqual({ error: "too-large" });
    expect(read).toBe(false);
    expect(await readListFile(fakeFile("lista.csv", new Uint8Array(MAX_FILE_BYTES + 1), 10))).toEqual({
      error: "too-large",
    });
  });
});

// ─── De punta a punta ───────────────────────────────────────────────────────

describe("archivo → parsePastedList", () => {
  it("da títulos, enlaces y notas", () => {
    expect(rowsOf(EXCEL_ES, "lista.csv")).toEqual([
      {
        title: "Muñeca de trapo",
        url: "https://juguetes.example.com/p/muneca-trapo",
        note: "Para la más pequeña",
      },
      { title: "Libro de cocina", url: undefined, note: "Edición en tapa dura" },
    ]);
  });

  it("una fila sin título lo saca del enlace, no de la nota", () => {
    const csv = "Título;Enlace;Nota\r\n;https://tienda.example.com/p/zapatillas-trail-monte;talla 38";
    expect(rowsOf(csv, "a.csv")).toEqual([
      { title: "Zapatillas trail monte", url: "https://tienda.example.com/p/zapatillas-trail-monte", note: undefined },
    ]);
  });

  it("un CSV sin cabecera también llega entero", () => {
    const csv = "Acuarelas;https://arte.example.com/acuarelas\r\nCaballete de mesa;\r\n";
    expect(rowsOf(csv, "a.csv")).toEqual([
      { title: "Acuarelas", url: "https://arte.example.com/acuarelas", note: undefined },
      { title: "Caballete de mesa", url: undefined, note: undefined },
    ]);
  });

  describe("el estado de reserva de otra app nunca cambia las filas (decisión 7)", () => {
    const base = [
      ["Muñeca de trapo", "https://juguetes.example.com/p/muneca-trapo", "Para la más pequeña"],
      ["Libro de cocina", "", "Tapa dura"],
      ["Acuarelas", "https://arte.example.com/acuarelas", ""],
    ];
    const csv = (header: string[], rows: string[][]) =>
      [header, ...rows].map((r) => r.join(";")).join("\r\n");
    const expected = rowsOf(csv(["Nombre", "Enlace", "Notas"], base), "a.csv");

    it("con una columna «Estado»", () => {
      for (const states of [
        ["Reservado", "", "Comprado"],
        ["", "", ""],
        ["Disponible", "Reservado", "Recibido"],
        ["Estado: Reservado", "Estado: Disponible", "Estado: Sin reservar"],
      ]) {
        const rows = base.map((r, i) => [r[0], states[i], r[1], r[2]]);
        expect(rowsOf(csv(["Nombre", "Estado", "Enlace", "Notas"], rows), "a.csv")).toEqual(expected);
      }
    });

    it("con una columna «Reservado» de sí o no", () => {
      for (const states of [["Sí", "No", "Sí"], ["No", "No", "No"]]) {
        const rows = base.map((r, i) => [...r, states[i]]);
        expect(rowsOf(csv(["Nombre", "Enlace", "Notas", "Reservado"], rows), "a.csv")).toEqual(expected);
      }
    });

    it("sin cabecera, con una celda «Estado: …»", () => {
      const withState = (state: string) => base.map((r) => [...r, state].join(";")).join("\r\n");
      const reference = rowsOf(withState(""), "a.csv");
      expect(reference).toEqual(expected);
      for (const state of ["Estado: Reservado", "Estado: Disponible", "ESTADO : sin reservar", "Status: received"]) {
        expect(rowsOf(withState(state), "a.csv")).toEqual(reference);
      }
    });
  });
});

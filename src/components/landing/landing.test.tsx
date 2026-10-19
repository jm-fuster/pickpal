import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ALL_STORES } from "@/lib/stores";
import { GivenMock } from "./mocks/GivenMock";
import { ListOwnerMock, ListReaderMock } from "./mocks/ListMock";
import { NextYearMock } from "./mocks/NextYearMock";
import { OccasionMock } from "./mocks/OccasionMock";
import { ProfileMock } from "./mocks/ProfileMock";
import { RemindersMock } from "./mocks/RemindersMock";

// El contrato de las réplicas (docs/design-system.md · Landing): para el lector
// de pantalla, una imagen con su descripción; por dentro, nada que se enfoque
// ni se anuncie por separado.
const MOCKS: [string, ReactElement][] = [
  ["OccasionMock", <OccasionMock key="occasion" />],
  ["ProfileMock", <ProfileMock key="profile" />],
  ["RemindersMock", <RemindersMock key="reminders" />],
  ["GivenMock", <GivenMock key="given" />],
  ["NextYearMock", <NextYearMock key="next-year" />],
  ["ListOwnerMock", <ListOwnerMock key="owner" />],
  ["ListReaderMock", <ListReaderMock key="reader" />],
];

describe("réplicas de la landing", () => {
  it.each(MOCKS)("%s es una imagen con descripción", (_, mock) => {
    // React 19 antepone un <link rel="preload"> por cada <img> (el avatar).
    const html = renderToStaticMarkup(mock).replace(/^(<link[^>]*>)+/, "");
    const outer = html.slice(0, html.indexOf(">") + 1);
    expect(outer).toContain('role="img"');
    expect(outer).toMatch(/aria-label="[^"]*\S[^"]*"/);
    expect(html).toContain('inert=""');
  });

  it.each(MOCKS)("%s no tiene nada interactivo ni encabezados", (_, mock) => {
    const html = renderToStaticMarkup(mock);
    for (const banned of [/<a[\s>]/, /<button/, /<input/, /<select/, /<textarea/, /tabindex/i, /<h[1-6]/]) {
      expect(html).not.toMatch(banned);
    }
  });

  it.each(MOCKS)("%s solo carga imágenes propias, decorativas", (_, mock) => {
    // El avatar de Marta es una copia local del de DiceBear: la landing no pide
    // nada a terceros, y dentro del MockFrame la imagen no se anuncia.
    const html = renderToStaticMarkup(mock);
    for (const [img] of html.matchAll(/<img[^>]*>/g)) {
      expect(img).toMatch(/src="\/landing\//);
      expect(img).toContain('alt=""');
    }
  });
});

describe("textos de la landing que dependen del código", () => {
  it("la pregunta de las tiendas dice «once»", () => {
    // Faq.tsx escribe el número a mano: si cambia, hay que reescribir la respuesta.
    expect(ALL_STORES.length).toBe(11);
  });
});

describe("JS de cliente de la landing", () => {
  it("solo RevealRoot lleva \"use client\"", () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter(
      (f) => /\.tsx?$/.test(f) && !f.endsWith(".test.tsx"),
    );
    const client = files.filter((f) =>
      /^\s*["']use client["']/.test(readFileSync(path.join(dir, f), "utf8")),
    );
    expect(client.map((f) => path.basename(f))).toEqual(["RevealRoot.tsx"]);
  });
});

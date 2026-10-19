// Marta, la persona de ejemplo de la landing. Todas las réplicas y las ideas
// de ejemplo salen de aquí, para que la historia cuadre de una sección a otra.
// Los textos copian los de la app (precios, orígenes, reacciones, correo).

import type { GiftImageKey, GiftType } from "@/lib/giftCatalog";
import type { StoreId } from "@/lib/stores";

// El avatar es el de la app (DiceBear, estilo «dylan»: rizos largos, fondo
// naranja), copiado en local para que la landing no pida nada a DiceBear. El
// crédito a Natalia Spivak (CC BY 4.0) va en /terminos, como en la app, y en
// los metadatos del propio SVG.
export const PERSON = {
  name: "Marta", avatar: "/landing/marta.svg", relationship: "Familia",
  interests: ["Cerámica", "Café de especialidad", "Plantas"],
  notes: "Está montando un rincón para el café en casa.",
  care: [
    { label: "Zapato", value: "38" }, { label: "Ropa", value: "M" },
    { label: "Alergias", value: "Frutos secos" }, { label: "No le gusta", value: "Perfumes fuertes" },
  ],
} as const;

export const OCCASION = { label: "Cumpleaños", budget: "30 – 60 €", panelBudget: "30–60€" } as const;

export type TileSpec =
  | { kind: "list"; title: string; price: string }
  | { kind: "own"; title: string; price: string }
  | { kind: "suggested"; title: string; price: string; imageKey: GiftImageKey };

/** Orden real: lo de su lista primero, luego las ideas. */
export const TILES: TileSpec[] = [
  { kind: "list", title: "Regadera de cobre pequeña", price: "unos 30 €" },
  { kind: "own", title: "Clase de torno para dos", price: "unos 60 €" },
  { kind: "suggested", title: "Maceta de barro esmaltado", price: "20–35 €", imageKey: "plantas" },
];

export type ExampleIdea = {
  title: string; description: string; tags: string[]; min: number; max: number;
  imageKey: GiftImageKey; type: Exclude<GiftType, "sorprendeme">; stores?: StoreId[];
};

const MOLINILLO: ExampleIdea = { title: "Molinillo de café manual", description: "Para moler el grano justo antes de prepararlo, en el rincón del café que está montando.", tags: ["Café de especialidad"], min: 35, max: 55, imageKey: "cafe-te", type: "fisica", stores: ["amazon", "elcorteingles"] };
const MACETA: ExampleIdea = { title: "Maceta de barro esmaltado", description: "Para la planta que más cuida, y a juego con su gusto por la cerámica.", tags: ["Plantas"], min: 20, max: 35, imageKey: "plantas", type: "fisica", stores: ["ikea", "amazon"] };
const TAZAS: ExampleIdea = { title: "Juego de dos tazas de cerámica hecha a mano", description: "Junta dos cosas que le gustan: la cerámica y su rincón del café.", tags: ["Cerámica"], min: 30, max: 45, imageKey: "arte-manualidades", type: "fisica", stores: ["elcorteingles", "amazon"] };
const TORNO: ExampleIdea = { title: "Tarde de torno en un taller de cerámica", description: "Ya le gusta la cerámica; aquí prueba el torno con alguien que enseña.", tags: ["Cerámica"], min: 40, max: 60, imageKey: "taller-curso", type: "experiencia" };
const CATA: ExampleIdea = { title: "Cata de cafés en un tostadero", description: "Probar orígenes distintos y llevarse a casa el que más le guste.", tags: ["Café de especialidad"], min: 25, max: 45, imageKey: "experiencia-gastronomica", type: "experiencia" };
const TERRARIOS: ExampleIdea = { title: "Taller de terrarios", description: "Montar su propio jardín en un frasco, que cabe en cualquier estantería.", tags: ["Plantas"], min: 30, max: 50, imageKey: "arte-manualidades", type: "experiencia" };
// «Paseo» y no «Mañana»: la landing no escribe «mañana» en ningún sentido,
// para que ningún texto se lea como una cuenta atrás.
const VIVERO: ExampleIdea = { title: "Paseo por un vivero y desayuno fuera", description: "Elegís una planta nueva y lo celebráis con un café sin prisa.", tags: ["Plantas"], min: 10, max: 25, imageKey: "plantas", type: "tiempo-juntos" };
const CENA: ExampleIdea = { title: "Cena en casa con sobremesa de café", description: "Cocinas tú, el postre va sin frutos secos y el café lo eliges a su gusto.", tags: ["Café de especialidad"], min: 15, max: 30, imageKey: "plan-casero", type: "tiempo-juntos" };
const BARRO: ExampleIdea = { title: "Tarde de barro en casa", description: "Barro de secado al aire, una mesa grande y una tarde sin prisa.", tags: ["Cerámica"], min: 10, max: 20, imageKey: "arte-manualidades", type: "tiempo-juntos" };

export const IDEAS: Record<GiftType, ExampleIdea[]> = {
  fisica: [MOLINILLO, MACETA, TAZAS],
  experiencia: [TORNO, CATA, TERRARIOS],
  "tiempo-juntos": [VIVERO, CENA, BARRO],
  sorprendeme: [MOLINILLO, TORNO, CENA],
};

/**
 * Una idea de la tanda del año siguiente, con el historial delante. El prompt
 * le manda a la IA explicar en una frase por qué encaja y le pasa los regalos
 * con su reacción «para no repetir y afinar» (src/app/api/recommendations), así
 * que una frase como esta es de las que salen; no siempre cita el historial.
 */
export const NEXT_YEAR_IDEA: ExampleIdea = { title: "Cafetera de filtro de cerámica", description: "La maceta de barro le encantó y la vela no: más cerámica, y esta vez para su rincón del café.", tags: ["Cerámica", "Café de especialidad"], min: 30, max: 45, imageKey: "cafe-te", type: "fisica", stores: ["amazon", "elcorteingles"] };

export const HISTORY = {
  given: { title: "Maceta de barro esmaltado", meta: "Cumpleaños · Le encantó" },
  earlier: { title: "Vela aromática", meta: "Navidad · No gustó" },
} as const;

export const LIST = {
  about: "Todo lo que sea para el rincón del café me hace ilusión.",
  top: [
    { title: "Regadera de cobre pequeña", price: "unos 30 €", reader: "claim" as const },
    { title: "Báscula para café con temporizador", price: "unos 45 €", reader: "taken" as const },
  ],
  rest: [{ title: "Delantal de lona para el taller", price: "unos 25 €", reader: "free" as const }],
  /** 30 y 45 caben en 30–60; 25 no (fitsBudget, src/lib/price.ts). */
  fitLine: "2 de sus cosas encajan en lo que pensabas gastar para Cumpleaños.",
};

export const EMAIL = {
  subject: "PickPal · Cumpleaños de Marta en 14 días",
  when: "en 14 días",
  cta: "Ideas para Marta",
  footer: "Si no quieres seguir recibiendo estos recordatorios, desactívalos en tus ajustes de PickPal.",
} as const;

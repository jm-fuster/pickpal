/**
 * Listas pegadas de mentira, una por formato, para los tests del analizador.
 * Son sintéticas: los nombres, las tiendas «ficticia» y los ASIN están
 * inventados, y tienen la forma de lo que se copia de cada sitio. El repo es
 * público: aquí nunca va la lista de una persona real.
 */

/** Una nota del móvil con todas las viñetas y casillas habituales. */
export const NOTES_WITH_BULLETS = [
  "• Auriculares con cancelación de ruido",
  "- Libro «El jardín de las mariposas de cristal»",
  "* Taza de cerámica hecha a mano ☕",
  "1. Clases de cerámica",
  "2) Mochila de senderismo 30 L",
  "(3) Juego de mesa cooperativo",
  "[ ] Funda para el móvil",
  "- [x] Vinilo de jazz",
  "☐ Pijama de franela",
  "✔ Velas aromáticas",
  "",
  "· Gorro de lana",
].join("\n");

/** La página de una lista de deseos de una tienda copiada entera: casi todo es ruido. */
export const AMAZON_ES_MIXED = [
  "Lista de deseos de Nerea",
  "Compartir",
  "Auriculares inalámbricos Ficticia X2 con cancelación de ruido",
  "de Ficticia",
  "4,5 de 5 estrellas",
  "(1.234)",
  "59,99 €",
  "Añadir a la cesta",
  "Añadido el 3 de octubre de 2026",
  "Lámpara de escritorio LED regulable",
  "de LuzNova",
  "4,2 de 5 estrellas",
  "(87)",
  "24,90 €",
  "Añadir a la cesta",
  "https://www.amazon.es/Lampara-Escritorio-LED-Regulable/dp/B0TEST0002/ref=sr_1_3?keywords=lampara&qid=1700000000&sr=8-3",
  "Ver más",
].join("\n");

/** Chat de WhatsApp exportado desde iOS: dos personas, avisos del sistema y una marca U+200E. */
export const WHATSAPP_IOS = [
  "[11/10/26, 10:14:05] Lucía: Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera WhatsApp, puede leerlos ni escucharlos.",
  "[11/10/26, 10:15:32] Lucía: Para mi cumple me haría ilusión:",
  "[11/10/26, 10:15:40] Lucía: Una bufanda de lana gris",
  "[11/10/26, 10:15:52] Lucía: El libro de recetas de Tomás Fuentes",
  "https://www.tiendaficticia.es/libros/recetas-de-temporada-9781234567897",
  "[11/10/26, 10:16:02] Lucía: ‎imagen omitida",
  "[11/10/26, 10:16:30] Álvaro: Yo te regalo algo de jardinería",
  "[11/10/26, 10:17:01] Lucía: Unas zapatillas de trail",
  "[11/10/26, 10:17:15] Lucía: Se eliminó este mensaje",
].join("\n");

/** Chat de WhatsApp exportado desde Android, con «a. m.» y el espacio estrecho U+202F. */
export const WHATSAPP_ANDROID = [
  "11/10/2026, 9:02 a. m. - Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera WhatsApp, puede leerlos ni escucharlos. Toca para obtener más información.",
  "11/10/2026, 9:03 a. m. - Irene: Cosas que me gustaría",
  "11/10/2026, 9:03 a. m. - Irene: - Cafetera de émbolo",
  "11/10/2026, 9:04 a. m. - Irene: - Plantas para el balcón 🌿",
  "11/10/2026, 9:04 a. m. - Irene: <Multimedia omitido>",
  "11/10/2026, 9:05 a. m. - Bruno: Apuntado 👍",
  "11/10/2026, 9:06 p. m. - Irene: - Entradas para el teatro",
  "11/10/2026, 9:07 p. m. - Llamada de voz perdida",
].join("\n");

/** Título en una línea y su enlace en la siguiente, con rastreo que limpiar. */
export const TITLE_THEN_URL = [
  "Kit de acuarelas para principiantes",
  "https://www.tiendaficticia.es/arte/kit-acuarelas-principiantes-24-colores-555123.html?utm_source=newsletter&utm_medium=email",
  "",
  "Cojín de lino natural",
  "www.casaficticia.com/cojin-lino-natural?color=arena&gclid=abc123",
  "",
  "Taladro inalámbrico",
  "https://www.amazon.es/Taladro-Inalambrico-Bateria-Litio/dp/B0TEST0003/ref=sr_1_1?tag=afiliado-21",
].join("\n");

/** Título y enlace en la misma línea, en cualquier orden y con separadores. */
export const SAME_LINE = [
  "Bicicleta estática plegable - https://www.tiendaficticia.es/deporte/bicicleta-estatica-plegable",
  "Altavoz bluetooth resistente al agua: https://www.amazon.de/dp/B0TEST0004?psc=1",
  "https://www.libreriaficticia.es/novela-negra-nordica | Novela negra nórdica",
  "Set de té matcha (https://www.teficticio.com/set-matcha?ref=insta&utm_campaign=otono)",
].join("\n");

/** Enlaces en Markdown, como los copian algunas apps de notas. */
export const MARKDOWN = [
  "- [Mochila urbana impermeable](https://www.tiendaficticia.es/mochila-urbana-impermeable)",
  "- [Cámara instantánea](https://www.amazon.es/gp/product/B0TEST0005/?tag=otro-21)",
  "- [Lámpara de sal](www.decoficticia.com/lampara-sal)",
].join("\n");

/** Solo enlaces: con título en la ruta, sin él y uno corto que no se abre. */
export const URL_ONLY = [
  "https://www.amazon.es/Zapatillas-Running-Hombre-Negro/dp/B0TEST0006?th=1&psc=1",
  "https://www.tiendaficticia.es/p/123456",
  "amzn.to/3FakeLk",
  "https://www.tiendaficticia.es/zapatilla-trail-xt6-123456.html",
].join("\n");

/** Columnas copiadas de una hoja de cálculo en Windows: tabuladores, cabecera y CRLF. */
export const TSV_WITH_HEADER_CRLF = [
  "Título\tEnlace\tNota",
  "Robot aspirador\thttps://www.amazon.es/dp/B0TEST0007?tag=x-21\tEl modelo pequeño",
  "Guantes de jardinería\t\tTalla M",
  "Puzzle de 1000 piezas\thttps://www.tiendaficticia.es/puzzle-1000-piezas-paisaje\t",
].join("\r\n");

/**
 * El texto de «Share» → «more…» de wishlist.com, con la forma que se espera
 * (aún sin una muestra real): cabecera con el enlace de la lista, título y
 * enlace corto de cada deseo, botones y el bloque de agradecimiento con la
 * dirección.
 */
export const WISHLIST_COM_MORE = [
  "Lista de cumpleaños de Carla https://www.wishlist.com/l/AbC123",
  "Copy all Wishes",
  "Copy selected",
  "Patinete eléctrico plegable",
  "https://www.wishlist.com/w/x7Kq2",
  "Set de pinceles de acuarela",
  "https://www.wishlist.com/w/p9Zt4",
  "Taza térmica de acero",
  "https://wishlist.com/w/m3Rr8",
  "Thank you message and instructions",
  "¡Gracias por pasar por mi lista!",
  "Si me mandas algo, esta es mi dirección:",
  "Carla Ficticia",
  "Calle Inventada 12, 3º B",
  "28999 Villaficticia (Madrid)",
  "carla.ficticia@example.com",
  "more…",
].join("\n");

export const FIXTURES = {
  NOTES_WITH_BULLETS,
  AMAZON_ES_MIXED,
  WHATSAPP_IOS,
  WHATSAPP_ANDROID,
  TITLE_THEN_URL,
  SAME_LINE,
  MARKDOWN,
  URL_ONLY,
  TSV_WITH_HEADER_CRLF,
  WISHLIST_COM_MORE,
} as const;

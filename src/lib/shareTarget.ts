/**
 * «Compartir» del móvil hacia PickPal (destino `share_target` del manifiesto,
 * src/app/manifest.ts). Android manda lo compartido por POST a `/compartir`:
 * el título de la página, a veces un texto y a veces la dirección, que muchas
 * apps meten dentro del texto («Mira esto https://…»). Aquí se convierte en el
 * mismo fragmento que usa el botón «Apuntar en PickPal» (`#t=…&u=…`), y la
 * página de apuntar lo lee y lo vuelve a validar (`readBookmarkletFragment`).
 *
 * Nada de aquí abre el enlace: solo lee la cadena.
 */

// Lo que manda una app al compartir cabe de sobra; lo demás se recorta antes
// de mirarlo, para no trabajar con entradas enormes que cualquiera puede mandar.
const MAX_FIELD = 4000;
const URL_IN_TEXT = /https?:\/\/[^\s<>"«»]+/i;

export type SharedFields = { title?: string | null; text?: string | null; url?: string | null };

function field(value: string | null | undefined): string {
  return (value ?? "").slice(0, MAX_FIELD).replace(/\s+/g, " ").trim();
}

/** `t=…&u=…` (sin `#`), o vacío si no llegó nada aprovechable. */
export function shareTargetFragment(shared: SharedFields): string {
  const title = field(shared.title);
  const text = field(shared.text);
  const url = field(shared.url);

  const link = /^https?:\/\//i.test(url) ? url : (URL_IN_TEXT.exec(text)?.[0] ?? "");
  // Sin título, el texto sin el enlace («Mira esto») no sirve de nombre, pero
  // el de una app que comparte «Nombre del producto https://…» sí.
  const rest = link ? text.replace(link, " ").replace(/\s+/g, " ").trim() : text;
  const name = title || (rest.length > 0 && rest.length <= 200 ? rest : "");

  const params = new URLSearchParams();
  if (name) params.set("t", name.slice(0, 300));
  if (link) params.set("u", link.slice(0, 2048));
  return params.toString();
}

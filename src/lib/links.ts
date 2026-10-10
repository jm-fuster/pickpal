/**
 * Enlaces que escribe el usuario en «Mi lista» (docs/encargo-lista.md). Nada
 * de aquí hace peticiones: el servidor nunca abre estas URLs (decisión 3) y el
 * navegador solo las lee para enseñar el dominio y, si es una tienda conocida,
 * su logo. La comprobación de `http:`/`https:` se repite en el servidor
 * (`isAllowedListItemUrl` en convex/validators.ts), que es la que cuenta.
 */

const MAX_LINK_LENGTH = 2048;

/**
 * Lo que se escribe en el campo «Enlace», listo para guardar. Si llega sin
 * protocolo («amazon.es/dp/…», que es como se copia de muchas barras de
 * direcciones) se le pone `https://`. Vacío → `undefined`.
 */
export function normalizeLinkInput(raw: string | undefined): string | undefined {
  const s = raw?.trim() ?? "";
  if (s.length === 0) return undefined;
  return /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
}

/** ¿Es un enlace `http:` o `https:` con dominio? Espejo del servidor. */
export function isHttpUrl(url: string): boolean {
  if (url.length === 0 || url.length > MAX_LINK_LENGTH) return false;
  try {
    const u = new URL(url);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * El dominio que se enseña junto al enlace, en minúsculas y sin `www.`.
 * `null` si no es un enlace http(s). Un dominio con caracteres que imitan a
 * otros sale en punycode (`xn--…`), que es justo lo que conviene ver antes de
 * abrirlo.
 */
export function linkHostname(url: string): string | null {
  if (!isHttpUrl(url)) return null;
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

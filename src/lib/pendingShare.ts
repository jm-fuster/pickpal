import { readBookmarkletFragment } from "./bookmarklet";

/**
 * Lo que llegó de la tienda (el marcador) o del «Compartir» del móvil mientras
 * no había sesión. Los datos viajan en el fragmento de la dirección
 * (`#t=…&u=…`), que el servidor no ve: al pedir sesión, el proxy redirige a
 * `/sign-in?redirect_url=/mi-lista/apuntar` y esa dirección de vuelta no lleva
 * fragmento, así que al entrar la página se abría vacía. El navegador sí
 * conserva el fragmento hasta la página de entrada: allí se guarda un rato en
 * `sessionStorage` (solo esta pestaña, nunca sale del navegador) y la página de
 * apuntar lo recoge al volver.
 */

const KEY = "pickpal:apuntar-pendiente";
/** Lo que tarda alguien en entrar o crear la cuenta; pasado eso, se olvida. */
const MAX_AGE_MS = 30 * 60 * 1000;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Guarda el fragmento si trae algo aprovechable (un título o un enlace que
 * `readBookmarkletFragment` acepta). Los fragmentos que no son nuestros, como
 * los internos de Clerk, no se tocan. Devuelve si lo guardó.
 */
export function stashPendingShare(hash: string, store: Store, now: number = Date.now()): boolean {
  const data = readBookmarkletFragment(hash);
  if (!data.title && !data.url) return false;
  try {
    store.setItem(KEY, JSON.stringify({ hash, at: now }));
    return true;
  } catch {
    // Almacenamiento bloqueado (modo privado, cuota): se pierde, como antes.
    return false;
  }
}

/** El fragmento guardado y aún vigente (con su `#`), o `null`. No lo borra. */
export function peekPendingShare(store: Store, now: number = Date.now()): string | null {
  try {
    const raw = store.getItem(KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { hash, at } = parsed as { hash?: unknown; at?: unknown };
    if (typeof hash !== "string" || typeof at !== "number") return null;
    if (now - at > MAX_AGE_MS || at > now) return null;
    return hash;
  } catch {
    return null;
  }
}

export function clearPendingShare(store: Store): void {
  try {
    store.removeItem(KEY);
  } catch {
    // Nada que borrar si no hay almacenamiento.
  }
}

import { canonicalizeLink, isHttpUrl, normalizeLinkInput, unwrapLink } from "../links";
import { clampTitle, type PastedList, type PastedRow } from "./pastedList";

/**
 * Estado de la vista previa de «Pegar una lista»: casillas, cupo y avisos.
 * Va en funciones puras porque en este repo las páginas no tienen tests; la
 * página solo pinta lo que sale de aquí. Cada función devuelve un estado nuevo
 * (o el mismo objeto si no cambia nada) y nunca toca el que recibe.
 *
 * Las filas con aviso llegan sin casilla: lo que ya está en la lista o se ha
 * pegado dos veces, lo que parece texto, lo que escribió otra persona en un
 * chat y lo que no tiene nombre. El resto se marca en orden hasta llenar el
 * cupo (100 menos lo que ya hay en la lista), y lo que no cabe lleva «no-room».
 */

export type PreviewNotice = "duplicate" | "looks-like-text" | "other-author" | "needs-name" | "no-room";

export type PreviewRow = PastedRow & { key: string; group: number; checked: boolean; notice?: PreviewNotice };

export type PreviewState = {
  rows: PreviewRow[];
  capacity: number;
  groups: number;
  /**
   * Claves de lo que ya hay en la lista, para recalcular «duplicate» al
   * renombrar. Lo rellenan `createPreview` y `addPastedList`; un estado
   * escrito a mano sin él solo compara las filas entre sí.
   */
  existing?: { titles: string[]; urls: string[] };
};

type Existing = Array<{ title: string; url?: string }>;

/** Para comparar títulos: sin mayúsculas, sin tildes y sin puntuación. */
export function dedupeKey(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Para comparar enlaces: el canónico, sin `www.`, protocolo, fragmento ni barra final. */
function urlKey(url: string | undefined): string | undefined {
  const link = normalizeLinkInput(url);
  if (link === undefined || !isHttpUrl(link)) return undefined;
  const u = new URL(canonicalizeLink(unwrapLink(link)));
  return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}${u.search}`;
}

function existingKeys(existing: Existing): { titles: string[]; urls: string[] } {
  const titles = existing.map((e) => dedupeKey(e.title)).filter((k) => k.length > 0);
  const urls = existing.map((e) => urlKey(e.url)).filter((k): k is string => k !== undefined);
  return { titles, urls };
}

/**
 * Los avisos de todas las filas, en orden. Una fila repetida lo es respecto a
 * la lista o a una fila anterior, nunca a una posterior: la primera vez que
 * aparece algo, se queda limpia. «no-room» se conserva mientras la fila siga
 * sin casilla y no tenga otro aviso.
 */
function withNotices(rows: PreviewRow[], existing: PreviewState["existing"]): PreviewRow[] {
  const titles = new Set(existing?.titles ?? []);
  const urls = new Set(existing?.urls ?? []);
  return rows.map((row) => {
    const titleKey = dedupeKey(row.title);
    const linkKey = urlKey(row.url);
    const duplicate = (titleKey.length > 0 && titles.has(titleKey)) || (linkKey !== undefined && urls.has(linkKey));
    if (titleKey.length > 0) titles.add(titleKey);
    if (linkKey !== undefined) urls.add(linkKey);

    let notice: PreviewNotice | undefined;
    if (row.title.trim().length === 0) notice = "needs-name";
    else if (duplicate) notice = "duplicate";
    else if (row.hint === "other-author") notice = "other-author";
    else if (row.hint === "looks-like-text") notice = "looks-like-text";
    else if (row.notice === "no-room" && !row.checked) notice = "no-room";
    if (notice === row.notice) return row;
    const next: PreviewRow = { ...row };
    if (notice === undefined) delete next.notice;
    else next.notice = notice;
    return next;
  });
}

export function selectedCount(state: PreviewState): number {
  return state.rows.filter((r) => r.checked).length;
}

/** Lo que aún cabe: «Caben 37 más en tu lista». Nunca negativo. */
export function remaining(state: PreviewState): number {
  return Math.max(0, state.capacity - selectedCount(state));
}

/** Marca, en orden, las filas nuevas sin aviso mientras quede cupo; las demás, «no-room». */
function tickNewRows(rows: PreviewRow[], fromIndex: number, capacity: number): PreviewRow[] {
  let free = Math.max(0, capacity - rows.filter((r) => r.checked).length);
  return rows.map((row, i) => {
    if (i < fromIndex || row.notice !== undefined) return row;
    if (free > 0) {
      free--;
      return { ...row, checked: true };
    }
    return { ...row, notice: "no-room" };
  });
}

function rowsOf(list: PastedList, group: number): PreviewRow[] {
  return list.rows.map((row, i) => ({ ...row, key: `${group}:${i}`, group, checked: false }));
}

/**
 * La vista previa de una o varias listas pegadas. `existing` es lo que ya hay
 * en «Mi lista»; `capacity`, cuánto cabe aún (100 menos lo que hay).
 */
export function createPreview(lists: PastedList[], existing: Existing, capacity: number): PreviewState {
  const empty: PreviewState = { rows: [], capacity: Math.max(0, capacity), groups: 0, existing: existingKeys(existing) };
  return lists.reduce((state, list) => addPastedList(state, list, existing), empty);
}

/** «Pegar otra lista»: un grupo más debajo. Lo ya marcado no cambia. */
export function addPastedList(state: PreviewState, list: PastedList, existing: Existing): PreviewState {
  const keys = existingKeys(existing);
  const group = state.groups;
  const rows = withNotices([...state.rows, ...rowsOf(list, group)], keys);
  return { ...state, rows: tickNewRows(rows, state.rows.length, state.capacity), groups: group + 1, existing: keys };
}

/** Pone o quita la casilla. Ponerla se niega si no queda cupo o la fila no tiene nombre. */
export function toggleRow(state: PreviewState, key: string): PreviewState {
  const target = state.rows.find((r) => r.key === key);
  if (!target) return state;
  if (!target.checked && (remaining(state) === 0 || target.title.trim().length === 0)) return state;
  const rows = state.rows.map((row) => {
    if (row.key !== key) return row;
    const next: PreviewRow = { ...row, checked: !row.checked };
    if (next.checked && next.notice === "no-room") delete next.notice;
    return next;
  });
  return { ...state, rows };
}

/**
 * La casilla de un grupo. Si alguna fila del grupo está marcada, se desmarca
 * todo el grupo («saltarse una lista vieja de un toque»). Si no, se marcan en
 * orden mientras quede cupo, saltando las que no tienen nombre y, si hay otras,
 * las que llegaron sin casilla por un aviso: volver a marcar el grupo no debe
 * colar el bloque de «Thank you» con la dirección.
 */
export function toggleGroup(state: PreviewState, group: number): PreviewState {
  const inGroup = state.rows.filter((r) => r.group === group);
  if (inGroup.length === 0) return state;
  if (inGroup.some((r) => r.checked)) {
    return { ...state, rows: state.rows.map((r) => (r.group === group && r.checked ? { ...r, checked: false } : r)) };
  }
  const named = inGroup.filter((r) => r.title.trim().length > 0);
  const clean = named.filter((r) => r.notice === undefined || r.notice === "no-room");
  const wanted = new Set((clean.length > 0 ? clean : named).map((r) => r.key));
  let free = remaining(state);
  if (free === 0 || wanted.size === 0) return state;
  const rows = state.rows.map((row) => {
    if (!wanted.has(row.key) || free === 0) return row;
    free--;
    const next: PreviewRow = { ...row, checked: true };
    if (next.notice === "no-room") delete next.notice;
    return next;
  });
  return { ...state, rows };
}

/**
 * Cambia el título de una fila, recortado como lo recorta el analizador. Con
 * nombre deja de pedirlo; sin nombre se desmarca. Los avisos de repetido se
 * recalculan en todas las filas; las casillas de las demás no se tocan.
 */
export function renameRow(state: PreviewState, key: string, title: string): PreviewState {
  const target = state.rows.find((r) => r.key === key);
  if (!target) return state;
  const { title: clean, truncated } = clampTitle(title);
  const rows = state.rows.map((row) => {
    if (row.key !== key) return row;
    const next: PreviewRow = { ...row, title: clean, truncated };
    if (clean.length === 0) {
      next.checked = false;
      next.hint = "needs-name";
    } else if (next.hint === "needs-name") {
      delete next.hint;
    }
    return next;
  });
  return { ...state, rows: withNotices(rows, state.existing) };
}

/** Lo que se manda a `lists.importItems`, en el orden en que se pegó. */
export function selectedItems(state: PreviewState): Array<{ title: string; url?: string; note?: string }> {
  return state.rows
    .filter((r) => r.checked)
    .map((r) => {
      const item: { title: string; url?: string; note?: string } = { title: r.title };
      if (r.url !== undefined) item.url = r.url;
      if (r.note !== undefined) item.note = r.note;
      return item;
    });
}

/**
 * Para las líneas de resumen y el aviso final: cuántas se apuntan, cuántas de
 * ellas llegan sin enlace a la tienda y cuántas filas están repetidas (con la
 * lista o con otra fila pegada), marcadas o no.
 */
export function summary(state: PreviewState): { selected: number; withoutLink: number; duplicates: number } {
  const selected = state.rows.filter((r) => r.checked);
  return {
    selected: selected.length,
    withoutLink: selected.filter((r) => r.url === undefined).length,
    duplicates: state.rows.filter((r) => r.notice === "duplicate").length,
  };
}

/**
 * El precio aproximado de un elemento de «Mi lista» (decisión 2 de
 * docs/encargo-lista.md, reabierta para el precio el 12-oct-2026). Solo euros,
 * guardado en céntimos como los presupuestos de las fichas. Es una pista para
 * quien regala, no una etiqueta de tienda: se enseña como «unos 40 €» y nunca
 * se ordena ni se filtra por él.
 */

import { computeDaysUntil } from "./dates";

/** Espejo de `validateListItemPrice` en convex/validators.ts: hasta 10.000 €. */
export const MAX_PRICE_CENTS = 1_000_000;

/**
 * Un precio en euros escrito a la española o a la inglesa, en céntimos:
 * «39.99», «39,99», «1.299,00», «1,299.00» y «1299». Con un solo separador,
 * es decimal si le siguen una o dos cifras y de millares si le siguen tres
 * («1.299» son 1299 €). Lo que no encaja, o se sale de 1 céntimo a 10.000 €,
 * es `undefined`.
 */
export function parsePriceCents(raw: string): number | undefined {
  const s = raw.replace(/\s/g, "").replace(/€$|^€/, "");
  if (s.length === 0 || s.length > 16 || !/^\d+(?:[.,]\d+)*$/.test(s)) return undefined;
  const at = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  let whole = s;
  let decimals = "";
  if (at !== -1) {
    const sep = s[at];
    const other = sep === "." ? "," : ".";
    const after = s.slice(at + 1);
    const before = s.slice(0, at);
    const mixed = s.includes(other);
    const once = !before.includes(sep);
    if (mixed || (once && after.length <= 2)) {
      // Decimal: lo de antes solo puede llevar el otro separador, de millares.
      if (!once || after.length > 2) return undefined;
      if (mixed && !new RegExp(String.raw`^\d{1,3}(?:[${other}]\d{3})+$`).test(before)) return undefined;
      whole = before.split(other).join("");
      decimals = after;
    } else {
      // De millares: grupos de tres cifras.
      if (!new RegExp(String.raw`^\d{1,3}(?:[${sep}]\d{3})+$`).test(s)) return undefined;
      whole = s.split(sep).join("");
    }
  }
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > MAX_PRICE_CENTS) return undefined;
  return cents;
}

/**
 * Lo que se escribe en «Precio aproximado», en céntimos (`parsePriceCents`,
 * la misma lectura que usa el botón «Apuntar en PickPal»). Vacío → `null`
 * (sin precio); lo que no se entiende → `"invalid"`.
 */
export function parsePriceInput(raw: string | undefined): number | null | "invalid" {
  const s = (raw ?? "").trim().replace(/s*eur(?:os)?$/i, "");
  if (s.length === 0) return null;
  return parsePriceCents(s) ?? "invalid";
}

/** «40» o «39,99», para volver a ponerlo en el campo al editar. */
export function priceInputValue(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");
}

/** «unos 40 €», «unos 39,99 €», «unos 1.299 €». */
export function formatApproxPrice(cents: number): string {
  const euros = cents / 100;
  const text = euros.toLocaleString("es-ES", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: euros >= 1000,
  });
  return `unos ${text} €`;
}

type Budget = { budgetMin?: number; budgetMax?: number };

type DatedBudget = Budget & {
  label: string;
  month: number;
  day: number;
  year?: number;
  recurring?: boolean;
};

const hasBudget = (b: Budget) => b.budgetMin !== undefined || b.budgetMax !== undefined;

/**
 * Con qué presupuesto compara la ficha la lista de quien te la compartió: el
 * de la próxima fecha que tenga presupuesto («para Cumpleaños») o, si ninguna
 * lo tiene, el de la propia ficha. `null` si no hay ninguno. Se calcula en el
 * navegador: el presupuesto es de quien regala y nunca viaja a la dueña.
 */
export function budgetTarget(
  dates: ReadonlyArray<DatedBudget>,
  personBudget: Budget,
  from: Date = new Date(),
): { label: string | null; budget: Budget } | null {
  let best: { label: string; budget: Budget; days: number } | null = null;
  for (const d of dates) {
    if (!hasBudget(d)) continue;
    const days = computeDaysUntil(d, from);
    if (days === null) continue;
    if (!best || days < best.days) {
      best = { label: d.label, budget: { budgetMin: d.budgetMin, budgetMax: d.budgetMax }, days };
    }
  }
  if (best) return { label: best.label, budget: best.budget };
  return hasBudget(personBudget) ? { label: null, budget: personBudget } : null;
}

/**
 * ¿Cabe en lo que pensabas gastar? Sin presupuesto no se juzga (`false`):
 * la frase de la ficha solo sale cuando hay con qué comparar.
 */
export function fitsBudget(priceCents: number, budget: Budget): boolean {
  if (budget.budgetMin === undefined && budget.budgetMax === undefined) return false;
  if (budget.budgetMin !== undefined && priceCents < budget.budgetMin) return false;
  if (budget.budgetMax !== undefined && priceCents > budget.budgetMax) return false;
  return true;
}

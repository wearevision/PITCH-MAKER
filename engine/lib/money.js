// money.js — aritmética y formato de dinero (CLP por defecto). Sin deps.
// Todo se calcula en enteros de la moneda (CLP no usa decimales).

/** @typedef {{ code:string, locale:string, ivaRate:number, decimals:number }} Currency */

/** @type {Record<string, Currency>} */
export const CURRENCIES = {
  CLP: { code: 'CLP', locale: 'es-CL', ivaRate: 0.19, decimals: 0 },
  USD: { code: 'USD', locale: 'en-US', ivaRate: 0.0, decimals: 2 },
  UF: { code: 'UF', locale: 'es-CL', ivaRate: 0.19, decimals: 2 },
};

/**
 * Formatea un monto con separador de miles local.
 * @param {number} amount
 * @param {string} [code]
 * @param {{ symbol?: boolean }} [opts]
 */
export function money(amount, code = 'CLP', opts = {}) {
  const cur = CURRENCIES[code] || CURRENCIES.CLP;
  const n = round(amount, cur.decimals);
  const nf = new Intl.NumberFormat(cur.locale, {
    minimumFractionDigits: cur.decimals,
    maximumFractionDigits: cur.decimals,
  }).format(n);
  if (opts.symbol === false) return nf;
  return code === 'CLP' ? `$${nf}` : `${nf} ${code}`;
}

/** Redondeo a N decimales, estable. */
export function round(n, decimals = 0) {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/**
 * Calcula el total de una línea de presupuesto.
 * total = qty * unit * days * (1 - discount)
 * @param {{ qty?:number, unit:number, days?:number, discount?:number }} line
 */
export function lineTotal(line) {
  const qty = line.qty ?? 1;
  const days = line.days ?? 1;
  const discount = line.discount ?? 0;
  return round(qty * line.unit * days * (1 - discount), 0);
}

/** Formatea porcentaje 0..1 → "19%". */
export function pct(x) {
  return `${round(x * 100, 1)}%`;
}

// budget/model.js — motor de cálculo del presupuesto (contrato numérico compartido).
// Deck, microsite y el renderer de presupuesto consumen computeBudget().
// Toda la aritmética vive aquí para una única fuente de verdad de los totales.

import { lineTotal, round } from '../lib/money.js';

/**
 * @typedef {import('../lib/schema.js').Budget} Budget
 */

/**
 * @typedef {Object} ComputedLine
 * @property {string} concept
 * @property {number} qty
 * @property {number} unit
 * @property {number} days
 * @property {number} discount
 * @property {string} [note]
 * @property {number} total
 */

/**
 * @typedef {Object} ComputedGroup
 * @property {string} id
 * @property {string} name
 * @property {ComputedLine[]} lines
 * @property {number} subtotal
 * @property {number} share   Fracción del subtotal neto de líneas (0..1)
 */

/**
 * @typedef {Object} ComputedBudget
 * @property {string} currency
 * @property {ComputedGroup[]} groups
 * @property {number} linesSubtotal    Suma de líneas (antes de contingencia/margen)
 * @property {number} contingencyRate
 * @property {number} contingencyAmt
 * @property {number} marginRate
 * @property {number} marginAmt
 * @property {number} net              Neto sin IVA (líneas + contingencia + margen)
 * @property {boolean} iva
 * @property {number} ivaRate
 * @property {number} ivaAmt
 * @property {number} total            Total con IVA
 * @property {number|null} perPax      Neto por persona (si hay audiencia)
 * @property {{name:string, deltaPct:number, note?:string, net:number, total:number}[]} options
 */

/**
 * Calcula todos los totales del presupuesto de forma determinística.
 * @param {Budget} budget
 * @param {{ audienceSize?: number }} [ctx]
 * @returns {ComputedBudget}
 */
export function computeBudget(budget, ctx = {}) {
  const currency = budget.currency || 'CLP';
  const iva = budget.iva !== false;
  const ivaRate = budget.ivaRate ?? (currency === 'CLP' ? 0.19 : 0);
  const contingencyRate = budget.contingency ?? 0;
  const marginRate = budget.margin ?? 0;

  const groups = (budget.groups || []).map((g) => {
    const lines = (g.lines || []).map((l) => ({
      concept: l.concept,
      qty: l.qty ?? 1,
      unit: l.unit,
      days: l.days ?? 1,
      discount: l.discount ?? 0,
      note: l.note,
      total: lineTotal(l),
    }));
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    return { id: g.id, name: g.name, lines, subtotal, share: 0 };
  });

  const linesSubtotal = groups.reduce((s, g) => s + g.subtotal, 0);
  for (const g of groups) g.share = linesSubtotal ? round(g.subtotal / linesSubtotal, 4) : 0;

  const contingencyAmt = round(linesSubtotal * contingencyRate, 0);
  const baseAfterContingency = linesSubtotal + contingencyAmt;
  const marginAmt = round(baseAfterContingency * marginRate, 0);
  const net = baseAfterContingency + marginAmt;
  const ivaAmt = iva ? round(net * ivaRate, 0) : 0;
  const total = net + ivaAmt;

  const perPax = ctx.audienceSize ? round(net / ctx.audienceSize, 0) : null;

  const options = (budget.options || []).map((o) => ({
    name: o.name,
    deltaPct: o.deltaPct ?? 0,
    note: o.note,
    net: round(net * (1 + (o.deltaPct ?? 0)), 0),
    total: round(total * (1 + (o.deltaPct ?? 0)), 0),
  }));

  return {
    currency,
    groups,
    linesSubtotal,
    contingencyRate,
    contingencyAmt,
    marginRate,
    marginAmt,
    net,
    iva,
    ivaRate,
    ivaAmt,
    total,
    perPax,
    options,
  };
}

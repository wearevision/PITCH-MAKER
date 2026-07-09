// budget/render.js — renderer del presupuesto (contrato: renderBudget(proposal, ctx) => {relpath: string}).
// Genérico y data-driven: todo sale de proposal + ctx (budget computado + brand resuelto).
// No escribe a disco; build.js persiste bajo proposals/<slug>/dist/.

import { money, pct, round } from '../lib/money.js';
import { esc } from '../lib/html.js';
import { toCssVars } from '../lib/brand.js';

/**
 * @param {import('../lib/schema.js').Proposal} proposal
 * @param {{ budget: import('./model.js').ComputedBudget, brand: any }} ctx
 * @returns {Record<string,string>}
 */
export function renderBudget(proposal, ctx) {
  const { budget, brand } = ctx;
  const cur = budget.currency;

  return {
    'budget/presupuesto.html': renderHtml(proposal, budget, brand, cur),
    'budget/presupuesto.csv': renderCsv(proposal, budget, cur),
    'budget/budget.computed.json': JSON.stringify(budget, null, 2),
  };
}

/* ---------------------------------------------------------------- utilidades */

const fmtDateLong = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);
};

// Validez de la oferta: 30 días desde la fecha de la propuesta (convención de licitación).
const addDays = (iso, days) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/* -------------------------------------------------------------------- HTML */

function renderHtml(proposal, budget, brand, cur) {
  const meta = proposal.meta || {};
  const tender = meta.tender || {};
  const contact = proposal.contact || {};
  const money2 = (n) => money(n, cur);

  const validUntil = addDays(meta.date, 30);

  const metaRows = [
    ['Cliente', meta.client],
    ['Proyecto', meta.project],
    ['ID licitación', tender.id],
    ['Entidad', tender.entity],
    ['Fecha', fmtDateLong(meta.date)],
    ['Moneda', cur],
    ['Validez oferta', validUntil ? `Hasta ${fmtDateLong(validUntil)} (30 días)` : '30 días'],
    ['Versión', meta.version],
  ].filter(([, v]) => v != null && v !== '');

  const groupTables = (budget.groups || [])
    .map((g) => groupTable(g, money2))
    .join('\n');

  const totalsBlock = renderTotals(budget, money2);
  const perPaxBlock = budget.perPax != null ? renderPerPax(budget, proposal, money2) : '';
  const optionsBlock = (budget.options && budget.options.length) ? renderOptions(budget, money2) : '';

  const css = pageCss(brand);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Presupuesto · ${esc(meta.client || '')} — ${esc(meta.project || '')}</title>
<style>
${css}
</style>
</head>
<body>
<main class="sheet">

  <header class="doc-head">
    <div class="doc-head__brand">
      <div class="brandmark">${esc((brand.name || 'PITCH').slice(0, 2)).toUpperCase()}</div>
      <div class="brandmark__text">
        <div class="brandmark__name">${esc(brand.name || 'PITCH')}</div>
        ${brand.tagline ? `<div class="brandmark__tag">${esc(brand.tagline)}</div>` : ''}
      </div>
    </div>
    <div class="doc-head__label">
      <span class="kicker">Propuesta económica</span>
      <h1>Presupuesto</h1>
    </div>
  </header>

  <section class="meta">
    <dl class="meta__grid">
      ${metaRows.map(([k, v]) => `<div class="meta__item"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n      ')}
    </dl>
  </section>

  <section class="groups">
    ${groupTables}
  </section>

  <section class="summary">
    ${totalsBlock}
    ${perPaxBlock}
  </section>

  ${optionsBlock}

  <footer class="doc-foot">
    <div class="doc-foot__contact">
      ${contact.org ? `<strong>${esc(contact.org)}</strong>` : ''}
      ${contact.name ? `<span>${esc(contact.name)}</span>` : ''}
      ${contact.email ? `<span>${esc(contact.email)}</span>` : ''}
      ${contact.phone ? `<span>${esc(contact.phone)}</span>` : ''}
    </div>
    <div class="doc-foot__note">
      Valores en ${esc(cur)}${budget.iva ? `, IVA ${pct(budget.ivaRate)} incluido en el total` : ', exento de IVA'}.
      Presupuesto referencial sujeto a validación técnica y disponibilidad de proveedores.
    </div>
  </footer>

</main>
</body>
</html>`;
}

function groupTable(g, money2) {
  const rows = (g.lines || []).map((l) => {
    const showQty = l.qty != null && l.qty !== 1;
    const qtyCell = l.qty != null ? formatQty(l.qty) : '1';
    const discountTag = l.discount ? `<span class="disc">−${pct(l.discount)}</span>` : '';
    const note = l.note ? `<span class="line-note">${esc(l.note)}</span>` : '';
    return `<tr>
        <td class="c-concept"><span class="concept">${esc(l.concept)}</span>${note}${discountTag}</td>
        <td class="c-num">${esc(qtyCell)}</td>
        <td class="c-num">${esc(money2(l.unit))}</td>
        <td class="c-num c-total">${esc(money2(l.total))}</td>
      </tr>`;
  }).join('\n');

  return `<article class="group">
    <div class="group__head">
      <h2 class="group__name">${esc(g.name)}</h2>
      <span class="group__share">${esc(pct(g.share))} del subtotal</span>
    </div>
    <div class="table-wrap">
    <table class="ledger">
      <thead>
        <tr>
          <th class="c-concept">Concepto</th>
          <th class="c-num">Cant.</th>
          <th class="c-num">Unitario</th>
          <th class="c-num">Total</th>
        </tr>
      </thead>
      <tbody>
${rows}
      </tbody>
      <tfoot>
        <tr>
          <td class="c-concept">Subtotal ${esc(g.name)}</td>
          <td class="c-num"></td>
          <td class="c-num"></td>
          <td class="c-num c-total">${esc(money2(g.subtotal))}</td>
        </tr>
      </tfoot>
    </table>
    </div>
  </article>`;
}

function formatQty(q) {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(q);
}

function renderTotals(budget, money2) {
  const rows = [];
  rows.push(totalRow('Subtotal líneas', money2(budget.linesSubtotal)));
  if (budget.contingencyRate) rows.push(totalRow(`Contingencia (${pct(budget.contingencyRate)})`, money2(budget.contingencyAmt)));
  if (budget.marginRate) rows.push(totalRow(`Margen (${pct(budget.marginRate)})`, money2(budget.marginAmt)));
  rows.push(totalRow('Neto', money2(budget.net), 'is-net'));
  if (budget.iva) rows.push(totalRow(`IVA (${pct(budget.ivaRate)})`, money2(budget.ivaAmt)));

  return `<div class="totals">
    <table class="totals__table">
      <tbody>
        ${rows.join('\n        ')}
      </tbody>
    </table>
    <div class="grand">
      <span class="grand__label">Total ${budget.iva ? 'con IVA' : ''}</span>
      <span class="grand__value">${esc(money2(budget.total))}</span>
    </div>
  </div>`;
}

function totalRow(label, value, cls = '') {
  return `<tr class="${cls}"><td class="t-label">${esc(label)}</td><td class="t-value">${esc(value)}</td></tr>`;
}

function renderPerPax(budget, proposal, money2) {
  const size = proposal?.brief?.audience?.size;
  return `<aside class="perpax">
    <div class="perpax__label">Neto por persona</div>
    <div class="perpax__value">${esc(money2(budget.perPax))}</div>
    ${size ? `<div class="perpax__sub">${esc(new Intl.NumberFormat('es-CL').format(size))} asistentes</div>` : ''}
  </aside>`;
}

function renderOptions(budget, money2) {
  const rows = budget.options.map((o) => {
    const sign = o.deltaPct > 0 ? '+' : '';
    const cls = o.deltaPct > 0 ? 'delta-up' : (o.deltaPct < 0 ? 'delta-down' : '');
    return `<tr>
      <td class="c-concept"><span class="concept">${esc(o.name)}</span>${o.note ? `<span class="line-note">${esc(o.note)}</span>` : ''}</td>
      <td class="c-num"><span class="${cls}">${esc(sign + pct(o.deltaPct))}</span></td>
      <td class="c-num">${esc(money2(o.net))}</td>
      <td class="c-num c-total">${esc(money2(o.total))}</td>
    </tr>`;
  }).join('\n');

  return `<section class="options">
    <div class="group__head">
      <h2 class="group__name">Escenarios / opciones</h2>
      <span class="group__share">variaciones sobre el total base</span>
    </div>
    <div class="table-wrap">
    <table class="ledger">
      <thead>
        <tr>
          <th class="c-concept">Escenario</th>
          <th class="c-num">Δ</th>
          <th class="c-num">Neto</th>
          <th class="c-num">Total</th>
        </tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
    </div>
  </section>`;
}

/* --------------------------------------------------------------------- CSS */

function pageCss(brand) {
  return `${toCssVars(brand)}

* { box-sizing: border-box; margin: 0; padding: 0; }

html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

body {
  background: var(--c-bg);
  color: var(--c-ink);
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.5;
  padding: 32px 20px;
  display: flex;
  justify-content: center;
}

.sheet {
  width: 100%;
  max-width: 820px;
  background: var(--c-bg-alt);
  border: 1px solid var(--c-line);
  border-radius: calc(var(--radius) * 1px);
  padding: 48px 52px;
  box-shadow: 0 40px 120px rgba(0,0,0,0.5);
}

/* Encabezado */
.doc-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--c-line);
}
.doc-head__brand { display: flex; align-items: center; gap: 14px; }
.brandmark {
  width: 52px; height: 52px;
  display: grid; place-items: center;
  border-radius: 12px;
  background: var(--c-primary);
  color: var(--c-bg);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 20px;
  letter-spacing: 0.02em;
}
.brandmark__name {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  letter-spacing: 0.01em;
}
.brandmark__tag { color: var(--c-ink-soft); font-size: 12px; }
.doc-head__label { text-align: right; }
.kicker {
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.28em;
  font-size: 10px;
  color: var(--c-primary);
  margin-bottom: 6px;
}
.doc-head__label h1 {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 34px;
  line-height: 1;
  letter-spacing: -0.01em;
}

/* Meta */
.meta { padding: 26px 0; border-bottom: 1px solid var(--c-line); }
.meta__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 40px;
}
.meta__item dt {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 9.5px;
  color: var(--c-ink-soft);
  margin-bottom: 3px;
}
.meta__item dd { font-size: 14px; font-weight: 600; }

/* Grupos / tablas */
.groups { padding-top: 12px; }
.group, .options { margin-top: 30px; }
.group__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 10px;
}
.group__name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.group__name::before {
  content: "";
  display: inline-block;
  width: 8px; height: 8px;
  margin-right: 10px;
  border-radius: 2px;
  background: var(--c-primary);
  vertical-align: middle;
}
.group__share {
  font-size: 11px;
  color: var(--c-ink-soft);
  white-space: nowrap;
}

.table-wrap { overflow-x: auto; }
.ledger {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.ledger thead th {
  text-align: left;
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--c-ink-soft);
  font-weight: 600;
  padding: 6px 10px;
  border-bottom: 1px solid var(--c-line);
}
.ledger tbody td {
  padding: 9px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--c-line) 55%, transparent);
  vertical-align: top;
}
.ledger tfoot td {
  padding: 10px;
  border-top: 2px solid var(--c-line);
  font-weight: 700;
  font-size: 13px;
}
.c-num { text-align: right; white-space: nowrap; }
.c-concept { width: 58%; }
.c-total { color: var(--c-ink); font-weight: 700; }
.concept { display: block; font-weight: 500; }
.line-note {
  display: block;
  font-size: 11px;
  color: var(--c-ink-soft);
  margin-top: 2px;
}
.disc {
  display: inline-block;
  margin-top: 4px;
  font-size: 10px;
  color: var(--c-good);
  border: 1px solid color-mix(in srgb, var(--c-good) 50%, transparent);
  border-radius: 999px;
  padding: 1px 7px;
}
.ledger tfoot .c-total { color: var(--c-primary); }

/* Totales */
.summary {
  display: flex;
  gap: 24px;
  align-items: stretch;
  margin-top: 38px;
  flex-wrap: wrap;
}
.totals {
  flex: 1 1 340px;
  border: 1px solid var(--c-line);
  border-radius: 14px;
  padding: 20px 22px;
  background: color-mix(in srgb, var(--c-bg) 55%, transparent);
}
.totals__table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.totals__table td { padding: 7px 0; }
.totals__table .t-label { color: var(--c-ink-soft); font-size: 13px; }
.totals__table .t-value { text-align: right; font-weight: 600; }
.totals__table .is-net td {
  border-top: 1px solid var(--c-line);
  padding-top: 12px;
  color: var(--c-ink);
  font-weight: 700;
  font-size: 15px;
}
.totals__table .is-net .t-label { color: var(--c-ink); }
.grand {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 2px solid var(--c-primary);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.grand__label {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 11px;
  color: var(--c-ink-soft);
}
.grand__value {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 30px;
  color: var(--c-primary);
  letter-spacing: -0.01em;
}

.perpax {
  flex: 0 1 200px;
  border: 1px solid var(--c-line);
  border-radius: 14px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  background: linear-gradient(160deg, color-mix(in srgb, var(--c-secondary) 16%, transparent), transparent);
}
.perpax__label {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 10px;
  color: var(--c-ink-soft);
}
.perpax__value {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 26px;
  margin: 8px 0 4px;
}
.perpax__sub { font-size: 11px; color: var(--c-ink-soft); }

/* Opciones */
.delta-up { color: var(--c-secondary); font-weight: 700; }
.delta-down { color: var(--c-good); font-weight: 700; }

/* Pie */
.doc-foot {
  margin-top: 40px;
  padding-top: 22px;
  border-top: 1px solid var(--c-line);
}
.doc-foot__contact {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  align-items: baseline;
  font-size: 13px;
}
.doc-foot__contact strong { color: var(--c-primary); }
.doc-foot__contact span { color: var(--c-ink-soft); }
.doc-foot__note {
  margin-top: 12px;
  font-size: 11px;
  color: var(--c-ink-soft);
  line-height: 1.6;
}

/* Impresión — fondo blanco, acentos de marca, sin cortes de tabla */
@media print {
  @page { size: A4; margin: 14mm; }
  body {
    background: #fff;
    color: #14141c;
    padding: 0;
    font-size: 11px;
  }
  .sheet {
    max-width: none;
    width: 100%;
    background: #fff;
    border: none;
    border-radius: 0;
    box-shadow: none;
    padding: 0;
  }
  .doc-head, .meta, .doc-foot { border-color: #ddd; }
  .meta__item dt, .brandmark__tag, .group__share, .line-note,
  .totals__table .t-label, .perpax__sub, .doc-foot__note,
  .doc-foot__contact span, .ledger thead th { color: #666; }
  .brandmark__name, .doc-head__label h1, .group__name, .meta__item dd,
  .c-total, .totals__table .is-net .t-label { color: #14141c; }
  .brandmark { background: var(--c-primary); color: #fff; }
  .kicker, .group__name::before, .grand__value,
  .ledger tfoot .c-total, .doc-foot__contact strong { color: var(--c-primary) !important; }
  .grand { border-top-color: var(--c-primary); }
  .ledger tbody td { border-bottom-color: #e6e6e6; }
  .ledger tfoot td, .ledger thead th { border-color: #ccc; }
  .totals, .perpax {
    border-color: #ddd;
    background: #fafafa;
  }
  .group, .options, .perpax, .totals, .article { break-inside: avoid; page-break-inside: avoid; }
  .group__head { break-after: avoid; page-break-after: avoid; }
  tr, td, th { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
  tfoot { display: table-row-group; }
}`;
}

/* --------------------------------------------------------------------- CSV */

function renderCsv(proposal, budget, cur) {
  const BOM = '﻿';
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const num = (n) => money(n, cur, { symbol: false });
  const rows = [];

  rows.push(['rubro', 'concepto', 'cantidad', 'unitario', 'total']);

  for (const g of budget.groups || []) {
    for (const l of g.lines || []) {
      rows.push([g.name, l.concept, formatQtyCsv(l.qty), num(l.unit), num(l.total)]);
    }
    rows.push([g.name, `Subtotal ${g.name}`, '', '', num(g.subtotal)]);
  }

  // Filas de totales al final.
  rows.push([]);
  rows.push(['', 'Subtotal líneas', '', '', num(budget.linesSubtotal)]);
  if (budget.contingencyRate) rows.push(['', `Contingencia (${pct(budget.contingencyRate)})`, '', '', num(budget.contingencyAmt)]);
  if (budget.marginRate) rows.push(['', `Margen (${pct(budget.marginRate)})`, '', '', num(budget.marginAmt)]);
  rows.push(['', 'Neto', '', '', num(budget.net)]);
  if (budget.iva) rows.push(['', `IVA (${pct(budget.ivaRate)})`, '', '', num(budget.ivaAmt)]);
  rows.push(['', 'TOTAL', '', '', num(budget.total)]);
  if (budget.perPax != null) rows.push(['', 'Neto por persona', '', '', num(budget.perPax)]);

  if (budget.options && budget.options.length) {
    rows.push([]);
    rows.push(['opcion', 'nota', 'delta', 'neto', 'total']);
    for (const o of budget.options) {
      rows.push([o.name, o.note || '', pct(o.deltaPct), num(o.net), num(o.total)]);
    }
  }

  const body = rows.map((r) => r.map(esc).join(',')).join('\r\n');
  return BOM + body + '\r\n';
}

function formatQtyCsv(q) {
  if (q == null) return '1';
  return String(q);
}

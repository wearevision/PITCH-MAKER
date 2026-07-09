// Tests de la spine y renderers. Correr: node --test  (o npm test)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { money, lineTotal, round, pct } from '../engine/lib/money.js';
import { esc } from '../engine/lib/html.js';
import { resolveBrand, toCssVars, brandGradient } from '../engine/lib/brand.js';
import { validate, loadProposal } from '../engine/lib/schema.js';
import { computeBudget } from '../engine/budget/model.js';

const DEMO = 'proposals/nua-aniversario-25/proposal.json';

test('money: formato CLP con separador de miles y símbolo', () => {
  assert.equal(money(459156264, 'CLP'), '$459.156.264');
  assert.equal(money(0, 'CLP'), '$0');
  assert.equal(money(1000, 'CLP', { symbol: false }), '1.000');
});

test('money: lineTotal aplica qty, days y descuento', () => {
  assert.equal(lineTotal({ qty: 3, unit: 1600000 }), 4800000);
  assert.equal(lineTotal({ qty: 1200, unit: 42000 }), 50400000);
  assert.equal(lineTotal({ qty: 2, unit: 100, days: 3 }), 600);
  assert.equal(lineTotal({ qty: 1, unit: 1000, discount: 0.1 }), 900);
});

test('money: round estable', () => {
  assert.equal(round(1.005, 2), 1.01);
  assert.equal(round(2.5, 0), 3);
  assert.equal(pct(0.19), '19%');
});

test('html: esc neutraliza inyección', () => {
  assert.equal(esc('<script>x</script>'), '&lt;script&gt;x&lt;/script&gt;');
  assert.equal(esc('a & "b" \'c\''), 'a &amp; &quot;b&quot; &#39;c&#39;');
});

test('brand: resolveBrand fusiona defaults y toCssVars emite variables', () => {
  const b = resolveBrand({ name: 'X', colors: { primary: '#fff' } });
  assert.equal(b.colors.primary, '#fff');
  assert.ok(b.colors.bg, 'hereda color de fondo por defecto');
  const css = toCssVars(b);
  assert.match(css, /--c-primary:\s*#fff/);
  assert.match(css, /--font-body:/);
  assert.match(brandGradient(b), /linear-gradient/);
});

test('schema: validate rechaza requeridos faltantes', () => {
  const res = validate({ meta: {}, brand: {} });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('meta.slug')));
});

test('schema: la propuesta demo es válida', async () => {
  const { ok, errors } = await loadProposal(DEMO);
  assert.equal(ok, true, 'errores: ' + errors.join('; '));
});

test('budget: computeBudget calcula totales determinísticos de la demo', async () => {
  const { proposal } = await loadProposal(DEMO);
  const c = computeBudget(proposal.budget, { audienceSize: proposal.brief.audience.size });
  assert.equal(c.linesSubtotal, 328100000);
  assert.equal(c.contingencyAmt, 16405000); // 5%
  assert.equal(c.marginAmt, 41340600); // 12% sobre subtotal+contingencia
  assert.equal(c.net, 385845600);
  assert.equal(c.ivaAmt, 73310664); // 19%
  assert.equal(c.total, 459156264);
  assert.equal(c.perPax, 321538); // net / 1200
  // participaciones suman ~1
  const share = c.groups.reduce((s, g) => s + g.share, 0);
  assert.ok(Math.abs(share - 1) < 0.001);
  // opciones derivan del total
  const esencial = c.options.find((o) => /Esencial/.test(o.name));
  assert.equal(esencial.total, round(459156264 * 0.82, 0));
});

test('budget: sin IVA cuando iva:false', () => {
  const c = computeBudget({ currency: 'CLP', iva: false, groups: [{ id: 'g', name: 'G', lines: [{ concept: 'x', unit: 1000 }] }] });
  assert.equal(c.ivaAmt, 0);
  assert.equal(c.total, c.net);
});

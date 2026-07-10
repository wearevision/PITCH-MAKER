#!/usr/bin/env node
// build.js — CLI del PITCH-MAKER. Ensambla todos los artefactos desde proposal.json.
//
// Uso:
//   node engine/build.js proposals/<slug>/proposal.json
//   node engine/build.js --all
//
// Contrato de renderers (todos en engine/<mod>/render.js):
//   export function renderX(proposal, ctx) -> Record<relpath, content>
//   ctx = { budget: ComputedBudget, brand: ResolvedBrand }
// Cada renderer devuelve un mapa {rutaRelativa: contenido}. build.js los escribe
// bajo proposals/<slug>/dist/.

import { readdir, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { loadProposal } from './lib/schema.js';
import { computeBudget } from './budget/model.js';
import { resolveBrand } from './lib/brand.js';
import { money } from './lib/money.js';

const RENDERERS = [
  ['budget', 'renderBudget'],
  ['deck', 'renderDeck'],
  ['scene3d', 'renderScene3d'],
  ['site', 'renderSite'],
];

async function loadRenderer(mod, fn) {
  const path = new URL(`./${mod}/render.js`, import.meta.url);
  try {
    const m = await import(path.href);
    if (typeof m[fn] !== 'function') return null;
    return m[fn];
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') return null;
    throw e;
  }
}

async function buildOne(proposalPath) {
  const { proposal, ok, errors, warnings } = await loadProposal(proposalPath);
  for (const w of warnings) console.warn(`  ⚠  ${w}`);
  if (!ok) {
    console.error(`✗ ${proposalPath} inválido:`);
    for (const e of errors) console.error(`    ✗ ${e}`);
    process.exitCode = 1;
    return;
  }

  const brand = resolveBrand(proposal.brand);
  const budget = computeBudget(proposal.budget, { audienceSize: proposal.brief?.audience?.size });
  const ctx = { budget, brand };

  const outDir = join(dirname(proposalPath), 'dist');
  if (existsSync(outDir)) await rm(outDir, { recursive: true, force: true });

  const files = {};
  const done = [];
  const skipped = [];
  for (const [mod, fn] of RENDERERS) {
    const render = await loadRenderer(mod, fn);
    if (!render) {
      skipped.push(mod);
      continue;
    }
    let out;
    try {
      out = render(proposal, ctx);
    } catch (e) {
      console.error(`  ✗ renderer ${mod} lanzó: ${e.message}`);
      process.exitCode = 1;
      continue;
    }
    for (const [rel, content] of Object.entries(out || {})) files[rel] = content;
    done.push(mod);
  }

  // Índice raíz de la propuesta (links a cada artefacto)
  files['index.html'] = indexPage(proposal, budget, done);

  for (const [rel, content] of Object.entries(files)) {
    const dest = join(outDir, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, content);
  }

  console.log(`\n✔ ${proposal.meta.client} — ${proposal.meta.project}`);
  console.log(`  Total propuesta: ${money(budget.total, budget.currency)} (IVA incl.)`);
  console.log(`  Artefactos: ${done.join(', ') || '—'}${skipped.length ? `  ·  pendientes: ${skipped.join(', ')}` : ''}`);
  console.log(`  Salida: ${outDir}/`);
  for (const rel of Object.keys(files).sort()) console.log(`    · ${rel}`);
}

function indexPage(p, budget, done) {
  const links = [
    ['site/index.html', 'Microsite interactivo', 'La propuesta como experiencia web navegable'],
    ['deck/index.html', 'Deck (Adobe Express / PPTX)', 'Presentación editable, exportable a PPTX'],
    ['scene3d/index.html', 'Escenografía 3D', 'Render interactivo del montaje en three.js'],
    ['budget/presupuesto.html', 'Presupuesto', 'Detalle de rubros, IVA y totales'],
  ].filter(([path]) => done.includes(path.split('/')[0]));
  const c = resolveBrand(p.brand).colors;
  const cards = links
    .map(
      ([href, title, sub]) => `<a class="card" href="${href}">
      <h2>${title}</h2><p>${sub}</p><span>Abrir →</span></a>`
    )
    .join('\n');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p.meta.client} · ${p.meta.project}</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:${c.bg};color:${c.ink};padding:6vw 6vw 10vw}
header{max-width:900px;margin:0 auto 3rem}
.kicker{color:${c.primary};letter-spacing:.28em;text-transform:uppercase;font-size:.72rem;font-weight:700}
h1{font-size:clamp(2rem,6vw,4rem);line-height:1.02;margin:.4rem 0}
.lead{color:${c.inkSoft};max-width:52ch;font-size:1.08rem}
.grid{max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem}
.card{display:block;padding:1.6rem;border:1px solid ${c.line};border-radius:18px;text-decoration:none;color:${c.ink};background:${c.bgAlt};transition:.2s}
.card:hover{transform:translateY(-4px);border-color:${c.primary}}
.card h2{margin:0 0 .3rem;font-size:1.15rem}
.card p{margin:0 0 1rem;color:${c.inkSoft};font-size:.92rem}
.card span{color:${c.primary};font-weight:700;font-size:.9rem}
footer{max-width:900px;margin:3rem auto 0;color:${c.inkSoft};font-size:.8rem}
</style></head><body>
<header>
<div class="kicker">Propuesta · ${p.meta.tender?.id || ''}</div>
<h1>${p.meta.client} — ${p.meta.project}</h1>
<p class="lead">${p.concept?.statement || ''}</p>
</header>
<main class="grid">${cards}</main>
<footer>${p.contact?.org || ''} · ${p.contact?.email || ''} · Generado con PITCH-MAKER</footer>
</body></html>`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--all') {
    const base = 'proposals';
    const slugs = existsSync(base) ? await readdir(base) : [];
    let n = 0;
    for (const slug of slugs) {
      const pp = join(base, slug, 'proposal.json');
      if (existsSync(pp)) {
        await buildOne(pp);
        n++;
      }
    }
    if (!n) console.error('No se encontraron propuestas en proposals/*/proposal.json');
    return;
  }
  const proposalPath = args[0];
  if (!proposalPath) {
    console.error('uso: node engine/build.js <proposal.json> | --all');
    process.exit(2);
  }
  await buildOne(resolve(proposalPath));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

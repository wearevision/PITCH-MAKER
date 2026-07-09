#!/usr/bin/env node
// assemble.js — ensambla un proposal.json desde un "shell" (meta/brand/program/team/
// timeline/differentiators/contact) + las secciones que generan los agentes pitch-*
// (brief, concept, budget, scenography). Limpia entidades HTML y valida.
//
// Uso:
//   node engine/assemble.js --out proposals/<slug>/proposal.json \
//        --shell shell.json --brief brief.json --concept concept.json \
//        --budget budget.json --scenography sceno.json
//
// Cada archivo de sección puede ser el objeto JSON de esa sección, o un objeto que lo
// contenga bajo su clave (ej. { "brief": {...} }). Los valores string se des-escapan
// de entidades HTML (los agentes a veces escapan "&amp;") porque los renderers ya
// escapan al pintar.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { validate } from './lib/schema.js';

const SECTION_KEYS = ['brief', 'concept', 'budget', 'scenography', 'program', 'meta', 'brand', 'team', 'timeline', 'differentiators', 'contact'];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i];
  }
  return out;
}

function unesc(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'");
}
function deepClean(x) {
  if (typeof x === 'string') return unesc(x);
  if (Array.isArray(x)) return x.map(deepClean);
  if (x && typeof x === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(x)) o[k] = deepClean(v);
    return o;
  }
  return x;
}

// Extrae la sección `key` de un archivo: acepta el objeto directo o { key: obj }.
function loadSection(path, key) {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  const obj = j && typeof j === 'object' && j[key] && !SECTION_KEYS.every((k) => k in j) ? j[key] : j;
  return deepClean(obj);
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.out || !a.shell) {
    console.error('uso: node engine/assemble.js --out <proposal.json> --shell <shell.json> [--brief b.json --concept c.json --budget bg.json --scenography s.json]');
    process.exit(2);
  }
  const shell = deepClean(JSON.parse(readFileSync(a.shell, 'utf8')));
  const proposal = { ...shell };
  for (const key of ['brief', 'concept', 'budget', 'scenography', 'program']) {
    if (a[key]) proposal[key] = loadSection(a[key], key);
  }
  // Orden canónico de claves (cosmético, para diffs legibles).
  const ORDER = ['meta', 'brand', 'brief', 'concept', 'program', 'scenography', 'budget', 'team', 'timeline', 'differentiators', 'contact'];
  const ordered = {};
  for (const k of ORDER) if (k in proposal) ordered[k] = proposal[k];
  for (const k of Object.keys(proposal)) if (!(k in ordered)) ordered[k] = proposal[k];

  const res = validate(ordered);
  for (const w of res.warnings) console.warn(`  ⚠  ${w}`);
  if (!res.ok) {
    console.error('✗ proposal inválido:');
    for (const e of res.errors) console.error(`    ✗ ${e}`);
    process.exit(1);
  }
  mkdirSync(dirname(a.out), { recursive: true });
  writeFileSync(a.out, JSON.stringify(ordered, null, 2) + '\n');
  console.log(`✔ ${a.out} ensamblado y válido${res.warnings.length ? ` (${res.warnings.length} warnings)` : ''}`);
}

main();

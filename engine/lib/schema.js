// schema.js — contrato de datos de una propuesta (single source of truth).
// Sin librerías: typedefs JSDoc + validate() propio + CLI de validación.
//
// Uso CLI:  node engine/lib/schema.js proposals/<slug>/proposal.json

import { readFile } from 'node:fs/promises';

/**
 * @typedef {Object} Brand
 * @property {string} name
 * @property {string} [tagline]
 * @property {Record<string,string>} [colors]
 * @property {{display?:string, body?:string, mono?:string}} [fonts]
 * @property {number} [radius]
 */

/**
 * @typedef {Object} BudgetLine
 * @property {string} concept       Descripción de la línea
 * @property {number} [qty]         Cantidad (default 1)
 * @property {number} unit          Costo unitario en la moneda
 * @property {number} [days]        Días/jornadas (default 1)
 * @property {number} [discount]    Descuento 0..1 (default 0)
 * @property {string} [note]        Nota/observación
 */

/**
 * @typedef {Object} BudgetGroup
 * @property {string} id
 * @property {string} name          Rubro (Producción, Escenografía, ...)
 * @property {BudgetLine[]} lines
 */

/**
 * @typedef {Object} Budget
 * @property {string} currency      "CLP" | "USD" | "UF"
 * @property {boolean} [iva]        Aplica IVA (default true para CLP)
 * @property {number} [ivaRate]     Override tasa IVA (default 0.19)
 * @property {number} [contingency] Fracción 0..1 sobre subtotal (default 0)
 * @property {number} [margin]      Fracción 0..1 de margen agencia (default 0)
 * @property {BudgetGroup[]} groups
 * @property {{name:string, deltaPct?:number, note?:string}[]} [options]
 */

/**
 * @typedef {Object} Zone   Zona escenográfica (consumida por el motor 3D)
 * @property {string} id
 * @property {string} name
 * @property {string} [desc]
 * @property {'stage'|'stand'|'lounge'|'entrance'|'screen'|'bar'|'installation'} kind
 * @property {[number,number,number]} pos     posición [x,y,z] en metros
 * @property {[number,number,number]} size    dimensiones [w,h,d] en metros
 * @property {string} [color]                 color hex override
 */

/**
 * @typedef {Object} Proposal
 * @property {Object} meta
 * @property {string} meta.slug
 * @property {string} meta.client
 * @property {string} meta.project
 * @property {{id:string, entity:string, dueDate?:string}} meta.tender
 * @property {string} meta.currency
 * @property {string} meta.date
 * @property {string} [meta.version]
 * @property {Brand} brand
 * @property {Object} brief
 * @property {string} brief.summary
 * @property {string[]} brief.objectives
 * @property {{size:number, profile:string}} brief.audience
 * @property {{name:string, city:string, date:string, format:string}} brief.venue
 * @property {string[]} brief.scope
 * @property {{criterion:string, weight:number}[]} [brief.evaluation]
 * @property {Object} concept
 * @property {string} concept.name
 * @property {string} concept.statement
 * @property {{title:string, desc:string, icon?:string}[]} concept.pillars
 * @property {string[]} [concept.narrative]
 * @property {{time:string, title:string, desc?:string}[]} program
 * @property {Object} scenography
 * @property {string} scenography.summary
 * @property {Zone[]} scenography.zones
 * @property {Budget} budget
 * @property {{role:string, name:string, bio?:string}[]} team
 * @property {{phase:string, weeks:string, tasks:string[]}[]} timeline
 * @property {{title:string, desc:string}[]} differentiators
 * @property {{name:string, email:string, phone?:string, org:string}} contact
 */

const REQUIRED = [
  'meta.slug',
  'meta.client',
  'meta.project',
  'brand.name',
  'brief.summary',
  'concept.name',
  'concept.statement',
  'budget.currency',
  'budget.groups',
  'scenography.zones',
];

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/**
 * Valida una propuesta. Devuelve { ok, errors:string[], warnings:string[] }.
 * @param {any} p
 */
export function validate(p) {
  const errors = [];
  const warnings = [];
  if (!p || typeof p !== 'object') {
    return { ok: false, errors: ['proposal no es un objeto'], warnings };
  }
  for (const path of REQUIRED) {
    const v = get(p, path);
    if (v === undefined || v === null || (Array.isArray(v) && v.length === 0) || v === '') {
      errors.push(`falta campo requerido: ${path}`);
    }
  }
  // Chequeos de presupuesto
  const groups = get(p, 'budget.groups') || [];
  groups.forEach((g, i) => {
    if (!g.name) errors.push(`budget.groups[${i}].name vacío`);
    if (!Array.isArray(g.lines) || g.lines.length === 0) {
      warnings.push(`budget.groups[${i}] (${g.name || '?'}) sin líneas`);
    }
    (g.lines || []).forEach((l, j) => {
      if (typeof l.unit !== 'number') errors.push(`budget.groups[${i}].lines[${j}].unit no es número`);
      if (!l.concept) warnings.push(`budget.groups[${i}].lines[${j}] sin concepto`);
    });
  });
  // Zonas 3D
  const zones = get(p, 'scenography.zones') || [];
  zones.forEach((z, i) => {
    if (!Array.isArray(z.pos) || z.pos.length !== 3) errors.push(`scenography.zones[${i}].pos debe ser [x,y,z]`);
    if (!Array.isArray(z.size) || z.size.length !== 3) errors.push(`scenography.zones[${i}].size debe ser [w,h,d]`);
  });
  // Criterios de evaluación deberían sumar ~1
  const evalc = get(p, 'brief.evaluation');
  if (Array.isArray(evalc) && evalc.length) {
    const sum = evalc.reduce((s, e) => s + (e.weight || 0), 0);
    if (Math.abs(sum - 1) > 0.011) warnings.push(`brief.evaluation pesos suman ${sum.toFixed(2)}, se esperaba 1.00`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

/** Carga y valida un archivo de propuesta. */
export async function loadProposal(path) {
  const raw = await readFile(path, 'utf8');
  const p = JSON.parse(raw);
  const res = validate(p);
  return { proposal: p, ...res };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2];
  if (!path) {
    console.error('uso: node engine/lib/schema.js <proposal.json>');
    process.exit(2);
  }
  const { ok, errors, warnings } = await loadProposal(path);
  for (const w of warnings) console.warn(`⚠  ${w}`);
  if (ok) {
    console.log(`✔ ${path} válido${warnings.length ? ` (${warnings.length} warnings)` : ''}`);
  } else {
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error(`\n✗ ${errors.length} errores`);
    process.exit(1);
  }
}

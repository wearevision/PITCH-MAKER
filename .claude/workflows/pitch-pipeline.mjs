// pitch-pipeline — workflow reutilizable del PITCH-MAKER.
// Corre el pipeline multiagéntico pitch-*: bases → brief → concept → (budget + scenography).
//
// Uso (desde Claude): Workflow({ name: 'pitch-pipeline', args: { brief: 'briefs/LIC-XXXX.md', referencial: '600-780M IVA incl.' } })
// Devuelve { brief, concept, budget, scenography }. Luego:
//   1) guarda cada sección en proposals/<slug>/sections/*.json (o directo),
//   2) node engine/assemble.js --out proposals/<slug>/proposal.json --shell <shell.json> --brief ... --concept ... --budget ... --scenography ...
//   3) node engine/build.js proposals/<slug>/proposal.json
export const meta = {
  name: 'pitch-pipeline',
  description: 'Pipeline multiagéntico pitch-*: bases de licitación → brief → concept → (budget + scenography), como JSON validado',
  phases: [
    { title: 'Brief' },
    { title: 'Concepto' },
    { title: 'Budget+3D' },
  ],
};

const briefPath = (args && args.brief) || 'briefs/LIC-2027-RAICES.md';
const referencial = (args && args.referencial) || 'ver las bases';
const REF = `Formato: lee proposals/nua-aniversario-25/proposal.json (forma exacta de cada sección) y engine/lib/schema.js (contrato). Las bases están en ${briefPath}.`;

const BRIEF_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  summary: { type: 'string' }, objectives: { type: 'array', items: { type: 'string' }, minItems: 4 },
  audience: { type: 'object', additionalProperties: false, properties: { size: { type: 'number' }, profile: { type: 'string' } }, required: ['size', 'profile'] },
  venue: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, city: { type: 'string' }, date: { type: 'string' }, format: { type: 'string' } }, required: ['name', 'city', 'date', 'format'] },
  scope: { type: 'array', items: { type: 'string' }, minItems: 5 },
  evaluation: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { criterion: { type: 'string' }, weight: { type: 'number' } }, required: ['criterion', 'weight'] } },
}, required: ['summary', 'objectives', 'audience', 'venue', 'scope', 'evaluation'] };

const CONCEPT_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  name: { type: 'string' }, statement: { type: 'string' },
  pillars: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, desc: { type: 'string' }, icon: { type: 'string' } }, required: ['title', 'desc', 'icon'] } },
  narrative: { type: 'array', items: { type: 'string' }, minItems: 4 },
}, required: ['name', 'statement', 'pillars', 'narrative'] };

const BUDGET_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  currency: { type: 'string' }, iva: { type: 'boolean' }, ivaRate: { type: 'number' }, contingency: { type: 'number' }, margin: { type: 'number' },
  groups: { type: 'array', minItems: 5, items: { type: 'object', additionalProperties: false, properties: {
    id: { type: 'string' }, name: { type: 'string' },
    lines: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, properties: { concept: { type: 'string' }, qty: { type: 'number' }, unit: { type: 'number' }, days: { type: 'number' }, note: { type: 'string' } }, required: ['concept', 'unit'] } },
  }, required: ['id', 'name', 'lines'] } },
  options: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, deltaPct: { type: 'number' }, note: { type: 'string' } }, required: ['name', 'deltaPct'] } },
}, required: ['currency', 'iva', 'ivaRate', 'contingency', 'margin', 'groups', 'options'] };

const SCENO_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  summary: { type: 'string' },
  zones: { type: 'array', minItems: 6, items: { type: 'object', additionalProperties: false, properties: {
    id: { type: 'string' }, name: { type: 'string' }, desc: { type: 'string' },
    kind: { type: 'string', enum: ['stage', 'stand', 'lounge', 'entrance', 'screen', 'bar', 'installation'] },
    pos: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
    size: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
    color: { type: 'string' },
  }, required: ['id', 'name', 'kind', 'pos', 'size'] } },
}, required: ['summary', 'zones'] };

phase('Brief');
const brief = await agent(
  `Analista de brief. Lee ${briefPath} y produce el objeto \`brief\` de proposal.json. ${REF} Los pesos de evaluation suman exactamente 1.0. Devuelve SOLO el objeto brief (JSON crudo, sin entidades HTML).`,
  { label: 'brief-analyst', phase: 'Brief', agentType: 'pitch-brief-analyst', schema: BRIEF_SCHEMA },
);

phase('Concepto');
const concept = await agent(
  `Director creativo. BRIEF:\n${JSON.stringify(brief)}\nCrea el objeto \`concept\` (name, statement, 4 pillars con icon unicode, narrative[] 4-6 beats), distintivo y alineado a los criterios de evaluación. ${REF} Devuelve SOLO el objeto concept (JSON crudo).`,
  { label: 'creative-director', phase: 'Concepto', agentType: 'pitch-creative-director', schema: CONCEPT_SCHEMA },
);

phase('Budget+3D');
const [budget, scenography] = await parallel([
  () => agent(
    `Ingeniero de presupuesto. BRIEF:\n${JSON.stringify(brief)}\nCONCEPT:\n${JSON.stringify(concept)}\nConstruye el objeto \`budget\` en CLP cubriendo cada ítem del scope. Presupuesto referencial de las bases: ${referencial} — tu total DEBE caer dentro (dimensiona: suma_de_líneas ≈ techo/1.40). Incluye 2 options. ${REF} Devuelve SOLO el objeto budget (JSON crudo, sin entidades HTML).`,
    { label: 'budget-engineer', phase: 'Budget+3D', agentType: 'pitch-budget-engineer', schema: BUDGET_SCHEMA },
  ),
  () => agent(
    `Escenógrafo. CONCEPT:\n${JSON.stringify(concept)}\nDiseña el objeto \`scenography\` (summary + zones[]) para el motor 3D three.js. pos[x,y,z] y size[w,h,d] en METROS, distribuidas por el recinto SIN solaparse. ${REF} Devuelve SOLO el objeto scenography (JSON crudo).`,
    { label: 'scenographer', phase: 'Budget+3D', agentType: 'pitch-scenographer', schema: SCENO_SCHEMA },
  ),
]);

log('Pipeline pitch completo. Guarda las secciones y corre engine/assemble.js + engine/build.js.');
return { brief, concept, budget, scenography };

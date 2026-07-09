# CLAUDE.md — guía para agentes en PITCH-MAKER

PITCH-MAKER genera 4 entregables (presupuesto, deck, escenografía 3D, microsite) desde **un solo** `proposals/<slug>/proposal.json`. **Los agentes escriben datos (JSON). El código escribe píxeles.** No maquetes a mano lo que un renderer determinístico ya produce.

## Comandos

```bash
node engine/build.js proposals/<slug>/proposal.json   # build de una propuesta → dist/
node engine/build.js --all                             # build de todas las propuestas
node engine/lib/schema.js proposals/<slug>/proposal.json   # validar esquema
node engine/serve.js proposals/<slug>/dist 5173        # previsualizar
```
Scripts npm: `build`, `build:all`, `validate`, `serve`, `test` (usa `node --test`). Node >= 20, ESM nativo, **sin dependencias ni paso de bundling**.

## El contrato de renderer

Todo renderer vive en `engine/<mod>/render.js` y cumple:

```js
export function renderX(proposal, ctx) // -> Record<relpath, content>
// ctx = { budget: ComputedBudget, brand: ResolvedBrand }
```

Devuelve un mapa `{ rutaRelativa: contenido }`; `build.js` lo escribe bajo `dist/`. Módulos registrados en `RENDERERS` (`budget`, `deck`, `scene3d`, `site`). Un renderer ausente se marca "pendiente" y el build sigue. Un renderer **genérico**: no hardcodees texto de una propuesta — todo sale de `proposal`.

## La spine (`engine/lib/*`) — no romper

- `schema.js` — contrato de datos (typedefs JSDoc), `validate()`, `loadProposal()`. Campos requeridos en `REQUIRED`.
- `brand.js` — design tokens. `resolveBrand()`, `toCssVars()`, `brandGradient()`. Todos los artefactos comparten estos tokens.
- `money.js` — aritmética/formato CLP. `money()`, `round()`, `lineTotal()`. Toda cifra pasa por aquí.
- `budget/model.js` — `computeBudget()`: **fuente única** de los totales (subtotales, contingencia, margen, IVA, per-pax, opciones). Deck, site y budget la consumen; nunca recalcules totales aparte.

Cambiar una firma de la spine rompe los 4 renderers a la vez. Si tocas la spine, corre el build de NÜA y valida.

## Flujo gstack

Marco de sprint `Think → Plan → Build → Review → Test → Ship → Reflect` (skill `gstack-process`). Orquestador (skill `pitch-orchestrate`) = dueño del brief: lee `briefs/*.md`, reparte por sección, ensambla el JSON, corre el build, entrega. Una skill `pitch-*` por sección: `pitch-brief`, `pitch-concept`, `pitch-budget`, `pitch-3d`, `pitch-deck`, `pitch-site`.

## Convención caveman

Handoffs y notas **agente↔agente** en estilo comprimido (~65% menos tokens, misma substancia; skill `caveman`). **NO** aplicar a prosa de cara al cliente: `concept.statement`, copy del deck, texto del microsite — eso va en español pulido y completo.

## Subagentes: cavecrew vs pitch

- **`pitch-*`** (creative-director, budget-engineer, brief-analyst, deck-designer): producen **contenido de la propuesta** como JSON válido de una sección. Úsalos para llenar `proposal.json`.
- **`cavecrew-*`** (investigator, builder, reviewer): trabajo **mecánico sobre el repo/código**. `investigator` localiza símbolos (path:line), `builder` edita ≤2 archivos con scope conocido (responde `too-big.` si excede), `reviewer` audita diffs. Úsalos para tocar `engine/` o el repo, no para redactar propuesta.

## Reglas

1. **No rompas la spine.** Cambios en `schema.js`/`brand.js`/`money.js`/`budget/model.js` se validan con build + validate.
2. **Renderiza genérico desde `proposal`.** Nada de datos de una propuesta hardcodeados en `engine/`.
3. **Un solo JSON = fuente de verdad.** Si un artefacto muestra algo, debe venir de `proposal.json`.
4. **Cero deps y self-contained** donde el destino lo exige (deck → Adobe Express; ver ARCHITECTURE.md).
5. Tras editar, **corre el build** de la propuesta afectada y **valida** el esquema.

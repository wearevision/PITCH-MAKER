# Arquitectura — PITCH-MAKER

PITCH-MAKER es un pipeline **data-driven** y **determinístico**: los agentes producen datos compactos; el código produce los píxeles. Todo converge en un único `proposals/<slug>/proposal.json` (single source of truth) del que renderers puros derivan cuatro artefactos.

## Pipeline

```
   bases de licitación
   (briefs/*.md)
          │
          ▼
   ┌─────────────┐   agentes / skills (pitch-*)
   │   brief     │   producen DATOS compactos (JSON), no HTML
   └─────────────┘
          │
          ├──────────────┬──────────────┐
          ▼              ▼              ▼
     ┌─────────┐   ┌──────────┐   ┌────────────┐
     │ concept │   │  budget  │   │ scenography│
     └─────────┘   └──────────┘   └────────────┘
          │              │              │
          └──────────────┼──────────────┘
                         ▼
             ╔═══════════════════════════╗
             ║   proposal.json           ║   ← SINGLE SOURCE OF TRUTH
             ║   (validado por schema.js)║
             ╚═══════════════════════════╝
                         │
             engine/build.js  +  ctx = { budget, brand }
                         │
      ┌──────────┬───────┴────┬────────────┐
      ▼          ▼            ▼            ▼
  renderBudget renderDeck  renderScene3d renderSite   ← el CÓDIGO produce píxeles
      │          │            │            │
      ▼          ▼            ▼            ▼
 presupuesto   deck        escenografía  microsite
 HTML/CSV/JSON Express/PPTX  3D three.js   web desplegable
```

`build.js` calcula una sola vez `ctx = { budget: computeBudget(...), brand: resolveBrand(...) }` y se lo pasa a cada renderer, garantizando que los cuatro artefactos comparten los mismos totales y los mismos design tokens.

## Por qué data-driven (y por qué ahorra tokens)

- **Separación datos ↔ presentación.** El modelo decide *qué* dice la propuesta (números, concepto, zonas); el código decide *cómo* se ve. El HTML/CSS/JS repetitivo nunca consume tokens del modelo.
- **Coherencia estructural.** Un cambio en `proposal.json` se propaga a los 4 entregables en un solo build — imposible que el deck y el presupuesto se contradigan.
- **Determinismo.** Mismo JSON ⇒ mismo output, byte a byte. Reproducible, auditable, versionable en git.
- **Eficiencia de tokens.** El gasto se concentra en las decisiones de alto valor (creatividad, cifras) y en handoffs comprimidos (convención `caveman`). La maquetación es gratis.

## Esquema de datos

Definido en `engine/lib/schema.js` (typedefs JSDoc + `validate()`). Un `Proposal` agrupa:

- `meta` — slug, cliente, proyecto, licitación (`tender`), moneda, fecha, versión.
- `brand` — nombre, tagline, `colors`, `fonts`, `radius` (design tokens; ver `brand.js`).
- `brief` — summary, objectives, `audience{size,profile}`, `venue`, `scope[]`, `evaluation[{criterion,weight}]` (los pesos deberían sumar 1).
- `concept` — name, statement, 4 `pillars`, `narrative[]`.
- `program` — hitos `{time,title,desc}`.
- `scenography` — summary + `zones[]`: `{ id, name, kind, pos[x,y,z], size[w,h,d], color }` en **metros** (consumidas por el motor 3D).
- `budget` — `currency`, `iva`, `ivaRate`, `contingency`, `margin`, `groups[{lines[]}]`, `options[]`. Ver el modelo abajo.
- `team`, `timeline`, `differentiators`, `contact`.

**Campos requeridos** (`REQUIRED` en `schema.js`): `meta.slug/client/project`, `brand.name`, `brief.summary`, `concept.name/statement`, `budget.currency/groups`, `scenography.zones`. El validador además emite *warnings* (líneas sin concepto, pesos de evaluación ≠ 1, grupos vacíos).

### Modelo de presupuesto (`engine/budget/model.js`)

`computeBudget(budget, { audienceSize })` es la **fuente única** de los totales y es puro/determinístico:

```
lineTotal   = qty · unit · days · (1 − discount)
subtotal(g) = Σ lineTotal            (por grupo; share = subtotal/linesSubtotal)
contingencyAmt = linesSubtotal · contingency
marginAmt      = (linesSubtotal + contingencyAmt) · margin
net            = linesSubtotal + contingencyAmt + marginAmt
ivaAmt         = iva ? net · ivaRate : 0     (CLP ⇒ 0.19 por defecto)
total          = net + ivaAmt
perPax         = net / audienceSize          (si hay audiencia)
options[]      = net/total escalados por (1 + deltaPct)
```

Toda cifra pasa por `engine/lib/money.js` (`round`, `money`, `lineTotal`); CLP se maneja en enteros.

## Contrato de renderers

Cada artefacto es un módulo `engine/<mod>/render.js` con:

```js
export function renderX(proposal, ctx) // -> Record<relpath, content>
// ctx = { budget: ComputedBudget, brand: ResolvedBrand }
```

- Devuelve un mapa `{ rutaRelativa: contenido }`; `build.js` lo escribe bajo `proposals/<slug>/dist/`.
- Módulos registrados en `RENDERERS`: `budget`, `deck`, `scene3d`, `site`. Un renderer ausente o sin la función exportada se marca **"pendiente"** y el build continúa (`build.js` captura `ERR_MODULE_NOT_FOUND`).
- Un renderer es **genérico**: no contiene datos de una propuesta específica; todo sale de `proposal`/`ctx`.
- `build.js` limpia `dist/`, ejecuta los renderers, y añade un `index.html` raíz que enlaza sólo los artefactos efectivamente generados.

## Decisiones de diseño

- **ESM sin build.** Node >= 20, `"type": "module"`, **cero dependencias** y sin bundler. `node engine/build.js …` y listo — máxima portabilidad y auditabilidad.
- **Deck self-contained (Adobe Express).** El deck se genera para importarse a Adobe Express / PPTX: canvas fijo, posición absoluta, **texto real editable**, y **sin recursos externos** (sólo CSS/SVG/`data:`), porque el CSP de Express bloquea fuentes y assets remotos. Por eso `brand.js` usa stacks de fuentes web-safe.
- **three.js vendorizado (3D offline-capable).** La escenografía 3D carga **three.js** por importmap ESM desde `engine/scene3d/vendor/` (copia local ⇒ funciona sin internet); si el vendor no está, cae a CDN. Corre en navegador, no en Express. El presupuesto y el deck se mantienen 100% autónomos.
- **Un solo JSON, muchos destinos.** El mismo dato alimenta un documento de negociación (presupuesto), una presentación (deck), un render espacial (3D) y una experiencia web (microsite), sin duplicar ni desincronizar.
- **Agent-native.** La lógica creativa/numérica vive en skills y subagentes (`.claude/`); el motor sólo transforma datos validados en artefactos.

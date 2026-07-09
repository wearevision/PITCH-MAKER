# PITCH-MAKER

> Sistema **agent-native**, **multiagéntico** y **eficiente en tokens** para crear propuestas de eventos que ganan licitaciones.

![node](https://img.shields.io/badge/node-%3E%3D20-3DD68C)
![ESM](https://img.shields.io/badge/módulos-ESM_sin_build-E7C978)
![deterministic](https://img.shields.io/badge/render-determinístico-5BD1C4)
![token-efficient](https://img.shields.io/badge/tokens-eficiente-E8517A)

---

## 🎯 Qué es

PITCH-MAKER convierte las bases de una licitación de eventos en **cuatro entregables profesionales** a partir de **un único archivo de datos**: `proposals/<slug>/proposal.json` (single source of truth).

La idea central:

> **Los agentes sólo producen datos compactos. El código produce los píxeles.**

Un `proposal.json` describe la propuesta (marca, brief, concepto, programa, escenografía, presupuesto, equipo, timeline). Renderers **determinísticos** en `engine/` leen ese JSON y generan presupuesto, deck, escenografía 3D y microsite. Como los modelos nunca escriben HTML/CSS a mano, el gasto de tokens se concentra en decisiones creativas y numéricas — no en maquetación repetitiva. De ahí la **eficiencia de tokens**.

## 👥 Para quién

Agencias y productoras que **licitan** producción de eventos (galas, activaciones de marca, experiencias inmersivas) y necesitan responder rápido con material impecable: presupuesto en CLP con IVA, presentación editable, render 3D del montaje y un sitio navegable — todo coherente y actualizable desde un solo lugar.

## 🚀 Quickstart

```bash
# Requiere Node >= 20 (ESM nativo, sin dependencias)
node engine/build.js proposals/nua-aniversario-25/proposal.json

# Previsualizar el resultado en el navegador
node engine/serve.js proposals/nua-aniversario-25/dist 5173
```

Scripts equivalentes en `package.json`:

```bash
npm run build        # build de la propuesta NÜA de ejemplo
npm run build:all    # build de todas las propuestas (engine/build.js --all)
npm run validate     # valida el proposal.json contra el esquema
npm run serve        # servidor estático de previsualización
```

El build escribe todos los artefactos en `proposals/<slug>/dist/` (ignorado por git) y genera un `index.html` raíz con enlaces a cada uno.

## 📦 Los 4 entregables

| Artefacto | Salida | Renderer | Tecnología |
|-----------|--------|----------|------------|
| 💰 **Presupuesto** | `dist/budget/presupuesto.html` · `.csv` · `.computed.json` | `engine/budget/render.js` | HTML + `computeBudget` (CLP, IVA 19%, contingencia, margen, opciones, per-pax) |
| 🖥️ **Deck** | `dist/deck/index.html` | `engine/deck/render.js` | HTML self-contained (~9 slides) exportable a **Adobe Express / PPTX** |
| 🏛️ **Escenografía 3D** | `dist/scene3d/index.html` | `engine/scene3d/render.js` | **three.js** vía importmap ESM, construida desde `scenography.zones` |
| 🌐 **Microsite** | `dist/site/index.html` · `app.js` · `styles.css` | `engine/site/render.js` | Web navegable, desplegable (p. ej. Vercel) |

Los cuatro comparten el mismo sistema de **design tokens de marca** (`engine/lib/brand.js`) y los mismos **totales de presupuesto** (`engine/budget/model.js`), de modo que nunca se contradicen entre sí.

## 🗂️ Estructura de carpetas

```
PITCH-MAKER/
├── engine/                  # el CÓDIGO — renderers determinísticos y "spine"
│   ├── build.js             # CLI: ensambla los 4 artefactos desde proposal.json
│   ├── serve.js             # servidor estático de previsualización
│   ├── lib/                 # spine compartida (no romper)
│   │   ├── schema.js        # contrato de datos + validate() + CLI
│   │   ├── brand.js         # design tokens (colores, fuentes, CSS vars)
│   │   ├── money.js         # aritmética y formato CLP
│   │   └── html.js          # helpers de HTML
│   ├── budget/
│   │   ├── model.js         # computeBudget() — fuente única de los totales
│   │   └── render.js        # renderBudget()
│   ├── deck/render.js       # renderDeck()
│   ├── scene3d/render.js    # renderScene3d()
│   └── site/render.js       # renderSite()
├── proposals/
│   └── <slug>/
│       ├── proposal.json    # ← single source of truth
│       └── dist/            # artefactos generados (git-ignored)
├── briefs/                  # bases de licitación de entrada (*.md)
├── docs/ARCHITECTURE.md     # arquitectura del pipeline
├── .claude/                 # sistema multiagéntico (skills + agents)
└── CLAUDE.md                # guía para agentes en este repo
```

## ➕ Cómo crear una nueva propuesta

1. **Copiar** una carpeta existente como plantilla:
   ```bash
   cp -r proposals/nua-aniversario-25 proposals/mi-nueva-propuesta
   ```
2. **Editar** `proposals/mi-nueva-propuesta/proposal.json` (empezando por `meta.slug`, `brand`, `brief`, `concept`, `scenography.zones` y `budget.groups`).
3. **Validar** el esquema:
   ```bash
   node engine/lib/schema.js proposals/mi-nueva-propuesta/proposal.json
   ```
4. **Build**:
   ```bash
   node engine/build.js proposals/mi-nueva-propuesta/proposal.json
   ```

El validador exige los campos críticos (`meta.*`, `brand.name`, `brief.summary`, `concept.*`, `budget.currency/groups`, `scenography.zones`) y avisa (warnings) sobre pesos de evaluación que no suman 1, líneas sin concepto, etc.

## 🤖 Cómo se usa el sistema multiagéntico

El repo es **agent-native**: la carpeta `.claude/` define skills y subagentes que producen los **datos** de `proposal.json`, dejando el render al código.

- **gstack** — marco de sprint (`skills/gstack-process`, `skills/pitch-orchestrate`): `Think → Plan → Build → Review → Test → Ship → Reflect`. El Orquestador (CEO) es dueño del brief, reparte el trabajo y ensambla el JSON. Inspirado en [garrytan/gstack](https://github.com/garrytan/gstack).
- **caveman** — convención de compresión de output (`skills/caveman`): handoffs y notas entre agentes con ~65% menos tokens, misma substancia. **Nunca** se aplica a la prosa de cara al cliente (deck, microsite, `concept.statement`). Adaptado de [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman).
- **skills `pitch-*`** — una por sección de la propuesta: `pitch-brief`, `pitch-concept`, `pitch-budget`, `pitch-3d`, `pitch-deck`, `pitch-site`. Cada una sabe qué parte del JSON escribir y qué renderer la consume.
- **agentes `pitch-*`** — especialistas que devuelven **JSON válido** de una sección (`pitch-brief-analyst`, `pitch-creative-director`, `pitch-budget-engineer`, `pitch-deck-designer`).
- **cavecrew** — subagentes utilitarios de bajo costo para trabajo mecánico del repo: `cavecrew-investigator` (localizar símbolos), `cavecrew-builder` (editar ≤2 archivos con scope conocido), `cavecrew-reviewer` (auditar diffs). Se usan para tocar el código/repo; los agentes `pitch-*` para producir contenido de la propuesta.

## 🙏 Créditos

- Marco de proceso inspirado en **[garrytan/gstack](https://github.com/garrytan/gstack)**.
- Convención de compresión adaptada de **[JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)**.

Construido por **WeAreVision**.

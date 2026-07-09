---
name: pitch-deck
description: Generar el deck (~9 slides) desde proposal.json y exportarlo a Adobe Express/PPTX. Úsala para producir o exportar la presentación editable.
---

# pitch-deck — deck editable + export Express

Renderer: `engine/deck/render.js` (`renderDeck` → `{ "deck/index.html": string }`). Data-driven desde proposal.json; sin tocar el HTML a mano.

## Generar

```
node engine/build.js proposals/<slug>/proposal.json
# → proposals/<slug>/dist/deck/index.html
```
Preview local:
```
node engine/serve.js proposals/<slug>/dist   # http://localhost:5173/deck/index.html
```

## Reglas Express (ya cumplidas por el renderer — respetarlas si editas)

- Canvas fijo **1920×1080** por slide (W/H en render.js).
- Cada slide = un `.slide` con posicionamiento absoluto.
- Texto = texto real editable (no imágenes de texto).
- **Autocontenido**: solo CSS/SVG/`data:` — cero recursos externos (Express bloquea CDN/red).

## Exportar a Adobe Express / PPTX

1. SIEMPRE correr primero `html_export_readiness_skill` (valida estructura, fuentes, layout). Re-correr antes de CADA export/re-export.
2. Luego `export_html_to_express` con el HTML de `dist/deck/index.html` (inline `html` o `url` — lo decide la readiness skill). `slideSelector` = `.slide` (ya viene en el meta). docName = slug.
3. Revisar `slides[].html` normalizado del importer: texto presente, fuentes ok, nada desplazado.
4. En Express: editar y exportar a PPTX/PDF desde la UI.

## Alinear contenido

El deck refleja concept, program, scenography, budget (share por grupo), team, differentiators. Para cambiar el deck, editar proposal.json y re-build — no el HTML.

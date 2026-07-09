---
name: pitch-site
description: Generar el microsite de la propuesta y desplegarlo en Vercel. Úsala para entregar la propuesta como experiencia web navegable.
---

# pitch-site — microsite + deploy Vercel

Renderer: `engine/site/render.js` (`renderSite` → `{ "site/index.html": ... }`), consumido por build.js. Data-driven desde proposal.json (concept, program, scenography, budget, team, timeline, differentiators, contact).

Nota repo: si `engine/site/render.js` aún no existe, el build lo marca como "pendiente" y salta el microsite. Implementarlo siguiendo el contrato `renderSite(proposal, ctx) => Record<relpath,string>` (mismo patrón que deck/scene3d) antes de desplegar.

## Generar

```
node engine/build.js proposals/<slug>/proposal.json
# → proposals/<slug>/dist/site/index.html  (+ index.html raíz con links a todos los artefactos)
```
Preview:
```
node engine/serve.js proposals/<slug>/dist   # http://localhost:5173/
```

## Desplegar en Vercel

Directorio estático a publicar: `proposals/<slug>/dist/` (index raíz + site/ + deck/ + scene3d/ + budget/).

1. `html_export_readiness_skill` no aplica aquí (eso es para Express). El microsite sí permite CDN (three.js), a diferencia del deck.
2. Deploy: usar la herramienta `deploy_to_vercel` (MCP Vercel) apuntando al dir `dist/`, o `vercel deploy proposals/<slug>/dist --prod` si hay CLI.
3. Verificar la URL: cargan index raíz, microsite, deck, 3D y presupuesto.

## Entregar

Compartir la URL de Vercel + el deck exportado a Express/PPTX. El index raíz enlaza los 4 artefactos.

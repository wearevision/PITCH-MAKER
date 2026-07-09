---
name: pitch-orchestrate
description: Flujo maestro end-to-end de bases → propuesta completa, coordinando skills + subagentes cavecrew + agentes pitch de forma eficiente en tokens. Úsala como orquestador al iniciar una licitación completa.
---

# pitch-orchestrate — bases → propuesta ganadora

Rol: Orquestador (CEO en `gstack-process`). Dueño del brief, reparte trabajo, ensambla `proposals/<slug>/proposal.json`, corre el build, entrega. Un solo JSON como fuente de verdad; los renderers determinísticos de `engine/` producen los píxeles.

## Flujo (sigue las fases de gstack-process)

1. **Think** — leer `briefs/*.md`. Delegar extracción → skill `pitch-brief`. Producir objeto `brief` (criterios con pesos que suman 1).
2. **Plan** — skill `pitch-concept`: concept alineado a criterios de mayor peso.
3. **Build** en paralelo:
   - `pitch-budget` → budget.groups/lines (CLP).
   - `pitch-3d` → scenography.zones.
   - `pitch-deck` → deck (tras tener concept+budget).
   - `pitch-site` → microsite.
4. **Review** — subagente `cavecrew-reviewer`: cada criterio de evaluación tiene evidencia. Gap → volver a Build.
5. **Test** — `node engine/lib/schema.js …` (0 errores) + `node engine/build.js …` + verificar export Express del deck.
6. **Ship** — desplegar microsite (Vercel) + deck a Express/PPTX. Entregar URL + archivos.
7. **Reflect** — nota caveman.

## Eficiencia en tokens

- **Haiku** (barato, mecánico): extracción de bases, redacción de líneas de presupuesto, normalización de zonas, chequeos de validación, formateo. Tareas con formato claro y poco juicio.
- **Sonnet** (juicio creativo/estructural): concept + statement + narrative, alineación a criterios, review contra evaluación, decisiones de alcance/trade-off de presupuesto.
- Un solo subagente hace su parte completa; no re-delegar la tarea entera.

## Comprimir handoffs (skill `caveman`)

- Handoffs agente↔agente en caveman: fragmentos, sin relleno, NUNCA alterar números/JSON/comandos/ids. Copiar literal el JSON producido.
- Pasar entre agentes solo el fragmento de proposal.json relevante (ej: al de presupuesto solo `brief.scope` + `brief.audience` + techo), no el archivo completo.
- Prosa de cara al cliente (statement, deck, microsite) NO se comprime: va pulida.

## Contrato invariante

Todo entra a `proposal.json` (esquema en `engine/lib/schema.js`). Nada de números a mano: `computeBudget` manda. Build:
```
node engine/build.js proposals/<slug>/proposal.json
```

---
name: gstack-process
description: Proceso de sprint para armar una propuesta de licitación de punta a punta (Think→Plan→Build→Review→Test→Ship→Reflect). Úsala como marco cuando arrancas una propuesta nueva o quieres estructurar el trabajo de varios agentes.
---

# gstack-process — sprint de licitación

Inspirado en garrytan/gstack. Adaptado a PITCH-MAKER: el "producto" es `proposals/<slug>/proposal.json` + artefactos en `dist/`.

## Roles (gstack → pitch)

- CEO → Orquestador (dueño del brief, decide alcance, aprueba ship). Ver skill `pitch-orchestrate`.
- Designer → Concepto + Deck + 3D (skills `pitch-concept`, `pitch-deck`, `pitch-3d`).
- EngManager → Data/Presupuesto/Esquema (skills `pitch-brief`, `pitch-budget`; garante de que `validate()` pase).
- QA → subagente `cavecrew-reviewer` (revisa contra criterios de evaluación).

## Fases

1. **Think** — leer bases (`briefs/*.md`). Extraer objetivos, audiencia, venue, alcance, criterios+pesos. → skill `pitch-brief`.
2. **Plan** — concepto + alcance alineados a criterios de mayor peso. → skill `pitch-concept`.
3. **Build** — completar `proposal.json`: brief, concept, program, scenography.zones, budget, team, timeline, differentiators, contact. Skills `pitch-budget`, `pitch-3d`.
4. **Review** — cavecrew-reviewer: ¿cada criterio de evaluación tiene evidencia en la propuesta? gap → volver a Build.
5. **Test** — determinístico:
   ```
   node engine/lib/schema.js proposals/<slug>/proposal.json   # validate
   node engine/build.js proposals/<slug>/proposal.json         # build artefactos
   ```
   0 errores. Verificar export del deck a Express (skill `pitch-deck`).
6. **Ship** — entregar `dist/` + deck exportado + microsite desplegado (skill `pitch-site`).
7. **Reflect** — nota caveman: qué ganó puntos, qué recortar la próxima.

## Regla de oro

No avanzar de fase con `validate` en rojo. Los números salen SIEMPRE de `computeBudget` (engine/budget/model.js), nunca a mano.

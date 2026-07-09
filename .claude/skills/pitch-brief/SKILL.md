---
name: pitch-brief
description: Convertir bases de licitación (briefs/*.md o texto pegado) en el objeto `brief` de proposal.json. Úsala al arrancar una propuesta, antes del concepto.
---

# pitch-brief — bases → objeto brief

Input: `briefs/<algo>.md` (o texto de las bases). Output: el objeto `brief` de `proposals/<slug>/proposal.json`.

## Estructura destino (ver engine/lib/schema.js)

```json
"brief": {
  "summary": "1 párrafo: qué se licita, para quién, dónde, cuándo, qué exige.",
  "objectives": ["...", "..."],
  "audience": { "size": 1200, "profile": "..." },
  "venue": { "name": "", "city": "", "date": "YYYY-MM-DD", "format": "" },
  "scope": ["ítem entregable", "..."],
  "evaluation": [ { "criterion": "", "weight": 0.30 } ]
}
```

## Pasos

1. Leer bases. Extraer literal: fechas, nº pax, nombre venue, ítems de alcance obligatorios.
2. `summary` — un párrafo denso: qué + quién + dónde + cuándo + exigencias.
3. `objectives` — objetivos de negocio del cliente (por qué hace el evento), no tareas.
4. `audience.size` numérico (lo usa `computeBudget` para perPax). `profile` = composición.
5. `venue` — date en `YYYY-MM-DD`. `format` = tipo de experiencia.
6. `scope` — un ítem por entregable exigido en las bases. Copiar el lenguaje de las bases.
7. `evaluation` — criterios con `weight` fracción. **Los pesos DEBEN sumar 1.00** (tolerancia validate: 0.011). Si las bases dan %, dividir /100.

## Validar

```
node engine/lib/schema.js proposals/<slug>/proposal.json
```
Warning "pesos suman X" → ajustar hasta 1.00. `audience.size` faltante → perPax queda null.

Nota: los criterios de `evaluation` mandan el resto de la propuesta — concept, deck y differentiators se alinean a los de mayor peso.

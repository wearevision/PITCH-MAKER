---
name: pitch-concept
description: Generar el objeto `concept` (name, statement, 4 pillars, narrative) alineado a los criterios de evaluación. Úsala después de tener `brief` listo.
---

# pitch-concept — concepto que puntúa

Output: objeto `concept` de proposal.json. Depende de `brief` (sobre todo `brief.evaluation`).

## Estructura (ver engine/lib/schema.js, consumido por deck y site)

```json
"concept": {
  "name": "Marca 25 · El Umbral",
  "statement": "1 párrafo de cara al cliente, evocador y concreto.",
  "pillars": [ { "title": "", "desc": "", "icon": "◈" } ],
  "narrative": ["Momento 1 — ...", "Momento 2 — ..."]
}
```

## Reglas

- `name` corto, memorable, con carácter. Aparece en portada del deck y 3D.
- `statement` — prosa pulida (NO caveman). Debe conectar el hito del cliente con la experiencia. Es el lead del index y del microsite.
- `pillars` — EXACTAMENTE 4. Cada pillar debe cubrir un criterio de `brief.evaluation` de alto peso (creatividad, factibilidad, experiencia, sostenibilidad...). `icon` = un glifo unicode (◈ ⭓ ❖ ✦).
- `narrative` — recorrido cronológico del asistente (llegada → clímax → cierre). Alinéalo con `program`.

## Método

1. Ordenar `brief.evaluation` por peso desc.
2. Idear un concepto marco que responda al criterio #1 (normalmente creatividad).
3. Cada pilar = una prueba visible de un criterio. Que el evaluador marque la casilla leyendo el pilar.
4. narrative espeja los momentos que luego renderiza el deck y el 3D.

Check: ¿todo criterio de peso ≥0.10 tiene reflejo en un pillar o differentiator? Si no, gap → agregar.

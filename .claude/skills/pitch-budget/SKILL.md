---
name: pitch-budget
description: Construir budget.groups/lines en CLP y entender computeBudget (contingencia, margen, IVA 19%, perPax, options). Úsala al armar o validar los números de la propuesta.
---

# pitch-budget — presupuesto en CLP

Output: objeto `budget` de proposal.json. Motor: `engine/budget/model.js` (`computeBudget`). Aritmética por línea: `engine/lib/money.js` (`lineTotal`).

## Estructura

```json
"budget": {
  "currency": "CLP", "iva": true, "ivaRate": 0.19,
  "contingency": 0.05, "margin": 0.12,
  "groups": [ { "id": "escenografia", "name": "Escenografía & Ambientación",
    "lines": [ { "concept": "...", "qty": 1, "unit": 28000000, "note": "opcional" } ] } ],
  "options": [ { "name": "Versión Signature", "deltaPct": 0.15, "note": "..." } ]
}
```

## Línea → total (lineTotal)

```
total = round( qty * unit * days * (1 - discount), 0 )
```
Defaults: qty=1, days=1, discount=0. `unit` DEBE ser number (si no, validate falla). Catering per-pax: `qty` = nº pax, `unit` = costo/persona (ej: 1200 × 42000).

## Cómo computeBudget arma el total (orden importa)

1. `linesSubtotal` = suma de todas las líneas.
2. `contingencyAmt` = linesSubtotal × contingency.
3. `marginAmt` = (linesSubtotal + contingencyAmt) × margin. → margen sobre base con contingencia.
4. `net` = linesSubtotal + contingencyAmt + marginAmt (sin IVA).
5. `ivaAmt` = net × ivaRate (0.19 default CLP; 0 si iva:false o no-CLP).
6. `total` = net + ivaAmt.
7. `perPax` = round(net / audienceSize) — requiere `brief.audience.size`.
8. `options[]` — cada una escala net y total por (1 + deltaPct). deltaPct negativo = versión reducida.

`share` por grupo = subtotal grupo / linesSubtotal (para gráficos del deck).

## Reglas

- Montos CLP enteros, sin separadores en JSON (`28000000`).
- Un grupo por rubro de las bases. Cubrir TODO `brief.scope` con al menos una línea.
- No calcular totales a mano: los renderiza computeBudget. Fuente única de verdad.

## Validar

```
node engine/lib/schema.js proposals/<slug>/proposal.json   # unit numérico, grupos con líneas
node engine/build.js proposals/<slug>/proposal.json        # imprime Total propuesta (IVA incl.)
```
El build imprime el total con `money()`. Cotejar contra el techo presupuestario de las bases; si excede, ofrecer `options` con deltaPct negativo.

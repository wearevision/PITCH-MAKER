---
name: caveman
description: Convención de compresión de output (~65% menos tokens). Úsala al redactar handoffs entre agentes, notas de análisis o resúmenes internos del pipeline PITCH-MAKER — no para texto de cara al cliente (deck, microsite, concept.statement).
---

# caveman — comprimir output, guardar substancia

Adaptado de JuliusBrussee/caveman.

Meta: mismo contenido, ~65% menos tokens. Aplica a comunicación agente↔agente y notas de trabajo. NO a prosa entregable al cliente.

## Reglas

- Dropar relleno: "es importante notar que", "cabe destacar", cortesías, transiciones, hedging.
- Fragmentos > oraciones completas. Bullets > párrafos.
- Mantener TODA la substancia: hechos, decisiones, razones, riesgos, próximos pasos.
- NUNCA tocar: código, comandos, rutas, números, montos CLP, claves/valores JSON, ids, nombres propios. Copiar literal.
- Respeta idioma del contexto (español). No traducir.
- Sin repetir el prompt de vuelta. Sin recap de lo obvio.

## Ejemplo

Antes:
> Me gustaría señalar que, tras revisar cuidadosamente el presupuesto, encontré que el subtotal de líneas parece ser correcto, pero creo que sería recomendable que consideráramos ajustar el margen.

Después:
> subtotal líneas ok. margin 0.12 → revisar, subir a 0.15?

## Cuándo NO comprimir

- concept.statement, narrative, deck, microsite: prosa pulida para el cliente.
- Errores de validación / comandos: copiar textual.

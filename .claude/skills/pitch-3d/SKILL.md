---
name: pitch-3d
description: Definir scenography.zones (kind/pos/size/color en metros) para el motor three.js y previsualizar el montaje. Úsala al diseñar la planta escenográfica.
---

# pitch-3d — escenografía 3D data-driven

Renderer: `engine/scene3d/render.js` (`renderScene3d` → `{ "scene3d/index.html": string }`). Se construye 100% desde `scenography.zones`. Se sirve en navegador (usa three.js vía importmap ESM; NO va a Express).

## Estructura de zona (ver schema.js typedef Zone)

```json
{ "id": "stage", "name": "Escenario circular 360°", "kind": "stage",
  "desc": "opcional", "pos": [0, 0, 0], "size": [14, 1.2, 14], "color": "#E8517A" }
```

- `pos` = [x, y, z] en **metros**, centro de la zona. y = altura de piso (0 = suelo).
- `size` = [w, h, d] en **metros** (ancho, alto, profundidad).
- `kind` ∈ `stage | stand | lounge | entrance | screen | bar | installation`. Define color por defecto si no hay `color`.
- `color` hex opcional (override). Suele venir de brand.colors.
- `pos`/`size` DEBEN ser arrays de 3 números (validate falla si no).

## Método

1. Fijar planta total (ej: ~50×40 m) y describirla en `scenography.summary`.
2. Ubicar cada zona por su centro en metros. Origen [0,0,0] = centro del salón.
3. Pantallas suspendidas: subir en `y` (ej: pos [0, 6.5, 0]).
4. Evitar solapes salvo intención (screen sobre stage sí solapa en planta, ok por altura).
5. Colorear con la paleta de marca para coherencia con deck/site.

## Previsualizar

```
node engine/build.js proposals/<slug>/proposal.json
node engine/serve.js proposals/<slug>/dist   # http://localhost:5173/scene3d/index.html
```
Órbita con mouse. Cotejar dimensiones vs. capacidad (1.200 pax → circulación suficiente).

## Exportar renders (imágenes fijas)

La escena acepta parámetros de URL para vistas fijas (útil para capturar stills):
- `?rot=0` desactiva la auto-rotación.
- `?cam=x,y,z` fija la posición de cámara en metros.

Ej. de captura con Chromium headless (guardar en `proposals/<slug>/renders/`):
```
chromium --headless --enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader \
  --window-size=1600,1000 --virtual-time-budget=9000 \
  --screenshot=render.png "http://localhost:5173/scene3d/index.html?rot=0&cam=36,26,40"
```

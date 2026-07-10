// scene3d/render.js — escena 3D interactiva (three.js) de la planta escenográfica.
// Contrato: renderScene3d(proposal, ctx) => { "scene3d/index.html": string }
// Genérico y data-driven: se construye desde proposal.scenography.zones.
// Se sirve en navegador/microsite (no en Express), por eso se permite CDN vía importmap ESM.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { esc } from '../lib/html.js';
import { resolveBrand } from '../lib/brand.js';

// three.js vendorizado localmente => la escena es self-contained y funciona offline
// (sin depender de un CDN en runtime). Si los vendor no existen, cae a CDN.
const VENDOR_DIR = join(dirname(fileURLToPath(import.meta.url)), 'vendor');
function loadVendor() {
  try {
    return {
      three: readFileSync(join(VENDOR_DIR, 'three.module.js'), 'utf8'),
      orbit: readFileSync(join(VENDOR_DIR, 'OrbitControls.js'), 'utf8'),
    };
  } catch {
    return null;
  }
}

/**
 * @param {object} proposal
 * @param {{ budget: import('../budget/model.js').ComputedBudget, brand: object }} ctx
 * @returns {Record<string,string>}
 */
export function renderScene3d(proposal, ctx) {
  const brand = resolveBrand(ctx?.brand || proposal.brand);
  const c = brand.colors;
  const meta = proposal.meta || {};
  const scen = proposal.scenography || {};
  const zones = Array.isArray(scen.zones) ? scen.zones : [];

  const clientName = meta.client || brand.name || 'Cliente';
  const projectName = meta.project || (proposal.concept && proposal.concept.name) || 'Escenografía';
  const conceptName = (proposal.concept && proposal.concept.name) || '';
  const tagline = brand.tagline || '';

  // Color por kind cuando la zona no trae color propio.
  const kindColor = {
    stage: c.secondary,
    screen: c.accent,
    entrance: c.primary,
    installation: c.accent,
    stand: c.secondary,
    lounge: c.inkSoft,
    bar: c.primary,
  };

  // Normaliza zonas para el runtime three.js.
  const zonesData = zones.map((z, i) => {
    const pos = Array.isArray(z.pos) ? z.pos : [0, 0, 0];
    const size = Array.isArray(z.size) ? z.size : [4, 3, 4];
    return {
      id: String(z.id || `zone-${i}`),
      name: String(z.name || z.id || `Zona ${i + 1}`),
      desc: String(z.desc || ''),
      kind: String(z.kind || 'stand'),
      pos: [num(pos[0]), num(pos[1]), num(pos[2])],
      size: [num(size[0], 4), num(size[1], 3), num(size[2], 4)],
      color: z.color || kindColor[z.kind] || c.primary,
    };
  });

  // Leyenda: kinds presentes con un label legible.
  const kindLabels = {
    stage: 'Escenario',
    screen: 'Pantallas',
    entrance: 'Acceso / Umbral',
    installation: 'Instalación',
    stand: 'Tótem / Stand',
    lounge: 'Lounge',
    bar: 'Barra',
  };
  const legend = zonesData.map((z) => ({
    name: z.name,
    color: z.color,
    kind: kindLabels[z.kind] || z.kind,
  }));

  const dataJson = JSON.stringify({
    zones: zonesData,
    colors: {
      bg: c.bg,
      bgAlt: c.bgAlt,
      ink: c.ink,
      inkSoft: c.inkSoft,
      line: c.line,
      primary: c.primary,
      secondary: c.secondary,
      accent: c.accent,
    },
    // escapa `<` para que un nombre de zona con `</script>` no rompa el bloque JSON
  }).replace(/</g, '\\u003c');

  // Fuente de three.js: local (self-contained) o CDN como fallback.
  const vendor = loadVendor();
  const importmap = vendor
    ? '{\n  "imports": {\n    "three": "./vendor/three.module.js",\n    "three/addons/controls/OrbitControls.js": "./vendor/OrbitControls.js"\n  }\n}'
    : '{\n  "imports": {\n    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",\n    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"\n  }\n}';

  const legendHtml = legend
    .map(
      (l) => `
      <li class="legend-item">
        <span class="legend-dot" style="background:${esc(l.color)}"></span>
        <span class="legend-name">${esc(l.name)}</span>
        <span class="legend-kind">${esc(l.kind)}</span>
      </li>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(projectName)} — Escena 3D</title>
<style>
  :root{
    --bg:${esc(c.bg)};
    --bg-alt:${esc(c.bgAlt)};
    --ink:${esc(c.ink)};
    --ink-soft:${esc(c.inkSoft)};
    --line:${esc(c.line)};
    --primary:${esc(c.primary)};
    --secondary:${esc(c.secondary)};
    --accent:${esc(c.accent)};
    --font-body:${esc(brand.fonts.body)};
    --font-display:${esc(brand.fonts.display)};
    --font-mono:${esc(brand.fonts.mono)};
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;overflow:hidden;background:var(--bg);color:var(--ink);font-family:var(--font-body)}
  #app{position:fixed;inset:0}
  canvas{display:block;width:100%;height:100%;touch-action:none}

  /* ---- Overlay UI ---- */
  .overlay{position:fixed;inset:0;pointer-events:none;z-index:10}
  .panel{
    position:absolute;pointer-events:auto;
    background:color-mix(in srgb, var(--bg-alt) 78%, transparent);
    border:1px solid var(--line);border-radius:16px;
    backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  }
  .head{top:24px;left:24px;max-width:min(440px,calc(100vw - 48px));padding:22px 24px}
  .eyebrow{font:600 12px/1 var(--font-body);letter-spacing:.32em;text-transform:uppercase;color:var(--ink-soft)}
  .title{margin-top:12px;font:800 clamp(26px,3.4vw,40px)/1.02 var(--font-display);letter-spacing:-.02em}
  .concept{margin-top:10px;display:inline-block;font:600 12px/1 var(--font-mono);letter-spacing:.14em;
    color:var(--bg);background:var(--primary);padding:6px 11px;border-radius:999px;text-transform:uppercase}
  .tagline{margin-top:14px;font:400 15px/1.5 var(--font-body);color:var(--ink-soft);max-width:38ch}

  .legend{right:24px;top:24px;max-width:min(320px,calc(100vw - 48px));padding:18px 20px;
    max-height:calc(100vh - 48px);overflow:auto}
  .legend-h{font:600 11px/1 var(--font-body);letter-spacing:.28em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:14px}
  .legend-item{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid color-mix(in srgb,var(--line) 60%,transparent);list-style:none}
  .legend-item:last-child{border-bottom:none}
  .legend-dot{width:11px;height:11px;border-radius:3px;flex:0 0 auto;box-shadow:0 0 10px currentColor}
  .legend-name{font:600 13px/1.25 var(--font-body);flex:1}
  .legend-kind{font:500 10px/1 var(--font-mono);letter-spacing:.08em;color:var(--ink-soft);text-transform:uppercase;white-space:nowrap}

  .controls{left:50%;transform:translateX(-50%);bottom:24px;display:flex;gap:10px;align-items:center;padding:12px 14px}
  .btn{
    pointer-events:auto;cursor:pointer;border:1px solid var(--line);
    background:transparent;color:var(--ink);font:600 12px/1 var(--font-body);
    letter-spacing:.06em;padding:10px 16px;border-radius:10px;transition:all .18s;
    display:inline-flex;align-items:center;gap:8px;text-transform:uppercase;
  }
  .btn:hover{border-color:var(--primary);color:var(--primary)}
  .btn[data-on="true"]{background:var(--primary);border-color:var(--primary);color:var(--bg)}
  .btn .dot{width:8px;height:8px;border-radius:50%;background:currentColor;opacity:.7}
  .hint{font:500 11px/1.4 var(--font-mono);color:var(--ink-soft);letter-spacing:.04em;padding-left:6px}

  /* ---- Etiquetas de zona (divs proyectados) ---- */
  .labels{position:fixed;inset:0;pointer-events:none;z-index:9;overflow:hidden}
  .zlabel{
    position:absolute;transform:translate(-50%,-140%);white-space:nowrap;
    font:600 12px/1 var(--font-body);color:var(--ink);
    background:color-mix(in srgb,var(--bg) 62%,transparent);
    border:1px solid var(--line);border-radius:999px;padding:5px 11px;
    letter-spacing:.02em;transition:opacity .2s;will-change:transform,left,top;
  }
  .zlabel::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;
    margin-right:7px;vertical-align:middle;background:var(--zc,var(--primary));box-shadow:0 0 8px var(--zc,var(--primary))}

  /* ---- Estados de carga / error ---- */
  #status{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;
    flex-direction:column;gap:16px;background:var(--bg);text-align:center;padding:32px}
  #status .spin{width:34px;height:34px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--primary);animation:spin 1s linear infinite}
  #status .msg{font:500 14px/1.5 var(--font-body);color:var(--ink-soft);max-width:34ch}
  #status.err .spin{display:none}
  #status.err .msg{color:var(--secondary)}
  @keyframes spin{to{transform:rotate(360deg)}}

  @media (max-width:720px){
    .legend{display:none}
    .head{max-width:calc(100vw - 32px);left:16px;top:16px;padding:16px 18px}
    .controls{flex-wrap:wrap;justify-content:center;bottom:16px}
    .hint{display:none}
  }
</style>
<script type="importmap">
${importmap}
</script>
</head>
<body>
<div id="app"></div>
<div class="labels" id="labels"></div>

<div class="overlay">
  <div class="panel head">
    <div class="eyebrow">${esc(clientName)} · Planta escenográfica</div>
    <div class="title">${esc(projectName)}</div>
    ${conceptName ? `<span class="concept">${esc(conceptName)}</span>` : ''}
    ${tagline ? `<div class="tagline">${esc(tagline)}</div>` : ''}
  </div>

  <div class="panel legend">
    <div class="legend-h">Zonas · ${legend.length}</div>
    <ul>${legendHtml}</ul>
  </div>

  <div class="panel controls">
    <button class="btn" id="btnRotate" data-on="true"><span class="dot"></span>Auto-rotar</button>
    <button class="btn" id="btnReset">Vista aérea</button>
    <span class="hint">Arrastrar: rotar · Rueda: zoom · Click derecho: pan</span>
  </div>
</div>

<div id="status">
  <div class="spin"></div>
  <div class="msg">Cargando escena 3D…</div>
</div>

<script id="scene-data" type="application/json">${dataJson}</script>

<script type="module">
const DATA = JSON.parse(document.getElementById('scene-data').textContent);
const statusEl = document.getElementById('status');
function fail(m){ statusEl.classList.add('err'); statusEl.querySelector('.msg').textContent = m; }

// Timeout de seguridad por si la carga del módulo se cuelga.
const loadTimer = setTimeout(() => {
  if (!statusEl.classList.contains('done'))
    fail('No se pudo inicializar la escena 3D. Recarga la página.');
}, 12000);

try {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  clearTimeout(loadTimer);
  boot(THREE, OrbitControls);
} catch (e) {
  clearTimeout(loadTimer);
  fail('No se pudo inicializar la escena 3D. ' + (e && e.message ? e.message : ''));
}

function boot(THREE, OrbitControls){
  const C = DATA.colors;
  const app = document.getElementById('app');
  const labelsEl = document.getElementById('labels');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.fog = new THREE.Fog(C.bg, 55, 130);

  const camera = new THREE.PerspectiveCamera(46, window.innerWidth/window.innerHeight, 0.1, 1000);
  const HOME = new THREE.Vector3(34, 30, 40);
  camera.position.copy(HOME);

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  app.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI * 0.495; // no bajar del piso
  controls.minDistance = 12;
  controls.maxDistance = 120;
  controls.target.set(0, 2, 0);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;

  // Vista fija vía URL (para exportar renders): ?rot=0 desactiva auto-rotación;
  // ?cam=x,y,z fija la posición de cámara en metros.
  const _p = new URLSearchParams(location.search);
  if (_p.get('rot') === '0') controls.autoRotate = false;
  const _cam = _p.get('cam');
  if (_cam) {
    const c = _cam.split(',').map(Number);
    if (c.length === 3 && c.every(Number.isFinite)) camera.position.set(c[0], c[1], c[2]);
  }

  // ---- Iluminación ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  scene.add(new THREE.HemisphereLight(0xbfd0ff, 0x0a0a12, 0.5));

  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(28, 42, 22);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const d = 45;
  key.shadow.camera.left = -d; key.shadow.camera.right = d;
  key.shadow.camera.top = d; key.shadow.camera.bottom = -d;
  key.shadow.camera.near = 1; key.shadow.camera.far = 140;
  key.shadow.bias = -0.0004;
  scene.add(key);

  // Point lights de color de marca
  addPoint(C.primary, -16, 8, 0, 0.9, 60);
  addPoint(C.secondary, 0, 10, 0, 1.0, 55);
  addPoint(C.accent, 14, 8, -6, 0.8, 55);
  function addPoint(hex, x, y, z, i, dist){
    const p = new THREE.PointLight(new THREE.Color(hex), i, dist, 2);
    p.position.set(x, y, z);
    scene.add(p);
  }

  // ---- Piso tipo grilla ~50 x 40 ----
  const FW = 50, FD = 40;
  const floorMat = new THREE.MeshStandardMaterial({ color: C.bgAlt, roughness: 0.95, metalness: 0.05 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(Math.max(FW,FD), Math.max(FW,FD),
    new THREE.Color(C.line), new THREE.Color(C.line));
  grid.material.opacity = 0.5; grid.material.transparent = true;
  grid.position.y = 0.01;
  scene.add(grid);

  // Borde del recinto
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(FW, 0.02, FD)),
    new THREE.LineBasicMaterial({ color: new THREE.Color(C.primary), transparent:true, opacity:0.35 })
  );
  edge.position.y = 0.02;
  scene.add(edge);

  // ---- Construcción de zonas ----
  const labelTargets = [];
  for (const z of DATA.zones) buildZone(z);

  function mat(hex, opts={}){
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      roughness: opts.rough ?? 0.45,
      metalness: opts.metal ?? 0.25,
      emissive: new THREE.Color(hex),
      emissiveIntensity: opts.emis ?? 0.12,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
    });
  }

  function buildZone(z){
    const g = new THREE.Group();
    const [x,y,zz] = z.pos;
    const [w,h,dp] = z.size;
    g.position.set(x, 0, zz);
    const col = z.color;

    if (z.kind === 'stage'){
      const r = Math.max(w, dp) / 2;
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r*1.02, Math.max(h,0.8), 64), mat(col,{emis:0.2,metal:0.4}));
      cyl.position.y = Math.max(h,0.8)/2 + y;
      cyl.castShadow = true; cyl.receiveShadow = true;
      g.add(cyl);
      // anillo de luz al ras
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r*1.05, 0.12, 12, 80), mat(col,{emis:1.0}));
      ring.rotation.x = Math.PI/2; ring.position.y = 0.06;
      g.add(ring);
      labelTargets.push({ el: mkLabel(z), obj: g, offset: Math.max(h,0.8)+y+1.2 });

    } else if (z.kind === 'screen'){
      // Anillo/paneles suspendidos (y elevado)
      const r = Math.max(w, dp) / 2;
      const panels = 12;
      for (let i=0;i<panels;i++){
        const a = (i/panels)*Math.PI*2;
        const pw = (2*Math.PI*r)/panels * 0.82;
        const pnl = new THREE.Mesh(new THREE.BoxGeometry(pw, h, 0.15), mat(col,{emis:0.6,rough:0.3,metal:0.5}));
        pnl.position.set(Math.cos(a)*r, y + h/2, Math.sin(a)*r);
        pnl.lookAt(g.position.x, y + h/2, g.position.z);
        pnl.castShadow = true;
        g.add(pnl);
      }
      // rig de suspensión
      const rig = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 8, 64), mat(C.line,{emis:0}));
      rig.rotation.x = Math.PI/2; rig.position.y = y + h + 0.3;
      g.add(rig);
      labelTargets.push({ el: mkLabel(z), obj: g, offset: y + h + 1.0 });

    } else if (z.kind === 'entrance'){
      // Túnel de arcos (varios marcos / toroides a lo largo de la profundidad)
      const count = 7;
      const span = dp;
      for (let i=0;i<count;i++){
        const t = count>1 ? i/(count-1) : 0.5;
        const az = -span/2 + t*span;
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(w/2, 0.18 + 0.06*Math.sin(t*Math.PI), 10, 40, Math.PI),
          mat(col,{emis:0.4 + 0.5*(1-Math.abs(t-0.5)*2)})
        );
        arch.position.set(0, 0, az);
        arch.castShadow = true;
        g.add(arch);
      }
      labelTargets.push({ el: mkLabel(z), obj: g, offset: w/2 + 1.4 });

    } else if (z.kind === 'lounge'){
      // Plataforma baja + mobiliario simple
      const plat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, dp), mat(col,{emis:0.05,rough:0.7,metal:0.1}));
      plat.position.y = 0.125; plat.receiveShadow = true; plat.castShadow = true;
      g.add(plat);
      // sofás/pufs
      const seats = 4;
      for (let i=0;i<seats;i++){
        const a = (i/seats)*Math.PI*2;
        const s = new THREE.Mesh(new THREE.BoxGeometry(w*0.22, 0.6, dp*0.22), mat(col,{emis:0.08,rough:0.8,metal:0.05}));
        s.position.set(Math.cos(a)*w*0.26, 0.55, Math.sin(a)*dp*0.26);
        s.castShadow = true;
        g.add(s);
      }
      // mesa central
      const tbl = new THREE.Mesh(new THREE.CylinderGeometry(w*0.12, w*0.12, 0.5, 24), mat(C.primary,{emis:0.15}));
      tbl.position.y = 0.5; tbl.castShadow = true;
      g.add(tbl);
      labelTargets.push({ el: mkLabel(z), obj: g, offset: 1.6 });

    } else if (z.kind === 'bar'){
      // Mostrador
      const counter = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), mat(col,{emis:0.15,metal:0.4,rough:0.35}));
      counter.position.y = h/2; counter.castShadow = true; counter.receiveShadow = true;
      g.add(counter);
      // tapa
      const top = new THREE.Mesh(new THREE.BoxGeometry(w*1.06, 0.12, dp*1.2), mat(C.ink,{emis:0.05,metal:0.2,rough:0.4}));
      top.position.y = h + 0.06; top.castShadow = true;
      g.add(top);
      // luz de barra
      const strip = new THREE.Mesh(new THREE.BoxGeometry(w*0.92, 0.06, 0.06), mat(col,{emis:1.0}));
      strip.position.set(0, h*0.4, dp/2 + 0.02);
      g.add(strip);
      labelTargets.push({ el: mkLabel(z), obj: g, offset: h + 1.2 });

    } else {
      // stand / installation / default -> prisma
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), mat(col,{emis:0.16,metal:0.3,rough:0.4}));
      box.position.y = h/2; box.castShadow = true; box.receiveShadow = true;
      g.add(box);
      // marco luminoso superior
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(w*1.01, h*1.01, dp*1.01)),
        new THREE.LineBasicMaterial({ color: new THREE.Color(col), transparent:true, opacity:0.8 })
      );
      wire.position.y = h/2;
      g.add(wire);
      labelTargets.push({ el: mkLabel(z), obj: g, offset: h + 1.2 });
    }

    scene.add(g);
  }

  function mkLabel(z){
    const el = document.createElement('div');
    el.className = 'zlabel';
    el.textContent = z.name;
    el.style.setProperty('--zc', z.color);
    labelsEl.appendChild(el);
    return el;
  }

  // ---- Proyección de etiquetas ----
  const v = new THREE.Vector3();
  function updateLabels(){
    const W = window.innerWidth, H = window.innerHeight;
    for (const t of labelTargets){
      v.set(t.obj.position.x, t.offset, t.obj.position.z);
      v.project(camera);
      const behind = v.z > 1;
      if (behind){ t.el.style.opacity = '0'; continue; }
      const sx = (v.x * 0.5 + 0.5) * W;
      const sy = (-v.y * 0.5 + 0.5) * H;
      t.el.style.left = sx + 'px';
      t.el.style.top = sy + 'px';
      t.el.style.opacity = '1';
    }
  }

  // ---- Controles UI ----
  const btnRotate = document.getElementById('btnRotate');
  btnRotate.dataset.on = String(controls.autoRotate); // refleja el estado real (?rot=0)
  btnRotate.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    btnRotate.dataset.on = String(controls.autoRotate);
  });
  const btnReset = document.getElementById('btnReset');
  btnReset.addEventListener('click', () => {
    camera.position.copy(HOME);
    controls.target.set(0, 2, 0);
    controls.update();
  });

  // ---- Resize ----
  function onResize(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  // ---- Loop ----
  function tick(){
    controls.update();
    updateLabels();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  // Listo: ocultar loader.
  statusEl.classList.add('done');
  statusEl.style.display = 'none';
}
</script>
</body>
</html>`;

  const out = { 'scene3d/index.html': html };
  if (vendor) {
    out['scene3d/vendor/three.module.js'] = vendor.three;
    out['scene3d/vendor/OrbitControls.js'] = vendor.orbit;
  }
  return out;
}

function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

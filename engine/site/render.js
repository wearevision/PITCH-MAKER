// site/render.js — microsite estático premium (contrato: renderSite(proposal, ctx) => {relpath: string}).
// Genérico y data-driven: todo sale de proposal + ctx (budget computado + brand resuelto).
// No escribe a disco; build.js persiste bajo proposals/<slug>/dist/.
// Devuelve tres archivos: site/index.html, site/styles.css, site/app.js.

import { money, pct } from '../lib/money.js';
import { esc, attr } from '../lib/html.js';
import { resolveBrand, toCssVars, brandGradient } from '../lib/brand.js';

/**
 * @param {import('../lib/schema.js').Proposal} proposal
 * @param {{ budget: import('../budget/model.js').ComputedBudget, brand: any }} ctx
 * @returns {Record<string,string>}
 */
export function renderSite(proposal, ctx) {
  const brand = resolveBrand(ctx.brand || proposal.brand);
  const budget = ctx.budget;

  return {
    'site/index.html': renderHtml(proposal, budget, brand),
    'site/styles.css': renderCss(brand),
    'site/app.js': renderJs(),
  };
}

/* ----------------------------------------------------------------- helpers */

const fmtDateLong = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);
};

const num = (n) => new Intl.NumberFormat('es-CL').format(n);

// Divide un texto "Título — descripción" en {head, body} para la narrativa.
function splitStep(s) {
  const str = String(s ?? '');
  const m = str.split(/\s+[—–-]\s+/);
  if (m.length >= 2) return { head: m[0], body: m.slice(1).join(' — ') };
  return { head: '', body: str };
}

const two = (s) => esc(String(s ?? '').trim().slice(0, 2).toUpperCase());

/* -------------------------------------------------------------------- HTML */

function renderHtml(proposal, budget, brand) {
  const meta = proposal.meta || {};
  const brief = proposal.brief || {};
  const concept = proposal.concept || {};
  const program = proposal.program || [];
  const team = proposal.team || [];
  const diffs = proposal.differentiators || [];
  const contact = proposal.contact || {};
  const scen = proposal.scenography || {};
  const venue = brief.venue || {};
  const c = brand.colors;
  const cur = budget.currency;

  const brandName = brand.name || meta.client || 'PITCH';
  const conceptName = concept.name || meta.project || brandName;
  const statement = concept.statement || brief.summary || '';
  const tagline = brand.tagline || '';

  // Secciones de navegación disponibles según datos presentes.
  const navItems = [
    concept.pillars?.length && ['concepto', 'Concepto'],
    concept.narrative?.length && ['recorrido', 'Recorrido'],
    scen.zones?.length && ['escenografia', 'Escenografía'],
    program.length && ['programa', 'Programa'],
    budget.groups?.length && ['presupuesto', 'Inversión'],
    (team.length || diffs.length) && ['equipo', 'Equipo'],
    ['contacto', 'Contacto'],
  ].filter(Boolean);

  const navLinks = navItems
    .map(([id, label]) => `<a href="#${attr(id)}" data-nav="${attr(id)}">${esc(label)}</a>`)
    .join('\n        ');

  // Metadatos de contexto para el hero.
  const heroMeta = [
    venue.name && [venue.name, venue.city].filter(Boolean).join(' · '),
    venue.date && fmtDateLong(venue.date),
    brief.audience?.size && `${num(brief.audience.size)} invitados`,
  ].filter(Boolean);

  const grad = brandGradient(brand, 135);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(conceptName)} — ${esc(brandName)}</title>
<meta name="description" content="${attr(statement.slice(0, 180))}">
<style>
${toCssVars(brand)}
:root{ --grad-brand: ${grad}; }
</style>
<link rel="stylesheet" href="styles.css">
</head>
<body>

<div class="progress" aria-hidden="true"><span id="progressBar"></span></div>

<header class="nav" id="nav">
  <div class="nav__inner">
    <a class="nav__brand" href="#top">
      <span class="nav__mark">${two(brandName)}</span>
      <span class="nav__name">${esc(brandName)}</span>
    </a>
    <nav class="nav__links" aria-label="Secciones">
      ${navLinks}
    </nav>
    <a class="nav__cta" href="#contacto">Conversemos</a>
    <button class="nav__burger" id="burger" aria-label="Menú" aria-expanded="false"><span></span><span></span></button>
  </div>
</header>

<main id="top">

  <!-- HERO -->
  <section class="hero" id="hero">
    <div class="hero__bg" aria-hidden="true"></div>
    <div class="hero__grain" aria-hidden="true"></div>
    <div class="hero__inner">
      ${tagline ? `<div class="hero__kicker reveal">${esc(tagline)}</div>` : ''}
      <h1 class="hero__title reveal">${esc(conceptName)}</h1>
      ${statement ? `<p class="hero__statement reveal">${esc(statement)}</p>` : ''}
      ${heroMeta.length ? `<ul class="hero__meta reveal">
        ${heroMeta.map((m) => `<li>${esc(m)}</li>`).join('\n        ')}
      </ul>` : ''}
      <div class="hero__actions reveal">
        <a class="btn btn--solid" href="#concepto">Ver la experiencia</a>
        <a class="btn btn--ghost" href="#presupuesto">Inversión</a>
      </div>
    </div>
    <a class="hero__scroll" href="#concepto" aria-label="Bajar"><span></span></a>
  </section>

  ${concept.pillars?.length ? renderPillars(concept) : ''}
  ${concept.narrative?.length ? renderNarrative(concept) : ''}
  ${scen.zones?.length ? renderScene(scen) : ''}
  ${program.length ? renderProgram(program) : ''}
  ${budget.groups?.length ? renderBudgetSection(budget, cur, brief) : ''}
  ${team.length || diffs.length ? renderTeam(team, diffs) : ''}
  ${renderContact(contact, conceptName, meta)}

</main>

<footer class="foot">
  <div class="foot__inner">
    <span>${esc(brandName)}${tagline ? ` — ${esc(tagline)}` : ''}</span>
    <span>© <span id="year"></span>${contact.org ? ` · ${esc(contact.org)}` : ''}</span>
  </div>
</footer>

<script src="app.js" defer></script>
</body>
</html>`;
}

/* ----------------------------------------------------------- secciones */

function sectionHead(kicker, title, lead) {
  return `<div class="sec__head reveal">
      <span class="kicker">${esc(kicker)}</span>
      <h2 class="sec__title">${esc(title)}</h2>
      ${lead ? `<p class="sec__lead">${esc(lead)}</p>` : ''}
    </div>`;
}

function renderPillars(concept) {
  const cards = (concept.pillars || []).map((p, i) => `
      <article class="pillar reveal" style="--i:${i}">
        <div class="pillar__icon" aria-hidden="true">${esc(p.icon || '◆')}</div>
        <h3 class="pillar__title">${esc(p.title || '')}</h3>
        <p class="pillar__desc">${esc(p.desc || '')}</p>
        <span class="pillar__num">0${i + 1}</span>
      </article>`).join('');

  return `<section class="sec sec--concept" id="concepto">
    <div class="wrap">
      ${sectionHead('Concepto', concept.name || 'El concepto', 'Los pilares que sostienen la experiencia.')}
      <div class="pillars">${cards}
      </div>
    </div>
  </section>`;
}

function renderNarrative(concept) {
  const steps = (concept.narrative || []).map((s, i) => {
    const { head, body } = splitStep(s);
    return `
      <li class="step reveal" style="--i:${i}">
        <div class="step__marker"><span>${String(i + 1).padStart(2, '0')}</span></div>
        <div class="step__body">
          ${head ? `<h3 class="step__title">${esc(head)}</h3>` : ''}
          <p class="step__text">${esc(body)}</p>
        </div>
      </li>`;
  }).join('');

  return `<section class="sec sec--narrative" id="recorrido">
    <div class="wrap">
      ${sectionHead('Recorrido', 'El viaje, paso a paso', 'Una secuencia dramatúrgica de principio a fin.')}
      <ol class="steps">${steps}
      </ol>
    </div>
  </section>`;
}

function renderScene(scen) {
  const zones = scen.zones || [];
  const chips = zones.slice(0, 8).map((z) =>
    `<li><span class="dot" style="background:${attr(z.color || 'var(--c-primary)')}"></span>${esc(z.name || z.id || '')}</li>`
  ).join('\n        ');

  return `<section class="sec sec--scene" id="escenografia">
    <div class="wrap">
      ${sectionHead('Escenografía 3D', 'El espacio, en volumen', scen.summary || '')}
      <figure class="scene reveal">
        <div class="scene__frame">
          <iframe src="../scene3d/index.html" title="Escenografía 3D interactiva" loading="lazy" allowfullscreen></iframe>
        </div>
        <figcaption class="scene__cap">
          <span class="scene__hint">Arrastra para orbitar · scroll para acercar</span>
          ${zones.length ? `<ul class="scene__legend">
        ${chips}
      </ul>` : ''}
        </figcaption>
      </figure>
    </div>
  </section>`;
}

function renderProgram(program) {
  const rows = (program || []).map((p, i) => `
      <li class="agenda__row reveal" style="--i:${i}">
        <div class="agenda__time">${esc(p.time || '')}</div>
        <div class="agenda__line" aria-hidden="true"></div>
        <div class="agenda__body">
          <h3 class="agenda__title">${esc(p.title || '')}</h3>
          ${p.desc ? `<p class="agenda__desc">${esc(p.desc)}</p>` : ''}
        </div>
      </li>`).join('');

  return `<section class="sec sec--program" id="programa">
    <div class="wrap">
      ${sectionHead('Programa', 'La noche, hora a hora', 'Guion operativo de la jornada.')}
      <ol class="agenda">${rows}
      </ol>
    </div>
  </section>`;
}

function renderBudgetSection(budget, cur, brief) {
  const groups = [...(budget.groups || [])].sort((a, b) => b.share - a.share);
  const bars = groups.map((g, i) => `
        <li class="bar reveal" style="--i:${i}">
          <div class="bar__top">
            <span class="bar__name">${esc(g.name)}</span>
            <span class="bar__pct">${esc(pct(g.share))}</span>
          </div>
          <div class="bar__track"><span class="bar__fill" style="--w:${(g.share * 100).toFixed(1)}%"></span></div>
          <span class="bar__amt">${esc(money(g.subtotal, cur))}</span>
        </li>`).join('');

  const totalDigits = String(Math.round(budget.total));
  const perPax = budget.perPax != null;

  const stats = [
    ['Neto', money(budget.net, cur)],
    budget.iva && [`IVA ${pct(budget.ivaRate)}`, money(budget.ivaAmt, cur)],
    perPax && ['Por invitado', money(budget.perPax, cur)],
  ].filter(Boolean);

  return `<section class="sec sec--budget" id="presupuesto">
    <div class="wrap">
      ${sectionHead('Inversión', 'Presupuesto, en una mirada', 'Distribución por rubro. El desglose completo está a un clic.')}
      <div class="budget">
        <div class="budget__bars reveal">
          <ul class="bars">${bars}
          </ul>
        </div>
        <aside class="budget__total reveal">
          <span class="budget__label">Inversión total ${budget.iva ? 'con IVA' : ''}</span>
          <div class="budget__figure" data-count="${attr(totalDigits)}" data-prefix="${cur === 'CLP' ? '$' : ''}" data-suffix="${cur === 'CLP' ? '' : ' ' + cur}">${esc(money(budget.total, cur))}</div>
          <ul class="budget__stats">
            ${stats.map(([k, v]) => `<li><span>${esc(k)}</span><strong>${esc(v)}</strong></li>`).join('\n            ')}
          </ul>
          <a class="btn btn--solid budget__link" href="../budget/presupuesto.html">Ver desglose completo</a>
          ${budget.options?.length ? `<div class="budget__opts">
            ${budget.options.map((o) => {
              const sign = o.deltaPct > 0 ? '+' : '';
              return `<div class="opt"><span class="opt__name">${esc(o.name)}</span><span class="opt__delta ${o.deltaPct >= 0 ? 'is-up' : 'is-down'}">${esc(sign + pct(o.deltaPct))}</span><span class="opt__val">${esc(money(o.total, cur))}</span></div>`;
            }).join('\n            ')}
          </div>` : ''}
        </aside>
      </div>
    </div>
  </section>`;
}

function renderTeam(team, diffs) {
  const people = (team || []).map((t, i) => `
        <article class="member reveal" style="--i:${i}">
          <div class="member__avatar" aria-hidden="true">${two(t.name || t.role)}</div>
          <div class="member__info">
            <span class="member__role">${esc(t.role || '')}</span>
            <h3 class="member__name">${esc(t.name || '')}</h3>
            ${t.bio ? `<p class="member__bio">${esc(t.bio)}</p>` : ''}
          </div>
        </article>`).join('');

  const cards = (diffs || []).map((d, i) => `
        <article class="diff reveal" style="--i:${i}">
          <span class="diff__mark" aria-hidden="true"></span>
          <h3 class="diff__title">${esc(d.title || '')}</h3>
          <p class="diff__desc">${esc(d.desc || '')}</p>
        </article>`).join('');

  return `<section class="sec sec--team" id="equipo">
    <div class="wrap">
      ${sectionHead('Quiénes', 'Equipo y diferencia', 'Las personas y las razones detrás de la propuesta.')}
      ${team.length ? `<div class="members">${people}
      </div>` : ''}
      ${diffs.length ? `<div class="diffs">${cards}
      </div>` : ''}
    </div>
  </section>`;
}

function renderContact(contact, conceptName, meta) {
  const rows = [
    contact.name && ['Contacto', contact.name],
    contact.email && ['Email', contact.email, `mailto:${contact.email}`],
    contact.phone && ['Teléfono', contact.phone, `tel:${String(contact.phone).replace(/\s+/g, '')}`],
    contact.org && ['Organización', contact.org],
  ].filter(Boolean);

  const items = rows.map(([k, v, href]) => `
        <div class="cta__row">
          <dt>${esc(k)}</dt>
          <dd>${href ? `<a href="${attr(href)}">${esc(v)}</a>` : esc(v)}</dd>
        </div>`).join('');

  const primaryHref = contact.email ? `mailto:${contact.email}` : '#top';

  return `<section class="sec sec--cta" id="contacto">
    <div class="cta__bg" aria-hidden="true"></div>
    <div class="wrap cta__wrap">
      <div class="cta__head reveal">
        <span class="kicker">Siguiente paso</span>
        <h2 class="cta__title">Hagamos de ${esc(conceptName)} una realidad.</h2>
        <p class="cta__lead">Estamos listos para presentar, ajustar y producir. Conversemos.</p>
        <a class="btn btn--solid btn--lg" href="${attr(primaryHref)}">Iniciar conversación</a>
      </div>
      ${items ? `<dl class="cta__grid reveal">${items}
      </dl>` : ''}
    </div>
  </section>`;
}

/* --------------------------------------------------------------------- CSS */

function renderCss(brand) {
  // brand tokens ya inyectados como :root en index.html <style>. Aquí solo layout/estética.
  return `/* microsite premium — dark, mobile-first, tipografía fluida */
*,*::before,*::after{ box-sizing:border-box; }
* { margin:0; padding:0; }

html{ scroll-behavior:smooth; -webkit-text-size-adjust:100%; }
@media (prefers-reduced-motion: reduce){
  html{ scroll-behavior:auto; }
  *,*::before,*::after{ animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; }
}

body{
  background:var(--c-bg);
  color:var(--c-ink);
  font-family:var(--font-body);
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
  overflow-x:hidden;
}
img,iframe{ max-width:100%; }
a{ color:inherit; text-decoration:none; }

.wrap{ width:100%; max-width:1120px; margin-inline:auto; padding-inline:clamp(20px,5vw,48px); }

.kicker{
  display:inline-block;
  text-transform:uppercase;
  letter-spacing:.32em;
  font-size:clamp(10px,1.4vw,12px);
  color:var(--c-primary);
  margin-bottom:14px;
}

/* ---- barra de progreso ---- */
.progress{ position:fixed; top:0; left:0; right:0; height:3px; z-index:60; background:transparent; }
.progress span{ display:block; height:100%; width:0; background:var(--grad-brand); transition:width .1s linear; }

/* ---- nav ---- */
.nav{
  position:fixed; top:0; left:0; right:0; z-index:50;
  transition:background .35s ease, border-color .35s ease, backdrop-filter .35s ease;
  border-bottom:1px solid transparent;
}
.nav.is-stuck{
  background:color-mix(in srgb, var(--c-bg) 82%, transparent);
  backdrop-filter:blur(14px) saturate(1.2);
  border-bottom-color:var(--c-line);
}
.nav__inner{
  max-width:1120px; margin-inline:auto;
  padding:16px clamp(20px,5vw,48px);
  display:flex; align-items:center; gap:20px;
}
.nav__brand{ display:flex; align-items:center; gap:12px; font-weight:700; }
.nav__mark{
  width:38px; height:38px; display:grid; place-items:center;
  border-radius:11px; background:var(--grad-brand); color:var(--c-bg);
  font-family:var(--font-display); font-weight:800; font-size:15px; letter-spacing:.02em;
}
.nav__name{ font-family:var(--font-display); font-size:17px; letter-spacing:.01em; }
.nav__links{ display:flex; gap:6px; margin-left:auto; }
.nav__links a{
  font-size:13.5px; color:var(--c-ink-soft); padding:8px 12px; border-radius:999px;
  transition:color .2s ease, background .2s ease;
}
.nav__links a:hover{ color:var(--c-ink); }
.nav__links a.is-active{ color:var(--c-bg); background:var(--c-primary); }
.nav__cta{
  font-size:13.5px; font-weight:600; padding:9px 18px; border-radius:999px;
  border:1px solid var(--c-line); color:var(--c-ink);
  transition:border-color .2s ease, background .2s ease;
}
.nav__cta:hover{ border-color:var(--c-primary); background:color-mix(in srgb,var(--c-primary) 12%,transparent); }
.nav__burger{ display:none; flex-direction:column; gap:5px; width:40px; height:40px; align-items:center; justify-content:center; background:none; border:1px solid var(--c-line); border-radius:10px; cursor:pointer; }
.nav__burger span{ width:18px; height:2px; background:var(--c-ink); transition:transform .3s ease, opacity .3s ease; }
.nav__burger[aria-expanded="true"] span:first-child{ transform:translateY(3.5px) rotate(45deg); }
.nav__burger[aria-expanded="true"] span:last-child{ transform:translateY(-3.5px) rotate(-45deg); }

/* ---- botones ---- */
.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:10px;
  font-weight:600; font-size:15px; letter-spacing:.01em;
  padding:14px 26px; border-radius:999px; cursor:pointer;
  transition:transform .2s ease, box-shadow .3s ease, opacity .2s ease;
  border:1px solid transparent; white-space:nowrap;
}
.btn--lg{ padding:17px 34px; font-size:16px; }
.btn--solid{ background:var(--grad-brand); color:var(--c-bg); box-shadow:0 12px 40px -12px color-mix(in srgb,var(--c-primary) 70%,transparent); }
.btn--solid:hover{ transform:translateY(-2px); box-shadow:0 18px 50px -12px color-mix(in srgb,var(--c-secondary) 60%,transparent); }
.btn--ghost{ border-color:var(--c-line); color:var(--c-ink); }
.btn--ghost:hover{ border-color:var(--c-primary); background:color-mix(in srgb,var(--c-primary) 10%,transparent); }

/* ---- hero ---- */
.hero{
  position:relative; min-height:100svh; display:flex; align-items:center;
  overflow:hidden; padding:120px 0 80px;
}
.hero__bg{
  position:absolute; inset:-20% -10% -10%;
  background:
    radial-gradient(60% 60% at 18% 20%, color-mix(in srgb,var(--c-primary) 42%,transparent), transparent 60%),
    radial-gradient(55% 55% at 82% 30%, color-mix(in srgb,var(--c-secondary) 40%,transparent), transparent 62%),
    radial-gradient(70% 70% at 50% 100%, color-mix(in srgb,var(--c-accent) 30%,transparent), transparent 60%);
  filter:blur(10px) saturate(1.15);
  animation:drift 18s ease-in-out infinite alternate;
  z-index:0;
}
@keyframes drift{
  0%{ transform:translate3d(0,0,0) scale(1); }
  50%{ transform:translate3d(-3%,2%,0) scale(1.06); }
  100%{ transform:translate3d(3%,-2%,0) scale(1.03); }
}
.hero__grain{
  position:absolute; inset:0; z-index:1; opacity:.5; pointer-events:none;
  background:
    linear-gradient(to bottom, transparent 55%, var(--c-bg) 100%),
    repeating-linear-gradient(115deg, transparent 0 3px, color-mix(in srgb,var(--c-bg) 40%,transparent) 3px 4px);
  mix-blend-mode:multiply;
}
.hero__inner{ position:relative; z-index:2; width:100%; max-width:1120px; margin-inline:auto; padding-inline:clamp(20px,5vw,48px); }
.hero__kicker{
  display:inline-block; font-size:clamp(12px,1.6vw,14px); letter-spacing:.3em;
  text-transform:uppercase; color:var(--c-ink);
  padding:8px 16px; border:1px solid var(--c-line); border-radius:999px;
  background:color-mix(in srgb,var(--c-bg) 40%,transparent); margin-bottom:26px;
}
.hero__title{
  font-family:var(--font-display); font-weight:800;
  font-size:clamp(44px,9vw,120px); line-height:.98; letter-spacing:-.02em;
  max-width:16ch;
}
.hero__statement{
  margin-top:26px; max-width:60ch;
  font-size:clamp(16px,2.1vw,21px); color:var(--c-ink-soft); line-height:1.65;
}
.hero__meta{
  list-style:none; display:flex; flex-wrap:wrap; gap:10px 14px; margin-top:30px;
}
.hero__meta li{
  font-size:13.5px; color:var(--c-ink); padding:7px 15px; border-radius:999px;
  border:1px solid var(--c-line); background:color-mix(in srgb,var(--c-bg-alt) 60%,transparent);
}
.hero__actions{ display:flex; flex-wrap:wrap; gap:14px; margin-top:38px; }
.hero__scroll{
  position:absolute; left:50%; bottom:30px; transform:translateX(-50%); z-index:2;
  width:26px; height:42px; border:2px solid color-mix(in srgb,var(--c-ink) 45%,transparent); border-radius:14px;
}
.hero__scroll span{
  position:absolute; left:50%; top:8px; width:4px; height:8px; border-radius:2px;
  background:var(--c-ink); transform:translateX(-50%); animation:scrolldot 1.8s ease-in-out infinite;
}
@keyframes scrolldot{ 0%,100%{ opacity:0; transform:translate(-50%,0);} 50%{ opacity:1; transform:translate(-50%,10px);} }

/* ---- secciones base ---- */
.sec{ position:relative; padding:clamp(72px,11vw,140px) 0; border-top:1px solid var(--c-line); }
.sec--concept{ border-top:none; }
.sec__head{ max-width:60ch; margin-bottom:clamp(40px,6vw,72px); }
.sec__title{
  font-family:var(--font-display); font-weight:800;
  font-size:clamp(30px,5.5vw,60px); line-height:1.02; letter-spacing:-.015em;
}
.sec__lead{ margin-top:18px; font-size:clamp(15px,1.9vw,19px); color:var(--c-ink-soft); }

/* ---- pilares ---- */
.pillars{ display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:clamp(16px,2vw,24px); }
.pillar{
  position:relative; overflow:hidden;
  padding:32px 28px; border:1px solid var(--c-line); border-radius:calc(var(--radius)*1px);
  background:linear-gradient(160deg, var(--c-bg-alt), color-mix(in srgb,var(--c-bg-alt) 40%,transparent));
  transition:border-color .3s ease, transform .3s ease;
}
.pillar:hover{ border-color:color-mix(in srgb,var(--c-primary) 55%,transparent); transform:translateY(-4px); }
.pillar__icon{ font-size:34px; line-height:1; color:var(--c-primary); margin-bottom:22px; }
.pillar__title{ font-family:var(--font-display); font-size:clamp(19px,2.3vw,23px); font-weight:700; margin-bottom:10px; }
.pillar__desc{ color:var(--c-ink-soft); font-size:14.5px; }
.pillar__num{
  position:absolute; top:18px; right:22px; font-family:var(--font-display);
  font-size:52px; font-weight:800; line-height:1; color:color-mix(in srgb,var(--c-line) 70%,transparent);
  pointer-events:none;
}

/* ---- narrativa ---- */
.steps{ list-style:none; position:relative; max-width:760px; }
.steps::before{ content:""; position:absolute; left:26px; top:12px; bottom:12px; width:2px; background:linear-gradient(var(--c-primary),var(--c-secondary),var(--c-accent)); opacity:.5; }
.step{ position:relative; display:flex; gap:26px; padding:18px 0; }
.step__marker{ flex:0 0 auto; width:54px; height:54px; display:grid; place-items:center; border-radius:50%; background:var(--c-bg); border:2px solid var(--c-primary); font-family:var(--font-display); font-weight:800; font-size:16px; color:var(--c-primary); z-index:1; }
.step__body{ padding-top:6px; }
.step__title{ font-family:var(--font-display); font-size:clamp(19px,2.4vw,24px); font-weight:700; margin-bottom:6px; }
.step__text{ color:var(--c-ink-soft); font-size:15px; }

/* ---- escena 3D ---- */
.scene__frame{
  position:relative; width:100%; aspect-ratio:16/9;
  border:1px solid var(--c-line); border-radius:calc(var(--radius)*1px); overflow:hidden;
  background:var(--c-bg-alt); box-shadow:0 40px 120px -40px rgba(0,0,0,.7);
}
.scene__frame iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; display:block; }
.scene__cap{ display:flex; flex-wrap:wrap; align-items:center; gap:14px 24px; margin-top:18px; }
.scene__hint{ font-size:13px; color:var(--c-ink-soft); }
.scene__legend{ list-style:none; display:flex; flex-wrap:wrap; gap:8px 16px; margin-left:auto; }
.scene__legend li{ display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--c-ink-soft); }
.scene__legend .dot{ width:10px; height:10px; border-radius:3px; display:inline-block; }

/* ---- agenda ---- */
.agenda{ list-style:none; max-width:820px; }
.agenda__row{ display:grid; grid-template-columns:88px 24px 1fr; align-items:start; gap:0 8px; }
.agenda__time{ font-family:var(--font-mono); font-size:15px; font-weight:600; color:var(--c-primary); padding-top:14px; }
.agenda__line{ position:relative; justify-self:center; width:2px; background:var(--c-line); height:100%; }
.agenda__row:first-child .agenda__line{ margin-top:20px; }
.agenda__line::before{ content:""; position:absolute; top:18px; left:50%; transform:translateX(-50%); width:11px; height:11px; border-radius:50%; background:var(--c-bg); border:2px solid var(--c-primary); }
.agenda__body{ padding:14px 0 26px; }
.agenda__title{ font-family:var(--font-display); font-size:clamp(17px,2.1vw,21px); font-weight:700; }
.agenda__desc{ color:var(--c-ink-soft); font-size:14.5px; margin-top:4px; }

/* ---- presupuesto ---- */
.budget{ display:grid; grid-template-columns:1.4fr 1fr; gap:clamp(24px,4vw,52px); align-items:start; }
.bars{ list-style:none; display:flex; flex-direction:column; gap:20px; }
.bar__top{ display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin-bottom:8px; }
.bar__name{ font-weight:600; font-size:15px; }
.bar__pct{ font-family:var(--font-mono); font-size:13px; color:var(--c-primary); }
.bar__track{ height:10px; border-radius:999px; background:color-mix(in srgb,var(--c-line) 60%,transparent); overflow:hidden; }
.bar__fill{ display:block; height:100%; width:0; border-radius:999px; background:var(--grad-brand); transition:width 1.1s cubic-bezier(.16,1,.3,1); }
.bar.is-in .bar__fill{ width:var(--w); }
.bar__amt{ display:block; margin-top:6px; font-size:12.5px; color:var(--c-ink-soft); font-variant-numeric:tabular-nums; }
.budget__total{
  position:sticky; top:96px;
  border:1px solid var(--c-line); border-radius:calc(var(--radius)*1px);
  padding:32px 30px; background:linear-gradient(165deg, var(--c-bg-alt), color-mix(in srgb,var(--c-secondary) 8%,var(--c-bg-alt)));
}
.budget__label{ text-transform:uppercase; letter-spacing:.18em; font-size:11px; color:var(--c-ink-soft); }
.budget__figure{
  font-family:var(--font-display); font-weight:800; letter-spacing:-.02em;
  font-size:clamp(34px,5.5vw,52px); line-height:1.05; margin:10px 0 22px;
  color:var(--c-primary); font-variant-numeric:tabular-nums;
}
.budget__stats{ list-style:none; display:flex; flex-direction:column; gap:10px; padding-bottom:24px; border-bottom:1px solid var(--c-line); margin-bottom:24px; }
.budget__stats li{ display:flex; justify-content:space-between; align-items:baseline; font-size:14px; }
.budget__stats span{ color:var(--c-ink-soft); }
.budget__stats strong{ font-variant-numeric:tabular-nums; }
.budget__link{ width:100%; }
.budget__opts{ margin-top:22px; display:flex; flex-direction:column; gap:10px; }
.opt{ display:flex; align-items:baseline; gap:10px; font-size:13.5px; }
.opt__name{ flex:1; color:var(--c-ink-soft); }
.opt__delta{ font-family:var(--font-mono); font-size:12px; }
.opt__delta.is-up{ color:var(--c-secondary); }
.opt__delta.is-down{ color:var(--c-good); }
.opt__val{ font-variant-numeric:tabular-nums; font-weight:600; }

/* ---- equipo + diferenciadores ---- */
.members{ display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:clamp(14px,2vw,20px); margin-bottom:clamp(40px,6vw,64px); }
.member{ display:flex; gap:16px; padding:22px; border:1px solid var(--c-line); border-radius:calc(var(--radius)*1px); background:var(--c-bg-alt); transition:border-color .3s ease; }
.member:hover{ border-color:color-mix(in srgb,var(--c-primary) 45%,transparent); }
.member__avatar{ flex:0 0 auto; width:52px; height:52px; display:grid; place-items:center; border-radius:14px; background:var(--grad-brand); color:var(--c-bg); font-family:var(--font-display); font-weight:800; font-size:17px; }
.member__role{ text-transform:uppercase; letter-spacing:.14em; font-size:10.5px; color:var(--c-primary); }
.member__name{ font-family:var(--font-display); font-size:18px; font-weight:700; margin:3px 0 6px; }
.member__bio{ font-size:13.5px; color:var(--c-ink-soft); }
.diffs{ display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:clamp(14px,2vw,20px); }
.diff{ position:relative; padding:28px 26px 26px; border:1px solid var(--c-line); border-radius:calc(var(--radius)*1px); background:linear-gradient(160deg,var(--c-bg-alt),transparent); }
.diff__mark{ display:block; width:34px; height:4px; border-radius:999px; background:var(--grad-brand); margin-bottom:18px; }
.diff__title{ font-family:var(--font-display); font-size:clamp(18px,2.2vw,21px); font-weight:700; margin-bottom:8px; }
.diff__desc{ color:var(--c-ink-soft); font-size:14.5px; }

/* ---- CTA final ---- */
.sec--cta{ position:relative; overflow:hidden; border-top:none; }
.cta__bg{ position:absolute; inset:0; z-index:0; opacity:.9;
  background:radial-gradient(70% 90% at 20% 10%, color-mix(in srgb,var(--c-primary) 26%,transparent), transparent 60%),
            radial-gradient(60% 80% at 90% 90%, color-mix(in srgb,var(--c-secondary) 26%,transparent), transparent 60%);
}
.cta__wrap{ position:relative; z-index:1; display:grid; grid-template-columns:1.3fr 1fr; gap:clamp(30px,5vw,64px); align-items:center; }
.cta__title{ font-family:var(--font-display); font-weight:800; font-size:clamp(30px,5vw,56px); line-height:1.03; letter-spacing:-.015em; max-width:16ch; }
.cta__lead{ margin:18px 0 30px; font-size:clamp(15px,1.9vw,19px); color:var(--c-ink-soft); max-width:44ch; }
.cta__grid{ border:1px solid var(--c-line); border-radius:calc(var(--radius)*1px); background:color-mix(in srgb,var(--c-bg) 55%,transparent); backdrop-filter:blur(6px); overflow:hidden; }
.cta__row{ display:flex; justify-content:space-between; align-items:baseline; gap:16px; padding:18px 24px; border-bottom:1px solid var(--c-line); }
.cta__row:last-child{ border-bottom:none; }
.cta__row dt{ text-transform:uppercase; letter-spacing:.14em; font-size:10.5px; color:var(--c-ink-soft); }
.cta__row dd{ font-weight:600; font-size:15px; text-align:right; }
.cta__row dd a:hover{ color:var(--c-primary); }

/* ---- pie ---- */
.foot{ border-top:1px solid var(--c-line); padding:34px 0; }
.foot__inner{ max-width:1120px; margin-inline:auto; padding-inline:clamp(20px,5vw,48px); display:flex; flex-wrap:wrap; gap:10px 24px; justify-content:space-between; font-size:13px; color:var(--c-ink-soft); }

/* ---- scroll reveal ---- */
.reveal{ opacity:0; transform:translateY(26px); transition:opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1); transition-delay:calc(var(--i,0) * 70ms); will-change:opacity,transform; }
.reveal.is-in{ opacity:1; transform:none; }
@media (prefers-reduced-motion: reduce){
  .reveal{ opacity:1; transform:none; }
  .bar__fill{ width:var(--w) !important; }
  .hero__bg{ animation:none; }
  .hero__scroll span{ animation:none; }
}

/* ---- responsivo ---- */
@media (max-width:900px){
  .budget{ grid-template-columns:1fr; }
  .budget__total{ position:static; }
  .cta__wrap{ grid-template-columns:1fr; }
}
@media (max-width:760px){
  .nav__links{ position:fixed; inset:64px 12px auto 12px; flex-direction:column; gap:4px; padding:14px; border-radius:calc(var(--radius)*1px); background:color-mix(in srgb,var(--c-bg) 96%,transparent); border:1px solid var(--c-line); backdrop-filter:blur(16px); transform:translateY(-12px); opacity:0; pointer-events:none; transition:opacity .25s ease, transform .25s ease; margin-left:0; }
  .nav.is-open .nav__links{ opacity:1; transform:none; pointer-events:auto; }
  .nav__cta{ display:none; }
  .nav__burger{ display:flex; margin-left:auto; }
  .step{ gap:16px; }
  .agenda__row{ grid-template-columns:66px 20px 1fr; }
}
`;
}

/* ---------------------------------------------------------------------- JS */

function renderJs() {
  return `// app.js — interacciones del microsite (vanilla, sin dependencias).
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // año dinámico
  var yEl = document.getElementById('year');
  if (yEl) yEl.textContent = String(new Date().getFullYear());

  // nav sticky + barra de progreso
  var nav = document.getElementById('nav');
  var bar = document.getElementById('progressBar');
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle('is-stuck', y > 40);
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // menú móvil
  var burger = document.getElementById('burger');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('.nav__links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // scroll reveal
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var bars = Array.prototype.slice.call(document.querySelectorAll('.bar'));
  var counted = false;

  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
    bars.forEach(function (el) { el.classList.add('is-in'); });
    paintTotal(true);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });

    // barras: animar fill al entrar
    var barIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        barIo.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    bars.forEach(function (el) { barIo.observe(el); });

    // contador del total
    var totalEl = document.querySelector('.budget__figure');
    if (totalEl) {
      var tIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !counted) { counted = true; paintTotal(false); tIo.disconnect(); }
        });
      }, { threshold: 0.5 });
      tIo.observe(totalEl);
    }
  }

  function paintTotal(instant) {
    var el = document.querySelector('.budget__figure');
    if (!el) return;
    var target = parseInt(el.getAttribute('data-count') || '0', 10);
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var nf = new Intl.NumberFormat('es-CL');
    if (instant || !target) { el.textContent = prefix + nf.format(target) + suffix; return; }
    var start = null, dur = 1400;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + nf.format(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // nav activo por sección
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  var sections = navLinks
    .map(function (a) { return document.getElementById(a.getAttribute('data-nav')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var current = '';
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) current = e.target.id;
      });
      navLinks.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('data-nav') === current);
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }
})();
`;
}

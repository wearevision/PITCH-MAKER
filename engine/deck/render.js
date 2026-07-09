// deck/render.js — genera un DECK de ~9 slides autocontenido, listo para Adobe Express.
// Contrato: renderDeck(proposal, ctx) => { "deck/index.html": string }
// Reglas Express: cada slide es un canvas fijo 1920x1080 con posicionamiento absoluto,
// texto como texto real (editable), sin recursos externos (solo CSS/SVG/data:).

import { money, pct } from '../lib/money.js';
import { esc } from '../lib/html.js';
import { resolveBrand, brandGradient } from '../lib/brand.js';

const W = 1920;
const H = 1080;

/**
 * @param {object} proposal
 * @param {{ budget: import('../budget/model.js').ComputedBudget, brand: object }} ctx
 * @returns {Record<string,string>}
 */
export function renderDeck(proposal, ctx) {
  const brand = resolveBrand(ctx.brand || proposal.brand);
  const budget = ctx.budget;
  const c = brand.colors;
  const meta = proposal.meta || {};
  const brief = proposal.brief || {};
  const concept = proposal.concept || {};
  const scen = proposal.scenography || {};
  const program = proposal.program || [];
  const team = proposal.team || [];
  const diffs = proposal.differentiators || [];
  const contact = proposal.contact || {};

  const grad = brandGradient(brand, 135);
  const gradSoft = `linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 60%, ${c.accent} 100%)`;

  // ---- helpers de texto ----
  const clientName = meta.client || brand.name || 'Cliente';
  const projectName = meta.project || '';
  const tagline = brand.tagline || '';
  const tender = meta.tender || {};
  const dateStr = fmtDate(meta.date);
  const venue = brief.venue || {};

  const slides = [];

  // ============ SLIDE 1 · PORTADA ============
  slides.push(slide(1, `background:${grad};`, `
    ${noise()}
    ${absBox(120, 120, { width: 700 }, `
      <div style="font:600 26px/1 var(--f-body);letter-spacing:.42em;text-transform:uppercase;color:rgba(10,14,26,.72)">${esc(clientName)}</div>
    `)}
    ${meta.version ? absBox(null, 120, { right: 120, width: 500, align: 'right' }, `
      <div style="font:600 22px/1 var(--f-mono);letter-spacing:.2em;color:rgba(10,14,26,.6)">${esc(meta.version)}</div>
    `) : ''}
    ${absBox(120, 340, { width: 1620 }, `
      <div style="font:800 116px/1.0 var(--f-display);letter-spacing:-.02em;color:#0A0E1A">${esc(projectName)}</div>
      ${tagline ? `<div style="margin-top:28px;font:400 40px/1.3 var(--f-body);color:rgba(10,14,26,.82);max-width:1200px">${esc(tagline)}</div>` : ''}
    `)}
    ${absBox(120, 900, { width: 1680 }, `
      <div style="display:flex;gap:56px;align-items:flex-end;font:500 24px/1.4 var(--f-body);color:rgba(10,14,26,.78)">
        ${tender.id ? kv('Licitación', tender.id) : ''}
        ${venue.name ? kv('Sede', [venue.name, venue.city].filter(Boolean).join(', ')) : ''}
        ${dateStr ? kv('Fecha', dateStr) : ''}
      </div>
    `)}
  `));

  // ============ SLIDE 2 · EL DESAFÍO ============
  {
    const objectives = (brief.objectives || []).slice(0, 5);
    slides.push(slide(2, `background:${c.bg};`, `
      ${eyebrow(120, 120, '01 — El desafío', c.primary)}
      ${absBox(120, 220, { width: 1080 }, `
        <div style="font:400 46px/1.35 var(--f-body);color:${c.ink};max-width:1000px">${esc(brief.summary || '')}</div>
      `)}
      ${absBox(1300, 220, { width: 500 }, `
        <div style="font:600 22px/1 var(--f-body);letter-spacing:.24em;text-transform:uppercase;color:${c.inkSoft};margin-bottom:36px">Objetivos</div>
        ${objectives.map((o, i) => `
          <div style="display:flex;gap:22px;margin-bottom:30px;align-items:flex-start">
            <div style="flex:0 0 auto;font:700 26px/1 var(--f-mono);color:${c.primary};min-width:40px">${String(i + 1).padStart(2, '0')}</div>
            <div style="font:400 26px/1.4 var(--f-body);color:${c.ink}">${esc(o)}</div>
          </div>
        `).join('')}
      `)}
      ${vline(1240, 220, 700, c.line)}
    `));
  }

  // ============ SLIDE 3 · CONCEPTO ============
  slides.push(slide(3, `background:${c.bgAlt};`, `
    ${bigGlow(c.secondary)}
    ${eyebrow(120, 120, '02 — Concepto', c.secondary)}
    ${absBox(120, 260, { width: 1680 }, `
      <div style="font:800 150px/.96 var(--f-display);letter-spacing:-.02em;background:${gradSoft};-webkit-background-clip:text;background-clip:text;color:transparent;max-width:1680px">${esc(concept.name || '')}</div>
    `)}
    ${absBox(120, 620, { width: 1400 }, `
      <div style="font:400 44px/1.4 var(--f-body);color:${c.ink};max-width:1400px">${esc(concept.statement || '')}</div>
    `)}
  `));

  // ============ SLIDE 4 · PILARES ============
  {
    const pillars = (concept.pillars || []).slice(0, 4);
    const cols = 2;
    const gap = 40;
    const gx = 120, gy = 300;
    const cardW = (W - gx * 2 - gap * (cols - 1)) / cols; // 800
    const cardH = 320;
    const cards = pillars.map((p, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = gx + col * (cardW + gap);
      const y = gy + row * (cardH + gap);
      const accent = [c.primary, c.secondary, c.accent, c.good][i % 4];
      return absBox(x, y, { width: cardW }, `
        <div style="width:${cardW}px;height:${cardH}px;box-sizing:border-box;padding:44px;background:${c.bgAlt};border:1px solid ${c.line};border-radius:${brand.radius}px;position:relative;overflow:hidden">
          <div style="position:absolute;left:0;top:0;width:6px;height:100%;background:${accent}"></div>
          <div style="font:400 56px/1 var(--f-display);color:${accent};margin-bottom:24px">${esc(p.icon || '◆')}</div>
          <div style="font:700 40px/1.1 var(--f-display);color:${c.ink};margin-bottom:18px">${esc(p.title || '')}</div>
          <div style="font:400 25px/1.4 var(--f-body);color:${c.inkSoft}">${esc(p.desc || '')}</div>
        </div>
      `);
    }).join('');
    slides.push(slide(4, `background:${c.bg};`, `
      ${eyebrow(120, 120, '03 — Pilares de la experiencia', c.primary)}
      ${cards}
    `));
  }

  // ============ SLIDE 5 · RECORRIDO / ESCENOGRAFÍA ============
  {
    const narrative = (concept.narrative || []).slice(0, 6);
    slides.push(slide(5, `background:${c.bgAlt};`, `
      ${eyebrow(120, 120, '04 — El recorrido', c.accent)}
      ${absBox(120, 220, { width: 900 }, `
        <div style="font:400 34px/1.4 var(--f-body);color:${c.ink};max-width:860px">${esc(scen.summary || '')}</div>
      `)}
      ${absBox(1080, 210, { width: 720 }, `
        ${narrative.map((n, i) => {
          const [head, ...rest] = String(n).split(' — ');
          const body = rest.join(' — ');
          return `
          <div style="display:flex;gap:24px;margin-bottom:22px;align-items:flex-start">
            <div style="flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:2px solid ${c.accent};display:flex;align-items:center;justify-content:center;font:700 20px/1 var(--f-mono);color:${c.accent}">${i + 1}</div>
            <div style="padding-top:3px">
              <span style="font:700 27px/1.3 var(--f-body);color:${c.ink}">${esc(head)}</span>${body ? `<span style="font:400 25px/1.35 var(--f-body);color:${c.inkSoft}"> — ${esc(body)}</span>` : ''}
            </div>
          </div>`;
        }).join('')}
      `)}
      ${vline(1020, 210, 760, c.line)}
    `));
  }

  // ============ SLIDE 6 · PROGRAMA ============
  {
    const rows = program.slice(0, 10);
    const y0 = 300;
    const rowH = Math.min(72, (H - y0 - 90) / Math.max(rows.length, 1));
    const body = rows.map((r, i) => `
      <div style="display:flex;align-items:center;height:${rowH}px;border-bottom:1px solid ${c.line}">
        <div style="flex:0 0 200px;font:700 34px/1 var(--f-mono);color:${c.primary}">${esc(r.time || '')}</div>
        <div style="flex:0 0 560px;font:700 28px/1.1 var(--f-body);color:${c.ink}">${esc(r.title || '')}</div>
        <div style="flex:1;font:400 24px/1.25 var(--f-body);color:${c.inkSoft};padding-left:20px">${esc(r.desc || '')}</div>
      </div>
    `).join('');
    slides.push(slide(6, `background:${c.bg};`, `
      ${eyebrow(120, 120, '05 — Programa de la noche', c.primary)}
      ${absBox(120, y0, { width: 1680 }, `<div style="width:1680px">${body}</div>`)}
    `));
  }

  // ============ SLIDE 7 · PRESUPUESTO ============
  {
    const groups = budget.groups || [];
    const y0 = 300;
    const rowH = Math.min(58, (H - y0 - 320) / Math.max(groups.length, 1));
    const maxShare = Math.max(...groups.map((g) => g.share || 0), 0.0001);
    const rowsHtml = groups.map((g) => {
      const barW = Math.round((g.share / maxShare) * 560);
      return `
      <div style="display:flex;align-items:center;height:${rowH}px;border-bottom:1px solid ${c.line}">
        <div style="flex:0 0 520px;font:600 25px/1.1 var(--f-body);color:${c.ink}">${esc(g.name)}</div>
        <div style="flex:0 0 620px;display:flex;align-items:center;gap:16px">
          <div style="width:560px;height:10px;background:${c.line};border-radius:6px;overflow:hidden">
            <div style="width:${barW}px;height:100%;background:${grad}"></div>
          </div>
        </div>
        <div style="flex:0 0 90px;font:600 22px/1 var(--f-mono);color:${c.inkSoft};text-align:right">${pct(g.share)}</div>
        <div style="flex:1;font:600 25px/1 var(--f-mono);color:${c.ink};text-align:right">${esc(money(g.subtotal, budget.currency))}</div>
      </div>`;
    }).join('');

    const options = (budget.options || []);
    const optHtml = options.length ? `
      <div style="display:flex;gap:24px;margin-top:6px">
        ${options.map((o) => `
          <div style="flex:1;padding:20px 24px;border:1px solid ${c.line};border-radius:14px;background:${c.bgAlt}">
            <div style="font:700 24px/1.1 var(--f-body);color:${c.ink};margin-bottom:6px">${esc(o.name)} <span style="color:${o.deltaPct >= 0 ? c.good : c.secondary};font:700 22px var(--f-mono)">${o.deltaPct >= 0 ? '+' : ''}${pct(o.deltaPct)}</span></div>
            <div style="font:600 26px/1 var(--f-mono);color:${c.primary}">${esc(money(o.total, budget.currency))}</div>
          </div>
        `).join('')}
      </div>` : '';

    slides.push(slide(7, `background:${c.bgAlt};`, `
      ${eyebrow(120, 120, '06 — Inversión', c.primary)}
      ${absBox(120, y0, { width: 1350 }, `<div style="width:1350px">${rowsHtml}</div>`)}
      ${absBox(1500, y0, { width: 300, align: 'right' }, `
        <div style="width:300px;text-align:right">
          <div style="font:600 20px/1 var(--f-body);letter-spacing:.2em;text-transform:uppercase;color:${c.inkSoft};margin-bottom:12px">Total con IVA</div>
          <div style="font:800 62px/1 var(--f-display);color:${c.primary};margin-bottom:20px">${esc(money(budget.total, budget.currency))}</div>
          <div style="font:400 22px/1.6 var(--f-body);color:${c.inkSoft}">
            Neto ${esc(money(budget.net, budget.currency))}<br>
            IVA ${esc(pct(budget.ivaRate))} ${esc(money(budget.ivaAmt, budget.currency))}
            ${budget.perPax ? `<br>${esc(money(budget.perPax, budget.currency))} / invitado` : ''}
          </div>
        </div>
      `)}
      ${optHtml ? absBox(120, H - 190, { width: 1680 }, `<div style="width:1680px">${optHtml}</div>`) : ''}
    `));
  }

  // ============ SLIDE 8 · EQUIPO & DIFERENCIADORES ============
  {
    const members = team.slice(0, 5);
    const dd = diffs.slice(0, 4);
    slides.push(slide(8, `background:${c.bg};`, `
      ${eyebrow(120, 120, '07 — Equipo & diferenciadores', c.accent)}
      ${absBox(120, 260, { width: 820 }, `
        <div style="font:600 22px/1 var(--f-body);letter-spacing:.24em;text-transform:uppercase;color:${c.inkSoft};margin-bottom:32px">Equipo</div>
        ${members.map((m) => `
          <div style="display:flex;gap:20px;margin-bottom:26px;align-items:baseline">
            <div style="flex:0 0 300px;font:700 27px/1.2 var(--f-body);color:${c.ink}">${esc(m.name || '')}</div>
            <div style="flex:1">
              <div style="font:600 22px/1.2 var(--f-body);color:${c.primary}">${esc(m.role || '')}</div>
              <div style="font:400 21px/1.35 var(--f-body);color:${c.inkSoft};margin-top:4px">${esc(m.bio || '')}</div>
            </div>
          </div>
        `).join('')}
      `)}
      ${absBox(1020, 260, { width: 780 }, `
        <div style="font:600 22px/1 var(--f-body);letter-spacing:.24em;text-transform:uppercase;color:${c.inkSoft};margin-bottom:32px">Por qué nosotros</div>
        ${dd.map((d) => `
          <div style="margin-bottom:26px;padding-left:26px;border-left:3px solid ${c.secondary}">
            <div style="font:700 28px/1.2 var(--f-body);color:${c.ink};margin-bottom:8px">${esc(d.title || '')}</div>
            <div style="font:400 23px/1.4 var(--f-body);color:${c.inkSoft}">${esc(d.desc || '')}</div>
          </div>
        `).join('')}
      `)}
      ${vline(970, 260, 700, c.line)}
    `));
  }

  // ============ SLIDE 9 · CIERRE ============
  slides.push(slide(9, `background:${grad};`, `
    ${noise()}
    ${absBox(120, 300, { width: 1680 }, `
      <div style="font:600 24px/1 var(--f-body);letter-spacing:.42em;text-transform:uppercase;color:rgba(10,14,26,.7);margin-bottom:40px">${esc(tagline || 'Hagámoslo realidad')}</div>
      <div style="font:800 118px/1.0 var(--f-display);letter-spacing:-.02em;color:#0A0E1A;max-width:1560px">Crucemos<br>el umbral juntos.</div>
    `)}
    ${absBox(120, 820, { width: 1680 }, `
      <div style="display:flex;gap:64px;align-items:flex-end;font:500 26px/1.4 var(--f-body);color:rgba(10,14,26,.82)">
        ${contact.org ? kv('Propuesta por', contact.org) : ''}
        ${contact.name ? kv('Contacto', contact.name) : ''}
        ${contact.email ? kv('Email', contact.email) : ''}
        ${contact.phone ? kv('Teléfono', contact.phone) : ''}
      </div>
    `)}
  `));

  const doc = page(slides.join('\n'), brand);
  return { 'deck/index.html': doc };
}

// ============================ helpers de layout ============================

function slide(n, styleExtra, inner) {
  return `<section class="slide" data-slide="${n}" data-canvas-width="${W}" data-canvas-height="${H}" style="position:relative;width:${W}px;height:${H}px;overflow:hidden;${styleExtra}">
${inner}
</section>`;
}

/** Caja absoluta. opts: {width,right,align} */
function absBox(x, y, opts = {}, inner) {
  const parts = ['position:absolute'];
  if (x != null) parts.push(`left:${x}px`);
  if (opts.right != null) parts.push(`right:${opts.right}px`);
  if (y != null) parts.push(`top:${y}px`);
  if (opts.width != null) parts.push(`width:${opts.width}px`);
  if (opts.align) parts.push(`text-align:${opts.align}`);
  return `<div style="${parts.join(';')}">${inner}</div>`;
}

function eyebrow(x, y, text, color) {
  return absBox(x, y, {}, `
    <div style="display:flex;align-items:center;gap:18px">
      <div style="width:44px;height:4px;background:${color}"></div>
      <div style="font:700 24px/1 var(--f-body);letter-spacing:.28em;text-transform:uppercase;color:${color}">${esc(text)}</div>
    </div>
  `);
}

function vline(x, y, h, color) {
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:1px;height:${h}px;background:${color}"></div>`;
}

function kv(label, value) {
  return `<div><div style="font:600 15px/1 var(--f-body);letter-spacing:.24em;text-transform:uppercase;opacity:.6;margin-bottom:10px">${esc(label)}</div><div style="font:600 26px/1.2 var(--f-body)">${esc(value)}</div></div>`;
}

/** Grano/textura sutil vía SVG data-uri para las portadas de gradiente. */
function noise() {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>`;
  return `<div style="position:absolute;inset:0;background-image:url(&quot;data:image/svg+xml,${svg}&quot;);opacity:.06;mix-blend-mode:overlay;pointer-events:none"></div>`;
}

/** Halo radial de acento para dar profundidad a slides oscuros. */
function bigGlow(color) {
  return `<div style="position:absolute;right:-200px;top:-200px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,${color}33 0%,transparent 70%);pointer-events:none"></div>`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return String(iso);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${Number(m[3])} de ${meses[Number(m[2]) - 1]}, ${m[1]}`;
}

function page(body, brand) {
  const f = brand.fonts;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="hz:slide-selector" content=".slide">
<title>${esc((brand.name || 'Deck'))} · Deck</title>
<style>
  :root{
    --f-display:${f.display};
    --f-body:${f.body};
    --f-mono:${f.mono};
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#05070d;font-family:var(--f-body);color:#fff}
  .deck{display:flex;flex-direction:column;align-items:center;gap:32px;padding:32px}
  .slide{flex:0 0 auto;box-shadow:0 30px 80px rgba(0,0,0,.5);border-radius:2px}
</style>
<div class="deck">
${body}
</div>`;
}

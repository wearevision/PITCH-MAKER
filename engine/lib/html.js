// html.js — helpers mínimos para emitir HTML seguro. Sin deps.

/** Escapa texto para inserción segura en HTML. */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapa para atributos (igual que esc, alias semántico). */
export const attr = esc;

/** Une clases truthy. classes('a', cond && 'b') -> "a b" */
export function classes(...xs) {
  return xs.filter(Boolean).join(' ');
}

/**
 * Tagged template que escapa interpolaciones por defecto.
 * Para insertar HTML crudo confiable, usar raw().
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    out += (v && v.__raw !== undefined ? v.__raw : escArray(v)) + strings[i + 1];
  }
  return out;
}

function escArray(v) {
  if (Array.isArray(v)) return v.map((x) => (x && x.__raw !== undefined ? x.__raw : esc(x))).join('');
  return esc(v);
}

/** Marca una cadena como HTML crudo confiable (no se escapa). */
export function raw(s) {
  return { __raw: String(s ?? '') };
}

/** Minifica whitespace inofensivo entre tags (cosmético, opcional). */
export function trimHtml(s) {
  return s.replace(/\n\s*\n/g, '\n').trim();
}

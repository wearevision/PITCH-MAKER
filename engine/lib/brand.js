// brand.js — sistema de design tokens compartido por deck, 3D, microsite y presupuesto.
// El brand vive en proposal.json (data-driven); aquí van defaults + helpers de CSS.

/** @typedef {import('./schema.js').Brand} Brand */

/** Brand por defecto (se fusiona con proposal.brand). */
export const DEFAULT_BRAND = {
  name: 'PITCH',
  tagline: '',
  colors: {
    bg: '#0B0B10', // fondo profundo
    bgAlt: '#14141C', // superficie
    ink: '#F5F3EC', // texto principal
    inkSoft: '#A7A29B', // texto secundario
    line: '#2A2A36', // bordes
    primary: '#E9B44C', // dorado / acento cálido
    secondary: '#FF4D6D', // magenta / coral
    accent: '#5AC8FA', // frío / highlight
    good: '#3DD68C',
  },
  fonts: {
    // Adobe Fonts (Typekit) con fallback web-safe. El <link> del kit sí está permitido en
    // Adobe Express (a diferencia de otras fonts externas); en navegador carga normal.
    display: '"termina", "Helvetica Neue", "Arial Black", system-ui, sans-serif',
    body: '"acumin-pro", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: "'SF Mono', ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace",
    kit: 'https://use.typekit.net/bpv7igw.css',
  },
  radius: 18,
};

/** Devuelve el <link> del kit de Adobe Fonts si el brand (resuelto) define fonts.kit; si no, ''. */
export function fontKitLink(brand = {}) {
  const url = resolveBrand(brand).fonts.kit;
  return url ? `<link rel="stylesheet" href="${url}">` : '';
}

/** Fusión superficial de brand con defaults (colors/fonts anidados). */
export function resolveBrand(brand = {}) {
  return {
    ...DEFAULT_BRAND,
    ...brand,
    colors: { ...DEFAULT_BRAND.colors, ...(brand.colors || {}) },
    fonts: { ...DEFAULT_BRAND.fonts, ...(brand.fonts || {}) },
  };
}

/** Genera variables CSS `:root { --c-bg: ...; }` desde un brand. */
export function toCssVars(brand) {
  const b = resolveBrand(brand);
  const lines = [];
  for (const [k, v] of Object.entries(b.colors)) lines.push(`  --c-${kebab(k)}: ${v};`);
  lines.push(`  --font-display: ${b.fonts.display};`);
  lines.push(`  --font-body: ${b.fonts.body};`);
  lines.push(`  --font-mono: ${b.fonts.mono};`);
  lines.push(`  --radius: ${b.radius}px;`);
  return `:root{\n${lines.join('\n')}\n}`;
}

/** Gradiente de marca reutilizable (para hero/portadas). */
export function brandGradient(brand, angle = 135) {
  const b = resolveBrand(brand);
  return `linear-gradient(${angle}deg, ${b.colors.primary} 0%, ${b.colors.secondary} 55%, ${b.colors.accent} 100%)`;
}

function kebab(s) {
  return s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

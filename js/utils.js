/* ======================================================================
   utils.js — Constants, colour math, DOM helpers, icons, toast
   ====================================================================== */

export const BLACK_FALLBACK = 0x010101;

/* ---- Grid structure -------------------------------------------------- */

export const GRID_COLUMNS = [
  { id: 'Hair',    label: 'Hair',    tip: 'Mostly used for hair and some cloth- and leather-like materials' },
  { id: 'Body1',   label: 'Body\u00A01',  tip: 'Main colours on a skin ("Primary")' },
  { id: 'Body2',   label: 'Body\u00A02',  tip: 'Main colours on a skin ("Secondary")' },
  { id: 'Special', label: 'Special', tip: 'Highlights, accents, some hairs ("Tertiary")' },
  { id: 'Cloth',   label: 'Cloth',   tip: 'Cloth- and leather-like materials, trousers, undergarments' },
  { id: 'Weapon',  label: 'Weapon',  tip: 'Metallic materials ("Metal")' },
];

export const GRID_ROWS = [
  { suffix: 'VL',  label: 'Very\u00A0Light', tip: 'Hue Offset ±6°, Saturation < 25%, Brightness > 80%' },
  { suffix: 'Lt',  label: 'Light',      tip: 'Hue Offset ±3°, Saturation < 67%, Brightness > 50%' },
  { suffix: '',    label: 'Base',       tip: 'Saturation > 25%, Brightness > 20%' },
  { suffix: 'Dk',  label: 'Dark',       tip: 'Hue Offset ±3°, Saturation > 30%, Brightness < 60%' },
  { suffix: 'VD',  label: 'Very\u00A0Dark',  tip: 'Hue Offset ±6°, Saturation > 50%, Brightness < 40%' },
  { suffix: 'Acc', label: 'Accent',     tip: 'Hue Offset ±<30°, Saturation > 80%, Brightness > 50%' },
];

/** Which shade variants each column supports */
export const GRID_CELLS = {
  Hair:    new Set(['Lt', '', 'Dk']),
  Body1:   new Set(['VL', 'Lt', '', 'Dk', 'VD', 'Acc']),
  Body2:   new Set(['VL', 'Lt', '', 'Dk', 'VD', 'Acc']),
  Special: new Set(['VL', 'Lt', '', 'Dk', 'VD', 'Acc']),
  Cloth:   new Set(['VL', 'Lt', '', 'Dk']),
  Weapon:  new Set(['VL', 'Lt', '', 'Dk', 'Acc']),
};

export const SHADE_MAP = { VL: 2, Lt: 1, '': 0, Dk: -1, VD: -2, Acc: 3 };

const COL_LABELS = { Hair: 'Hair', Body1: 'Body\u00A01', Body2: 'Body\u00A02', Special: 'Special', Cloth: 'Cloth', Weapon: 'Weapon' };
const SHADE_LABELS = { VL: 'Very\u00A0Light', Lt: 'Light', '': 'Base', Dk: 'Dark', VD: 'Very\u00A0Dark', Acc: 'Accent' };

/* ---- SVG Icons (16×16 viewBox) -------------------------------------- */

export const ICONS = {
  load:      `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 11v3h12v-3"/><path d="M8 2v8m-3-3l3 3 3-3"/></svg>`,
  generate:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 2L2 8l3.5 6"/><path d="M10.5 2L14 8l-3.5 6"/></svg>`,
  randomise: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2l3 3-3 3"/><path d="M2 5h12"/><path d="M5 14l-3-3 3-3"/><path d="M14 11H2"/></svg>`,
  shade:     `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v2m0 9v2M1.5 8h2m9 0h2m-10-5L4 4.5m8.5 7l-1.5 1M3.5 11.5L5 13m6-10l1.5-1.5"/></svg>`,
  gradient:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="12" height="8" rx="2"/><path d="M4 8h8"/><circle cx="4" cy="8" r="1" fill="currentColor"/><circle cx="12" cy="8" r="1" fill="currentColor"/></svg>`,
  save:      `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 15H3a1 1 0 01-1-1V2a1 1 0 011-1h7.5L14 4.5V14a1 1 0 01-1 1z"/><path d="M10 1v4H5"/><path d="M5.5 8.5h5v6h-5z"/></svg>`,
  trash:     `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12"/><path d="M5.5 4V2.5a1 1 0 011-1h3a1 1 0 011 1V4"/><path d="M3.5 4l.7 9.5a1 1 0 001 .5h5.6a1 1 0 001-.5l.7-9.5"/></svg>`,
  share:     `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="3" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="12" cy="13" r="1.5"/><path d="M5.4 8.9l5.2 3.2M5.4 7.1l5.2-3.2"/></svg>`,
  copy:      `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M2 11V2.5A.5.5 0 012.5 2H11"/></svg>`,
  download:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12v2h12v-2"/><path d="M8 2v8m-3-3l3 3 3-3"/></svg>`,
  chevron:   `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>`,
  search:    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>`,
  sun:       `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v2m0 10v2M1 8h2m10 0h2M3 3l1.5 1.5m7 7L13 13M3 13l1.5-1.5m7-7L13 3"/></svg>`,
  moon:      `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 9.1A5.5 5.5 0 116.9 2.5 4.5 4.5 0 0013.5 9.1z"/></svg>`,
  format:    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2h12v12H2z"/><path d="M5 5h6M5 8h4M5 11h5"/></svg>`,
  undo:      `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4L2.5 7.5 6 11"/><path d="M3 7.5h6a4 4 0 010 8h-1.5"/></svg>`,
  redo:      `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4l3.5 3.5L10 11"/><path d="M13 7.5H7a4 4 0 000 8h1.5"/></svg>`,
  lock:      `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>`,
  invert:    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 2v12" /><path d="M8 2a6 6 0 010 12" fill="currentColor"/></svg>`,
  hueShift:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5A5.5 5.5 0 0113.5 8"/><path d="M11.5 6l2 2-2 2"/></svg>`,
  desat:     `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M4 12l8-8"/></svg>`,
  posterise: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 14h3V8h3V5h3V2h3v12H2z"/></svg>`,
  shuffle:   `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h4l4 8h4"/><path d="M2 12h4l4-8h4"/><path d="M12 2l2 2-2 2"/><path d="M12 10l2 2-2 2"/></svg>`,
  harmonise: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1v14"/><path d="M3 4c2.8 0 5 2.2 5 5s-2.2 5-5 5"/><path d="M13 4c-2.8 0-5 2.2-5 5s2.2 5 5 5"/></svg>`,
};

/** Create an icon DOM element */
export function icon(name) {
  const span = document.createElement('span');
  span.className = 'btn-icon';
  span.innerHTML = ICONS[name] || '';
  return span;
}

/* ---- Colour maths --------------------------------------------------- */

export function degrees(radians) {
  return radians * (180 / Math.PI);
}

export function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max / 255;
  const s = max > 0 ? 1 - min / max : 0;
  let h;
  if (r === g && g === b) {
    h = 0;
  } else {
    h = Math.acos((r - g / 2 - b / 2) / Math.sqrt(r * r + g * g + b * b - r * g - r * b - g * b));
    h = degrees(h);
  }
  if (b > g) h = 360 - h;
  return [h, s * 255, v * 255];
}

export function hsvToRgb(h, s, v) {
  const max = v;
  const min = max * (1 - s / 255);
  const z = (max - min) * (1 - Math.abs((h / 60) % 2 - 1));
  let r, g, b;
  if (h >= 0 && h < 300) {
    if (h < 60)       { r = max;     g = z + min; b = min;     }
    else if (h < 120) { r = z + min; g = max;     b = min;     }
    else if (h < 180) { r = min;     g = max;     b = z + min; }
    else if (h < 240) { r = min;     g = z + min; b = max;     }
    else              { r = z + min; g = min;     b = max;     }
  } else {
    r = max; g = min; b = z + min;
  }
  return [Math.round(r), Math.round(g), Math.round(b)];
}

export function shadeColour(colour, shade) {
  if (shade === 0) return colour;
  const hsv = rgbToHsv(colour >> 16, (colour >> 8) & 0xFF, colour & 0xFF);
  if (shade === 3) {
    hsv[0] = hsv[1] !== 0
      ? (hsv[0] + Math.floor(Math.random() * 60) - 30) % 360
      : Math.floor(Math.random() * 360);
    hsv[1] = Math.max(hsv[2], 192);
    hsv[2] = Math.max(hsv[2], 128);
  } else {
    const satMul = [2, Math.SQRT2, 1, Math.SQRT2 / 2, 0.5];
    const valMul = [0.5, Math.SQRT2 / 2, 1, Math.SQRT2, 2];
    hsv[0] = (hsv[0] > 180 || hsv[0] === 0)
      ? (hsv[0] - 3 * shade) % 360
      : (hsv[0] + 3 * shade) % 360;
    hsv[1] *= satMul[shade + 2];
    hsv[2] *= Math.min(valMul[shade + 2], 255);
  }
  if (hsv[0] < 0) hsv[0] += 360;
  hsv[1] = Math.min(hsv[1], 255);
  hsv[2] = Math.min(hsv[2], 255);
  const rgb = hsvToRgb(hsv[0], hsv[1], hsv[2]);
  return (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0)
    ? BLACK_FALLBACK
    : (rgb[0] << 16) + (rgb[1] << 8) + rgb[2];
}

export function randomColour() {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 192) + 64;
  const v = Math.floor(Math.random() * 192) + 64;
  const [r, g, b] = hsvToRgb(h, s, v);
  return (r << 16) | (g << 8) | b;
}

/* ---- Auto-effects --------------------------------------------------- */

/** Invert RGB */
export function invertColour(c) {
  const r = 255 - ((c >> 16) & 0xFF);
  const g = 255 - ((c >> 8) & 0xFF);
  const b = 255 - (c & 0xFF);
  return (r === 0 && g === 0 && b === 0) ? BLACK_FALLBACK : (r << 16) | (g << 8) | b;
}

/** Shift hue by `deg` degrees */
export function hueShiftColour(c, deg) {
  const hsv = rgbToHsv((c >> 16) & 0xFF, (c >> 8) & 0xFF, c & 0xFF);
  hsv[0] = (hsv[0] + deg + 360) % 360;
  const rgb = hsvToRgb(hsv[0], hsv[1], hsv[2]);
  return (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0) ? BLACK_FALLBACK : (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
}

/** Desaturate (greyscale via luminance weights) */
export function desaturateColour(c) {
  const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
  const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  return l === 0 ? BLACK_FALLBACK : (l << 16) | (l << 8) | l;
}

/** Posterise — snap each channel to nearest step (4 levels) */
export function posteriseColour(c) {
  const snap = (v) => Math.round(v / 85) * 85;
  const r = snap((c >> 16) & 0xFF);
  const g = snap((c >> 8) & 0xFF);
  const b = snap(c & 0xFF);
  return (r === 0 && g === 0 && b === 0) ? BLACK_FALLBACK : (r << 16) | (g << 8) | b;
}

/** Rotate channels: R→G, G→B, B→R */
export function channelShuffleColour(c) {
  const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
  return (b === 0 && r === 0 && g === 0) ? BLACK_FALLBACK : (b << 16) | (r << 8) | g;
}

/** Harmonise — lock all base hues to analogous ±30° spread around avg hue */
export function harmoniseColour(c, targetHue) {
  const hsv = rgbToHsv((c >> 16) & 0xFF, (c >> 8) & 0xFF, c & 0xFF);
  hsv[0] = targetHue;
  const rgb = hsvToRgb(hsv[0], hsv[1], hsv[2]);
  return (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0) ? BLACK_FALLBACK : (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
}

/* ---- CMYK conversions ----------------------------------------------- */

export function rgbToCmyk(r, g, b) {
  const r1 = r / 255, g1 = g / 255, b1 = b / 255;
  const k = 1 - Math.max(r1, g1, b1);
  if (k === 1) return [0, 0, 0, 100];
  const c = (1 - r1 - k) / (1 - k);
  const m = (1 - g1 - k) / (1 - k);
  const y = (1 - b1 - k) / (1 - k);
  return [Math.round(c * 100), Math.round(m * 100), Math.round(y * 100), Math.round(k * 100)];
}

export function cmykToRgb(c, m, y, k) {
  const c1 = c / 100, m1 = m / 100, y1 = y / 100, k1 = k / 100;
  return [
    Math.round(255 * (1 - c1) * (1 - k1)),
    Math.round(255 * (1 - m1) * (1 - k1)),
    Math.round(255 * (1 - y1) * (1 - k1)),
  ];
}

/* ---- LAB conversions (D65 illuminant) ------------------------------- */

export function rgbToLab(r, g, b) {
  let rl = r / 255, gl = g / 255, bl = b / 255;
  rl = rl > 0.04045 ? Math.pow((rl + 0.055) / 1.055, 2.4) : rl / 12.92;
  gl = gl > 0.04045 ? Math.pow((gl + 0.055) / 1.055, 2.4) : gl / 12.92;
  bl = bl > 0.04045 ? Math.pow((bl + 0.055) / 1.055, 2.4) : bl / 12.92;
  let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  let y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750);
  let z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;
  const f = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  x = f(x); y = f(y); z = f(z);
  return [Math.round(116 * y - 16), Math.round(500 * (x - y)), Math.round(200 * (y - z))];
}

export function labToRgb(L, a, bL) {
  let y2 = (L + 16) / 116;
  let x = a / 500 + y2;
  let z = y2 - bL / 200;
  const fi = (t) => t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787;
  x = fi(x) * 0.95047; y2 = fi(y2); z = fi(z) * 1.08883;
  let r =  x *  3.2404542 + y2 * -1.5371385 + z * -0.4985314;
  let g =  x * -0.9692660 + y2 *  1.8760108 + z *  0.0415560;
  let bl = x *  0.0556434 + y2 * -0.2040259 + z *  1.0572252;
  const gamma = (t) => t > 0.0031308 ? 1.055 * Math.pow(t, 1 / 2.4) - 0.055 : 12.92 * t;
  return [
    Math.round(Math.max(0, Math.min(1, gamma(r))) * 255),
    Math.round(Math.max(0, Math.min(1, gamma(g))) * 255),
    Math.round(Math.max(0, Math.min(1, gamma(bl))) * 255),
  ];
}

/* ---- Format helpers ------------------------------------------------- */

export function intToHex(n) {
  return '#' + (n & 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase();
}

export function hexToInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

export function propName(colId, suffix) {
  return suffix === '' ? `${colId}_Swap` : `${colId}${suffix}_Swap`;
}

export function getColumnFromProp(prop) {
  return prop.replace(/(VL|Lt|Dk|VD|Acc)?_Swap$/, '');
}

export function getShadeFromProp(prop) {
  const col = getColumnFromProp(prop);
  return prop.replace(col, '').replace('_Swap', '');
}

export function friendlyName(prop) {
  const col = getColumnFromProp(prop);
  const shade = getShadeFromProp(prop);
  return `${COL_LABELS[col]} · ${SHADE_LABELS[shade]}`;
}

/* ---- DOM helpers ---------------------------------------------------- */

export function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'dataset') { Object.assign(node.dataset, v); }
      else if (k === 'className') { node.className = v; }
      else if (k === 'textContent') { node.textContent = v; }
      else if (k === 'innerHTML') { node.innerHTML = v; }
      else if (typeof v === 'boolean') { if (v) node.setAttribute(k, ''); }
      else node.setAttribute(k, v);
    }
  }
  if (children) {
    for (const c of Array.isArray(children) ? children : [children]) {
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
  }
  return node;
}

/* ---- Toast notifications -------------------------------------------- */

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = el('div', { className: `toast toast-${type}`, textContent: message });
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

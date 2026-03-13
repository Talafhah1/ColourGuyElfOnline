/* ======================================================================
   color-picker.js — Full-featured colour picker with multiple modes
   Modes: Hue Cube · Brightness Cube · Colour Wheel · Greyscale
   Slider panels: HSB · RGB · CMYK · LAB · Hex
   All slider tracks show reactive colour gradients.
   ====================================================================== */

import {
  rgbToHsv, hsvToRgb, intToHex,
  rgbToCmyk, cmykToRgb, rgbToLab, labToRgb, el,
} from './utils.js';

/* Canvas dimensions — fits comfortably in a 260 px panel */
const SZ      = 170;
const STRIP_W = 14;
const TRK_W   = 160;   // slider track width
const TRK_H   = 10;    // slider track height

/* ====================================================================== */

export class ColorPicker {
  constructor(container) {
    this._container = container;
    this._h = 0; this._s = 255; this._v = 255;
    this._oldHex = 0xFF0000;
    this._changeCb = null;
    this._canvasMode = 'hue-cube';
    this._sliderMode = 'hsb';
    this._dragging = null;
    this._sliders = {};
    this._transformBtns = {};
    this._build();
    this._switchCanvas(this._canvasMode);
    this._switchSliders(this._sliderMode);
  }

  /* ================================================================== */
  /*  Public API                                                        */
  /* ================================================================== */

  onChange(fn)  { this._changeCb = fn; }
  setTheme()    { /* themed via CSS custom props */ }

  getColor() {
    const [r, g, b] = hsvToRgb(this._h, this._s, this._v);
    return (r << 16) | (g << 8) | b;
  }

  setColor(hexInt, { updateOld = false } = {}) {
    const r = (hexInt >> 16) & 0xFF, g = (hexInt >> 8) & 0xFF, b = hexInt & 0xFF;
    [this._h, this._s, this._v] = rgbToHsv(r, g, b);
    if (updateOld) this._oldHex = hexInt;
    this._fullSync();
  }

  /* ================================================================== */
  /*  Scaffold                                                          */
  /* ================================================================== */

  _build() {
    this._container.classList.add('pk');
    this._container.innerHTML = '';

    /* ---- Canvas-mode tabs ---- */
    const CMODES = [
      ['hue-cube', 'Hue'],
      ['bri-cube', 'Bright'],
      ['wheel',    'Wheel'],
      ['grey',     'Grey'],
    ];
    const ctabs = el('div', { className: 'pk-tabs' });
    for (const [id, lbl] of CMODES) {
      const b = el('button', { className: 'pk-tab', type: 'button', textContent: lbl, dataset: { m: id } });
      b.addEventListener('pointerdown', () => this._switchCanvas(id));
      ctabs.appendChild(b);
    }
    this._container.appendChild(ctabs);

    /* ---- Canvas area ---- */
    this._area = el('div', { className: 'pk-area' });
    this._container.appendChild(this._area);

    /* ---- Colour swatches ---- */
    const sw = el('div', { className: 'pk-swatches' });
    this._oldSw = el('div', { className: 'pk-sw pk-sw-old', title: 'Previous' });
    this._newSw = el('div', { className: 'pk-sw pk-sw-new', title: 'Current' });
    sw.append(this._oldSw, this._newSw);
    this._container.appendChild(sw);

    /* ---- Slider-mode tabs ---- */
    const SMODES = [['hsb','HSB'],['rgb','RGB'],['cmyk','CMYK'],['lab','LAB'],['hex','Hex']];
    const stabs = el('div', { className: 'pk-tabs pk-tabs-sm' });
    for (const [id, lbl] of SMODES) {
      const b = el('button', { className: 'pk-tab', type: 'button', textContent: lbl, dataset: { s: id } });
      b.addEventListener('pointerdown', () => this._switchSliders(id));
      stabs.appendChild(b);
    }
    this._container.appendChild(stabs);

    /* ---- Slider rows container ---- */
    this._sliderBox = el('div', { className: 'pk-sliders' });
    this._container.appendChild(this._sliderBox);

    /* ---- Hex input row ---- */
    const hr = el('div', { className: 'pk-hex-row' });
    const hl = el('span', { className: 'pk-lbl', textContent: '#' });
    this._hexIn = el('input', {
      type: 'text', className: 'pk-field pk-hex-field',
      maxlength: '6', spellcheck: 'false', autocomplete: 'off',
    });
    this._hexIn.addEventListener('change', () => this._onHexInput());
    hr.append(hl, this._hexIn);
    this._container.appendChild(hr);

    /* ---- Quick transform section (bottom) ---- */
    const trTitle = el('div', { className: 'pk-quick-title', textContent: 'Quick Transform' });
    this._container.appendChild(trTitle);

    const tr = el('div', { className: 'pk-transform' });

    const iconSvg = (name) => {
      const map = {
        hMinus: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5 8h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        hPlus: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5 8h3M6.5 6.5v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        hue: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        sMinus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 12l5-8 5 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5.5 10.5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        sPlus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 12l5-8 5 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5.5 10.5h3M7 9v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        sat: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 12l5-8 5 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
        bMinus: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2.2v1.4M8 12.4v1.4M2.2 8h1.4M12.4 8h1.4M4 4l1 1M11 11l1 1M4 12l1-1M11 5l1-1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
        bPlus: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2.2v1.4M8 12.4v1.4M2.2 8h1.4M12.4 8h1.4M4 4l1 1M11 11l1 1M4 12l1-1M11 5l1-1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M6.6 8h2.8M8 6.6v2.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
        bri: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2.2v1.4M8 12.4v1.4M2.2 8h1.4M12.4 8h1.4M4 4l1 1M11 11l1 1M4 12l1-1M11 5l1-1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
        invert: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2v12" stroke="currentColor" stroke-width="1.5"/><path d="M8 2a6 6 0 010 12" fill="currentColor"/></svg>',
        old: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 7.5A4.5 4.5 0 118 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3.5 3.5v4h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        comp: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2.5v11" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="3" r="1.2" fill="currentColor"/><circle cx="8" cy="13" r="1.2" fill="currentColor"/></svg>',
      };
      return map[name] || '';
    };

    const mkAction = (id, iconName, title, fn, cls = '') => {
      const b = el('button', {
        className: `pk-tbtn ${cls}`.trim(),
        type: 'button',
        title,
        dataset: { tid: id },
      });
      b.appendChild(el('span', { className: 'pk-ticon', innerHTML: iconSvg(iconName) }));
      b.addEventListener('click', fn);
      this._transformBtns[id] = b;
      return b;
    };

    const mkCurrent = (id, iconName, title) => {
      const chip = el('div', {
        className: 'pk-tbtn pk-tbtn-current',
        title,
        dataset: { tid: id },
      });
      chip.appendChild(el('span', { className: 'pk-ticon', innerHTML: iconSvg(iconName) }));
      this._transformBtns[id] = chip;
      return chip;
    };

    const mkRow = (leftId, leftLabel, leftTip, leftFn, curId, curLabel, curTip, rightId, rightLabel, rightTip, rightFn) => {
      const row = el('div', { className: 'pk-trow' });
      row.append(
        mkAction(leftId, leftLabel, leftTip, leftFn, 'pk-tbtn-action'),
        mkCurrent(curId, curLabel, curTip),
        mkAction(rightId, rightLabel, rightTip, rightFn, 'pk-tbtn-action')
      );
      tr.appendChild(row);
    };

    mkRow('h-', 'hMinus', 'Hue -15°', () => this._applyHSVAdjust(-15, 0, 0), 'h-cur', 'hue', 'Current hue', 'h+', 'hPlus', 'Hue +15°', () => this._applyHSVAdjust(15, 0, 0));
    mkRow('s-', 'sMinus', 'Saturation -20', () => this._applyHSVAdjust(0, -20, 0), 's-cur', 'sat', 'Current saturation', 's+', 'sPlus', 'Saturation +20', () => this._applyHSVAdjust(0, 20, 0));
    mkRow('b-', 'bMinus', 'Brightness -20', () => this._applyHSVAdjust(0, 0, -20), 'b-cur', 'bri', 'Current brightness', 'b+', 'bPlus', 'Brightness +20', () => this._applyHSVAdjust(0, 0, 20));

    const bottom = el('div', { className: 'pk-trow pk-trow-bottom' });
    bottom.append(
      mkAction('inv', 'invert', 'Invert', () => this._applyInvert()),
      mkAction('old', 'old', 'Restore previous', () => this._restoreOld()),
      mkAction('cmp', 'comp', 'Complement (Hue +180°)', () => this._applyHSVAdjust(180, 0, 0))
    );
    tr.appendChild(bottom);

    this._container.appendChild(tr);
  }

  /* ================================================================== */
  /*  Canvas modes                                                      */
  /* ================================================================== */

  _switchCanvas(mode) {
    this._canvasMode = mode;
    this._dragging = null;
    for (const t of this._container.querySelectorAll('.pk-tab[data-m]'))
      t.classList.toggle('active', t.dataset.m === mode);
    this._area.innerHTML = '';
    this._plane = this._planeCtx = this._planePtr = null;
    this._strip = this._stripCtx = this._stripPtr = null;

    if (mode === 'hue-cube')  this._mkHueCube();
    else if (mode === 'bri-cube') this._mkBriCube();
    else if (mode === 'wheel') this._mkWheel();
    else if (mode === 'grey')  this._mkGrey();

    this._drawCanvas();
  }

  /* ---- Hue Cube (SV plane + hue strip) ----------------------------- */

  _mkHueCube() {
    const row = el('div', { className: 'pk-row' });
    const pw = el('div', { className: 'pk-plane-w' });
    this._plane = el('canvas', { width: SZ, height: SZ, className: 'pk-cv' });
    this._planeCtx = this._plane.getContext('2d', { willReadFrequently: false });
    this._planePtr = el('div', { className: 'pk-dot' });
    pw.append(this._plane, this._planePtr);
    this._ptrBind(pw, 'plane', (x, y) => {
      this._s = Math.round(x / (SZ - 1) * 255);
      this._v = Math.round((1 - y / (SZ - 1)) * 255);
    });
    const sw = el('div', { className: 'pk-strip-w' });
    this._strip = el('canvas', { width: STRIP_W, height: SZ, className: 'pk-cv pk-cv-strip' });
    this._stripCtx = this._strip.getContext('2d');
    this._stripPtr = el('div', { className: 'pk-bar' });
    sw.append(this._strip, this._stripPtr);
    this._ptrBind(sw, 'strip', null, (y) => { this._h = (y / (SZ - 1)) * 360; });
    row.append(pw, sw);
    this._area.appendChild(row);
  }

  /* ---- Brightness Cube (HS plane + value strip) -------------------- */

  _mkBriCube() {
    const row = el('div', { className: 'pk-row' });
    const pw = el('div', { className: 'pk-plane-w' });
    this._plane = el('canvas', { width: SZ, height: SZ, className: 'pk-cv' });
    this._planeCtx = this._plane.getContext('2d', { willReadFrequently: false });
    this._planePtr = el('div', { className: 'pk-dot' });
    pw.append(this._plane, this._planePtr);
    this._ptrBind(pw, 'plane', (x, y) => {
      this._h = (x / (SZ - 1)) * 360;
      this._s = Math.round((1 - y / (SZ - 1)) * 255);
    });
    const sw = el('div', { className: 'pk-strip-w' });
    this._strip = el('canvas', { width: STRIP_W, height: SZ, className: 'pk-cv pk-cv-strip' });
    this._stripCtx = this._strip.getContext('2d');
    this._stripPtr = el('div', { className: 'pk-bar' });
    sw.append(this._strip, this._stripPtr);
    this._ptrBind(sw, 'strip', null, (y) => { this._v = Math.round((1 - y / (SZ - 1)) * 255); });
    row.append(pw, sw);
    this._area.appendChild(row);
  }

  /* ---- Colour Wheel (hue ring + inner SV square) ------------------- */

  _mkWheel() {
    const wrap = el('div', { className: 'pk-wheel-w' });
    this._plane = el('canvas', { width: SZ, height: SZ, className: 'pk-cv pk-cv-round' });
    this._planeCtx = this._plane.getContext('2d', { willReadFrequently: false });
    this._planePtr = el('div', { className: 'pk-dot' });
    this._stripPtr = el('div', { className: 'pk-dot pk-dot-ring' });
    wrap.append(this._plane, this._planePtr, this._stripPtr);

    /* Pre-render hue ring as pixel data (no banding) */
    this._wheelRing = this._renderHueRing();
    const cx = SZ / 2, outerR = cx, innerR = outerR * 0.70;
    this._wInnerR = innerR;
    this._wSqSz = Math.floor(innerR * 1.32);
    this._wSqOff = Math.round(cx - this._wSqSz / 2);

    let drag = null;   // 'ring' | 'sq'
    wrap.addEventListener('pointerdown', (e) => {
      wrap.setPointerCapture(e.pointerId);
      const r = this._plane.getBoundingClientRect();
      const sc = SZ / r.width;
      const dx = (e.clientX - r.left) * sc - cx, dy = (e.clientY - r.top) * sc - cx;
      drag = (Math.hypot(dx, dy) >= innerR - 4) ? 'ring' : 'sq';
      this._wheelMove(e, drag);
    });
    wrap.addEventListener('pointermove', (e) => { if (drag) this._wheelMove(e, drag); });
    wrap.addEventListener('pointerup',   ()  => { drag = null; });

    this._area.appendChild(wrap);
  }

  /** Pixel-perfect hue ring — rendered once, reused every frame */
  _renderHueRing() {
    const oc = document.createElement('canvas');
    oc.width = SZ; oc.height = SZ;
    const ctx = oc.getContext('2d');
    const img = ctx.createImageData(SZ, SZ);
    const d = img.data;
    const c = SZ / 2, outerR = c, innerR = c * 0.70;
    for (let py = 0; py < SZ; py++) {
      for (let px = 0; px < SZ; px++) {
        const dx = px - c, dy = py - c;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= innerR - 0.5 && dist <= outerR + 0.5) {
          const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
          const [r, g, b] = hsvToRgb(angle, 255, 255);
          const i = (py * SZ + px) << 2;
          let a = 255;
          if (dist < innerR) a = Math.round((1 - (innerR - dist)) * 255);
          else if (dist > outerR) a = Math.round((1 - (dist - outerR)) * 255);
          d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return oc;
  }

  _wheelMove(e, part) {
    const r = this._plane.getBoundingClientRect();
    const sc = SZ / r.width;
    const c = SZ / 2;
    if (part === 'ring') {
      const dx = (e.clientX - r.left) * sc - c, dy = (e.clientY - r.top) * sc - c;
      this._h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    } else {
      /* Axis-aligned SV square */
      const off = this._wSqOff, sz = this._wSqSz;
      const lx = Math.max(0, Math.min(sz, (e.clientX - r.left) * sc - off));
      const ly = Math.max(0, Math.min(sz, (e.clientY - r.top) * sc  - off));
      this._s = Math.round((lx / sz) * 255);
      this._v = Math.round((1 - ly / sz) * 255);
    }
    this._afterDrag();
  }

  /* ---- Greyscale bar ----------------------------------------------- */

  _mkGrey() {
    const wrap = el('div', { className: 'pk-grey-w' });
    this._strip = el('canvas', { width: SZ, height: 20, className: 'pk-cv pk-grey-cv' });
    this._stripCtx = this._strip.getContext('2d');
    this._stripPtr = el('div', { className: 'pk-bar pk-bar-v' });
    wrap.append(this._strip, this._stripPtr);

    let drag = false;
    wrap.addEventListener('pointerdown', (e) => {
      drag = true; wrap.setPointerCapture(e.pointerId); this._greyMove(e);
    });
    wrap.addEventListener('pointermove', (e) => { if (drag) this._greyMove(e); });
    wrap.addEventListener('pointerup',   ()  => { drag = false; });
    this._area.appendChild(wrap);
  }

  _greyMove(e) {
    const r = this._strip.getBoundingClientRect();
    const x = Math.max(0, Math.min(SZ - 1, (e.clientX - r.left) / r.width * SZ));
    this._h = 0; this._s = 0; this._v = Math.round(x / (SZ - 1) * 255);
    this._afterDrag();
  }

  /* ================================================================== */
  /*  Canvas drawing                                                    */
  /* ================================================================== */

  _drawCanvas() {
    const m = this._canvasMode;
    if (m === 'hue-cube')  this._drawHueCube();
    else if (m === 'bri-cube') this._drawBriCube();
    else if (m === 'wheel') this._drawWheel();
    else if (m === 'grey')  this._drawGrey();
  }

  _drawHueCube() {
    const ctx = this._planeCtx; if (!ctx) return;
    const [r, g, b] = hsvToRgb(this._h, 255, 255);
    const gH = ctx.createLinearGradient(0, 0, SZ, 0);
    gH.addColorStop(0, '#fff'); gH.addColorStop(1, `rgb(${r},${g},${b})`);
    ctx.fillStyle = gH; ctx.fillRect(0, 0, SZ, SZ);
    const gV = ctx.createLinearGradient(0, 0, 0, SZ);
    gV.addColorStop(0, 'rgba(0,0,0,0)'); gV.addColorStop(1, '#000');
    ctx.fillStyle = gV; ctx.fillRect(0, 0, SZ, SZ);

    this._drawHueStrip();

    if (this._planePtr) {
      this._planePtr.style.left = (this._s / 255 * 100) + '%';
      this._planePtr.style.top  = ((1 - this._v / 255) * 100) + '%';
    }
    if (this._stripPtr) this._stripPtr.style.top = (this._h / 360 * 100) + '%';
  }

  _drawBriCube() {
    const ctx = this._planeCtx; if (!ctx) return;
    const img = ctx.createImageData(SZ, SZ);
    const d = img.data;
    for (let y = 0; y < SZ; y++) {
      const sat = Math.round((1 - y / (SZ - 1)) * 255);
      for (let x = 0; x < SZ; x++) {
        const hue = (x / (SZ - 1)) * 360;
        const [r, g, b] = hsvToRgb(hue, sat, this._v);
        const i = (y * SZ + x) << 2;
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    /* Value strip */
    const sc = this._stripCtx; if (!sc) return;
    const [cr, cg, cb] = hsvToRgb(this._h, this._s, 255);
    const gV = sc.createLinearGradient(0, 0, 0, SZ);
    gV.addColorStop(0, `rgb(${cr},${cg},${cb})`); gV.addColorStop(1, '#000');
    sc.fillStyle = gV; sc.fillRect(0, 0, STRIP_W, SZ);

    if (this._planePtr) {
      this._planePtr.style.left = (this._h / 360 * 100) + '%';
      this._planePtr.style.top  = ((1 - this._s / 255) * 100) + '%';
    }
    if (this._stripPtr) this._stripPtr.style.top = ((1 - this._v / 255) * 100) + '%';
  }

  _drawWheel() {
    const ctx = this._planeCtx; if (!ctx) return;
    const c = SZ / 2;
    ctx.clearRect(0, 0, SZ, SZ);

    /* Cached pixel-perfect hue ring */
    ctx.drawImage(this._wheelRing, 0, 0);

    /* Axis-aligned SV square (same as hue-cube but smaller) */
    const sz = this._wSqSz, off = this._wSqOff;
    const [hr, hg, hb] = hsvToRgb(this._h, 255, 255);
    const gH = ctx.createLinearGradient(off, 0, off + sz, 0);
    gH.addColorStop(0, '#fff');
    gH.addColorStop(1, `rgb(${hr},${hg},${hb})`);
    ctx.fillStyle = gH;
    ctx.fillRect(off, off, sz, sz);
    const gV = ctx.createLinearGradient(0, off, 0, off + sz);
    gV.addColorStop(0, 'rgba(0,0,0,0)');
    gV.addColorStop(1, '#000');
    ctx.fillStyle = gV;
    ctx.fillRect(off, off, sz, sz);

    /* Ring pointer */
    const ringR = (c + this._wInnerR) / 2;
    const rRad = this._h * Math.PI / 180;
    if (this._stripPtr) {
      this._stripPtr.style.left = ((c + Math.cos(rRad) * ringR) / SZ * 100) + '%';
      this._stripPtr.style.top  = ((c + Math.sin(rRad) * ringR) / SZ * 100) + '%';
    }
    /* SV pointer */
    if (this._planePtr) {
      this._planePtr.style.left = ((off + (this._s / 255) * sz) / SZ * 100) + '%';
      this._planePtr.style.top  = ((off + (1 - this._v / 255) * sz) / SZ * 100) + '%';
    }
  }

  _drawGrey() {
    const ctx = this._stripCtx; if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, SZ, 0);
    g.addColorStop(0, '#000'); g.addColorStop(1, '#fff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SZ, 20);
    if (this._stripPtr) this._stripPtr.style.left = (this._v / 255 * 100) + '%';
  }

  _drawHueStrip() {
    const ctx = this._stripCtx; if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, 0, SZ);
    ['#f00','#ff0','#0f0','#0ff','#00f','#f0f','#f00'].forEach((c, i) => g.addColorStop(i / 6, c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, STRIP_W, SZ);
  }

  /* ================================================================== */
  /*  Pointer helpers                                                   */
  /* ================================================================== */

  _ptrBind(wrap, tag, planeSetter, stripSetter) {
    let active = false;
    const isPlane = tag === 'plane';
    wrap.addEventListener('pointerdown', (e) => {
      active = true; wrap.setPointerCapture(e.pointerId);
      isPlane ? this._planeMove(e, planeSetter) : this._stripMove(e, stripSetter);
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!active) return;
      isPlane ? this._planeMove(e, planeSetter) : this._stripMove(e, stripSetter);
    });
    wrap.addEventListener('pointerup', () => { active = false; });
  }

  _planeMove(e, setter) {
    const r = this._plane.getBoundingClientRect();
    const x = Math.max(0, Math.min(SZ - 1, (e.clientX - r.left) / r.width * SZ));
    const y = Math.max(0, Math.min(SZ - 1, (e.clientY - r.top) / r.height * SZ));
    setter(x, y);
    this._afterDrag();
  }

  _stripMove(e, setter) {
    const r = this._strip.getBoundingClientRect();
    const y = Math.max(0, Math.min(SZ - 1, (e.clientY - r.top) / r.height * SZ));
    setter(y);
    this._afterDrag();
  }

  _afterDrag() {
    this._drawCanvas();
    this._syncSliders();
    this._syncHex();
    this._syncSwatches();
    this._emit();
  }

  /* ================================================================== */
  /*  Slider panels                                                     */
  /* ================================================================== */

  _switchSliders(mode) {
    this._sliderMode = mode;
    for (const t of this._container.querySelectorAll('.pk-tab[data-s]'))
      t.classList.toggle('active', t.dataset.s === mode);
    this._buildSliders();
    this._syncSliders();
  }

  _buildSliders() {
    this._sliderBox.innerHTML = '';
    this._sliders = {};

    const DEFS = {
      hsb:  [['H', 0, 360, ''], ['S', 0, 255, ''], ['B', 0, 255, '']],
      rgb:  [['R', 0, 255, ''], ['G', 0, 255, ''], ['B', 0, 255, '']],
      cmyk: [['C', 0, 100, '%'], ['M', 0, 100, '%'], ['Y', 0, 100, '%'], ['K', 0, 100, '%']],
      lab:  [['L', 0, 100, ''], ['a', -128, 127, ''], ['b', -128, 127, '']],
      hex:  [['R', 0, 255, ''], ['G', 0, 255, ''], ['B', 0, 255, '']],
    };
    const rows = DEFS[this._sliderMode] || DEFS.rgb;
    const isHex = this._sliderMode === 'hex';

    for (const [label, min, max, unit] of rows) {
      const row = el('div', { className: 'pk-srow' });

      /* Label */
      const lbl = el('span', { className: 'pk-lbl', textContent: label });

      /* Track + thumb wrapper */
      const tw = el('div', { className: 'pk-track-w' });
      const track = el('canvas', { className: 'pk-track', width: TRK_W, height: TRK_H });
      const tctx = track.getContext('2d');
      const thumb = el('div', { className: 'pk-thumb' });
      tw.append(track, thumb);

      /* Numeric / hex input */
      const inp = el('input', {
        type: isHex ? 'text' : 'number',
        className: 'pk-field' + (isHex ? ' pk-hex-field' : ''),
        min: String(min), max: String(max), step: '1',
      });
      if (isHex) inp.maxLength = 2;
      inp.addEventListener('change', () => this._onSliderInput());
      inp.addEventListener('input', () => {
        /* live update while typing numbers */
        if (!isHex && inp.value !== '' && !isNaN(inp.value)) this._onSliderInput();
      });

      const uSpan = unit ? el('span', { className: 'pk-unit', textContent: unit }) : null;
      row.append(lbl, tw, inp);
      if (uSpan) row.appendChild(uSpan);
      this._sliderBox.appendChild(row);

      this._sliders[label] = { track, tctx, thumb, input: inp, min, max, tw };

      /* Drag on track */
      let dragging = false;
      const apply = (e) => {
        const rect = tw.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const val = Math.round(min + frac * (max - min));
        inp.value = isHex ? val.toString(16).toUpperCase().padStart(2, '0') : val;
        this._onSliderInput();
      };
      tw.addEventListener('pointerdown', (e) => {
        dragging = true; tw.setPointerCapture(e.pointerId); apply(e);
      });
      tw.addEventListener('pointermove', (e) => { if (dragging) apply(e); });
      tw.addEventListener('pointerup', () => { dragging = false; });
    }
  }

  /* ---- Sync slider values & reactive tracks ------------------------ */

  _syncSliders() {
    const [r, g, b] = hsvToRgb(this._h, this._s, this._v);
    const mode = this._sliderMode;
    const isHex = mode === 'hex';

    let vals;
    if (mode === 'hsb')      vals = { H: Math.round(this._h), S: Math.round(this._s), B: Math.round(this._v) };
    else if (mode === 'rgb' || isHex) vals = { R: r, G: g, B: b };
    else if (mode === 'cmyk') { const [c, m, y, k] = rgbToCmyk(r, g, b); vals = { C: c, M: m, Y: y, K: k }; }
    else if (mode === 'lab')  { const [L, a, bL] = rgbToLab(r, g, b); vals = { L, a, b: bL }; }

    for (const [key, sl] of Object.entries(this._sliders)) {
      const v = vals[key] ?? 0;
      sl.input.value = isHex
        ? Math.max(0, Math.min(255, v)).toString(16).toUpperCase().padStart(2, '0')
        : v;
      const frac = (v - sl.min) / (sl.max - sl.min);
      sl.thumb.style.left = (Math.max(0, Math.min(1, frac)) * 100) + '%';
      this._paintTrack(key, sl);
    }
  }

  _paintTrack(key, sl) {
    const ctx = sl.tctx, w = TRK_W, h = TRK_H;
    const [cr, cg, cb] = hsvToRgb(this._h, this._s, this._v);
    const mode = this._sliderMode;
    const N = 24;                             // gradient stops for smooth look
    const grad = ctx.createLinearGradient(0, 0, w, 0);

    for (let i = 0; i <= N; i++) {
      const t = i / N;
      let pr, pg, pb;
      if (mode === 'hsb') {
        if (key === 'H')      [pr, pg, pb] = hsvToRgb(t * 360, this._s, this._v);
        else if (key === 'S') [pr, pg, pb] = hsvToRgb(this._h, t * 255, this._v);
        else                  [pr, pg, pb] = hsvToRgb(this._h, this._s, t * 255);
      } else if (mode === 'rgb' || mode === 'hex') {
        pr = key === 'R' ? Math.round(t * 255) : cr;
        pg = key === 'G' ? Math.round(t * 255) : cg;
        pb = key === 'B' ? Math.round(t * 255) : cb;
      } else if (mode === 'cmyk') {
        const [oc, om, oy, ok] = rgbToCmyk(cr, cg, cb);
        let nc = oc, nm = om, ny = oy, nk = ok;
        if (key === 'C') nc = Math.round(t * 100);
        else if (key === 'M') nm = Math.round(t * 100);
        else if (key === 'Y') ny = Math.round(t * 100);
        else nk = Math.round(t * 100);
        [pr, pg, pb] = cmykToRgb(nc, nm, ny, nk);
      } else if (mode === 'lab') {
        const [oL, oa, ob] = rgbToLab(cr, cg, cb);
        let nL = oL, na = oa, nb = ob;
        if (key === 'L') nL = Math.round(t * 100);
        else if (key === 'a') na = Math.round(-128 + t * 255);
        else nb = Math.round(-128 + t * 255);
        [pr, pg, pb] = labToRgb(nL, na, nb);
      }
      pr = Math.max(0, Math.min(255, pr));
      pg = Math.max(0, Math.min(255, pg));
      pb = Math.max(0, Math.min(255, pb));
      grad.addColorStop(t, `rgb(${pr},${pg},${pb})`);
    }
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 3);
    ctx.fill();
  }

  /* ---- Handle slider field changes --------------------------------- */

  _onSliderInput() {
    const mode = this._sliderMode;
    const isHex = mode === 'hex';
    const v = (key) => {
      const sl = this._sliders[key]; if (!sl) return 0;
      return isHex ? (parseInt(sl.input.value, 16) || 0)
                    : (parseFloat(sl.input.value) || 0);
    };

    if (mode === 'hsb') {
      this._h = this._clamp(v('H'), 0, 360);
      this._s = this._clamp(v('S'), 0, 255);
      this._v = this._clamp(v('B'), 0, 255);
    } else if (mode === 'rgb' || isHex) {
      [this._h, this._s, this._v] = rgbToHsv(
        this._clamp(v('R'), 0, 255), this._clamp(v('G'), 0, 255), this._clamp(v('B'), 0, 255));
    } else if (mode === 'cmyk') {
      const [r, g, b] = cmykToRgb(this._clamp(v('C'), 0, 100), this._clamp(v('M'), 0, 100),
        this._clamp(v('Y'), 0, 100), this._clamp(v('K'), 0, 100));
      [this._h, this._s, this._v] = rgbToHsv(r, g, b);
    } else if (mode === 'lab') {
      const [r, g, b] = labToRgb(this._clamp(v('L'), 0, 100), this._clamp(v('a'), -128, 127),
        this._clamp(v('b'), -128, 127));
      [this._h, this._s, this._v] = rgbToHsv(r, g, b);
    }

    this._drawCanvas();
    this._syncSliders();
    this._syncHex();
    this._syncSwatches();
    this._emit();
  }

  /* ================================================================== */
  /*  Hex & swatches                                                    */
  /* ================================================================== */

  _syncHex()      { this._hexIn.value = intToHex(this.getColor()).slice(1); }
  _syncSwatches() {
    this._newSw.style.backgroundColor = intToHex(this.getColor());
    this._oldSw.style.backgroundColor = intToHex(this._oldHex);
    this._syncTransforms();
  }

  _previewTransform(id) {
    const [r, g, b] = hsvToRgb(this._h, this._s, this._v);
    if (id === 'h-cur' || id === 's-cur' || id === 'b-cur') return (r << 16) | (g << 8) | b;
    if (id === 'old') return this._oldHex;
    if (id === 'inv') return ((255 - r) << 16) | ((255 - g) << 8) | (255 - b);

    let h = this._h, s = this._s, v = this._v;
    if (id === 'h-') h = (h - 15 + 360) % 360;
    else if (id === 'h+') h = (h + 15) % 360;
    else if (id === 's-') s = this._clamp(s - 20, 0, 255);
    else if (id === 's+') s = this._clamp(s + 20, 0, 255);
    else if (id === 'b-') v = this._clamp(v - 20, 0, 255);
    else if (id === 'b+') v = this._clamp(v + 20, 0, 255);
    else if (id === 'cmp') h = (h + 180) % 360;

    const [tr, tg, tb] = hsvToRgb(h, s, v);
    return (tr << 16) | (tg << 8) | tb;
  }

  _transformForeground(col) {
    const r = (col >> 16) & 0xFF;
    const g = (col >> 8) & 0xFF;
    const b = col & 0xFF;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.58 ? '#0d121a' : '#f5f9ff';
  }

  _syncTransforms() {
    for (const [id, btn] of Object.entries(this._transformBtns)) {
      const col = this._previewTransform(id);
      btn.style.backgroundColor = intToHex(col);
      btn.style.color = this._transformForeground(col);
    }
  }

  _onHexInput() {
    const v = this._hexIn.value.trim().replace(/^#/, '');
    if (/^[0-9A-Fa-f]{6}$/.test(v)) {
      const n = parseInt(v, 16);
      [this._h, this._s, this._v] = rgbToHsv((n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF);
      this._drawCanvas();
      this._syncSliders();
      this._syncSwatches();
      this._emit();
    }
  }

  /* ================================================================== */
  /*  Full sync (called by setColor)                                    */
  /* ================================================================== */

  _fullSync() {
    this._drawCanvas();
    this._syncSliders();
    this._syncHex();
    this._syncSwatches();
    this._syncTransforms();
  }

  _applyHSVAdjust(dH, dS, dV) {
    this._h = (this._h + dH + 360) % 360;
    this._s = this._clamp(this._s + dS, 0, 255);
    this._v = this._clamp(this._v + dV, 0, 255);
    this._afterDrag();
  }

  _applyInvert() {
    const [r, g, b] = hsvToRgb(this._h, this._s, this._v);
    [this._h, this._s, this._v] = rgbToHsv(255 - r, 255 - g, 255 - b);
    this._afterDrag();
  }

  _restoreOld() {
    const n = this._oldHex;
    [this._h, this._s, this._v] = rgbToHsv((n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF);
    this._afterDrag();
  }

  /* ================================================================== */
  /*  Helpers                                                           */
  /* ================================================================== */

  _emit() { if (this._changeCb) this._changeCb(this.getColor()); }
  _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(v))); }
}

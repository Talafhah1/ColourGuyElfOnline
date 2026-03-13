/* ======================================================================
   app.js — Main application controller
   ====================================================================== */

import {
  showToast, intToHex, shadeColour, randomColour,
  GRID_COLUMNS, GRID_ROWS, GRID_CELLS, SHADE_MAP, propName, ICONS,
  getColumnFromProp, icon,
  invertColour, hueShiftColour, desaturateColour,
  posteriseColour, channelShuffleColour, harmoniseColour,
  rgbToHsv, rgbToLab, labToRgb, BLACK_FALLBACK,
} from './utils.js';
import { ColorSchemeType, GameColorSchemeType, COLOR_PROPS } from './color-scheme.js';
import { ColorPicker } from './color-picker.js';
import { ColorGrid } from './grid.js';
import { Editor } from './editor.js';
import { Dropdown } from './dropdown.js';

/* ====================================================================== */

const LS_PREFIX = 'colour_scheme_';
const HISTORY_MAX_PAST = 100;
const HISTORY_MAX_STATES = HISTORY_MAX_PAST + 1;
const HISTORY_DEBOUNCE_MS = 140;
const SWAP_SHADE_ORDER = ['VL', 'Lt', '', 'Dk', 'VD', 'Acc'];

let theme   = localStorage.getItem('theme') || 'dark';
let format  = 'xml';
let scheme  = new ColorSchemeType();
let gameSchemes = [];           // GameColorSchemeType[]
let stringTable = {};           // key → display name

let grid, picker, editor, gameDD, savedDD;
let historyStripEl, undoBtn, redoBtn;
let historyStates = [];
let historyIndex = -1;
let historyDebounceTimer = 0;
let swapSelectionFirstCol = null;

const DEFAULT_DROPDOWN_ICON = '<span class="history-mini">'
  + '<span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span>'
  + '<span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#4D95A8"></span><span class="history-mini-cell" style="background-color:#4D95A8"></span><span class="history-mini-cell" style="background-color:#4D95A8"></span><span class="history-mini-cell" style="background-color:#4D95A8"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span>'
  + '<span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#4D95A8"></span><span class="history-mini-cell" style="background-color:#1E2A3D"></span><span class="history-mini-cell" style="background-color:#1E2A3D"></span><span class="history-mini-cell" style="background-color:#4D95A8"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span>'
  + '<span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#4D95A8"></span><span class="history-mini-cell" style="background-color:#1E2A3D"></span><span class="history-mini-cell" style="background-color:#1E2A3D"></span><span class="history-mini-cell" style="background-color:#4D95A8"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span>'
  + '<span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#4D95A8"></span><span class="history-mini-cell" style="background-color:#4D95A8"></span><span class="history-mini-cell" style="background-color:#4D95A8"></span><span class="history-mini-cell" style="background-color:#4D95A8"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span>'
  + '<span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span><span class="history-mini-cell" style="background-color:#7AC7D9"></span>'
  + '</span>';

/* ---- Init ---------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(theme);

  /* Instantiate components */
  picker = new ColorPicker(document.getElementById('picker-panel'));
  grid   = new ColorGrid(document.getElementById('grid-panel'));
  editor = new Editor(document.getElementById('editor-textarea'), theme);

  gameDD  = new Dropdown(document.getElementById('game-dd'), {
    placeholder: 'Game Colour Schemes',
    searchable: true,
    defaultIconHtml: DEFAULT_DROPDOWN_ICON,
  });
  savedDD = new Dropdown(document.getElementById('saved-dd'), {
    placeholder: 'Saved Schemes',
    searchable: false,
    defaultIconHtml: DEFAULT_DROPDOWN_ICON,
  });

  /* Wire components */
  grid.onSelect((prop) => {
    _handleSwapSelection(getColumnFromProp(prop));
    picker.setColor(scheme[prop], { updateOld: true });
  });

  picker.onChange((hexInt) => {
    const prop = grid.getActiveProp();
    if (!prop) return;
    scheme[prop] = hexInt;
    clearSchemeSelections();
    refreshAll({ recordHistory: true, debounceHistory: true });
  });

  gameDD.onChange((_, item) => {
    const gs = gameSchemes.find(g => g.DisplayNameKey === item.value);
    if (!gs) return;
    const locked = grid.getLockedColumns();
    for (const p of COLOR_PROPS) {
      if (!locked.has(getColumnFromProp(p))) scheme[p] = gs[p];
    }
    savedDD.reset();
    refreshAll({ recordHistory: true });
    showToast(`Loaded "${item.label}"`, 'info');
  });

  savedDD.onChange((name) => {
    loadFromStorage(name);
  });

  /* Populate toolbar button icons */
  const btnIcons = {
    'btn-undo': 'undo', 'btn-redo': 'redo',
    'btn-save': 'save', 'btn-delete': 'trash',
    'btn-load': 'load', 'btn-format': 'format', 'btn-generate': 'generate',
    'btn-randomise': 'dice', 'btn-swap': 'randomise', 'btn-shade': 'shade', 'btn-gradient': 'gradient',
    'btn-share': 'share', 'btn-copy': 'copy', 'btn-download': 'download',
    'btn-invert': 'invert', 'btn-hueshift': 'hueShift', 'btn-desat': 'desat',
    'btn-posterise': 'posterise', 'btn-shuffle': 'shuffle', 'btn-harmonise': 'harmonise',
  };
  for (const [id, name] of Object.entries(btnIcons)) {
    const span = document.getElementById(id)?.querySelector('.btn-icon');
    if (span) span.innerHTML = ICONS[name] || '';
  }

  /* Toolbar buttons */
  bind('btn-load',      loadFromEditor);
  bind('btn-generate',  generateToEditor);
  bind('btn-randomise', randomise);
  bind('btn-swap',      beginComponentSwap);
  bind('btn-shade',     autoShade);
  bind('btn-gradient',  effectGradient);
  bind('btn-invert',    effectInvert);
  bind('btn-hueshift',  effectHueShift);
  bind('btn-desat',     effectDesaturate);
  bind('btn-posterise', effectPosterise);
  bind('btn-shuffle',   effectShuffle);
  bind('btn-harmonise', effectHarmonise);
  bind('btn-save',      openSaveModal);
  bind('btn-delete',    deleteSaved);
  bind('btn-share',     share);
  bind('btn-copy',      copyEditor);
  bind('btn-download',  downloadFile);
  bind('btn-undo',      undoHistory);
  bind('btn-redo',      redoHistory);
  bind('btn-theme',     () => applyTheme(theme === 'dark' ? 'light' : 'dark'));

  initHistoryUI();

  /* Format dropdown (simple toggle) */
  const fmtBtn = document.getElementById('btn-format');
  fmtBtn.addEventListener('click', () => {
    format = format === 'xml' ? 'wcolor' : 'xml';
    fmtBtn.querySelector('.btn-label').textContent = format === 'xml' ? 'XML' : 'WColor';
    editor.setFormat(format);
    generateToEditor();
  });

  /* Save modal */
  document.getElementById('save-cancel').addEventListener('click', closeSaveModal);
  document.getElementById('save-confirm').addEventListener('click', confirmSave);
  document.getElementById('save-modal-backdrop').addEventListener('click', closeSaveModal);

  /* Load data */
  await loadGameSchemes();
  refreshSavedList();
  loadFromURL();

  /* Default selection */
  const firstProp = propName(GRID_COLUMNS[0].id, '');
  grid.select(firstProp);
  refreshAll({ recordHistory: true });
  editor.refresh();
});

/* ---- Helpers ------------------------------------------------------- */

function bind(id, fn) {
  const node = document.getElementById(id);
  if (node) node.addEventListener('click', fn);
}

function clearSchemeSelections() {
  gameDD.reset();
  savedDD.reset();
}

function _columnLabel(colId) {
  return GRID_COLUMNS.find(c => c.id === colId)?.label || colId;
}

function _setSwapButtonState(active) {
  const btn = document.getElementById('btn-swap');
  if (!btn) return;
  btn.classList.toggle('btn-primary', active);
}

function beginComponentSwap() {
  if (swapSelectionFirstCol) {
    swapSelectionFirstCol = null;
    _setSwapButtonState(false);
    showToast('Component swap cancelled', 'info');
    return;
  }
  swapSelectionFirstCol = '__pending__';
  _setSwapButtonState(true);
  showToast('Swap mode: click a colour in the first component', 'info');
}

function _captureComponent(colId) {
  const out = {};
  for (const shade of SWAP_SHADE_ORDER) {
    if (!GRID_CELLS[colId].has(shade)) continue;
    out[shade] = scheme[propName(colId, shade)];
  }
  return out;
}

function _mapComponentSnapshotToColumn(snapshot, sourceCol, targetCol) {
  const srcShades = SWAP_SHADE_ORDER.filter(s => GRID_CELLS[sourceCol].has(s));
  const dstShades = SWAP_SHADE_ORDER.filter(s => GRID_CELLS[targetCol].has(s));
  const mapped = {};
  if (srcShades.length === 0 || dstShades.length === 0) return mapped;

  const has = (shade) => Object.prototype.hasOwnProperty.call(snapshot, shade);
  const set = (shade, val) => { mapped[propName(targetCol, shade)] = val; };

  /* 1) Copy direct same-shade values first (no remap noise). */
  for (const shade of dstShades) {
    if (has(shade)) set(shade, snapshot[shade]);
  }

  /* 2) If source is bigger/equal than target, we are done (truncate extras). */
  if (srcShades.length >= dstShades.length) return mapped;

  /* 3) Source is smaller: expand with autoshade-style derivations. */
  if (dstShades.includes('VL') && !has('VL') && has('Lt')) {
    set('VL', shadeColour(snapshot.Lt, 1));
  }
  if (dstShades.includes('VD') && !has('VD') && has('Dk')) {
    set('VD', shadeColour(snapshot.Dk, -1));
  }

  /* Always generate accent from base for small -> big, per request. */
  if (dstShades.includes('Acc')) {
    const base = has('') ? snapshot[''] : null;
    if (base != null) set('Acc', shadeColour(base, SHADE_MAP.Acc));
  }

  return mapped;
}

function _swapComponents(colA, colB) {
  if (colA === colB) return;
  clearSchemeSelections();
  const locked = grid.getLockedColumns();
  if (locked.has(colA) || locked.has(colB)) {
    showToast('Unlock both components before swapping', 'error');
    return;
  }

  const aSnap = _captureComponent(colA);
  const bSnap = _captureComponent(colB);
  const bToA = _mapComponentSnapshotToColumn(bSnap, colB, colA);
  const aToB = _mapComponentSnapshotToColumn(aSnap, colA, colB);

  for (const [p, v] of Object.entries(bToA)) scheme[p] = v;
  for (const [p, v] of Object.entries(aToB)) scheme[p] = v;

  refreshAll({ recordHistory: true });
  showToast(`Swapped ${_columnLabel(colA)} ↔ ${_columnLabel(colB)}`, 'info');
}

function _handleSwapSelection(colId) {
  if (!swapSelectionFirstCol) return;

  if (swapSelectionFirstCol === '__pending__') {
    swapSelectionFirstCol = colId;
    showToast(`First selected: ${_columnLabel(colId)}. Now click the second component.`, 'info');
    return;
  }

  if (swapSelectionFirstCol === colId) {
    showToast('Pick a different second component', 'error');
    return;
  }

  const first = swapSelectionFirstCol;
  swapSelectionFirstCol = null;
  _setSwapButtonState(false);
  _swapComponents(first, colId);
}

function initHistoryUI() {
  historyStripEl = document.getElementById('history-strip');
  undoBtn = document.getElementById('btn-undo');
  redoBtn = document.getElementById('btn-redo');
  updateHistoryControls();
}

function _colorFromHexState(hex, prop) {
  const idx = COLOR_PROPS.indexOf(prop);
  if (idx === -1) return '#000000';
  const v = (hex || '').slice(idx * 6, idx * 6 + 6);
  return /^[0-9A-Fa-f]{6}$/.test(v) ? ('#' + v) : '#000000';
}

function _miniGridHtmlFromHex(hex) {
  const cells = [];
  for (const row of GRID_ROWS) {
    for (const col of GRID_COLUMNS) {
      if (GRID_CELLS[col.id].has(row.suffix)) {
        cells.push(`<span class="history-mini-cell" style="background-color:${_colorFromHexState(hex, propName(col.id, row.suffix))}"></span>`);
      } else {
        cells.push('<span class="history-mini-cell empty"></span>');
      }
    }
  }
  return `<span class="history-mini">${cells.join('')}</span>`;
}

function _buildHistoryMiniGrid(hex) {
  const mini = document.createElement('div');
  mini.className = 'history-mini';

  for (const row of GRID_ROWS) {
    for (const col of GRID_COLUMNS) {
      const cell = document.createElement('span');
      cell.className = 'history-mini-cell';
      if (GRID_CELLS[col.id].has(row.suffix)) {
        cell.style.backgroundColor = _colorFromHexState(hex, propName(col.id, row.suffix));
      } else {
        cell.classList.add('empty');
      }
      mini.appendChild(cell);
    }
  }

  return mini;
}

function _clearHistoryDebounce() {
  if (!historyDebounceTimer) return;
  clearTimeout(historyDebounceTimer);
  historyDebounceTimer = 0;
}

function _pushHistoryDebounced() {
  _clearHistoryDebounce();
  historyDebounceTimer = setTimeout(() => {
    historyDebounceTimer = 0;
    pushHistoryState();
  }, HISTORY_DEBOUNCE_MS);
}

function updateHistoryControls() {
  if (undoBtn) undoBtn.disabled = historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = historyIndex < 0 || historyIndex >= historyStates.length - 1;
}

function renderHistoryTimeline() {
  if (!historyStripEl) return;
  historyStripEl.innerHTML = '';

  for (let i = 0; i < historyStates.length; i++) {
    const stateBtn = document.createElement('button');
    stateBtn.type = 'button';
    stateBtn.className = 'history-state' + (i === historyIndex ? ' active' : '');
    stateBtn.setAttribute('role', 'listitem');
    stateBtn.title = `State ${i + 1} of ${historyStates.length}`;
    stateBtn.appendChild(_buildHistoryMiniGrid(historyStates[i]));
    stateBtn.addEventListener('click', () => setHistoryIndex(i));
    historyStripEl.appendChild(stateBtn);
  }

  const active = historyStripEl.querySelector('.history-state.active');
  if (historyIndex === 0) {
    historyStripEl.scrollLeft = 0;
  } else if (historyIndex === historyStates.length - 1) {
    historyStripEl.scrollLeft = historyStripEl.scrollWidth;
  } else if (active) {
    active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  updateHistoryControls();
}

function pushHistoryState() {
  const hex = scheme.toHexString();
  if (historyIndex >= 0 && historyStates[historyIndex] === hex) {
    renderHistoryTimeline();
    return;
  }

  if (historyIndex < historyStates.length - 1) {
    historyStates = historyStates.slice(0, historyIndex + 1);
  }

  historyStates.push(hex);
  historyIndex = historyStates.length - 1;

  if (historyStates.length > HISTORY_MAX_STATES) {
    const overflow = historyStates.length - HISTORY_MAX_STATES;
    historyStates.splice(0, overflow);
    historyIndex = Math.max(0, historyIndex - overflow);
  }

  renderHistoryTimeline();
}

function setHistoryIndex(nextIndex) {
  if (nextIndex < 0 || nextIndex >= historyStates.length || nextIndex === historyIndex) return;
  try {
    _clearHistoryDebounce();
    historyIndex = nextIndex;
    scheme.loadHexString(historyStates[historyIndex]);
    refreshAll();
    renderHistoryTimeline();
  } catch (e) {
    showToast('Failed to restore history state', 'error');
  }
}

function undoHistory() {
  if (historyIndex <= 0) return;
  _clearHistoryDebounce();
  setHistoryIndex(historyIndex - 1);
}

function redoHistory() {
  if (historyIndex < 0 || historyIndex >= historyStates.length - 1) return;
  _clearHistoryDebounce();
  setHistoryIndex(historyIndex + 1);
}

function refreshAll({ recordHistory = false, debounceHistory = false } = {}) {
  grid.updateFromScheme(scheme);
  editor.setValue(format === 'xml' ? scheme.generateXML() : scheme.generateINI());
  const prop = grid.getActiveProp();
  if (prop) picker.setColor(scheme[prop]);
  if (recordHistory) {
    if (debounceHistory) _pushHistoryDebounced();
    else {
      _clearHistoryDebounce();
      pushHistoryState();
    }
  }
  else updateHistoryControls();
}

/* ---- Theme --------------------------------------------------------- */

function applyTheme(t) {
  theme = t;
  document.documentElement.dataset.theme = t;
  localStorage.setItem('theme', t);

  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    themeBtn.innerHTML = '';
    themeBtn.appendChild(icon(t === 'dark' ? 'sun' : 'moon'));
  }
  if (editor) editor.setTheme(t);
  if (picker) picker.setTheme(t);
}

/* ---- Load game schemes --------------------------------------------- */

async function loadGameSchemes() {
  try {
    const [xmlRes, tsvRes] = await Promise.all([
      fetch('ColorSchemeTypes.xml'), fetch('stringTable.tsv'),
    ]);
    const xmlText = await xmlRes.text();
    const tsvText = await tsvRes.text();

    // Parse TSV
    for (const line of tsvText.split('\n').slice(1)) {
      const cols = line.split('\t');
      if (cols.length >= 2) stringTable[cols[0].trim()] = cols[1].trim();
    }

    // Parse XML
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    const nodes = doc.getElementsByTagName('ColorSchemeType');
    const SKIP = new Set(['Template', 'NO_COLOR_SCHEME']);
    for (const node of nodes) {
      const name = node.getAttribute('ColorSchemeName') || '';
      if (SKIP.has(name)) continue;
      const gs = new GameColorSchemeType();
      gs.loadFullXML(new XMLSerializer().serializeToString(node), name);
      gameSchemes.push(gs);
    }

    // Populate dropdown — standard by OrderID, team by ColorSchemeID
    const standard = gameSchemes.filter(g => g.TeamColor === 0);
    const team     = gameSchemes.filter(g => g.TeamColor > 0);
    standard.sort((a, b) => a.OrderID - b.OrderID);
    team.sort((a, b) => a.ColorSchemeID - b.ColorSchemeID);

    const mapItems = (arr) => arr.map(gs => ({
      value: gs.DisplayNameKey,
      label: stringTable[gs.DisplayNameKey] || gs.DisplayNameKey.replace(/ColorSchemeType_|_DisplayName/g, ' ').trim(),
      iconHtml: _miniGridHtmlFromHex(gs.toHexString()),
    }));
    gameDD.setItems([
      { label: 'Standard Colour Schemes', items: mapItems(standard) },
      ...(team.length ? [{ label: 'Team Colour Schemes', items: mapItems(team) }] : []),
    ]);
  } catch (err) {
    showToast('Failed to load game colour schemes', 'error');
    console.error(err);
  }
}

/* ---- Actions ------------------------------------------------------- */

function loadFromEditor() {
  try {
    const text = editor.getValue().trim();
    if (!text) return showToast('Editor is empty', 'error');
    const locked = grid.getLockedColumns();
    if (text.startsWith('<')) scheme.loadXML(text, locked);
    else scheme.loadINI(text, locked);
    clearSchemeSelections();
    refreshAll({ recordHistory: true });
    showToast('Loaded from editor', 'info');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function generateToEditor() {
  editor.setValue(format === 'xml' ? scheme.generateXML() : scheme.generateINI());
}

function randomise() {
  clearSchemeSelections();
  const locked = grid.getLockedColumns();
  for (const col of GRID_COLUMNS) {
    if (locked.has(col.id)) continue;
    const baseProp = propName(col.id, '');
    scheme[baseProp] = randomColour();
    for (const suffix of GRID_CELLS[col.id]) {
      if (suffix === '') continue;
      const shade = SHADE_MAP[suffix];
      scheme[propName(col.id, suffix)] = shadeColour(scheme[baseProp], shade);
    }
  }
  refreshAll({ recordHistory: true });
  showToast('Randomised colours', 'info');
}

function autoShade() {
  clearSchemeSelections();
  const locked = grid.getLockedColumns();
  for (const col of GRID_COLUMNS) {
    if (locked.has(col.id)) continue;
    const baseProp = propName(col.id, '');
    for (const suffix of GRID_CELLS[col.id]) {
      if (suffix === '') continue;
      scheme[propName(col.id, suffix)] = shadeColour(scheme[baseProp], SHADE_MAP[suffix]);
    }
  }
  refreshAll({ recordHistory: true });
  showToast('Auto-shaded from base colours', 'info');
}

/* ---- Effects ------------------------------------------------------- */

/** Apply a per-cell transform fn(colour) → colour, respecting locks */
function _applyEffect(fn, label) {
  clearSchemeSelections();
  const locked = grid.getLockedColumns();
  for (const p of COLOR_PROPS) {
    if (locked.has(getColumnFromProp(p))) continue;
    scheme[p] = fn(scheme[p]);
  }
  refreshAll({ recordHistory: true });
  showToast(label, 'info');
}

function effectGradient() {
  clearSchemeSelections();
  const locked = grid.getLockedColumns();
  const orderedShades = ['VL', 'Lt', '', 'Dk', 'VD'];

  const toLab = (c) => rgbToLab((c >> 16) & 0xFF, (c >> 8) & 0xFF, c & 0xFF);
  const fromLab = (L, a, b) => {
    const [r, g, bl] = labToRgb(L, a, b);
    if (r === 0 && g === 0 && bl === 0) return BLACK_FALLBACK;
    return (r << 16) | (g << 8) | bl;
  };

  for (const col of GRID_COLUMNS) {
    if (locked.has(col.id)) continue;

    const shades = orderedShades.filter(s => GRID_CELLS[col.id].has(s));
    if (shades.length < 2) continue;

    const firstProp = propName(col.id, shades[0]);
    const lastProp  = propName(col.id, shades[shades.length - 1]);
    const [L1, a1, b1] = toLab(scheme[firstProp]);
    const [L2, a2, b2] = toLab(scheme[lastProp]);

    for (let i = 0; i < shades.length; i++) {
      const t = i / (shades.length - 1);
      const prop = propName(col.id, shades[i]);
      const L = L1 + (L2 - L1) * t;
      const a = a1 + (a2 - a1) * t;
      const b = b1 + (b2 - b1) * t;
      scheme[prop] = fromLab(L, a, b);
    }

    // Accent is regenerated from base like Auto Shade.
    if (GRID_CELLS[col.id].has('Acc')) {
      const baseProp = propName(col.id, '');
      scheme[propName(col.id, 'Acc')] = shadeColour(scheme[baseProp], SHADE_MAP.Acc);
    }
  }

  refreshAll({ recordHistory: true });
  showToast('Applied light→dark gradient', 'info');
}

function effectInvert() {
  clearSchemeSelections();
  const locked = grid.getLockedColumns();
  const next = {};

  for (const col of GRID_COLUMNS) {
    if (locked.has(col.id)) continue;

    // Mirror available non-accent shades (supports 3/4/5-shade columns)
    const shades = ['VL', 'Lt', '', 'Dk', 'VD'].filter(s => GRID_CELLS[col.id].has(s));
    for (let i = 0; i < shades.length; i++) {
      const target = propName(col.id, shades[i]);
      const source = propName(col.id, shades[shades.length - 1 - i]);
      next[target] = invertColour(scheme[source]);
    }

    // Keep accent in-place (invert only; no position swap)
    if (GRID_CELLS[col.id].has('Acc')) {
      const acc = propName(col.id, 'Acc');
      next[acc] = invertColour(scheme[acc]);
    }
  }

  for (const [p, v] of Object.entries(next)) scheme[p] = v;
  refreshAll({ recordHistory: true });
  showToast('Inverted colours', 'info');
}

function effectHueShift() {
  _applyEffect(c => hueShiftColour(c, 30), 'Hue shifted +30°');
}

function effectDesaturate() {
  _applyEffect(desaturateColour, 'Desaturated to greyscale');
}

function effectPosterise() {
  _applyEffect(posteriseColour, 'Posterised (4 levels)');
}

function effectShuffle() {
  _applyEffect(channelShuffleColour, 'Channels shuffled R→G→B');
}

function effectHarmonise() {
  /* Compute average hue of all unlocked base colours */
  const locked = grid.getLockedColumns();
  let sinSum = 0, cosSum = 0, count = 0;
  for (const col of GRID_COLUMNS) {
    if (locked.has(col.id)) continue;
    const base = scheme[propName(col.id, '')];
    const hsv = rgbToHsv((base >> 16) & 0xFF, (base >> 8) & 0xFF, base & 0xFF);
    sinSum += Math.sin(hsv[0] * Math.PI / 180);
    cosSum += Math.cos(hsv[0] * Math.PI / 180);
    count++;
  }
  if (count === 0) return;
  const avgHue = ((Math.atan2(sinSum, cosSum) * 180 / Math.PI) + 360) % 360;

  /* Assign each column an analogous offset */
  const offsets = [-30, -15, 0, 15, 30, 45];
  let i = 0;
  for (const col of GRID_COLUMNS) {
    if (locked.has(col.id)) { i++; continue; }
    const colHue = (avgHue + offsets[i % offsets.length] + 360) % 360;
    for (const suffix of GRID_CELLS[col.id]) {
      const p = propName(col.id, suffix);
      scheme[p] = harmoniseColour(scheme[p], colHue);
    }
    i++;
  }
  refreshAll({ recordHistory: true });
  showToast('Harmonised to analogous palette', 'info');
}

function share() {
  const hexStr = scheme.toHexString();
  const base = window.location.origin + window.location.pathname;
  const url  = `${base}?colour=${encodeURIComponent(btoa(hexStr))}`;
  navigator.clipboard.writeText(url)
    .then(() => showToast('Share link copied!', 'info'))
    .catch(() => showToast('Failed to copy link', 'error'));
}

function copyEditor() {
  navigator.clipboard.writeText(editor.getValue())
    .then(() => showToast('Copied to clipboard', 'info'))
    .catch(() => showToast('Failed to copy', 'error'));
}

function downloadFile() {
  const ext  = format === 'xml' ? 'xml' : 'cfg';
  const mime = format === 'xml' ? 'text/xml' : 'text/plain';
  const blob = new Blob([editor.getValue()], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ColourScheme.${ext}`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('File downloaded', 'info');
}

/* ---- URL loading --------------------------------------------------- */

function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const b64 = params.get('colour') || params.get('color');
  if (!b64) return;
  try {
    const hex = atob(decodeURIComponent(b64));
    scheme.loadHexString(hex);
    clearSchemeSelections();
    refreshAll({ recordHistory: true });
    showToast('Loaded from shared link', 'info');
  } catch (e) {
    showToast('Invalid shared link', 'error');
  }
}

/* ---- localStorage -------------------------------------------------- */

function refreshSavedList() {
  const items = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(LS_PREFIX)) items.push({
      value: key.slice(LS_PREFIX.length),
      label: key.slice(LS_PREFIX.length),
      iconHtml: _miniGridHtmlFromHex(localStorage.getItem(key) || ''),
    });
  }
  items.sort((a, b) => a.label.localeCompare(b.label));
  if (items.length === 0) {
    savedDD.setItems([{ label: 'Saved Schemes', items: [{ value: '__empty__', label: 'No saved schemes' }] }]);
    savedDD.setDisabledValues(new Set(['__empty__']));
  } else {
    savedDD.setItems([{ label: 'Saved Schemes', items }]);
    savedDD.setDisabledValues(null);
  }
}

function loadFromStorage(name) {
  try {
    const data = localStorage.getItem(LS_PREFIX + name);
    if (!data) return showToast('Not found', 'error');
    scheme.loadHexString(data);
    gameDD.reset();
    refreshAll({ recordHistory: true });
    showToast(`Loaded "${name}"`, 'info');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function deleteSaved() {
  const name = savedDD.getValue();
  if (!name) return showToast('Select a saved scheme first', 'error');
  localStorage.removeItem(LS_PREFIX + name);
  savedDD.reset();
  refreshSavedList();
  showToast(`Deleted "${name}"`, 'info');
}

/* ---- Save modal ---------------------------------------------------- */

function openSaveModal() {
  const modal = document.getElementById('save-modal');
  const input = document.getElementById('save-name-input');
  modal.classList.add('open');
  input.value = '';
  input.focus();
}

function closeSaveModal() {
  document.getElementById('save-modal').classList.remove('open');
}

function confirmSave() {
  const name = document.getElementById('save-name-input').value.trim();
  if (!name) return showToast('Enter a name', 'error');
  localStorage.setItem(LS_PREFIX + name, scheme.toHexString());
  closeSaveModal();
  refreshSavedList();
  showToast(`Saved "${name}"`, 'info');
}

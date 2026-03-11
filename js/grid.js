/* ======================================================================
   grid.js — Colour-swap grid component (main UI)
   ====================================================================== */

import {
  el, intToHex, GRID_COLUMNS, GRID_ROWS, GRID_CELLS,
  propName, friendlyName,
} from './utils.js';
import { COLOR_PROPS } from './color-scheme.js';

export class ColorGrid {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this._container = container;
    this._selectCb = null;
    this._activeProp = null;
    this._cells = {};           // prop → cell element
    this._lockStates = {};      // colId → boolean
    this._build();
  }

  /* ---- Public API -------------------------------------------------- */

  onSelect(fn) { this._selectCb = fn; }

  /** Get the currently selected property name */
  getActiveProp() { return this._activeProp; }

  /** Update every cell from a ColorSchemeType instance */
  updateFromScheme(scheme) {
    for (const p of COLOR_PROPS) {
      const cell = this._cells[p];
      if (!cell) continue;
      const hex = intToHex(scheme[p]);
      cell.style.backgroundColor = hex;
      cell.dataset.hex = hex;
      const overlay = cell.querySelector('.grid-cell-hex');
      if (overlay) overlay.textContent = hex;
    }
  }

  /** Return a Set of locked column IDs */
  getLockedColumns() {
    const s = new Set();
    for (const [col, locked] of Object.entries(this._lockStates)) {
      if (locked) s.add(col);
    }
    return s;
  }

  /** Programmatically select a cell */
  select(prop) {
    this._setActive(prop);
  }

  /* ---- Build ------------------------------------------------------- */

  _build() {
    this._container.classList.add('color-grid');
    this._container.innerHTML = '';

    const table = el('div', { className: 'grid-table' });

    /* Header row: lock checkbox + column labels */
    const headerRow = el('div', { className: 'grid-row grid-header' });
    headerRow.appendChild(el('div', { className: 'grid-corner' })); // empty corner
    for (const col of GRID_COLUMNS) {
      const head = el('div', { className: 'grid-col-head' });
      const lockCb = el('input', { type: 'checkbox', className: 'grid-lock', title: `Lock ${col.label}` });
      lockCb.addEventListener('change', () => { this._lockStates[col.id] = lockCb.checked; });
      this._lockStates[col.id] = false;
      const label = el('span', { className: 'grid-col-label', textContent: col.label, title: col.tip });
      head.append(lockCb, label);
      headerRow.appendChild(head);
    }
    table.appendChild(headerRow);

    /* Shade rows */
    for (const row of GRID_ROWS) {
      const rowEl = el('div', { className: 'grid-row' });
      const rowLabel = el('div', { className: 'grid-row-label', textContent: row.label, title: row.tip });
      rowEl.appendChild(rowLabel);

      for (const col of GRID_COLUMNS) {
        if (GRID_CELLS[col.id].has(row.suffix)) {
          const prop = propName(col.id, row.suffix);
          const cell = el('div', {
            className: 'grid-cell',
            title: friendlyName(prop),
            dataset: { prop },
          });
          const overlay = el('span', { className: 'grid-cell-hex' });
          cell.appendChild(overlay);
          cell.addEventListener('click', () => this._setActive(prop));
          rowEl.appendChild(cell);
          this._cells[prop] = cell;
        } else {
          rowEl.appendChild(el('div', { className: 'grid-cell grid-cell-empty' }));
        }
      }
      table.appendChild(rowEl);
    }

    this._container.appendChild(table);
    this._table = table;
    this._setupResize();
  }

  /* ---- Responsive cell sizing -------------------------------------- */

  _setupResize() {
    const ro = new ResizeObserver(() => this._fitCells());
    ro.observe(this._container);
    /* initial size */
    requestAnimationFrame(() => this._fitCells());
  }

  _fitCells() {
    const rect = this._container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (!w || !h) return;

    const headerEl = this._table.querySelector('.grid-header');
    const headerH = headerEl ? headerEl.getBoundingClientRect().height + 3 : 32;

    /* Check if mobile breakpoint (matches 680px media query) */
    const isMobile = window.matchMedia('(max-width: 680px)').matches;
    const labelCol = isMobile ? 55 : 80;
    const GAP = 3;
    const COLS = 6;
    const ROWS = 6;

    const fromW = (w - labelCol - (COLS + 1) * GAP) / COLS;
    const fromH = (h - headerH - (ROWS) * GAP) / ROWS;
    const cellSize = Math.max(20, Math.floor(Math.min(fromW, fromH)));

    this._table.style.setProperty('--cell-size', cellSize + 'px');
  }

  _setActive(prop) {
    // Remove old highlight
    const oldCell = this._container.querySelector('.grid-cell.active');
    if (oldCell) oldCell.classList.remove('active');

    // Set new
    this._activeProp = prop;
    const cell = this._cells[prop];
    if (cell) cell.classList.add('active');
    if (this._selectCb) this._selectCb(prop);
  }
}

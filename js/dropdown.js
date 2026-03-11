/* ======================================================================
   dropdown.js — Custom searchable dropdown component
   ====================================================================== */

import { el, ICONS } from './utils.js';

export class Dropdown {
  /**
   * @param {HTMLElement} container  — element to build inside
   * @param {object}      opts
   * @param {string}      opts.placeholder
   * @param {boolean}     [opts.searchable=false]
   * @param {Function}    [opts.onChange]
   */
  constructor(container, opts = {}) {
    this._container = container;
    this._placeholder = opts.placeholder || 'Select…';
    this._searchable = opts.searchable ?? false;
    this._onChange = opts.onChange || null;
    this._open = false;
    this._value = null;
    this._items = [];           // flat: {value, label, group}
    this._filtered = [];
    this._disabled = null;      // Set of disabled values
    this._build();
    this._onOutsideClick = (e) => {
      if (!this._container.contains(e.target)) this.close();
    };
  }

  /* ---- Public API -------------------------------------------------- */

  setItems(groups) {
    // groups = [{label: string, items: [{value, label}]}]
    this._items = [];
    for (const g of groups) {
      for (const it of g.items) {
        this._items.push({ value: it.value, label: it.label, group: g.label });
      }
    }
    this._filtered = this._items;
    this._renderList();
  }

  setValue(val) {
    const item = this._items.find(i => i.value === val);
    this._value = val;
    this._btnText.textContent = item ? item.label : this._placeholder;
    this._highlightActive();
  }

  getValue() { return this._value; }

  reset() {
    this._value = null;
    this._btnText.textContent = this._placeholder;
    this._highlightActive();
  }

  onChange(fn) { this._onChange = fn; }

  setDisabledValues(s) { this._disabled = s; this._renderList(); }

  open() {
    if (this._open) return;
    this._open = true;
    this._menu.classList.add('open');
    this._container.classList.add('dropdown-active');
    document.addEventListener('pointerdown', this._onOutsideClick, true);
    if (this._searchable && this._searchInput) {
      this._searchInput.value = '';
      this._filter('');
      this._searchInput.focus();
    }
    this._highlightActive();
    this._scrollToActive();
  }

  close() {
    if (!this._open) return;
    this._open = false;
    this._menu.classList.remove('open');
    this._container.classList.remove('dropdown-active');
    document.removeEventListener('pointerdown', this._onOutsideClick, true);
  }

  toggle() { this._open ? this.close() : this.open(); }

  /* ---- Build DOM --------------------------------------------------- */

  _build() {
    this._container.classList.add('dropdown');

    /* Trigger button */
    this._btn = el('button', { className: 'dropdown-btn', type: 'button' });
    this._btnText = el('span', { className: 'dropdown-btn-text', textContent: this._placeholder });
    const arrow = el('span', { className: 'dropdown-arrow', innerHTML: ICONS.chevron });
    this._btn.append(this._btnText, arrow);
    this._btn.addEventListener('click', () => this.toggle());

    /* Menu panel */
    this._menu = el('div', { className: 'dropdown-menu' });

    if (this._searchable) {
      const searchWrap = el('div', { className: 'dropdown-search' });
      const searchIcon = el('span', { className: 'dropdown-search-icon', innerHTML: ICONS.search });
      this._searchInput = el('input', { type: 'text', className: 'dropdown-search-input', placeholder: 'Search…' });
      this._searchInput.addEventListener('input', () => this._filter(this._searchInput.value));
      searchWrap.append(searchIcon, this._searchInput);
      this._menu.appendChild(searchWrap);
    }

    this._list = el('div', { className: 'dropdown-list' });
    this._menu.appendChild(this._list);

    this._container.append(this._btn, this._menu);
  }

  _filter(query) {
    const q = query.toLowerCase().trim();
    this._filtered = q ? this._items.filter(i => i.label.toLowerCase().includes(q)) : this._items;
    this._renderList();
  }

  _renderList() {
    this._list.innerHTML = '';
    let lastGroup = null;
    for (const item of this._filtered) {
      if (item.group !== lastGroup) {
        lastGroup = item.group;
        this._list.appendChild(el('div', { className: 'dropdown-group-header', textContent: item.group }));
      }
      const isDisabled = this._disabled && this._disabled.has(item.value);
      const btn = el('button', {
        className: 'dropdown-item' + (item.value === this._value ? ' active' : '') + (isDisabled ? ' disabled' : ''),
        type: 'button',
        textContent: item.label,
        dataset: { value: item.value },
      });
      if (isDisabled) {
        btn.style.opacity = '0.45';
        btn.style.pointerEvents = 'none';
      } else {
        btn.addEventListener('click', () => this._select(item));
      }
      this._list.appendChild(btn);
    }
  }

  _select(item) {
    this._value = item.value;
    this._btnText.textContent = item.label;
    this.close();
    if (this._onChange) this._onChange(item.value, item);
  }

  _highlightActive() {
    for (const el of this._list.querySelectorAll('.dropdown-item')) {
      el.classList.toggle('active', el.dataset.value === String(this._value));
    }
  }

  _scrollToActive() {
    const active = this._list.querySelector('.dropdown-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }
}

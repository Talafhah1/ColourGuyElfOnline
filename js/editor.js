/* ======================================================================
   editor.js — CodeMirror 5 wrapper with colour-chip decorations
   ====================================================================== */

import { el } from './utils.js';

export class Editor {
  /**
   * @param {HTMLTextAreaElement} textarea — textarea to enhance
   * @param {string}             theme    — 'dark' | 'light'
   */
  constructor(textarea, theme = 'dark') {
    this._changeCb = null;
    this._suppressing = false;
    this._format = 'xml';
    this._pendingText = null;
    this._setTimer = 0;
    this._chipMarks = [];

    /* Initialise CodeMirror */
    this._cm = CodeMirror.fromTextArea(textarea, {
      lineNumbers: true,
      lineWrapping: true,
      theme: theme === 'dark' ? 'material-darker' : 'default',
      mode: 'xml',
      tabSize: 2,
      viewportMargin: Infinity,
    });

    this._cm.on('change', () => {
      if (!this._suppressing && this._changeCb) this._changeCb(this._cm.getValue());
    });
  }

  /* ---- Public API -------------------------------------------------- */

  onChange(fn) { this._changeCb = fn; }

  getValue() { return this._pendingText ?? this._cm.getValue(); }

  setValue(text) {
    this._pendingText = text;
    clearTimeout(this._setTimer);
    this._setTimer = setTimeout(() => this._flush(), 80);
  }

  _flush() {
    if (this._pendingText == null) return;
    this._suppressing = true;
    this._cm.setValue(this._pendingText);
    this._suppressing = false;
    this._pendingText = null;
    this._updateChips();
  }

  setFormat(format) {
    this._format = format;
    this._cm.setOption('mode', format === 'xml' ? 'xml' : 'properties');
  }

  setTheme(theme) {
    this._cm.setOption('theme', theme === 'dark' ? 'material-darker' : 'default');
  }

  refresh() {
    requestAnimationFrame(() => this._cm.refresh());
  }

  /* ---- Colour-chip bookmarks --------------------------------------- */

  _updateChips() {
    for (const m of this._chipMarks) m.clear();
    this._chipMarks = [];

    const hexRe = /(?:0x|#)([0-9A-Fa-f]{6})\b/g;
    this._cm.eachLine((lineHandle) => {
      const lineNo = this._cm.getLineNumber(lineHandle);
      const text = lineHandle.text;
      let match;
      hexRe.lastIndex = 0;
      while ((match = hexRe.exec(text)) !== null) {
        const color = '#' + match[1];
        const widget = document.createElement('span');
        widget.className = 'cm-color-chip';
        widget.style.backgroundColor = color;
        const bm = this._cm.setBookmark(
          { line: lineNo, ch: match.index },
          { widget, insertLeft: true }
        );
        this._chipMarks.push(bm);
      }
    });
  }

}

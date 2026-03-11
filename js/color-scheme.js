/* ======================================================================
   color-scheme.js — ColorSchemeType data models
   ====================================================================== */

import { getColumnFromProp } from './utils.js';

/** All 30 swap property names in canonical order */
export const COLOR_PROPS = [
  'HairLt_Swap', 'Hair_Swap', 'HairDk_Swap',
  'Body1VL_Swap', 'Body1Lt_Swap', 'Body1_Swap', 'Body1Dk_Swap', 'Body1VD_Swap', 'Body1Acc_Swap',
  'Body2VL_Swap', 'Body2Lt_Swap', 'Body2_Swap', 'Body2Dk_Swap', 'Body2VD_Swap', 'Body2Acc_Swap',
  'SpecialVL_Swap', 'SpecialLt_Swap', 'Special_Swap', 'SpecialDk_Swap', 'SpecialVD_Swap', 'SpecialAcc_Swap',
  'ClothVL_Swap', 'ClothLt_Swap', 'Cloth_Swap', 'ClothDk_Swap',
  'WeaponVL_Swap', 'WeaponLt_Swap', 'Weapon_Swap', 'WeaponDk_Swap', 'WeaponAcc_Swap',
];

/* ---------------------------------------------------------------------- */

export class ColorSchemeType {
  constructor() {
    this.HairLt_Swap = 0xFF8080; this.Hair_Swap = 0xFF0000; this.HairDk_Swap = 0x800000;
    this.Body1VL_Swap = 0xFFE0C0; this.Body1Lt_Swap = 0xFFC080; this.Body1_Swap = 0xFF8000;
    this.Body1Dk_Swap = 0x804000; this.Body1VD_Swap = 0x402000; this.Body1Acc_Swap = 0xFFC000;
    this.Body2VL_Swap = 0xFFFFC0; this.Body2Lt_Swap = 0xFFFF80; this.Body2_Swap = 0xFFFF00;
    this.Body2Dk_Swap = 0x808000; this.Body2VD_Swap = 0x404000; this.Body2Acc_Swap = 0xC0FF00;
    this.SpecialVL_Swap = 0xC0FFC0; this.SpecialLt_Swap = 0x80FF80; this.Special_Swap = 0x00FF00;
    this.SpecialDk_Swap = 0x008000; this.SpecialVD_Swap = 0x004000; this.SpecialAcc_Swap = 0x00FFC0;
    this.ClothVL_Swap = 0xC0C0FF; this.ClothLt_Swap = 0x8080FF; this.Cloth_Swap = 0x0000FF; this.ClothDk_Swap = 0x000080;
    this.WeaponVL_Swap = 0xFFC0FF; this.WeaponLt_Swap = 0xFF80FF; this.Weapon_Swap = 0xFF00FF;
    this.WeaponDk_Swap = 0x800080; this.WeaponAcc_Swap = 0xFF0080;
  }

  _hex6(n) { return (n & 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase(); }

  generateXML() {
    let xml = '<ColorSchemeType>\n';
    for (const p of COLOR_PROPS) xml += `\t<${p}>0x${this._hex6(this[p])}</${p}>\n`;
    return xml + '</ColorSchemeType>';
  }

  generateINI() {
    return COLOR_PROPS.map(p => `${p.replace(/_Swap$/, '')}=#${this._hex6(this[p])}`).join('\n');
  }

  loadXML(xml, locked) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const root = doc.getElementsByTagName('ColorSchemeType')[0];
    if (!root) throw new Error('ColorSchemeType not found in XML');
    for (const p of COLOR_PROPS) {
      if (locked && locked.has(getColumnFromProp(p))) continue;
      const el = root.getElementsByTagName(p)[0];
      if (!el?.textContent) throw new Error(`Missing value for ${p}`);
      const v = parseInt(el.textContent, 16);
      if (isNaN(v)) throw new Error(`Invalid value for ${p}`);
      this[p] = v;
    }
  }

  loadINI(ini, locked) {
    const map = {};
    for (const line of ini.split(/\r?\n/).filter(l => l.trim())) {
      const eq = line.indexOf('=');
      if (eq === -1) throw new Error(`Invalid line: ${line}`);
      map[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
    for (const p of COLOR_PROPS) {
      if (locked && locked.has(getColumnFromProp(p))) continue;
      const key = p.replace(/_Swap$/, '');
      if (!(key in map)) throw new Error(`Missing value for ${key}`);
      let val = map[key];
      if (val.startsWith('#')) val = val.slice(1);
      else if (val.startsWith('0x') || val.startsWith('0X')) val = val.slice(2);
      const v = parseInt(val, 16);
      if (isNaN(v)) throw new Error(`Invalid value for ${key}`);
      this[p] = v;
    }
  }

  loadHexString(hex) {
    if (hex.length !== 180) throw new Error('Invalid hex string length');
    COLOR_PROPS.forEach((p, i) => {
      const v = parseInt(hex.slice(i * 6, i * 6 + 6), 16);
      if (isNaN(v)) throw new Error(`Invalid value for ${p}`);
      this[p] = v;
    });
  }

  toHexString() {
    return COLOR_PROPS.map(p => this._hex6(this[p])).join('');
  }
}

/* ---------------------------------------------------------------------- */

export class GameColorSchemeType extends ColorSchemeType {
  constructor() {
    super();
    for (const p of COLOR_PROPS) this[p] = 0;
    this.ColorSchemeName = '';
    this.ColorSchemeID = 0;
    this.DisplayNameKey = '';
    this.OrderID = 0;
    this.TeamColor = 0;
  }

  loadFullXML(outerHTML, nameAttr) {
    const doc = new DOMParser().parseFromString(outerHTML, 'text/xml');
    const root = doc.getElementsByTagName('ColorSchemeType')[0];
    if (!root) throw new Error('ColorSchemeType not found');

    this.ColorSchemeName = nameAttr || '';
    const text = (tag) => root.getElementsByTagName(tag)[0]?.textContent || '';
    this.ColorSchemeID = parseInt(text('ColorSchemeID')) || 0;
    this.DisplayNameKey = text('DisplayNameKey');
    this.OrderID = parseInt(text('OrderID')) || 0;
    this.TeamColor = parseInt(text('TeamColor')) || 0;

    for (const p of COLOR_PROPS) {
      const v = parseInt(text(p), 16);
      if (!isNaN(v)) this[p] = v;
    }
  }
}

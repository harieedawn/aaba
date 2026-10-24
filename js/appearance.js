// Giao diện: màu chủ đạo (accent) + Liquid Glass. Per-device, localStorage only.
import { onTheme } from './session.js';

const AK = 'aaba.accent', CK = 'aaba.accent.css', GK = 'aaba.glass';
const META = { light: '#FBF8F2', dark: '#13151A' };
const VARS = ['--accent', '--on-accent', '--acc-h', '--bg', '--surface', '--surface-2', '--border', '--primary-tint'];
const subs = new Set();
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};

// ---- colour maths ----
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export function hsl2hex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function hex2hsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return null;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  let hh = 0;
  if (d) hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (hh * 60 + 360) % 360, s: d ? (d / (1 - Math.abs(2 * l - 1))) * 100 : 0, l: l * 100 };
}
export function luminance(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const DARK_ON = '#1F2430';
export const pickOn = acc => (contrast(acc, DARK_ON) >= contrast(acc, '#FFFFFF') ? DARK_ON : '#FFFFFF');

// Move lightness away from the contrast crossover until text on the accent reaches 4.5:1.
function fit(h, s, l) {
  let acc = hsl2hex(h, s, l), on = pickOn(acc);
  for (let i = 0; i < 100 && contrast(acc, on) < 4.5; i++) {
    l += on === DARK_ON ? 1 : -1; acc = hsl2hex(h, s, l); on = pickOn(acc);
  }
  return { accent: acc, on };
}

// spec: 'h:210' (hue slider / preset) or '#rrggbb' (custom). Returns null when invalid.
export function parseAccent(spec) {
  if (typeof spec !== 'string') return null;
  if (/^h:\d{1,3}$/.test(spec)) return { h: Number(spec.slice(2)) % 360 };
  const c = hex2hsl(spec); return c ? { h: c.h, c } : null;
}
export function deriveAccent(spec, theme) {
  const p = typeof spec === 'string' ? parseAccent(spec) : spec;
  if (!p) return null;
  const dark = theme === 'dark', h = p.h;
  const s = p.c ? clamp(p.c.s, 35, 95) : dark ? 80 : 90;
  const l = p.c ? clamp(p.c.l, dark ? 55 : 45, dark ? 72 : 66) : dark ? 64 : 58;
  const { accent, on } = fit(h, s, l), hov = fit(h, s, l - 6);
  const t = (ss, ll) => hsl2hex(h, ss, ll);
  const v = dark
    ? { '--bg': t(16, 8.5), '--surface': t(14, 11.5), '--surface-2': t(13, 15), '--border': t(12, 19.5) }
    : { '--bg': t(38, 96.5), '--surface': t(30, 99), '--surface-2': t(28, 94), '--border': t(24, 88.5) };
  v['--primary-tint'] = v['--surface-2'];
  return { accent, on, vars: { '--accent': accent, '--on-accent': on, '--acc-h': hov.accent, ...v } };
}

// ---- accent ----
export const getAccent = () => { const v = ls.get(AK); return parseAccent(v) ? v : null; };
export function applyAccent() {
  const root = document.documentElement, theme = root.dataset.theme === 'dark' ? 'dark' : 'light';
  const d = getAccent() ? deriveAccent(getAccent(), theme) : null;
  VARS.forEach(k => (d && d.vars[k] ? root.style.setProperty(k, d.vars[k]) : root.style.removeProperty(k)));
  d ? (root.dataset.accent = '1') : delete root.dataset.accent;
  document.querySelectorAll('meta[name=theme-color]').forEach(m => m.setAttribute('content', d ? d.vars['--bg'] : META[theme]));
}
export function setAccent(spec) {
  if (spec && !parseAccent(spec)) return;
  ls.set(AK, spec || null);
  ls.set(CK, spec ? JSON.stringify({ light: deriveAccent(spec, 'light').vars, dark: deriveAccent(spec, 'dark').vars }) : null);
  applyAccent(); subs.forEach(f => f());
}

// ---- glass ----
export const lowEnd = () => {
  try { return navigator.hardwareConcurrency <= 4 || navigator.deviceMemory <= 3; } catch { return false; }
};
export const getGlass = () => { const v = ls.get(GK); return v === 'lite' || v === 'full' ? v : 'off'; };
export const applyGlass = () => { document.documentElement.dataset.glass = getGlass(); };
export function setGlass(v) {
  ls.set(GK, v === 'lite' || v === 'full' ? v : 'off'); applyGlass(); subs.forEach(f => f());
}
export const onAppearance = f => { subs.add(f); return () => subs.delete(f); };

export function initAppearance() {
  applyAccent(); applyGlass();
  onTheme(applyAccent);
}

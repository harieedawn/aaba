// Thẻ "Giao diện" ở Tôi: Sáng/Tối/Tự động, màu chủ đạo, kính lỏng.
import { h } from './dom.js';
import { getThemePref, setTheme, getTheme, onTheme } from '../session.js';
import { getAccent, setAccent, parseAccent, deriveAccent, getGlass, setGlass, lowEnd, onAppearance } from '../appearance.js';

const PRESETS = [['Vàng', 45], ['Cam', 22], ['Đỏ', 2], ['Hồng', 330], ['Tím', 270], ['Xanh dương', 215], ['Xanh ngọc', 180], ['Xanh lá', 140]];
const DEFAULT_HEX = '#FFD23F';
const RAINBOW = 'linear-gradient(90deg,' + [0, 60, 120, 180, 240, 300, 360].map(d => `hsl(${d} 90% 55%)`).join(',') + ')';

function themeSeg() {
  const opts = [['light', 'Sáng'], ['dark', 'Tối'], ['auto', 'Tự động']];
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Giao diện' });
  const paint = () => [...seg.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === getThemePref())));
  opts.forEach(([v, l]) => seg.append(h('button', { type: 'button', 'data-v': v, onclick: () => { setTheme(v); paint(); } }, l)));
  paint();
  return seg;
}

function accentBlock() {
  const cur = () => getAccent(), hueOf = () => parseAccent(cur() || 'h:45').h;
  const accHex = () => (cur() ? deriveAccent(cur(), getTheme()).accent : DEFAULT_HEX);
  const range = h('input', { type: 'range', class: 'ap-hue', min: 0, max: 360, step: 1, 'aria-label': 'Màu chủ đạo (sắc độ)', style: { background: RAINBOW } });
  const picker = h('input', { type: 'color', class: 'ap-color', id: 'ap-color', 'aria-label': 'Màu tự chọn' });
  const sw = PRESETS.map(([name, hue]) => h('button', { type: 'button', class: 'ap-sw', 'aria-label': name, title: name, 'data-h': hue, onclick: () => setAccent('h:' + hue) }));
  const prev = h('div', { class: 'ap-prev', 'aria-hidden': 'true' }, h('span', { class: 'ap-prev-pill' }, 'Xem trước'), h('span', { class: 'ap-prev-dot' }));
  const paint = () => {
    const hue = hueOf(), a = cur();
    range.value = String(hue); range.style.setProperty('--ap-c', `hsl(${hue} 90% 55%)`);
    range.setAttribute('aria-valuetext', `${Math.round(hue)} độ`);
    picker.value = accHex().toLowerCase();
    sw.forEach(b => {
      const d = deriveAccent('h:' + b.dataset.h, getTheme());
      b.style.background = d.accent; b.style.color = d.on;
      b.setAttribute('aria-pressed', String(a === 'h:' + b.dataset.h));
    });
  };
  range.addEventListener('input', () => setAccent('h:' + range.value));
  picker.addEventListener('input', () => setAccent(picker.value));
  const reset = h('button', { type: 'button', class: 'btn btn-ghost ap-reset', onclick: () => setAccent(null) }, 'Đặt lại');
  const root = h('div', { class: 'ap-block' },
    h('h3', { class: 'ap-h' }, 'Màu chủ đạo'), prev, range,
    h('div', { class: 'ap-sws', role: 'group', 'aria-label': 'Màu có sẵn' }, sw),
    h('div', { class: 'ap-row' }, h('label', { class: 'ap-lbl', for: 'ap-color' }, 'Màu tự chọn', picker), reset));
  const offA = onAppearance(() => (root.isConnected ? paint() : offA()));
  const offT = onTheme(() => (root.isConnected ? paint() : offT()));
  paint();
  return root;
}

function glassBlock() {
  const sw = h('button', { type: 'button', class: 'ap-switch', role: 'switch', 'aria-labelledby': 'ap-glass-l' }, h('span', { class: 'ap-knob' }));
  const lvl = h('div', { class: 'seg ap-lvl', role: 'group', 'aria-label': 'Mức kính lỏng' });
  [['lite', 'Nhẹ'], ['full', 'Đầy đủ']].forEach(([v, l]) => lvl.append(h('button', { type: 'button', 'data-v': v, onclick: () => setGlass(v) }, l)));
  const hint = h('p', { class: 'muted ap-hint' }, 'Máy này hợp với mức Nhẹ hơn.');
  const paint = () => {
    const g = getGlass();
    sw.setAttribute('aria-checked', String(g !== 'off'));
    lvl.hidden = g === 'off'; hint.hidden = g === 'off' || !lowEnd();
    [...lvl.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === g)));
  };
  sw.addEventListener('click', () => setGlass(getGlass() === 'off' ? (lowEnd() ? 'lite' : 'full') : 'off'));
  const root = h('div', { class: 'ap-block' },
    h('div', { class: 'ap-row' }, h('span', { class: 'ap-lbl', id: 'ap-glass-l' }, 'Hiệu ứng kính lỏng (Liquid Glass)'), sw), lvl, hint);
  const off = onAppearance(() => (root.isConnected ? paint() : off()));
  paint();
  return root;
}

export const appearanceCard = () => h('section', { class: 'card ap-card' }, h('h2', { class: 'sec-h' }, 'Giao diện'), themeSeg(), accentBlock(), glassBlock());

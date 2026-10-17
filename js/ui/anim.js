// Motion helpers (WAAPI, transform + opacity only). All respect prefers-reduced-motion.
import { h } from './dom.js';
import { fmtNum } from '../format.js';
const EASE = 'cubic-bezier(.2,.8,.2,1)';
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function countUp(el, to, from = el._v ?? 0, dur = 600) {
  el._v = to;
  cancelAnimationFrame(el._raf);
  if (reduced() || from === to) { el.textContent = fmtNum(to); return; }
  const t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmtNum(Math.round(from + (to - from) * e));
    if (p < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

// FLIP: measure, run mutate() (reorders DOM), animate each child from old to new position.
export function flip(container, mutate) {
  const first = new Map([...container.children].map(k => [k, k.getBoundingClientRect()]));
  mutate();
  if (reduced()) return;
  for (const k of container.children) {
    const a = first.get(k);
    if (!a) continue;
    const b = k.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    k.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 360, easing: EASE });
  }
}

export function stagger(els, step = 30, cap = 8) {
  if (reduced()) return;
  [...els].forEach((el, i) => {
    el.style.animationDelay = Math.min(i, cap - 1) * step + 'ms';
    el.classList.add('stagger-in');
    el.addEventListener('animationend', () => { el.classList.remove('stagger-in'); el.style.animationDelay = ''; }, { once: true });
  });
}

// Bar fill as scaleX(frac); grows from its previous value (0 when new).
export function setBar(el, frac, delay = 0) {
  const from = el._f ?? 0;
  el._f = frac;
  el.style.transform = `scaleX(${frac})`;
  if (reduced() || from === frac) return;
  el.animate([{ transform: `scaleX(${from})` }, { transform: `scaleX(${frac})` }], { duration: 600, delay, easing: EASE, fill: 'backwards' });
}

// Delta chip floats up and fades (600ms).
export function floatDelta(anchor, text, tone = '') {
  if (reduced() || !anchor.parentElement) return;
  const s = h('span', { class: 'float-delta ' + tone, 'aria-hidden': 'true' }, text);
  anchor.parentElement.append(s);
  s.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-20px)', opacity: 0 }], { duration: 600, easing: EASE, fill: 'forwards' }).onfinish = () => s.remove();
}

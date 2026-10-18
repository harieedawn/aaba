// Trình chiếu: animation registry. play()/count()/later() record what is running so skip() can complete it all at once.
// Advance rule (index.js): skip() first; if it returned true the press ONLY completes the animation, next press advances.
import { reduced, countUp } from '../../ui/anim.js';
import { fmtNum } from '../../format.js';

export const EASE = 'cubic-bezier(.2,.8,.2,1)';
const anims = new Set(), fins = new Set(), tms = new Set();
const live = a => a.playState === 'running' || a.playState === 'pending';

export function play(el, keyframes, opts = {}) {
  if (!el || reduced()) return null;
  const a = el.animate(keyframes, { duration: 420, easing: EASE, fill: 'backwards', ...opts });
  const done = () => anims.delete(a);
  anims.add(a); a.addEventListener('finish', done); a.addEventListener('cancel', done);
  return a;
}

// Delayed callback that skip() fires immediately. Reduced motion / no delay: runs now.
export function later(fn, ms) {
  if (reduced() || !(ms > 0)) { fn(); return null; }
  const t = { fn }; t.id = setTimeout(() => { tms.delete(t); fn(); }, ms); tms.add(t);
  return t;
}

// Count-up with a finish handle in the registry. fmt formats the number (default fmtNum).
export function count(el, to, from = to, dur = 700, delay = 0, fmt = fmtNum) {
  if (el._h) { fins.delete(el._h); el._h = null; }
  if (reduced() || from === to) { countUp(el, to, to, 0, null, fmt); return; }
  const go = () => {
    const hd = countUp(el, to, from, dur, () => { fins.delete(hd); if (el._h === hd) el._h = null; }, fmt);
    if (hd) { el._h = hd; fins.add(hd); }
  };
  later(go, delay);
}

// Complete everything that is running. Returns true if something was (so the caller must not advance).
export function skip() {
  const any = tms.size > 0 || fins.size > 0 || [...anims].some(live);
  for (let n = 0; n < 5 && tms.size; n++) [...tms].forEach(t => { clearTimeout(t.id); tms.delete(t); t.fn(); });
  [...anims].forEach(a => { try { a.finish(); } catch { a.cancel(); } });
  anims.clear();
  [...fins].forEach(f => f()); fins.clear();
  return any;
}

// Going back / leaving: drop animations and timers (count-ups jump to their final text).
export function cancelAll() {
  tms.forEach(t => clearTimeout(t.id)); tms.clear();
  [...anims].forEach(a => a.cancel()); anims.clear();
  [...fins].forEach(f => f()); fins.clear();
}

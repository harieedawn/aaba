// Trình chiếu: per-slide enter choreography (stagger 60-90ms, total <= 1.4s). Reduced motion: nothing runs, final state is already in the DOM.
import { reduced } from '../../ui/anim.js';
import { fmtNum } from '../../format.js';
import { play, count } from './motion.js';
import { plus, minus } from './slides.js';

const F = { p: plus, m: minus, c: n => `${n} lần` };
const stacked = () => matchMedia('(max-width:899px),(orientation:portrait)').matches;
const rise = (el, delay, dy = 24, dur = 520) => play(el, [{ opacity: 0, transform: `translateY(${dy}px)` }, { opacity: 1, transform: 'none' }], { duration: dur, delay });
const fade = (el, delay, dur = 420) => play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: dur, delay });
const nums = (el, base) => el && el.querySelectorAll('[data-v]').forEach((n, i) => { const f = F[n.dataset.f] || fmtNum; n.textContent = f(0); count(n, +n.dataset.v, 0, 700, base + i * 70, f); });

export function enter(s, el) {
  if (reduced()) return;
  const q = c => el.querySelector(c), all = c => [...el.querySelectorAll(c)];
  if (s.type === 'title') {
    play(q('.ch-rule'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], { duration: 600 });
    fade(q('.ch-tag'), 0); rise(q('.ch-h1'), 90, 28, 560); fade(q('.ch-week'), 210); rise(q('.ch-who'), 330, 12, 420); fade(q('.ch-hint'), 460);
  } else if (s.type === 'group') {
    play(q('.ch-side'), [{ transform: stacked() ? 'translateY(-100%)' : 'translateX(-100%)' }, { transform: 'none' }], { duration: 520 });
    all('.ch-w').forEach((w, i) => rise(w, 160 + i * 80, 40, 520));
    fade(q('.ch-counts'), 260); nums(q('.ch-net'), 300); fade(q('.ch-empty'), 300); fade(q('.ch-pend'), 700);
    const L = all('.ch-lines li');
    L.forEach((li, i) => {
      const d = 420 + Math.min(i, 5) * 65;
      play(li, [{ opacity: 0, transform: 'translateX(48px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: d });
      play(li.querySelector('.ch-amt'), [{ transform: 'scale(1.08)' }, { transform: 'none' }], { duration: 340, delay: d + 300 });
    });
    const st = q('.ch-star'), sd = 420 + L.length * 65 + 120;
    if (st) { play(st, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: sd }); nums(st, sd); }
  } else if (s.type === 'top') {
    rise(q('.ch-h2'), 0, 16, 420);
    all('.ch-col').forEach((c, ci) => {
      rise(c, 120 + ci * 90, 28, 520);
      c.querySelectorAll('li').forEach((li, i) => rise(li, 330 + ci * 90 + i * 70, 18, 400));
      nums(c, 400 + ci * 90);
    });
  } else fade(q('.pd-head'), 0, 300);
}

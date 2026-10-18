// Trình chiếu: finale as a podium. Columns left→right = 4th…1st (heights by rank level, ties share one), revealed from last place up;
// then a suspense beat and the hero step. Stacked/portrait: same DOM becomes a ranked list (best on top, revealed bottom-up).
import { h } from '../../ui/dom.js';
import { fmtNum } from '../../format.js';
import { icon } from '../../ui/icons.js';
import { reduced } from '../../ui/anim.js';
import { play, count, later } from './motion.js';
import { tileTxt } from './slides.js';
import { tilt } from './hover.js';

const stacked = () => matchMedia('(max-width:899px),(orientation:portrait)').matches;

export function renderFinale(s) {
  const total = s.steps.length, line = s.steps[total - 1].line, dense = s.cols.length > 5, win = new Set(s.first.map(r => r.group.id));
  const stepOf = new Map(s.steps.slice(0, -1).map((st, j) => [st.rows[0].group.id, j]));
  const cats = r => h('div', { class: 'pd-cats' }, r.cats.map(c => h('div', { class: 'pd-cat' }, h('span', null, c.name), h('b', null, fmtNum(c.value)))));
  const cols = s.cols.map(r => {
    const tot = h('b', { class: 'pd-tot' }, '0'), bar = h('i', { class: 'pd-bar' });
    const inn = h('div', { class: 'pd-in' }, h('span', { class: 'pd-rk' }, `Hạng ${r.rank}`), h('span', { class: 'ch-tile pd-tile' }, tileTxt(r.group.name)), h('b', { class: 'pd-name' }, r.group.name), tot, cats(r));
    return { r, tot, bar, inn, win: win.has(r.group.id), j: stepOf.get(r.group.id), el: h('div', { class: `pd-col ch-off g-${r.group.color}`, style: { '--h': r.h } }, bar, inn) };
  });
  const cards = s.first.map(r => {
    const rings = [0, 1, 2].map(() => h('i', { class: 'pd-ring' })), tot = h('b', { class: 'pd-htot' }, fmtNum(r.total));
    const name = h('span', { class: 'pd-hname' }, r.group.name), ul = h('i', { class: 'pd-ul' }), crown = h('span', { class: 'pd-crown' }, icon('crown', 24));
    const card = h('div', { class: `pd-hcard g-${r.group.color}` }, crown, h('div', { class: 'pd-tilew' }, ...rings, h('span', { class: 'ch-tile pd-htile' }, tileTxt(r.group.name))),
      name, ul, tot, h('span', { class: 'pd-hcats' }, r.cats.map(c => `${c.name} ${fmtNum(c.value)}`).join(' · ')));
    return { r, tot, rings, name, ul, crown, el: h('div', { class: 'pd-hw' }, card) };
  });
  const heroEl = h('div', { class: 'pd-hero ch-off' + (cards.length > 1 ? ' many' : ''), style: { '--hc': Math.min(cards.length, 4), '--hcs': cards.length > 2 ? 2 : 1 } },
    h('div', { class: 'pd-hcards' }, cards.map(c => c.el)), h('p', { class: 'pd-hline' }, line));
  const sus = h('div', { class: 'pd-sus ch-off', 'aria-live': 'polite' }, 'Tổ nào đứng nhất?'), dim = h('div', { class: 'pd-dim' });
  const hint = h('span', { class: 'pd-hint' }, 'Nhấn → để công bố');
  const el = h('section', { class: 'ch-s pd' + (dense ? ' dense' : '') },
    h('div', { class: 'pd-head' }, h('h2', { class: 'pd-title' }, 'Bảng xếp hạng'), h('span', { class: 'grow' }),
      dense && h('span', { class: 'pd-leg' }, s.cols[0].cats.map(c => c.name).join(' · ')), hint),
    h('div', { class: 'pd-area' }, cols.map(o => o.el), sus), dim, heroEl);
  tilt(el);

  const showCol = (o, anim, delay = 0, dur = 600) => {
    o.el.classList.remove('ch-off');
    if (!anim) return count(o.tot, o.r.total, o.r.total);
    o.tot.textContent = '0';
    play(o.bar, [{ transform: stacked() ? 'scaleX(0)' : 'scaleY(0)' }, { transform: 'none' }], { duration: dur, delay });
    play(o.inn, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: delay + dur * .55 });
    count(o.tot, o.r.total, 0, 700, delay + dur * .4);
  };
  const hideCol = o => { o.el.classList.add('ch-off'); count(o.tot, 0, 0); };

  function setHero(on, anim) {
    const was = !heroEl.classList.contains('ch-off');
    el.classList.toggle('is-hero', on); heroEl.classList.toggle('ch-off', !on);
    if (!on || was || !anim) return;
    play(dim, [{ opacity: 0 }, { opacity: .86 }], { duration: 600, delay: 250 });
    cards.forEach((c, i) => {
      const d = i * 90;
      c.tot.textContent = '0'; count(c.tot, c.r.total, 0, 800, d + 400);
      play(c.el, [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: d + 300 });
      play(c.name, [{ opacity: 0, transform: 'scale(.55)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: d + 400 });
      play(c.crown, [{ opacity: 0, transform: 'translateY(-40px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: d + 550 });
      c.rings.forEach((r, j) => play(r, [{ opacity: 0, transform: 'scale(1)' }, { opacity: .85, transform: 'scale(1.4)', offset: .15 }, { opacity: 0, transform: 'scale(3.4)' }], { duration: 760, delay: d + 450 + j * 90 }));
      play(c.ul, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { duration: 450, delay: d + 800 });
    });
    play(heroEl.querySelector('.pd-hline'), [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 1000 });
  }
  const reveal = anim => { cols.filter(o => o.win).forEach(o => showCol(o, anim, 0, 650)); setHero(true, anim); };

  let cur = 0, susA = null;
  function set(k) {
    const old = cur, fwd = k > old; cur = k;
    const heroOn = k === total, beat = heroOn && fwd && !reduced();
    sus.classList.add('ch-off'); if (susA) { susA.cancel(); susA = null; }
    cols.filter(o => !o.win).forEach(o => {
      const on = o.j < k, was = !o.el.classList.contains('ch-off');
      if (on && !was) showCol(o, fwd && !reduced()); else if (!on && was) hideCol(o);
    });
    if (!heroOn) { cols.filter(o => o.win && !o.el.classList.contains('ch-off')).forEach(hideCol); setHero(false); }
    else if (!beat) reveal(false);
    else {
      sus.classList.remove('ch-off');
      susA = play(sus, [{ opacity: .3 }, { opacity: 1 }], { duration: 450, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', fill: 'none' });
      later(() => { if (susA) { susA.cancel(); susA = null; } sus.classList.add('ch-off'); reveal(true); }, 900);
    }
    hint.style.display = k === 0 ? '' : 'none';
  }
  set(0);
  return { el, set, total };
}

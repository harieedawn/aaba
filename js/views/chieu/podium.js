// Trình chiếu: finale as a podium. Columns left→right = 4th…1st (heights by rank level, ties share one), revealed from last place up;
// then the hero step and finally the full ranking board (board.js). Stacked/portrait: same DOM becomes a ranked list (best on top, revealed bottom-up).
import { h } from '../../ui/dom.js';
import { fmtNum } from '../../format.js';
import { icon } from '../../ui/icons.js';
import { reduced } from '../../ui/anim.js';
import { play, count, later } from './motion.js';
import { tileTxt } from './slides.js';
import { tilt } from './hover.js';
import { renderBoard } from './board.js';

const stacked = () => matchMedia('(max-width:899px),(orientation:portrait)').matches;

export function renderFinale(s) {
  const total = s.steps.length, hero = s.steps[total - 2], hk = total - 1, dense = s.cols.length > 5, win = new Set(s.first.map(r => r.group.id));
  const stepOf = new Map(s.steps.slice(0, -2).map((st, j) => [st.rows[0].group.id, j]));
  const cols = s.cols.map(r => {
    const tot = h('b', { class: 'pd-tot' }, '0'), bar = h('i', { class: 'pd-bar' });
    const inn = h('div', { class: 'pd-in' }, h('span', { class: 'pd-rk' }, `Hạng ${r.rank}`), h('span', { class: 'ch-tile pd-tile' }, tileTxt(r.group.name)), h('b', { class: 'pd-name' }, r.group.name), tot);
    return { r, tot, bar, inn, win: win.has(r.group.id), j: stepOf.get(r.group.id), el: h('div', { class: `pd-col ch-off g-${r.group.color}`, style: { '--h': r.h } }, bar, inn) };
  });
  const cards = s.first.map((r, i) => {
    const rings = [0, 1, 2].map(() => h('i', { class: 'pd-ring' })), tot = h('b', { class: 'pd-htot' }, fmtNum(r.total));
    const name = h('span', { class: 'pd-hname' }, r.group.name), ul = h('i', { class: 'pd-ul' }), crown = h('span', { class: 'pd-crown' }, icon('crown', 24)), line = h('p', { class: 'pd-hline' }, hero.lines[i]);
    const card = h('div', { class: `pd-hcard g-${r.group.color}` }, crown, h('div', { class: 'pd-tilew' }, ...rings, h('span', { class: 'ch-tile pd-htile' }, tileTxt(r.group.name))),
      name, ul, tot, line);
    return { r, tot, rings, name, ul, crown, line, el: h('div', { class: 'pd-hw' }, card) };
  });
  const heroEl = h('div', { class: 'pd-hero ch-off' + (cards.length > 1 ? ' many' : ''), style: { '--hc': Math.min(cards.length, 4), '--hcs': cards.length > 2 ? 2 : 1 } },
    h('div', { class: 'pd-hcards' }, cards.map(c => c.el)));
  const dim = h('div', { class: 'pd-dim' }), bd = renderBoard(s);
  const hint = h('span', { class: 'pd-hint' }, 'Nhấn → để công bố');
  const el = h('section', { class: 'ch-s pd' + (dense ? ' dense' : '') },
    h('div', { class: 'pd-head' }, h('h2', { class: 'pd-title' }, 'Bảng xếp hạng'), h('span', { class: 'grow' }),
      hint),
    h('div', { class: 'pd-area' }, cols.map(o => o.el)), dim, heroEl, bd.el);
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

  let hOut = null;
  function setHero(on, anim) {
    if (hOut) { hOut.cancel(); hOut = null; }
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
      play(c.line, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: d + 1000 });
    });
  }
  let cur = 0;
  function set(k) {
    const old = cur, anim = k > old && !reduced(); cur = k;
    cols.filter(o => !o.win).forEach(o => { const on = o.j < k, was = !o.el.classList.contains('ch-off'); if (on && !was) showCol(o, anim); else if (!on && was) hideCol(o); });
    cols.filter(o => o.win).forEach(o => { const on = k >= hk, was = !o.el.classList.contains('ch-off'); if (on && !was) showCol(o, anim, 0, 650); else if (!on && was) hideCol(o); });
    if (k === total) { // board: hero card out (300ms), board crossfades in over the podium and stays
      if (anim && old === hk) {
        hOut = play(heroEl, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.96)' }], { duration: 300, fill: 'forwards' });
        later(() => heroEl.classList.add('ch-off'), 300); later(() => el.classList.remove('is-hero'), 520); bd.show(true, true, 150);
      } else { setHero(false); bd.show(true, false); }
    } else { bd.show(false); setHero(k === hk, anim); }
    hint.style.display = k === 0 ? '' : 'none';
  }
  set(0);
  return { el, set, total };
}

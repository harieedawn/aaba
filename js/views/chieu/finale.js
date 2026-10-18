// Trình chiếu: finale "Bảng xếp hạng". Reveal from last place to 1st; the last step is the hero card(s).
import { h } from '../../ui/dom.js';
import { fmtNum } from '../../format.js';
import { countUp, reduced } from '../../ui/anim.js';
import { tileTxt } from './slides.js';

const EASE = 'cubic-bezier(.2,.8,.2,1)';
const subs = (r, full) => r.cats.map(c => (full ? `${c.name} ${fmtNum(c.value)}` : fmtNum(c.value))).join(' · ');
const slide = (el, delay, from) => { if (!reduced()) el.animate([{ transform: from, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay, easing: EASE, fill: 'backwards' }); };

export function renderFinale(s) {
  const dense = s.rows.length > 4, full = !dense && !s.tie, total = s.steps.length, lastStep = s.steps[total - 1];
  const rows = s.rows.map(r => {
    const t = h('b', { class: 'ch-rt' }, '0');
    return { r, t, el: h('div', { class: `ch-row ch-off g-${r.group.color}` }, h('span', { class: 'ch-rk' }, r.rank), h('span', { class: 'ch-tile' }, tileTxt(r.group.name)),
      h('div', { class: 'ch-rb' }, h('b', { class: 'ch-rn2' }, r.group.name), h('span', { class: 'ch-rc' }, subs(r, !dense))), t) };
  });
  const cards = s.first.map(r => {
    const t = h('b', { class: 'ch-htotal' }, '0');
    return { r, t, el: h('div', { class: `ch-hcard g-${r.group.color}` }, h('div', { class: 'ch-hl' }, h('span', { class: 'ch-hname' }, r.group.name), h('span', { class: 'ch-hsub' }, subs(r, full))), t) };
  });
  const line = h('p', { class: 'ch-hline' }, lastStep.line), ul = h('i', { class: 'ch-ul' });
  const hold = h('div', { class: 'ch-hold' }, 'Hạng nhất sẽ được công bố cuối cùng');
  const cardsEl = h('div', { class: 'ch-hcards ch-off' }, cards.map(c => c.el)), foot = h('div', { class: 'ch-hfoot ch-off' }, line, ul);
  const hint = h('span', { class: 'ch-fhint' }, 'Nhấn → để công bố');
  const legend = full ? null : h('span', { class: 'ch-leg' }, (s.first[0] || s.rows[0]).cats.map(c => c.name).join(' · '));
  const el = h('section', { class: 'ch-s ch-fin', style: { '--rn': dense ? Math.ceil(rows.length / 2) : Math.max(rows.length, 1) } },
    h('div', { class: 'ch-fhead' }, h('h2', { class: 'ch-fh' }, 'Bảng xếp hạng'), h('span', { class: 'grow' }), legend, hint),
    h('div', { class: 'ch-hero' }, hold, cardsEl, foot), h('div', { class: 'ch-rows' }, rows.map(o => o.el)));

  let cur = 0;
  function set(k) {
    const old = cur, fwd = k > old; cur = k;
    let n = 0;
    rows.forEach(o => {
      const j = rows.length - 1 - rows.indexOf(o), on = j < k, was = j < old;
      o.el.classList.toggle('ch-off', !on);
      if (on && !was && fwd) { slide(o.el, n++ * 250, 'translateX(-4%)'); countUp(o.t, o.r.total, 0, 700); }
      else { const v = on ? o.r.total : 0; countUp(o.t, v, v); }
    });
    const heroOn = k === total;
    hold.style.display = heroOn ? 'none' : '';
    cardsEl.classList.toggle('ch-off', !heroOn); foot.classList.toggle('ch-off', !heroOn);
    hint.style.display = k === 0 ? '' : 'none';
    if (heroOn && old !== total && fwd) {
      cards.forEach(c => { slide(c.el, 0, 'translateY(6%)'); countUp(c.t, c.r.total, 0, 900); });
      slide(line, 500, 'translateY(40%)');
      if (!reduced()) ul.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 600, delay: 800, easing: EASE, fill: 'backwards' });
    } else cards.forEach(c => { const v = heroOn ? c.r.total : 0; countUp(c.t, v, v); });
  }
  set(0);
  return { el, set, total };
}

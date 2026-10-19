// Trình chiếu: finale BOARD = full ranking (rank, tile, name, "+A · −B", total). Shown on the last finale step, stays to the end.
import { h } from '../../ui/dom.js';
import { fmtNum, MINUS } from '../../format.js';
import { icon } from '../../ui/icons.js';
import { play } from './motion.js';
import { tileTxt } from './slides.js';

export function renderBoard(s) {
  const rows = s.board.map(r => h('div', { class: `bd-row g-${r.group.color}` + (r.rank === 1 ? ' win' : '') },
    h('span', { class: 'bd-rk' }, String(r.rank)), h('span', { class: 'ch-tile bd-tile' }, tileTxt(r.group.name)),
    h('span', { class: 'bd-nm' }, h('b', null, r.group.name), r.rank === 1 && h('span', { class: 'bd-crown', title: 'Hạng nhất' }, icon('crown', 16))),
    h('span', { class: 'bd-cats', 'aria-label': 'Cộng và trừ' }, h('span', null, '+' + fmtNum(r.plus)), h('span', { class: 'bd-sep', 'aria-hidden': 'true' }, '·'), h('span', null, MINUS + fmtNum(r.minus))),
    h('b', { class: 'bd-tot' }, fmtNum(r.total))));
  const el = h('div', { class: 'bd ch-off', role: 'region', 'aria-label': 'Bảng xếp hạng' },
    h('h2', { class: 'bd-title' }, 'Bảng xếp hạng' + (s.isCurrent ? ' · tạm tính' : '')), h('div', { class: 'bd-rows' }, rows));
  // Crossfade in over the podium, rows stagger (transform/opacity). anim=false (reduced motion / going back): final state at once.
  function show(on, anim, delay = 0) {
    el.classList.toggle('ch-off', !on);
    if (!on || !anim) return;
    play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 350, delay });
    rows.forEach((r, i) => play(r, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: delay + 150 + Math.min(i, 9) * 60 }));
  }
  return { el, show };
}

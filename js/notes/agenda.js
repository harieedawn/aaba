// Notes upcoming agenda. createAgenda({getNotes(fromKey,toKey)->note[], onOpen(note), onDay?(key)}) -> {el, update(), destroy()}
// getNotes returns class + own personal notes (personal = note.owner). Phones: collapsible section; wide screens: always open (CSS).
import { h, put } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { todayKey, addDays, diffDays, fmtDay, relText } from './dates.js';
import { noonOf, dowOf } from '../weeks.js';
import { subjectOf, noteStyle } from './subjects.js';

const RANGES = [['7', '7 ngày tới'], ['tuan', 'Tuần này'], ['sau', 'Tuần sau'], ['thang', 'Cả tháng']];
const EMPTY = { 7: 'Không có note nào trong 7 ngày tới', tuan: 'Tuần này không còn note nào', sau: 'Tuần sau chưa có note nào', thang: 'Tháng này không còn note nào' };
const byAt = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || (!!a.owner - !!b.owner) || ((a.at || 0) - (b.at || 0));
export const rangeOf = (r, t) => {
  const m = (dowOf(noonOf(t)) + 6) % 7, ws = addDays(t, -m);
  if (r === 'tuan') return [t, addDays(ws, 6)];
  if (r === 'sau') return [addDays(ws, 7), addDays(ws, 13)];
  if (r === 'thang') { const d = new Date(noonOf(t)), y = d.getUTCFullYear(), mo = d.getUTCMonth() + 2; const nx = mo > 12 ? `${y + 1}-01-01` : `${y}-${String(mo).padStart(2, '0')}-01`; return [t, addDays(nx, -1)]; }
  return [t, addDays(t, 6)];
};
export const barColor = n => { const st = noteStyle(n, 'class'); return st.cls === 'nbs-custom' ? st.style['--n-bg'] : `var(--sub-${subjectOf(n.subject).id})`; };
const head = (k, t) => { const d = diffDays(t, k); return d <= 1 && d >= 0 ? relText(d) : `${relText(d)} · ${fmtDay(k)}`; };
let uid = 0;

export function createAgenda({ getNotes, onOpen, onDay }) {
  const id = 'nbag' + ++uid;
  let range = '7', userOpen = null, open = false;
  const count = h('span', { class: 'nb-ag-n' });
  const tgl = h('button', { class: 'nb-ag-t pressable', type: 'button', 'aria-controls': id, onclick: () => { userOpen = !open; update(); } }, h('b', null, 'Sắp tới'), count, icon('chevron', 18, 'nb-cal-chev'));
  const nextEl = h('div'), chips = h('div', { class: 'nb-ag-chips', role: 'group', 'aria-label': 'Khoảng thời gian' }), list = h('div', { class: 'nb-ag-list', 'aria-live': 'polite' });
  const body = h('div', { class: 'nb-ag-body', id }, h('div', null, nextEl, chips, list));
  const el = h('section', { class: 'nb-ag', 'aria-label': 'Note sắp tới', 'data-open': 'false' }, tgl, body);
  const row = n => h('button', { class: `nb-ag-row pressable${n.owner ? ' is-mine' : ''}`, type: 'button', style: { '--c': barColor(n) }, onclick: () => onOpen(n) },
    h('span', { class: 'nb-ag-sub' }, subjectOf(n.subject).name, n.owner && h('span', { class: 'nb-priv' }, 'riêng tư')),
    h('span', { class: 'nb-ag-ttl' }, n.title), n.body && h('span', { class: 'nb-ag-body2' }, n.body));
  function update() {
    const t = todayKey(), soon = getNotes(t, addDays(t, 1));
    open = userOpen ?? soon.length > 0;
    el.dataset.open = String(open); tgl.setAttribute('aria-expanded', String(open));
    const [a, b] = rangeOf(range, t), ns = getNotes(a, b).slice().sort(byAt);
    const near = getNotes(t, addDays(t, 90)).filter(n => !n.owner).sort(byAt)[0];
    put(count, ns.length ? `${ns.length} note` : '');
    put(nextEl, near && h('button', { class: 'nb-next pressable', type: 'button', style: { '--c': barColor(near) }, onclick: () => onOpen(near) },
      h('span', { class: 'nb-next-k' }, 'Tiếp theo'),
      h('span', { class: 'nb-next-w' }, `${relText(diffDays(t, near.date))} · ${fmtDay(near.date)} · ${subjectOf(near.subject).name}`),
      h('span', { class: 'nb-next-t' }, near.title), near.body && h('span', { class: 'nb-next-b' }, near.body)));
    put(chips, RANGES.map(([k, l]) => h('button', { class: 'fchip', type: 'button', 'aria-pressed': String(k === range), onclick: () => { range = k; update(); } }, l)));
    const days = [...new Set(ns.map(n => n.date))];
    put(list, days.length ? days.map(k => h('div', { class: 'nb-ag-day' },
      h('button', { class: 'nb-ag-h pressable', type: 'button', 'aria-label': `Xem ${fmtDay(k)} trên bảng`, onclick: () => onDay?.(k) }, head(k, t)),
      ns.filter(n => n.date === k).map(row))) : h('p', { class: 'nb-ag-empty muted' }, EMPTY[range]));
  }
  update();
  return { el, update, destroy() {} };
}

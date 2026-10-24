// Notes board: framed whiteboard with a fixed slot grid. createBoard({onOpen}) -> {el, update({dateKey, classNotes, mine}), destroy()}.
import { h, put } from '../ui/dom.js';
import { layoutSlots } from './layout.js';
import { subjectOf, noteStyle } from './subjects.js';

const hash = s => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return x >>> 0; };
export const tiltOf = id => (hash(String(id)) % 301) / 100 - 1.5; // deterministic, -1.5 .. +1.5 deg
const colsFor = w => (w < 500 ? 2 : w < 800 ? 3 : 4);

// One note (also used by the composer preview without onOpen). kind: 'class' | 'mine'
export function noteCard(note, kind, { onOpen } = {}) {
  const s = subjectOf(note.subject), st = noteStyle(note, kind), tape = (hash(String(note.id)) >>> 9) & 1;
  return h(onOpen ? 'button' : 'div', {
    class: `nb-note ${st.cls} ${tape ? 'nb-tape' : ''}`, type: onOpen ? 'button' : null,
    style: { ...st.style, '--tilt': tiltOf(note.id).toFixed(2) + 'deg' },
    'aria-label': onOpen ? `${s.name}: ${note.title}` : null, onclick: onOpen ? () => onOpen(note) : null,
  },
    h('span', { class: 'nb-pin', 'aria-hidden': 'true' }),
    h('span', { class: 'nb-sub' }, s.name, kind === 'mine' && h('span', { class: 'nb-priv' }, 'riêng tư')),
    h('span', { class: 'nb-ttl' }, note.title || ''),
    note.body && h('span', { class: 'nb-body' }, note.body));
}

export function createBoard({ onOpen } = {}) {
  let st = { dateKey: null, classNotes: [], mine: [] }, cols = 2;
  const grid = h('div', { class: 'nb-grid' });
  const el = h('section', { class: 'nb-board', 'aria-label': 'Bảng note' }, h('div', { class: 'nb-surface' }, grid));
  function paint() {
    const d = st.dateKey, slots = layoutSlots({ classNotes: st.classNotes.filter(n => n.date === d), mine: st.mine.filter(n => n.date === d), cols, minSlots: 6 });
    grid.style.setProperty('--cols', cols);
    put(grid, slots.map(s => h('div', { class: 'nb-cell' }, s.note ? noteCard(s.note, s.kind, { onOpen }) : h('span', { class: 'nb-spot', 'aria-hidden': 'true' }))));
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(es => {
    const w = es[0].contentRect.width, c = w ? colsFor(w) : cols;
    if (c !== cols) { cols = c; paint(); }
  }) : null;
  ro?.observe(el);
  paint();
  return { el, update(next) { st = { ...st, ...next }; paint(); }, destroy() { ro?.disconnect(); } };
}

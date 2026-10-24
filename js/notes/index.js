// #/notes: class whiteboard for the selected day (stage 1 header; stage 2 swaps it for the calendar).
import { h, put } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { emptyState, skeletonCards } from '../ui/components.js';
import { openSheet } from '../ui/sheet.js';
import { can } from '../session.js';
import { toast } from '../ui/toast.js';
import { errMsg } from '../ui/act.js';
import { createBoard } from './board.js';
import { openNoteSheet, openNoteDetail } from './sheet.js';
import { todayKey, addDays, fmtDay, diffDays, relText } from './dates.js';
import { watchClass, watchMine, loadClassRange, inLive } from './data.js';

export default function notes() {
  const canClass = can('postNote'), canMine = can('myNote');
  let key = todayKey(), cls = [], mine = [], ready = false, rc = false, rm = !canMine;
  const board = createBoard({ onOpen: openNoteDetail });
  const label = h('div', { class: 'nb-date', 'aria-live': 'polite' });
  const todayBtn = h('button', { class: 'btn btn-ghost nb-today', type: 'button', onclick: () => go(todayKey()) }, 'Hôm nay');
  const nav = h('div', { class: 'nb-nav' },
    h('button', { class: 'icon-btn pressable', type: 'button', 'aria-label': 'Ngày trước', onclick: () => go(addDays(key, -1)) }, icon('chevron-left', 24)),
    label,
    h('button', { class: 'icon-btn pressable', type: 'button', 'aria-label': 'Ngày sau', onclick: () => go(addDays(key, 1)) }, icon('chevron', 24)));
  const addBtn = (text, mode, cls2) => h('button', { class: `btn ${cls2}`, type: 'button', onclick: () => openNoteSheet({ mode, dateKey: key }) }, icon('plus', 20), text);
  const actions = h('div', { class: 'nb-actions' }, canClass && addBtn('Thêm note lớp', 'class', 'btn-accent'), canMine && addBtn('Note của tôi', 'mine', 'btn-ghost'));
  function openAdd() {
    if (canClass && !canMine) return openNoteSheet({ mode: 'class', dateKey: key });
    if (!canClass && canMine) return openNoteSheet({ mode: 'mine', dateKey: key });
    const pick = mode => { sh.close(); openNoteSheet({ mode, dateKey: key }); };
    const sh = openSheet({ title: 'Thêm note', content: h('div', { class: 'stack' },
      h('button', { class: 'btn btn-accent', type: 'button', onclick: () => pick('class') }, 'Thêm note lớp'),
      h('p', { class: 'muted nb-hint' }, 'Cả lớp cùng thấy.'),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => pick('mine') }, 'Note của tôi'),
      h('p', { class: 'muted nb-hint' }, 'Riêng tư, chỉ mình bạn thấy.')) });
  }
  const fab = (canClass || canMine) && h('button', { class: 'nb-fab pressable', type: 'button', 'aria-label': 'Thêm note', onclick: openAdd }, icon('plus', 28));
  if (fab) document.body.append(fab);
  const empty = h('div', { class: 'nb-empty' }), slot = h('div', null, h('div', { class: 'nb-skel', 'aria-hidden': 'true' }, skeletonCards(4)));
  const timer = setTimeout(() => { rc = rm = true; paint(); }, 8000); // never leave the skeleton up forever
  function paint() {
    const d = diffDays(todayKey(), key);
    put(label, h('b', null, fmtDay(key)), h('span', null, relText(d)));
    todayBtn.disabled = key === todayKey();
    if (!(rc && rm)) return;
    if (!ready) { ready = true; put(slot, empty, board.el); }
    board.update({ dateKey: key, classNotes: cls, mine });
    const none = !cls.some(n => n.date === key) && !mine.some(n => n.date === key);
    empty.hidden = !none;
    put(empty, none && emptyState({ icon: 'note', title: d === 0 ? 'Hôm nay chưa có note nào' : `Chưa có note cho ${fmtDay(key)}`,
      text: canClass || canMine ? 'Ghi lại bài kiểm tra, hạn nộp bài hay việc cả lớp cần chú ý.' : 'Khi có note mới, bạn sẽ thấy ở đây.',
      action: canClass || canMine ? { label: 'Thêm note', onClick: openAdd } : null }));
  }
  const loaded = new Set();
  function go(k) {
    key = k; paint();
    if (!inLive(k) && !loaded.has(k)) { loaded.add(k); loadClassRange(k, k).catch(e => { loaded.delete(k); toast(errMsg(e)); }); }
  }
  const offC = watchClass(l => { cls = l; rc = true; paint(); });
  const offM = watchMine(l => { mine = l; rm = true; paint(); });
  const el = h('div', { class: 'view nb-view' },
    h('header', { class: 'hdr' }, h('h1', { class: 'hdr-main' }, 'Notes'), todayBtn, actions), nav, slot);
  paint();
  return { el, destroy() { clearTimeout(timer); offC(); offM(); board.destroy(); fab && fab.remove(); } };
}

// #/notes: calendar + banner + upcoming agenda + whiteboard (drag & drop of personal notes) for the selected day.
import { h, put } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { emptyState, skeletonCards } from '../ui/components.js';
import { openSheet } from '../ui/sheet.js';
import { can } from '../session.js';
import { toast } from '../ui/toast.js';
import { errMsg } from '../ui/act.js';
import { createBoard } from './board.js';
import { createCalendar } from './calendar.js';
import { createAgenda, barColor } from './agenda.js';
import { resetMine } from './layout.js';
import { openNoteSheet, openNoteDetail } from './sheet.js';
import { todayKey, addDays, fmtDay, diffDays, relText } from './dates.js';
import { watchClass, watchMine, loadClassRange, inLive, saveMine } from './data.js';

export default function notes() {
  const canClass = can('postNote'), canMine = can('myNote');
  let key = todayKey(), cls = [], mine = [], rc = false, rm = !canMine, ready = false, cal = null, ag = null, curRange = null, marks = new Map();
  const ovr = new Map(); // optimistic personal-note slots: id -> slot (until the listener confirms, a failure or 4s)
  const eff = () => (ovr.size ? mine.map(n => (ovr.has(n.id) ? { ...n, slot: ovr.get(n.id) } : n)) : mine);
  const board = createBoard({ onOpen: openNoteDetail, onMove: canMine ? moves => applyMoves(moves) : undefined });
  const lc = t => t.charAt(0).toLowerCase() + t.slice(1);

  // ---- header: title, banner pill, add actions ----
  const pill = h('button', { class: 'nb-pill pressable', type: 'button', onclick: backToday });
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

  // ---- day label + prev/next + reset ----
  const label = h('div', { class: 'nb-date', 'aria-live': 'polite', tabindex: '-1' });
  const resetBtn = canMine && h('button', { class: 'btn btn-ghost nb-reset', type: 'button', hidden: true, onclick: reset }, 'Sắp lại');
  const nav = h('div', { class: 'nb-nav' },
    h('button', { class: 'icon-btn pressable', type: 'button', 'aria-label': 'Ngày trước', onclick: () => go(addDays(key, -1)) }, icon('chevron-left', 20)),
    label,
    h('button', { class: 'icon-btn pressable', type: 'button', 'aria-label': 'Ngày sau', onclick: () => go(addDays(key, 1)) }, icon('chevron', 20)),
    resetBtn);

  // ---- data loading for months shown in the calendar (one-off, merged into the shared cache) ----
  const loaded = new Set(), failedAt = new Map();
  function ensure(a, b) {
    if (inLive(a) && inLive(b)) return;
    const k = a + '|' + b, f = failedAt.get(k);
    if (loaded.has(k) || (f && Date.now() - f < 15000)) return;
    loaded.add(k);
    loadClassRange(a, b).then(() => failedAt.delete(k)).catch(e => { loaded.delete(k); failedAt.set(k, Date.now()); toast(errMsg(e)); paint(); });
  }
  const loadFailed = () => [...failedAt.keys()].some(k => { const [a, b] = k.split('|'); return key >= a && key <= b && !loaded.has(k); });

  // ---- calendar marks ----
  function buildMarks() {
    marks = new Map();
    const add = (d, m) => { (marks.get(d) || marks.set(d, []).get(d)).push(m); };
    cls.forEach(n => add(n.date, { color: barColor(n), kind: 'class' }));
    eff().forEach(n => add(n.date, { color: '', kind: 'mine' }));
  }
  cal = null;
  const offC = watchClass(l => { cls = l; rc = true; paint(); });
  const offM = watchMine(l => { mine = l; rm = true; for (const [id, s] of ovr) { const n = l.find(x => x.id === id); if (!n || n.slot === s) ovr.delete(id); } paint(); });
  cal = createCalendar({ getSelected: () => key, getToday: todayKey, marksFor: k => marks.get(k) || [], onSelect: k => go(k), onRange: (a, b) => { curRange = [a, b]; ensure(a, b); } });
  ag = createAgenda({ getNotes: (a, b) => [...cls, ...eff()].filter(n => n.date >= a && n.date <= b), onOpen: openNoteDetail, onDay: k => { go(k); nav.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'start' }); } });

  const empty = h('div', { class: 'nb-empty' }), slot = h('div', null, h('div', { class: 'nb-skel', 'aria-hidden': 'true' }, skeletonCards(4)));
  const timer = setTimeout(() => { rc = rm = true; paint(); }, 8000); // never leave the skeleton up forever
  function paint() {
    if (!cal) return;
    const t = todayKey(), d = diffDays(t, key);
    put(label, h('b', null, fmtDay(key)), h('span', null, relText(d)));
    pill.disabled = d === 0; pill.dataset.state = d === 0 ? 'today' : d > 0 ? 'future' : 'past';
    pill.setAttribute('aria-label', d === 0 ? `Đang xem hôm nay, ${fmtDay(key)}` : `Đang xem note của ${fmtDay(key)}, ${lc(relText(d))}. Nhấn để về hôm nay`);
    put(pill, d !== 0 && icon('today', 18), h('span', { class: 'nb-pill-t' }, d === 0 ? `Hôm nay · ${fmtDay(key)}` : `Note của ${fmtDay(key)} · ${lc(relText(d))}`));
    buildMarks(); cal.update();
    if (!(rc && rm)) return;
    ag.el.hidden = false; ag.update();
    if (!ready) { ready = true; put(slot, empty, board.el); }
    board.update({ dateKey: key, classNotes: cls, mine: eff() });
    const dm = eff().filter(n => n.date === key), none = !cls.some(n => n.date === key) && !dm.length;
    if (resetBtn) resetBtn.hidden = !dm.length;
    empty.hidden = !none;
    const bad = none && loadFailed();
    put(empty, none && emptyState({ icon: 'note', title: bad ? 'Không tải được note của ngày này' : d === 0 ? 'Hôm nay chưa có note nào' : `Chưa có note cho ${fmtDay(key)}`,
      text: bad ? 'Kiểm tra mạng rồi thử lại.' : canClass || canMine ? 'Ghi lại bài kiểm tra, hạn nộp bài hay việc cả lớp cần chú ý.' : 'Khi có note mới, bạn sẽ thấy ở đây.',
      action: bad ? { label: 'Thử lại', onClick: () => { failedAt.clear(); curRange && ensure(...curRange); paint(); } } : canClass || canMine ? { label: 'Thêm note', onClick: openAdd } : null }));
  }
  function go(k) { key = k; paint(); }
  function backToday() {
    if (key === todayKey()) return;
    go(todayKey());
    board.el.classList.remove('nb-ret'); void board.el.offsetWidth; board.el.classList.add('nb-ret');
    label.focus({ preventScroll: true });
  }

  // ---- drag & drop / reset writes: optimistic, one saveMine per moved note ----
  function applyMoves(moves) {
    moves.forEach(m => ovr.set(m.note.id, m.slot)); paint();
    let err = null;
    return Promise.all(moves.map(m => saveMine({ ...m.note, slot: m.slot }).then(
      () => setTimeout(() => { if (ovr.get(m.note.id) === m.slot) { ovr.delete(m.note.id); paint(); } }, 4000),
      e => { ovr.delete(m.note.id); err = e; }))).then(() => { if (err) { toast(errMsg(err)); paint(); } });
  }
  function reset() {
    const dm = eff().filter(n => n.date === key), dc = cls.filter(n => n.date === key);
    const moves = resetMine({ classNotes: dc, mine: dm }).map(p => ({ note: dm.find(n => n.id === p.id), slot: p.slot })).filter(m => m.note.slot !== m.slot);
    if (!moves.length) return toast('Các note của bạn đã xếp gọn rồi');
    const old = moves.map(m => ({ note: m.note, slot: m.note.slot }));
    applyMoves(moves);
    toast('Đã sắp lại note của bạn', { action: { label: 'Hoàn tác', onClick: () => applyMoves(old) }, duration: 6000 });
  }

  ag.el.hidden = true;
  const el = h('div', { class: 'view nb-view' },
    h('header', { class: 'hdr nb-hdr' }, h('div', { class: 'nb-hl' }, h('h1', { class: 'hdr-main' }, 'Notes'), pill, actions), cal.el),
    h('div', { class: 'nb-layout' }, ag.el, h('div', { class: 'nb-main' }, nav, slot)));
  paint();
  return { el, destroy() { clearTimeout(timer); offC(); offM(); board.destroy(); cal.destroy(); ag.destroy(); fab && fab.remove(); } };
}

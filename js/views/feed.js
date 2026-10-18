// Nhật ký: day-grouped entries of a week (current = live, older via ‹ ›), filter chips (tổ, nhóm, trạng thái).
import { h, put } from '../ui/dom.js';
import * as store from '../data/store.js';
import { dayKey, dayLabel, fmtDate } from '../format.js';
import { weekStart, WEEK, label as wkLabel } from '../weeks.js';
import { can } from '../session.js';
import { icon } from '../ui/icons.js';
const lab = t => { const l = dayLabel(t); return l.startsWith('Hôm') ? l : fmtDate(t); };
import { emptyState, pageHeader, skeletonCards, entryRow, entrySheet } from '../ui/components.js';
import { stagger } from '../ui/anim.js';
import { purgeAllBtn } from './purge.js';
const canPurge = () => can('purge', { entry: { status: 'void' } });

const STATUS = [['', 'Tất cả'], ['ok', 'Đã xác nhận'], ['pending', 'Chờ xác nhận']];

export default function feed() {
  const M = {}, st = { g: '', cat: '', status: '', off: 0, showVoid: false };
  let entries = null, entSub = null, built = false, staggered = false, wkStart = weekStart(Date.now()), trunc = false, tok = 0;
  const controls = h('div', { class: 'filters' }), nav = h('div', { class: 'wknav' }), list = h('div', { class: 'feed' }, skeletonCards(3));
  const el = h('div', { class: 'view narrow' }, pageHeader('Nhật ký'), nav, controls, list);
  const ready = () => ['config', 'groups', 'students'].every(k => M[k] !== undefined);

  function chips(key, items) {
    return h('div', { class: 'fchips', role: 'group' }, items.map(([v, label]) => h('button', {
      class: 'fchip pressable', 'aria-pressed': String(st[key] === v), 'data-k': key, 'data-v': v,
      onclick: () => { st[key] = v; refresh(); paintList(); } }, label)));
  }
  const voidBtn = h('button', { class: 'fchip pressable', type: 'button', 'aria-pressed': 'false', onclick: () => { st.showVoid = !st.showVoid; paintList(); } });
  const refresh = () => controls.querySelectorAll('.fchip').forEach(b => b.setAttribute('aria-pressed', String(st[b.dataset.k] === b.dataset.v)));

  const shown = () => (st.off ? weekStart(Date.now()) - st.off * WEEK : wkStart);
  function paintNav() {
    const btn = (d, ic, lab, off) => h('button', { class: 'icon-btn pressable', type: 'button', 'aria-label': lab, disabled: off, onclick: () => { st.off = Math.max(0, st.off + d); subscribe(); } }, icon(ic, 20));
    put(nav, btn(1, 'chevron-left', 'Tuần trước', false), h('div', { class: 'wknav-t' }, h('b', null, wkLabel(shown())), h('span', { class: 'muted' }, st.off ? 'Tuần đã tổng kết' : 'Tuần này')),
      btn(-1, 'chevron', 'Tuần sau', st.off === 0));
  }
  function subscribe() {
    entSub?.(); entries = null; trunc = false; const t = ++tok;
    put(list, ...skeletonCards(3)); paintNav();
    if (!st.off) { entSub = store.onWeek(m => { wkStart = m.weekStart; entries = m.entries; paintNav(); paintList(); }); return; }
    entSub = null;
    store.weekEntries(shown()).then(r => { if (t !== tok) return; entries = r.entries; trunc = r.truncated; paintList(); })
      .catch(() => { if (t === tok) put(list, emptyState({ icon: 'x', title: 'Không tải được', text: 'Kiểm tra mạng rồi thử lại.', action: { label: 'Thử lại', onClick: subscribe } })); });
  }
  function build() {
    put(controls, chips('g', [['', 'Tất cả tổ'], ...M.groups.map(g => [g.id, g.name])]),
      chips('cat', [['', 'Tất cả nhóm'], ...M.config.categories.map(c => [c.id, c.name])]), chips('status', STATUS), voidBtn);
    built = true;
  }
  function paintList() {
    if (!ready() || entries === null) return;
    const readOnly = st.off > 0 && !can('backdate');
    const gm = new Map(M.groups.map(g => [g.id, g])), sm = new Map(M.students.map(s => [s.id, s]));
    const rows = entries.filter(e => (!st.g || e.groupId === st.g) && (!st.cat || e.cat === st.cat) && (!st.status || e.status === st.status) && (e.status !== 'void' || (st.showVoid && canPurge())))
      .sort((a, b) => b.at - a.at);
    const nv = entries.filter(e => e.status === 'void').length;
    voidBtn.textContent = `Hiện đã thu hồi (${nv})`; voidBtn.setAttribute('aria-pressed', String(st.showVoid)); voidBtn.hidden = !canPurge() || (!nv && !st.showVoid);
    const out = [];
    if (st.showVoid) { const b = purgeAllBtn(entries.filter(e => e.status === 'void')); if (b) out.push(b); }
    if (readOnly) out.push(h('div', { class: 'note' }, 'Tuần này đã tổng kết, chỉ xem.'));
    if (trunc) out.push(h('div', { class: 'note' }, 'Chỉ hiển thị 1000 điểm đầu tiên của tuần.'));
    if (!rows.length) out.push(emptyState({ icon: 'history', title: 'Không có điểm nào', text: entries.length ? 'Thử bỏ bớt bộ lọc.' : 'Tuần này chưa ghi điểm nào.' }));
    let key = null, box = null;
    for (const e of rows) {
      const k = dayKey(e.at);
      if (k !== key) { key = k; out.push(h('div', { class: 'day-h' }, h('span', null, lab(e.at)))); out.push((box = h('div', { class: 'card day-list' }))); }
      box.append(entryRow(e, { group: gm.get(e.groupId), student: sm.get(e.studentId), onOpen: x => entrySheet(x, { group: gm.get(x.groupId), student: sm.get(x.studentId), readOnly }) }));
    }
    put(list, ...out);
    if (!staggered && rows.length) { stagger(list.children); staggered = true; }
  }
  function sync() {
    if (!ready()) return;
    if (!built) { subscribe(); build(); }
    paintList();
  }
  const onInv = () => st.off && ready() && subscribe();
  addEventListener('aaba:inv', onInv);
  const subs = ['config', 'groups', 'students'].map(c => store.on(c, v => { M[c] = v; sync(); }));
  return { el, destroy: () => { subs.forEach(u => u()); entSub?.(); removeEventListener('aaba:inv', onInv); } };
}

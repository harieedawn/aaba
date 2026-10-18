// Nhật ký: day-grouped entries, filter chips (tổ, nhóm, trạng thái), cycle picker (past đợt read-only).
import { h } from '../ui/dom.js';
import * as store from '../data/store.js';
import { dayKey, dayLabel, fmtDate } from '../format.js';
const lab = t => { const l = dayLabel(t); return l.startsWith('Hôm') ? l : fmtDate(t); };
import { emptyState, pageHeader, skeletonCards, entryRow, entrySheet } from '../ui/components.js';
import { stagger } from '../ui/anim.js';

const STATUS = [['', 'Tất cả'], ['ok', 'Đã xác nhận'], ['pending', 'Chờ xác nhận'], ['void', 'Đã thu hồi']];

export default function feed() {
  const M = {}, st = { g: '', cat: '', status: '', cycle: null };
  let entries = null, entSub = null, built = false, staggered = false;
  const controls = h('div', { class: 'filters' }), list = h('div', { class: 'feed' }, skeletonCards(3));
  const el = h('div', { class: 'view narrow' }, pageHeader('Nhật ký'), controls, list);
  const ready = () => ['config', 'groups', 'students', 'cycles'].every(k => M[k] !== undefined);

  function chips(key, items) {
    return h('div', { class: 'fchips', role: 'group' }, items.map(([v, label]) => h('button', {
      class: 'fchip pressable', 'aria-pressed': String(st[key] === v), 'data-k': key, 'data-v': v,
      onclick: () => { st[key] = v; refresh(); paintList(); } }, label)));
  }
  const refresh = () => controls.querySelectorAll('.fchip').forEach(b => b.setAttribute('aria-pressed', String(st[b.dataset.k] === b.dataset.v)));

  function subscribe() {
    entSub?.(); entries = null;
    list.replaceChildren(...skeletonCards(3));
    entSub = store.on('entries', l => { entries = l; paintList(); }, { cycleId: st.cycle });
  }
  function build() {
    const cycles = [...M.cycles].sort((a, b) => b.n - a.n);
    const sel = h('select', { class: 'sel', 'aria-label': 'Chọn đợt', onchange: e => { st.cycle = e.target.value; subscribe(); } },
      cycles.map(c => h('option', { value: c.id, selected: c.id === st.cycle }, `Đợt ${c.n}${c.id === M.config.currentCycleId ? ' (hiện tại)' : ''}`)));
    controls.replaceChildren(sel, chips('g', [['', 'Tất cả tổ'], ...M.groups.map(g => [g.id, g.name])]),
      chips('cat', [['', 'Tất cả nhóm'], ...M.config.categories.map(c => [c.id, c.name])]), chips('status', STATUS));
    built = true;
  }
  function paintList() {
    if (!ready() || entries === null) return;
    const cyc = M.cycles.find(c => c.id === st.cycle), readOnly = !!cyc?.closed;
    const gm = new Map(M.groups.map(g => [g.id, g])), sm = new Map(M.students.map(s => [s.id, s]));
    const rows = entries.filter(e => (!st.g || e.groupId === st.g) && (!st.cat || e.cat === st.cat) && (!st.status || e.status === st.status))
      .sort((a, b) => b.at - a.at);
    const out = [];
    if (readOnly) out.push(h('div', { class: 'note' }, `Đợt ${cyc.n} đã đóng, chỉ xem.`));
    if (!rows.length) out.push(emptyState({ icon: 'history', title: 'Không có điểm nào', text: entries.length ? 'Thử bỏ bớt bộ lọc.' : 'Đợt này chưa ghi điểm nào.' }));
    let key = null, box = null;
    for (const e of rows) {
      const k = dayKey(e.at);
      if (k !== key) { key = k; out.push(h('div', { class: 'day-h' }, h('span', null, lab(e.at)))); out.push((box = h('div', { class: 'card day-list' }))); }
      box.append(entryRow(e, { group: gm.get(e.groupId), student: sm.get(e.studentId), onOpen: x => entrySheet(x, { group: gm.get(x.groupId), student: sm.get(x.studentId), readOnly }) }));
    }
    list.replaceChildren(...out);
    if (!staggered && rows.length) { stagger(list.children); staggered = true; }
  }
  function sync() {
    if (!ready()) return;
    if (!st.cycle) { st.cycle = M.config.currentCycleId; subscribe(); }
    build(); paintList();
  }
  const subs = ['config', 'groups', 'students', 'cycles'].map(c => store.on(c, v => { M[c] = v; sync(); }));
  return { el, destroy: () => { subs.forEach(u => u()); entSub?.(); } };
}

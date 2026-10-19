// Dev: first-run setup wizard (số tổ/tên/màu -> dán thành viên từng tổ -> thể lệ mẫu). Only when no groups.
import { h, put } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import { navigate } from '../../router.js';
import { toast } from '../../ui/toast.js';
import { emptyState, dot } from '../../ui/components.js';
import { field, textInput, numberInput, textArea, checkInput, colorPicker, COLOR_IDS, errBox } from '../../ui/form.js';
import { seedRules, CATEGORIES, TITLES } from '../../data/seed.js';
import { errMsg } from '../../ui/act.js';
import { baseOf } from '../../scoring.js';

const once = col => new Promise(r => { let u; u = store.on(col, v => { queueMicrotask(() => u?.()); r(v); }); });
const lines = t => t.split(/\r?\n/).map(x => x.replace(/^(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean);

async function finish(st, rules) {
  const [cfg, cycles] = await Promise.all([once('config'), once('cycles')]);
  const groups = {}, students = {}, list = [];
  st.groups.forEach((g, i) => {
    const id = 'g' + (i + 1); groups[id] = { name: g.name, color: g.color, order: i + 1 }; list.push({ id, ...groups[id] });
    lines(st.members[i] || '').forEach((n, k) => { students[`s_${i + 1}_${k + 1}`] = { name: n, groupId: id, titleId: null, active: true }; });
  });
  const config = { className: st.className.trim() || cfg.className || '' };
  if (!cfg.categories || cfg._virtual) config.categories = CATEGORIES;
  if (!cfg.titles || cfg._virtual) config.titles = TITLES;
  if (!cfg.cycleWeeks || cfg._virtual) config.cycleWeeks = 4;
  if (cfg._virtual) config.openView = true;
  config.baseScore = st.base; // the wizard is an explicit act: one weekly base for every tổ
  const obj = { v: 1, config, groups, students };
  if (rules) obj.rules = seedRules();
  if (!cfg.currentCycleId || !cycles.some(c => c.id === cfg.currentCycleId)) {
    config.currentCycleId = 'c1'; obj.cycles = { c1: { n: 1, start: Date.now(), end: null, closed: false, summary: [] } };
  }
  await store.importConfig(obj, 'merge');
  return { g: list.length, s: Object.keys(students).length };
}
export default function setup() {
  const body = h('div', { class: 'stack' });
  const st = { step: 0, className: '', base: 100, groups: [], members: [] };
  const sync = () => { while (st.groups.length < st.n) st.groups.push({ name: `Tổ ${st.groups.length + 1}`, color: COLOR_IDS[st.groups.length % 8] }); st.groups.length = st.n; };
  st.n = 4; sync();
  const bar = () => h('div', { class: 'steps', 'aria-hidden': 'true' }, [0, 1, 2].map(i => h('span', { class: i <= st.step ? 'on' : '' })));
  const nav = (back, next, label = 'Tiếp tục') => h('div', { class: 'row-btns' }, back && h('button', { class: 'btn btn-ghost', type: 'button', onclick: back }, 'Quay lại'), h('button', { class: 'btn', type: 'button', onclick: next }, label));
  const go = n => { st.step = n; paint(); };
  function s0() {
    const cls = textInput(st.className, { placeholder: 'Ví dụ: 11A3', 'aria-label': 'Tên lớp' }); cls.oninput = () => { st.className = cls.value; };
    const out = h('output', null, String(st.n));
    const set = d => { st.n = Math.min(8, Math.max(1, st.n + d)); sync(); paint(); };
    const bs = numberInput(st.base, { min: '0', max: '1000', step: '1', 'aria-label': 'Điểm khởi đầu mỗi tuần' }); bs.oninput = () => { const n = Number(bs.value); if (bs.value.trim() && Number.isInteger(n) && n >= 0 && n <= 1000) st.base = n; };
    return [field('Tên lớp', cls), field('Điểm khởi đầu mỗi tuần', bs, 'Mỗi tuần, mỗi tổ bắt đầu với số điểm này.'),
      h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Số tổ'), h('div', { class: 'stepper' },
        h('button', { type: 'button', 'aria-label': 'Bớt tổ', onclick: () => set(-1) }, '−'), h('output', null, String(st.n)), h('button', { type: 'button', 'aria-label': 'Thêm tổ', onclick: () => set(1) }, '+'))),
      ...st.groups.map((g, i) => { const t = textInput(g.name, { 'aria-label': `Tên tổ ${i + 1}` }), c = colorPicker(g.color);
        t.oninput = () => { g.name = t.value; }; c.el.addEventListener('click', () => { g.color = c.get(); });
        return h('div', { class: 'card' }, field(`Tổ ${i + 1}`, t), h('div', { style: { marginTop: '8px' } }, c.el)); }),
      nav(null, () => { if (st.groups.some(g => !g.name.trim())) return toast('Mỗi tổ cần có tên'); go(1); })];
  }
  function s1() {
    return [h('p', { class: 'muted' }, 'Dán danh sách thành viên từng tổ, mỗi dòng một tên. Có thể bỏ trống và thêm sau.'),
      ...st.groups.map((g, i) => { const ta = textArea(st.members[i] || '', { rows: '6', 'aria-label': 'Thành viên ' + g.name }); ta.oninput = () => { st.members[i] = ta.value; };
        return h('div', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', { class: 'inl' }, dot(g.color), g.name)), ta); }),
      nav(() => go(0), () => go(2))];
  }
  function s2() {
    const total = st.groups.reduce((n, _, i) => n + lines(st.members[i] || '').length, 0);
    const r = checkInput(`Nạp thể lệ mẫu (${Object.keys(seedRules()).length} tiêu chí theo quy định lớp)`, true), err = errBox();
    const done = nav(() => go(1), async ev => {
      ev.target.disabled = true; err.hidden = true;
      try { const x = await finish(st, r.input.checked); toast(`Đã tạo ${x.g} tổ, ${x.s} học sinh`); navigate('/'); }
      catch (e) { err.textContent = errMsg(e); err.hidden = false; ev.target.disabled = false; }
    }, 'Hoàn tất');
    return [h('div', { class: 'card' }, h('strong', null, `${st.className.trim() || 'Lớp'}: ${st.groups.length} tổ, ${total} học sinh`)), r, err, done];
  }
  const paint = () => put(body, bar(), h('div', { class: 'form' }, [s0, s1, s2][st.step]()));
  Promise.all([once('groups'), once('config')]).then(([gs, cfg]) => { st.base = baseOf(cfg); return gs; }).then(gs => gs.length
    ? put(body, emptyState({ icon: 'shield', title: 'Lớp đã có dữ liệu', text: 'Thiết lập từ đầu chỉ dùng khi lớp chưa có tổ. Muốn làm lại: xuất cấu hình, rồi “Xóa dữ liệu lớp” trong Công cụ.', action: { label: 'Mở Công cụ', href: '#/dev/tools' } }))
    : paint());
  return { el: body };
}

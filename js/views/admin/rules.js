// Admin: rules CRUD (up/down order, active, hot).
import { h } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import { live, chip, pointsChip } from '../../ui/components.js';
import { act } from '../../ui/act.js';
import { toast } from '../../ui/toast.js';
import { formSheet, confirmSheet, field, textInput, numberInput, selectInput, checkInput, arow, iconBtn } from '../../ui/form.js';

const SCOPE = { student: 'Học sinh', group: 'Cả tổ', both: 'Cả hai' };
function ruleSheet(r, cat, cats, all) {
  const name = textInput(r?.name || ''), c = selectInput(cats.map(x => ({ value: x.id, label: x.name })), r?.cat || cat);
  const pts = numberInput(r?.points ?? -10), sc = selectInput(Object.entries(SCOPE).map(([value, label]) => ({ value, label })), r?.scope || 'student');
  const note = textInput(r?.note || '', { maxlength: '500' }), pu = checkInput('Tính theo số lượng (/tv)', r?.perUnit);
  const hot = checkInput('Thường dùng (hiện đầu danh sách ghi điểm)', r?.hot), act = checkInput('Đang áp dụng', r ? r.active !== false : true);
  const del = r && h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => confirmSheet({ title: 'Xóa tiêu chí này?', text: 'Điểm đã ghi trước đó vẫn giữ nguyên.', label: 'Xóa',
    onConfirm: async () => { await store.deleteDoc('rules', r.id); toast('Đã xóa tiêu chí'); } }) }, 'Xóa tiêu chí');
  formSheet({ title: r ? 'Sửa tiêu chí' : 'Thêm tiêu chí', body: [field('Tên tiêu chí', name), field('Nhóm', c), field('Điểm (âm = trừ)', pts), field('Áp dụng cho', sc), field('Ghi chú', note), pu, hot, act, del],
    onSubmit: async () => {
      const p = Number(pts.value);
      if (!name.value.trim()) throw new Error('Cần nhập tên tiêu chí');
      if (!Number.isFinite(p) || p === 0) throw new Error('Điểm phải là số khác 0');
      await store.saveDoc('rules', r?.id || null, { cat: c.value, name: name.value.trim(), points: Math.round(p), scope: sc.value, perUnit: pu.input.checked,
        hot: hot.input.checked, note: note.value.trim(), active: act.input.checked, assumed: r?.assumed && !r ? true : r?.assumed || false,
        order: r?.order || all.reduce((m, x) => Math.max(m, x.order || 0), 0) + 1 });
    } });
}
// Swap positions i and i+d inside one category, reusing that category's order numbers.
async function move(list, i, d) {
  const orders = list.map(r => r.order || 0).sort((a, b) => a - b).map((o, k, a) => (k && o <= a[k - 1] ? a[k - 1] + 1 : o));
  const arr = [...list]; [arr[i], arr[i + d]] = [arr[i + d], arr[i]];
  for (const [k, r] of arr.entries()) if (r.order !== orders[k]) await store.saveDoc('rules', r.id, { order: orders[k] });
}
export default function rulesView() {
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config', 'rules'], S => S.config.categories.map(c => {
    const list = S.rules.filter(r => r.cat === c.id).sort((a, b) => (a.order || 0) - (b.order || 0));
    return h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, c.name), chip(`${list.length} tiêu chí`)),
      list.map((r, i) => arow({ name: r.name, off: r.active === false,
        sub: h('span', { class: 'inl' }, pointsChip(r.points), SCOPE[r.scope], r.perUnit && '/tv', r.hot && chip('thường dùng'), r.assumed && chip('tạm tính', 'warn'), r.active === false && 'tắt'),
        actions: [iconBtn('chevron', 'Lên', () => act(() => move(list, i, -1)), 'up' + (i ? '' : ' is-dim')), iconBtn('chevron', 'Xuống', () => act(() => move(list, i, 1)), 'down' + (i < list.length - 1 ? '' : ' is-dim')),
          iconBtn('edit', 'Sửa ' + r.name, () => ruleSheet(r, c.id, S.config.categories, S.rules))] })),
      h('button', { class: 'btn btn-ghost', type: 'button', style: { marginTop: '12px' }, onclick: () => ruleSheet(null, c.id, S.config.categories, S.rules) }, 'Thêm tiêu chí'));
  }));
  return { el: body, destroy: stop };
}

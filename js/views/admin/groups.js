// Admin: tổ & học sinh (add/edit tổ, move student between tổ, chức vụ, deactivate, bulk paste).
import { h } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import { live, dot, chip } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { formSheet, confirmSheet, field, textInput, selectInput, checkInput, colorPicker, arow, iconBtn } from '../../ui/form.js';
import { rosterSheet } from './roster.js';

function groupSheet(g, groups, count) {
  const name = textInput(g?.name || `Tổ ${groups.length + 1}`), col = colorPicker(g?.color || ['blue', 'green', 'orange', 'purple', 'teal', 'pink', 'amber', 'slate'].find(c => !groups.some(x => x.color === c)));
  const del = g && h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => {
    if (count) return toast('Chuyển hết học sinh sang tổ khác trước khi xóa tổ');
    confirmSheet({ title: `Xóa ${g.name}?`, label: 'Xóa tổ', onConfirm: async () => { await store.deleteDoc('groups', g.id); toast('Đã xóa tổ'); } });
  } }, 'Xóa tổ');
  formSheet({ title: g ? 'Sửa tổ' : 'Thêm tổ', body: [field('Tên tổ', name), field('Màu', col.el), del],
    onSubmit: async () => {
      if (!name.value.trim()) throw new Error('Cần nhập tên tổ');
      await store.saveDoc('groups', g?.id || null, { name: name.value.trim(), color: col.get(), order: g?.order || groups.reduce((m, x) => Math.max(m, x.order || 0), 0) + 1 });
    } });
}
function studentSheet(st, groupId, S) {
  const name = textInput(st?.name || ''), gs = selectInput(S.groups.map(g => ({ value: g.id, label: g.name })), st?.groupId || groupId);
  const ti = selectInput([{ value: '', label: 'Không có' }, ...(S.config.titles || []).map(t => ({ value: t.id, label: t.name }))], st?.titleId || '');
  const act = checkInput('Đang học trong lớp (bỏ chọn = ngừng)', st ? st.active !== false : true);
  formSheet({ title: st ? 'Sửa học sinh' : 'Thêm học sinh', body: [field('Họ tên', name), field('Tổ', gs), field('Chức vụ', ti), act],
    onSubmit: async () => {
      if (!name.value.trim()) throw new Error('Cần nhập họ tên');
      await store.saveDoc('students', st?.id || null, { name: name.value.trim(), groupId: gs.value, titleId: ti.value || null, active: act.input.checked });
    } });
}
export default function groupsView() {
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config', 'groups', 'students'], S => {
    const groups = [...S.groups].sort((a, b) => (a.order || 0) - (b.order || 0)), tt = new Map((S.config.titles || []).map(t => [t.id, t.name]));
    const cnt = id => S.students.filter(s => s.groupId === id).length;
    return [
      h('div', { class: 'sec-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => rosterSheet(groups, S.students) }, 'Dán danh sách'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => groupSheet(null, groups, 0) }, 'Thêm tổ')),
      ...groups.map(g => {
        const ms = S.students.filter(s => s.groupId === g.id).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        return h('section', { class: 'card' },
          h('div', { class: 'sec-h' }, h('h2', { class: 'inl' }, dot(g.color), g.name), chip(`${ms.filter(s => s.active !== false).length} học sinh`),
            iconBtn('edit', 'Sửa ' + g.name, () => groupSheet(g, groups, cnt(g.id)))),
          ms.map(s => arow({ name: s.name, off: s.active === false, sub: [tt.get(s.titleId), s.active === false && 'ngừng'].filter(Boolean).join(' · '),
            actions: [iconBtn('edit', 'Sửa ' + s.name, () => studentSheet(s, g.id, S))] })),
          h('button', { class: 'btn btn-ghost', type: 'button', style: { marginTop: '12px' }, onclick: () => studentSheet(null, g.id, S) }, 'Thêm học sinh'));
      }),
    ];
  });
  return { el: body, destroy: stop };
}

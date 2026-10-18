// Admin: chức vụ list. A title's role = default role of that person's personal invite.
import { h } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import { live } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { ROLE_LABEL, inviteRoles } from '../../session.js';
import { formSheet, confirmSheet, field, textInput, selectInput, arow, iconBtn } from '../../ui/form.js';

const save = titles => store.saveDoc('config', null, { titles });
function titleSheet(t, titles) {
  const name = textInput(t?.name || ''), roles = [...new Set([...inviteRoles(), t?.role].filter(Boolean))];
  const role = selectInput(roles.map(r => ({ value: r, label: ROLE_LABEL[r] })), t?.role || 'student');
  const del = t && h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => confirmSheet({ title: `Xóa chức vụ “${t.name}”?`, label: 'Xóa',
    onConfirm: async () => { await save(titles.filter(x => x.id !== t.id)); toast('Đã xóa chức vụ'); } }) }, 'Xóa chức vụ');
  formSheet({ title: t ? 'Sửa chức vụ' : 'Thêm chức vụ', body: [field('Tên chức vụ', name), field('Vai trò mặc định', role, 'Quyết định quyền của mã mời cá nhân.'), del],
    onSubmit: async () => {
      if (!name.value.trim()) throw new Error('Cần nhập tên chức vụ');
      const d = { id: t?.id || 't_' + Date.now().toString(36), name: name.value.trim(), role: role.value };
      await save(t ? titles.map(x => (x.id === t.id ? d : x)) : [...titles, d]);
    } });
}
export default function titlesView() {
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config'], S => {
    const titles = S.config.titles || [];
    return h('section', { class: 'card' }, titles.map(t => arow({ name: t.name, sub: ROLE_LABEL[t.role], actions: [iconBtn('edit', 'Sửa ' + t.name, () => titleSheet(t, titles))] })),
      h('button', { class: 'btn btn-ghost', type: 'button', style: { marginTop: '12px' }, onclick: () => titleSheet(null, titles) }, 'Thêm chức vụ'));
  });
  return { el: body, destroy: stop };
}

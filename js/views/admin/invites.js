// Admin: invites (create/list/revoke; big 5-5-5-5 code + copy raw code). Admin cannot make admin/dev invites.
import { h } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import { live, chip } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { can, role, ROLE_LABEL, inviteRoles } from '../../session.js';
import { formSheet, confirmSheet, field, textInput, selectInput, arow, iconBtn, copyText } from '../../ui/form.js';
import { openSheet } from '../../ui/sheet.js';
import { titleIdsOf, titleNames, topTitle, titleObjs, roleRank } from '../../titles.js';

export function showInvite(code, label) {
  openSheet({ title: label || 'Mã đăng nhập', content: h('div', { class: 'form' },
    h('div', { class: 'code-big', 'aria-label': 'Mã đăng nhập' }, code.match(/.{1,5}/g).join(' ')),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => copyText(code, 'Đã sao chép mã') }, 'Sao chép mã'))) });
}
function createSheet(S) {
  const roles = inviteRoles(), gm = new Map(S.groups.map(g => [g.id, g.name])), titles = S.config.titles || [];
  const sts = [...S.students].sort((a, b) => (gm.get(a.groupId) || '').localeCompare(gm.get(b.groupId) || '') || a.name.localeCompare(b.name, 'vi'));
  const rl = selectInput(roles.map(r => ({ value: r, label: ROLE_LABEL[r] })), 'student');
  const st = selectInput([{ value: '', label: 'Không gắn (mã chung)' }, ...sts.map(s => ({ value: s.id, label: `${s.name} (${gm.get(s.groupId) || '?'})` }))], '');
  const label = textInput('', { placeholder: 'Ví dụ: Mã chung của lớp, Tổ trưởng Tổ 1' });
  st.addEventListener('change', () => {
    const s = S.students.find(x => x.id === st.value);
    // suggested role = highest role among the person's chức vụ that this user may issue (still overridable)
    const best = titleObjs(s, titles).filter(t => roles.includes(t.role)).sort((a, b) => roleRank(b.role) - roleRank(a.role))[0];
    if (best) rl.value = best.role;
    if (s && !label.value) label.value = s.name;
  });
  formSheet({ title: 'Tạo mã mời', submit: 'Tạo mã', body: [field('Vai trò', rl, 'Chức vụ của học sinh quyết định vai trò mặc định.'), field('Gắn với học sinh', st), field('Nhãn', label)],
    onSubmit: async () => {
      const s = S.students.find(x => x.id === st.value);
      if (rl.value === 'recorder' && !s) throw new Error('Tổ trưởng cần gắn với một học sinh để biết tổ.');
      const lb = label.value.trim() || (s ? s.name : ROLE_LABEL[rl.value]);
      const code = await store.createInvite({ role: rl.value, label: lb, studentId: s?.id || null, groupId: s?.groupId || null, titleId: topTitle(titleIdsOf(s), titles)?.id || null });
      setTimeout(() => showInvite(code, lb), 250);
    } });
}
const revoke = i => confirmSheet({ title: `Thu hồi “${i.label}”?`, label: 'Thu hồi',
  text: 'Mã sẽ ngừng dùng được và những người đã vào bằng mã này phải nhập mã khác.', onConfirm: async () => { await store.revokeInvite(i.id); toast('Đã thu hồi'); } });

export default function invitesView() {
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config', 'groups', 'students', 'invites'], S => {
    const gm = new Map(S.groups.map(g => [g.id, g.name]));
    const tnOf = i => titleNames(S.students.find(x => x.id === i.studentId) || i, S.config.titles);
    const vis = S.invites.filter(i => role() === 'dev' || i.role !== 'dev').sort((a, b) => (b.active - a.active) || b.at - a.at);
    const rotate = () => confirmSheet({ title: 'Tạo mã chung của lớp mới?', label: 'Tạo & thu hồi cũ',
      text: 'Tạo mã chung mới cho học sinh và thu hồi các mã chung cũ. Người đã vào bằng mã cũ phải nhập mã mới.',
      onConfirm: async () => {
        const olds = S.invites.filter(i => i.active && i.role === 'student' && !i.studentId);
        const code = await store.createInvite({ role: 'student', label: 'Mã chung của lớp' });
        for (const o of olds) await store.revokeInvite(o.id);
        setTimeout(() => showInvite(code, 'Mã chung của lớp'), 250);
      } });
    return [
      h('div', { class: 'sec-actions' }, h('button', { class: 'btn', type: 'button', onclick: () => createSheet(S) }, 'Tạo mã mời'),
        can('createInvite', { role: 'student' }) && h('button', { class: 'btn btn-ghost', type: 'button', onclick: rotate }, 'Tạo mã chung của lớp mới')),
      h('section', { class: 'card' }, vis.length ? vis.map(i => arow({ name: i.label || 'Mã mời', off: !i.active,
        sub: h('span', { class: 'inl' }, chip(ROLE_LABEL[i.role]), tnOf(i), gm.get(i.groupId), !i.active && 'đã thu hồi'),
        actions: [i.active && iconBtn('copy', 'Xem mã', () => showInvite(i.id, i.label)),
          i.active && can('createInvite', { role: i.role }) && iconBtn('trash', 'Thu hồi', () => revoke(i))] }))
        : h('p', { class: 'muted' }, 'Chưa có mã mời nào.')),
    ];
  });
  return { el: body, destroy: stop };
}

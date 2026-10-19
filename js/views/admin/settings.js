// Admin: class settings (className, school, openView, ONE weekly base score `baseScore`).
import { h } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import { live } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { field, textInput, numberInput, checkInput, errBox, confirmSheet } from '../../ui/form.js';
import { act } from '../../ui/act.js';
import { baseOf } from '../../scoring.js';

export default function settingsView() {
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config'], ({ config: c }) => {
    const name = textInput(c.className || ''), school = textInput(c.school || '');
    const open = checkInput('Cho phép xem không cần mã', c.openView === true);
    const cur = baseOf(c), base = numberInput(cur, { min: '0', max: '1000', step: '1', 'aria-label': 'Điểm khởi đầu mỗi tuần' });
    const err = errBox(), ok = h('button', { class: 'btn', type: 'submit' }, 'Lưu cài đặt');
    const form = h('form', { class: 'form', novalidate: true }, field('Tên lớp', name), field('Trường', school),
      open, h('p', { class: 'muted' }, 'Ai có đường link đều xem được tên và nhật ký của cả lớp.'),
      field('Điểm khởi đầu mỗi tuần', base, 'Mỗi tuần, mỗi tổ bắt đầu với số điểm này.'),
      err, ok);
    form.addEventListener('submit', async ev => {
      ev.preventDefault(); err.hidden = true;
      const raw = base.value.trim(), nb = Number(raw);
      if (!name.value.trim()) { err.textContent = 'Cần nhập tên lớp'; err.hidden = false; return; }
      if (!raw || !Number.isInteger(nb) || nb < 0 || nb > 1000) { err.textContent = 'Điểm khởi đầu phải là số nguyên từ 0 đến 1000'; err.hidden = false; return; }
      // Only baseScore is written (merge); categories are never touched. Unchanged base -> not written at all.
      const data = { className: name.value.trim(), school: school.value.trim(), openView: open.input.checked, ...(nb !== cur && { baseScore: nb }) };
      const save = () => store.saveDoc('config', null, data);
      if (nb === cur) return act(save, { btn: ok, ok: 'Đã lưu cài đặt' });
      confirmSheet({ title: 'Đổi điểm khởi đầu?', text: 'Đổi điểm khởi đầu sẽ tính lại bảng điểm của tuần này và cả các tuần đã qua. Tiếp tục?', label: 'Tiếp tục', danger: false,
        onConfirm: async () => { await save(); toast('Đã lưu cài đặt'); } });
    });
    return h('section', { class: 'card' }, form);
  });
  return { el: body, destroy: stop };
}

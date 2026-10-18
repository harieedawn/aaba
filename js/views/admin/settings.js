// Admin: class settings (className, school, cycleWeeks, category base points).
import { h } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import { live } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { field, textInput, numberInput, checkInput, errBox } from '../../ui/form.js';

export default function settingsView() {
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config'], ({ config: c }) => {
    const name = textInput(c.className || ''), school = textInput(c.school || ''), weeks = numberInput(c.cycleWeeks || 4, { min: '1', max: '12' });
    const open = checkInput('Cho phép xem không cần mã', c.openView === true);
    const bases = c.categories.map(k => [k, numberInput(k.base, { 'aria-label': 'Điểm khởi đầu ' + k.name })]);
    const err = errBox(), ok = h('button', { class: 'btn', type: 'submit' }, 'Lưu cài đặt');
    const form = h('form', { class: 'form', novalidate: true }, field('Tên lớp', name), field('Trường', school), field('Số tuần mỗi đợt', weeks),
      open, h('p', { class: 'muted' }, 'Ai có đường link đều xem được tên và nhật ký của cả lớp.'),
      h('h2', { class: 'sec-h' }, 'Điểm khởi đầu theo nhóm'), h('p', { class: 'muted' }, 'Mỗi tổ bắt đầu mỗi đợt với số điểm này ở từng nhóm.'), bases.map(([k, i]) => field(k.name, i)),
      h('p', { class: 'muted' }, 'Đổi điểm khởi đầu sẽ tính lại bảng điểm của đợt hiện tại.'), err, ok);
    form.addEventListener('submit', async ev => {
      ev.preventDefault(); err.hidden = true;
      const w = Math.round(Number(weeks.value)), bs = bases.map(([, i]) => Math.round(Number(i.value)));
      if (!name.value.trim()) { err.textContent = 'Cần nhập tên lớp'; err.hidden = false; return; }
      if (!(w >= 1 && w <= 12) || bs.some(n => !Number.isFinite(n))) { err.textContent = 'Số tuần từ 1 đến 12, điểm khởi đầu phải là số'; err.hidden = false; return; }
      ok.disabled = true;
      try { await store.saveDoc('config', null, { className: name.value.trim(), school: school.value.trim(), cycleWeeks: w, openView: open.input.checked, categories: c.categories.map((k, n) => ({ ...k, base: bs[n] })) }); toast('Đã lưu cài đặt'); }
      catch (e) { err.textContent = e.message; err.hidden = false; ok.disabled = false; }
    });
    return h('section', { class: 'card' }, form);
  });
  return { el: body, destroy: stop };
}

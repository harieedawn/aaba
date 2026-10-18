// Trình chiếu: confirm sheet for the unfinished current week. Past weeks never see it.
import { h } from '../../ui/dom.js';
import { openSheet } from '../../ui/sheet.js';

export const noticeText = n => (n > 0 ? `Điểm vẫn có thể thay đổi đến hết thứ Sáu (còn ${n} ngày). Bạn vẫn muốn trình chiếu?`
  : 'Điểm vẫn có thể thay đổi đến hết hôm nay (thứ Sáu). Bạn vẫn muốn trình chiếu?');

export function currentWeekSheet(daysLeft, onGo) {
  const sh = openSheet({ title: 'Tuần này chưa kết thúc', content: h('div', { class: 'form' }, h('p', { class: 'muted' }, noticeText(daysLeft)),
    h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => sh.close() }, 'Để sau'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { sh.close(); onGo(); } }, 'Vẫn trình chiếu'))) });
  return sh;
}

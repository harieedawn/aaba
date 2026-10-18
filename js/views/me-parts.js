// Tôi: guest name picker (localStorage only) and the in-app "Thông báo" list.
import { h, put } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { dot } from '../ui/components.js';
import * as store from '../data/store.js';
import { toast } from '../ui/toast.js';
import { fmtPts, relTime } from '../format.js';

export function namePicker(groups, students) {
  let q = '';
  const list = h('div');
  const paint = () => {
    const kids = [];
    for (const g of [...groups].sort((a, b) => a.order - b.order)) {
      const ss = students.filter(s => s.groupId === g.id && s.active !== false && s.name.toLowerCase().includes(q));
      if (!ss.length) continue;
      kids.push(h('div', { class: 'pick-g inl' }, dot(g.color), g.name), h('div', { class: 'pick' }, ss.map(s => h('button', {
        class: 'fchip pressable', type: 'button', onclick: () => store.pickStudent(s.id).catch(() => toast('Không chọn được tên. Thử lại nhé.')) }, s.name))));
    }
    put(list, kids);
  };
  const search = h('input', { class: 'input', placeholder: 'Tìm tên của bạn', 'aria-label': 'Tìm tên', oninput: e => { q = e.target.value.toLowerCase(); paint(); } });
  paint();
  return h('section', { class: 'card pick-box' }, h('h2', null, 'Chọn tên của bạn'),
    h('p', { class: 'muted' }, 'Chỉ lưu trên máy này, để xem điểm và thông báo của bạn.'), search, list);
}

// Câu thông báo cho một dòng điểm về mình.
const line = e => `${e.points < 0 ? 'Bạn bị trừ' : 'Bạn được cộng'} ${Math.abs(e.points)} điểm: ${e.ruleName}`;
export function notifRow(e, isNew, { group } = {}) {
  return h('div', { class: 'entry' + (e.status === 'void' ? ' is-void' : '') },
    h('span', { class: 'ico-tile', 'aria-hidden': 'true' }, icon(e.points < 0 ? 'minus' : 'plus', 20)),
    h('div', { class: 'entry-main' },
      h('div', { class: 'entry-name' }, line(e), isNew && [' ', h('span', { class: 'tag new' }, 'Mới')]),
      h('div', { class: 'entry-sub muted' }, `${e.byName || 'Ai đó'} · ${relTime(e.at)}`)),
    h('div', { class: 'entry-pts' }, h('span', { class: 'amt ' + (e.points > 0 ? 'pos' : 'neg') }, fmtPts(e.points)),
      e.status === 'pending' && h('span', { class: 'pend' }, icon('clock', 14), 'chờ xác nhận'),
      e.status === 'void' && h('span', { class: 'void-t' }, 'Đã thu hồi')));
}

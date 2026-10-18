// Quản lý hub (#/quanly) + section dispatcher (#/quanly/nhom|luat|chucvu|moi|caidat).
import { h, put } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { pageHeader, emptyState } from '../../ui/components.js';

const SECTIONS = [
  ['nhom', 'Tổ & học sinh', 'user', () => import('./groups.js')],
  ['luat', 'Thể lệ', 'book', () => import('./rules.js')],
  ['chucvu', 'Chức vụ', 'shield', () => import('./titles.js')],
  ['moi', 'Mã đăng nhập', 'user', () => import('./invites.js')],
  ['caidat', 'Cài đặt lớp', 'settings', () => import('./settings.js')],
];
export default function admin({ params }) {
  const sec = SECTIONS.find(s => s[0] === params[0]);
  if (!sec) return { el: h('div', { class: 'view narrow' }, pageHeader('Quản lý'),
    h('div', { class: 'stack' }, SECTIONS.map(([k, label, ic]) => h('a', { class: 'row-link pressable', href: '#/quanly/' + k },
      icon(ic, 22), h('span', { class: 'grow' }, label), icon('chevron', 20))))) };
  const body = h('div', { class: 'stack' });
  let inner, dead = false;
  sec[3]().then(m => { if (dead) return; inner = m.default(); put(body, inner.el); })
    .catch(e => put(body, emptyState({ icon: 'x', title: 'Không mở được mục này', text: 'Có thể đã có bản cập nhật mới hoặc mạng yếu.', action: { label: 'Tải lại', onClick: () => location.reload() } })));
  return { el: h('div', { class: 'view narrow' }, pageHeader(sec[1], { back: '#/quanly' }), body), destroy: () => { dead = true; inner?.destroy?.(); } };
}

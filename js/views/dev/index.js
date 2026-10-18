// Dev tools hub (#/dev, #/dev/setup|export|tools). Dev only (router guard + can('dev')).
import { h, put } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import * as store from '../../data/store.js';
import { pageHeader, emptyState } from '../../ui/components.js';
import { act } from '../../ui/act.js';
import { daysSinceBackup, runBackup } from '../../backup.js';

const SECTIONS = [
  ['setup', 'Thiết lập lớp từ đầu', 'plus', () => import('./setup.js')],
  ['export', 'Xuất / nhập cấu hình', 'download', () => import('./export.js')],
  ['tools', 'Công cụ & chẩn đoán', 'settings', () => import('./tools.js')],
];
// Dev only: nudge when the last full backup is older than 7 days or never.
function backupNudge() {
  const d = daysSinceBackup();
  if (d !== null && d <= 7) return null;
  return h('section', { class: 'card need' }, h('div', null, h('b', null, d === null ? 'Chưa sao lưu lần nào' : `Chưa sao lưu trong ${d} ngày`),
    h('div', { class: 'muted' }, 'Nên xuất toàn bộ để phòng mất dữ liệu.')),
    h('button', { class: 'btn pressable', type: 'button', onclick: ev => act(async () => { await runBackup(); ev.currentTarget.closest('section')?.remove(); }, { btn: ev.currentTarget }) }, 'Xuất toàn bộ'));
}
export default function dev({ params }) {
  const sec = SECTIONS.find(s => s[0] === params[0]);
  if (!sec) {
    const body = h('div', { class: 'stack' }), rows = () => SECTIONS.map(([k, label, ic]) => h('a', { class: 'row-link pressable', href: '#/dev/' + k },
      icon(ic, 22), h('span', { class: 'grow' }, label), icon('chevron', 20)));
    let stop = () => {}, wiz;
    // no groups yet -> first-run wizard right here
    stop = store.on('groups', gs => { queueMicrotask(() => stop()); if (gs.length) return put(body, backupNudge(), ...rows());
      import('./setup.js').then(m => { wiz = m.default(); put(body, wiz.el); }); });
    return { el: h('div', { class: 'view narrow' }, pageHeader('Công cụ dev'), body) };
  }
  const body = h('div', { class: 'stack' });
  let inner, dead = false;
  sec[3]().then(m => { if (dead) return; inner = m.default(); put(body, inner.el); })
    .catch(e => put(body, emptyState({ icon: 'x', title: 'Không mở được mục này', text: 'Có thể đã có bản cập nhật mới hoặc mạng yếu.', action: { label: 'Tải lại', onClick: () => location.reload() } })));
  return { el: h('div', { class: 'view narrow' }, pageHeader(sec[1], { back: '#/dev' }), body), destroy: () => { dead = true; inner?.destroy?.(); } };
}

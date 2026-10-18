// Dev tools hub (#/dev, #/dev/setup|export|tools). Dev only (router guard + can('dev')).
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import * as store from '../../data/store.js';
import { pageHeader, emptyState } from '../../ui/components.js';

const SECTIONS = [
  ['setup', 'Thiết lập lớp từ đầu', 'plus', () => import('./setup.js')],
  ['export', 'Xuất / nhập cấu hình', 'download', () => import('./export.js')],
  ['tools', 'Công cụ & chẩn đoán', 'settings', () => import('./tools.js')],
];
export default function dev({ params }) {
  const sec = SECTIONS.find(s => s[0] === params[0]);
  if (!sec) {
    const body = h('div', { class: 'stack' }), rows = () => SECTIONS.map(([k, label, ic]) => h('a', { class: 'row-link pressable', href: '#/dev/' + k },
      icon(ic, 22), h('span', { class: 'grow' }, label), icon('chevron', 20)));
    let stop = () => {}, wiz;
    // no groups yet -> first-run wizard right here
    stop = store.on('groups', gs => { queueMicrotask(() => stop()); if (gs.length) return body.replaceChildren(...rows());
      import('./setup.js').then(m => { wiz = m.default(); body.replaceChildren(wiz.el); }); });
    return { el: h('div', { class: 'view narrow' }, pageHeader('Công cụ dev'), body) };
  }
  const body = h('div', { class: 'stack' });
  let inner, dead = false;
  sec[3]().then(m => { if (dead) return; inner = m.default(); body.replaceChildren(inner.el); })
    .catch(e => body.replaceChildren(emptyState({ icon: 'x', title: 'Không mở được mục này', text: e.message })));
  return { el: h('div', { class: 'view narrow' }, pageHeader(sec[1], { back: '#/dev' }), body), destroy: () => { dead = true; inner?.destroy?.(); } };
}

import { h, $, put } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { logo, emptyState } from './ui/components.js';
import * as store from './data/store.js';
import { can, onSession, initTheme } from './session.js';
import { startRouter } from './router.js';
import { unseen, onNotif, startNotify } from './notify.js';

// path, label, icon, extra class, wide (rail/sidebar only), visibility
const NAV = [
  { path: '/', label: 'Xếp hạng', icon: 'rank' },
  { path: '/lichsu', label: 'Nhật ký', icon: 'history' },
  { path: '/ghi', label: 'Ghi điểm', icon: 'plus', cls: 'ghi', show: () => can('record') },
  { path: '/duyet', label: 'Xác nhận', icon: 'check', wide: true, badge: true, show: () => can('approve') },
  { path: '/quanly', label: 'Quản lý', icon: 'settings', wide: true, show: () => can('manage') },
  { path: '/luat', label: 'Thể lệ', icon: 'book' },
  { path: '/toi', label: 'Tôi', icon: 'user' },
];
let pending = 0, curPath = '/';

function buildNav(list) {
  put(list, ...NAV.filter(n => !n.show || n.show()).map(n => {
    const badge = n.badge && h('span', { class: 'badge', 'data-badge': '', hidden: !pending }, pending);
    return h('li', { class: n.wide ? 'only-wide' : '' },
      h('a', { class: `nav-item pressable ${n.cls || ''}`, href: '#' + n.path, 'data-path': n.path },
        h('span', { class: 'ico' }, icon(n.icon, 24), n.path === '/toi' && h('span', { class: 'ndot', 'data-ndot': '', hidden: !unseen() })), h('span', { class: 'lbl' }, n.label), badge));
  }));
  markActive();
}
function markActive() {
  const p = curPath.startsWith('/to/') ? '/' : curPath;
  document.querySelectorAll('.nav-item').forEach(a => {
    const k = a.dataset.path, on = k === '/' ? p === '/' : p === k || p.startsWith(k + '/');
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
}
function paintBadge() {
  document.querySelectorAll('[data-badge]').forEach(b => { b.textContent = pending; b.hidden = !pending; });
}

async function boot() {
  initTheme();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
  const root = $('#app');
  try { await store.init(); } catch (err) {
    put(root, h('div', { class: 'view' }, emptyState({ icon: 'x', title: 'Không tải được dữ liệu', text: String(err.message || err), action: { label: 'Thử lại', onClick: () => location.reload() } })));
    return;
  }
  const list = h('ul', { class: 'nav-list' });
  const banner = h('div', { class: 'banner', role: 'status', hidden: true }, 'Bạn đang offline. Dữ liệu có thể chưa mới nhất.');
  const syncOnline = () => { banner.hidden = navigator.onLine; };
  addEventListener('online', syncOnline); addEventListener('offline', syncOnline); syncOnline();
  put(root, banner,
    h('nav', { class: 'nav', 'aria-label': 'Điều hướng chính' }, h('a', { class: 'nav-logo', href: '#/', 'aria-label': 'aaba' }, logo()), list),
    h('main', { class: 'main' }, h('div', { id: 'view' })));
  buildNav(list);
  startNotify();
  onNotif(() => document.querySelectorAll('[data-ndot]').forEach(d => { d.hidden = !unseen(); }));
  onSession(() => buildNav(list));
  store.on('entries', es => { pending = es.filter(e => e.status === 'pending').length; paintBadge(); });
  startRouter($('#view'), { onRoute: p => { curPath = p; markActive(); } });
}
boot();

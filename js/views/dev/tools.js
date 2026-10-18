// Dev: role preview, font check, diagnostics, wipe class data, reset demo (local mode).
import { h } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import { toast } from '../../ui/toast.js';
import { BACKEND, APP_VERSION } from '../../config.js';
import { role, setPreview, ROLE_LABEL, getSession } from '../../session.js';
import { live } from '../../ui/components.js';
import { errorLog } from '../../errors.js';
import { copyText } from '../../ui/form.js';
import { confirmSheet } from '../../ui/form.js';
import { CATEGORIES, TITLES } from '../../data/seed.js';

const kv = (k, v) => h('div', { class: 'kv' }, h('span', { class: 'muted' }, k), h('span', { class: 'mono' }, v));
const card = (title, ...kids) => h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, title)), ...kids);

function preview() {
  const cur = role(), real = getSession().role;
  return card('Xem như vai trò…', h('p', { class: 'muted', style: { marginBottom: '12px' } }, 'Chỉ đổi giao diện để kiểm tra, không đổi quyền thật.'),
    h('div', { class: 'pick' }, ['student', 'recorder', 'teacher', 'admin', 'dev'].map(r => h('button', { class: 'fchip pressable', type: 'button', 'aria-pressed': String(cur === r),
      onclick: () => { setPreview(r === real ? null : r); toast(r === real ? 'Đã quay về quyền thật' : `Đang xem như ${ROLE_LABEL[r]}`); } }, r === 'dev' ? 'Quản trị (thật)' : ROLE_LABEL[r]))));
}
function errors() {
  const log = errorLog(), text = () => log.map(e => `${e.t} [${e.src}] ${e.code} ${e.msg} ${e.stack}`).join('\n');
  return card('Lỗi gần đây', log.length ? h('div', { class: 'stack' }, h('pre', { class: 'mono', style: { whiteSpace: 'pre-wrap', maxHeight: '240px', overflow: 'auto' } }, text()),
    h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => copyText(text(), 'Đã sao chép lỗi') }, 'Sao chép')) : h('p', { class: 'muted' }, 'Chưa có lỗi nào.'));
}
function diag() {
  const sw = h('span', { class: 'mono' }, '…');
  const reg = navigator.serviceWorker?.getRegistration?.();
  (reg || Promise.resolve(null)).then(r => { sw.textContent = !('serviceWorker' in navigator) ? 'không hỗ trợ' : !r ? 'chưa đăng ký' : `${r.active ? 'active' : r.installing ? 'installing' : r.waiting ? 'waiting' : '?'}${navigator.serviceWorker.controller ? ', đang kiểm soát trang' : ''}`; }).catch(() => { sw.textContent = 'lỗi'; });
  return card('Chẩn đoán', kv('Backend', BACKEND), kv('Phiên bản', APP_VERSION), kv('Vai trò thật / đang xem', `${getSession().role} / ${role()}`),
    kv('Mạng', navigator.onLine ? 'online' : 'offline'), h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Service worker'), sw), kv('Origin', location.origin + location.pathname));
}
function wipe(S) {
  const go = () => confirmSheet({ title: 'Xóa dữ liệu lớp?', label: 'Xóa dữ liệu', requireText: 'XOA',
    text: 'Xóa tổ, học sinh, thể lệ, điểm; giữ tên lớp và mã mời. Hãy xuất cấu hình trước. Không hoàn tác được.',
    onConfirm: async () => {
      const c = S.config;
      await store.importConfig({ v: 1, config: { className: c.className || '', school: c.school || '', cycleWeeks: c.cycleWeeks || 4, currentCycleId: 'c1', categories: CATEGORIES, titles: TITLES },
        groups: {}, students: {}, rules: {}, entries: {}, cycles: { c1: { n: 1, start: Date.now(), end: null, closed: false, summary: [] } } }, 'replace');
      toast('Đã xóa dữ liệu lớp'); location.hash = '#/dev';
    } });
  return card('Xóa dữ liệu lớp', h('p', { class: 'muted', style: { marginBottom: '12px' } }, 'Đưa lớp về trạng thái trống để thiết lập lại hoặc nhập file.'),
    h('button', { class: 'btn btn-danger', type: 'button', onclick: go }, 'Xóa dữ liệu lớp…'));
}
function reset() {
  if (BACKEND !== 'local') return null;
  return card('Dữ liệu demo (chế độ local)', h('p', { class: 'muted', style: { marginBottom: '12px' } }, 'Nạp lại dữ liệu demo ban đầu: 4 tổ, học sinh mẫu, điểm mẫu.'),
    h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => confirmSheet({ title: 'Đặt lại dữ liệu demo?', label: 'Đặt lại', text: 'Mọi thay đổi hiện tại trên máy này sẽ mất.',
      onConfirm: async () => { try { localStorage.removeItem('aaba.local.v1'); } catch {} location.reload(); } }) }, 'Đặt lại dữ liệu demo…'));
}
export default function tools() {
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config'], S => [preview(),
    card('Kiểm tra font', h('p', { class: 'font-check' }, 'Tiếng Việt: Đặng Thị Ngọc Hưng ắằẳẵặ ơư ĐƯỢC'), h('p', { class: 'muted' }, 'Nếu chữ bị vỡ hoặc lệch dấu, kiểm tra các file trong thư mục fonts.')),
    diag(), errors(), wipe(S), reset()]);
  return { el: body, destroy: stop };
}

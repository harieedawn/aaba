// Dev: export config (file + minified copy), full backup (with entries), import (preview, confirm, merge|replace).
import { h, put } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import { toast } from '../../ui/toast.js';
import { field, textArea, selectInput, confirmSheet, copyText, download, errBox } from '../../ui/form.js';

const stamp = () => new Date().toISOString().slice(0, 10);
const n = o => (o && typeof o === 'object' ? Object.keys(o).length : 0);
const run = (btn, fn) => async () => { btn.disabled = true; try { await fn(); } catch (e) { toast(e.message || 'Có lỗi xảy ra'); } btn.disabled = false; };

function exportCard() {
  const dl = h('button', { class: 'btn', type: 'button' }, 'Tải aaba-config.json'), cp = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Sao chép bản rút gọn');
  dl.onclick = run(dl, async () => { download('aaba-config.json', JSON.stringify(await store.exportConfig(), null, 2)); toast('Đã tải aaba-config.json'); });
  cp.onclick = run(cp, async () => { await copyText(JSON.stringify(await store.exportConfig()), 'Đã sao chép bản rút gọn'); });
  return h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Xuất cấu hình')),
    h('p', { class: 'muted', style: { marginBottom: '12px' } }, 'Gồm cấu hình, chức vụ, tổ, học sinh, thể lệ, lịch trực, đợt, nhãn mã đăng nhập (không có mã). Không có điểm đã ghi.'),
    h('div', { class: 'sec-actions' }, dl, cp));
}
function backupCard() {
  const b = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Xuất toàn bộ (có điểm)');
  b.onclick = run(b, async () => { download(`aaba-backup-${stamp()}.json`, JSON.stringify(await store.exportConfig({ withEntries: true }))); toast('Đã tải bản sao lưu'); });
  return h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Sao lưu đầy đủ')),
    h('p', { class: 'muted', style: { marginBottom: '12px' } }, 'Kèm toàn bộ điểm đã ghi. Giữ file này riêng tư.'), b);
}
function importCard() {
  const file = h('input', { type: 'file', accept: '.json,application/json', class: 'input', 'aria-label': 'Chọn file cấu hình' });
  const ta = textArea('', { rows: '5', placeholder: 'Hoặc dán nội dung JSON vào đây', 'aria-label': 'Dán JSON' });
  const mode = selectInput([{ value: 'merge', label: 'Gộp (giữ dữ liệu hiện có, ghi đè mục trùng)' }, { value: 'replace', label: 'Thay thế (xóa dữ liệu cũ của các mục có trong file)' }], 'merge');
  const prev = h('div', { class: 'stack', hidden: true }), err = errBox(), go = h('button', { class: 'btn', type: 'button', hidden: true }, 'Nhập dữ liệu');
  let obj = null;
  const parse = text => {
    err.hidden = true; prev.hidden = go.hidden = true; obj = null;
    try {
      obj = JSON.parse(text);
      if (!obj || obj.v !== 1) throw new Error('File không đúng định dạng aaba (thiếu v:1).');
    } catch (e) { obj = null; err.textContent = e instanceof SyntaxError ? 'Không đọc được JSON.' : e.message; err.hidden = false; return; }
    const rows = [['Tổ', n(obj.groups)], ['Học sinh', n(obj.students)], ['Thể lệ', n(obj.rules)], ['Lịch trực', n(obj.duty)], ['Đợt', n(obj.cycles)], ['Điểm đã ghi', n(obj.entries)]];
    put(prev, h('div', { class: 'kv' }, h('strong', null, obj.config?.className || 'Cấu hình'), h('span', { class: 'muted' }, obj.exportedAt ? obj.exportedAt.slice(0, 10) : '')),
      ...rows.filter(r => r[1]).map(([k, v]) => h('div', { class: 'kv' }, h('span', { class: 'muted' }, k), h('span', null, String(v)))));
    prev.hidden = go.hidden = false;
  };
  file.onchange = async () => { const f = file.files[0]; if (f) { const t = await f.text(); ta.value = ''; parse(t); } };
  ta.oninput = () => (ta.value.trim() ? parse(ta.value) : (prev.hidden = go.hidden = true));
  go.onclick = () => confirmSheet({ title: 'Nhập dữ liệu?', danger: mode.value === 'replace', label: 'Nhập',
    text: mode.value === 'replace' ? 'Dữ liệu cũ của các mục có trong file sẽ bị xóa rồi thay bằng file này.' : 'Dữ liệu trong file sẽ được gộp vào lớp hiện tại.',
    onConfirm: async () => { await store.importConfig(obj, mode.value); toast('Đã nhập dữ liệu'); } });
  return h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Nhập cấu hình')),
    h('div', { class: 'form' }, field('File JSON', file), ta, err, prev, field('Cách nhập', mode), go));
}
export default function exportView() { return { el: h('div', { class: 'stack' }, exportCard(), backupCard(), importCard()) }; }

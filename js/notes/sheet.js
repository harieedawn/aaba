// Notes composer + detail sheets.
import { h, put } from '../ui/dom.js';
import { openSheet } from '../ui/sheet.js';
import { field, textInput, textArea, errBox, confirmSheet } from '../ui/form.js';
import { act, errMsg } from '../ui/act.js';
import { toast } from '../ui/toast.js';
import { getSession } from '../session.js';
import { SUBJECTS, HEX, subjectOf, noteStyle } from './subjects.js';
import { noteCard } from './board.js';
import { saveClassNote, deleteClassNote, saveMine, deleteMine, newNoteId, canEditNote } from './data.js';
import { todayKey, fmtDay, diffDays, relText, isKey } from './dates.js';

const grp = (label, ...kids) => h('div', { class: 'field', role: 'group', 'aria-label': label }, h('span', { class: 'field-l' }, label), ...kids);

export function openNoteSheet({ mode = 'class', note = null, dateKey } = {}) {
  const mine = mode === 'mine', editing = !!note;
  let subject = note?.subject || 'khac';
  let color = (HEX.test(note?.color || '') ? note.color : subjectOf(subject).hex).toUpperCase();
  let manual = editing && color !== subjectOf(subject).hex;
  const date = h('input', { class: 'input', type: 'date', value: note?.date || dateKey || todayKey(), 'aria-label': 'Ngày' });
  const titleIn = textInput(note?.title || '', { maxlength: '80', placeholder: 'Ví dụ: Kiểm tra 15 phút', 'aria-label': 'Tiêu đề' });
  const bodyIn = textArea(note?.body || '', { maxlength: '1000', rows: '4', placeholder: 'Chi tiết (không bắt buộc)', 'aria-label': 'Nội dung' });
  const prev = h('div', { class: 'nb-prev' }), err = errBox();
  const chips = SUBJECTS.map(s => h('button', { type: 'button', class: 'fchip', 'aria-pressed': String(s.id === subject), onclick: () => pickSubject(s.id) },
    h('span', { class: 'nb-dot', style: { '--c': `var(--sub-${s.id})` } }), s.name));
  const sws = SUBJECTS.map(s => h('button', { type: 'button', class: 'nb-sw', 'data-hex': s.hex, 'aria-label': 'Màu ' + s.name, onclick: () => setColor(s.hex) }, h('i', { style: { '--c': s.hex } })));
  const picker = h('input', { type: 'color', 'aria-label': 'Chọn màu khác', value: color.toLowerCase(), oninput: () => setColor(picker.value) });
  const custom = h('label', { class: 'nb-sw nb-sw-custom' }, h('i', { 'aria-hidden': 'true' }), picker);
  const draft = () => ({ id: note?.id || 'preview', date: date.value, subject, title: titleIn.value.trim() || 'Tiêu đề note', body: bodyIn.value.trim(), color });
  function refresh() {
    chips.forEach((b, i) => b.setAttribute('aria-pressed', String(SUBJECTS[i].id === subject)));
    sws.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hex === color)));
    custom.dataset.on = String(!SUBJECTS.some(s => s.hex === color));
    picker.value = color.toLowerCase();
    put(prev, noteCard(draft(), mine ? 'mine' : 'class'));
  }
  function pickSubject(id) { subject = id; if (!manual) color = subjectOf(id).hex; refresh(); }
  function setColor(hex) { color = hex.toUpperCase(); manual = color !== subjectOf(subject).hex; refresh(); }
  function collect() {
    const title = titleIn.value.trim(), body = bodyIn.value.trim(), s = getSession(), now = Date.now();
    if (!title) throw new Error('Hãy nhập tiêu đề cho note.');
    if (title.length > 80) throw new Error('Tiêu đề tối đa 80 ký tự.');
    if (body.length > 1000) throw new Error('Nội dung tối đa 1000 ký tự.');
    if (!isKey(date.value)) throw new Error('Hãy chọn ngày hợp lệ.');
    const base = { id: note?.id || newNoteId(), date: date.value, subject, title, body, color, at: note?.at || now, upd: now };
    return mine ? { ...base, slot: note && note.date === date.value ? note.slot : null }
      : { ...base, by: note?.by || s.uid, byName: (note?.byName ?? (s.role === 'dev' ? 'Quản trị' : s.name || '')).slice(0, 80) };
  }
  const saveBtn = h('button', { class: 'btn', type: 'submit' }, editing ? 'Lưu thay đổi' : 'Đăng note');
  const form = h('form', { class: 'form', novalidate: true, onsubmit: async ev => {
    ev.preventDefault(); err.hidden = true;
    let data;
    try { data = collect(); } catch (e) { err.textContent = errMsg(e); err.hidden = false; return; }
    const ok = await act(async () => { await (mine ? saveMine : saveClassNote)(data); return true; }, { btn: saveBtn, ok: editing ? 'Đã cập nhật note' : 'Đã thêm note' });
    if (ok) sh.close();
  } },
    field('Ngày', date), grp('Môn', h('div', { class: 'nb-chips' }, chips)),
    field('Tiêu đề', titleIn), field('Nội dung', bodyIn),
    grp('Màu giấy', h('div', { class: 'nb-sws' }, sws, custom)),
    grp('Xem trước', prev), err,
    h('div', { class: 'add-submit' }, h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => sh.close() }, 'Hủy'), saveBtn)));
  [titleIn, bodyIn].forEach(i => i.addEventListener('input', refresh));
  date.addEventListener('change', refresh);
  const sh = openSheet({ title: (editing ? 'Sửa' : 'Thêm') + (mine ? ' note của tôi' : ' note lớp'), content: form });
  refresh();
  setTimeout(() => titleIn.focus(), 60);
  return sh;
}

export function openNoteDetail(note) {
  const mine = !!note.owner, s = subjectOf(note.subject), st = noteStyle(note, mine ? 'mine' : 'class');
  const row = (k, v) => h('div', { class: 'kv' }, h('span', { class: 'muted' }, k), h('span', null, v));
  const acts = canEditNote(note) && h('div', { class: 'row-btns' },
    h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => confirmSheet({ title: 'Xoá note này?', text: note.title, label: 'Xoá',
      onConfirm: async () => { await (mine ? deleteMine : deleteClassNote)(note.id); toast('Đã xoá note'); sh.close(); } }) }, 'Xoá'),
    h('button', { class: 'btn', type: 'button', onclick: () => { sh.close(); openNoteSheet({ mode: mine ? 'mine' : 'class', note, dateKey: note.date }); } }, 'Sửa'));
  const sh = openSheet({ title: 'Chi tiết note', content: h('div', { class: 'stack' },
    h('div', { class: `nb-dhead ${st.cls}`, style: st.style }, h('span', { class: 'nb-sub' }, s.name, mine && h('span', { class: 'nb-priv' }, 'riêng tư')), h('h3', { class: 'nb-dtitle' }, note.title)),
    h('p', { class: 'nb-dbody' }, note.body || 'Không có nội dung thêm.'),
    h('div', null, row('Ngày', `${fmtDay(note.date)} · ${relText(diffDays(todayKey(), note.date))}`), row('Môn', s.name),
      row(mine ? 'Phạm vi' : 'Người đăng', mine ? 'Riêng tư, chỉ mình bạn thấy' : note.byName || '—')), acts) });
  return sh;
}
